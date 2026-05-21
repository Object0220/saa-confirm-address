// app.ts
App<IAppOption>({
  globalData: {
    userInfo: undefined,
  },

  onLaunch() {
    // 获取系统信息用于自适应
    const sysInfo = wx.getSystemInfoSync()
    this.globalData.systemInfo = sysInfo
  },
})
