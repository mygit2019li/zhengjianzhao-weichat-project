/**
 * NSFW 图片检测工具
 * 在图片上传后、处理前调用，用于检测图片是否包含不适当内容
 */
const Security = require('./security.js');

/**
 * 生成用于鉴黄的小尺寸副本：用离屏 canvas 把任意图片等比缩到最长边 ≤ maxSize、
 * 统一导出为 jpg，保证请求体很小，规避大图 / PNG 截图导致的后端 400 Bad Request。
 * 成功返回新的临时文件路径；不可用 / 失败时返回 null（交由调用方回退处理）。
 * @param {string} filePath
 * @param {number} maxSize 最长边像素，默认 512
 * @returns {Promise<string|null>}
 */
function prepareDetectFile(filePath, maxSize) {
  const MAX_EDGE = maxSize || 512;
  return new Promise((resolve) => {
    try {
      if (typeof wx.createOffscreenCanvas !== 'function') { resolve(null); return; }
      const canvas = wx.createOffscreenCanvas({ type: '2d', width: MAX_EDGE, height: MAX_EDGE });
      const img = canvas.createImage();
      img.onload = () => {
        try {
          const w = img.width || MAX_EDGE;
          const h = img.height || MAX_EDGE;
          const ratio = Math.min(MAX_EDGE / w, MAX_EDGE / h, 1);
          const tw = Math.max(1, Math.round(w * ratio));
          const th = Math.max(1, Math.round(h * ratio));
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext('2d');
          // 白底填充，避免 PNG 透明区域变黑影响检测
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, tw, th);
          ctx.drawImage(img, 0, 0, tw, th);
          wx.canvasToTempFilePath({
            canvas,
            fileType: 'jpg',
            quality: 0.6,
            success: (r) => resolve(r.tempFilePath || null),
            fail: () => resolve(null)
          });
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = filePath;
    } catch (e) {
      resolve(null);
    }
  });
}

const NSFW = {
  /**
   * 获取应用配置
   */
  getConfig: function () {
    const app = getApp();
    return {
      apiUrl: app.globalData.apiUrl,
      appId: app.globalData.appId,
      secretKey: app.globalData.apiSecretKey
    };
  },

  /**
   * 检测图片是否安全
   * @param {string} imageBase64 - 图片的 Base64 编码（不含 data:image 前缀）
   * @param {number} attempt - 内部重试计数（偶发网络抖动 / 5xx 自动重试一次）
   * @returns {Promise<{status: boolean, is_safe: boolean, score: number, details: array, message: string}>}
   */
  checkImage: function (imageBase64, attempt) {
    const config = this.getConfig();
    attempt = attempt || 0;

    return new Promise((resolve, reject) => {
      // 准备请求参数
      const params = {
        input_image_base64: imageBase64
      };

      // 获取安全头
      const headers = Security.getSecurityHeaders(params, config.appId, config.secretKey);

      // 加密参数
      const encryptedPayload = Security.encryptData(params, config.secretKey);

      // 网络抖动 / 超时 / 5xx / 429 时自动重试一次，显著降低「有时检测失败」的概率
      // （用户主动 abort 不重试）
      const retry = () => {
        setTimeout(() => {
          this.checkImage(imageBase64, attempt + 1).then(resolve).catch(reject);
        }, 800);
      };

      wx.request({
        url: `${config.apiUrl}/nsfw_check`,
        method: 'POST',
        timeout: 15000,
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...headers
        },
        data: {
          payload: encryptedPayload
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
            return;
          }
          const retriableStatus = res.statusCode === 429 || res.statusCode >= 500;
          if (attempt < 1 && retriableStatus) {
            retry();
            return;
          }
          reject(new Error(`请求失败: ${res.statusCode}`));
        },
        fail: (err) => {
          const retriable = err && err.errMsg && !/abort/i.test(err.errMsg);
          if (attempt < 1 && retriable) {
            retry();
            return;
          }
          reject(new Error(`网络错误: ${err.errMsg}`));
        }
      });
    });
  },

  /**
   * 从文件路径读取并检测图片
   * @param {string} filePath - 图片临时文件路径
   * @returns {Promise<{status: boolean, is_safe: boolean, score: number, details: array, message: string}>}
   */
  checkImageFromFile: function (filePath) {
    return new Promise((resolve, reject) => {
      const readAndCheck = (path) => {
        wx.getFileSystemManager().readFile({
          filePath: path,
          encoding: 'base64',
          success: (res) => {
            this.checkImage(res.data)
              .then(resolve)
              .catch(reject);
          },
          fail: (err) => {
            reject(new Error(`读取文件失败: ${err.errMsg}`));
          }
        });
      };

      // 生成检测副本：优先用离屏 canvas 统一降采样到 ≤512px 并导出 jpg，
      // 保证任意格式（含大图 / PNG 截图）的请求体都很小，规避后端 400 Bad Request。
      // 副本仅用于鉴黄，不会改动用户最终成品图。
      prepareDetectFile(filePath).then((smallPath) => {
        if (smallPath) {
          readAndCheck(smallPath);
          return;
        }
        // canvas 不可用时回退到 compressImage（更小尺寸），再兜底原图
        if (typeof wx.compressImage === 'function') {
          wx.compressImage({
            src: filePath,
            quality: 60,
            compressedWidth: 768,
            success: (r) => readAndCheck(r.tempFilePath || filePath),
            fail: () => readAndCheck(filePath)
          });
        } else {
          readAndCheck(filePath);
        }
      });
    });
  },

  /**
   * 批量检测多张图片并显示结果
   * 任一张不安全或检测失败即返回 false
   * @param {string[]} filePaths - 图片临时文件路径数组
   * @returns {Promise<boolean>} - 全部图片是否安全
   */
  checkImagesAndAlert: async function (filePaths) {
    const paths = (filePaths || []).filter(Boolean);
    if (!paths.length) return true;

    // 逐张检测：串行避免并发过高，且能准确定位不合规图片
    for (let i = 0; i < paths.length; i++) {
      const isSafe = await this.checkAndAlert(paths[i], true);
      if (!isSafe) return false;
    }
    return true;
  },

  /**
   * 批量检测并显示结果
   * 如果图片不安全，会显示提示并返回 false
   * @param {string} imageBase64OrPath - 图片 Base64 编码或临时文件路径
   * @param {boolean} isFilePath - 是否是文件路径
   * @returns {Promise<boolean>} - 图片是否安全
   */
  checkAndAlert: async function (imageBase64OrPath, isFilePath = false) {
    try {
      wx.showLoading({
        title: '图片检测中...',
        mask: true
      });

      let result;
      if (isFilePath) {
        result = await this.checkImageFromFile(imageBase64OrPath);
      } else {
        result = await this.checkImage(imageBase64OrPath);
      }

      wx.hideLoading();

      if (!result.status) {
        wx.showToast({
          title: result.message || '检测失败',
          icon: 'none',
          duration: 2000
        });
        return false;
      }

      if (!result.is_safe) {
        wx.showModal({
          title: '图片不合规',
          content: '检测到图片包含不适当内容，请更换图片后重试。',
          showCancel: false,
          confirmText: '我知道了'
        });
        return false;
      }

      return true;
    } catch (error) {
      wx.hideLoading();
      console.error('NSFW 检测错误:', error);
      // 区分「网络/服务异常」与真正的检测不通过：前者提示可重试，后者（如 400）不误导用户
      const m = (error && error.message) || '';
      const isNetwork = /网络错误/.test(m) || /请求失败: (429|5\d\d)/.test(m);
      const msg = isNetwork ? '网络异常，检测失败，请重试' : '图片检测失败';
      wx.showToast({
        title: msg,
        icon: 'none',
        duration: 2000
      });
      // 检测失败时，为安全起见返回 false
      return false;
    }
  }
};

module.exports = NSFW;
