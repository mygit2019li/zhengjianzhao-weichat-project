const NSFW = require('../../utils/nsfw.js');
const ContentSecurity = require('../../utils/content-security.js');

Page({
    data: {
        userImage: '',
        showSourceSheet: false,
        isGenerating: false,
        resultPath: '',
        fontsLoaded: false, // Font loading status
        currentFontSize: 28, // Default font size for editor modal

        // Interactive Text Elements
        textElements: [
            { id: 'headerText', text: '义务教育课程标准实验教科书', x: 50, y: 12, fontSize: '36rpx', fontFamily: 'HYZhongSongJian', fallback: 'serif, STSong, SimSun, "宋体"', visible: true },
            { id: 'mainTitle', text: '语文', x: 50, y: 23, fontSize: '180rpx', fontFamily: 'HYChengXingJian', fallback: 'serif, STSong, SimSun, "宋体"', visible: true },
            { id: 'pinyin', text: 'YU WEN', x: 50, y: 36, fontSize: '42rpx', fontFamily: 'PlayfairDisplayRegular', fallback: 'sans-serif, Arial, Helvetica', visible: true },
            { id: 'location', text: '七年级 上册', x: 50, y: 42, fontSize: '31rpx', fontFamily: 'HYZhongSongJian', fallback: 'serif, STSong, SimSun, "宋体"', visible: true },
            { id: 'publisher', text: '教育出版社', x: 50, y: 92, fontSize: '34rpx', fontFamily: 'huaguangmaotixingkai', fallback: 'serif, STFangsong, FangSong, "仿宋"', visible: true }
        ],

        activeElementId: '',
        isEditing: false,
        editText: '',
        lastTapTime: 0,

        templates: [
            { id: 'yuwen', name: '语文', pinyin: 'YU WEN', color: '#ff6b6b' },
            { id: 'shuxue', name: '数学', pinyin: 'SHU XUE', color: '#4ecdc4' },
            { id: 'yingyu', name: '英语', pinyin: 'YING YU', color: '#45b7d1' },
            { id: 'wuli', name: '物理', pinyin: 'WU LI', color: '#96ceb4' },
            { id: 'huaxue', name: '化学', pinyin: 'HUA XUE', color: '#ffeead' },
            { id: 'shengwu', name: '生物', pinyin: 'SHENG WU', color: '#ff9ff3' },
            { id: 'lishi', name: '历史', pinyin: 'LI SHI', color: '#feca57' },
            { id: 'dili', name: '地理', pinyin: 'DI LI', color: '#48dbfb' }
        ],
        selectedTemplateId: 'yuwen'
    },

    onLoad() {
        this.loadCustomFonts({ useLite: true }).then(() => {
            this.setData({ fontsLoaded: true });
            console.log('Lite fonts loaded successfully');
            // 静默加载全量字体，为后续编辑和生成做准备
            this.loadCustomFonts({ useLite: false }).then(() => {
                console.log('Full fonts pre-loaded in background');
            });
        }).catch(err => {
            console.error('Lite font loading error:', err);
            this.setData({ fontsLoaded: true });
            // 即使轻量版失败，也尝试在后台加载全量版
            this.loadCustomFonts({ useLite: false });
        });

        if (wx.createRewardedVideoAd) {
            this.videoAd = wx.createRewardedVideoAd({
                adUnitId: 'adunit-97cf9baf1eb4988a'
            });

            this.videoAd.onLoad(() => {
                console.log('封面图 激励视频广告加载成功');
            });

            this.videoAd.onError((err) => {
                console.error('封面图 激励视频广告加载失败', err);
            });

            this.videoAd.onClose((res) => {
                if (res && res.isEnded) {
                    if (this.pendingSaveAfterAd) {
                        this.pendingSaveAfterAd = false;
                        this.saveImageInternal();
                    }
                } else {
                    this.pendingSaveAfterAd = false;
                    wx.showToast({
                        title: '请完整观看广告以保存封面图',
                        icon: 'none',
                        duration: 2000
                    });
                }
            });
        }
    },

    goBack() {
        wx.navigateBack();
    },

    loadCustomFonts(options = {}) {
        const app = getApp();
        if (app.loadGlobalFonts) {
            return app.loadGlobalFonts(options);
        }
        return Promise.resolve(true);
    },

    selectTemplate(e) {
        const id = e.currentTarget.dataset.id;
        const template = this.data.templates.find(t => t.id === id);
        const textElements = this.data.textElements.map(el => {
            if (el.id === 'mainTitle') return { ...el, text: template.name };
            if (el.id === 'pinyin') return { ...el, text: template.pinyin };
            return el;
        });
        this.setData({
            selectedTemplateId: id,
            textElements
        });
    },

    // --- Interactive Logic ---

    onTouchStart(e) {
        const id = e.currentTarget.dataset.id;
        const currentTime = e.timeStamp;
        const lastTapTime = this.data.lastTapTime;

        if (currentTime - lastTapTime < 300) {
            const element = this.data.textElements.find(el => el.id === id);
            this.setData({
                isEditing: true,
                activeElementId: id,
                editText: element.text,
                currentFontSize: parseInt(element.fontSize)
            });
            return;
        }

        this.setData({
            activeElementId: id,
            lastTapTime: currentTime
        });
        this.startSelectionTimer();

        const touch = e.touches[0];
        this.touchStartPoint = { x: touch.pageX, y: touch.pageY };
        const element = this.data.textElements.find(el => el.id === id);
        this.elementStartPos = { x: element.x, y: element.y };
        this.startSelectionTimer();
    },

    onTouchMove(e) {
        if (!this.data.activeElementId || this.data.isEditing) return;

        const touch = e.touches[0];
        const dx = touch.pageX - this.touchStartPoint.x;
        const dy = touch.pageY - this.touchStartPoint.y;

        const query = wx.createSelectorQuery();
        query.select('.preview-box').boundingClientRect(rect => {
            if (!rect) return;
            const pdx = (dx / rect.width) * 100;
            const pdy = (dy / rect.height) * 100;

            const textElements = this.data.textElements.map(el => {
                if (el.id === this.data.activeElementId) {
                    return { ...el, x: this.elementStartPos.x + pdx, y: this.elementStartPos.y + pdy };
                }
                return el;
            });
            this.setData({ textElements });
            this.startSelectionTimer();
        }).exec();
    },

    onTouchEnd() {
        this.startSelectionTimer();
    },

    startSelectionTimer() {
        if (this.selectionTimer) {
            clearTimeout(this.selectionTimer);
        }
        this.selectionTimer = setTimeout(() => {
            // Only clear selection if not currently editing
            if (!this.data.isEditing) {
                this.setData({ activeElementId: '' });
            }
        }, 2000);
    },

    doNothing() { },

    onEditInput(e) {
        this.setData({ editText: e.detail.value });
    },

    confirmEdit() {
        const { activeElementId, editText, textElements, currentFontSize } = this.data;
        const newElements = textElements.map(el => {
            if (el.id === activeElementId) {
                return { ...el, text: editText, fontSize: `${currentFontSize}rpx` };
            }
            return el;
        });
        this.setData({
            textElements: newElements,
            isEditing: false
        });
        this.startSelectionTimer();

        // Trigger loading full fonts when saving edits
        this.loadCustomFonts({ useLite: false }).then(() => {
            console.log('Full fonts loaded after edit');
        });
    },

    // Font Size Adjustment Methods
    increaseFontSize() {
        this.setData({
            currentFontSize: this.data.currentFontSize + 2
        });
    },

    decreaseFontSize() {
        if (this.data.currentFontSize > 12) { // Minimum font size limit
            this.setData({
                currentFontSize: this.data.currentFontSize - 2
            });
        }
    },

    cancelEdit() {
        this.setData({ isEditing: false });
        this.startSelectionTimer();
    },

    deleteElement(e) {
        const id = e.currentTarget.dataset.id || this.data.activeElementId;
        console.log('deleteElement triggered for id:', id);
        const textElements = this.data.textElements.map(el => {
            if (el.id === id) return { ...el, visible: false };
            return el;
        });
        this.setData({ textElements, isEditing: false, activeElementId: '' });
    },

    resetElements() {
        this.setData({
            activeElementId: '',
            textElements: [
                { id: 'headerText', text: '义务教育课程标准实验教科书', x: 50, y: 12, fontSize: '36rpx', fontFamily: 'HYZhongSongJian', fallback: 'serif, STSong, SimSun, "宋体"', visible: true },
                { id: 'mainTitle', text: '语文', x: 50, y: 23, fontSize: '180rpx', fontFamily: 'HYChengXingJian', fallback: 'serif, STSong, SimSun, "宋体"', visible: true },
                { id: 'pinyin', text: 'YU WEN', x: 50, y: 36, fontSize: '42rpx', fontFamily: 'PlayfairDisplayRegular', fallback: 'sans-serif, Arial, Helvetica', visible: true },
                { id: 'location', text: '七年级 上册', x: 50, y: 42, fontSize: '31rpx', fontFamily: 'HYZhongSongJian', fallback: 'serif, STSong, SimSun, "宋体"', visible: true },
                { id: 'publisher', text: '教育出版社', x: 50, y: 92, fontSize: '34rpx', fontFamily: 'huaguangmaotixingkai', fallback: 'serif, STFangsong, FangSong, "仿宋"', visible: true }
            ]
        });
    },

    resetMaking() {
        // 重置文本元素位置和样式，但保留已上传的图片
        const currentTemplate = this.data.templates.find(t => t.id === this.data.selectedTemplateId);

        this.setData({
            activeElementId: '',
            textElements: [
                { id: 'headerText', text: '义务教育课程标准实验教科书', x: 50, y: 12, fontSize: '36rpx', fontFamily: 'HYZhongSongJian', fallback: 'serif, STSong, SimSun, "宋体"', visible: true },
                { id: 'mainTitle', text: currentTemplate.name, x: 50, y: 23, fontSize: '180rpx', fontFamily: 'HYChengXingJian', fallback: 'serif, STSong, SimSun, "宋体"', visible: true },
                { id: 'pinyin', text: currentTemplate.pinyin, x: 50, y: 36, fontSize: '42rpx', fontFamily: 'PlayfairDisplayRegular', fallback: 'sans-serif, Arial, Helvetica', visible: true },
                { id: 'location', text: '一年级 上册', x: 50, y: 42, fontSize: '31rpx', fontFamily: 'HYZhongSongJian', fallback: 'serif, STSong, SimSun, "宋体"', visible: true },
                { id: 'publisher', text: '教育出版社', x: 50, y: 92, fontSize: '34rpx', fontFamily: 'huaguangmaotixingkai', fallback: 'serif, STFangsong, FangSong, "仿宋"', visible: true }
            ]
        });
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
        const path = (e.detail && e.detail.paths || [])[0];
        if (!path) return;
        this.setData({ showSourceSheet: false, userImage: path });
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

    async generateResult() {
        if (this.data.isGenerating) return;
        if (!this.data.userImage) {
            wx.showToast({ title: '请先上传照片', icon: 'none' });
            return;
        }
        this.setData({ isGenerating: true });
        wx.showLoading({ title: '生成中...' });

        // 内容安全：生成前检测所有可见文字
        const textList = (this.data.textElements || [])
            .filter((el) => el && el.visible !== false && el.text)
            .map((el) => el.text);
        const textPassed = await ContentSecurity.checkTextsAndAlert(textList);
        if (!textPassed) {
            this.setData({ isGenerating: false });
            wx.hideLoading();
            return;
        }

        try {
            // 确保全量字体已就绪
            console.log('检查全量字体状态...');
            const app = getApp();
            const fullFontsAlreadyLoaded = app.globalData.fullFontsLoaded;

            await this.loadCustomFonts({ useLite: false });
            this.setData({ fontsLoaded: true });

            // 如果全量字体已经预加载完成，注册通常很快，减少等待时间以提升体验
            const waitTime = fullFontsAlreadyLoaded ? 100 : 1000;
            console.log(`等待字体注册就绪 (${waitTime}ms)...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            const query = wx.createSelectorQuery();
            query.select('#stitchCanvas')
                .fields({ node: true, size: true })
                .exec((res) => {
                    if (!res[0]) {
                        throw new Error('Canvas not found');
                    }
                    const canvas = res[0].node;
                    const ctx = canvas.getContext('2d');

                    // 先验证字体是否可用，然后再绘制
                    this.verifyFontsInCanvas(canvas, ctx).then((fontsAvailable) => {
                        console.log('字体验证结果:', fontsAvailable);
                        // 即使某些字体不可用，也要继续绘制（使用系统字体后备）
                        this.drawOnCanvas(canvas, ctx);
                    }).catch(err => {
                        console.error('字体验证失败:', err);
                        // 验证失败仍尝试绘制
                        this.drawOnCanvas(canvas, ctx);
                    });
                });
        } catch (error) {
            console.error('生成失败:', error);
            this.setData({ isGenerating: false });
            wx.hideLoading();
            wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        }
    },

    // 验证Canvas中字体是否可用
    async verifyFontsInCanvas(canvas, ctx) {
        return new Promise((resolve) => {
            try {
                const testFonts = [
                    'PlayfairDisplayRegular',
                    'HYChengXingJian',
                    'HYZhongSongJian',
                    'huaguangmaotixingkai'
                ];
                const results = {};

                // 设置画布大小
                canvas.width = 100;
                canvas.height = 50;
                ctx.fillStyle = '#000';
                ctx.textBaseline = 'top';

                // 测试每种字体
                testFonts.forEach(fontFamily => {
                    try {
                        // 设置测试字体（不加引号，提升安卓兼容性）
                        ctx.font = `20px ${fontFamily}, serif`;
                        // 绘制文本
                        ctx.fillText('A', 0, 0);

                        // 获取像素数据（简单验证是否能绘制）
                        const imageData = ctx.getImageData(0, 0, 10, 10);
                        const hasPixels = Array.from(imageData.data).some(pixel => pixel > 0);

                        results[fontFamily] = hasPixels;
                        console.log(`字体 ${fontFamily} 验证结果: ${hasPixels ? '可用' : '不可用'}`);

                        // 清空画布
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    } catch (err) {
                        results[fontFamily] = false;
                        console.error(`字体 ${fontFamily} 验证失败:`, err);
                    }
                });

                resolve(results);
            } catch (err) {
                console.error('字体验证出错:', err);
                resolve(false);
            }
        });
    },



    async drawOnCanvas(canvas, ctx) {
        try {
            const userImageInfo = await this.getImageInfo(this.data.userImage);

            // Target aspect ratio (9:16)
            const targetWidth = 1080;
            const targetHeight = 1920;
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // 1. Draw User Image (Aspect Fill)
            const img = canvas.createImage();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = this.data.userImage;
            });

            const photoRatio = userImageInfo.width / userImageInfo.height;
            const targetRatio = targetWidth / targetHeight;
            let dx, dy, dWidth, dHeight;

            if (photoRatio > targetRatio) {
                dHeight = targetHeight;
                dWidth = userImageInfo.width * (targetHeight / userImageInfo.height);
                dx = -(dWidth - targetWidth) / 2;
                dy = 0;
            } else {
                dWidth = targetWidth;
                dHeight = userImageInfo.height * (targetWidth / userImageInfo.width);
                dx = 0;
                dy = -(dHeight - targetHeight) / 2;
            }
            ctx.drawImage(img, dx, dy, dWidth, dHeight);

            // Draw each visible text element
            this.data.textElements.forEach(el => {
                if (!el.visible) return;

                ctx.save();
                const realX = (el.x / 100) * targetWidth;
                const realY = (el.y / 100) * targetHeight;

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const fontSizeMatch = el.fontSize.match(/(\d+)rpx/);
                const fontSizeRpx = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 40;
                const fontSizePx = (fontSizeRpx / 750) * targetWidth;

                // Extract fontFamily correctly and clean it up
                let fontFamily = el.fontFamily.replace(/['"]/g, '').trim();

                // Debug font info
                console.log(`Canvas drawing - Text: ${el.text}, Font: ${fontFamily}, Size: ${fontSizePx}px`);

                // Use a standardized font string with fallback fonts for better compatibility
                // 为不同类型的文字设置合适的后备字体
                let fallbackFonts = 'sans-serif'; // 默认后备字体
                if (el.id === 'mainTitle' || el.id === 'headerText' || el.id === 'location') {
                    // 标题文字使用衬线字体作为后备
                    fallbackFonts = 'serif, STSong, SimSun, "宋体"';
                } else if (el.id === 'pinyin') {
                    // 拼音使用无衬线英文字体
                    fallbackFonts = 'sans-serif, Arial, Helvetica';
                } else if (el.id === 'publisher') {
                    // 出版社名称使用仿宋字体作为后备
                    fallbackFonts = 'serif, STFangsong, FangSong, "仿宋"';
                }

                // 设置字体，包含自定义字体和后备字体（不加引号，提升安卓兼容性）
                const finalFallback = el.fallback || fallbackFonts;
                ctx.font = `normal normal 400 ${Math.round(fontSizePx)}px ${fontFamily}, ${finalFallback}`;

                // 设置文本渲染质量为最高
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // 确保文本对齐方式与预览页面一致
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                if (el.id === 'mainTitle') {
                    // Use stroke effect instead of shadow for better consistency
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 8 * (targetWidth / 750); // Thicker outline for better visibility
                    ctx.lineJoin = 'round';
                    ctx.lineCap = 'round';
                    ctx.strokeText(el.text, realX, realY);
                    ctx.fillText(el.text, realX, realY);
                } else if (el.id === 'pinyin') {
                    ctx.fillStyle = '#1a1a1a';
                    const pinyinWidth = ctx.measureText(el.text).width;
                    const lineLength = pinyinWidth * 1.5; // Match 150% width in CSS
                    const lineGap = (fontSizePx / 2) + (18 * (targetWidth / 750)); // Match padding(10) + offset(8) in CSS

                    ctx.strokeStyle = '#1a1a1a';
                    ctx.lineWidth = 2 * (targetWidth / 750);

                    // Line Above
                    ctx.beginPath();
                    ctx.moveTo(realX - lineLength / 2, realY - lineGap);
                    ctx.lineTo(realX + lineLength / 2, realY - lineGap);
                    ctx.stroke();

                    // Line Below
                    ctx.beginPath();
                    ctx.moveTo(realX - lineLength / 2, realY + lineGap);
                    ctx.lineTo(realX + lineLength / 2, realY + lineGap);
                    ctx.stroke();

                    ctx.fillText(el.text, realX, realY);
                } else {
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillText(el.text, realX, realY);
                }
                ctx.restore();
            });

            const exportWidth = canvas.width || targetWidth;
            const exportHeight = canvas.height || targetHeight;

            // 6. Export (force full canvas area to避免被样式高度裁剪)
            wx.canvasToTempFilePath({
                canvas: canvas,
                x: 0,
                y: 0,
                width: exportWidth,
                height: exportHeight,
                destWidth: exportWidth,
                destHeight: exportHeight,
                success: (res) => {
                    this.setData({ resultPath: res.tempFilePath, isGenerating: false });
                    wx.hideLoading();
                    console.log('封面生成成功，临时文件路径:', res.tempFilePath);
                },
                fail: (err) => {
                    console.error('Canvas导出失败:', err);
                    this.setData({ isGenerating: false });
                    wx.hideLoading();
                    wx.showToast({ title: '生成失败，请重试', icon: 'none' });
                }
            });

        } catch (err) {
            console.error('绘制Canvas失败:', err);
            this.setData({ isGenerating: false });
            wx.hideLoading();
            wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        }
    },

    getImageInfo(src) {
        return new Promise((resolve, reject) => {
            wx.getImageInfo({ src, success: resolve, fail: reject });
        });
    },

    saveImage() {
        if (!this.data.resultPath) return;

        if (this.videoAd) {
            this.pendingSaveAfterAd = true;
            this.videoAd.show().catch(() => {
                this.videoAd.load()
                    .then(() => this.videoAd.show())
                    .catch(err => {
                        console.error('封面图 激励视频广告显示失败', err);
                        this.pendingSaveAfterAd = false;
                        this.saveImageInternal();
                    });
            });
        } else {
            this.saveImageInternal();
        }
    },

    saveImageInternal() {
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

    shareImage() {
        if (!this.data.resultPath) return;
        wx.showShareImageMenu({
            path: this.data.resultPath,
            fail: (err) => {
                console.error('Share failed:', err);
            }
        });
    },

    onShareAppMessage() {
        return {
            title: '快来制作你的专属课本封面吧！',
            path: '/pages/textbook/index',
            imageUrl: this.data.resultPath || ''
        };
    },

    onShareTimeline() {
        return {
            title: '快来制作你的专属课本封面吧！',
            query: '',
            imageUrl: this.data.resultPath || ''
        };
    },

    previewResult() {
        wx.previewImage({ urls: [this.data.resultPath] });
    },

    closeResult() {
        this.setData({ resultPath: '' });
    }
});
