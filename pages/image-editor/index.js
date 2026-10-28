const Security = require('../../utils/security.js');
const NSFW = require('../../utils/nsfw.js');
const { checkImageSize } = require('../../utils/util.js');
const { ID_PHOTO_COLORS, ID_PHOTO_SIZES, compositeBackground, cropAndComposite, base64ToTempFile } = require('../../utils/image-processor.js');

function getSizeName(key) {
  const size = ID_PHOTO_SIZES.find((item) => item.key === key);
  return size ? size.name : '原图';
}

function getBackgroundPreviewStyle(colorKey) {
  if (colorKey === 'transparent') {
    // checkerboard pattern
    return [
      'background-color: #fff',
      'background-image: linear-gradient(45deg, #d8d8d8 25%, transparent 25%), linear-gradient(-45deg, #d8d8d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d8d8 75%), linear-gradient(-45deg, transparent 75%, #d8d8d8 75%)',
      'background-size: 20rpx 20rpx',
      'background-position: 0 0, 0 10rpx, 10rpx -10rpx, -10rpx 0'
    ].join('; ');
  }

  const colorConfig = ID_PHOTO_COLORS[colorKey];
  if (colorConfig && colorConfig.gradientCss) {
    return `background: ${colorConfig.gradientCss};`;
  }
  if (colorConfig && colorConfig.rgb) {
    return `background: ${colorConfig.rgb};`;
  }
  return `background: ${colorKey};`;
}

const BACKGROUND_COLOR_OPTIONS = [
  { key: 'transparent', name: '透明' },
  { key: 'white', name: '白色' },
  { key: 'gray', name: '灰色' },
  { key: 'blue', name: '蓝色' },
  { key: 'red', name: '红色' },
  { key: 'skyblue', name: '天蓝' },
  { key: 'green', name: '绿色' },
  { key: 'darkred', name: '深红色' },
  { key: 'darkblue', name: '深蓝色' },
  { key: 'hmt-blue', name: '海马体蓝' },
  { key: 'hmt-pink', name: '海马体粉' },
  { key: 'hmt-gray', name: '海马体灰' }
].map((item) => ({ ...item, style: getBackgroundPreviewStyle(item.key) }));

function getBgName(bgType, backgroundColor) {
  if (bgType === 'image') return '自定义背景';
  const opt = BACKGROUND_COLOR_OPTIONS.find((item) => item.key === backgroundColor);
  return opt ? opt.name : '透明';
}

