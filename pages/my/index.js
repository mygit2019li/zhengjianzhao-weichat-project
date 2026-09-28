Page({
  data: {
    userInfo: null
  },

  // 页面加载时检查登录状态
  onLoad: function() {
    this.checkLoginStatus();
    wx.showShareMenu({
      withShareTicket: false, // 关闭ticket获取，避免触发票券服务调用
      menus: ['shareAppMessage', 'shareTimeline'] // 显示好友/朋友圈分享选项
    });
  },

  // 页面显示时检查登录状态
  onShow: function() {
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      userInfo: userInfo
    });
  },

  // 跳转到登录页面
  goToLogin: function() {
    wx.navigateTo({
      url: '/pages/login/index'
    });
  },

  // 退出登录
  logout: function() {
    const that = this;
    
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: function(res) {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('isLogin');
          
          // 更新页面数据
          that.setData({
            userInfo: null
          });
          
          wx.showToast({
            title: '退出成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 跳转到我的作品
  navigateToMyWorks: function() {
    wx.navigateTo({
      url: '/pages/my-works/index'
    });
  },
  
  // 跳转到我的权益
  navigateToMyBenefits: function() {
    wx.showToast({
      title: '我的权益功能开发中',
      icon: 'none'
    });
  },
  
  // 跳转到常见问题
  navigateToFAQ: function() {
    wx.showToast({
      title: '常见问题功能开发中',
      icon: 'none'
    });
  },

  // 跳转到课本封面图
  navigateToTextbook: function() {
    wx.navigateTo({
      url: '/pages/textbook/index'
    });
  },

  // 跳转到 PDF 转图片
  navigateToPdf2img: function() {
    wx.navigateTo({
      url: '/pages/pdf2img/index'
    });
  },
  
  // 处理客服消息回调
  handleContact: function(e) {
    if (e.detail.errMsg === 'openCustomerServiceContact:ok') {
      console.log('客服会话已打开');
    } else {
      console.error('客服会话打开失败:', e.detail.errMsg);
      // 移除弹窗提示，只保留日志记录
    }
  },
  
  // 赏好评
  navigateToLike: function() {
    wx.showToast({
      title: '感谢您的支持！',
      icon: 'success'
    });
  },
  openShareMenu() {
    wx.showShareMenu({
      withShareTicket: false,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },
  // 分享按钮点击事件 - 扩展现有分享功能
  navigateToShare: function() {
    // 显示分享提示
    wx.showModal({
      title: '分享应用',
      content: '邀请好友使用证件照助手，一起制作精美证件照吧！',
      showCancel: true,
      confirmText: '立即分享',
      cancelText: '取消',
      success: function(res) {
        if (res.confirm) {
          // 显示分享菜单，支持分享给朋友和分享到朋友圈
          wx.showShareMenu({
            withShareTicket: false,
            menus: ['shareAppMessage', 'shareTimeline']
          });
        }
      }
    });
  },

  // 分享给朋友
  onShareAppMessage: function() {
    return {
      title: '证件照助手 - 一键制作精美证件照',
      desc: '轻松制作各类证件照，支持多种尺寸和背景色，证件照制作从未如此简单！',
      path: '/pages/index/index',
      imageUrl: '/images/icon/分享.svg' // 使用现有的分享图标
    };
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '证件照助手 - 一键制作精美证件照',
      query: 'from=timeline',
      imageUrl: '/images/icon/分享.svg' // 使用现有的分享图标
    };
  },
  
  // 跳转到关于我们
  navigateToAbout: function() {
    wx.showToast({
      title: '关于我们功能开发中',
      icon: 'none'
    });
  },
  
  // 跳转到隐私政策
  navigateToPrivacy: function() {
    wx.showToast({
      title: '隐私政策功能开发中',
      icon: 'none'
    });
  },
  
  // 跳转到用户协议
  navigateToTerms: function() {
    wx.showToast({
      title: '用户协议功能开发中',
      icon: 'none'
    });
  }
});
