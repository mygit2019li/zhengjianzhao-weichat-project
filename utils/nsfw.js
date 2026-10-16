/**
 * NSFW 图片检测工具
 * 在图片上传后、处理前调用，用于检测图片是否包含不适当内容
 */
const Security = require('./security.js');

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
   * @returns {Promise<{status: boolean, is_safe: boolean, score: number, details: array, message: string}>}
   */
  checkImage: function (imageBase64) {
    const config = this.getConfig();

    return new Promise((resolve, reject) => {
      // 准备请求参数
      const params = {
        input_image_base64: imageBase64
      };

      // 获取安全头
      const headers = Security.getSecurityHeaders(params, config.appId, config.secretKey);

      // 加密参数
      const encryptedPayload = Security.encryptData(params, config.secretKey);

      wx.request({
        url: `${config.apiUrl}/nsfw_check`,
        method: 'POST',
        timeout: 30000,
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
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`));
          }
        },
        fail: (err) => {
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

      // 检测前先压缩：减小上传体积，规避大图 base64 触发后端 413 / 请求超时
      // 导致的「偶发检测失败」。压缩只用于鉴黄副本，不会改动用户最终成品图。
      if (typeof wx.compressImage === 'function') {
        wx.compressImage({
          src: filePath,
          quality: 70,
          compressedWidth: 1280,
          success: (r) => readAndCheck(r.tempFilePath || filePath),
          fail: () => readAndCheck(filePath)  // 压缩失败回退原图
        });
      } else {
        readAndCheck(filePath);
      }
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
      wx.showToast({
        title: '图片检测失败',
        icon: 'none',
        duration: 2000
      });
      // 检测失败时，为安全起见返回 false
      return false;
    }
  }
};

module.exports = NSFW;