Page({
  data: {
    imagePath: '',
    showSourceSheet: false,
    transparentImage: '',
    resultImage: '',
    backgroundImage: '',
    backgroundColor: 'transparent',
    bgType: 'color',
    bgName: '透明',
    backgroundColorOptions: BACKGROUND_COLOR_OPTIONS,
    isProcessing: false,
    photoSizes: ID_PHOTO_SIZES,
    photoSizeKey: 'original',
    photoSizeName: '原图',
    photoSizeW: 0,
    photoSizeH: 0,
    showSizePanel: false,
    tempSizeKey: 'original',
    showBgPanel: false,
    tempBgType: 'color',
    tempBgColor: 'transparent',
    tempBgImage: '',
    originalWidth: 0,
    originalHeight: 0,
  },

  onLoad(options) {
    if (options.imagePath) {
      NSFW.checkAndAlert(options.imagePath, true).then((isSafe) => {
        if (!isSafe) return;
        this.setData({
          imagePath: options.imagePath
        });
        this.getImageSize(options.imagePath);
        this.processImage(options.imagePath);
      });
    }
  },

  // 读取图片原始宽高（用于左下角尺寸角标）
  getImageSize(path) {
    if (!path) return;
    const that = this;
    wx.getImageInfo({
      src: path,
      success: (info) => {
        that.setData({
          originalWidth: info.width,
          originalHeight: info.height
        });
      },
      fail: (err) => {
        console.warn('获取图片尺寸失败:', err);
      }
    });
  },

  // 选择主图（唤起统一来源弹窗）
  uploadImage() {
    this.setData({ showSourceSheet: true });
  },

  closeSourceSheet() {
    this.setData({ showSourceSheet: false });
  },

  // 统一弹窗选图完成（组件已做大小校验 + 鉴黄）
  onSourceChosen(e) {
    const path = (e.detail && e.detail.paths || [])[0];
    if (!path) return;
    this.setData({
      showSourceSheet: false,
      imagePath: path,
      originalWidth: 0,
      originalHeight: 0
    });
    this.getImageSize(path);
    this.processImage(path);
  },

  processImage(filePath) {
    const that = this;
    that.setData({
      isProcessing: true
    });

    const app = getApp();
    const apiUrl = app.globalData.apiUrl;

    const formData = {
      human_matting_model: 'modnet_photographic_portrait_matting',
      dpi: 300
    };

    // Generate security headers
    const signData = { ...formData };
    const encryptedParams = Security.encryptData(formData, app.globalData.apiSecretKey);
    const securityHeaders = Security.getSecurityHeaders(signData, app.globalData.appId, app.globalData.apiSecretKey);

    wx.uploadFile({
      url: `${apiUrl}/human_matting`,
      filePath: filePath,
      name: 'input_image',
      header: securityHeaders,
      formData: {
        payload: encryptedParams
      },
      success: function (res) {
        try {
          let humanMattingResponse = JSON.parse(res.data);
          console.log('human_matting response:', humanMattingResponse);

          if (humanMattingResponse.status === true || humanMattingResponse.status === 1) {
            const transparentImage = humanMattingResponse.image_base64;

            if (!transparentImage) {
              that.setData({ isProcessing: false });
              wx.showToast({ title: '抠图失败', icon: 'none' });
              return;
            }

            let processedTransparentImage = transparentImage;
            if (!processedTransparentImage.startsWith('data:image/')) {
              processedTransparentImage = 'data:image/png;base64,' + processedTransparentImage;
            }

            that.setData({
              transparentImage: processedTransparentImage,
              isProcessing: false,
              photoSizeKey: 'original',
              photoSizeName: '原图',
              photoSizeW: 0,
              photoSizeH: 0
            });

            // 默认展示透明底结果
            that.updateResult();

          } else {
            that.setData({ isProcessing: false });
            wx.showToast({
              title: humanMattingResponse.message || '抠图失败',
              icon: 'none'
            });
          }
        } catch (e) {
          that.setData({ isProcessing: false });
          console.error('Parse response failed', e);
          wx.showToast({ title: '系统错误', icon: 'none' });
        }
      },
      fail: function (err) {
        that.setData({ isProcessing: false });
        console.error('Upload failed', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  openBgPanel() {
    this.setData({
      showBgPanel: true,
      tempBgType: this.data.bgType,
      tempBgColor: this.data.backgroundColor,
      tempBgImage: this.data.backgroundImage
    });
  },

  closeBgPanel() {
    this.setData({ showBgPanel: false });
  },

  selectTempBgColor(e) {
    this.setData({
      tempBgType: 'color',
      tempBgColor: e.currentTarget.dataset.color,
      tempBgImage: ''
    });
  },

  selectTempBgImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album'],
      success: async (res) => {
        if (!checkImageSize(res.tempFiles)) return;
        const bgPath = res.tempFilePaths[0];
        const isSafe = await NSFW.checkAndAlert(bgPath, true);
        if (!isSafe) return;
        this.setData({
          tempBgType: 'image',
          tempBgImage: bgPath,
          tempBgColor: ''
        });
      }
    });
  },

  confirmBg() {
    const { tempBgType, tempBgColor, tempBgImage } = this.data;
    this.setData({
      showBgPanel: false,
      bgType: tempBgType,
      backgroundColor: tempBgType === 'color' ? tempBgColor : '',
      backgroundImage: tempBgType === 'image' ? tempBgImage : '',
      bgName: getBgName(tempBgType, tempBgColor)
    });
    this.updateResult();
  },

  openSizePanel() {
    this.setData({
      showSizePanel: true,
      tempSizeKey: this.data.photoSizeKey
    });
  },

  closeSizePanel() {
    this.setData({ showSizePanel: false });
  },

  selectSize(e) {
    this.setData({ tempSizeKey: e.currentTarget.dataset.key });
  },

  confirmSize() {
    const key = this.data.tempSizeKey;
    const size = ID_PHOTO_SIZES.find((item) => item.key === key) || ID_PHOTO_SIZES[0];
    this.setData({
      showSizePanel: false,
      photoSizeKey: key,
      photoSizeName: size.name,
      photoSizeW: size.w,
      photoSizeH: size.h
    });
    this.updateResult();
  },

  updateResult() {
    if (!this.data.transparentImage) return;

    wx.showLoading({ title: '合成中...' });

    const that = this;
    const { bgType, backgroundImage, backgroundColor, transparentImage, photoSizeKey } = this.data;

    // 指定证件尺寸：按目标尺寸 cover 裁切后合成（含透明底）
    const targetSize = ID_PHOTO_SIZES.find((item) => item.key === photoSizeKey);
    if (targetSize && targetSize.key !== 'original' && targetSize.w > 0 && targetSize.h > 0) {
      let colorArg = '';
      let imageArg = '';
      if (bgType === 'image') {
        imageArg = backgroundImage;
      } else if (backgroundColor !== 'transparent') {
        colorArg = backgroundColor;
      }

      cropAndComposite(
        transparentImage,
        colorArg,
        imageArg,
        targetSize.w,
        targetSize.h,
        function (resultPath) {
          that.setData({ resultImage: resultPath });
        },
        function () {
          wx.hideLoading();
        }
      );
      return;
    }

    if (bgType === 'color' && backgroundColor === 'transparent') {
      base64ToTempFile(transparentImage)
        .then((tempFilePath) => {
          that.setData({
            resultImage: tempFilePath
          });
        })
        .catch((err) => {
          console.error('透明底图片转换失败', err);
          that.setData({ resultImage: '' });
          wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        })
        .finally(() => {
          wx.hideLoading();
        });
      return;
    }
    
    let colorArg = '';
    let imageArg = '';
    
    if (bgType === 'image') {
        imageArg = backgroundImage;
    } else {
        colorArg = backgroundColor;
    }
    
    compositeBackground(
        transparentImage, 
        colorArg, 
        imageArg, 
        function(resultPath) {
            that.setData({
                resultImage: resultPath
            });
        },
        function() {
            wx.hideLoading();
        }
    );
  },

  saveImage() {
    if (!this.data.resultImage) return;
    
    wx.showLoading({ title: '保存中...' });
    
    wx.saveImageToPhotosAlbum({
      filePath: this.data.resultImage,
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '已保存', icon: 'success' });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('Save failed', err);
        // Handle auth denial
        if (err.errMsg && (err.errMsg.includes('auth') || err.errMsg.includes('deny'))) {
             wx.showModal({
                title: '提示',
                content: '需要保存到相册权限',
                success: (res) => {
                    if (res.confirm) wx.openSetting();
                }
             });
        } else {
             wx.showToast({ title: '保存失败', icon: 'none' });
        }
      }
    });
  }
});
