const { checkImageSize } = require('../../utils/util.js');
const NSFW = require('../../utils/nsfw.js');
const ContentSecurity = require('../../utils/content-security.js');

const RANDOM_QUOTES = [
  "生活就像一盒巧克力，你永远不知道下一颗是什么味道。",
  "以前我以为，最糟糕的事就是孤独终老。其实不是，最糟糕的是与那些让你感到孤独的人一起终老。",
  "如果再也不能见到你，祝你早安，午安，晚安。",
  "有些人浅薄，有些人金玉其外而败絮其中。",
  "有一天你会遇到一个彩虹般绚丽的人，从此以后，其他人不过就是匆匆浮云。",
  "我手上一无所有，只有为了生活而流下的汗水。",
  "我们要学会珍惜我们生活的每一天。",
  "记住，希望是美好的，也许是人间至善，而美好的事物永不消逝。",
  "生活不是电影，生活比电影苦多了。",
  "每天早上醒来，我都会问自己，如果今天是我生命中的最后一天，我还会做我今天打算做的事情吗？",
  "人总是在接近幸福时倍感幸福，在幸福进行时却患得患失。",
  "我猜人生到头来就是不断地放下，但遗憾的是，我们却来不及好好道别。",
  "不管你做什么，都要做到极致。",
  "只要你一直走，总有一天会走到想去的地方。",
  "我不后悔我做过的事，我后悔的只是有些事我有机会做的时候，我没有做。",
  "只要活着，就一定会有好事发生。",
  "世界上最远的距离，不是生与死，而是我就站在你面前，你却不知道我爱你。"
];

