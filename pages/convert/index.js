const NSFW = require('../../utils/nsfw.js');

Page({
  data: {
    imagePath: '',
    imagePaths: [],
    showSourceSheet: false, // 图片来源选择弹窗
    currentFormat: '',
    targetFormat: 'jpg'
  },

  onLoad(options) {
    if (options.imagePath) {
      const incomingPath = options.imagePath;
      NSFW.checkAndAlert(incomingPath, true).then((isSafe) => {
        if (isSafe) this.initImage(incomingPath);
      });
    }
  },

  // 选择图片（唤起统一来源弹窗）
  chooseImage() {
    this.setData({ showSourceSheet: true });
  },

  closeSourceSheet() {
    this.setData({ showSourceSheet: false });
  },

  // 统一弹窗选图完成（组件已做大小校验 + 鉴黄）
  onSourceChosen(e) {
    const paths = ((e.detail && e.detail.paths) || []).slice(0, 20);
    if (!paths.length) return;
    this.setData({ showSourceSheet: false });
    this.initImages(paths);
  },

  detectFormat(path) {
    const lowerPath = (path || '').toLowerCase();
    if (lowerPath.endsWith('.png')) return 'PNG';
    if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) return 'JPG';
    if (lowerPath.endsWith('.webp')) return 'WEBP';
    return '未知';
  },

  initImage(path) {
    this.initImages([path]);
  },

  initImages(paths) {
    const validPaths = (paths || []).filter(Boolean).slice(0, 20);
    if (validPaths.length === 0) return;
    const formatList = validPaths.map((path) => this.detectFormat(path));
    const firstFormat = formatList[0];
    const isMixed = formatList.some((format) => format !== firstFormat);
    const format = isMixed ? '混合格式' : firstFormat;
    let target = this.data.targetFormat;
    if (format === 'PNG') target = 'jpg';
    if (format === 'JPG') target = 'png';
    this.setData({
      imagePath: validPaths[0],
      imagePaths: validPaths,
      currentFormat: format,
      targetFormat: target
    });
  },

  onFormatChange(e) {
    this.setData({
      targetFormat: e.detail.value
    });
  },

  convertAndSave() {
    const imagePaths = this.data.imagePaths.length ? this.data.imagePaths : (this.data.imagePath ? [this.data.imagePath] : []);
    if (!imagePaths.length) return;

    const query = wx.createSelectorQuery();
    query.select('#convertCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
           wx.showToast({ title: '转换失败', icon: 'none' });
           return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        this.processBatchConvert(imagePaths, canvas, ctx, 0);
      });
  },

  processBatchConvert(imagePaths, canvas, ctx, index) {
    const total = imagePaths.length;
    if (index >= total) {
      wx.hideLoading();
      wx.showToast({ title: `已保存${total}张`, icon: 'success' });
      return;
    }

    wx.showLoading({ title: `转换中(${index + 1}/${total})...`, mask: true });
    const img = canvas.createImage();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, img.width, img.height);
      if (this.data.targetFormat === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, img.width, img.height);
      }
      ctx.drawImage(img, 0, 0, img.width, img.height);
      wx.canvasToTempFilePath({
        canvas,
        fileType: this.data.targetFormat,
        quality: 1,
        success: (res) => {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              this.processBatchConvert(imagePaths, canvas, ctx, index + 1);
            },
            fail: (err) => {
              wx.hideLoading();
              if (err.errMsg && err.errMsg.includes('auth')) {
                wx.showModal({
                  title: '提示',
                  content: '需要保存到相册权限',
                  success: (sm) => { if (sm.confirm) wx.openSetting(); }
                });
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            }
          });
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '转换失败', icon: 'none' });
        }
      });
    };
    img.onerror = () => {
      wx.hideLoading();
      wx.showToast({ title: '图片加载失败', icon: 'none' });
    };
    img.src = imagePaths[index];
  },

  onShareAppMessage() {
    return {
      title: '图片格式转换',
      path: '/pages/convert/index'
    };
  }
});
