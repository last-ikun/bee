const APP = getApp()
const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')

// fixed首次打开不显示标题的bug
APP.configLoadOK = () => {
  
}

Page({
  data: {
    
  },
  onLoad: function (options) {
    getApp().initLanguage(this)
    wx.setNavigationBarTitle({
        title: this.data.$t.cart.ordered,
    })
  },
  onShow: function () {
    this.fetchOrder()
  },
  onPullDownRefresh() {
    this.fetchOrder()
    wx.stopPullDownRefresh()
  },
  async fetchOrder() {
    wx.showLoading({
      title: '',
    })
    const res = await WXAPI.orderList({
      token: wx.getStorageSync('token'),
      status: 0
    })
    wx.hideLoading({
      success: (res) => {},
    })
    if (res.code == 0) {
      this.setData({
        orderInfo: res.data.orderList[0],
        goodsList: res.data.goodsMap[res.data.orderList[0].id],
      })
    }
  },
  async goPayOrder() {
    const _this = this
    // token 需要使用买单这个用户的token，而不是当前餐桌的token
    const code = await AUTH.wxaCode()
    let res = await WXAPI.authorize({
      code
    })
    if (res.code != 0) {
      wx.showModal({
        confirmText: this.data.$t.common.confirm,
        cancelText: this.data.$t.common.cancel,
        content: res.msg,
        showCancel: false
      })
      return
    }
    const token = res.data.token
    const nextAction = {
      type: 9,
      orderId: this.data.orderInfo.id
    }
    const postData = {
      token,
      money: this.data.orderInfo.amountReal,
      remark: "堂食买单",
      nextAction: JSON.stringify(nextAction)
    }
    res = await WXAPI.wxpay(postData)
    if (res.code != 0) {
      wx.showModal({
        confirmText: this.data.$t.common.confirm,
        cancelText: this.data.$t.common.cancel,
        content: JSON.stringify(res),
        showCancel: false
      })
      return
    }
    // 发起支付
    wx.requestPayment({
      timeStamp: res.data.timeStamp,
      nonceStr: res.data.nonceStr,
      package: res.data.package,
      signType: res.data.signType,
      paySign: res.data.paySign,
      fail: function (aaa) {
        console.error(aaa)
        wx.showToast({
          title: aaa
        })
      },
      success: function () {
        // 提示支付成功
        wx.showToast({
          title: _this.data.$t.asset.success
        })
        _this.setData({
          paySuccess: true
        })
      }
    })
  },
})