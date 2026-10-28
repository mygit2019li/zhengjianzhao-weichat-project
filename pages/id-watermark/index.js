const NSFW = require('../../utils/nsfw.js');
const ContentSecurity = require('../../utils/content-security.js');

Page({
  data: {
    userImage: '',
    showSourceSheet: false,
    isGenerating: false,
    resultPath: '',
    
    // 水印模板
    templates: [
      { 
        id: 'custom', 
        name: '自定义', 
        text: '',
        density: 'medium',
        opacity: 0.25
      },
      { 
        id: 'rent', 
        name: '租房专用', 
        text: '仅供租房使用，他用无效',
        density: 'medium',
        opacity: 0.25
      },
      { 
        id: 'bank', 
        name: '银行办理', 
        text: '仅供办理银行业务使用，他用无效',
        density: 'medium',
        opacity: 0.25
      },
      { 
        id: 'loan', 
        name: '贷款申请', 
        text: '仅供贷款申请使用，他用无效',
        density: 'medium',
        opacity: 0.25
      },
      { 
        id: 'insurance', 
        name: '保险办理', 
        text: '仅供办理保险使用，他用无效',
        density: 'medium',
        opacity: 0.25
      },
      { 
        id: 'registration', 
        name: '入职登记', 
        text: '仅供入职登记使用，他用无效',
        density: 'medium',
        opacity: 0.25
      },
      { 
        id: 'contract', 
        name: '合同签署', 
        text: '仅供合同签署使用，他用无效',
        density: 'medium',
        opacity: 0.25
      },
      { 
        id: 'verify', 
        name: '实名认证', 
        text: '仅供实名认证使用，他用无效',
        density: 'medium',
        opacity: 0.25
      }
    ],
    selectedTemplateId: 'custom',
    customText: '',
    showCustomInput: true,
    
    // 水印设置
    watermarkOpacity: 0.25,
    watermarkDensity: 'medium', // low, medium, high
    watermarkAngle: -30,
    watermarkColor: '#ffffff',
    watermarkSize: 20,
    watermarkPosition: 'full', // full, center, diagonal
    previewFontSize: 22,
    previewItems: [],
    previewBoxStyle: '',
    previewBaseWidth: 375,
    
    // 颜色选项
    colorOptions: [
      { id: 'white', color: '#ffffff', name: '白色' },
      { id: 'black', color: '#000000', name: '黑色' },
      { id: 'red', color: '#ff4d4f', name: '红色' },
      { id: 'blue', color: '#1890ff', name: '蓝色' },
      { id: 'green', color: '#52c41a', name: '绿色' },
      { id: 'orange', color: '#fa8c16', name: '橙色' },
      { id: 'purple', color: '#722ed1', name: '紫色' },
      { id: 'gray', color: '#8c8c8c', name: '灰色' }
    ],
    
    // 位置选项
    positionOptions: [
      { id: 'full', name: '全屏覆盖', desc: '水印覆盖整个图片' },
      { id: 'center', name: '居中显示', desc: '水印在图片中央' },
      { id: 'diagonal', name: '对角线', desc: '水印沿对角线排列' },
      { id: 'border', name: '边缘环绕', desc: '水印在图片边缘' }
    ]
  },

  onLoad() {
    // 计算状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    const rpxToPx = systemInfo.windowWidth / 750;
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      previewFontSize: this.data.watermarkSize,
      previewBaseWidth: systemInfo.windowWidth - 48 * rpxToPx
    });
    
    // 默认选中第一个模板（自定义）
    this.selectTemplate({ currentTarget: { dataset: { id: 'custom' } } });
    this.updatePreviewItems();
  },

  // 选择图片（唤起统一来源弹窗）
  chooseImage() {
    this.setData({ showSourceSheet: true });
  },

  closeSourceSheet() {
    this.setData({ showSourceSheet: false });
  },

  // 统一弹窗选图完成（组件已做大小校验 + 鉴黄）
  async onSourceChosen(e) {
    const path = (e.detail && e.detail.paths || [])[0];
    if (!path) return;
    try {
      const imageInfo = await this.getImageInfo(path);
      this.setData({
        showSourceSheet: false,
        userImage: path,
        previewBoxStyle: `aspect-ratio: ${imageInfo.width} / ${imageInfo.height};`
      });
    } catch (error) {
      console.error('获取图片信息失败:', error);
      this.setData({
        showSourceSheet: false,
        userImage: path,
        previewBoxStyle: ''
      });
    }
  },

  // 图片鉴黄检测
  checkImageNSFW: async function (filePath) {
    try {
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

  // 选择模板
  selectTemplate(e) {
    const id = e.currentTarget.dataset.id;
    const template = this.data.templates.find(t => t.id === id);
    
    if (id === 'custom') {
      this.setData({
        selectedTemplateId: id,
        showCustomInput: true,
        customText: ''
      });
    } else {
      this.setData({
        selectedTemplateId: id,
        showCustomInput: false,
        customText: template.text
      });
    }
  },

  // 自定义文字输入
  onCustomInput(e) {
    this.setData({ customText: e.detail.value });
  },

  // 透明度调整
  onOpacityChange(e) {
    this.setData({ watermarkOpacity: e.detail.value / 100 }, () => this.updatePreviewItems());
  },

  // 字体大小调整
  onFontSizeChange(e) {
    const value = Number(e.detail.value);
    this.setData({
      watermarkSize: value,
      previewFontSize: value
    }, () => this.updatePreviewItems());
  },

  // 密度调整
  onDensityChange(e) {
    const densities = ['low', 'medium', 'high'];
    const rawValue = e.currentTarget ? e.currentTarget.dataset.value : e.detail.value;
    const index = Math.max(0, Math.min(2, Number(rawValue)));
    this.setData({ watermarkDensity: densities[index] || 'medium' }, () => this.updatePreviewItems());
  },

  // 颜色选择
  onColorChange(e) {
    const colorId = e.currentTarget.dataset.id;
    const colorOption = this.data.colorOptions.find(c => c.id === colorId);
    if (colorOption) {
      this.setData({ watermarkColor: colorOption.color }, () => this.updatePreviewItems());
    }
  },

  // 位置选择
  onPositionChange(e) {
    const positionId = e.currentTarget.dataset.id;
    const valid = ['full', 'center', 'diagonal', 'border'];
    this.setData({ watermarkPosition: valid.includes(positionId) ? positionId : 'full' }, () => this.updatePreviewItems());
  },

  updatePreviewItems() {
    const items = this.getPreviewItems();
    this.setData({ previewItems: items });
  },

  getPreviewItems() {
    const { watermarkPosition, watermarkDensity, previewFontSize } = this.data;
    const fontSize = Math.max(10, Number(previewFontSize) || 20);
    const layout = this.getWatermarkLayout(watermarkPosition, watermarkDensity);
    return layout.map(item => ({
      id: item.id,
      className: item.className,
      style: this.getPreviewItemStyle(item.left, item.top, fontSize * item.sizeScale)
    }));
  },

  getPreviewItemStyle(left, top, fontSize, transform) {
    const rotate = `rotate(${this.data.watermarkAngle}deg)`;
    return [
      `left: ${left}%`,
      `top: ${top}%`,
      `font-size: ${fontSize}px`,
      `opacity: ${this.data.watermarkOpacity}`,
      `color: ${this.data.watermarkColor}`,
      `transform: ${transform || `translate(-50%, -50%) ${rotate}`}`
    ].join(';');
  },

  getWatermarkLayout(position, density) {
    switch (position) {
      case 'center':
        return [{
          id: 'center-0',
          left: 50,
          top: 50,
          sizeScale: 1.8,
          className: 'watermark-center-item'
        }];
      case 'diagonal':
        return this.getDiagonalWatermarkLayout(density);
      case 'border':
        return this.getBorderWatermarkLayout();
      case 'full':
      default:
        return this.getFullWatermarkLayout(density);
    }
  },

  getFullWatermarkLayout(density) {
    const config = {
      low: { cols: 3, rows: 2 },
      medium: { cols: 4, rows: 3 },
      high: { cols: 5, rows: 4 }
    }[density] || { cols: 4, rows: 3 };

    const items = [];
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const left = ((col + 0.5) / config.cols) * 100;
        const top = ((row + 0.5) / config.rows) * 100;
        items.push({
          id: `full-${row}-${col}`,
          left,
          top,
          sizeScale: 1,
          className: 'watermark-full-item'
        });
      }
    }
    return items;
  },

  getDiagonalWatermarkLayout(density) {
    const countMap = { low: 3, medium: 5, high: 7 };
    const count = countMap[density] || countMap.medium;
    const items = [];
    for (let i = 1; i <= count; i++) {
      const ratio = i / (count + 1);
      items.push({
        id: `diagonal-${i}`,
        left: ratio * 100,
        top: ratio * 100,
        sizeScale: 1,
        className: 'watermark-diagonal-item'
      });
    }
    return items;
  },

  getBorderWatermarkLayout() {
    const positions = [
      [10, 10], [50, 10], [90, 10],
      [10, 50], [90, 50],
      [10, 90], [50, 90], [90, 90]
    ];

    return positions.map(([left, top], index) => ({
      id: `border-${index}`,
      left,
      top,
      sizeScale: 0.85,
      className: 'watermark-border-item'
    }));
  },

  // 生成水印图片
  async generateWatermark() {
    if (!this.data.userImage) {
      wx.showToast({ title: '请先上传证件照片', icon: 'none' });
      return;
    }

    const text = this.data.selectedTemplateId === 'custom' 
      ? this.data.customText 
      : this.data.templates.find(t => t.id === this.data.selectedTemplateId).text;

    if (!text || text.trim() === '') {
      wx.showToast({ title: '请输入水印文字', icon: 'none' });
      return;
    }

    // 内容安全：检测水印文字
    const textPassed = await ContentSecurity.checkTextAndAlert(text);
    if (!textPassed) return;

    this.setData({ isGenerating: true });
    wx.showLoading({ title: '生成中...' });

    try {
      const query = wx.createSelectorQuery();
      query.select('#watermarkCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) {
            this.setData({ isGenerating: false });
            wx.hideLoading();
            wx.showToast({ title: '画布初始化失败', icon: 'none' });
            return;
          }
          const canvas = res[0].node;
          this.drawWatermark(canvas, text).catch((err) => {
            console.error('绘制失败:', err);
            this.setData({ isGenerating: false });
            wx.hideLoading();
            wx.showToast({ title: '生成失败，请重试', icon: 'none' });
          });
        });
    } catch (error) {
      console.error('生成失败:', error);
      this.setData({ isGenerating: false });
      wx.hideLoading();
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
    }
  },

  // 绘制水印
  async drawWatermark(canvas, text) {
    const ctx = canvas.getContext('2d');
    const userImageInfo = await this.getImageInfo(this.data.userImage);

    // 导出尺寸始终保持与原图一致
    canvas.width = userImageInfo.width;
    canvas.height = userImageInfo.height;

    // 1. 绘制原图（原图尺寸）
    const img = canvas.createImage();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = this.data.userImage;
    });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 2. 绘制水印
    this.drawTextWatermark(ctx, canvas.width, canvas.height, text);

    // 3. 导出图片
    wx.canvasToTempFilePath({
      canvas: canvas,
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      destWidth: canvas.width,
      destHeight: canvas.height,
      fileType: 'jpg',
      quality: 0.9,
      success: (res) => {
        this.setData({ resultPath: res.tempFilePath, isGenerating: false });
        wx.hideLoading();
      },
      fail: (err) => {
        console.error('Canvas导出失败:', err);
        this.setData({ isGenerating: false });
        wx.hideLoading();
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
      }
    });
  },

  // 绘制文字水印
  drawTextWatermark(ctx, width, height, text) {
    const { watermarkOpacity, watermarkDensity, watermarkAngle, watermarkColor, watermarkPosition } = this.data;
    
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = watermarkColor;
    ctx.globalAlpha = watermarkOpacity;

    const angle = watermarkAngle * Math.PI / 180;
    const layout = this.getWatermarkLayout(watermarkPosition, watermarkDensity);

    layout.forEach(item => {
      const baseFontSize = this.getCanvasPreviewFontSize(width, item.sizeScale);
      const maxTextWidth = this.getMaxTextWidth(width, watermarkPosition);
      const fontSize = this.fitFontSizeToWidth(ctx, text, baseFontSize, maxTextWidth, 10);

      ctx.save();
      ctx.translate(width * item.left / 100, height * item.top / 100);
      ctx.rotate(angle);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    });

    ctx.restore();
  },

  getCanvasPreviewFontSize(width, sizeScale) {
    const baseWidth = Math.max(1, this.data.previewBaseWidth || 375);
    return Math.max(10, this.data.watermarkSize * sizeScale * width / baseWidth);
  },

  // 全屏覆盖水印
  drawFullWatermark(ctx, width, height, text, angle) {
    const { watermarkDensity } = this.data;
    const textWidth = Math.max(1, ctx.measureText(text).width);
    const fontSize = this.getCurrentFontSize(ctx);
    
    // 根据密度设置间距
    let gapX, gapY;
    switch (watermarkDensity) {
      case 'low':
        gapX = textWidth + fontSize * 5.2;
        gapY = fontSize * 4.2;
        break;
      case 'high':
        gapX = textWidth + fontSize * 2.8;
        gapY = fontSize * 2.8;
        break;
      case 'medium':
      default:
        gapX = textWidth + fontSize * 4;
        gapY = fontSize * 3.4;
        break;
    }

    const cols = Math.ceil(width / gapX) + 2;
    const rows = Math.ceil(height / gapY) + 2;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * gapX;
        const y = row * gapY;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    }
  },

  // 居中显示水印
  drawCenterWatermark(ctx, width, height, text, angle) {
    const centerBaseSize = this.getAdaptiveBaseSize(width, height, this.data.watermarkSize * 1.8, 'center');
    const centerSize = this.fitFontSizeToWidth(ctx, text, centerBaseSize, width * 0.86, 14);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle);
    ctx.font = `bold ${centerSize}px sans-serif`;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  },

  // 对角线水印
  drawDiagonalWatermark(ctx, width, height, text, angle) {
    const { watermarkDensity } = this.data;
    
    let count;
    switch (watermarkDensity) {
      case 'low':
        count = 3;
        break;
      case 'high':
        count = 7;
        break;
      case 'medium':
      default:
        count = 5;
        break;
    }

    const diagonal = Math.sqrt(width * width + height * height);
    const step = diagonal / (count + 1);

    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const x = width * t;
      const y = height * t;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  },

  // 边缘环绕水印
  drawBorderWatermark(ctx, width, height, text, angle) {
    // 边距根据文本尺寸自适应，避免贴边裁切
    const textWidth = ctx.measureText(text).width;
    const padding = Math.max(Math.min(width, height) * 0.1, textWidth * 0.18);
    const positions = [
      { x: padding, y: padding },
      { x: width / 2, y: padding },
      { x: width - padding, y: padding },
      { x: padding, y: height / 2 },
      { x: width - padding, y: height / 2 },
      { x: padding, y: height - padding },
      { x: width / 2, y: height - padding },
      { x: width - padding, y: height - padding }
    ];

    positions.forEach(pos => {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    });
  },

  getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({ src, success: resolve, fail: reject });
    });
  },

  getCurrentFontSize(ctx) {
    const matched = String(ctx.font || '').match(/(\d+(?:\.\d+)?)px/);
    return matched ? Number(matched[1]) : 16;
  },

  getMaxTextWidth(width, position) {
    if (position === 'center') return width * 0.86;
    if (position === 'diagonal') return width * 0.55;
    if (position === 'border') return width * 0.36;
    return width * 0.42;
  },

  getAdaptiveBaseSize(width, height, sliderSize, position) {
    const minSide = Math.min(width, height);
    const ratioBase = Math.max(10, Math.floor(minSide / 18));
    const factor = position === 'center' ? 1.5 : 1;
    const preferred = sliderSize * factor;
    return Math.max(10, Math.min(preferred, ratioBase * 3.4));
  },

  fitFontSizeToWidth(ctx, text, preferredSize, maxWidth, minSize) {
    let size = preferredSize;
    while (size > minSize) {
      ctx.font = `bold ${size}px sans-serif`;
      const textWidth = ctx.measureText(text).width;
      if (textWidth <= maxWidth) {
        return size;
      }
      size -= 1;
    }
    return minSize;
  },

  // 保存图片
  saveImage() {
    if (!this.data.resultPath) return;
    
    wx.saveImageToPhotosAlbum({
      filePath: this.data.resultPath,
      success: () => {
        wx.showToast({ title: '已保存到相册' });
        this.closeResult();
      },
      fail: () => {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 分享图片
  shareImage() {
    if (!this.data.resultPath) return;
    wx.showShareImageMenu({
      path: this.data.resultPath,
      fail: (err) => {
        console.error('Share failed:', err);
      }
    });
  },

  // 预览结果
  previewResult() {
    wx.previewImage({ urls: [this.data.resultPath] });
  },

  // 关闭结果
  closeResult() {
    this.setData({ resultPath: '' });
  },

  // 重新制作
  resetMaking() {
    this.setData({
      userImage: '',
      resultPath: '',
      customText: '',
      previewBoxStyle: ''
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  onShareAppMessage() {
    return {
      title: '证件加水印，保护个人信息安全！',
      path: '/pages/id-watermark/index'
    };
  }
});
