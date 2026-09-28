const Security = require('../../utils/security.js');

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB

Page({
  data: {
    pdfPath: '',
    pdfName: '',
    pdfSizeStr: '',
    pdfPages: [],
    converting: false
  },

  formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  choosePdf() {
    if (!wx.chooseMessageFile) {
      wx.showToast({ title: '当前微信版本不支持选择文件', icon: 'none' });
      return;
    }

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf'],
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        if (file.size > MAX_PDF_SIZE) {
          wx.showToast({ title: 'PDF 不能超过 20MB', icon: 'none' });
          return;
        }
        this.setData({
          pdfPath: file.path,
          pdfName: file.name || '未命名.pdf',
          pdfSizeStr: this.formatSize(file.size),
          pdfPages: []
        });
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.includes('cancel')) return;
        wx.showToast({ title: '选择文件失败', icon: 'none' });
      }
    });
  },

  convertPdf() {
    if (!this.data.pdfPath || this.data.converting) return;
    this.setData({ converting: true, pdfPages: [] });
    wx.showLoading({ title: '上传中...', mask: true });

    const app = getApp();
    const apiUrl = app.globalData.apiUrl;
    const formData = { dpi: 150 };
    const signData = { ...formData };
    const encryptedParams = Security.encryptData(formData, app.globalData.apiSecretKey);
    const securityHeaders = Security.getSecurityHeaders(signData, app.globalData.appId, app.globalData.apiSecretKey);

    const uploadTask = wx.uploadFile({
      url: `${apiUrl}/pdf2img`,
      filePath: this.data.pdfPath,
      name: 'file',
      header: securityHeaders,
      formData: {
        payload: encryptedParams
      },
      success: (res) => {
        this.handlePdfResponse(res);
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ converting: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });

    uploadTask.onProgressUpdate((res) => {
      if (this.data.converting) {
        wx.showLoading({ title: `上传中 ${res.progress}%`, mask: true });
      }
    });
  },

  handlePdfResponse(res) {
    wx.hideLoading();
    let resp;
    try {
      resp = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    } catch (e) {
      this.setData({ converting: false });
      wx.showToast({ title: '服务器响应异常', icon: 'none' });
      return;
    }

    const ok = resp.status === true || resp.status === 1 || resp.code === 0;
    const images = (ok && (resp.images || (resp.data && resp.data.images))) || [];

    if (!ok || images.length === 0) {
      this.setData({ converting: false });
      wx.showToast({ title: resp.message || '转换失败', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '生成图片...', mask: true });
    Promise.all(images.map((base64, index) => this.writeBase64Image(base64, index)))
      .then((paths) => {
        wx.hideLoading();
        this.setData({ pdfPages: paths, converting: false });
        wx.showToast({ title: `转换成功, 共${paths.length}页`, icon: 'success' });
      })
      .catch(() => {
        wx.hideLoading();
        this.setData({ converting: false });
        wx.showToast({ title: '图片生成失败', icon: 'none' });
      });
  },

  // base64 写入本地临时文件(按内容类型确定扩展名)
  writeBase64Image(imageData, index) {
    return new Promise((resolve, reject) => {
      let pure = imageData || '';
      let ext = 'png';
      if (pure.startsWith('data:image/')) {
        const match = pure.slice(0, 30).match(/data:image\/(png|jpeg|jpg|webp)/);
        if (match) ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        pure = pure.split(',')[1];
      }
      if (!pure) {
        reject(new Error('empty image data'));
        return;
      }
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/pdf_page_${Date.now()}_${index}.${ext}`;
      fs.writeFile({
        filePath,
        data: pure,
        encoding: 'base64',
        success: () => resolve(filePath),
        fail: reject
      });
    });
  },

  previewPdfPage(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.pdfPages[index],
      urls: this.data.pdfPages
    });
  },

  savePdfPages() {
    const pages = this.data.pdfPages;
    if (!pages.length) {
      wx.showToast({ title: '没有可保存的图片', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...', mask: true });
    let savedCount = 0;
    let failCount = 0;

    const saveOne = (index) => {
      if (index >= pages.length) {
        wx.hideLoading();
        wx.showToast({
          title: `成功${savedCount}张, 失败${failCount}张`,
          icon: 'none'
        });
        return;
      }

      wx.saveImageToPhotosAlbum({
        filePath: pages[index],
        success: () => {
          savedCount++;
          saveOne(index + 1);
        },
        fail: (err) => {
          failCount++;
          if (err.errMsg && err.errMsg.includes('auth')) {
            wx.hideLoading();
            wx.showModal({
              title: '提示',
              content: '需要保存到相册权限',
              success: (sm) => { if (sm.confirm) wx.openSetting(); }
            });
            return;
          }
          saveOne(index + 1);
        }
      });
    };

    saveOne(0);
  },

  onShareAppMessage() {
    return {
      title: 'PDF转图片',
      path: '/pages/pdf2img/index'
    };
  }
});
