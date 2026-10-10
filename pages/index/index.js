// 首页逻辑
const { request, BASE_URL } = require('../../utils/request');
const { checkImageSize } = require('../../utils/util.js');
const NSFW = require('../../utils/nsfw.js');
const Privacy = require('../../utils/privacy.js');

Page({
  data: {
    isLogin: false,
    banners: [],
    baseUrl: BASE_URL,

    // Header State
    navHeight: 0,
    statusBarHeight: 0,

    // Puzzle State
    puzzleImages: [],
    selectedTemplateIdx: 0,
    gridTemplates: [],
    selectedLayoutType: 'horizontal', // 'horizontal', 'vertical', 'grid'

    // Quick Cut State
    quickCutImages: [],

    hero: {
      cover: '/images/home/hero.jpg'
    },
    primaryCards: [
      {
        id: 'grid_puzzle',
        title: '宫格拼图',
        subtitle: '将图片拼接在一起',
        image: '/images/home/card-main.jpg',
        action: 'startQuickPuzzle'
      },
      {
        id: 'id_photo',
        title: '拍证件照',
        subtitle: '在家拍出美丽照',
        image: '/images/home/card-id-real.jpg',
        action: 'goToExamRegistration'
      },
      {
        id: 'remove_bg',
        title: '抠人换背景',
        subtitle: '一键抠图换背景',
        image: '/images/home/card-bg-real.jpg',
        action: 'goToImageEditor'
      }
    ],
    toolGrid: [
      { id: 'long_puzzle', title: '长图拼接', icon: '/images/icon/stitch-line.svg', action: 'goToLongPuzzle' },
      { id: 'chat_puzzle', title: '电影感拼图', icon: '/images/icon/messages-line.svg', action: 'goToChatPuzzle' },
      { id: 'grid_cut', title: '切多宫格图', icon: '/images/icon/layout-grid-line.svg', action: 'goToGridCut' },
      { id: 'anti_fold', title: '朋友圈防折叠', icon: '/images/icon/moments-shield-line.svg', action: 'goToAntiFold' },
      { id: 'image_watermark', title: '图片水印', icon: '/images/icon/加字.svg', action: 'goToImageEdit' },
      { id: 'hide_image', title: '图片裁剪', icon: '/images/icon/crop-line.svg', action: 'goToImageCrop' },
      { id: 'image_compress', title: '图片压缩', icon: '/images/icon/compress-line.svg', action: 'goToImageCompress' },
      { id: 'format_convert', title: '格式转换', icon: '/images/icon/transform-line.svg', action: 'goToImageConvert' }
    ],
    topicCards: [
      { id: 'id_watermark', title: '证件加防伪', subtitle: '身份证/驾驶证安全加水印', action: 'goToIdWatermark', theme: 'blue' },
      { id: 'photo_topic', title: '拍出美丽证件照', subtitle: '在家拍出美丽证件照', action: 'goToExamRegistration', theme: 'mint' },
      { id: 'edit_topic', title: '图片编辑', subtitle: '加字加贴纸轻松完成', action: 'goToImageEdit', theme: 'purple' },
      { id: 'puzzle_topic', title: '拼出美好生活', subtitle: '多图排版一键完成', action: 'startQuickPuzzle', theme: 'pink' }
    ],
    showPuzzleSourceSheet: false
  },

  // 页面加载
  onLoad: function (options) {
    this.calculateNavHeight();
    this.checkLoginStatus();
    const cachedBanners = wx.getStorageSync('index_banners') || [];
    if (cachedBanners.length > 0) {
      this.setData({
        banners: cachedBanners
      });
    }
    // Initialize empty templates
    this.updateTemplates(0);
  },

  calculateNavHeight() {
    const systemInfo = wx.getSystemInfoSync();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    
    // Status bar height
    const statusBarHeight = systemInfo.statusBarHeight;
    
    // Navigation bar height (Menu button top - Status bar height) * 2 + Menu button height
    // This gives us the content height of the nav bar (excluding status bar)
    const navContentHeight = (menuButtonInfo.top - statusBarHeight) * 2 + menuButtonInfo.height;
    
    // Total Nav Height
    const totalNavHeight = statusBarHeight + navContentHeight;

    this.setData({
      statusBarHeight: statusBarHeight,
      navHeight: totalNavHeight,
      navContentHeight: navContentHeight
    });
  },

  // 页面显示
  onShow: function () {
    this.checkLoginStatus();
    this.getBanners();
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const isLogin = wx.getStorageSync('isLogin') || false;
    this.setData({
      isLogin: isLogin
    });
  },

  // Puzzle Logic
  choosePuzzleImages() {
    const count = 9 - this.data.puzzleImages.length;
    if (count <= 0) {
      wx.showToast({ title: '最多支持9张图片', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: count,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        if (!checkImageSize(res.tempFiles)) return;

        const isSafe = await NSFW.checkImagesAndAlert(res.tempFilePaths);
        if (!isSafe) return;

        const newImages = [...this.data.puzzleImages, ...res.tempFilePaths];
        this.setData({ puzzleImages: newImages });
        this.updateTemplates(newImages.length);
      },
      fail: (err) => {
        Privacy.handlePrivacyError(err);
      }
    });
  },

  removePuzzleImage(e) {
    const index = e.currentTarget.dataset.index;
    const newImages = [...this.data.puzzleImages];
    newImages.splice(index, 1);
    this.setData({ puzzleImages: newImages });
    this.updateTemplates(newImages.length);
  },

  updateTemplates(count) {
    if (count === 0) {
      this.setData({ gridTemplates: [] });
      return;
    }

    const templates = [];
    
    // 1. Horizontal (All in one row)
    const horizontalSlots = [];
    const w = 100 / count;
    for (let i = 0; i < count; i++) {
      horizontalSlots.push({ x: i * w, y: 0, w: w, h: 100 });
    }
    templates.push({ name: '横向拼接', type: 'horizontal', slots: horizontalSlots });

    // 2. Vertical (All in one column)
    const verticalSlots = [];
    const h = 100 / count;
    for (let i = 0; i < count; i++) {
      verticalSlots.push({ x: 0, y: i * h, w: 100, h: h });
    }
    templates.push({ name: '垂直拼接', type: 'vertical', slots: verticalSlots });

    // 3. Grid (Square-ish)
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const gridSlots = [];
    const cellW = 100 / cols;
    const cellH = 100 / rows;
    
    // Simple grid fill
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      gridSlots.push({ 
        x: col * cellW, 
        y: row * cellH, 
        w: cellW, 
        h: cellH 
      });
    }
    
    // Adjust last row if not full? For now simple grid.
    // If we have 3 images, 2x2 grid -> 2 in row 1, 1 in row 2.
    // For "Square Grid", we might want to fill the space. 
    // Let's stick to simple grid logic for now as requested "Multi-grid Square".
    templates.push({ name: '多宫格', type: 'grid', slots: gridSlots });

    this.setData({ gridTemplates: templates });
    
    // Persist selection type
    const currentType = this.data.selectedLayoutType;
    const foundIndex = templates.findIndex(t => t.type === currentType);
    
    if (foundIndex !== -1) {
      this.setData({ selectedTemplateIdx: foundIndex });
    } else {
      // Default to horizontal if not found (shouldn't happen with these 3 fixed types)
      this.setData({ selectedTemplateIdx: 0, selectedLayoutType: 'horizontal' });
    }
  },

  selectTemplate(e) {
    const idx = e.currentTarget.dataset.index;
    const template = this.data.gridTemplates[idx];
    this.setData({ 
      selectedTemplateIdx: idx,
      selectedLayoutType: template.type 
    });
  },

  // Save Puzzle Result
  savePuzzle() {
    if (this.data.puzzleImages.length === 0) return;
    
    wx.showLoading({ title: '生成中...' });
    
    // We need to use canvas to draw. 
    // Since we are on index page, we need an offscreen canvas in wxml.
    const query = wx.createSelectorQuery();
    query.select('#homePuzzleCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
          wx.hideLoading();
          return;
        }
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        // Output size (High Res)
        const baseSize = 1080;
        let width = baseSize;
        let height = baseSize;
        
        // Adjust canvas size based on template type?
        // For horizontal/vertical, we might want different aspect ratios.
        // For simplicity, let's keep it square or adapt slightly?
        // User didn't specify ratio control on home page, so let's try to fit content.
        
        // Actually, for "Horizontal", we probably want wide. For "Vertical", tall.
        // Let's adapt canvas size to the template logic.
        // But the preview is square-ish.
        // Let's use a dynamic aspect ratio for the output.
        
        const template = this.data.gridTemplates[this.data.selectedTemplateIdx];
        
        // Calculate ideal ratio based on images? 
        // For V1, let's stick to 1:1 canvas for Grid, and dynamic for Stitch?
        // "Horizontal Stitching" usually implies keeping image ratios.
        // But the requirement says "Templates... Horizontal Stitching".
        // In the previous `pintu` logic, we drew into slots.
        
        // Let's assume standard 1:1 output for "Grid" mode, 
        // but for "Horizontal/Vertical", maybe we should just use the 1:1 container logic for now 
        // to keep it simple and consistent with the preview.
        // Or better:
        if (template.type === 'horizontal') {
           height = baseSize / this.data.puzzleImages.length; // Example: 3 images -> 3:1 ratio? No, 1080x(1080/3)
           // Actually if we want to show full images, we need their ratios.
           // Without image metadata loaded, we assume square slots.
           // Let's stick to a fixed canvas size (e.g. 1080x1080) and fit images into the defined slots.
           // This matches the "Preview" which is likely a square container.
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        const drawPromises = template.slots.map((slot, idx) => {
          const imgPath = this.data.puzzleImages[idx];
          if (!imgPath) return Promise.resolve();
          
          return new Promise((resolveImg) => {
            const img = canvas.createImage();
            img.src = imgPath;
            img.onload = () => {
              const dx = (slot.x / 100) * width;
              const dy = (slot.y / 100) * height;
              const dw = (slot.w / 100) * width;
              const dh = (slot.h / 100) * height;
              
              // Aspect Fill
              const imgRatio = img.width / img.height;
              const areaRatio = dw / dh;
              let sx, sy, sw, sh;
              
              if (imgRatio > areaRatio) {
                sh = img.height;
                sw = sh * areaRatio;
                sy = 0;
                sx = (img.width - sw) / 2;
              } else {
                sw = img.width;
                sh = sw / areaRatio;
                sx = 0;
                sy = (img.height - sh) / 2;
              }
              
              ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
              resolveImg();
            };
            img.onerror = resolveImg;
          });
        });
        
        Promise.all(drawPromises).then(() => {
          wx.canvasToTempFilePath({
            canvas,
            success: (res) => {
              wx.hideLoading();
              wx.saveImageToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => wx.showToast({ title: '保存成功', icon: 'success' }),
                fail: () => wx.previewImage({ urls: [res.tempFilePath] })
              });
            },
            fail: () => wx.hideLoading()
          });
        });
      });
  },

  // Navigation Methods
  handleHomeCardTap(e) {
    const { action, url, type } = e.currentTarget.dataset;
    if (action && typeof this[action] === 'function') {
      this[action]();
      return;
    }

    if (url) {
      if (type === 'tab') {
        wx.switchTab({ url });
      } else {
        wx.navigateTo({ url });
      }
      return;
    }

    this.goToMoreTools();
  },

  startQuickPuzzle() {
    this.setData({ showPuzzleSourceSheet: true });
  },

  closePuzzleSourceSheet() {
    this.setData({ showPuzzleSourceSheet: false });
  },

  onChooseAlbum() {
    this.chooseImageForPuzzle(['album']);
  },

  onChooseCamera() {
    this.chooseImageForPuzzle(['camera']);
  },

  onChooseChat() {
    this.closePuzzleSourceSheet();
    this.chooseChatImagesForPuzzle();
  },

  chooseChatImagesForPuzzle() {
    if (!wx.chooseMessageFile) {
      wx.showToast({
        title: '当前微信版本不支持聊天选图',
        icon: 'none'
      });
      return;
    }

    wx.chooseMessageFile({
      count: 9,
      type: 'image',
      success: async (res) => {
        const tempFilePaths = (res.tempFiles || [])
          .map(file => file.path)
          .filter(Boolean);
        if (!tempFilePaths.length) {
          wx.showToast({ title: '未选择图片', icon: 'none' });
          return;
        }

        const isSafe = await NSFW.checkImagesAndAlert(tempFilePaths);
        if (!isSafe) return;

        this.navigateToPuzzle(tempFilePaths);
      },
      fail: (err) => {
        if (Privacy.handlePrivacyError(err)) return;
        if (err && err.errMsg && err.errMsg.includes('cancel')) {
          return;
        }
        wx.showToast({ title: '聊天图片选择失败', icon: 'none' });
      }
    });
  },

  chooseImageForPuzzle(sourceType) {
    this.closePuzzleSourceSheet();
    wx.chooseImage({
      count: 9,
      sizeType: ['original', 'compressed'],
      sourceType: sourceType,
      success: async (res) => {
        const isSafe = await NSFW.checkImagesAndAlert(res.tempFilePaths);
        if (!isSafe) return;
        this.navigateToPuzzle(res.tempFilePaths);
      },
      fail: (err) => {
        Privacy.handlePrivacyError(err);
      }
    });
  },

  navigateToPuzzle(tempFilePaths) {
    if (!tempFilePaths || tempFilePaths.length === 0) return;
    
    wx.navigateTo({
      url: '/pages/pintu/index',
      success: (res) => {
        res.eventChannel.emit('acceptDataFromOpenerPage', {
          images: tempFilePaths,
          prechecked: true
        });
      }
    });
  },

  goToLongPuzzle() {
    wx.navigateTo({
      url: '/pages/long-puzzle/index'
    });
  },

  goToChatPuzzle() {
    wx.navigateTo({
      url: '/pages/subtitle-puzzle/index'
    });
  },

  goToImageCrop() {
    wx.navigateTo({
      url: '/pages/image-crop/index'
    });
  },

  goToImageEdit() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        if (!checkImageSize(res.tempFiles || [])) return;
        const imagePath = (res.tempFilePaths || [])[0];
        if (!imagePath) return;
        const isSafe = await NSFW.checkAndAlert(imagePath, true);
        if (!isSafe) return;
        wx.navigateTo({
          url: `/pages/image-edit/index?image=${encodeURIComponent(imagePath)}`
        });
      },
      fail: (err) => {
        Privacy.handlePrivacyError(err);
      }
    });
  },

  goToGridCut() {
     wx.navigateTo({
        url: '/pages/grid-cut/index'
      });
  },

  goToMomentsCopy() {
    wx.switchTab({
      url: '/pages/moments-copy/index'
    });
  },

  goToImageCompress() {
    wx.navigateTo({
      url: '/pages/compress/index'
    });
  },

  goToImageConvert() {
    wx.navigateTo({
      url: '/pages/convert/index'
    });
  },

  // 跳转到生日日历
  goToBirthdayCalendar() {
    wx.navigateTo({
      url: '/pages/birthday-calendar/index'
    });
  },

  // 跳转到证件照制作
  goToIdPhoto() {
    wx.navigateTo({
      url: '/pages/idphoto/index'
    });
  },

  // 更多工具
  goToMoreTools() {
    wx.showToast({
      title: '更多工具即将上线',
      icon: 'none'
    });
  },

  // 快速切图 - 选择图片
  goToQuickGridCut() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const isSafe = await NSFW.checkImagesAndAlert(res.tempFilePaths);
        if (!isSafe) return;
        this.setData({
          quickCutImages: res.tempFilePaths
        });
      },
      fail: (err) => {
        Privacy.handlePrivacyError(err);
      }
    });
  },

  // 重新选择快速切图图片
  reselectQuickCut() {
    this.setData({
      quickCutImages: []
    });
    this.goToQuickGridCut();
  },

  // 执行快速切图
  doQuickCut() {
    if (!this.data.quickCutImages.length) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }

    const imagePath = this.data.quickCutImages[0];
    
    wx.navigateTo({
      url: '/pages/grid-cut/index',
      success: (res) => {
        // 传递图片数据到九宫格页面
        res.eventChannel.emit('acceptDataFromOpenerPage', {
          image: imagePath,
          autoCut: true
        });
      }
    });
  },

  // 证件照快速制作功能
  goToExamRegistration: function () {
    wx.navigateTo({
      url: '/pages/idphoto/index'
    });
  },

  // 一键换底色 (New Page)
  goToImageEditor: function () {
    wx.navigateTo({
      url: '/pages/image-editor/index'
    });
  },

  // 一键换底色 (Old Logic - Deprecated for card, but kept for reference if needed)
  goToQuickMake: function () {
    wx.navigateTo({
      url: '/pages/idphoto/index?module=changeBg'
    });
  },

  // 拼图功能 (自由拼接)
  goToGridPuzzle: function () {
    wx.navigateTo({
      url: '/pages/pintu/index'
    });
  },

  // 生成朋友圈九宫格
  goToJiugongge: function () {
    wx.navigateTo({
      url: '/pages/moments-copy/index'
    });
  },

  // 朋友圈防折叠
  goToAntiFold: function () {
    wx.navigateToMiniProgram({
      appId: 'wx239668ffaba0edfd',
      path: 'pages/index/index',
      success(res) {
        console.log('跳转成功', res);
      },
      fail(err) {
        console.error('跳转失败', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  // 证件加水印
  goToIdWatermark: function () {
    wx.navigateTo({
      url: '/pages/id-watermark/index'
    });
  },

  // 关键字搜索
  goToSearch: function () {
    wx.navigateTo({
      url: '/pages/search/index'
    });
  },

  // 我的作品
  goToMyWorks: function () {
    wx.navigateTo({
      url: '/pages/my-works/index'
    });
  },

  // 功能入口点击处理
  handleEntryTap: function (e) {
    const item = e.currentTarget.dataset.item;
    if (!item.url) {
      wx.showToast({
        title: '功能即将上线',
        icon: 'none'
      });
      return;
    }

    if (item.type === 'tab') {
      // 如果是 tab 类型，使用 switchTab
      wx.switchTab({
        url: item.url
      });
    } else {
      // 否则使用 navigateTo
      wx.navigateTo({
        url: item.url
      });
    }
  },

  // 立即登录
  goToLogin: function () {
    wx.navigateTo({
      url: '/pages/login/index'
    });
  },

  // 切换到首页（底部导航）
  switchToHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 切换到探索（底部导航）
  switchToExplore: function () {
    wx.switchTab({
      url: '/pages/explore/index'
    });
  },

  // 切换到我的（底部导航）
  switchToMy: function () {
    wx.switchTab({
      url: '/pages/my/index'
    });
  },

  // 获取轮播图
  getBanners: async function () {
    try {
      const res = await request({
        url: '/banner/publicList'
      });
      if (res.code === 0) {
        const banners = res.data.list.map(item => {
          if (item.url && !item.url.startsWith('http')) {
            item.url = BASE_URL + '/' + item.url;
          }
          return item;
        });
        this.setData({
          banners: banners
        });
        wx.setStorageSync('index_banners', banners);
      }
    } catch (err) {
      console.error('获取轮播图失败', err);
    }
  },

  getTabPageSet() {
    return new Set([
      '/pages/index/index',
      '/pages/moments-copy/index',
      '/pages/my/index'
    ]);
  },

  normalizeMiniProgramPath(rawLink) {
    if (!rawLink || typeof rawLink !== 'string') return '';
    const trimmed = rawLink.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  },

  isWechatArticleLink(link) {
    return /^https:\/\/mp\.weixin\.qq\.com\//i.test(link || '');
  },

  getPagePathOnly(link) {
    if (!link) return '';
    return link.split('?')[0].split('#')[0];
  },

  navigateByMiniProgramLink(link) {
    const normalized = this.normalizeMiniProgramPath(link);
    if (!normalized) return;

    if (/^https?:\/\//i.test(normalized)) {
      if (this.isWechatArticleLink(normalized)) {
        wx.navigateTo({
          url: `/pages/webview/index?url=${encodeURIComponent(normalized)}`,
          fail: () => {
            wx.showToast({
              title: '文章打开失败',
              icon: 'none'
            });
          }
        });
        return;
      }
      wx.showToast({
        title: '暂不支持该外链',
        icon: 'none'
      });
      return;
    }

    const pagePath = this.getPagePathOnly(normalized);
    const tabPages = this.getTabPageSet();

    if (tabPages.has(pagePath)) {
      wx.switchTab({
        url: pagePath,
        fail: () => {
          wx.reLaunch({ url: pagePath });
        }
      });
      return;
    }

    wx.navigateTo({
      url: normalized,
      fail: () => {
        wx.redirectTo({
          url: normalized,
          fail: () => {
            wx.showToast({
              title: '页面跳转失败',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  // 点击轮播图
  onBannerTap: function (e) {
    const link = e.currentTarget.dataset.link;
    if (link) {
      this.navigateByMiniProgramLink(link);
    }
  },

  // 分享给朋友
  onShareAppMessage: function () {
    return {
      title: '证件照助手 - 一键制作精美证件照',
      desc: '轻松制作各类证件照，支持多种尺寸和背景色，证件照制作从未如此简单！',
      path: '/pages/index/index',
      imageUrl: '/images/icon/分享.svg' // 使用现有的分享图标
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '证件照助手 - 一键制作精美证件照',
      query: 'from=timeline',
      imageUrl: '/images/icon/分享.svg'
    };
  },

  getMomentsData: async function () {
    try {
      const res = await request({
        url: '/moments/publicList'
      });
      
      console.log('朋友圈文案API返回:', res);
      
      if (res.code === 0 && res.data && Array.isArray(res.data.list)) {
        const firstTabItems = [];
        if (res.data.list.length > 0) {
          const firstTab = res.data.list[0];
          if (Array.isArray(firstTab.items)) {
            firstTab.items.forEach(item => {
              let images = [];
              try {
                // 检查是否有 images 字段
                if (item.images) {
                  if (typeof item.images === 'string') {
                    // 如果是字符串，则解析为JSON
                    images = JSON.parse(item.images);
                  } else if (Array.isArray(item.images)) {
                    // 如果是数组，直接使用
                    images = item.images;
                  }
                  
                  // 处理图片URL
                  images = images.map(img => {
                    if (typeof img === 'string') {
                      if (img.startsWith('http')) {
                        return img;
                      } else {
                        const baseUrl = BASE_URL.replace(/\/$/, '');
                        const imgPath = img.replace(/^\//, '');
                        return `${baseUrl}/${imgPath}`;
                      }
                    }
                    return img;
                  });
                }
              } catch (e) {
                console.error('Parse images failed', e);
                images = []; // 解析失败时使用空数组
              }
              firstTabItems.push({ ...item, images });
            });
          }
        }
        
        const displayMoments = firstTabItems.slice(0, this.data.initialPageSize);
        console.log('展示的朋友圈文案:', displayMoments);
        this.setData({
          displayMoments: displayMoments,
          allMoments: firstTabItems,
          currentPage: 1
        });
      } else {
        console.error('API返回数据格式错误', res);
        this.setData({
          displayMoments: [],
          allMoments: [],
          currentPage:1
        });
      }
    } catch (err) {
      console.error('获取朋友圈文案失败', err);
      this.setData({
        displayMoments: [],
        allMoments: [],
        currentPage:1
      });
    }
  },

  goToMomentDetail: function (e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.displayMoments[index];
    
    getApp().globalData = getApp().globalData || {};
    getApp().globalData.selectedMomentItem = item;
    
    wx.navigateTo({
      url: '/pages/jiugongge/detail/index'
    });
  },

  loadMore: function () {
    const { pageSize, allMoments, displayMoments } = this.data;
    
    // 如果已经展示了所有数据，不再加载
    if (displayMoments.length >= allMoments.length) {
      return;
    }

    const currentCount = displayMoments.length;
    const end = currentCount + pageSize;
    
    const newItems = allMoments.slice(currentCount, end);
    const updatedDisplay = [...displayMoments, ...newItems];
      
    this.setData({
      displayMoments: updatedDisplay
    });
  },

  // 复制文案
  copyMomentText: function (e) {
    const text = e.currentTarget.dataset.text;
    if (!text) return;
    wx.setClipboardData({
      data: text,
      success: function () {
        wx.showToast({
          title: '文案已复制',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  // 预览图片
  previewImage: function (e) {
    const current = e.currentTarget.dataset.current;
    const urls = e.currentTarget.dataset.urls;
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  // 一键保存图片
  downloadMomentImages: async function (e) {
    const images = e.currentTarget.dataset.images;
    if (!images || images.length === 0) return;

    // 检查权限
    try {
      const setting = await new Promise((resolve, reject) => {
        wx.getSetting({ success: resolve, fail: reject });
      });
      
      if (!setting.authSetting['scope.writePhotosAlbum']) {
        try {
          await new Promise((resolve, reject) => {
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success: resolve,
              fail: reject
            });
          });
        } catch (err) {
          wx.showModal({
            title: '提示',
            content: '需要保存图片到相册的权限，请在设置中开启',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
          return;
        }
      }
    } catch (err) {
      console.error('权限检查失败', err);
      // 继续尝试，可能会自动弹窗
    }

    wx.showLoading({
      title: '正在保存...',
      mask: true
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < images.length; i++) {
      const imgUrl = images[i];
      try {
        // 下载图片
        const downloadRes = await new Promise((resolve, reject) => {
          wx.downloadFile({
            url: imgUrl,
            success: resolve,
            fail: reject
          });
        });

        if (downloadRes.statusCode === 200) {
          // 保存到相册
          await new Promise((resolve, reject) => {
            wx.saveImageToPhotosAlbum({
              filePath: downloadRes.tempFilePath,
              success: resolve,
              fail: reject
            });
          });
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error('保存图片失败', imgUrl, err);
        failCount++;
      }
    }

    wx.hideLoading();

    if (failCount === 0) {
      wx.showToast({
        title: '全部保存成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: `成功${successCount}张,失败${failCount}张`,
        icon: 'none'
      });
    }
  },


});
