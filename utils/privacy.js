/**
 * 隐私协议工具
 *
 * 用户在未同意《小程序用户隐私保护指引》时，微信会直接禁用隐私接口，
 * 调用会失败但不会给用户任何提示，表现为「点了没反应」。
 * 本模块用于识别这类失败并给出引导。
 *
 * 常见报错：
 *   { errMsg: 'chooseImage:fail api scope is not declared in the privacy agreement', errno: 112 }
 *   { errMsg: 'chooseImage:fail appid privacy api banned' }
 *   { errMsg: '...', errno: 103 }  用户拒绝
 *   { errMsg: '...', errno: 104 }  用户未同意
 */

const Privacy = {
  /**
   * 判断是否为「隐私协议未授权」类错误
   * @param {object} err wx 接口的失败对象
   * @returns {boolean}
   */
  isPrivacyError(err) {
    if (!err) return false;
    const msg = String(err.errMsg || err.message || '');
    return (
      msg.indexOf('privacy') > -1 ||
      err.errno === 112 ||
      err.errno === 103 ||
      err.errno === 104
    );
  },

  /**
   * 统一处理隐私错误：命中则提示用户并返回 true
   * @param {object} err wx 接口的失败对象
   * @returns {boolean} 是否命中并已处理
   */
  handlePrivacyError(err) {
    if (!this.isPrivacyError(err)) return false;

    const msg = String(err.errMsg || '');

    // appid 隐私接口权限被回收：属于后台配置问题，用户无法自行解决
    if (msg.indexOf('banned') > -1) {
      wx.showModal({
        title: '功能暂不可用',
        content: '当前小程序尚未完成隐私协议声明，请稍后再试。',
        showCancel: false
      });
      return true;
    }

    wx.showModal({
      title: '需要同意隐私协议',
      content: '选择图片前，请先同意《用户隐私保护指引》。',
      confirmText: '去同意',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          Privacy.requirePrivacy();
        }
      }
    });
    return true;
  },

  /**
   * 主动拉起隐私授权流程
   * 未同意时微信会弹官方隐私弹窗（本项目未注册 onNeedPrivacyAuthorization）
   * @returns {Promise<boolean>} 是否已获得授权
   */
  requirePrivacy() {
    return new Promise((resolve) => {
      if (typeof wx.requirePrivacyAuthorize !== 'function') {
        // 基础库 < 2.32.3 不拦截隐私接口，视为已授权
        resolve(true);
        return;
      }
      wx.requirePrivacyAuthorize({
        success: () => resolve(true),
        fail: () => resolve(false),
        complete: () => {}
      });
    });
  }
};

module.exports = Privacy;
