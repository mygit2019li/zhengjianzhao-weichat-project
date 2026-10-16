const Auth = require('../../utils/auth.js');

Page({
  data: {
    userInfo: null,
    // 头像昵称编辑态
    avatarUrl: '',
    nickName: '',
    isEditing: false
  },

  onLoad: function () {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        avatarUrl: userInfo.avatarUrl || '',
        nickName: userInfo.nickName || ''
      });
    }
  },

  // 进入编辑态：预填已有资料
  startEdit: function () {
    this.setData({
      isEditing: true,
      avatarUrl: this.data.userInfo ? (this.data.userInfo.avatarUrl || '') : '',
      nickName: this.data.userInfo ? (this.data.userInfo.nickName || '') : ''
    });
  },

  // 微信新接口：选择头像（在用户点击头像按钮时触发）
  // event.detail.avatarUrl 为本地临时文件路径
  onChooseAvatar: function (e) {
    const avatarUrl = e.detail && e.detail.avatarUrl;
    if (!avatarUrl) return;

    // 持久化头像，避免临时路径在重启后失效（与旧 getUserProfile 的远端 URL 行为保持一致）
    this.persistAvatar(avatarUrl)
      .then((savedPath) => this.setData({ avatarUrl: savedPath }))
      .catch(() => this.setData({ avatarUrl: avatarUrl }));
  },

  // 将选中的头像临时文件持久化到本地用户文件目录
  persistAvatar: function (tempPath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().saveFile({
        tempFilePath: tempPath,
        success: (res) => resolve(res.savedFilePath),
        fail: (err) => reject(err)
      });
    });
  },

  // 昵称输入：微信「昵称填写能力」会触发 bindnickname（detail.nickname），
  // 用户手动输入会触发 bindinput / bindblur（detail.value）。统一处理。
  onNicknameChange: function (e) {
    const detail = e.detail || {};
    const name = (detail.nickname != null && detail.nickname !== '') ? detail.nickname : (detail.value || '');
    if (name) {
      this.setData({ nickName: name });
    }
  },

  // 完成：保存头像昵称 + 静默换取 openid
  completeLogin: function () {
    const that = this;
    const nickName = (that.data.nickName || '').trim();

    if (!that.data.avatarUrl) {
      wx.showToast({ title: '请选择头像', icon: 'none' });
      return;
    }
    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中...', mask: true });

    // 静默换取 openid（内容安全检测需要），失败不阻塞登录
    Auth.ensureOpenid(true)
      .catch(() => '')
      .then(() => {
        const userInfo = {
          avatarUrl: that.data.avatarUrl,
          nickName: nickName
        };
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('isLogin', true);
        that.setData({ userInfo: userInfo, isEditing: false });
        wx.hideLoading();
        wx.navigateBack({ delta: 1 });
      });
  },

  cancelLogin: function () {
    wx.navigateBack({ delta: 1 });
  }
});
