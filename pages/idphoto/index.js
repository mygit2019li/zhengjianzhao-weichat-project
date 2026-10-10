const Security = require('../../utils/security.js');
const { checkImageSize } = require('../../utils/util.js');
const NSFW = require('../../utils/nsfw.js');
const ContentSecurity = require('../../utils/content-security.js');
const { ID_PHOTO_COLORS, compositeBackground, base64ToTempFile } = require('../../utils/image-processor.js');

Page({
  data: {
    imagePath: '',
    bgImagePath: '', // 换底色功能的图片路径
    selectedSize: '1',
    selectedColor: 'white',
    selectedBgColor: 'white', // 换底色功能的背景颜色
    selectedColorPreviewStyle: 'rgb(255, 255, 255)',
    selectedBgColorPreviewStyle: 'rgb(255, 255, 255)',
    selectedSpecialSize: '', // 用于显示选中的特殊尺寸名称
    // 证件照制作结果
    makeResultImage: '', // 制作完成后的证件照（标准照）
    makeResultImageHd: '', // 制作完成后的证件照（高清照）
    makeLayoutImage: '', // 排版照结果
    makeTransparentImage: '', // 透明标准照结果
    makeTransparentImageHd: '', // 透明高清照结果
    // 换底色结果
    changeBgResultImage: '', // 换底色后的证件照
    changeBgResultImageHd: '', // 换后的高清照（备用）
    changeBgTransparentImage: '', // 换底色功能的透明底照片
    activeTab: 'size', // 当前激活的标签页，默认显示尺寸选择
    currentModule: 'make', // 当前显示的模块，默认证件照制作
    // 证件照制作模块参数
    makeSmartCutout: true, // 智能抠图开关状态
    makeWatermarkEnabled: false, // 水印开关状态
    // 水印参数
    makeWatermarkParams: {
      text: 'Hello', // 水印文字
      color: 'white', // 水印颜色
      size: 30, // 文字大小
      opacity: 0.5, // 透明度
      angle: 45, // 角度
      spacing: 100 // 间距
    },
    // 颜色选择器相关
    showColorPicker: false, // 颜色选择器显示状态
    colorPickerFor: 'watermark', // 颜色选择器用途：'watermark' 或 'background'
    colorPickerPos: { x: 300, y: 0 }, // 颜色选择器位置
    colorSliderPos: 0, // 颜色滑块位置
    currentColorValue: '#ffffff', // 当前颜色值
    colorFormat: 'hex', // 当前颜色格式
    currentHue: 0, // 当前色相值
    // 打印排版参数
    selectedPaper: 'six', // 默认选中六寸相纸
    // 高级参数
    advancedParams: {
      faceRatio: 0.2, // 面部比例，默认0.2
      headTopDistance: 0.12, // 头距顶距离，默认0.12
      kbSize: 'default', // KB大小，默认不设置
      customKB: 50, // 自定义KB大小，默认50
      dpiSize: 'default', // DPI大小，默认不设置
      customDPI: 300 // 自定义DPI大小，默认300
    },
    // 结果模块状态
    showMakeResultModule: false, // 证件照制作结果模块显示状态
    showChangeBgResultModule: false, // 换底色结果模块显示状态
    // 弹窗相关状态
    showSizeModal: false,
    modalTitle: '',
    modalSizes: [],
    // 美颜参数
    beautyParams: {
      whiteness: 0, // 美白强度，默认2
      brightness: 0, // 亮度强度，默认0
      contrast: 0, // 对比度强度，默认0
      saturation: 0, // 饱和度强度，默认0
      sharpen: 0 // 锐化强度，默认0
    },
    // 裁剪区域相关
    showCropArea: false,     // 是否显示裁剪区域
    cropAreaWidth: 300,      // 裁剪区域宽度
    cropAreaHeight: 400,     // 裁剪区域高度
    imageWidth: 0,           // 原始图片宽度
    imageHeight: 0,          // 原始图片高度
    cropX: 0,                // 裁剪区域X坐标
    cropY: 0,                // 裁剪区域Y坐标
    startX: 0,               // 触摸起始X坐标
    startY: 0,               // 触摸起始Y坐标
    isMoving: false,         // 是否正在移动裁剪框
    // 所有尺寸数据，用于查找尺寸名称
    allSizes: {
      '1': { name: '1寸', size: '2.5×3.5cm' },
      '2': { name: '小一寸', size: '2.2×3.2cm' },
      '3': { name: '大一寸', size: '3.3×4.8cm' },
      '4': { name: '二寸', size: '3.5×5.3cm' },
      '19': { name: '小二寸', size: '3.3×4.8cm' },
      '20': { name: '大二寸', size: '3.5×5.3cm' },
      '5': { name: '四六级', size: '3.5×5.3cm' },
      '6': { name: '计算机等级考试', size: '2.5×3.5cm' },
      '7': { name: '教资考试', size: '3.5×4.9cm' },
      '8': { name: '研究生考试', size: '3.3×4.8cm' },
      '9': { name: '高考', size: '3.5×5.3cm' },
      '10': { name: '公务员考试', size: '2.5×3.5cm' },
      '11': { name: '驾驶证', size: '3.2×2.2cm' },
      '12': { name: '护照', size: '3.5×4.5cm' },
      '13': { name: '身份证', size: '3.5×2.5cm' },
      '14': { name: '港澳通行证', size: '3.3×4.8cm' },
      '15': { name: '台湾通行证', size: '3.3×4.8cm' },
      '16': { name: '社保卡', size: '2.5×3.5cm' },
      '17': { name: '居住证', size: '3.5×5.3cm' },
      '18': { name: '学生证', size: '2.5×3.5cm' }
    },
    // 考试专用尺寸列表
    examSizes: [
      { id: '5', name: '四六级', size: '3.5×5.3cm' },
      { id: '6', name: '计算机等级考试', size: '2.5×3.5cm' },
      { id: '7', name: '教资考试', size: '3.5×4.9cm' },
      { id: '8', name: '研究生考试', size: '3.3×4.8cm' },
      { id: '9', name: '高考', size: '3.5×5.3cm' },
      { id: '10', name: '公务员考试', size: '2.5×3.5cm' }
    ],
    // 证件专用尺寸列表
    certSizes: [
      { id: '11', name: '驾驶证', size: '3.2×2.2cm' },
      { id: '12', name: '护照', size: '3.5×4.5cm' },
      { id: '13', name: '身份证', size: '3.5×2.5cm' },
      { id: '14', name: '港澳通行证', size: '3.3×4.8cm' },
      { id: '15', name: '台湾通行证', size: '3.3×4.8cm' },
      { id: '16', name: '社保卡', size: '2.5×3.5cm' },
      { id: '17', name: '居住证', size: '3.5×5.3cm' },
      { id: '18', name: '学生证', size: '2.5×3.5cm' }
    ],
    backgroundColorOptions: [
      { key: 'white', name: '白色', preview: 'rgb(255, 255, 255)' },
      { key: 'gray', name: '灰色', preview: '#aeaeae' },
      { key: 'blue', name: '蓝色', preview: 'rgb(98, 139, 206)' },
      { key: 'red', name: '红色', preview: 'rgb(215, 69, 50)' },
      { key: 'skyblue', name: '天蓝', preview: 'rgb(135, 206, 235)' },
      { key: 'green', name: '绿色', preview: 'rgb(52, 168, 83)' },
      { key: 'darkred', name: '深红色', preview: 'rgb(178, 34, 34)' },
      { key: 'darkblue', name: '深蓝色', preview: 'rgb(30, 144, 255)' },
      { key: 'hmt-blue', name: '海马体蓝', preview: 'linear-gradient(160deg, #dfeeff 0%, #9bbcf3 55%, #5f86d8 100%)' },
      { key: 'hmt-pink', name: '海马体粉', preview: 'linear-gradient(160deg, #ffe6ef 0%, #f8b8cf 50%, #e78faf 100%)' },
      { key: 'hmt-gray', name: '海马体灰', preview: 'linear-gradient(160deg, #f7f7f9 0%, #dfe1e8 55%, #b9beca 100%)' }
    ]
  },

  // 页面加载时处理参数
  onLoad: function (options) {
    // 如果传入了module参数，切换到对应的模块
    if (options.module) {
      this.setData({
        currentModule: options.module
      });
    }

    // 初始化激励视频广告
    if (wx.createRewardedVideoAd) {
      this.videoAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-3b1bad996d6a52c7'
      });
      
      this.videoAd.onLoad(() => {
        console.log('激励视频 广告加载成功');
      });
      
      this.videoAd.onError((err) => {
        console.error('激励视频光告加载失败', err);
      });
      
      this.videoAd.onClose((res) => {
        // 用户点击了【关闭广告】按钮
        if (res && res.isEnded) {
          // 正常播放结束，可以下发奖励
          console.log('正常播放结束，下发奖励');
          if (this.pendingSaveToAlbum) {
            this.pendingSaveToAlbum = null;
            this.saveImageImpl();
            return;
          }
          if (this.pendingDownloadType) {
            this.handleDownload(this.pendingDownloadType);
            this.pendingDownloadType = null;
          }
        } else {
          // 播放中途退出，不下发奖励
          console.log('播放中途退出，不下发奖励');
          if (this.pendingSaveToAlbum) {
            this.pendingSaveToAlbum = null;
            wx.showToast({
              title: '请完整观看广告以保存到相册',
              icon: 'none',
              duration: 2000
            });
            return;
          }
          wx.showToast({
            title: '请完整观看广告以获取下载权限',
            icon: 'none',
            duration: 2000
          });
        }
      });
    }
  },

  // 从相册上传照片
  uploadImageFromAlbum: function () {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album'],
      success: async function (res) {
        if (!checkImageSize(res.tempFiles)) return;

        // 鉴黄检测
        const tempFilePath = res.tempFilePaths[0];
        const isSafe = await that.checkImageNSFW(tempFilePath);

        if (isSafe) {
          that.setData({
            imagePath: tempFilePath
          });
        }
        // 如果不安全，checkImageNSFW 会显示提示，不设置 imagePath
      }
    });
  },

  // 拍照上传照片
  uploadImageFromCamera: function () {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['camera'],
      success: async function (res) {
        if (!checkImageSize(res.tempFiles)) return;

        // 鉴黄检测
        const tempFilePath = res.tempFilePaths[0];
        const isSafe = await that.checkImageNSFW(tempFilePath);

        if (isSafe) {
          that.setData({
            imagePath: tempFilePath
          });
        }
        // 如果不安全，checkImageNSFW 会显示提示，不设置 imagePath
      }
    });
  },

  // 图片鉴黄检测
  checkImageNSFW: async function (filePath) {
    try {
      // NSFW.checkAndAlert 内部会处理 loading 显示
      const isSafe = await NSFW.checkAndAlert(filePath, true);
      return isSafe;
    } catch (error) {
      console.error('NSFW 检测失败:', error);
      wx.showToast({
        title: '图片检测失败，请重试',
        icon: 'none',
        duration: 2000
      });
      return false;
    }
  },

  // 显示裁剪区域
  showCropArea: function () {
    const that = this;
    // 获取图片信息
    wx.getImageInfo({
      src: that.data.imagePath,
      success: function (res) {
        // 根据选择的尺寸计算裁剪区域大小
        const sizePixels = that.getSizePixels(that.data.selectedSize);
        const cropAreaWidth = sizePixels.width;
        const cropAreaHeight = sizePixels.height;

        // 计算初始裁剪位置（居中）
        const cropX = Math.max(0, (res.width - cropAreaWidth) / 2);
        const cropY = Math.max(0, (res.height - cropAreaHeight) / 2);

        that.setData({
          showCropArea: true,
          imageWidth: res.width,
          imageHeight: res.height,
          cropAreaWidth: cropAreaWidth,
          cropAreaHeight: cropAreaHeight,
          cropX: cropX,
          cropY: cropY
        });
      }
    });
  },

  // 开始移动裁剪框
  startMoveCrop: function (e) {
    this.setData({
      isMoving: true,
      startX: e.touches[0].pageX,
      startY: e.touches[0].pageY
    });
  },

  // 移动裁剪框
  moveCrop: function (e) {
    if (!this.data.isMoving) return;

    const moveX = e.touches[0].pageX - this.data.startX;
    const moveY = e.touches[0].pageY - this.data.startY;

    // 计算新的裁剪位置，限制在图片范围内
    const newX = Math.max(0, Math.min(this.data.cropX + moveX, this.data.imageWidth - this.data.cropAreaWidth));
    const newY = Math.max(0, Math.min(this.data.cropY + moveY, this.data.imageHeight - this.data.cropAreaHeight));

    this.setData({
      cropX: newX,
      cropY: newY,
      startX: e.touches[0].pageX,
      startY: e.touches[0].pageY
    });
  },

  // 结束移动裁剪框
  endMoveCrop: function () {
    this.setData({
      isMoving: false
    });
  },

  // 确认裁剪
  confirmCrop: function () {
    this.setData({
      showCropArea: false
    });
  },

  // 取消裁剪
  cancelCrop: function () {
    this.setData({
      showCropArea: false
    });
  },

  // 上传照片（兼容旧方法）
  uploadImage: function () {
    this.uploadImageFromAlbum();
  },

  // 选择尺寸
  selectSize: function (e) {
    const size = e.currentTarget.dataset.size;
    this.setData({
      selectedSize: size,
      selectedSpecialSize: '' // 选择普通尺寸时清空特殊尺寸显示
    });
  },

  // 选择背景颜色
  selectColor: function (e) {
    const color = e.currentTarget.dataset.color;
    const selectedColorPreviewStyle = this.getBackgroundPreviewStyle(color);
    this.setData({
      selectedColor: color,
      selectedColorPreviewStyle
    });

    // 如果已经有透明照，重新生成带背景的证件照（切换背景颜色）
    if (this.data.currentModule === 'make' && this.data.makeTransparentImage && this.data.makeTransparentImageHd) {
      // 重新生成标准照和高清照（标记为颜色改变，不显示loading）
      this.addBackgroundColorLocally(this.data.makeTransparentImage, color, false, 'make', true);
      this.addBackgroundColorLocally(this.data.makeTransparentImageHd, color, true, 'make', true);
    }
  },

  getBackgroundPreviewStyle: function (color) {
    const colorConfig = ID_PHOTO_COLORS[color];
    if (colorConfig && colorConfig.gradientCss) {
      return colorConfig.gradientCss;
    }
    if (colorConfig && colorConfig.rgb) {
      return colorConfig.rgb;
    }
    return color || 'rgb(255, 255, 255)';
  },

  getColorPickerValue: function (color) {
    const colorConfig = ID_PHOTO_COLORS[color];
    if (!colorConfig) {
      return color;
    }
    if (colorConfig.rgb) {
      return colorConfig.rgb;
    }
    if (colorConfig.stops && colorConfig.stops.length > 0) {
      return colorConfig.stops[0].color;
    }
    return 'rgb(255, 255, 255)';
  },

  // 显示尺寸选择弹窗
  showSizeModal: function (title, sizes) {
    this.setData({
      showSizeModal: true,
      modalTitle: title,
      modalSizes: sizes
    });
  },

  // 隐藏尺寸选择弹窗
  hideSizeModal: function () {
    this.setData({
      showSizeModal: false
    });
  },

  // 选择弹窗中的尺寸
  selectModalSize: function (e) {
    const size = e.currentTarget.dataset.size;
    const allSizes = this.data.allSizes;
    const selectedSizeData = allSizes[size];

    this.setData({
      selectedSize: size,
      selectedSpecialSize: `${selectedSizeData.name} (${selectedSizeData.size})`,
      showSizeModal: false
    });
  },

  // 显示考试专用尺寸弹窗
  showExamSizes: function () {
    this.showSizeModal('考试专用尺寸', this.data.examSizes);
  },

  // 显示证件专用尺寸弹窗
  showCertSizes: function () {
    this.showSizeModal('证件专用尺寸', this.data.certSizes);
  },

  // 跳转到自定义尺寸页面
  goToCustomSize: function () {
    wx.navigateTo({
      url: '/pages/custom-size/index'
    });
  },

  // 美颜参数变化处理
  onBeautyParamChange: function (e) {
    const param = e.currentTarget.dataset.param;
    const value = parseInt(e.detail.value);
    const beautyParams = this.data.beautyParams;
    beautyParams[param] = value;
    this.setData({
      beautyParams: beautyParams
    });
  },

  // 重置美颜参数
  resetBeautyParam: function (e) {
    const param = e.currentTarget.dataset.param;
    const beautyParams = this.data.beautyParams;
    // 重置为默认值
    const defaultValues = {
      whiteness: 2,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpen: 0
    };
    beautyParams[param] = defaultValues[param] || 0;
    this.setData({
      beautyParams: beautyParams
    });
  },

  // 切换水印开关
  onWatermarkToggleChange: function (e) {
    const enabled = e.detail.value === 'true';
    this.setData({
      watermarkEnabled: enabled
    });
  },

  // 处理水印文字变化
  onWatermarkTextChange: function (e) {
    const text = e.detail.value;
    const watermarkParams = this.data.watermarkParams;
    watermarkParams.text = text;
    this.setData({
      watermarkParams: watermarkParams
    });
  },

  // 处理水印参数变化
  onWatermarkParamChange: function (e) {
    const param = e.currentTarget.dataset.param;
    let value = e.detail.value;

    // 根据参数类型转换值
    if (param === 'opacity') {
      value = parseFloat(value);
    } else {
      value = parseInt(value);
    }

    const watermarkParams = this.data.watermarkParams;
    watermarkParams[param] = value;
    this.setData({
      watermarkParams: watermarkParams
    });
  },

  // 重置水印参数
  resetWatermarkParam: function (e) {
    const param = e.currentTarget.dataset.param;
    const watermarkParams = this.data.watermarkParams;
    // 重置为默认值
    const defaultValues = {
      text: 'Hello',
      color: 'gray',
      size: 30,
      opacity: 0.5,
      angle: 45,
      spacing: 100
    };
    watermarkParams[param] = defaultValues[param];
    this.setData({
      watermarkParams: watermarkParams
    });
  },

  // 显示颜色选择器（用于水印颜色）
  showColorPicker: function () {
    // 初始化颜色值
    const color = this.data.watermarkParams.color;
    const rgbValue = this.getColorPickerValue(color);

    this.setData({
      showColorPicker: true,
      colorPickerFor: 'watermark',
      currentColorValue: rgbValue
    });
  },

  // 显示自定义颜色选择器（用于背景色选择）
  showCustomColorPicker: function () {
    // 根据当前模块获取对应的颜色值
    let color;
    if (this.data.currentModule === 'make') {
      color = this.data.selectedColor;
    } else if (this.data.currentModule === 'changeBg') {
      color = this.data.selectedBgColor;
    }

    const rgbValue = this.getColorPickerValue(color);

    this.setData({
      showColorPicker: true,
      colorPickerFor: 'background',
      currentColorValue: rgbValue
    });
  },

  // 隐藏颜色选择器
  hideColorPicker: function () {
    this.setData({
      showColorPicker: false
    });
  },

  // 颜色选择器点击事件
  onColorPickerTap: function (e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    this.updateColorPickerPos(x, y);
  },

  // 颜色选择器拖动事件
  onColorPickerMove: function (e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    this.updateColorPickerPos(x, y);
  },

  // 更新颜色选择器位置
  updateColorPickerPos: function (x, y) {
    // 限制位置在容器内
    const containerWidth = 300;
    const containerHeight = 300;

    const newX = Math.max(0, Math.min(containerWidth, x));
    const newY = Math.max(0, Math.min(containerHeight, y));

    // 更新位置
    this.setData({
      colorPickerPos: { x: newX, y: newY }
    });

    // 模拟更新颜色值
    const newColor = this.calculateColorFromPos(newX, newY, this.data.currentHue / 360);

    // 根据颜色选择器用途更新对应的颜色
    if (this.data.colorPickerFor === 'watermark') {
      this.updateWatermarkColor(newColor);
    } else if (this.data.colorPickerFor === 'background') {
      this.updateBackgroundColor(newColor);
    }
  },

  // 根据位置计算颜色
  calculateColorFromPos: function (x, y, hue) {
    // 简单模拟颜色计算
    const saturation = x / 300;
    const lightness = 1 - (y / 300);

    // 转换HSL到RGB，然后到Hex
    const rgb = this.hslToRgb(hue, saturation, lightness);
    const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);

    return hex;
  },

  // HSL转RGB
  hslToRgb: function (h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  },

  // RGB转Hex
  rgbToHex: function (r, g, b) {
    const toHex = (c) => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  },

  // 颜色滑块点击事件
  onColorSliderTap: function (e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    this.updateColorSliderPos(x);
  },

  // 颜色滑块拖动事件
  onColorSliderMove: function (e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    this.updateColorSliderPos(x);
  },

  // 更新颜色滑块位置
  updateColorSliderPos: function (x) {
    // 限制位置在容器内
    const containerWidth = 300;
    const newPos = Math.max(0, Math.min(containerWidth, x));

    // 计算色相值
    const hue = (newPos / containerWidth) * 360;

    this.setData({
      colorSliderPos: newPos,
      currentHue: hue
    });

    // 更新颜色值
    const { x: pickerX, y: pickerY } = this.data.colorPickerPos;
    const newColor = this.calculateColorFromPos(pickerX, pickerY, hue / 360);

    // 根据颜色选择器用途更新对应的颜色
    if (this.data.colorPickerFor === 'watermark') {
      this.updateWatermarkColor(newColor);
    } else if (this.data.colorPickerFor === 'background') {
      this.updateBackgroundColor(newColor);
    }
  },

  // 颜色值输入变化
  onColorValueChange: function (e) {
    const value = e.detail.value;
    this.setData({
      currentColorValue: value
    });

    // 验证颜色值并更新
    if (this.isValidColor(value)) {
      // 根据颜色选择器用途更新对应的颜色
      if (this.data.colorPickerFor === 'watermark') {
        this.updateWatermarkColor(value);
      } else if (this.data.colorPickerFor === 'background') {
        this.updateBackgroundColor(value);
      }
    }
  },

  // 验证颜色值是否有效
  isValidColor: function (color) {
    // 简单验证十六进制颜色
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  },

  // 切换颜色格式
  switchColorFormat: function (e) {
    const format = e.currentTarget.dataset.format;
    this.setData({
      colorFormat: format
    });

    // 这里可以添加格式转换逻辑
  },

  // 更新水印颜色
  updateWatermarkColor: function (color) {
    const watermarkParams = this.data.watermarkParams;
    watermarkParams.color = color;

    this.setData({
      watermarkParams: watermarkParams,
      currentColorValue: color
    });
  },

  // 更新背景颜色
  updateBackgroundColor: function (color) {
    // 根据当前模块更新对应的颜色数据
    if (this.data.currentModule === 'make') {
      this.setData({
        selectedColor: color,
        selectedColorPreviewStyle: this.getBackgroundPreviewStyle(color),
        currentColorValue: color
      });
    } else if (this.data.currentModule === 'changeBg') {
      this.setData({
        selectedBgColor: color,
        selectedBgColorPreviewStyle: this.getBackgroundPreviewStyle(color),
        currentColorValue: color
      });
    }
  },

  // 选择相纸
  selectPaper: function (e) {
    const paper = e.currentTarget.dataset.paper;
    this.setData({
      selectedPaper: paper
    }, () => {
      // 如果已生成照片，切换相纸后自动重新排版
      this.refreshLayoutIfPossible();
    });
  },

  // 根据当前结果和相纸自动重排
  refreshLayoutIfPossible: function () {
    // 仅证件照制作模块参与排版
    if (this.data.currentModule !== 'make') return;
    const baseImage = this.data.makeResultImageHd || this.data.makeResultImage;
    if (!baseImage) return;
    const app = getApp();
    const apiUrl = app.globalData.apiUrl;
    this.generateLayoutPhotos(baseImage, apiUrl, 'make');
  },

  // 高级参数变化处理
  onAdvancedParamChange: function (e) {
    const param = e.currentTarget.dataset.param;
    let value = parseFloat(e.detail.value);
    const advancedParams = this.data.advancedParams;
    advancedParams[param] = value;
    this.setData({
      advancedParams: advancedParams
    });
  },

  // 重置高级参数
  resetAdvancedParam: function (e) {
    const param = e.currentTarget.dataset.param;
    const advancedParams = this.data.advancedParams;
    // 重置为默认值
    const defaultValues = {
      faceRatio: 0.2,
      headTopDistance: 0.12,
      customKB: 50,
      customDPI: 300
    };
    advancedParams[param] = defaultValues[param] || 0;
    this.setData({
      advancedParams: advancedParams
    });
  },

  // KB大小变化
  onKBSizeChange: function (e) {
    const value = e.detail.value;
    const advancedParams = this.data.advancedParams;
    advancedParams.kbSize = value;
    this.setData({
      advancedParams: advancedParams
    });
  },

  // DPI大小变化
  onDPISizeChange: function (e) {
    const value = e.detail.value;
    const advancedParams = this.data.advancedParams;
    advancedParams.dpiSize = value;
    this.setData({
      advancedParams: advancedParams
    });
  },

  // 下载图片
  downloadImage: function (e) {
    const type = e.currentTarget.dataset.type;

    // 朋友圈文案需要看广告
    if (type === 'social-1' || type === 'social-2') {
      if (this.videoAd) {
        this.pendingDownloadType = type;
        this.videoAd.show().catch(() => {
          // 失败重试
          this.videoAd.load()
            .then(() => this.videoAd.show())
            .catch(err => {
              console.error('激励视频 广告显示失败', err);
              // 广告显示失败，直接允许下载
              this.handleDownload(type);
            });
        });
        return;
      }
    }

    this.handleDownload(type);
  },

  // 处理下载逻辑
  handleDownload: function (type) {
    const that = this;
    let imagePath = '';
    const currentModule = this.data.currentModule;

    // 根据不同类型和当前模块获取对应的图片路径
    switch (type) {
      case 'standard':
        if (currentModule === 'make') {
          imagePath = this.data.makeResultImageHd || this.data.makeResultImage || this.data.makeTransparentImageHd || this.data.makeTransparentImage;
        } else {
          imagePath = this.data.changeBgResultImage;
        }
        break;
      case 'hd':
        imagePath = currentModule === 'make' ? this.data.makeResultImageHd : (this.data.changeBgResultImageHd || this.data.changeBgResultImage);
        break;
      case 'transparent-standard':
        imagePath = this.data.makeTransparentImage;
        break;
      case 'transparent-hd':
        imagePath = this.data.makeTransparentImageHd;
        break;
      case 'layout':
        imagePath = this.data.makeLayoutImage;
        break;
      case 'social-1':
        imagePath = this.data.makeTemplateImage;
        break;
      case 'social-2':
        imagePath = this.data.makeTemplateImage2;
        break;
      default:
        imagePath = currentModule === 'make' ? this.data.makeResultImage : this.data.changeBgResultImage;
    }

    // 检查图片路径是否存在
    if (!imagePath) {
      wx.showToast({
        title: '图片正在生成中，请稍后再试',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 显示下载中提示
    wx.showLoading({
      title: '下载中...',
      mask: true
    });

    try {
      // 检查图片路径类型
      if (imagePath.startsWith('data:image/')) {
        // 处理base64格式图片
        const fs = wx.getFileSystemManager();
        const tempFilePath = wx.env.USER_DATA_PATH + `/idphoto_${Date.now()}.jpg`;
        const base64Data = imagePath.replace(/^data:image\/[^;]+;base64,/, '');
        fs.writeFileSync(tempFilePath, base64Data, 'base64');
        that.saveToAlbum(tempFilePath);
      } else if (imagePath.startsWith('wxfile://') || imagePath.startsWith('http://tmp/') || imagePath.startsWith('http://usr/')) {
        // 处理临时文件路径（本地文件）
        that.saveToAlbum(imagePath);
      } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // 处理网络图片路径
        wx.downloadFile({
          url: imagePath,
          success: function (res) {
            if (res.statusCode === 200) {
              that.saveToAlbum(res.tempFilePath);
            } else {
              wx.hideLoading();
              wx.showToast({
                title: '下载失败，服务器错误',
                icon: 'none',
                duration: 2000
              });
            }
          },
          fail: function (error) {
            wx.hideLoading();
            console.error('下载失败:', error);
            wx.showToast({
              title: '下载失败，请检查网络',
              icon: 'none',
              duration: 2000
            });
          }
        });
      } else {
        // 其他情况，直接尝试保存
        that.saveToAlbum(imagePath);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('下载处理失败:', error);
      wx.showToast({
        title: '下载失败，请稍后再试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 保存图片到相册
  saveToAlbum: function (filePath, callback) {
    const that = this;

    // 检查相册权限
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          // 请求相册权限
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success() {
              // 授权成功，保存图片
              that.performSaveToAlbum(filePath, callback);
            },
            fail() {
              // 授权失败，引导用户打开设置
              wx.hideLoading();
              wx.showModal({
                title: '提示',
                content: '需要您授权访问相册才能保存图片',
                confirmText: '去授权',
                success: function (res) {
                  if (res.confirm) {
                    wx.openSetting();
                  }
                }
              });
            }
          });
        } else {
          // 已授权，直接保存图片
          that.performSaveToAlbum(filePath, callback);
        }
      },
      fail() {
        wx.hideLoading();
        wx.showToast({
          title: '获取设置失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 执行保存图片到相册操作
  performSaveToAlbum: function (filePath, callback) {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: function () {
        // 单张下载：没有回调，直接关闭loading
        if (!callback) {
          wx.hideLoading();
        } else {
          // 批量保存：交给回调继续链式保存，最终由调用方统一关闭loading
          callback();
        }
      },
      fail: function (error) {
        wx.hideLoading();
        console.error('保存到相册失败:', error);

        // 处理可能的错误
        if (error.errMsg.indexOf('auth deny') > -1) {
          wx.showModal({
            title: '提示',
            content: '需要您授权访问相册才能保存图片',
            confirmText: '去授权',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
          return;
        }

        let errorMsg = '保存失败，请稍后再试';
        if (error.errMsg.indexOf('file not found') > -1) {
          errorMsg = '图片文件不存在';
        }

        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 全屏展示图片
  fullscreenImage: function (e) {
    const type = e.currentTarget.dataset.type;
    let imagePath = '';
    const currentModule = this.data.currentModule;

    // 根据不同类型和当前模块获取对应的图片路径
    switch (type) {
      case 'standard':
        if (currentModule === 'make') {
          imagePath = this.data.makeResultImageHd || this.data.makeResultImage || this.data.makeTransparentImageHd || this.data.makeTransparentImage;
        } else {
          imagePath = this.data.changeBgResultImage;
        }
        break;
      case 'hd':
        imagePath = currentModule === 'make' ? this.data.makeResultImageHd : (this.data.changeBgResultImageHd || this.data.changeBgResultImage);
        break;
      case 'transparent-standard':
        imagePath = this.data.makeTransparentImage;
        break;
      case 'transparent-hd':
        imagePath = this.data.makeTransparentImageHd;
        break;
      case 'layout':
        imagePath = this.data.makeLayoutImage;
        break;
      case 'social-1':
        imagePath = this.data.makeTemplateImage;
        break;
      case 'social-2':
        imagePath = this.data.makeTemplateImage2;
        break;
      default:
        imagePath = currentModule === 'make' ? this.data.makeResultImage : this.data.changeBgResultImage;
    }

    // 检查图片路径是否存在
    if (!imagePath) {
      wx.showToast({
        title: '图片正在生成中，请稍后再试',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 使用wx.previewImage实现全屏查看
    wx.previewImage({
      current: imagePath, // 当前显示图片的http链接
      urls: [imagePath], // 需要预览的图片http链接列表
      success: function (res) {
        // 预览成功回调
        console.log('图片预览成功');
      },
      fail: function (error) {
        // 预览失败回调
        console.error('图片预览失败:', error);
        wx.showToast({
          title: '图片预览失败，请稍后再试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 排版照全屏预览 - 根据图片尺寸自动横屏展示
  showLayoutFullscreen: function (imagePath) {
    // 获取图片信息以确定宽高比
    wx.getImageInfo({
      src: imagePath,
      success: (res) => {
        const { width, height } = res;
        const isLandscape = width > height; // 判断是否为横屏图片

        // 存储图片信息并显示全屏预览
        this.setData({
          showFullscreenPreview: true,
          fullscreenImagePath: imagePath,
          fullscreenImageWidth: width,
          fullscreenImageHeight: height,
          fullscreenIsLandscape: isLandscape
        });

        // 如果是横屏图片，尝试锁定屏幕方向（仅支持部分设备）
        if (isLandscape && wx.setScreenOrientation) {
          wx.setScreenOrientation({
            orientation: 'landscape',
            success: () => {
              console.log('屏幕方向已切换为横屏');
            },
            fail: (err) => {
              console.log('屏幕方向切换失败，使用自适应布局', err);
            }
          });
        }
      },
      fail: () => {
        // 获取图片信息失败，直接显示
        this.setData({
          showFullscreenPreview: true,
          fullscreenImagePath: imagePath,
          fullscreenIsLandscape: false
        });
      }
    });
  },

  // 关闭全屏预览
  closeFullscreenPreview: function () {
    // 恢复屏幕方向
    if (wx.setScreenOrientation) {
      wx.setScreenOrientation({
        orientation: 'portrait',
        success: () => {
          console.log('屏幕方向已恢复为竖屏');
        },
        fail: (err) => {
          console.log('屏幕方向恢复失败', err);
        }
      });
    }

    this.setData({
      showFullscreenPreview: false,
      fullscreenImagePath: '',
      fullscreenIsLandscape: false
    });
  },

  // 切换区域显示/隐藏
  toggleSection: function (e) {
    const section = e.currentTarget.dataset.section;
    // 这里可以实现区域展开/折叠功能
    wx.showToast({
      title: `切换${section}区域`,
      icon: 'none',
      duration: 1000
    });
  },

  // 切换模块
  switchModule: function (e) {
    const module = e.currentTarget.dataset.module;
    this.setData({
      currentModule: module
    });
  },

  // 切换标签页
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  // 从相册上传换底色图片
  uploadBgImageFromAlbum: function () {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album'],
      success: async function (res) {
        if (!checkImageSize(res.tempFiles)) return;

        // 鉴黄检测
        const tempFilePath = res.tempFilePaths[0];
        const isSafe = await that.checkImageNSFW(tempFilePath);

        if (isSafe) {
          that.setData({
            bgImagePath: tempFilePath
          });
        }
      }
    });
  },

  // 拍照上传换底色图片
  uploadBgImageFromCamera: function () {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['camera'],
      success: async function (res) {
        if (!checkImageSize(res.tempFiles)) return;

        // 鉴黄检测
        const tempFilePath = res.tempFilePaths[0];
        const isSafe = await that.checkImageNSFW(tempFilePath);

        if (isSafe) {
          that.setData({
            bgImagePath: tempFilePath
          });
        }
      }
    });
  },

  // 上传换底色图片（兼容旧方法）
  uploadBgImage: function () {
    this.uploadBgImageFromAlbum();
  },

  // 切换智能抠图开关
  toggleSmartCutout: function () {
    this.setData({
      smartCutout: !this.data.smartCutout
    });
  },

  // 更新背景（通用方法）
  updateBackground: function () {
    // 如果已经有透明底照片，重新合成
    if (this.data.changeBgTransparentImage) {
      const that = this;
      wx.showLoading({
        title: '生成中...',
      });

      // 本地合成背景
      compositeBackground(that.data.changeBgTransparentImage, that.data.selectedBgColor, null, function (resultImage) {
        const updateData = {
          changeBgResultImage: resultImage, // 只保存一张图片
          showChangeBgResultModule: true // 确保显示结果模块
        };

        that.setData(updateData);
      }, function () {
        wx.hideLoading();
        wx.showToast({
          title: '背景切换成功！',
          icon: 'success',
          duration: 2000
        });
      });
    }
  },

  // 选择背景颜色（换底色功能）
  selectBgColor: function (e) {
    const color = e.currentTarget.dataset.color;
    const selectedBgColorPreviewStyle = this.getBackgroundPreviewStyle(color);
    this.setData({
      selectedBgColor: color,
      selectedBgColorPreviewStyle
    });

    this.updateBackground();
  },

  // 开始制作证件照
  startMaking: function (e) {
    // 直接检查imagePath是否存在，而不依赖data-disabled属性
    if (!this.data.imagePath) {
      wx.showToast({
        title: '请先上传照片',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const that = this;

    // 获取全局API地址
    const app = getApp();
    const apiUrl = app.globalData.apiUrl;

    // 开始制作证件照（图片已在上传时通过鉴黄检测）
    wx.showLoading({
      title: '制作中...',
    });

    // 获取页面选择的数据
    const { selectedSize, beautyParams, advancedParams } = this.data;

    // 根据选择的尺寸获取对应的宽高像素值
    const sizePixels = this.getSizePixels(selectedSize);
    const width = sizePixels.width;
    const height = sizePixels.height;

    // 构建请求参数，注意：后端API实际期望的参数名是face_align，不是face_alignment
    // 注意：布尔值必须转换为字符串，否则wx.uploadFile会将其转换为"[object Boolean]"
    // 优先使用hd=true获取高清结果
    const formData = {
      height: height,
      width: width,
      human_matting_model: 'modnet_photographic_portrait_matting', // 优先使用高清人像抠图模型
      face_detect_model: 'mtcnn',
      hd: "true", // 布尔值转换为字符串，优先使用高清模式
      dpi: 300,
      face_align: "true", // 布尔值转换为字符串，正确的参数名是face_align，与后端API定义一致
      head_measure_ratio: advancedParams.faceRatio || 0.2,
      head_height_ratio: 0.45,
      top_distance_max: 0.12,
      top_distance_min: 0.1,
      brightness_strength: beautyParams.brightness || 0,
      contrast_strength: beautyParams.contrast || 0,
      sharpen_strength: beautyParams.sharpen || 0,
      saturation_strength: beautyParams.saturation || 0,
      whitening_strength: beautyParams.whiteness || 0 // 添加whitening_strength参数，与后端API定义一致
    };

    // 为签名生成原始数据
    const signData = { ...formData };

    // 加密参数
    const encryptedParams = Security.encryptData(formData, app.globalData.apiSecretKey);

    // 获取安全请求头
    const securityHeaders = Security.getSecurityHeaders(signData, app.globalData.appId, app.globalData.apiSecretKey);

    // 使用wx.uploadFile上传图片
    console.log('Encrypted Params:', encryptedParams);

    wx.uploadFile({
      url: `${apiUrl}/idphoto`,
      filePath: this.data.imagePath,
      name: 'input_image', // API期望的文件字段名
      header: securityHeaders,
      formData: {
        payload: encryptedParams
      },
      success: function (res) {
        // 解析响应数据
        let response;
        try {
          // 检查响应是否为有效的 JSON
          if (typeof res.data === 'string') {
            response = JSON.parse(res.data);
          } else {
            response = res.data;
          }
        } catch (parseError) {
          console.error('JSON 解析失败:', parseError);
          console.error('原始响应:', res.data);
          wx.hideLoading();
          wx.showToast({
            title: '服务器响应异常',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        console.log('idphoto response:', response);

        // 检查 HTTP 状态码
        if (res.statusCode !== 200) {
          wx.hideLoading();
          wx.showToast({
            title: response.detail || '请求失败',
            icon: 'none',
            duration: 2000
          });
          return;
        }

        if (response.status === true || response.status === 1) {
          // 获取透明底证件照
          const transparentImage = response.image_base64_standard;
          const transparentImageHd = response.image_base64_hd;
          
          console.log('API返回的透明照片数据长度:', transparentImage.length, '高清照数据长度:', transparentImageHd.length);
          console.log('透明照片前100字符:', transparentImage.substring(0, 100));
          console.log('高清照前100字符:', transparentImageHd.substring(0, 100));
          
          // 检查透明照片是否包含PNG透明通道信息
          try {
            const transparentPngHeader = atob(transparentImage.substring(0, 50));
            const hdPngHeader = atob(transparentImageHd.substring(0, 50));
            console.log('透明照片PNG头部信息:', transparentPngHeader.substring(0, 10));
            console.log('高清照PNG头部信息:', hdPngHeader.substring(0, 10));
          } catch (e) {
            console.warn('无法解析PNG头部信息:', e);
          }

          // 检查是否已经包含data:image前缀，避免重复添加
          let processedTransparentImage = transparentImage;
          let processedTransparentImageHd = transparentImageHd;
          if (!processedTransparentImage.startsWith('data:image/')) {
            processedTransparentImage = 'data:image/png;base64,' + processedTransparentImage;
          }
          if (!processedTransparentImageHd.startsWith('data:image/')) {
            processedTransparentImageHd = 'data:image/png;base64,' + processedTransparentImageHd;
          }

          // 将base64转换为临时文件，便于显示和后续处理
          Promise.all([
            base64ToTempFile(processedTransparentImage),
            base64ToTempFile(processedTransparentImageHd)
          ]).then(([tempStandardPath, tempHdPath]) => {
            console.log('透明照转换成功，标准照路径:', tempStandardPath, '高清照路径:', tempHdPath);
            
            // 存储透明照片临时文件路径
            that.setData({
              makeTransparentImage: tempStandardPath,
              makeTransparentImageHd: tempHdPath
            });

            // 为透明底照片添加背景色（本地合成）
            that.addBackgroundColorLocally(processedTransparentImage, that.data.selectedColor, false, 'make', false);
            that.addBackgroundColorLocally(processedTransparentImageHd, that.data.selectedColor, true, 'make', false);
          }).catch((err) => {
            console.error('透明照转换失败:', err);
            // 即使转换失败，也尝试使用base64（某些情况下可能可以显示）
            that.setData({
              makeTransparentImage: processedTransparentImage,
              makeTransparentImageHd: processedTransparentImageHd
            });
            // 继续合成背景色
            that.addBackgroundColorLocally(processedTransparentImage, that.data.selectedColor, false, 'make', false);
            that.addBackgroundColorLocally(processedTransparentImageHd, that.data.selectedColor, true, 'make', false);
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: response.message || '制作失败',
            icon: 'none'
          });
        }
      },
      fail: function (error) {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        console.error('API调用失败:', error);
      }
    });
  },

  // 本地添加背景色（不通过API）
  addBackgroundColorLocally: function (transparentImage, color, isHd = false, moduleType = 'make', isColorChange = false) {
    const that = this;
    console.log('开始添加背景色，isHd:', isHd, 'moduleType:', moduleType, 'isColorChange:', isColorChange);

    // 本地合成背景色
    compositeBackground(transparentImage, color, null, function (resultImage) {
      console.log('背景色合成回调，结果图片:', resultImage);
      // 根据模块类型和是否为高清照，存储到不同的字段
      if (isHd) {
        if (moduleType === 'make') {
          that.setData({
            makeResultImageHd: resultImage,
            // 制作完成后，预览区域始终展示高清成品图
            imagePath: resultImage,
            showMakeResultModule: true // 显示底部结果模块
          });

          that.generateLayoutPhotos(resultImage, null, moduleType);

          // 检查是否标准照也已经生成，如果都生成了才显示成功提示
          if (that.data.makeResultImage) {
            if (!isColorChange) {
              // 只在初始制作时显示loading和成功提示
              wx.hideLoading();
              wx.showToast({
                title: '证件照制作成功！',
                icon: 'success',
                duration: 2000
              });
            }
          }
        } else if (moduleType === 'changeBg') {
          that.setData({
            changeBgResultImageHd: resultImage,
            showChangeBgResultModule: true // 显示底部结果模块
          });
        }
      } else {
        if (moduleType === 'make') {
          // 存储标准照结果
          const nextData = {
            makeResultImage: resultImage,
            showMakeResultModule: true // 显示底部结果模块
          };
          // 如果高清照尚未返回，先用标准照占位预览，高清返回后会自动覆盖
          if (!that.data.makeResultImageHd) {
            nextData.imagePath = resultImage;
          }
          that.setData(nextData);

          // 检查是否高清照也已经生成，如果都生成了才显示成功提示
          if (that.data.makeResultImageHd) {
            if (!isColorChange) {
              // 只在初始制作时显示loading和成功提示
              wx.hideLoading();
              wx.showToast({
                title: '证件照制作成功！',
                icon: 'success',
                duration: 2000
              });
            }
          } else {
            // 如果高清照还没生成，等待高清照生成后再显示提示
            // 提示会在高清照生成时显示
          }
        } else if (moduleType === 'changeBg') {
          that.setData({
            changeBgResultImage: resultImage
          });
        }
      }
    }, function () {
      // 完成回调，这里不隐藏loading，因为可能还有其他图片在生成
      console.log('背景色合成完成');
    });
  },

  // 厘米转像素辅助函数（默认使用300dpi）
  cmToPixels: function (cm, dpi = 300) {
    // 1英寸 = 2.54厘米
    return Math.round(cm * dpi / 2.54);
  },

  // 根据尺寸ID获取宽高像素值
  getSizePixels: function (sizeId) {
    // 获取尺寸数据
    const sizeData = this.data.allSizes[sizeId];
    if (!sizeData) {
      // 默认使用1寸证件照的宽高：2.5×3.5cm
      return { width: 295, height: 413 };
    }

    // 获取DPI（使用300dpi）
    const dpi = 300;

    // 解析尺寸字符串，例如："2.5×3.5cm"
    const sizeMatch = sizeData.size.match(/(\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)cm/);
    if (!sizeMatch || sizeMatch.length < 3) {
      // 解析失败，使用默认值
      return { width: 295, height: 413 };
    }

    // 获取厘米尺寸
    const widthCm = parseFloat(sizeMatch[1]);
    const heightCm = parseFloat(sizeMatch[2]);

    // 转换为像素
    const width = this.cmToPixels(widthCm, dpi);
    const height = this.cmToPixels(heightCm, dpi);

    return { width, height };
  },

  // 本地生成排版照（不通过API）
  generateLayoutPhotos: function (imageData, apiUrl, moduleType = 'make') {
    // 本地生成排版照，不再请求后端接口
    const selectedSize = this.data.selectedSize;
    const { width, height } = this.getSizePixels(selectedSize);
    const paper = this.getPaperPixels(this.data.selectedPaper);
    const gap = 30; // 照片之间的白色间距
    const margin = 40; // 纸张边距

    // 将base64转换为临时文件，便于canvas绘制
    base64ToTempFile(imageData)
      .then((imagePath) => {
        this.drawLayoutOnCanvas({
          photoPath: imagePath,
          photoWidth: width,
          photoHeight: height,
          paperWidth: paper.width,
          paperHeight: paper.height,
          gap,
          margin,
          moduleType
        });
      })
      .catch((err) => {
        console.error('排版生成失败:', err);
        wx.showToast({
          title: '排版生成失败',
          icon: 'none'
        });
      });
  },


  // 计算相纸尺寸（像素，300dpi）
  getPaperPixels: function (paper) {
    // 常见相纸/纸张尺寸（厘米）
    const paperMap = {
      six: { w: 15.2, h: 10.2 },   // 6寸 4x6英寸
      five: { w: 12.7, h: 8.9 },   // 5寸 3.5x5英寸
      a4: { w: 21.0, h: 29.7 },    // A4
      '3r': { w: 8.9, h: 12.7 },   // 3R
      '4r': { w: 10.2, h: 15.2 }   // 4R
    };
    const cfg = paperMap[paper] || paperMap.six;
    return {
      width: this.cmToPixels(cfg.w, 300),
      height: this.cmToPixels(cfg.h, 300)
    };
  },

  // 计算最佳排版布局（尝试旋转照片以放更多张）
  calculateBestLayout: function (paperWidth, paperHeight, photoWidth, photoHeight, gap, margin) {
    const tryLayout = (pw, ph, w, h) => {
      const usableW = pw - margin * 2;
      const usableH = ph - margin * 2;
      const cols = Math.max(1, Math.floor((usableW + gap) / (w + gap)));
      const rows = Math.max(1, Math.floor((usableH + gap) / (h + gap)));
      const count = cols * rows;
      const offsetX = (pw - (cols * w + (cols - 1) * gap)) / 2;
      const offsetY = (ph - (rows * h + (rows - 1) * gap)) / 2;
      return { cols, rows, count, offsetX, offsetY, width: w, height: h };
    };
    const normal = tryLayout(paperWidth, paperHeight, photoWidth, photoHeight);
    const rotated = tryLayout(paperWidth, paperHeight, photoHeight, photoWidth);
    return rotated.count > normal.count
      ? { ...rotated, rotated: true }
      : { ...normal, rotated: false };
  },

  // 在canvas上绘制排版
  drawLayoutOnCanvas: function (options) {
    const { photoPath, photoWidth, photoHeight, paperWidth, paperHeight, gap, margin, moduleType } = options;
    const ctx = wx.createCanvasContext('layoutCanvas', this);
    // 背景白色
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, paperWidth, paperHeight);

    // 每张照片外围的白色边框宽度（类似参考图中的效果）
    const photoBorder = 6;
    // 实际间距 = 间距 + 两边边框
    const effectiveGap = gap + photoBorder * 2;

    const layout = this.calculateBestLayout(paperWidth, paperHeight, photoWidth, photoHeight, effectiveGap, margin);
    const positions = [];
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const x = layout.offsetX + c * (layout.width + effectiveGap) + photoBorder;
        const y = layout.offsetY + r * (layout.height + effectiveGap) + photoBorder;
        positions.push({ x, y });
      }
    }

    // 绘制照片（照片本身已经带有白色背景）
    positions.forEach((pos) => {
      if (layout.rotated) {
        ctx.save();
        ctx.translate(pos.x + layout.width / 2, pos.y + layout.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(photoPath, -layout.height / 2, -layout.width / 2, layout.height, layout.width);
        ctx.restore();
      } else {
        ctx.drawImage(photoPath, pos.x, pos.y, layout.width, layout.height);
      }
    });

    // 绘制照片之间的分隔线（浅灰色细线，仅用于视觉分隔）
    ctx.setStrokeStyle('#f0f0f0');
    ctx.setLineWidth(1);
    positions.forEach((pos) => {
      const w = layout.width;
      const h = layout.height;
      // 在照片外围绘制细线框
      ctx.strokeRect(pos.x - photoBorder, pos.y - photoBorder, w + photoBorder * 2, h + photoBorder * 2);
    });

    ctx.draw(false, () => {
      // 延迟200ms导出，确保渲染完成
      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvasId: 'layoutCanvas',
          width: paperWidth,
          height: paperHeight,
          destWidth: paperWidth,
          destHeight: paperHeight,
          quality: 0.85, // 降低质量以减少数据大小
          success: (res) => {
            // 直接使用临时文件路径，避免base64数据过大
            if (moduleType === 'make') {
              this.setData({
                makeLayoutImage: res.tempFilePath,
                showMakeResultModule: true
              });
            }
          },
          fail: (err) => {
            console.error('排版导出失败:', err);
          }
        }, this);
      }, 200);
    });
  },

  // 使用本地模板和高清证件照合成社交媒体模板照片


  // 开始换底色
  startChangeBg: function (e) {
    // 直接检查bgImagePath是否存在，而不依赖data-disabled属性
    if (!this.data.bgImagePath) {
      wx.showToast({
        title: '请先上传证件照',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const that = this;
    wx.showLoading({
      title: '换底色中...',
    });

    // 获取全局API地址
    const app = getApp();
    const apiUrl = app.globalData.apiUrl;

    const formData = {
      human_matting_model: 'modnet_photographic_portrait_matting',
      dpi: 300
    };

    // 为签名生成数据
    const signData = { ...formData };

    // 加密参数
    const encryptedParams = Security.encryptData(formData, app.globalData.apiSecretKey);

    // 获取安全请求头
    const securityHeaders = Security.getSecurityHeaders(signData, app.globalData.appId, app.globalData.apiSecretKey);

    // 使用wx.uploadFile上传图片到human_matting API获取透明底
    wx.uploadFile({
      url: `${apiUrl}/human_matting`,
      filePath: this.data.bgImagePath,
      name: 'input_image', // API期望的文件字段名
      header: securityHeaders,
      formData: {
        payload: encryptedParams
      },
      success: function (res) {
        // 解析响应数据
        let humanMattingResponse = JSON.parse(res.data);
        console.log('human_matting response:', humanMattingResponse);

        if (humanMattingResponse.status === true || humanMattingResponse.status === 1) {
          // 获取透明底证件照
          const transparentImage = humanMattingResponse.image_base64;

          if (!transparentImage) {
            wx.hideLoading();
            wx.showToast({
              title: '获取透明底证件照失败',
              icon: 'none',
              duration: 2000
            });
            return;
          }

          // 处理透明底照片，添加data:image前缀
          let processedTransparentImage = transparentImage;
          if (!processedTransparentImage.startsWith('data:image/')) {
            processedTransparentImage = 'data:image/png;base64,' + processedTransparentImage;
          }

          // 保存透明底照片
          that.setData({
            changeBgTransparentImage: processedTransparentImage
          });

          // 本地合成背景色
          compositeBackground(processedTransparentImage, that.data.selectedBgColor, that.data.backgroundImage, function (resultImage) {
            const updateData = {
              showChangeBgResultModule: true, // 显示底部结果模块
              changeBgResultImage: resultImage // 只保存一张图片
            };

            that.setData(updateData);
          }, function () {
            wx.hideLoading();
            wx.showToast({
              title: '证件照换底色成功！',
              icon: 'success',
              duration: 2000
            });
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: humanMattingResponse.message || '获取透明底证件照失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: function (humanMattingError) {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误，获取透明底证件照失败',
          icon: 'none',
          duration: 2000
        });
        console.error('human_matting API调用失败:', humanMattingError);
      }
    });
  },


  // 重新制作
  resetMaking: function () {
    const currentModule = this.data.currentModule;

    if (currentModule === 'make') {
      this.setData({
        makeResultImage: '', // 清空制作结果图片
        makeResultImageHd: '',
        makeLayoutImage: '',
        makeTemplateImage: '',
        makeTemplateImage2: '',
        makeTransparentImage: '',
        makeTransparentImageHd: '',
        showMakeResultModule: false // 隐藏制作结果模块
      });
    } else if (currentModule === 'changeBg') {
      this.setData({
        changeBgResultImage: '', // 清空换底色结果图片
        changeBgTransparentImage: '', // 清空透明底照片
        showChangeBgResultModule: false // 隐藏换底色结果模块
      });
    }
  },

  // 保存图片到相册（主功能入口）
  saveImage: function () {
    // 内容安全：若启用了水印，保存前先检测水印文字
    const wm = this.data.watermarkParams || this.data.makeWatermarkParams || {};
    const wmEnabled = this.data.watermarkEnabled || this.data.makeWatermarkEnabled;
    const wmText = wm.text;
    if (wmEnabled && wmText && String(wmText).trim()) {
      ContentSecurity.checkTextAndAlert(wmText).then((passed) => {
        if (passed) this.proceedSaveImage();
      });
      return;
    }

    this.proceedSaveImage();
  },

  proceedSaveImage: function () {
    const currentModule = this.data.currentModule;
    if (currentModule === 'make' && this.videoAd) {
      this.pendingSaveToAlbum = true;
      this.videoAd.show().catch(() => {
        this.videoAd.load()
          .then(() => this.videoAd.show())
          .catch(err => {
            console.error('激励视频 广告显示失败', err);
            this.pendingSaveToAlbum = null;
            this.saveImageImpl();
          });
      });
      return;
    }

    this.saveImageImpl();
  },

  saveImageImpl: function () {
    const that = this;
    const currentModule = this.data.currentModule;
    const imagePaths = [];

    // 显示保存中提示
    wx.showLoading({
      title: '准备保存...',
      mask: true
    });

    if (currentModule === 'make') {
      const standardPath = this.data.makeResultImageHd || this.data.makeResultImage || this.data.makeTransparentImageHd || this.data.makeTransparentImage;
      if (standardPath) {
        imagePaths.push({ path: standardPath, name: '标准照' });
      }
      if (this.data.makeResultImageHd && this.data.makeResultImageHd !== standardPath) {
        imagePaths.push({ path: this.data.makeResultImageHd, name: '高清照' });
      }
      if (this.data.makeLayoutImage) {
        imagePaths.push({ path: this.data.makeLayoutImage, name: '排版照' });
      }
      if (this.data.makeTransparentImage) {
        imagePaths.push({ path: this.data.makeTransparentImage, name: '透明标准照' });
      }
      if (this.data.makeTransparentImageHd) {
        imagePaths.push({ path: this.data.makeTransparentImageHd, name: '透明高清照' });
      }
    } else if (currentModule === 'changeBg') {
      // 收集换底色模块的所有图片
      if (this.data.changeBgResultImage) {
        imagePaths.push({ path: this.data.changeBgResultImage, name: '换底色证件照' });
      }
      if (this.data.changeBgTransparentImage) {
        imagePaths.push({ path: this.data.changeBgTransparentImage, name: '透明底证件照' });
      }
    }

    // 检查是否有图片需要保存
    if (imagePaths.length === 0) {
      wx.hideLoading();
      wx.showToast({
        title: '图片正在生成中，请稍后再试',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 依次保存图片到相册
    that.saveImagesSequentially(imagePaths, 0);
  },

  // 依次保存图片到相册
  saveImagesSequentially: function (imagePaths, index) {
    const that = this;
    
    // 所有图片保存完成
    if (index >= imagePaths.length) {
      wx.hideLoading();
      wx.showToast({
        title: '所有图片保存成功！',
        icon: 'success',
        duration: 2000
      });
      return;
    }

    const imageInfo = imagePaths[index];
    const imagePath = imageInfo.path;
    const imageName = imageInfo.name;

    // 更新保存进度提示
    wx.showLoading({
      title: `保存中(${index + 1}/${imagePaths.length})...`,
      mask: true
    });

    try {
      // 获取文件系统管理器
      const fs = wx.getFileSystemManager();
      // 生成临时文件路径
      const tempFilePath = wx.env.USER_DATA_PATH + `/idphoto_save_${imageName}_${Date.now()}.jpg`;

      // 检查图片路径类型
      if (imagePath.startsWith('data:image/')) {
        // 处理base64格式图片
        const base64Data = imagePath.replace(/^data:image\/[^;]+;base64,/, '');
        fs.writeFileSync(tempFilePath, base64Data, 'base64');
        that.saveToAlbum(tempFilePath, () => {
          that.saveImagesSequentially(imagePaths, index + 1);
        });
      } else if (imagePath.startsWith('wxfile://') || imagePath.startsWith('http://tmp/') || imagePath.startsWith('http://usr/')) {
        // 处理临时文件路径（本地文件）
        that.saveToAlbum(imagePath, () => {
          that.saveImagesSequentially(imagePaths, index + 1);
        });
      } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // 处理网络图片路径
        wx.downloadFile({
          url: imagePath,
          success: function (res) {
            if (res.statusCode === 200) {
              that.saveToAlbum(res.tempFilePath, () => {
                that.saveImagesSequentially(imagePaths, index + 1);
              });
            } else {
              wx.hideLoading();
              wx.showToast({
                title: `保存${imageName}失败，服务器错误`,
                icon: 'none',
                duration: 2000
              });
            }
          },
          fail: function (error) {
            wx.hideLoading();
            console.error('下载失败:', error);
            wx.showToast({
              title: `保存${imageName}失败，请检查网络`,
              icon: 'none',
              duration: 2000
            });
          }
        });
      } else {
        // 其他情况，直接尝试保存
        that.saveToAlbum(imagePath, () => {
          that.saveImagesSequentially(imagePaths, index + 1);
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存处理失败:', error);
      wx.showToast({
        title: `保存${imageName}失败，请稍后再试`,
        icon: 'none',
        duration: 2000
      });
    }
  },
})
