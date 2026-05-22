/**
 * API 服务 - 对接后端接口
 * 
 * 开发阶段使用 Mock 数据，替换真实接口后删除对应 mock 逻辑即可。
 */

export interface OrderInfo {
  orderId: string
  serviceType: string
  plateNumber: string
  vehicleModel: string
  status: 'pending' | 'en_route' | 'arrived' | 'completed'
  statusText: string
  currentAddress: string
  currentLatitude: number
  currentLongitude: number
  destAddress: string
  destLatitude: number
  destLongitude: number
  driverName: string
  driverPhone: string
  driverPlate: string
  customerPhone: string
  customerPhoneMask: string
  createdAt: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// ========== Mock 数据 ==========

const MOCK_ORDERS: Record<string, OrderInfo> = {
  'DEMO123': {
    orderId: 'DEMO123',
    serviceType: '救援车辆',
    plateNumber: '京A·88888',
    vehicleModel: '特斯拉 Model Y',
    status: 'en_route',
    statusText: '司机正在路上',
    currentAddress: '福州市鼓楼区八一七北路88号 东百中心',
    currentLatitude: 26.0823,
    currentLongitude: 119.2965,
    destAddress: '',
    destLatitude: 0,
    destLongitude: 0,
    driverName: '张师傅',
    driverPhone: '138****8888',
    driverPlate: '京B·T8888',
    customerPhone: '13812348888',
    customerPhoneMask: '',
    createdAt: '2026-05-21 22:30',
  },
  'DEMO456': {
    orderId: 'DEMO456',
    serviceType: '搭电救援',
    plateNumber: '沪A·66666',
    vehicleModel: '宝马 X5',
    status: 'pending',
    statusText: '正在分配司机',
    currentAddress: '上海市浦东新区陆家嘴环路1000号',
    currentLatitude: 31.2400,
    currentLongitude: 121.5047,
    destAddress: '上海市浦东新区张江高科技园区',
    destLatitude: 31.2020,
    destLongitude: 121.5870,
    driverName: '李师傅',
    driverPhone: '139****6666',
    driverPlate: '沪B·T6666',
    customerPhone: '13912346666',
    customerPhoneMask: '139********',
    createdAt: '2026-05-21 22:50',
  }
}

// ========== API 方法 ==========

/**
 * 获取订单详情
 * @param orderId 订单号
 */
export function getOrderDetail(orderId: string): Promise<ApiResponse<OrderInfo>> {
  return new Promise((resolve) => {
    const mock = MOCK_ORDERS[orderId]
    if (mock) {
      // 模拟网络延迟
      setTimeout(() => {
        resolve({
          code: 0,
          message: 'success',
          data: { ...mock },
        })
      }, 600)
    } else {
      setTimeout(() => {
        resolve({
          code: 1001,
          message: '订单不存在或已失效',
          data: null as unknown as OrderInfo,
        })
      }, 400)
    }
  })
}

/**
 * 修改目的地
 * @param orderId 订单号
 * @param newAddress 新地址名称
 * @param latitude 纬度
 * @param longitude 经度
 */
export function updateDestination(
  orderId: string,
  newAddress: string,
  latitude: number,
  longitude: number,
): Promise<ApiResponse<{ success: boolean }>> {
  return new Promise((resolve) => {
    console.log(`[API] 更新目的地: orderId=${orderId}, address=${newAddress}, lat=${latitude}, lng=${longitude}`)
    setTimeout(() => {
      resolve({
        code: 0,
        message: 'success',
        data: { success: true },
      })
    }, 800)
  })
}

/**
 * 发送确认短信通知
 * @param orderId 订单号
 * @param newAddress 新地址
 */
export function sendConfirmSMS(
  _orderId: string,
  _newAddress: string,
): Promise<ApiResponse<{ sent: boolean }>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: 0,
        message: 'success',
        data: { sent: true },
      })
    }, 300)
  })
}

/**
 * 验证手机号后4位
 * @param orderId 订单号
 * @param last4 手机号后4位
 */
export function verifyPhone(
  orderId: string,
  last4: string,
): Promise<ApiResponse<{ passed: boolean; orderId: string }>> {
  return new Promise((resolve) => {
    const order = MOCK_ORDERS[orderId]
    const passed = order ? order.customerPhone.slice(-4) === last4 : false
    setTimeout(() => {
      if (passed) {
        resolve({
          code: 0,
          message: '验证通过',
          data: { passed: true, orderId },
        })
      } else {
        resolve({
          code: 1002,
          message: '验证码错误，请重试',
          data: { passed: false, orderId },
        })
      }
    }, 500)
  })
}
