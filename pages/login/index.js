const Auth = require('../../utils/auth.js');
const Privacy = require('../../utils/privacy.js');

/**
 * 登录页
 *
 * 设计说明（2026-10-16 改版为「一键登录」）：
 * 微信自 2022-10-25 起不再返回真实头像昵称——wx.getUserProfile 一律返回匿名数据
 * （灰色默认头像 + "微信用户"），真实头像只能由用户主动通过
 * <button open-type="chooseAvatar"> 选择，昵称只能通过 <input type="nickname"> 确认。
 *
 * 因此这里把「登录」和「完善资料」解耦：
 *   - 登录 = 一键完成，0 操作：头像回落本地默认图，昵称自动生成
 *   - 想要真实微信头像昵称的用户，走「修改资料」主动设置（可选路径）
 */
Page({
  data: {
    userInfo: null,
    // 编辑态字段
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

  // ==================== 一键登录 ====================

  /**
   * 一键登录：点击即完成，无需填写任何资料
   * 头像留空 → 各页面（我的、本页展示态）回落到本地默认头像 /images/头像.png
   */
  quickLogin: function () {
    const old = wx.getStorageSync('userInfo');
    const userInfo = {
      // 若此前自定义过头像则沿用，否则留空走默认图
      avatarUrl: (old && old.avatarUrl) || '',
      // 若此前自定义过昵称则沿用，否则生成默认昵称
      nickName: (old && old.nickName) || this.generateNickName()
    };

    this.saveUserInfo(userInfo);
    wx.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => wx.navigateBack({ delta: 1 }), 600);
  },

  // 生成默认昵称：微信用户 + 4 位随机数字
  generateNickName: function () {
    const n = Math.floor(1000 + Math.random() * 9000);
    return '微信用户' + n;
  },

  // 落盘用户信息 + 后台静默预热 openid（不阻塞）
  saveUserInfo: function (userInfo) {
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('isLogin', true);
    this.setData({ userInfo: userInfo, isEditing: false });

    // 内容安全检测已改为后端本地词库，不再依赖 openid；
    // 这里只做后台静默预热，失败也不影响登录，绝不阻塞跳转。
    Auth.silentLogin();
  },

  // ==================== 修改资料（可选路径） ====================

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
  // 若此回调始终不触发，通常是：① 开发者工具不支持该能力（需真机）；
  // ② MP 后台《用户隐私保护指引》未声明「微信昵称、头像」，接口被微信禁用
  onChooseAvatar: function (e) {
    console.log('[login] onChooseAvatar 回调', e && e.detail);
    const avatarUrl = e.detail && e.detail.avatarUrl;
    if (!avatarUrl) {
      wx.showModal({
        title: '未能获取头像',
        content: '微信未返回头像文件。可改点下方「从相册选择」。',
        showCancel: false
      });
      return;
    }

    // 持久化头像，避免临时路径在重启后失效
    this.persistAvatar(avatarUrl)
      .then((savedPath) => this.setData({ avatarUrl: savedPath }))
      .catch(() => this.setData({ avatarUrl: avatarUrl }));
  },

  // 备用选头像入口：走相册选图，不依赖 chooseAvatar 能力
  // 开发者工具下 chooseAvatar 无响应时，用这条路径也能完成资料设置
  chooseAvatarFromAlbum: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file || !file.tempFilePath) return;
        const path = file.tempFilePath;
        this.persistAvatar(path)
          .then((savedPath) => this.setData({ avatarUrl: savedPath }))
          .catch(() => this.setData({ avatarUrl: path }));
      },
      fail: (err) => {
        const msg = String((err && err.errMsg) || '');
        // 用户主动取消，不打扰
        if (msg.indexOf('cancel') > -1) return;
        // 隐私协议类失败给出明确引导
        if (Privacy.handlePrivacyError(err)) return;
        console.warn('[login] chooseMedia 失败', err);
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
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

  // 编辑态保存：头像可留空（回落默认头像），昵称必须有
  completeLogin: function () {
    const that = this;
    const nickName = (that.data.nickName || '').trim();

    // 用 showModal 而非 showToast：toast 1.5 秒即消失，容易被误认为「点了没反应」
    if (!nickName) {
      wx.showModal({
        title: '请输入昵称',
        content: '点击昵称输入框即可快速填入微信昵称。',
        showCancel: false
      });
      return;
    }

    that.saveUserInfo({
      avatarUrl: that.data.avatarUrl || '',
      nickName: nickName
    });

    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack({ delta: 1 }), 600);
  },

  /**
   * 取消 / 返回
   * - 编辑态：退回资料展示态（不保存）
   * - 其他：返回上一页
   */
  cancelLogin: function () {
    if (this.data.isEditing) {
      this.setData({ isEditing: false });
      return;
    }
    wx.navigateBack({ delta: 1 });
  }
});
