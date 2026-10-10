const Auth = require('../../utils/auth.js');

Page({
  data: {
    userInfo: null
  },

  // 微信登录
  wechatLogin: function() {
    const that = this;

    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    // 1. 先取头像昵称（必须在用户点击事件中同步调用）
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: function(userRes) {
        that.completeLogin(userRes.userInfo);
      },
      fail: function(userErr) {
        // 用户拒绝授权头像昵称：不影响登录，openid 仍可静默获取
        console.log('用户未授权头像昵称，继续静默登录', userErr);
        that.completeLogin(null);
      }
    });
  },

  // 完成登录：静默换取 openid 并落到本地
  completeLogin: function(userInfo) {
    const that = this;

    Auth.ensureOpenid(true)
      .then(function() {
        if (userInfo) {
          wx.setStorageSync('userInfo', userInfo);
        }
        wx.setStorageSync('isLogin', true);

        that.setData({
          userInfo: userInfo || that.data.userInfo || null
        });

        wx.hideLoading();
        wx.navigateBack({ delta: 1 });
      })
      .catch(function(err) {
        wx.hideLoading();
        console.log('静默登录失败', err);
        wx.showToast({
          title: (err && err.message) || '登录失败，请重试',
          icon: 'none'
        });
      });
  },

  // 取消登录
  cancelLogin: function() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 页面加载时检查登录状态
  onLoad: function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      });
    }
  }
});
