/**
 * 登录态工具
 * 通过 wx.login 的 code 换取 openid，供内容安全检测（msgSecCheck 2.0）使用。
 *
 * 注意：
 * - 仅缓存 openid，session_key 由服务端保管，不下发到客户端。
 * - msgSecCheck 要求用户近两小时访问过小程序，openid 失效时（错误码 61010）
 *   需重新走一次登录流程。
 */
const Security = require('./security.js');

const STORAGE_KEY = 'openid';

// 进程内缓存，避免频繁读 storage
let _openidCache = '';

// 登录请求去重：多个页面并发调用时复用同一次 wx.login，避免重复消耗 code
let _pending = null;

function getConfig() {
  const app = getApp();
  return {
    apiUrl: app.globalData.apiUrl,
    appId: app.globalData.appId,
    secretKey: app.globalData.apiSecretKey
  };
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res && res.code) {
          resolve(res.code);
        } else {
          reject(new Error('wx.login 未返回 code'));
        }
      },
      fail: (err) => reject(new Error(`wx.login 失败: ${err.errMsg || err}`))
    });
  });
}

function requestOpenid(code) {
  const config = getConfig();

  if (!config.apiUrl) {
    return Promise.reject(new Error('apiUrl 未配置'));
  }

  const params = { code };
  const headers = Security.getSecurityHeaders(params, config.appId, config.secretKey);
  const encryptedPayload = Security.encryptData(params, config.secretKey);

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiUrl}/login`,
      method: 'POST',
      header: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...headers
      },
      data: { payload: encryptedPayload },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.status && res.data.openid) {
          resolve(res.data.openid);
        } else {
          reject(new Error((res.data && res.data.message) || `登录失败: ${res.statusCode}`));
        }
      },
      fail: (err) => reject(new Error(`网络错误: ${err.errMsg}`))
    });
  });
}

const Auth = {
  /**
   * 获取已缓存的 openid（同步，可能为空）
   */
  getOpenid() {
    if (_openidCache) return _openidCache;
    try {
      _openidCache = wx.getStorageSync(STORAGE_KEY) || '';
    } catch (e) {
      _openidCache = '';
    }
    return _openidCache;
  },

  /**
   * 确保拿到 openid
   * @param {boolean} force 为 true 时忽略缓存重新登录
   * @returns {Promise<string>}
   */
  ensureOpenid(force = false) {
    if (!force) {
      const cached = this.getOpenid();
      if (cached) return Promise.resolve(cached);
    }

    // 已有登录在途：复用同一个 Promise，避免并发重复登录
    if (_pending) return _pending;

    _pending = wxLogin()
      .then((code) => requestOpenid(code))
      .then((openid) => {
        _openidCache = openid;
        try {
          wx.setStorageSync(STORAGE_KEY, openid);
        } catch (e) {
          // storage 写入失败不阻塞流程
        }
        return openid;
      });

    // 无论成功或失败都释放锁
    // （微信基础库对 Promise.prototype.finally 支持不一致，用双回调更稳）
    const release = () => { _pending = null; };
    _pending.then(release, release);

    return _pending;
  },

  /**
   * 静默登录：启动时预取 openid，失败不打扰用户。
   * @returns {Promise<string>} 成功返回 openid，失败返回空字符串
   */
  silentLogin() {
    return this.ensureOpenid().catch(() => '');
  },

  /**
   * 清除缓存的 openid（openid 失效时调用）
   */
  clearOpenid() {
    _openidCache = '';
    try {
      wx.removeStorageSync(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }
};

module.exports = Auth;
