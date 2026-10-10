const Security = require('../../utils/security.js');
const NSFW = require('../../utils/nsfw.js');
const { checkImageSize } = require('../../utils/util.js');
const { ID_PHOTO_COLORS, compositeBackground, base64ToTempFile } = require('../../utils/image-processor.js');

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

Page({
  data: {
    imagePath: '',
    transparentImage: '',
    resultImage: '',
    backgroundImage: '',
    backgroundColor: 'transparent',
    bgType: 'color',
    backgroundColorOptions: BACKGROUND_COLOR_OPTIONS,
  },

  onLoad(options) {
    if (options.imagePath) {
      NSFW.checkAndAlert(options.imagePath, true).then((isSafe) => {
        if (!isSafe) return;
        this.setData({
          imagePath: options.imagePath
        });
        this.processImage(options.imagePath);
      });
    }
  },

  uploadImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFiles = res.tempFiles;
        if (!checkImageSize(tempFiles)) return;

        const tempFilePath = res.tempFilePaths[0];
        const isSafe = await NSFW.checkAndAlert(tempFilePath, true);
        if (!isSafe) return;

        this.setData({
          imagePath: tempFilePath
        });
        this.processImage(tempFilePath);
      }
    });
  },

  processImage(filePath) {
    const that = this;
    wx.showLoading({
      title: '正在抠图...',
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
              wx.hideLoading();
              wx.showToast({ title: '抠图失败', icon: 'none' });
              return;
            }

            let processedTransparentImage = transparentImage;
            if (!processedTransparentImage.startsWith('data:image/')) {
              processedTransparentImage = 'data:image/png;base64,' + processedTransparentImage;
            }

            that.setData({
              transparentImage: processedTransparentImage
            });

            // 默认展示透明底结果
            that.updateResult();

          } else {
            wx.hideLoading();
            wx.showToast({
              title: humanMattingResponse.message || '抠图失败',
              icon: 'none'
            });
          }
        } catch (e) {
          wx.hideLoading();
          console.error('Parse response failed', e);
          wx.showToast({ title: '系统错误', icon: 'none' });
        }
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('Upload failed', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  selectBgImageCustom() {
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
          bgType: 'image',
          backgroundImage: bgPath,
          backgroundColor: ''
        });
        this.updateResult();
      }
    });
  },

  selectBgColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      bgType: 'color',
      backgroundColor: color,
      backgroundImage: ''
    });
    this.updateResult();
  },

  updateResult() {
    if (!this.data.transparentImage) return;

    wx.showLoading({ title: '合成中...' });
    
    const that = this;
    const { bgType, backgroundImage, backgroundColor, transparentImage } = this.data;

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
