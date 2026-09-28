Page({
  data: {
    userInfo: null
  },

  // 微信登录
  wechatLogin: function() {
    const that = this;
    
    // 1. 点击登录按钮后立即显示加载状态
    wx.showLoading({
      title: '登录中...',
      mask: true
    });
    
    // 2. 直接调用getUserProfile获取用户信息（必须在直接点击事件中调用）
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: function(userRes) {
        // 3. 获取登录凭证
        wx.login({
          success: function(loginRes) {
            // 4. 保存用户信息到本地
            wx.setStorageSync('userInfo', userRes.userInfo);
            wx.setStorageSync('isLogin', true);
            
            // 5. 更新页面数据
            that.setData({
              userInfo: userRes.userInfo
            });
            
            wx.hideLoading();
            
            // 6. 登录成功后直接返回上一页，不显示成功提示
            wx.navigateBack({
              delta: 1
            });
          },
          fail: function(loginErr) {
            wx.hideLoading();
            console.log('获取登录凭证失败', loginErr);
            wx.showToast({
              title: '登录失败',
              icon: 'none'
            });
          }
        });
      },
      fail: function(userErr) {
        wx.hideLoading();
        console.log('获取用户信息失败', userErr);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
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
