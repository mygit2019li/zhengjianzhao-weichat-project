// pages/jiugongge/index.js
const { shapes, getShapePath } = require('../../utils/shapes.js');
const NSFW = require('../../utils/nsfw.js');
const { request, BASE_URL } = require('../../utils/request.js');

Page({
    data: {
        // Image data
        imagePath: '',
        showSourceSheet: false,
        imageWidth: 0,
        imageHeight: 0,

        // Crop and transform
        cropX: 0,
        cropY: 0,
        imageScale: 1,

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
        touchStart: {},
        isMoving: false,
        isScaling: false,
        initialDistance: 0,
        initialScale: 1,
        initialCropX: 0,
        initialCropY: 0,
        fullMaskedImagePath: '', // Clean masked image for slicing
        shareImagePath: '', // Masked image with grid lines for sharing

        // Main Tabs
        activeTab: 'copy', // 'grid' for cut-nine, 'copy' for copywriting
        copyCategories: [],
        currentCopyCategory: '',
        displayCopyItems: [],
        momentsData: [] // Store all category and items
    },

    onLoad(options) {
        this.setData({ activeTab: 'copy' });
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
            withShareTicket: true,
            menus: ['shareAppMessage', 'shareTimeline']
        });

        // Load default image
        this.initCropArea('/images/grid_default.png');

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
            { id: '3x3', rows: 3, cols: 3, label: '' },
            { id: '1x3', rows: 1, cols: 3, label: '' }, // 3 cols, 1 row (Panorama)
            { id: '2x2', rows: 2, cols: 2, label: '' },
            { id: '1x2', rows: 1, cols: 2, label: '' }, // 2 cols, 1 row
            { id: '2x3', rows: 3, cols: 2, label: '' }
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
                            
                            // 预加载图片获取尺寸信息（用于单图展示）
                            momentsData.forEach(category => {
                                category.items.forEach(item => {
                                    if (item.images && item.images.length === 1) {
                                        wx.getImageInfo({
                                            src: item.images[0],
                                            success: (res) => {
                                                item.imageRatio = res.width / res.height;
                                                // 如果图片已加载，触发一次更新
                                                if (this.data.displayCopyItems.includes(item)) {
                                                    this.setData({
                                                        displayCopyItems: [...this.data.displayCopyItems]
                                                    });
                                                }
                                            }
                                        });
                                    }
                                });
                            });

                            // Process items to check for text length
                            momentsData.forEach(category => {
                                category.items.forEach(item => {
                                    item.isExpanded = false;
                                    const text = String(item.text || '');
                                    const normalizedText = text.trim();
                                    item.hasText = normalizedText.length > 0;
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
        if (!content || !String(content).trim()) {
            wx.showToast({
                title: '暂无可复制文案',
                icon: 'none'
            });
            return;
        }
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

    // Choose image from album（唤起统一来源弹窗）
    chooseImage() {
        this.setData({ showSourceSheet: true });
    },

    closeSourceSheet() {
        this.setData({ showSourceSheet: false });
    },

    // 统一弹窗选图完成（组件已做大小校验 + 鉴黄）
    onSourceChosen(e) {
        const path = (e.detail && e.detail.paths || [])[0];
        if (!path) return;
        this.setData({ showSourceSheet: false });
        this.initCropArea(path);
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

                // Calculate initial scale to fit
                const scale = Math.max(
                    resultSize / imgWidth,
                    resultSize / imgHeight
                );

                // Center the image
                const scaledWidth = imgWidth * scale;
                const scaledHeight = imgHeight * scale;
                const cropX = Math.max(0, (scaledWidth - resultSize) / 2 / scale);
                const cropY = Math.max(0, (scaledHeight - resultSize) / 2 / scale);

                this.setData({
                    imagePath,
                    imageWidth: imgWidth,
                    imageHeight: imgHeight,
                    imageScale: scale,
                    cropX,
                    cropY
                });
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

    // Touch event handlers for drag and pinch-zoom
    startTouch(e) {
        if (e.touches.length === 1) {
            // Single touch - drag
            this.setData({
                isMoving: true,
                touchStart: {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                },
                initialCropX: this.data.cropX,
                initialCropY: this.data.cropY
            });
        } else if (e.touches.length === 2) {
            // Two touches - pinch zoom
            const distance = this.getDistance(e.touches[0], e.touches[1]);
            const midpoint = this.getMidpoint(e.touches[0], e.touches[1]);

            this.setData({
                isScaling: true,
                isMoving: false,
                initialDistance: distance,
                initialScale: this.data.imageScale,
                touchStart: midpoint,
                initialCropX: this.data.cropX,
                initialCropY: this.data.cropY
            });
        }
    },

    onTouchMove(e) {
        if (this.data.isScaling && e.touches.length === 2) {
            // Pinch zoom
            const distance = this.getDistance(e.touches[0], e.touches[1]);
            const scale = this.data.initialScale * (distance / this.data.initialDistance);

            // Limit scale
            const newScale = Math.max(0.5, Math.min(5, scale));

            this.updateCropPosition(this.data.cropX, this.data.cropY, newScale);
        } else if (this.data.isMoving && e.touches.length === 1) {
            // Drag
            const deltaX = e.touches[0].clientX - this.data.touchStart.x;
            const deltaY = e.touches[0].clientY - this.data.touchStart.y;

            const newCropX = this.data.initialCropX - deltaX / this.data.imageScale;
            const newCropY = this.data.initialCropY - deltaY / this.data.imageScale;

            this.updateCropPosition(newCropX, newCropY, this.data.imageScale);
        }
    },

    updateCropPosition(x, y, scale) {
        const { imageWidth, imageHeight, resultSize } = this.data;

        // Calculate boundaries
        const maxCropX = Math.max(0, imageWidth - resultSize / scale);
        const maxCropY = Math.max(0, imageHeight - resultSize / scale);

        // Clamp values
        const cropX = Math.max(0, Math.min(maxCropX, x));
        const cropY = Math.max(0, Math.min(maxCropY, y));

        this.setData({
            cropX,
            cropY,
            imageScale: scale
        });
    },

    endTouch() {
        this.setData({
            isMoving: false,
            isScaling: false
        });
    },

    getDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    },

    getMidpoint(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
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

    // Generate grid images (dynamic size)
    // Generate grid images (dynamic size)
    generateGridImages() {
        return new Promise((resolve, reject) => {
            const { imagePath, cropX, cropY, imageScale, resultSize, selectedShape, gridRows, gridCols } = this.data;
            const cellWidth = resultSize / gridCols;
            const cellHeight = resultSize / gridRows;
            const imagePaths = [];

            // Create canvas context  
            const ctx = wx.createCanvasContext('gridCanvas', this);

            // Step 1: Draw the full image with mask applied
            const drawFullImage = () => {
                return new Promise((resolveImg, rejectImg) => {
                    const shape = shapes.find(s => s.id === selectedShape);

                    // Helper to proceed with drawing after potential download
                    const proceedToDraw = (maskImagePath = null) => {
                        // Clear canvas
                        ctx.clearRect(0, 0, resultSize, resultSize);

                        // Draw the full cropped image
                        const sourceWidth = resultSize / imageScale;
                        const sourceHeight = resultSize / imageScale;

                        ctx.drawImage(
                            imagePath,
                            cropX, cropY, sourceWidth, sourceHeight,
                            0, 0, resultSize, resultSize
                        );

                        // Apply mask to the ENTIRE image if not square
                        if (selectedShape !== 'square') {
                            ctx.save();

                            if (selectedShape === 'circle') {
                                // Circle: Use destination-out to remove the OUTSIDE (corners)
                                // We draw a full Source-Over rectangle with a Hole (the circle)
                                ctx.globalCompositeOperation = 'destination-out';
                                ctx.setFillStyle('#000000');
                                ctx.beginPath();
                                ctx.rect(0, 0, resultSize, resultSize);
                                ctx.arc(resultSize / 2, resultSize / 2, resultSize / 2, 0, 2 * Math.PI, true);
                                ctx.fill();
                            } else if (maskImagePath) {
                                // Image Masks: These are likely "Inverted Masks" (Opaque Outside, Transparent Inside)
                                // We use destination-out to REMOVE the opaque (outside) parts of the image
                                ctx.globalCompositeOperation = 'destination-out';
                                ctx.drawImage(maskImagePath, 0, 0, resultSize, resultSize);
                            }

                            ctx.restore();
                            ctx.globalCompositeOperation = 'source-over';

                            // Add white background underneath
                            ctx.globalCompositeOperation = 'destination-over';
                            ctx.setFillStyle('#ffffff');
                            ctx.fillRect(0, 0, resultSize, resultSize);
                            ctx.globalCompositeOperation = 'source-over';
                        }

                        // Draw and export the full image
                        ctx.draw(false, () => {
                            wx.canvasToTempFilePath({
                                x: 0,
                                y: 0,
                                width: resultSize,
                                height: resultSize,
                                destWidth: resultSize * this.data.pixelRatio,
                                destHeight: resultSize * this.data.pixelRatio,
                                canvasId: 'gridCanvas',
                                fileType: 'png',
                                success: (res) => {
                                    this.setData({ fullMaskedImagePath: res.tempFilePath });

                                    // Step 1.5: Draw grid lines on top for the share preview
                                    this.drawGridLines(ctx, resultSize, gridRows, gridCols);

                                    ctx.draw(true, () => {
                                        wx.canvasToTempFilePath({
                                            x: 0, y: 0,
                                            width: resultSize, height: resultSize,
                                            destWidth: resultSize * this.data.pixelRatio,
                                            destHeight: resultSize * this.data.pixelRatio,
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
                    this.sliceCell(ctx, fullImagePath, row, col, cellWidth, cellHeight, resultSize)
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
    drawGridLines(ctx, size, rows, cols) {
        ctx.setStrokeStyle('rgba(255, 255, 255, 0.6)');
        ctx.setLineWidth(2);

        // Horizontal lines
        for (let i = 1; i < rows; i++) {
            const y = (i / rows) * size;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y);
            ctx.stroke();
        }

        // Vertical lines
        for (let i = 1; i < cols; i++) {
            const x = (i / cols) * size;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
        }
    },

    // Helper to slice one cell from the full image
    sliceCell(ctx, fullImagePath, row, col, cellWidth, cellHeight, resultSize) {
        return new Promise((resolve, reject) => {
            // Clear canvas
            ctx.clearRect(0, 0, cellWidth, cellHeight);

            // Calculate source position in the full image
            // Note: fullImagePath is a file generated with pixelRatio scaling
            // So we need to scale our source coordinates by pixelRatio
            const dpr = this.data.pixelRatio;
            const sx = col * cellWidth * dpr;
            const sy = row * cellHeight * dpr;
            const sWidth = cellWidth * dpr;
            const sHeight = cellHeight * dpr;

            // Draw the slice
            ctx.drawImage(
                fullImagePath,
                sx, sy, sWidth, sHeight,
                0, 0, cellWidth, cellHeight
            );

            ctx.draw(false, () => {
                wx.canvasToTempFilePath({
                    x: 0,
                    y: 0,
                    width: cellWidth,
                    height: cellHeight,
                    destWidth: cellWidth * dpr,
                    destHeight: cellHeight * dpr,
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

    onShareAppMessage() {
        return {
            title: '切多宫格图，让你的朋友圈更精彩！',
            path: '/pages/jiugongge/index',
            imageUrl: this.data.shareImagePath || ''
        };
    },

    onShareTimeline() {
        return {
            title: '切多宫格图，让你的朋友圈更精彩！',
            query: '',
            imageUrl: this.data.shareImagePath || ''
        }
    }
});
