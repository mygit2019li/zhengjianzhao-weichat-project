/**
 * 文本内容安全检测工具
 * 在「用户输入文字 → 合成图片 → 保存/导出」链路的保存前调用，拦截违规文本。
 *
 * 底层由服务端本地敏感词 DFA 检测（开源方案，替代微信 msgSecCheck）。
 * 不再依赖 openid / wx.login 登录态。
 */
const Security = require('./security.js');

// 场景枚举：1 资料 / 2 评论 / 3 论坛 / 4 社交日志
// 本小程序用户文字用于图片合成，归入「评论」场景
const DEFAULT_SCENE = 2;

const ContentSecurity = {
  getConfig() {
    const app = getApp();
    return {
      apiUrl: app.globalData.apiUrl,
      appId: app.globalData.appId,
      secretKey: app.globalData.apiSecretKey
    };
  },

  /**
   * 检测文本是否安全（不弹 UI）
   * @param {string} content 待检测文本
   * @param {number} scene 场景枚举，默认 2
   * @returns {Promise<{status:boolean, is_safe:boolean, suggest:string, label:number, message:string, errcode?:number}>}
   */
  checkText(content, scene = DEFAULT_SCENE) {
    const text = (content == null ? '' : String(content)).trim();

    // 空文本无需检测
    if (!text) {
      return Promise.resolve({
        status: true,
        is_safe: true,
        suggest: 'pass',
        label: 100,
        message: '空文本'
      });
    }

    const config = this.getConfig();
    const params = { content: text, scene };
    const headers = Security.getSecurityHeaders(params, config.appId, config.secretKey);
    const encryptedPayload = Security.encryptData(params, config.secretKey);

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${config.apiUrl}/text_check`,
        method: 'POST',
        timeout: 30000,
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...headers
        },
        data: { payload: encryptedPayload },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            resolve(res.data);
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(`网络错误: ${err.errMsg}`))
      });
    }).catch((error) => {
      // 网络/服务异常：返回失败态，由调用方决定是否放行
      return {
        status: false,
        is_safe: false,
        suggest: 'unknown',
        label: -1,
        message: error.message || '检测失败'
      };
    });
  },

  /**
   * 检测文本并给出 UI 反馈
   * @param {string} content 待检测文本
   * @param {number} scene 场景枚举
   * @param {object} options { loadingTitle }
   * @returns {Promise<boolean>} 文本是否安全（true 才允许继续保存）
   */
  async checkTextAndAlert(content, scene = DEFAULT_SCENE, options = {}) {
    const text = (content == null ? '' : String(content)).trim();
    if (!text) return true;

    wx.showLoading({
      title: options.loadingTitle || '内容检测中...',
      mask: true
    });

    let result;
    try {
      result = await this.checkText(text, scene);
    } finally {
      wx.hideLoading();
    }

    // 接口异常：从严处理，不放行
    if (!result.status) {
      wx.showToast({
        title: result.message || '内容检测失败，请重试',
        icon: 'none',
        duration: 2500
      });
      return false;
    }

    if (result.is_safe) return true;

    // risky / review 一律拦截（review 需人工复核，本小程序无此能力，从严处理）
    wx.showModal({
      title: '内容不合规',
      content: '检测到文字包含违规内容，请修改后重试。',
      showCancel: false,
      confirmText: '我知道了'
    });
    return false;
  },

  /**
   * 批量检测多个文本，全部通过才返回 true
   * @param {string[]} contents
   * @param {number} scene
   * @returns {Promise<boolean>}
   */
  async checkTextsAndAlert(contents, scene = DEFAULT_SCENE) {
    const list = (contents || [])
      .map((item) => (item == null ? '' : String(item)).trim())
      .filter(Boolean);

    if (!list.length) return true;

    wx.showLoading({ title: '内容检测中...', mask: true });
    try {
      for (let i = 0; i < list.length; i++) {
        const result = await this.checkText(list[i], scene);
        if (!result.status || !result.is_safe) {
          wx.hideLoading();
          if (result.status) {
            wx.showModal({
              title: '内容不合规',
              content: '检测到文字包含违规内容，请修改后重试。',
              showCancel: false,
              confirmText: '我知道了'
            });
          } else {
            wx.showToast({
              title: result.message || '内容检测失败，请重试',
              icon: 'none',
              duration: 2500
            });
          }
          return false;
        }
      }
    } finally {
      wx.hideLoading();
    }

    return true;
  }
};

module.exports = ContentSecurity;
