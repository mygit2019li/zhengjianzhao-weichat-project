const { getTemplateId, getTemplateOptions } = require('./templates.js');
const { buildPuzzleRenderModel } = require('../../utils/puzzle/render-model.js');
const { calculateLayoutGeometry: buildLayoutGeometry } = require('../../utils/puzzle/layout.js');

Page({
  data: {
    // Tab 切换
    currentTab: 'layout',
    
    // 画布尺寸
    canvasWidth: 402,
    canvasHeight: 500, // 默认 3:4 比例
    canvasRatio: 'original', // 'original' | '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
    
    // 图片数据
    images: [],
    imageInfos: [], // 存储图片原始信息
    
    // 布局模式
    layoutMode: 'vertical', // 'vertical' | 'horizontal'，仅双图时有效
    
    // 三图布局模式
    tripleLayoutMode: 'top-large', // 'top-large' | 'bottom-large' | 'vertical' | 'left-large' | 'right-large'
    
    // 四图布局模式
    fourLayoutMode: 'grid', // 'grid' | 'vertical' | 'horizontal' | 'top-large' | 'bottom-large' | 'left-large' | 'right-large'
    
    // 五图布局模式
    fiveLayoutMode: 'grid', // 'grid' | 'vertical' | 'horizontal' | 'left-two' | 'top-two'
    
    // 六图布局模式
    sixLayoutMode: 'grid', // 'grid' | 'vertical' | 'horizontal'

    // 七图布局模式
    sevenLayoutMode: 'grid-3-4', // 'grid-3-4' | 'grid-4-3' | 'top-one'

    // 八图布局模式
    eightLayoutMode: 'grid-3-3-2', // 'grid-3-3-2' | 'grid-4-4'

    // 九图布局模式
    nineLayoutMode: 'grid', // 'grid'

    // 图片显示比例
    imageRatio: 'fill', // 'fill' | 'fit' | 'stretch'
    
    // 边框设置
    borderWidth: 0,
    borderColor: '#ffffff',
    borderRadius: 0,
    outerGap: 0,
    innerGap: 0,
    activeTemplateId: '',
    templateOptions: [],
    
    // 布局与绘制计算结果
    imageTransforms: [],
    renderModel: {
      templateId: '',
      canvas: {
        width: 402,
        height: 500,
        borderWidth: 0,
        borderColor: '#ffffff',
        borderRadius: 0,
        outerGap: 0,
        innerGap: 0,
        previewBackground: 'transparent'
      },
      images: [],
      texts: []
    },
    
    // 文字元素
    texts: [{
      content: '',
      size: 36,
      color: '#FFFFFF',
      x: 50,
      y: 88,
      bold: false,
      shadow: false,
      align: 'center',
      opacity: 100
    }],
    activeTextIndex: 0,
    textColors: ['#FFFFFF', '#000000', '#07C160', '#1296DB', '#FF6B6B', '#FFA940'],
    
    // 选中图片状态
    selectedIndex: -1,
    operationBarStyle: '',
    isImageSorting: false,
    dragFromIndex: -1,
    dragOverIndex: -1,
    
    // 缩放弹窗
    showScalePopup: false,
    popupImageScale: 1,
    
    // 文字拖动状态
    textDragStartX: 0,
    textDragStartY: 0,
    textDragStartPctX: 50,
    textDragStartPctY: 88
  },

  onLoad(options) {
    console.log('拼图页面加载', options);

    // 如果指定了长图模式，设置所有布局模式为该模式，并设置画布比例为 original
    if (options && options.longMode) {
      const mode = options.longMode; // 'horizontal' or 'vertical'
      this.setData({
        canvasRatio: 'original',
        layoutMode: mode,
        tripleLayoutMode: mode,
        fourLayoutMode: mode,
        fiveLayoutMode: mode,
        sixLayoutMode: mode,
        sevenLayoutMode: mode,
        eightLayoutMode: mode,
        nineLayoutMode: mode
      });
    }

    // 接收从主页传递过来的图片数据
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel) {
      eventChannel.on('acceptDataFromOpenerPage', (data) => {
        console.log('接收到主页传递的图片数据:', data);
        if (data && data.images && data.images.length > 0) {
          // 将传递的图片添加到 images 和 imageInfos 中
          const newImages = data.images;
          const newImageInfos = data.images.map((src, index) => ({
            src: src,
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            width: 0,
            height: 0,
            naturalWidth: 0,
            naturalHeight: 0
          }));

          this.setData({
            images: newImages,
            imageInfos: newImageInfos
          }, () => {
            // 加载图片信息并重新计算布局
            this.loadImageInfos(() => {
              this.calculateLayout();
              this.calculateImageTransforms();
            });
          });
        }
      });
    }

    this.syncTemplateMeta();
    this.calculateImageTransforms();
  },

  onReady() {
    console.log('拼图页面就绪');
    // 页面就绪后刷新画布尺寸
    this.refreshCanvasSize();
  },

  // 刷新画布尺寸 - 参考备份文件的动态计算逻辑
  refreshCanvasSize() {
    const previewBottomGapPx = 14; // 底部间隙

    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select('.preview-area').boundingClientRect();
      query.select('.controls-area').boundingClientRect();
      query.exec((res) => {
        const stage = res && res[0] ? res[0] : null;
        const controls = res && res[1] ? res[1] : null;

        if (!stage || !stage.width || !stage.height) return;

        const sys = wx.getSystemInfoSync();
        const pxToRpx = 750 / sys.windowWidth;

        // 计算可用高度
        let availableHeight = Math.max(1, stage.height - 8 - previewBottomGapPx);

        if (sys && sys.windowHeight) {
          const controlH = controls && controls.height ? controls.height : 0;
          const safeBottom = sys.safeArea ? (sys.windowHeight - sys.safeArea.bottom) : 0;
          const reserve = 16 + safeBottom + previewBottomGapPx;
          const vhAvail = Math.max(1, sys.windowHeight - controlH - reserve);
          availableHeight = Math.min(availableHeight, vhAvail);
        }

        // 转换为 rpx，并限制最大宽度为 700rpx（避免画布太大）
        const stageMaxWidth = Math.max(1, stage.width - 8);
        const maxAllowedWidth = Math.min(Math.floor(stageMaxWidth * pxToRpx), 700);
        this._maxCanvasWidth = maxAllowedWidth;
        this._maxCanvasHeight = Math.floor(availableHeight * pxToRpx);

        // 重新计算几何布局并更新画布尺寸
        const layout = this.calculateLayoutGeometry(this._maxCanvasWidth, this._maxCanvasHeight);
        this.setData({
          canvasWidth: layout.canvasWidth,
          canvasHeight: layout.canvasHeight
        }, () => {
          // 更新布局后重新计算图片变换
          this.calculateLayout();
          this.calculateImageTransforms();
        });
      });
    });
  },

  // 获取最大画布高度
  getMaxCanvasHeight() {
    // 如果已经通过 refreshCanvasSize 计算过，使用计算值
    if (this._maxCanvasHeight) {
      return this._maxCanvasHeight;
    }

    // 兜底逻辑：使用静态计算
    const systemInfo = wx.getSystemInfoSync();
    const pxToRpx = 750 / systemInfo.windowWidth;
    const windowHeightRpx = systemInfo.windowHeight * pxToRpx;

    // 保守估计，给底部留出足够空间
    const availableHeightRpx = windowHeightRpx - 88 - 480 - 40 - 40;
    const maxAllowedHeight = Math.min(availableHeightRpx, 500);

    return Math.floor(maxAllowedHeight);
  },

  // ========== 核心几何算法：动态计算网格和画布尺寸 ==========
  calculateLayoutGeometry(maxWidth, maxHeight) {
    return buildLayoutGeometry({
      maxWidth,
      maxHeight,
      canvasRatio: this.data.canvasRatio,
      outerGap: this.data.outerGap,
      innerGap: this.data.innerGap,
      images: this.data.images,
      imageInfos: this.data.imageInfos,
      gridRows: this.data.gridRows,
      modes: {
        layoutMode: this.data.layoutMode,
        tripleLayoutMode: this.data.tripleLayoutMode,
        fourLayoutMode: this.data.fourLayoutMode,
        fiveLayoutMode: this.data.fiveLayoutMode,
        sixLayoutMode: this.data.sixLayoutMode,
        sevenLayoutMode: this.data.sevenLayoutMode,
        eightLayoutMode: this.data.eightLayoutMode,
        nineLayoutMode: this.data.nineLayoutMode
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 切换 Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  syncTemplateMeta() {
    const count = this.data.images.length;
    this.setData({
      activeTemplateId: getTemplateId(count, this.data),
      templateOptions: getTemplateOptions(count)
    });
  },

  // 选择图片
  chooseImages() {
    wx.chooseMedia({
      count: 9 - this.data.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        this.addImages(newImages);
      }
    });
  },

  // 添加图片
  addImages(newImages) {
    const { images, imageInfos } = this.data;
    const allImages = [...images, ...newImages];
    
    // 获取图片信息
    const getImageInfoPromises = newImages.map(src => {
      return new Promise((resolve) => {
        wx.getImageInfo({
          src,
          success: (res) => {
            resolve({
              src,
              width: res.width,
              height: res.height,
              ratio: res.width / res.height,
              rotate: 0 // 初始化旋转角度
            });
          },
          fail: () => {
            resolve({ src, width: 0, height: 0, ratio: 1, rotate: 0 });
          }
        });
      });
    });

    Promise.all(getImageInfoPromises).then(newInfos => {
      const allInfos = [...imageInfos, ...newInfos];
      
      this.setData({
        images: allImages,
        imageInfos: allInfos
      }, () => {
        this.syncTemplateMeta();
        this.calculateLayout();
        this.calculateImageTransforms();
      });
    });
  },

  // 加载图片信息（用于从主页传递过来的图片）
  loadImageInfos(callback) {
    const { images, imageInfos } = this.data;

    // 获取图片信息
    const getImageInfoPromises = images.map((src, index) => {
      // 如果已经有图片信息，跳过
      if (imageInfos[index] && imageInfos[index].width > 0) {
        return Promise.resolve(imageInfos[index]);
      }

      return new Promise((resolve) => {
        wx.getImageInfo({
          src,
          success: (res) => {
            resolve({
              src,
              width: res.width,
              height: res.height,
              ratio: res.width / res.height,
              rotate: 0,
              scale: 1,
              x: 0,
              y: 0
            });
          },
          fail: () => {
            resolve({ src, width: 0, height: 0, ratio: 1, rotate: 0, scale: 1, x: 0, y: 0 });
          }
        });
      });
    });

    Promise.all(getImageInfoPromises).then(newInfos => {
      this.setData({
        imageInfos: newInfos
      }, () => {
        if (callback) callback();
      });
    });
  },

  // 计算布局
  calculateLayout() {
    const { images, imageInfos } = this.data;
    
    // 多图时使用网格布局
    if (images.length > 0) {
        const gridRows = this.calculateGridLayout(imageInfos);
        this.setData({ gridRows });
    }
  },

  // 计算网格布局 - 确保同一行高度一致，无空白无缝隙
  calculateGridLayout(imageInfos) {
    const count = imageInfos.length;
    const rows = [];
    
    if (count === 3) {
      // 3张图：第一行1张，第二行2张
      rows.push([imageInfos[0].src]);
      rows.push([imageInfos[1].src, imageInfos[2].src]);
    } else if (count === 4) {
      // 4张图：2x2
      rows.push([imageInfos[0].src, imageInfos[1].src]);
      rows.push([imageInfos[2].src, imageInfos[3].src]);
    } else if (count === 5) {
      // 5张图：第一行2张，第二行3张
      rows.push([imageInfos[0].src, imageInfos[1].src]);
      rows.push([imageInfos[2].src, imageInfos[3].src, imageInfos[4].src]);
    } else if (count === 6) {
      // 6张图：2x3
      rows.push([imageInfos[0].src, imageInfos[1].src, imageInfos[2].src]);
      rows.push([imageInfos[3].src, imageInfos[4].src, imageInfos[5].src]);
    } else if (count === 7) {
      // 7张图：第一行3张，第二行4张
      rows.push([imageInfos[0].src, imageInfos[1].src, imageInfos[2].src]);
      rows.push([imageInfos[3].src, imageInfos[4].src, imageInfos[5].src, imageInfos[6].src]);
    } else if (count === 8) {
      // 8张图：第一行3张，第二行3张，第三行2张
      rows.push([imageInfos[0].src, imageInfos[1].src, imageInfos[2].src]);
      rows.push([imageInfos[3].src, imageInfos[4].src, imageInfos[5].src]);
      rows.push([imageInfos[6].src, imageInfos[7].src]);
    } else if (count === 9) {
      // 9张图：3x3
      rows.push([imageInfos[0].src, imageInfos[1].src, imageInfos[2].src]);
      rows.push([imageInfos[3].src, imageInfos[4].src, imageInfos[5].src]);
      rows.push([imageInfos[6].src, imageInfos[7].src, imageInfos[8].src]);
    } else {
      // 超过9张，每行3张
      for (let i = 0; i < count; i += 3) {
        const row = [];
        for (let j = i; j < Math.min(i + 3, count); j++) {
          row.push(imageInfos[j].src);
        }
        rows.push(row);
      }
    }
    
    return rows;
  },

  // 设置画布比例
  setCanvasRatio(e) {
    const ratio = e.currentTarget.dataset.ratio;
    this.setData({ canvasRatio: ratio }, () => {
      this.syncTemplateMeta();
      // 切换比例时刷新画布尺寸
      this.refreshCanvasSize();
    });
  },

  // 设置布局模式（双图时的上下/左右）
  setLayoutMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ layoutMode: mode }, () => {
      this.syncTemplateMeta();
      this.calculateImageTransforms();
    });
  },

  // 设置三图布局模式
  setTripleLayoutMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ tripleLayoutMode: mode }, () => {
      this.syncTemplateMeta();
      this.calculateImageTransforms();
    });
  },

  // 设置四图布局模式
  setFourLayoutMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ fourLayoutMode: mode }, () => {
      this.syncTemplateMeta();
      this.calculateImageTransforms();
    });
  },

  // 设置五图布局模式
  setFiveLayoutMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ fiveLayoutMode: mode }, () => {
      this.syncTemplateMeta();
      this.calculateImageTransforms();
    });
  },

  // 设置六图布局模式
  setSixLayoutMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ sixLayoutMode: mode }, () => {
      this.syncTemplateMeta();
      this.calculateImageTransforms();
    });
  },

  // 设置七图布局模式
  setSevenLayoutMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ sevenLayoutMode: mode }, () => {
      this.syncTemplateMeta();
      this.calculateImageTransforms();
    });
  },

  // 设置八图布局模式
  setEightLayoutMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ eightLayoutMode: mode }, () => {
      this.syncTemplateMeta();
      this.calculateImageTransforms();
    });
  },

  // 设置九图布局模式
  setNineLayoutMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ nineLayoutMode: mode }, () => {
      this.syncTemplateMeta();
      this.calculateImageTransforms();
    });
  },

  // 设置图片显示比例
  setImageRatio(e) {
    const ratio = e.currentTarget.dataset.ratio;
    this.setData({ imageRatio: ratio }, () => {
      this.calculateImageTransforms();
    });
  },

  // 设置边框宽度
  setBorderWidth(e) {
    const width = parseInt(e.currentTarget.dataset.width);
    this.setData({ borderWidth: width, outerGap: width, innerGap: width }, () => {
      this.calculateImageTransforms();
    });
  },

  // 设置边框颜色
  setBorderColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({ borderColor: color }, () => {
      this.calculateImageTransforms();
    });
  },

  // 设置边框圆角
  setBorderRadius(e) {
    const radius = e.detail.value;
    this.setData({ borderRadius: radius }, () => {
      this.calculateImageTransforms();
    });
  },

  // ========== 图片选中与操作 ==========
  
  // 点击图片选中
  onImageTap(e) {
    if (this.suppressImageTap || this.data.isImageSorting) return;
    const index = Number(e.currentTarget.dataset.index);
    if (this.data.selectedIndex === index) return;
    
    this.setData({ selectedIndex: index }, () => {
      this.updateOperationBarPosition();
    });
  },

  // 关闭操作栏
  closeOperationBar() {
    this.setData({
      selectedIndex: -1,
      operationBarStyle: ''
    });
  },

  // 更新操作栏位置
  updateOperationBarPosition() {
    const { selectedIndex, imageTransforms } = this.data;
    if (selectedIndex === -1 || !imageTransforms[selectedIndex]) return;

    const transform = imageTransforms[selectedIndex];
    const container = transform.container;

    // 计算 canvas 在 preview-area 中的偏移（因为 canvas 是居中的）
    // 使用 wx.nextTick 确保 DOM 已更新
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select('.preview-area').boundingClientRect();
      query.select('.puzzle-canvas').boundingClientRect();
      query.exec((res) => {
        const previewArea = res[0];
        const puzzleCanvas = res[1];

        if (!previewArea || !puzzleCanvas) {
          const fallback = this.getSafeOperationBarPosition({
            targetLeft: container.x + container.w / 2,
            targetTop: container.y + container.h + 12,
            targetAboveTop: container.y - 128,
            areaWidth: 702,
            areaHeight: this.getMaxCanvasHeight()
          });
          this.setData({
            operationBarStyle: this.buildOperationBarStyle(fallback)
          });
          return;
        }

        // 计算 canvas 相对于 preview-area 的偏移（转换为 rpx）
        const systemInfo = wx.getSystemInfoSync();
        const rpxRatio = 750 / systemInfo.windowWidth;

        const canvasOffsetX = (puzzleCanvas.left - previewArea.left) * rpxRatio;
        const canvasOffsetY = (puzzleCanvas.top - previewArea.top) * rpxRatio;

        const areaWidth = previewArea.width * rpxRatio;
        const areaHeight = previewArea.height * rpxRatio;
        const targetLeft = canvasOffsetX + container.x + container.w / 2;
        const targetTop = canvasOffsetY + container.y + container.h + 12;
        const targetAboveTop = canvasOffsetY + container.y - 128;
        const position = this.getSafeOperationBarPosition({
          targetLeft,
          targetTop,
          targetAboveTop,
          areaWidth,
          areaHeight
        });

        this.setData({
          operationBarStyle: this.buildOperationBarStyle(position)
        });
      });
    });
  },

  getSafeOperationBarPosition({ targetLeft, targetTop, targetAboveTop, areaWidth, areaHeight }) {
    const margin = 20;
    const availableWidth = Math.max(320, areaWidth - margin * 2);
    const barWidth = Math.min(650, availableWidth);
    const barHeight = 116;
    const minLeft = margin;
    const maxLeft = Math.max(minLeft, areaWidth - barWidth - margin);
    const left = Math.max(minLeft, Math.min(maxLeft, targetLeft - barWidth / 2));

    let top = targetTop;
    if (top + barHeight + margin > areaHeight) {
      top = targetAboveTop;
    }
    top = Math.max(margin, Math.min(Math.max(margin, areaHeight - barHeight - margin), top));

    return { left, top, width: barWidth };
  },

  buildOperationBarStyle(position) {
    return `top: ${position.top}rpx; left: ${position.left}rpx; width: ${position.width}rpx;`;
  },

  // 替换图片
  replaceImage() {
    const index = this.data.selectedIndex;
    if (index === -1) return;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const src = res.tempFiles[0].tempFilePath;
        
        wx.getImageInfo({
          src,
          success: (info) => {
            const { images, imageInfos } = this.data;
            
            // 更新数据
            images[index] = src;
            imageInfos[index] = {
              src,
              width: info.width,
              height: info.height,
              ratio: info.width / info.height,
              rotate: 0,
              scale: 1
            };
            
            this.setData({ images, imageInfos }, () => {
              // 重新计算布局（如果是完整模式，图片比例变了可能影响布局）
              if (this.data.canvasRatio === 'original') {
                const layout = this.calculateLayoutGeometry(702, this.getMaxCanvasHeight());
                this.setData({ 
                  canvasWidth: layout.canvasWidth,
                  canvasHeight: layout.canvasHeight
                }, () => {
                  this.calculateImageTransforms();
                  this.updateOperationBarPosition();
                });
              } else {
                this.calculateImageTransforms();
              }
            });
          }
        });
      }
    });
  },

  // 删除图片
  deleteImage() {
    const index = this.data.selectedIndex;
    if (index === -1) return;

    const { images, imageInfos } = this.data;

    // 检查是否只剩一张图
    if (images.length <= 1) {
      wx.showToast({
        title: '至少保留一张图片',
        icon: 'none'
      });
      return;
    }

    images.splice(index, 1);
    imageInfos.splice(index, 1);

    this.setData({
      images,
      imageInfos,
      selectedIndex: -1
    }, () => {
      this.syncTemplateMeta();
      // 图片数量变化，重新计算网格布局
      this.calculateLayout();
      // 重新计算几何布局
      const layout = this.calculateLayoutGeometry(702, this.getMaxCanvasHeight());
      this.setData({
        canvasWidth: layout.canvasWidth,
        canvasHeight: layout.canvasHeight
      }, () => {
        this.calculateImageTransforms();
      });
    });
  },

  // 旋转图片
  rotateImage() {
    const index = this.data.selectedIndex;
    if (index === -1) return;
    
    const { imageInfos } = this.data;
    const info = imageInfos[index];
    
    // 旋转 90 度
    const newRotate = (info.rotate + 90) % 360;
    info.rotate = newRotate;
    
    this.setData({ imageInfos }, () => {
      // 旋转改变了宽高比，完整模式下需要重新计算布局
      if (this.data.canvasRatio === 'original') {
        const layout = this.calculateLayoutGeometry(702, this.getMaxCanvasHeight());
        this.setData({ 
          canvasWidth: layout.canvasWidth,
          canvasHeight: layout.canvasHeight
        }, () => {
          this.calculateImageTransforms();
          this.updateOperationBarPosition();
        });
      } else {
        this.calculateImageTransforms();
      }
    });
  },

  // 放大图片
  zoomInImage() {
    const index = this.data.selectedIndex;
    if (index === -1) return;
    
    const { imageInfos } = this.data;
    const info = imageInfos[index];
    
    // 每次放大 0.1
    let newScale = (info.scale || 1) + 0.1;
    if (newScale > 3) newScale = 3; // 最大放大3倍
    
    info.scale = newScale;
    
    this.setData({ imageInfos }, () => {
      this.calculateImageTransforms();
    });
  },

  // 缩小图片
  zoomOutImage() {
    const index = this.data.selectedIndex;
    if (index === -1) return;
    
    const { imageInfos } = this.data;
    const info = imageInfos[index];
    
    // 每次缩小 0.1
    let newScale = (info.scale || 1) - 0.1;
    if (newScale < 0.5) newScale = 0.5; // 最小缩小到0.5
    
    info.scale = newScale;
    
    this.setData({ imageInfos }, () => {
      this.calculateImageTransforms();
    });
  },

  // ========== 核心计算逻辑：计算图片边界和内联样式 ==========
  buildPreviewImageStyle(x, y, width, height, rotate = 0) {
    const rotateStr = rotate ? ` rotate(${rotate}deg)` : '';
    return `left: ${x}rpx; top: ${y}rpx; width: ${width}rpx; height: ${height}rpx; transform: ${rotateStr.trim() || 'none'}; transform-origin: center center;`;
  },

  snapRpxToDevicePixel(value) {
    const systemInfo = wx.getSystemInfoSync();
    const rpxToPx = systemInfo.windowWidth / 750;
    if (!rpxToPx) return value;
    return Math.round(value * rpxToPx) / rpxToPx;
  },

  calculateImageTransforms() {
    const { images, imageInfos, imageRatio, canvasRatio, borderWidth, borderColor } = this.data;
    const outerGap = this.data.outerGap;
    const innerGap = this.data.innerGap;
    
    if (!images || images.length === 0) {
      // 空状态下的默认画布尺寸
      const maxWidth = 702;
      let canvasHeight;
      
      if (canvasRatio === '1:1') {
        canvasHeight = maxWidth;
      } else if (canvasRatio === 'original') {
        canvasHeight = Math.floor(maxWidth * 4 / 3);
      } else if (['3:4', '4:3', '9:16', '16:9'].includes(canvasRatio)) {
        const ratioMap = { '3:4': 4/3, '4:3': 3/4, '9:16': 16/9, '16:9': 9/16 };
        canvasHeight = Math.floor(maxWidth * ratioMap[canvasRatio]);
      } else {
        canvasHeight = Math.floor(maxWidth * 4 / 3);
      }
      
      this.setData({
        canvasWidth: maxWidth,
        canvasHeight,
        imageTransforms: [],
        renderModel: buildPuzzleRenderModel({
          images: [],
          imageTransforms: [],
          texts: this.data.texts,
          canvasWidth: maxWidth,
          canvasHeight,
          borderWidth,
          borderColor,
          borderRadius: this.data.borderRadius,
          outerGap,
          innerGap,
          templateId: this.data.activeTemplateId
        })
      });
      return;
    }
    
    const layout = this.calculateLayoutGeometry(702, this.getMaxCanvasHeight());
    const transforms = [];
    const canvasRight = layout.canvasWidth;
    const canvasBottom = layout.canvasHeight;
    
    layout.cells.forEach((c, index) => {
      const info = imageInfos[index];
      // FIX: When borderWidth is 0, we should make sure we don't have anti-aliasing gaps
      // by slightly enlarging the cell dimensions by 1px
      let adjustedW = c.w;
      let adjustedH = c.h;
      let adjustedX = c.x;
      let adjustedY = c.y;
      
      if (borderWidth === 0) {
        // If there's no border, expand each cell by 0.5px to overlap and prevent background bleed
        // But don't expand past the canvas bounds
        adjustedW = c.w + 0.5;
        adjustedH = c.h + 0.5;
        
        // Ensure we don't bleed out of the top/left canvas edges
        if (adjustedX > 0) {
           adjustedX -= 0.25;
           adjustedW += 0.25;
        }
        if (adjustedY > 0) {
           adjustedY -= 0.25;
           adjustedH += 0.25;
        }

        // Snap edge cells to the canvas bounds to eliminate the occasional
        // 1px seam on the last image in vertical/horizontal concatenation.
        if (c.x <= 1) {
          adjustedW += adjustedX;
          adjustedX = 0;
        }
        if (c.y <= 1) {
          adjustedH += adjustedY;
          adjustedY = 0;
        }

        const rightEdge = c.x + c.w;
        const bottomEdge = c.y + c.h;
        if (canvasRight - rightEdge <= 1) {
          adjustedW = canvasRight - adjustedX;
        }
        if (canvasBottom - bottomEdge <= 1) {
          adjustedH = canvasBottom - adjustedY;
        }
      } else {
        // 边框预览时按四条边统一吸附到像素网格，避免宽高单独取整后
        // 造成相邻分隔线忽粗忽细，或者外边框缺一截。
        let snappedLeft = this.snapRpxToDevicePixel(c.x);
        let snappedTop = this.snapRpxToDevicePixel(c.y);
        let snappedRight = this.snapRpxToDevicePixel(c.x + c.w);
        let snappedBottom = this.snapRpxToDevicePixel(c.y + c.h);

        if (Math.abs(c.x - outerGap) <= outerGap) {
          snappedLeft = this.snapRpxToDevicePixel(outerGap);
        }
        if (Math.abs(c.y - outerGap) <= outerGap) {
          snappedTop = this.snapRpxToDevicePixel(outerGap);
        }
        if (Math.abs(canvasRight - outerGap - (c.x + c.w)) <= outerGap) {
          snappedRight = this.snapRpxToDevicePixel(canvasRight - outerGap);
        }
        if (Math.abs(canvasBottom - outerGap - (c.y + c.h)) <= outerGap) {
          snappedBottom = this.snapRpxToDevicePixel(canvasBottom - outerGap);
        }

        adjustedX = snappedLeft;
        adjustedY = snappedTop;
        adjustedW = Math.max(0, snappedRight - snappedLeft);
        adjustedH = Math.max(0, snappedBottom - snappedTop);
      }

      const containerW = adjustedW;
      const containerH = adjustedH;
      
      let scaledW = containerW;
      let scaledH = containerH;
      let currentX = 0;
      let currentY = 0;
      let minX = 0, maxX = 0, minY = 0, maxY = 0;

      if (info && info.width > 0 && info.height > 0) {
        // 如果有旋转，需要交换宽高
        const isRotated = info.rotate === 90 || info.rotate === 270;
        const imgW = isRotated ? info.height : info.width;
        const imgH = isRotated ? info.width : info.height;
        const imgRatio = imgH / imgW; // Height / Width
        const containerRatio = containerH / containerW;

        // 应用缩放比例
        const scale = info.scale || 1;

        if (imageRatio === 'fill') {
          // 填充：短边铺满，长边按比例放大，再应用缩放
          if (imgRatio > containerRatio) {
            scaledH = containerW * imgRatio * scale;
            scaledW = containerW * scale;
          } else {
            scaledW = containerH / imgRatio * scale;
            scaledH = containerH * scale;
          }
        } else if (imageRatio === 'fit') {
          // 适应：长边铺满，短边留白，再应用缩放
          if (imgRatio > containerRatio) {
            scaledW = containerH / imgRatio * scale;
            scaledH = containerH * scale;
          } else {
            scaledH = containerW * imgRatio * scale;
            scaledW = containerW * scale;
          }
        } else if (imageRatio === 'stretch') {
          // 拉伸：无视比例，完全填满，再应用缩放
          scaledW = containerW * scale;
          scaledH = containerH * scale;
        }

        // 初始居中偏移
        const initialX = (containerW - scaledW) / 2;
        const initialY = (containerH - scaledH) / 2;

        if (imageRatio === 'fill') {
          // 填充模式下允许拖动多出容器的部分
          minX = containerW - scaledW;
          maxX = 0;
          minY = containerH - scaledH;
          maxY = 0;
        } else if (imageRatio === 'fit') {
          // 适应模式下锁定居中，不可拖动
          minX = initialX; maxX = initialX;
          minY = initialY; maxY = initialY;
        }

        // 只有可拖拽场景才保留旧偏移。完整模式本身不支持拖动，
        // 如果继续沿用历史偏移，会在重新排版后把图片“带歪”，
        // 造成底部或侧边露白。
        const canReuseOffset = canvasRatio !== 'original' && imageRatio === 'fill';
        const oldOffset = canReuseOffset && this.data.imageTransforms ? this.data.imageTransforms[index] : null;
        currentX = oldOffset ? oldOffset.x : initialX;
        currentY = oldOffset ? oldOffset.y : initialY;

        // 严格限制在边界内
        currentX = Math.max(minX, Math.min(maxX, currentX));
        currentY = Math.max(minY, Math.min(maxY, currentY));
      }

      if (imageRatio === 'fill' && borderWidth === 0) {
        // 无边框时才做轻微超绘制，用来盖掉预览层亚像素白缝。
        // 有边框时如果继续超绘制，会把内部线条“吃薄”，导致四周外框显得更粗。
        const previewBleed = 1;
        scaledW += previewBleed;
        scaledH += previewBleed;
        currentX -= previewBleed / 2;
        currentY -= previewBleed / 2;
      }

      const style = this.buildPreviewImageStyle(currentX, currentY, scaledW, scaledH, info && info.rotate ? info.rotate : 0);
      // 使用伪元素边框，避免相邻图片边框叠加
      const containerStyle = `position: absolute; left: ${adjustedX}rpx; top: ${adjustedY}rpx; width: ${adjustedW}rpx; height: ${adjustedH}rpx; overflow: hidden; border-radius: ${this.data.borderRadius}rpx; background-color: ${borderWidth > 0 ? borderColor : 'transparent'}; --border-width: ${borderWidth > 0 ? borderWidth + 'rpx' : '0'}; --border-color: ${borderWidth > 0 ? borderColor : 'transparent'};`;
      
      transforms.push({
        width: scaledW,
        height: scaledH,
        x: currentX,
        y: currentY,
        minX, maxX, minY, maxY,
        container: { x: adjustedX, y: adjustedY, w: adjustedW, h: adjustedH },
        style,
        containerStyle
      });
    });

    const renderModel = buildPuzzleRenderModel({
      images,
      imageTransforms: transforms,
      texts: this.data.texts,
      canvasWidth: layout.canvasWidth,
      canvasHeight: layout.canvasHeight,
      borderWidth,
      borderColor,
      borderRadius: this.data.borderRadius,
      outerGap,
      innerGap,
      templateId: getTemplateId(images.length, this.data)
    });

    this.setData({ 
      canvasWidth: layout.canvasWidth,
      canvasHeight: layout.canvasHeight,
      imageTransforms: transforms,
      renderModel,
      activeTemplateId: renderModel.templateId,
      templateOptions: getTemplateOptions(images.length)
    });
  },

  // ========== 图片拖动功能 ==========
  onImageTouchStart(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.touchStartIndex = index;
    this.touchMovedAfterLongPress = false;
    this.dragStartX = e.touches[0].clientX;
    this.dragStartY = e.touches[0].clientY;

    // 只在非完整比例下允许拖动
    if (this.data.canvasRatio === 'original') return;
    
    this.dragIndex = index;
    
    // 获取当前偏移量作为基准
    const transform = this.data.imageTransforms[index];
    if (transform) {
      this.dragBaseX = transform.x;
      this.dragBaseY = transform.y;
    } else {
      this.dragBaseX = 0;
      this.dragBaseY = 0;
    }
  },

  onImageTouchMove(e) {
    if (this.data.isImageSorting) {
      this.onImageSortMove(e);
      return;
    }

    // 只在非完整比例下允许拖动
    if (this.data.canvasRatio === 'original' || this.dragIndex === undefined) return;
    
    // 计算从touchstart开始的总移动距离 (px)
    const moveX = e.touches[0].clientX - this.dragStartX;
    const moveY = e.touches[0].clientY - this.dragStartY;
    
    // 转换为 rpx
    const systemInfo = wx.getSystemInfoSync();
    const pxToRpx = 750 / systemInfo.windowWidth;
    const moveXRpx = moveX * pxToRpx;
    const moveYRpx = moveY * pxToRpx;
    
    const transform = this.data.imageTransforms[this.dragIndex];
    if (!transform) return;
    
    // 计算新的偏移量 = 基准偏移 + 本次移动距离
    let newX = this.dragBaseX + moveXRpx;
    let newY = this.dragBaseY + moveYRpx;
    
    // 严格限制在不漏出空白的边界内
    newX = Math.max(transform.minX, Math.min(transform.maxX, newX));
    newY = Math.max(transform.minY, Math.min(transform.maxY, newY));
    
    // 局部更新该图片的 transform 数据
    const keyX = `imageTransforms[${this.dragIndex}].x`;
    const keyY = `imageTransforms[${this.dragIndex}].y`;
    const keyStyle = `imageTransforms[${this.dragIndex}].style`;
    
    const info = this.data.imageInfos[this.dragIndex];
    const newStyle = this.buildPreviewImageStyle(newX, newY, transform.width, transform.height, info && info.rotate ? info.rotate : 0);
    
    this.setData({
      [keyX]: newX,
      [keyY]: newY,
      [keyStyle]: newStyle,
      [`renderModel.images[${this.dragIndex}].x`]: newX,
      [`renderModel.images[${this.dragIndex}].y`]: newY,
      [`renderModel.images[${this.dragIndex}].style`]: newStyle
    });
  },

  onImageTouchEnd(e) {
    if (this.data.isImageSorting) {
      this.onImageSortEnd();
      return;
    }

    this.dragIndex = undefined;
    this.dragBaseX = null;
    this.dragBaseY = null;
  },

  onImageLongPress(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (index < 0 || this.data.images.length < 2) return;

    this.dragIndex = undefined;
    this.dragBaseX = null;
    this.dragBaseY = null;
    this.suppressImageTap = true;
    this.setData({
      isImageSorting: true,
      dragFromIndex: index,
      dragOverIndex: index,
      selectedIndex: index,
      operationBarStyle: ''
    });
    this.cacheImageSlotRects();
    wx.vibrateShort({ type: 'light' });
  },

  cacheImageSlotRects() {
    wx.createSelectorQuery()
      .in(this)
      .selectAll('.draggable-image-container')
      .boundingClientRect((rects) => {
        this.imageSlotRects = rects || [];
      })
      .exec();
  },

  onImageSortMove(e) {
    if (!e.touches || !e.touches[0]) return;
    const touch = e.touches[0];
    const targetIndex = this.findImageSlotIndexByPoint(touch.clientX, touch.clientY);

    if (targetIndex < 0 || targetIndex === this.data.dragFromIndex) return;
    this.swapImages(this.data.dragFromIndex, targetIndex);
    this.setData({
      dragFromIndex: targetIndex,
      dragOverIndex: targetIndex,
      selectedIndex: targetIndex
    });
  },

  onImageSortEnd() {
    this.setData({
      isImageSorting: false,
      dragFromIndex: -1,
      dragOverIndex: -1
    }, () => {
      this.updateOperationBarPosition();
    });
    this.imageSlotRects = [];
    setTimeout(() => {
      this.suppressImageTap = false;
    }, 350);
  },

  findImageSlotIndexByPoint(x, y) {
    const rects = this.imageSlotRects || [];
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (!rect) continue;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return i;
      }
    }
    return -1;
  },

  swapImages(fromIndex, toIndex) {
    const images = [...this.data.images];
    const imageInfos = [...this.data.imageInfos];
    const imageTransforms = [...this.data.imageTransforms];

    [images[fromIndex], images[toIndex]] = [images[toIndex], images[fromIndex]];
    [imageInfos[fromIndex], imageInfos[toIndex]] = [imageInfos[toIndex], imageInfos[fromIndex]];
    [imageTransforms[fromIndex], imageTransforms[toIndex]] = [imageTransforms[toIndex], imageTransforms[fromIndex]];

    this.setData({
      images,
      imageInfos,
      imageTransforms
    }, () => {
      this.calculateImageTransforms();
    });
  },

  // 点击画布空白处，取消选中
  onCanvasBlankTap(e) {
    // 如果点击的是画布本身（不是图片），则取消选中
    if (e.target === e.currentTarget) {
      this.setData({
        selectedIndex: -1,
        operationBarStyle: ''
      });
    }
  },

  // 点击控制区域（阻止事件冒泡）
  onControlsAreaTap(e) {
    // 阻止事件冒泡，防止触发其他操作
    // 这个方法主要用于阻止事件传播
  },

  // 保存作品（别名，调用 onSave）
  saveWork() {
    this.onSave();
  },

  // 全部旋转
  rotateAll() {
    const { imageInfos } = this.data;
    if (imageInfos.length === 0) {
      wx.showToast({ title: '没有图片', icon: 'none' });
      return;
    }
    
    // 所有图片旋转90度
    imageInfos.forEach(info => {
      info.rotate = ((info.rotate || 0) + 90) % 360;
    });
    
    this.setData({ imageInfos }, () => {
      // 完整模式下需要重新计算布局
      if (this.data.canvasRatio === 'original') {
        const layout = this.calculateLayoutGeometry(702, this.getMaxCanvasHeight());
        this.setData({
          canvasWidth: layout.canvasWidth,
          canvasHeight: layout.canvasHeight
        }, () => {
          this.calculateImageTransforms();
        });
      } else {
        this.calculateImageTransforms();
      }
      wx.showToast({ title: '全部旋转', icon: 'success' });
    });
  },

  // 全部重置
  resetAll() {
    const { imageInfos } = this.data;
    if (imageInfos.length === 0) {
      wx.showToast({ title: '没有图片', icon: 'none' });
      return;
    }
    
    // 重置所有图片的旋转和缩放
    imageInfos.forEach(info => {
      info.rotate = 0;
      info.scale = 1;
    });
    
    this.setData({ 
      imageInfos,
      selectedIndex: -1,
      operationBarStyle: ''
    }, () => {
      // 完整模式下需要重新计算布局
      if (this.data.canvasRatio === 'original') {
        const layout = this.calculateLayoutGeometry(702, this.getMaxCanvasHeight());
        this.setData({
          canvasWidth: layout.canvasWidth,
          canvasHeight: layout.canvasHeight
        }, () => {
          this.calculateImageTransforms();
        });
      } else {
        this.calculateImageTransforms();
      }
      wx.showToast({ title: '全部重置', icon: 'success' });
    });
  },

  // 随机分布（随机打乱图片顺序）
  randomLayout() {
    const { images, imageInfos } = this.data;
    if (images.length < 2) {
      wx.showToast({ title: '至少需要2张图片', icon: 'none' });
      return;
    }
    
    // Fisher-Yates 洗牌算法
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
      [imageInfos[i], imageInfos[j]] = [imageInfos[j], imageInfos[i]];
    }
    
    this.setData({ images, imageInfos }, () => {
      this.calculateImageTransforms();
      wx.showToast({ title: '随机分布', icon: 'success' });
    });
  },

  // 随机图片（重新选择随机图片）
  shuffleImages() {
    const { images, imageInfos } = this.data;
    if (images.length <= 1) return;

    // 创建索引数组并打乱
    const indices = images.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // 根据打乱后的索引重新排列图片
    const shuffledImages = indices.map(i => images[i]);
    const shuffledInfos = indices.map(i => imageInfos[i]);

    this.setData({
      images: shuffledImages,
      imageInfos: shuffledInfos,
      selectedIndex: -1,
      operationBarStyle: ''
    }, () => {
      this.calculateImageTransforms();
      wx.showToast({ title: '已随机打乱', icon: 'success' });
    });
  },

  // 打开缩放弹窗
  openScalePopup() {
    const { selectedIndex, imageInfos } = this.data;
    if (selectedIndex === -1) return;

    const info = imageInfos[selectedIndex];
    this.setData({
      showScalePopup: true,
      popupImageScale: info.scale || 1
    });
  },

  // 关闭缩放弹窗
  closeScalePopup() {
    this.setData({
      showScalePopup: false
    });
  },

  // 弹窗缩放变化
  onPopupScaleChange(e) {
    const scale = e.detail.value;
    const { selectedIndex, imageInfos } = this.data;

    if (selectedIndex === -1) return;

    imageInfos[selectedIndex].scale = scale;

    this.setData({
      popupImageScale: scale,
      imageInfos
    }, () => {
      this.calculateImageTransforms();
    });
  },

  // ========== 文字功能（来自备份）==========
  onTextInput(e) {
    const activeIndex = this.data.activeTextIndex;
    if (activeIndex >= 0) {
      this.setData({ [`texts[${activeIndex}].content`]: e.detail.value });
    }
  },

  addNewText() {
    const newText = {
      content: '',
      size: 36,
      color: '#FFFFFF',
      x: 50,
      y: 88, // Start slightly lower maybe? Or same place
      bold: false,
      shadow: false,
      align: 'center',
      opacity: 100
    };
    // Adjust y to avoid complete overlap if there's already texts
    if (this.data.texts.length > 0) {
       const lastText = this.data.texts[this.data.texts.length - 1];
       newText.y = Math.min(95, lastText.y + 10);
    }
    
    this.setData({
      texts: [...this.data.texts, newText],
      activeTextIndex: this.data.texts.length
    });
  },

  setActiveText(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({
      activeTextIndex: index,
      currentTab: 'text' // Switch to text tab if clicked on text
    });
  },

  changeTextSize(e) {
    const activeIndex = this.data.activeTextIndex;
    if (activeIndex < 0) return;
    const delta = parseInt(e.currentTarget.dataset.delta) || 0;
    const current = this.data.texts[activeIndex].size;
    const next = Math.max(12, Math.min(120, current + delta));
    this.setData({ [`texts[${activeIndex}].size`]: next });
  },

  changeTextOpacity(e) {
    const activeIndex = this.data.activeTextIndex;
    if (activeIndex < 0) return;
    const delta = parseInt(e.currentTarget.dataset.delta) || 0;
    const current = this.data.texts[activeIndex].opacity;
    const next = Math.max(0, Math.min(100, current + delta));
    this.setData({ [`texts[${activeIndex}].opacity`]: next });
  },

  onTextOpacityChange(e) {
    const activeIndex = this.data.activeTextIndex;
    if (activeIndex >= 0) {
      this.setData({ [`texts[${activeIndex}].opacity`]: e.detail.value });
    }
  },

  onTextDragStart(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({
      activeTextIndex: index,
      currentTab: 'text'
    });
    this.textDragStartX = e.touches[0].clientX;
    this.textDragStartY = e.touches[0].clientY;
    this.textDragStartPctX = this.data.texts[index].x;
    this.textDragStartPctY = this.data.texts[index].y;
    this.textDragIndex = index;
  },

  onTextDragMove(e) {
    if (this.textDragIndex === undefined || this.textDragIndex < 0) return;
    const index = this.textDragIndex;
    const canvasWidth = this.data.canvasWidth;
    const canvasHeight = this.data.canvasHeight;

    // 计算移动距离（px）
    const deltaX = e.touches[0].clientX - this.textDragStartX;
    const deltaY = e.touches[0].clientY - this.textDragStartY;

    // 转换为百分比（基于画布尺寸）
    const systemInfo = wx.getSystemInfoSync();
    const pxToRpx = 750 / systemInfo.windowWidth;
    const deltaXRpx = deltaX * pxToRpx;
    const deltaYRpx = deltaY * pxToRpx;

    const deltaXPct = (deltaXRpx / canvasWidth) * 100;
    const deltaYPct = (deltaYRpx / canvasHeight) * 100;

    let newX = this.textDragStartPctX + deltaXPct;
    let newY = this.textDragStartPctY + deltaYPct;

    // 允许文字拖到图片外，给画布外围保留一圈可编辑缓冲区。
    newX = Math.max(-80, Math.min(180, newX));
    newY = Math.max(-80, Math.min(180, newY));

    this.setData({
      [`texts[${index}].x`]: newX,
      [`texts[${index}].y`]: newY
    });
  },

  onTextDragEnd() {
    this.textDragIndex = undefined;
  },

  selectTextColor(e) {
    const activeIndex = this.data.activeTextIndex;
    if (activeIndex >= 0) {
      this.setData({ [`texts[${activeIndex}].color`]: e.currentTarget.dataset.color });
    }
  },

  toggleTextBold() {
    const activeIndex = this.data.activeTextIndex;
    if (activeIndex >= 0) {
      this.setData({ [`texts[${activeIndex}].bold`]: !this.data.texts[activeIndex].bold });
    }
  },

  toggleTextShadow() {
    const activeIndex = this.data.activeTextIndex;
    if (activeIndex >= 0) {
      this.setData({ [`texts[${activeIndex}].shadow`]: !this.data.texts[activeIndex].shadow });
    }
  },

  // 保存图片
  onSave() {
    const { images } = this.data;
    
    if (images.length === 0) {
      wx.showToast({
        title: '请先添加图片',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '生成中...' });
    
    // 使用 canvas 绘制最终图片
    this.drawFinalImage().then(() => {
      wx.canvasToTempFilePath({
        x: 0,
        y: 0,
        width: this.data.canvasWidth,
        height: this.data.canvasHeight,
        destWidth: this.data.canvasWidth * 2, // 提高导出图片的清晰度
        destHeight: this.data.canvasHeight * 2,
        canvasId: 'puzzleCanvas',
        success: (res) => {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              });
            },
            fail: (err) => {
              console.error('saveImageToPhotosAlbum fail:', err);
              wx.hideLoading();
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              });
            }
          });
        },
        fail: (err) => {
          console.error('canvasToTempFilePath fail:', err);
          wx.hideLoading();
          wx.showToast({
            title: '生成失败',
            icon: 'none'
          });
        }
      });
    }).catch(err => {
      console.error('drawFinalImage fail:', err);
      wx.hideLoading();
      wx.showToast({
        title: '绘制失败',
        icon: 'none'
      });
    });
  },

  // 绘制最终图片
  drawFinalImage() {
    return new Promise((resolve) => {
      const { canvasWidth, canvasHeight, borderWidth, borderRadius, imageInfos, renderModel } = this.data;
      const ctx = wx.createCanvasContext('puzzleCanvas');
      const renderedImages = renderModel && renderModel.images ? renderModel.images : [];
      const exportBackground = renderModel && renderModel.canvas ? renderModel.canvas.exportBackground : 'transparent';
      
      // 填充背景 - 只有当有边框时，才填充背景色，否则透明
    if (borderWidth > 0) {
      ctx.fillStyle = exportBackground;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
      
      // 遍历所有计算好的图片容器信息进行绘制
      renderedImages.forEach((transform, index) => {
        if (!transform) return;
        
        const c = transform.container;
        const info = imageInfos[index];
        const img = transform.src;
        
        // 统一使用 clip() 将图片限制在容器内，并按照缩放宽高和偏移量绘制
        ctx.save();
        ctx.beginPath();
        
        // 绘制圆角矩形路径用于剪切
        if (borderRadius > 0) {
          // 确保圆角不超过宽高的一半
          const r = Math.min(borderRadius, c.w / 2, c.h / 2);
          ctx.moveTo(c.x + r, c.y);
          ctx.lineTo(c.x + c.w - r, c.y);
          ctx.arc(c.x + c.w - r, c.y + r, r, 1.5 * Math.PI, 0);
          ctx.lineTo(c.x + c.w, c.y + c.h - r);
          ctx.arc(c.x + c.w - r, c.y + c.h - r, r, 0, 0.5 * Math.PI);
          ctx.lineTo(c.x + r, c.y + c.h);
          ctx.arc(c.x + r, c.y + c.h - r, r, 0.5 * Math.PI, Math.PI);
          ctx.lineTo(c.x, c.y + r);
          ctx.arc(c.x + r, c.y + r, r, Math.PI, 1.5 * Math.PI);
          ctx.closePath();
        } else {
          // 为了防止无边框时的抗锯齿白边，将绘制区域向外扩展 0.5px
          // 注意：仅当 borderRadius === 0 且 borderWidth === 0 时才需要这样做
          // 我们在 calculateImageTransforms 已经将 c 调整过了（+1宽高，-0.5位置），
          // 所以这里直接使用调整后的 c.x, c.y, c.w, c.h
          // 修正最右侧/最底侧图片被截断的问题：如果有右边距超出了画布，稍微缩回
          let drawW = c.w;
          let drawH = c.h;
          let drawX = c.x;
          let drawY = c.y;
          if (borderWidth === 0) {
            // 如果绘制的右边界超过了画布的宽度（通常是因为扩大的抗锯齿重叠）
            if (drawX + drawW > canvasWidth) {
               drawW = canvasWidth - drawX;
            }
            if (drawY + drawH > canvasHeight) {
               drawH = canvasHeight - drawY;
            }
          }
          ctx.rect(drawX, drawY, drawW, drawH);
        }
        
        ctx.clip();
        
        // 处理旋转和位移
        const centerX = c.x + transform.x + transform.width / 2;
        const centerY = c.y + transform.y + transform.height / 2;
        
        ctx.translate(centerX, centerY);
        if (info && info.rotate) {
          ctx.rotate(info.rotate * Math.PI / 180);
        }
        
        // 为了防止图片边缘的抗锯齿透明度导致的白线，在图片绘制时稍微放大一点点(仅限无边框)
        // 这是常见的 canvas 缝隙处理技巧
        const drawScale = borderWidth === 0 ? 1.01 : 1.0;
        const drawImgW = transform.width * drawScale;
        const drawImgH = transform.height * drawScale;
        
        // 绘制图片（居中绘制）
        ctx.drawImage(img, -drawImgW / 2, -drawImgH / 2, drawImgW, drawImgH);
        
        ctx.restore();
      });

      // 绘制文字
      this.data.texts.forEach(textConfig => {
        if (textConfig.content) {
          ctx.save();
          const x = canvasWidth * (textConfig.x / 100);
          const y = canvasHeight * (textConfig.y / 100);
          
          // 在 wxml 中 font-size 单位是 rpx。在 canvas 绘制时，需要将其转换为 px。
          // canvasWidth 是 px，它对应的满宽是 maxWidth（约 700rpx）。
          // 所以 1rpx = canvasWidth / 700。
          // 由于前面的代码使用 this._maxCanvasWidth (它是以 rpx 为基础的最大允许像素宽度，其实它就是用 rpx 算出来的 px 值)
          // 更准确的 rpx 到 px 转换率是：
          const systemInfo = wx.getSystemInfoSync();
          const rpxToPx = systemInfo.windowWidth / 750;
          // 但由于画布可能经过了 scale 缩放，我们需要使用画布当前宽度对应的缩放比：
          // 原本 maxWidth 在 rpx 下大概是 700rpx，
          // 所以 textConfig.size (rpx) 对应到当前 canvas 的实际像素大小应该是：
          // (textConfig.size / 700) * canvasWidth
          // 为了简单和一致，我们使用相对于画布宽度的比例来计算实际像素字号。
          // 假设 750rpx 对应屏幕全宽，而 textConfig.size 是基于 750rpx 设计的。
          // 我们的画布如果满宽是 700rpx，那么对应的 px 就是 canvasWidth。
          // 所以 1rpx = canvasWidth / 700 (或者使用 750，视设计而定，通常使用 750)
          const fontSizePx = (textConfig.size / 750) * systemInfo.windowWidth;
          // 但是！画布本身是缩放的，上面的 canvasWidth 是缩放后的，
          // 而 wxml 里的 font-size: {{item.size}}rpx 是随屏幕的。
          // wxml 里的文字没有随画布等比缩放！这是一个关键点。
          // wxml 里：font-size: 36rpx 就是真实的 36rpx。
          // 而生成的图片尺寸是 canvasWidth x canvasHeight。
          // 如果我们要让生成的图片上的字号和界面上看起来一样，我们需要知道界面上 canvas 的实际渲染宽度。
          // 由于拼图的 canvas 可能会为了适应高度而缩小 (scale < 1)，
          // wxml 中的文字因为是绝对定位，它没有跟着画布缩小！
          // 这就是产生偏差的根本原因。
          // 为了在生成的图片中保持一致的比例，我们需要将文字大小映射到 canvas 坐标系。
          // 界面上：Canvas 的 CSS 宽是 `this.data.canvasWidth` rpx
          // 文字的 CSS 大小是 `textConfig.size` rpx。
          // 那么文字大小相对于画布宽度的比例是：textConfig.size / this.data.canvasWidth
          // 在真正的 canvas 像素坐标系中，画布宽度是 canvasWidth 像素。
          // 所以真实的绘制字号（像素）应该是：
          const realFontSizePx = (textConfig.size / this.data.canvasWidth) * canvasWidth;
          
          ctx.font = `${textConfig.bold ? 'bold ' : ''}${realFontSizePx}px sans-serif`;
          ctx.fillStyle = textConfig.color;
          ctx.globalAlpha = textConfig.opacity / 100;
          ctx.textAlign = textConfig.align;
          ctx.textBaseline = 'middle';

          if (textConfig.shadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowOffsetY = 2;
            ctx.shadowBlur = 8;
          }

          // 处理换行
          const lines = textConfig.content.split('\n');
          const lineHeight = realFontSizePx * 1.35;
          const totalHeight = lineHeight * lines.length;
          // Canvas 中 textBaseline = 'middle' 是指这行字的中心。
          // 多行文字的中心在 y 处，那么第一行的中心点计算：
          const startY = y - (totalHeight / 2) + (lineHeight / 2);

          lines.forEach((line, i) => {
            ctx.fillText(line, x, startY + i * lineHeight);
          });
          
          ctx.restore();
        }
      });
      
      ctx.draw(false, () => {
        resolve();
      });
    });
  }
});