Page({
  data: {
    hasStarted: false, // 是否已开始体验
    images: [], // { path, width, height, cropY: 0, cropHeight: 100, text: '' }
    generating: false,

    // Modal State
    showModal: false,
    editingIndex: -1,
    editingImage: null,

    // Touch State
    touchStartY: 0,
    touchStartCropY: 0,
    touchStartCropHeight: 0,
    touchMode: null, // 'top', 'bottom', 'content'
    
    // Border State
    borderWidth: 0,
    borderColor: '#ffffff'
  },

  setBorderWidth(e) {
    this.setData({ borderWidth: parseInt(e.currentTarget.dataset.val) });
  },

  setBorderColor(e) {
    this.setData({ borderColor: e.currentTarget.dataset.val });
  },

  onLoad(options) {
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel && typeof eventChannel.on === 'function') {
      eventChannel.on('acceptDataFromOpenerPage', async (data) => {
        if (data.images) {
          if (!data.prechecked) {
            const isSafe = await NSFW.checkImagesAndAlert(data.images);
            if (!isSafe) return;
          }
          this.addImages(data.images);
        }
      });
    }
  },

  // 开始体验 - 点击立即体验按钮
  startExperience() {
    wx.chooseImage({
      count: 9,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        if (!checkImageSize(res.tempFiles)) return;
        const isSafe = await NSFW.checkImagesAndAlert(res.tempFilePaths);
        if (!isSafe) return;
        this.setData({ hasStarted: true });
        this.addImages(res.tempFilePaths);
      }
    });
  },

  chooseImages() {
    wx.chooseImage({
      count: 9,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        if (!checkImageSize(res.tempFiles)) return;
        const isSafe = await NSFW.checkImagesAndAlert(res.tempFilePaths);
        if (!isSafe) return;
        this.addImages(res.tempFilePaths);
      }
    });
  },

  async addImages(paths) {
    const startIdx = this.data.images.length;
    const newImages = [];
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      try {
        const info = await new Promise((resolve, reject) => {
          wx.getImageInfo({
            src: path,
            success: resolve,
            fail: reject
          });
        });
        
        const isFirst = (startIdx + i) === 0;
        
        newImages.push({
          path,
          width: info.width,
          height: info.height,
          // First image full (0-100), others bottom part (75-100)
        cropY: isFirst ? 0 : 75,
        cropHeight: isFirst ? 100 : 25,
        text: RANDOM_QUOTES[Math.floor(Math.random() * RANDOM_QUOTES.length)]
      });
      } catch (e) {
        console.error('Get image info failed', e);
      }
    }

    this.setData({
      images: [...this.data.images, ...newImages]
    });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(idx, 1);
    this.setData({ images });
    this.closeEditModal(); // Close if deleting current image (though usually delete is in list, modal might not support delete)
  },

  // Modal Handlers
  openEditModal(e) {
    const idx = e.currentTarget.dataset.index;
    const img = this.data.images[idx];
    
    this.setData({
      showModal: true,
      editingIndex: idx,
      editingImage: { ...img } // Deep copy? Shallow is fine for primitives, path is immutable string
    });
  },

  closeEditModal() {
    this.setData({
      showModal: false,
      editingIndex: -1,
      editingImage: null
    });
  },

  // Touch Interaction
  onTouchStart(e) {
    if (e.touches.length !== 1) return; // Only support single touch for now with handles

    const type = e.currentTarget.dataset.type || e.target.dataset.type || 'content';
    this.setData({
      touchMode: type,
      touchStartY: e.touches[0].clientY,
      touchStartCropY: this.data.editingImage.cropY,
      touchStartCropHeight: this.data.editingImage.cropHeight
    });
  },

  onTouchMove(e) {
    if (!this.data.editingImage || e.touches.length !== 1) return;

    const query = wx.createSelectorQuery();
    query.select('.image-preview-wrapper').boundingClientRect((rect) => {
      if (!rect) return;
      
      const deltaY = e.touches[0].clientY - this.data.touchStartY;
      const percentDelta = (deltaY / rect.height) * 100;
      const mode = this.data.touchMode;
      const { touchStartCropY, touchStartCropHeight } = this.data;
      
      let newCropY = touchStartCropY;
      let newCropHeight = touchStartCropHeight;

      if (mode === 'content') {
        // Drag content -> Move cropY (Normal direction: Drag Down = Move Viewport Down = Increase CropY)
        newCropY = touchStartCropY + percentDelta;
      } else if (mode === 'top') {
        // Drag Top Handle -> Change CropY and Height
        // Drag Down (+Y) -> Increase CropY, Decrease Height (Bottom stays fixed)
        newCropY = touchStartCropY + percentDelta;
        newCropHeight = touchStartCropHeight - percentDelta;
      } else if (mode === 'bottom') {
        // Drag Bottom Handle -> Change Height only
        // Drag Down (+Y) -> Increase Height
        newCropHeight = touchStartCropHeight + percentDelta;
      }

      // Constraints
      // Min Height 5%
      if (newCropHeight < 5) {
        if (mode === 'top') {
           newCropY = touchStartCropY + (touchStartCropHeight - 5);
        }
        newCropHeight = 5;
      }
      // Max Height 100%
      if (newCropHeight > 100) newCropHeight = 100;

      // CropY Bounds [0, 100 - Height]
      if (newCropY < 0) newCropY = 0;
      if (newCropY + newCropHeight > 100) {
        if (mode === 'content') {
           newCropY = 100 - newCropHeight;
        } else if (mode === 'bottom') {
           newCropHeight = 100 - newCropY;
        } else if (mode === 'top') {
           // If hitting bottom, stop? Or push?
           // Usually top handle shouldn't go below bottom.
           // Already handled by min-height.
           // If top handle goes above 0?
           // newCropY < 0 handled.
        }
      }

      this.setData({
        'editingImage.cropY': newCropY,
        'editingImage.cropHeight': newCropHeight
      });

    }).exec();
  },

  // Toolbar Actions
  replaceImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        if (!checkImageSize(res.tempFiles)) return;
        const path = res.tempFilePaths[0];
        const isSafe = await NSFW.checkAndAlert(path, true);
        if (!isSafe) return;
        const info = await wx.getImageInfo({ src: path });
        
        this.setData({
          'editingImage.path': path,
          'editingImage.width': info.width,
          'editingImage.height': info.height
        });
      }
    });
  },

  addImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        if (!checkImageSize(res.tempFiles)) return;
        const path = res.tempFilePaths[0];
        const isSafe = await NSFW.checkAndAlert(path, true);
        if (!isSafe) return;
        const info = await wx.getImageInfo({ src: path });
        
        const newImg = {
          path,
          width: info.width,
          height: info.height,
          cropY: 75,
          cropHeight: 25,
          text: RANDOM_QUOTES[Math.floor(Math.random() * RANDOM_QUOTES.length)]
        };

        const images = [...this.data.images];
        // Insert after current editing index
        images.splice(this.data.editingIndex + 1, 0, newImg);
        
        this.setData({ 
          images,
          showModal: false,
          editingIndex: -1,
          editingImage: null
        });
        
        wx.showToast({ title: '已新增', icon: 'success' });
      }
    });
  },

  onHandleTouchStart(e) {
    // Just a proxy to block bubbling if needed, or pass through
    // But we need to capture the type.
    // bindtouchstart on wrapper captures bubbling.
    // But catchtouchstart on handle stops bubbling?
    // We want onTouchStart to run.
    // So handle should bindtouchstart?
    // Actually, if I use bindtouchstart on handle, it bubbles to wrapper.
    // Wrapper sees target.dataset.type = 'top'/'bottom'.
    // So wrapper's handler is enough?
    // Yes, as long as events bubble.
    // Wait, I used `catchtouchstart` in wxml for handles.
    // This STOPS bubbling.
    // So wrapper won't see it.
    // I should call onTouchStart directly from handles too.
    this.onTouchStart(e);
  },

  onTouchEnd(e) {
    // Reset or cleanup if needed
  },

  onEditCropYChange(e) {
    let val = e.detail.value;
    const img = this.data.editingImage;
    
    // Constraint: cropY + cropHeight <= 100
    if (val + img.cropHeight > 100) {
       val = 100 - img.cropHeight;
    }
    
    this.setData({
      'editingImage.cropY': val
    });
  },

  onEditCropHeightChange(e) {
    let val = e.detail.value;
    const img = this.data.editingImage;
    
    // Constraint: cropY + cropHeight <= 100
    if (img.cropY + val > 100) {
       val = 100 - img.cropY;
    }
    
    this.setData({
      'editingImage.cropHeight': val
    });
  },

  onEditTextInput(e) {
    const val = e.detail.value;
    this.setData({
      'editingImage.text': val
    });
  },

  randomEditSubtitle() {
    const randomIdx = Math.floor(Math.random() * RANDOM_QUOTES.length);
    this.setData({
      'editingImage.text': RANDOM_QUOTES[randomIdx]
    });
  },

  confirmEdit() {
    if (this.data.editingIndex === -1) return;
    
    const key = `images[${this.data.editingIndex}]`;
    this.setData({
      [key]: this.data.editingImage
    });
    
    this.closeEditModal();
  },

  deleteCurrentEditingImage() {
    if (this.data.editingIndex === -1) return;
    
    const images = [...this.data.images];
    images.splice(this.data.editingIndex, 1);
    
    this.setData({
      images,
      showModal: false,
      editingIndex: -1,
      editingImage: null
    });
  },

  async generate() {
    if (this.data.images.length === 0) {
      wx.showToast({ title: '请先添加图片', icon: 'none' });
      return;
    }

    // 内容安全：生成前检测所有台词文字
    const textList = (this.data.images || [])
      .filter((item) => item && item.text)
      .map((item) => item.text);
    const textPassed = await ContentSecurity.checkTextsAndAlert(textList);
    if (!textPassed) return;

    this.setData({ generating: true });
    wx.showLoading({ title: '生成中...' });

    const query = wx.createSelectorQuery();
    query.select('#canvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) {
        wx.hideLoading();
        this.setData({ generating: false });
        return;
      }

      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;

      // Base width for calculation (standardizing)
      const baseWidth = 1080; 
      
      // Calculate total height
      let totalHeight = 0;
      const borderCanvasHeight = Math.floor(this.data.borderWidth * (baseWidth / 750));
      
      const drawData = this.data.images.map((img, index) => {
        // Calculate crop pixels
        const cropY = (img.cropY / 100) * img.height;
        const cropH = (img.cropHeight / 100) * img.height;
        
        // Output height based on baseWidth
        // Aspect ratio of the cropped part
        const aspect = img.width / cropH;
        const outH = baseWidth / aspect;
        
        const isLast = index === this.data.images.length - 1;
        totalHeight += outH + (isLast ? 0 : borderCanvasHeight);
        
        return {
          img,
          cropY,
          cropH,
          outH
        };
      });

      canvas.width = baseWidth;
      canvas.height = totalHeight;
      // Do not scale by dpr to prevent native buffer size limit error
      // ctx.scale(dpr, dpr);

      ctx.fillStyle = this.data.borderColor;
      ctx.fillRect(0, 0, baseWidth, totalHeight);

      let currentY = 0;
      
      // Helper to load image
      const loadImage = (src) => {
        return new Promise((resolve, reject) => {
          const img = canvas.createImage();
          img.src = src;
          img.onload = () => resolve(img);
          img.onerror = reject;
        });
      };

      // Draw loop
      const drawSteps = async () => {
        for (let i = 0; i < drawData.length; i++) {
          const data = drawData[i];
          const imgObj = await loadImage(data.img.path);
          
          // Draw Image Part
          // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
          ctx.drawImage(
            imgObj, 
            0, data.cropY, data.img.width, data.cropH, 
            0, currentY, baseWidth, data.outH
          );

          // Draw Text
          if (data.img.text) {
            let fontSize = 40;
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            // Text Shadow/Stroke
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillStyle = '#ffffff';

            const text = data.img.text;
            const maxWidth = baseWidth - 80;

            // Auto-scale font size to fit width
            while (ctx.measureText(text).width > maxWidth && fontSize > 20) {
              fontSize -= 2;
              ctx.font = `bold ${fontSize}px sans-serif`;
            }
            
            ctx.strokeText(text, baseWidth / 2, currentY + data.outH - 20);
            ctx.fillText(text, baseWidth / 2, currentY + data.outH - 20);
          }

          currentY += data.outH + borderCanvasHeight;
        }
      };

      drawSteps().then(() => {
        wx.canvasToTempFilePath({
          canvas,
          success: (res) => {
            wx.hideLoading();
            this.setData({ generating: false });
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
              fail: () => wx.previewImage({ urls: [res.tempFilePath] })
            });
          },
          fail: (err) => {
            console.error(err);
            wx.hideLoading();
            this.setData({ generating: false });
            wx.showToast({ title: '生成失败', icon: 'none' });
          }
        });
      }).catch(err => {
        console.error(err);
        wx.hideLoading();
        this.setData({ generating: false });
      });

    });
  }
});
