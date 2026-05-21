import { getOrderDetail, updateDestination, sendConfirmSMS, verifyPhone } from '../../services/api'
import type { OrderInfo } from '../../services/api'

const app = getApp<IAppOption>()

interface MapMarker {
  id: number
  latitude: number
  longitude: number
  title: string
  iconPath?: string
  width?: number
  height?: number
  alpha?: number
  callout?: {
    content: string
    color: string
    fontSize: number
    borderRadius: number
    bgColor: string
    padding: number
    display: 'ALWAYS' | 'BYCLICK'
  }
}

interface LatLng {
  latitude: number
  longitude: number
}

Page({
  data: {
    // 页面状态
    pageStatus: 'loading',      // loading | verify | loaded | error
    errorMessage: '订单不存在',

    // 手机验证
    phoneMask: '',
    codeInput: ['', '', '', ''] as string[],
    codeIndex: 0,
    focusedIndex: 0,
    verifyError: '',
    verifying: false,

    showSuccess: false,
    confirming: false,

    // 状态栏高度
    statusBarHeight: 0,

    // 地图
    mapCenter: {
      latitude: 39.9042,
      longitude: 116.4074,
    } as LatLng,
    mapScale: 14,
    markers: [] as MapMarker[],
    polylines: [] as any[],
    navClass: 'transparent',

    // 订单数据
    orderInfo: {
      orderId: '',
      serviceType: '',
      plateNumber: '',
      vehicleModel: '',
      status: 'pending',
      statusText: '',
      currentAddress: '',
      currentLatitude: 0,
      currentLongitude: 0,
      destAddress: '',
      destLatitude: 0,
      destLongitude: 0,
      driverName: '',
      driverPhone: '',
      driverPlate: '',
      createdAt: '',
    } as OrderInfo,

    // 修改后的地址
    modifiedAddress: '',
    modifiedLatitude: 0,
    modifiedLongitude: 0,
    modifiedDistance: '',
  },

  // ===========================
  // 生命周期
  // ===========================

  onLoad(options: Record<string, string | undefined>) {
    // 获取状态栏高度
    const sysInfo = app.globalData.systemInfo || wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 44 })

    // 解析订单号
    const orderId = options.orderId || options.scene || ''

    if (orderId) {
      this.loadOrder(orderId)
    } else {
      // 无订单号时使用默认演示数据
      this.loadOrder('DEMO123')
    }
  },

  onShow() {
    // 如果已有修改地址但页面未更新，重新计算标注
    if (this.data.modifiedAddress && this.data.pageStatus === 'loaded') {
      this.updateMarkers()
    }
  },

  // ===========================
  // 数据加载
  // ===========================

  loadOrder(orderId: string) {
    this.setData({ pageStatus: 'loading' })

    getOrderDetail(orderId).then(res => {
      if (res.code === 0 && res.data) {
        const data = res.data
        const center: LatLng = {
          latitude: data.currentLatitude,
          longitude: data.currentLongitude,
        }

        this.setData({
          orderInfo: data,
          mapCenter: center,
          phoneMask: data.customerPhoneMask,
          modifiedAddress: '',
          modifiedLatitude: 0,
          modifiedLongitude: 0,
          modifiedDistance: '',
        })

        this.updateMarkers()
        this.centerMap()

        // 加载完成 → 跳转验证
        setTimeout(() => {
          this.setData({
            pageStatus: 'verify',
            codeInput: ['', '', '', ''],
            codeIndex: 0,
            focusedIndex: 0,
            verifyError: '',
          })
        }, 200)

        setTimeout(() => {
          this.setData({ navClass: '' })
        }, 500)
      } else {
        this.setData({
          pageStatus: 'error',
          errorMessage: res.message || '订单数据加载失败',
        })
      }
    }).catch(err => {
      console.error('加载订单失败', err)
      this.setData({
        pageStatus: 'error',
        errorMessage: '网络异常，请检查网络后重试',
      })
    })
  },

  // ===========================
  // 地图操作
  // ===========================

  updateMarkers() {
    const { orderInfo, modifiedAddress, modifiedLatitude, modifiedLongitude } = this.data
    const markers: MapMarker[] = []
    const polylinePoints: LatLng[] = []

    // 1. 救援地（蓝色圆点 + 蓝色 callout）
    markers.push({
      id: 0,
      latitude: orderInfo.currentLatitude,
      longitude: orderInfo.currentLongitude,
      title: '救援地',
      width: 32,
      height: 40,
      iconPath: '/images/marker-blue.svg',
      callout: {
        content: orderInfo.currentAddress,
        color: '#1D4ED8',
        fontSize: 12,
        borderRadius: 8,
        bgColor: '#EFF6FF',
        padding: 8,
        display: 'ALWAYS',
      },
    })
    polylinePoints.push({
      latitude: orderInfo.currentLatitude,
      longitude: orderInfo.currentLongitude,
    })

    // 2. 修改后的救援地地址（仅修改后才显示）
    if (modifiedAddress) {
      markers.push({
        id: 1,
        latitude: modifiedLatitude,
        longitude: modifiedLongitude,
        title: '修改后的救援地地址',
        width: 32,
        height: 40,
        iconPath: '/images/marker-green.svg',
        callout: {
          content: modifiedAddress,
          color: '#065F46',
          fontSize: 12,
          borderRadius: 8,
          bgColor: '#D1FAE5',
          padding: 8,
          display: 'ALWAYS',
        },
      })
      polylinePoints.push({
        latitude: modifiedLatitude,
        longitude: modifiedLongitude,
      })

      const distance = this.calcDistance(
        modifiedLatitude, modifiedLongitude,
        orderInfo.destLatitude, orderInfo.destLongitude,
      )
      this.setData({
        modifiedDistance: distance < 1 ? '不到1' : distance.toFixed(1),
      })
    }

    // 路线连线
    const polylines = polylinePoints.length > 1 ? [{
      points: polylinePoints,
      color: '#10B981',
      width: 3,
      dottedLine: false,
      borderColor: '#059669',
      borderWidth: 1,
    }] : []

    this.setData({ markers, polylines })
  },

  centerMap() {
    const { orderInfo, modifiedLatitude, modifiedLongitude } = this.data
    const ctx = wx.createMapContext('map', this)
    const pts: LatLng[] = [{ latitude: orderInfo.currentLatitude, longitude: orderInfo.currentLongitude }]
    if (modifiedLatitude && modifiedLongitude) {
      pts.push({ latitude: modifiedLatitude, longitude: modifiedLongitude })
    }
    ctx.includePoints({ points: pts, padding: [80, 50, 300, 50] })
  },

  /** 计算两点间距离（km），使用 Haversine 公式 */
  calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  },

  // ===========================
  // 事件处理
  // ===========================

  /** 输入验证码 - 单个数字 */
  onDigitInput(e: WechatMiniprogram.Input) {
    const idx = Number(e.currentTarget.dataset.index)
    let digit = e.detail.value.replace(/\D/g, '').slice(0, 1)

    const arr = [...this.data.codeInput]
    arr[idx] = digit

    const nextIdx = digit ? Math.min(idx + 1, 3) : Math.max(idx - 1, 0)
    this.setData({
      codeInput: arr,
      codeIndex: nextIdx,
      focusedIndex: digit && idx < 3 ? idx + 1 : idx,
      verifyError: '',
    })

    // 输满4位自动验证
    if (digit && idx === 3) {
      setTimeout(() => this.onSubmitVerify(), 300)
    }
  },

  /** 提交验证 */
  onSubmitVerify() {
    const code = this.data.codeInput.join('')
    if (code.length < 4) {
      this.setData({ verifyError: '请输入完整4位数字' })
      return
    }
    this.setData({ verifying: true, verifyError: '' })

    verifyPhone(this.data.orderInfo.orderId, code).then(res => {
      if (res.code === 0 && res.data.passed) {
        this.setData({ pageStatus: 'loaded', verifying: false })
      } else {
        this.setData({
          verifyError: res.message || '验证码错误',
          verifying: false,
          codeInput: ['', '', '', ''],
          codeIndex: 0,
          focusedIndex: 0,
        })
      }
    }).catch(() => {
      this.setData({
        verifyError: '网络异常，请重试',
        verifying: false,
      })
    })
  },

  /** 点击标注 */
  onMarkerTap(e: WechatMiniprogram.TouchEvent) {
    console.log('marker tapped', e)
  },

  /** 修改目的地 */
  onModifyAddress() {
    // 请求定位权限
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => {
        this.chooseLocation()
      },
      fail: () => {
        // 用户拒绝授权，引导开启
        wx.showModal({
          title: '需要位置权限',
          content: '修改目的地需要获取您的位置信息，请在设置中开启',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          },
        })
      },
    })
  },

  /** 打开位置选择器 */
  chooseLocation() {
    wx.chooseLocation({
      success: (res: WechatMiniprogram.ChooseLocationSuccessCallbackResult) => {
        if (res.name || res.address) {
          const address = res.name || res.address
          this.setData({
            modifiedAddress: address,
            modifiedLatitude: Number(res.latitude),
            modifiedLongitude: Number(res.longitude),
          })
          this.updateMarkers()
          this.centerMap()

          wx.showToast({
            title: '地址已选，点击确认修改',
            icon: 'none',
            duration: 2000,
          })
        }
      },
      fail: (err) => {
        console.log('用户取消选择位置', err)
      },
    })
  },

  /** 撤销修改 */
  onResetAddress() {
    wx.showModal({
      title: '撤销修改',
      content: '确认恢复到原来的目的地地址？',
      confirmText: '恢复',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            modifiedAddress: '',
            modifiedLatitude: 0,
            modifiedLongitude: 0,
            modifiedDistance: '',
          })
          this.updateMarkers()
          this.centerMap()
        }
      },
    })
  },

  /** 确认修改目的地 */
  onConfirmAddress() {
    if (this.data.confirming) return
    this.setData({ confirming: true })

    const { orderInfo, modifiedAddress, modifiedLatitude, modifiedLongitude } = this.data

    // 调接口更新目的地
    updateDestination(orderInfo.orderId, modifiedAddress, modifiedLatitude, modifiedLongitude)
      .then(res => {
        if (res.code === 0) {
          // 发送确认短信
          return sendConfirmSMS(orderInfo.orderId, modifiedAddress)
        }
        throw new Error(res.message)
      })
      .then(() => {
        this.setData({ confirming: false, showSuccess: true })
      })
      .catch(err => {
        this.setData({ confirming: false })
        wx.showToast({
          title: err.message || '提交失败，请重试',
          icon: 'none',
          duration: 3000,
        })
      })
  },

  /** 关闭成功弹窗 */
  onCloseSuccess() {
    this.setData({ showSuccess: false })
  },

  /** 阻止事件冒泡 */
  preventTap() {
    // noop
  },

  /** 重新加载 */
  onRetry() {
    const orderId = this.data.orderInfo.orderId || 'DEMO123'
    this.loadOrder(orderId)
  },

  /** 联系客服 */
  onCallService() {
    wx.makePhoneCall({
      phoneNumber: '400-000-0000',
    })
  },
})
