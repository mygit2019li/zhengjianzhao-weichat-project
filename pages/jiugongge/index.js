// pages/jiugongge/index.js
const { shapes, getShapePath } = require('../../utils/shapes.js');
const { checkImageSize } = require('../../utils/util.js');
const NSFW = require('../../utils/nsfw.js');
const { request, BASE_URL } = require('../../utils/request.js');

Page({
    data: {
        // Image data
        imagePath: '',
        imageWidth: 0,
        imageHeight: 0,

        // Crop Box State
        cropX: 0,
        cropY: 0,
        cropW: 0,
        cropH: 0,
        imageRect: { x: 0, y: 0, width: 0, height: 0 },

        // Preview size
        resultSize: 650, // rpx in WXML, but we use px in calculations

        // Grid configuration
        gridRows: 3,
        gridCols: 3,

        // Shape selection
        currentTab: 'shape', // 'shape' or 'grid'
        selectedShape: 'square',
        shapeList: [],
        allShapeList: [],

        // Grid presets
        gridList: [],
        selectedGridId: '3x3',
        maskStyle: '',
        showShapeHint: false,
        currentShapeName: '',
        showShapeOverlay: false,
        shapeOverlayUrl: '',

        // Modal
        showModal: false,
        pageSize: 15,
        currentPage: 1,
        hasMore: true,

        // Touch control
        isMovingBox: false,
        isResizingBox: false,
        activeCorner: '',
        startTouch: {},
        startCrop: {},
        fullMaskedImagePath: '', // Clean masked image for slicing
        shareImagePath: '', // Masked image with grid lines for sharing

        // Main Tabs
        activeTab: 'grid', // 'grid' for cut-nine, 'copy' for copywriting
        copyCategories: [],
        currentCopyCategory: '',
        displayCopyItems: [],
        momentsData: [] // Store all category and items
    },

    onLoad(options) {
        if (options.activeTab) {
            this.setData({ activeTab: options.activeTab });
        }
        this.initShapes();
        // Convert rpx to px
        const systemInfo = wx.getSystemInfoSync();
        const rpx2px = systemInfo.windowWidth / 750;
        const pixelRatio = systemInfo.pixelRatio;
        this.setData({
            resultSize: 650 * rpx2px,
            pixelRatio
        });
        this.getMomentsData();

        // Enable share menu
        wx.showShareMenu({
            menus: ['shareTimeline']
        });

        if (options.imagePath) {
            const incomingPath = decodeURIComponent(options.imagePath);
            NSFW.checkAndAlert(incomingPath, true).then((isSafe) => {
                if (isSafe) this.initCropArea(incomingPath);
            });
        } else {
            this.initCropArea('/images/grid_default.png');
        }

        // 初始化激励视频广告（用于朋友圈文案图片下载）
        if (wx.createRewardedVideoAd) {
            this.videoAd = wx.createRewardedVideoAd({
                adUnitId: 'adunit-97cf9baf1eb4988a'
            });

            this.videoAd.onLoad(() => {
                console.log('朋友圈文案 激励视频广告加载成功');
            });

            this.videoAd.onError((err) => {
                console.error('朋友圈文案 激励视频广告加载失败', err);
            });

            this.videoAd.onClose((res) => {
                // 用户关闭广告
                if (res && res.isEnded) {
                    // 正常播放结束，下发下载奖励
                    console.log('朋友圈文案 激励视频广告播放完成，开始下载图片');
                    if (this.pendingCopyDownloadIndex !== undefined && this.pendingCopyDownloadIndex !== null) {
                        const index = this.pendingCopyDownloadIndex;
                        this.pendingCopyDownloadIndex = null;
                        this.downloadAllImagesInternal(index);
                    }
                } else {
                    // 播放中途退出
                    console.log('朋友圈文案 激励视频广告未看完，取消下载');
                    this.pendingCopyDownloadIndex = null;
                    wx.showToast({
                        title: '请完整观看广告以保存朋友圈配图',
                        icon: 'none',
                        duration: 2000
                    });
                }
            });
        }
    },

    // Initialize shape list
    initShapes() {
        const pageSize = this.data.pageSize;
        const shapeList = shapes.slice(0, pageSize);
        const hasMore = shapes.length > pageSize;

        const refinedGridList = [
            // 2宫格
            { id: '1x2', rows: 1, cols: 2, label: '2宫格-横' },
            { id: '2x1', rows: 2, cols: 1, label: '2宫格-竖' },
            // 3宫格
            { id: '1x3', rows: 1, cols: 3, label: '3宫格-横' },
            { id: '3x1', rows: 3, cols: 1, label: '3宫格-竖' },
            // 4宫格
            { id: '2x2', rows: 2, cols: 2, label: '4宫格' },
            // 6宫格
            { id: '2x3', rows: 3, cols: 2, label: '6宫格-竖' },
            { id: '3x2', rows: 2, cols: 3, label: '6宫格-横' },
            // 9宫格
            { id: '3x3', rows: 3, cols: 3, label: '9宫格' }
        ];

        this.setData({
            shapeList,
            allShapeList: shapes,
            hasMore,
            gridList: refinedGridList,
            selectedShape: 'square',
            gridRows: 3,
            gridCols: 3,
            selectedGridId: '3x3'
        });

        this.updateShape('square');
    },

    // Load more shapes (pagination)
    onScrollToLower() {
        if (!this.data.hasMore) return;

        const { shapeList, pageSize, currentPage } = this.data;
        const nextPage = currentPage + 1;
        const nextShapes = shapes.slice(0, nextPage * pageSize);
        const hasMore = shapes.length > nextShapes.length;

        this.setData({
            shapeList: nextShapes,
            currentPage: nextPage,
            hasMore
        });
    },

    // Update mask style for selected shape
    updateShape(shapeId) {
        const shape = shapes.find(s => s.id === shapeId);

        if (!shape) {
            this.setData({
                selectedShape: shapeId,
                maskStyle: '',
                showShapeOverlay: false,
                shapeOverlayUrl: ''
            });
            return;
        }

        let maskStyle = '';
        let showShapeOverlay = false;
        let shapeOverlayUrl = '';

        // Apply different styles based on shape
        if (shapeId === 'square') {
            // Square: just border
            maskStyle = 'border: 1rpx solid #e0e0e0;';
        } else if (shapeId === 'circle') {
            // Circle: use border-radius (perfect support)
            maskStyle = 'border-radius: 50%; overflow: hidden;';
        } else if (shape.maskUrl) {
            // Other shapes: show shape overlay for preview
            showShapeOverlay = true;
            shapeOverlayUrl = shape.maskUrl;
            maskStyle = '';
        }

        this.setData({
            selectedShape: shapeId,
            maskStyle: maskStyle,
            showShapeOverlay: showShapeOverlay,
            shapeOverlayUrl: shapeOverlayUrl,
            showShapeHint: false // Hide hint when showing overlay
        });
    },

    // Select shape from grid
    selectShape(e) {
        const shape = e.currentTarget.dataset.shape;
        this.updateShape(shape);
    },

    // Switch Tab (Sub-tabs within Grid)
    switchTab(e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({ currentTab: tab });
    },

    // Switch Main Tabs (Copywriting vs Grid)
    switchMainTab(e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({ activeTab: tab });
    },

    // Copywriting logic
    getMomentsData: async function () {
        try {
            console.log('开始调用朋友圈文案API');
            const res = await request({
                url: '/moments/publicList'
            });
            console.log('API返回结果:', res);
            
            // 检查返回数据结构
            if (res.code === 0) {
                if (res.data) {
                    // 处理list为null的情况，将其转换为空数组
                    const list = res.data.list || [];
                    console.log('处理后的列表长度:', list.length);
                    
                    if (Array.isArray(list)) {
                        if (list.length > 0) {
                            const momentsData = list.map(entry => {
                                console.log('处理分类:', entry.category);
                                // 检查category类型
                                const categoryName = typeof entry.category === 'object' ? entry.category.name : entry.category;
                                // 确保entry.items是数组
                                const items = Array.isArray(entry.items) ? entry.items.map(item => {
                                    let images = [];
                                    try {
                                        images = typeof item.images === 'string' ? JSON.parse(item.images || '[]') : (item.images || []);
                                        images = images.map(img => {
                                            if (img.startsWith('http')) {
                                                return img;
                                            }
                                            // 确保URL格式正确，避免双斜杠
                                            const baseUrl = BASE_URL.replace(/\/$/, '');
                                            const imgPath = img.replace(/^\//, '');
                                            return `${baseUrl}/${imgPath}`;
                                        });
                                    } catch (e) {
                                        console.error('Parse images failed', e);
                                    }
                                    return { ...item, images };
                                }) : [];
                                return { category: categoryName, items };
                            });

                            // Process items to check for text length
                            momentsData.forEach(category => {
                                category.items.forEach(item => {
                                    item.isExpanded = false;
                                    const text = String(item.text || '');
                                    // Use regex to handle different newline formats
                                    const lines = text.split(/\r\n|\r|\n/).length;
                                    const length = text.length;
                                    
                                    // Debug log for the first few items
                                    if (lines > 5) {
                                        console.log('Long text detected:', { preview: text.substring(0, 20), lines, length });
                                    }

                                    // Lower threshold to ensure it catches the case in screenshot
                                    // 6 lines or 100 chars
                                    item.showExpandBtn = lines > 6 || length > 100;
                                });
                            });

                            this.setData({
                                momentsData: momentsData,
                                copyCategories: momentsData.map(t => t.category),
                                currentCopyCategory: momentsData[0].category,
                                displayCopyItems: momentsData[0].items
                            });
                        } else {
                            console.log('API返回了空列表');
                            this.setData({
                                momentsData: [],
                                copyCategories: [],
                                currentCopyCategory: '',
                                displayCopyItems: []
                            });
                            wx.showToast({
                                title: '暂无朋友圈文案数据',
                                icon: 'none'
                            });
                        }
                    } else {
                        console.error('API返回的list不是数组:', res.data.list);
                        this.setData({
                            momentsData: [],
                            copyCategories: [],
                            currentCopyCategory: '',
                            displayCopyItems: []
                        });
                        wx.showToast({
                            title: '数据格式错误',
                            icon: 'none'
                        });
                    }
                } else {
                    console.error('API返回数据结构错误，缺少data字段:', res);
                    wx.showToast({
                        title: '数据结构错误',
                        icon: 'none'
                    });
                }
            } else {
                console.error('API返回错误码:', res.code, res.msg);
                wx.showToast({
                    title: res.msg || '获取文案失败',
                    icon: 'none'
                });
            }
        } catch (err) {
            console.error('获取朋友圈文案失败', err);
            wx.showToast({
                title: '网络请求失败',
                icon: 'none'
            });
        }
    },

    selectCopyCategory(e) {
        const category = e.currentTarget.dataset.category;
        const categoryData = this.data.momentsData.find(t => t.category === category);
        this.setData({
            currentCopyCategory: category,
            displayCopyItems: categoryData ? categoryData.items : []
        });
    },

    toggleText(e) {
        const index = e.currentTarget.dataset.index;
        const items = this.data.displayCopyItems;
        const item = items[index];
        
        // Toggle the expanded state
        const newItem = { ...item, isExpanded: !item.isExpanded };
        
        // Update both the display list and the source data
        const updatedDisplayItems = [...items];
        updatedDisplayItems[index] = newItem;
        
        // Also update the main momentsData structure so state persists if category changes
        const momentsData = this.data.momentsData;
        const currentCategory = this.data.currentCopyCategory;
        const categoryIndex = momentsData.findIndex(c => c.category === currentCategory);
        if (categoryIndex !== -1) {
            momentsData[categoryIndex].items[index] = newItem;
        }

        this.setData({
            displayCopyItems: updatedDisplayItems,
            momentsData
        });
    },

    copyToClipboard(e) {
        const content = e.currentTarget.dataset.content;
        wx.setClipboardData({
            data: content,
            success: () => {
                wx.showToast({
                    title: '复制成功',
                    icon: 'success'
                });
            }
        });
    },

    goToDetail(e) {
        const index = e.currentTarget.dataset.index;
        const item = this.data.displayCopyItems[index];

        // Use globalData or navigate with JSON string (if not too long)
        // For simplicity and robustness with small objects, base64 or storage is better
        // But here we can use a simpler approach: store the item in globalData or just pass details
        getApp().globalData = getApp().globalData || {};
        getApp().globalData.selectedMomentItem = item;

        wx.navigateTo({
            url: `/pages/jiugongge/detail/index`
        });
    },

    // 下载朋友圈文案配图（带激励广告）
    downloadAllImages(e) {
        const index = e.currentTarget.dataset.index;
        const item = this.data.displayCopyItems[index];
        const imagePaths = (item && item.images) || [];

        if (imagePaths.length === 0) {
            wx.showToast({
                title: '该条文案没有配套图片',
                icon: 'none'
            });
            return;
        }

        // 如果有激励广告，先展示广告
        if (this.videoAd) {
            this.pendingCopyDownloadIndex = index;
            this.videoAd.show().catch(() => {
                // 失败重试
                this.videoAd.load()
                    .then(() => this.videoAd.show())
                    .catch(err => {
                        console.error('朋友圈文案 激励视频广告显示失败，直接允许下载', err);
                        // 广告无法正常展示，直接执行下载逻辑
                        this.pendingCopyDownloadIndex = null;
                        this.downloadAllImagesInternal(index);
                    });
            });
        } else {
            // 不支持激励广告，直接下载
            this.downloadAllImagesInternal(index);
        }
    },

    // 实际下载朋友圈配图逻辑
    downloadAllImagesInternal(index) {
        const item = this.data.displayCopyItems[index];
        if (!item) return;
        const imagePaths = item.images || [];

        if (imagePaths.length === 0) {
            wx.showToast({
                title: '该条文案没有配套图片',
                icon: 'none'
            });
            return;
        }

        wx.showLoading({ title: '保存中...' });
        this.saveToAlbum(imagePaths).then(() => {
            wx.hideLoading();
            // saveImagesSequentially already shows a toast, but we can show a modal if preferred
            // The existing code shows a modal here, which is fine.
            wx.showModal({
                title: '保存成功',
                content: `已成功保存${imagePaths.length}张图片到相册`,
                showCancel: false
            });
        }).catch(err => {
            wx.hideLoading();
            console.error('Download all failed:', err);
        });
    },

    previewImage(e) {
        const current = e.currentTarget.dataset.src;
        const urls = e.currentTarget.dataset.urls;
        wx.previewImage({
            current: current,
            urls: urls
        });
    },

    // Grid Selection
    selectGrid(e) {
        const { id, rows, cols } = e.currentTarget.dataset;

        this.setData({
            gridRows: rows,
            gridCols: cols,
            selectedGridId: id,
            // When selecting a grid, we usually want the simple square cut
            selectedShape: 'square',
            maskStyle: 'border: 1rpx solid #e0e0e0;',
            showShapeOverlay: false
        });

        this.updateGridLines();
    },

    updateGridLines() {
        // Grid lines will be dynamically rendered in WXML
        this.setData({
            gridRows: this.data.gridRows,
            gridCols: this.data.gridCols
        });
    },

    stopPropagation() {
        // Prevent modal close when clicking inside
    },

    // Choose image from album
    chooseImage() {
        const that = this;
        wx.chooseImage({
            count: 1,
            sizeType: ['original', 'compressed'],
            sourceType: ['album', 'camera'],
            success: async (res) => {
                if (!checkImageSize(res.tempFiles)) return;

                // 鉴黄检测
                const tempFilePath = res.tempFilePaths[0];
                const isSafe = await that.checkImageNSFW(tempFilePath);

                if (isSafe) {
                    that.initCropArea(tempFilePath);
                }
            },
            fail: (err) => {
                console.error('Choose image failed:', err);
                wx.showToast({
                    title: '选择图片失败',
                    icon: 'none'
                });
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

    // Initialize crop area with selected image
    initCropArea(imagePath) {
        wx.getImageInfo({
            src: imagePath,
            success: (res) => {
                const imgWidth = res.width;
                const imgHeight = res.height;
                const resultSize = this.data.resultSize;

                // Calculate image display rect (aspectFit within resultSize x resultSize)
                const imgRatio = imgWidth / imgHeight;
                let displayWidth, displayHeight, displayX, displayY;

                if (imgRatio > 1) {
                    displayWidth = resultSize;
                    displayHeight = resultSize / imgRatio;
                } else {
                    displayHeight = resultSize;
                    displayWidth = resultSize * imgRatio;
                }

                displayX = (resultSize - displayWidth) / 2;
                displayY = (resultSize - displayHeight) / 2;

                const imageRect = {
                    x: displayX,
                    y: displayY,
                    width: displayWidth,
                    height: displayHeight
                };

                // Initialize crop box to be square and fit within imageRect
                const minSide = Math.min(displayWidth, displayHeight);
                // Make it slightly smaller than the image for a better UX initially
                const initialSize = minSide * 0.9;
                
                const cropW = initialSize;
                const cropH = initialSize;
                const cropX = displayX + (displayWidth - cropW) / 2;
                const cropY = displayY + (displayHeight - cropH) / 2;

                this.setData({
                    imagePath,
                    imageWidth: imgWidth,
                    imageHeight: imgHeight,
                    imageRect,
                    cropX,
                    cropY,
                    cropW,
                    cropH
                });
                
                // Also update the grid aspect ratio based on selectedGridId
                this.updateCropBoxRatio(this.data.gridRows, this.data.gridCols);
            },
            fail: (err) => {
                console.error('Get image info failed:', err);
                wx.showToast({
                    title: '加载图片失败',
                    icon: 'none'
                });
            }
        });
    },

    updateCropBoxRatio(rows, cols) {
        // Calculate new crop size based on grid ratio to maximize size within imageRect
        let targetRatio = cols / rows;
        const { imageRect } = this.data;
        
        // Start with the maximum possible width and height
        let newW = imageRect.width; // 100% of image width
        let newH = newW / targetRatio;

        // If height exceeds image height, constrain by height instead
        if (newH > imageRect.height) {
            newH = imageRect.height;
            newW = newH * targetRatio;
        }

        // Center it perfectly in the image rect
        let newX = imageRect.x + (imageRect.width - newW) / 2;
        let newY = imageRect.y + (imageRect.height - newH) / 2;

        this.setData({
            cropW: newW,
            cropH: newH,
            cropX: newX,
            cropY: newY
        });
    },

    // Grid Selection
    selectGrid(e) {
        const { id, rows, cols } = e.currentTarget.dataset;

        this.setData({
            gridRows: rows,
            gridCols: cols,
            selectedGridId: id,
            // When selecting a grid, we usually want the simple square cut
            selectedShape: 'square',
            maskStyle: 'border: 1rpx solid #e0e0e0;',
            showShapeOverlay: false
        });

        this.updateCropBoxRatio(rows, cols);
    },

    // Box movement handlers
    startBoxTouch(e) {
        if (e.touches.length === 1) {
            this.setData({
                isMovingBox: true,
                startTouch: {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                },
                startCrop: {
                    x: this.data.cropX,
                    y: this.data.cropY
                }
            });
        }
    },

    onBoxMove(e) {
        if (this.data.isMovingBox && e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - this.data.startTouch.x;
            const deltaY = e.touches[0].clientY - this.data.startTouch.y;

            let newX = this.data.startCrop.x + deltaX;
            let newY = this.data.startCrop.y + deltaY;

            // Constrain within imageRect
            const { imageRect, cropW, cropH } = this.data;
            if (newX < imageRect.x) newX = imageRect.x;
            if (newY < imageRect.y) newY = imageRect.y;
            if (newX + cropW > imageRect.x + imageRect.width) newX = imageRect.x + imageRect.width - cropW;
            if (newY + cropH > imageRect.y + imageRect.height) newY = imageRect.y + imageRect.height - cropH;

            this.setData({
                cropX: newX,
                cropY: newY
            });
        }
    },

    endBoxTouch() {
        this.setData({ isMovingBox: false });
    },

    // Corner Resize Handlers
    startResize(e) {
        if (e.touches.length !== 1) return;
        const corner = e.currentTarget.dataset.corner;
        this.setData({
            isResizingBox: true,
            activeCorner: corner,
            startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
            startCrop: {
                x: this.data.cropX,
                y: this.data.cropY,
                w: this.data.cropW,
                h: this.data.cropH
            }
        });
    },

    onResize(e) {
        if (!this.data.isResizingBox || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const dx = touch.clientX - this.data.startTouch.x;
        const dy = touch.clientY - this.data.startTouch.y;
        
        let { x, y, w, h } = this.data.startCrop;
        const { imageRect, gridRows, gridCols } = this.data;
        const targetRatio = gridCols / gridRows;
        const minSize = 50;
        
        // We will calculate the new intended width/height, then apply ratio, then constrain
        let newX = x, newY = y, newW = w, newH = h;
        
        // Let's determine dominant axis for resize based on movement
        // To maintain aspect ratio, we can just use dx or dy to drive both
        
        switch (this.data.activeCorner) {
            case 'tl':
                newW = w - dx;
                newH = newW / targetRatio;
                newX = x + w - newW;
                newY = y + h - newH;
                break;
            case 'tr':
                newW = w + dx;
                newH = newW / targetRatio;
                newY = y + h - newH;
                break;
            case 'bl':
                newW = w - dx;
                newH = newW / targetRatio;
                newX = x + w - newW;
                break;
            case 'br':
                newW = w + dx;
                newH = newW / targetRatio;
                break;
        }

        // Constrain min size
        if (newW < minSize || newH < minSize) {
            return; // ignore this move if it makes it too small
        }

        // Constrain bounds
        if (newX < imageRect.x) {
            newX = imageRect.x;
            newW = x + w - newX;
            newH = newW / targetRatio;
            if (this.data.activeCorner === 'tl' || this.data.activeCorner === 'tr') {
                newY = y + h - newH;
            }
        }
        if (newY < imageRect.y) {
            newY = imageRect.y;
            newH = y + h - newY;
            newW = newH * targetRatio;
            if (this.data.activeCorner === 'tl' || this.data.activeCorner === 'bl') {
                newX = x + w - newW;
            }
        }
        if (newX + newW > imageRect.x + imageRect.width) {
            newW = imageRect.x + imageRect.width - newX;
            newH = newW / targetRatio;
            if (this.data.activeCorner === 'tl' || this.data.activeCorner === 'tr') {
                newY = y + h - newH;
            }
        }
        if (newY + newH > imageRect.y + imageRect.height) {
            newH = imageRect.y + imageRect.height - newY;
            newW = newH * targetRatio;
            if (this.data.activeCorner === 'tl' || this.data.activeCorner === 'bl') {
                newX = x + w - newW;
            }
        }
        
        this.setData({
            cropX: newX,
            cropY: newY,
            cropW: newW,
            cropH: newH
        });
    },

    endResize() {
        this.setData({ isResizingBox: false, activeCorner: '' });
    },

    // Back navigation
    goBack() {
        wx.navigateBack({
            delta: 1
        });
    },

    // Save images to album
    saveImages() {
        if (!this.data.imagePath) {
            wx.showToast({
                title: '请先选择图片',
                icon: 'none'
            });
            return;
        }

        wx.showLoading({ title: '生成中...' });

        this.generateGridImages()
            .then(imagePaths => {
                wx.hideLoading();
                return this.saveToAlbum(imagePaths);
            })
            .catch(err => {
                wx.hideLoading();
                console.error('Generate images failed:', err);
                wx.showToast({
                    title: '生成图片失败',
                    icon: 'none'
                });
            });
    },

    // Generate grid images
    generateGridImages() {
        return new Promise((resolve, reject) => {
            const { imagePath, cropX, cropY, cropW, cropH, imageRect, imageWidth, imageHeight, selectedShape, gridRows, gridCols } = this.data;
            
            const scaleX = imageWidth / imageRect.width;
            const scaleY = imageHeight / imageRect.height;
            const sourceX = (cropX - imageRect.x) * scaleX;
            const sourceY = (cropY - imageRect.y) * scaleY;
            const sourceW = cropW * scaleX;
            const sourceH = cropH * scaleY;

            // Output size: use original image resolution for the cropped area, capped at 1080 to prevent memory issues
            let destW = sourceW;
            let destH = sourceH;
            const maxDest = 1080;
            if (destW > maxDest || destH > maxDest) {
                const ratio = Math.min(maxDest / destW, maxDest / destH);
                destW *= ratio;
                destH *= ratio;
            }

            const cellWidth = destW / gridCols;
            const cellHeight = destH / gridRows;
            const imagePaths = [];

            // Create canvas context  
            const ctx = wx.createCanvasContext('gridCanvas', this);

            // Step 1: Draw the full image with mask applied
            const drawFullImage = () => {
                return new Promise((resolveImg, rejectImg) => {
                    const shape = shapes.find(s => s.id === selectedShape);

                    const proceedToDraw = (maskImagePath = null) => {
                        // Clear canvas
                        ctx.clearRect(0, 0, destW, destH);

                        // Draw the cropped area
                        ctx.drawImage(
                            imagePath,
                            sourceX, sourceY, sourceW, sourceH,
                            0, 0, destW, destH
                        );

                        // Apply mask to the ENTIRE image if not square
                        if (selectedShape !== 'square') {
                            ctx.save();

                            if (selectedShape === 'circle') {
                                ctx.globalCompositeOperation = 'destination-out';
                                ctx.setFillStyle('#000000');
                                ctx.beginPath();
                                ctx.rect(0, 0, destW, destH);
                                ctx.arc(destW / 2, destH / 2, Math.min(destW, destH) / 2, 0, 2 * Math.PI, true);
                                ctx.fill();
                            } else if (maskImagePath) {
                                ctx.globalCompositeOperation = 'destination-out';
                                ctx.drawImage(maskImagePath, 0, 0, destW, destH);
                            }

                            ctx.restore();
                            ctx.globalCompositeOperation = 'source-over';

                            // Add white background underneath
                            ctx.globalCompositeOperation = 'destination-over';
                            ctx.setFillStyle('#ffffff');
                            ctx.fillRect(0, 0, destW, destH);
                            ctx.globalCompositeOperation = 'source-over';
                        }

                        // Draw and export the full image
                        ctx.draw(false, () => {
                            wx.canvasToTempFilePath({
                                x: 0, y: 0,
                                width: destW, height: destH,
                                destWidth: destW, destHeight: destH,
                                canvasId: 'gridCanvas',
                                fileType: 'png',
                                success: (res) => {
                                    this.setData({ fullMaskedImagePath: res.tempFilePath });

                                    // Step 1.5: Draw grid lines on top for the share preview
                                    this.drawGridLines(ctx, destW, destH, gridRows, gridCols);

                                    ctx.draw(true, () => {
                                        wx.canvasToTempFilePath({
                                            x: 0, y: 0,
                                            width: destW, height: destH,
                                            destWidth: destW, destHeight: destH,
                                            canvasId: 'gridCanvas',
                                            fileType: 'png',
                                            success: (resShare) => {
                                                this.setData({ shareImagePath: resShare.tempFilePath });
                                                resolveImg(res.tempFilePath);
                                            },
                                            fail: rejectImg
                                        }, this);
                                    });
                                },
                                fail: rejectImg
                            }, this);
                        });
                    };

                    // Check if we need to download a mask
                    if (selectedShape !== 'square' && selectedShape !== 'circle' && shape && shape.maskUrl) {
                        wx.downloadFile({
                            url: shape.maskUrl,
                            success: (res) => {
                                if (res.statusCode === 200) {
                                    proceedToDraw(res.tempFilePath);
                                } else {
                                    console.error('Mask download failed status:', res.statusCode);
                                    proceedToDraw(null);
                                }
                            },
                            fail: (err) => {
                                console.error('Mask download failed:', err);
                                proceedToDraw(null);
                            }
                        });
                    } else {
                        // No external mask needed (square or circle)
                        proceedToDraw(null);
                    }
                });
            };

            // Step 2: Slice the full masked image into cells
            const sliceIntoGrid = (fullImagePath) => {
                const tasks = [];
                for (let row = 0; row < gridRows; row++) {
                    for (let col = 0; col < gridCols; col++) {
                        tasks.push({ row, col });
                    }
                }

                const processNext = (index = 0) => {
                    if (index >= tasks.length) {
                        resolve(imagePaths);
                        return;
                    }

                    const { row, col } = tasks[index];
                    this.sliceCell(ctx, fullImagePath, row, col, cellWidth, cellHeight)
                        .then(path => {
                            imagePaths.push(path);
                            processNext(index + 1);
                        })
                        .catch(reject);
                };

                processNext();
            };

            // Execute: draw full image then slice
            drawFullImage()
                .then(sliceIntoGrid)
                .catch(reject);
        });
    },

    // New helper to draw grid lines on canvas for sharing
    drawGridLines(ctx, w, h, rows, cols) {
        ctx.setStrokeStyle('rgba(255, 255, 255, 0.6)');
        ctx.setLineWidth(2);

        // Horizontal lines
        for (let i = 1; i < rows; i++) {
            const y = (i / rows) * h;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Vertical lines
        for (let i = 1; i < cols; i++) {
            const x = (i / cols) * w;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
    },

    // Helper to slice one cell from the full image
    sliceCell(ctx, fullImagePath, row, col, cellWidth, cellHeight) {
        return new Promise((resolve, reject) => {
            // Clear canvas
            ctx.clearRect(0, 0, cellWidth, cellHeight);

            const sx = col * cellWidth;
            const sy = row * cellHeight;

            // Draw the slice
            ctx.drawImage(
                fullImagePath,
                sx, sy, cellWidth, cellHeight,
                0, 0, cellWidth, cellHeight
            );

            ctx.draw(false, () => {
                wx.canvasToTempFilePath({
                    x: 0,
                    y: 0,
                    width: cellWidth,
                    height: cellHeight,
                    destWidth: cellWidth,
                    destHeight: cellHeight,
                    canvasId: 'gridCanvas',
                    fileType: 'png',
                    success: (res) => {
                        resolve(res.tempFilePath);
                    },
                    fail: reject
                }, this);
            });
        });
    },

    // Save images to album
    saveToAlbum(imagePaths) {
        return new Promise((resolve, reject) => {
            // Check permission first
            wx.getSetting({
                success: (res) => {
                    if (!res.authSetting['scope.writePhotosAlbum']) {
                        wx.authorize({
                            scope: 'scope.writePhotosAlbum',
                            success: () => {
                                this.saveImagesSequentially(imagePaths).then(resolve).catch(reject);
                            },
                            fail: () => {
                                this.showAuthModal();
                                reject(new Error('Permission denied'));
                            }
                        });
                    } else {
                        this.saveImagesSequentially(imagePaths).then(resolve).catch(reject);
                    }
                }
            });
        });
    },

    // Save images one by one
    saveImagesSequentially(imagePaths) {
        return new Promise((resolve, reject) => {
            let savedCount = 0;
            const saveNext = (index = 0) => {
                if (index >= imagePaths.length) {
                    wx.showToast({
                        title: `已保存${savedCount}张图片`,
                        icon: 'success'
                    });
                    resolve();
                    return;
                }

                const filePath = imagePaths[index];
                const proceedToSave = (localPath) => {
                    wx.saveImageToPhotosAlbum({
                        filePath: localPath,
                        success: () => {
                            savedCount++;
                            saveNext(index + 1);
                        },
                        fail: (err) => {
                            console.error('Save image failed:', err);
                            saveNext(index + 1); // Continue even if one fails
                        }
                    });
                };

                if (filePath.startsWith('http')) {
                    wx.downloadFile({
                        url: filePath,
                        success: (res) => {
                            if (res.statusCode === 200) {
                                proceedToSave(res.tempFilePath);
                            } else {
                                console.error('Download failed status:', res.statusCode);
                                saveNext(index + 1);
                            }
                        },
                        fail: (err) => {
                            console.error('Download failed:', err);
                            saveNext(index + 1);
                        }
                    });
                } else {
                    proceedToSave(filePath);
                }
            };

            saveNext();
        });
    },

    showAuthModal() {
        wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启相册权限',
            confirmText: '去设置',
            success: (res) => {
                if (res.confirm) {
                    wx.openSetting();
                }
            }
        });
    },

    shareGrid() {
        if (!this.data.imagePath) {
            wx.showToast({ title: '请先选择图片', icon: 'none' });
            return;
        }

        // If already generated, show menu directly
        if (this.data.shareImagePath) {
            this.doShowShareMenu();
            return;
        }

        // Otherwise generate first
        wx.showLoading({ title: '正在准备...' });
        this.generateGridImages()
            .then(() => {
                wx.hideLoading();
                this.doShowShareMenu();
            })
            .catch(err => {
                wx.hideLoading();
                console.error('Prepare share failed:', err);
                wx.showToast({ title: '准备分享失败', icon: 'none' });
            });
    },

    doShowShareMenu() {
        wx.showShareImageMenu({
            path: this.data.shareImagePath,
            fail: (err) => {
                // If user cancels, it often fails with a "cancel" message, which we can ignore
                if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
                    console.error('Share menu error:', err);
                }
            }
        });
    },

    onShareTimeline() {
        return {
            title: '切多宫格图，让你的朋友圈更精彩！',
            query: '',
            imageUrl: this.data.shareImagePath || ''
        }
    }
});
