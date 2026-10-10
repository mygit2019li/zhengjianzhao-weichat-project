const NSFW = require('../../../utils/nsfw.js');

Page({
    data: {
        copyText: '',
        images: [],
        showActionSheet: false,
        currentGridIndex: -1,
        canvasWidth: 300,
        canvasHeight: 300
    },

    onLoad(options) {
        const item = getApp().globalData?.selectedMomentItem;
        if (item) {
            let images = item.images || [];
            if (images.length === 0) {
                images = new Array(9).fill('');
            }
            this.setData({
                copyText: item.text,
                images: images
            });
        }
    },

    onItemTap(e) {
        const index = e.currentTarget.dataset.index;
        const images = this.data.images.filter(img => img !== '');
        
        // 如果点击的是空占位符，显示操作菜单
        if (!this.data.images[index]) {
            this.setData({
                showActionSheet: true,
                currentGridIndex: index
            });
            return;
        }
        
        // 否则预览图片
        wx.previewImage({
            current: this.data.images[index],
            urls: images
        });
    },
    
    previewImage(e) {
        const index = e.currentTarget.dataset.index;
        const images = this.data.images.filter(img => img !== '');
        wx.previewImage({
            current: this.data.images[index],
            urls: images
        });
    },
    
    showImageAction(e) {
        const index = e.currentTarget.dataset.index;
        if (!this.data.images[index]) return;
        
        this.setData({
            showActionSheet: true,
            currentGridIndex: index
        });
    },

    hideActionSheet() {
        this.setData({
            showActionSheet: false
        });
    },

    replaceImage() {
        const index = this.data.currentGridIndex;
        this.hideActionSheet();

        wx.chooseImage({
            count: 1,
            sizeType: ['original', 'compressed'],
            sourceType: ['album', 'camera'],
            success: async (res) => {
                const tempFilePath = res.tempFilePaths[0];
                const isSafe = await NSFW.checkAndAlert(tempFilePath, true);
                if (!isSafe) return;
                const images = this.data.images;
                images[index] = tempFilePath;
                this.setData({ images });
            }
        });
    },

    rotateImage() {
        const index = this.data.currentGridIndex;
        const imagePath = this.data.images[index];
        if (!imagePath) return;

        this.hideActionSheet();
        wx.showLoading({ title: '处理中...' });

        wx.getImageInfo({
            src: imagePath,
            success: (info) => {
                const { width, height, path } = info;

                // For 90 degree rotation, swap width and height
                const rotatedWidth = height;
                const rotatedHeight = width;

                this.setData({
                    canvasWidth: rotatedWidth,
                    canvasHeight: rotatedHeight
                }, () => {
                    const ctx = wx.createCanvasContext('editCanvas');

                    // Move to center of the NEW (rotated) canvas
                    ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
                    ctx.rotate(90 * Math.PI / 180);
                    // Draw image at center of rotation
                    ctx.drawImage(path, -width / 2, -height / 2, width, height);

                    ctx.draw(false, () => {
                        wx.canvasToTempFilePath({
                            canvasId: 'editCanvas',
                            destWidth: rotatedWidth,
                            destHeight: rotatedHeight,
                            success: (res) => {
                                const images = this.data.images;
                                images[index] = res.tempFilePath;
                                this.setData({ images });
                                wx.hideLoading();
                            },
                            fail: (err) => {
                                console.error('Rotate failed:', err);
                                wx.hideLoading();
                                wx.showToast({ title: '旋转失败', icon: 'none' });
                            }
                        });
                    });
                });
            },
            fail: (err) => {
                console.error('Get image info failed:', err);
                wx.hideLoading();
            }
        });
    },

    copyToClipboard() {
        wx.setClipboardData({
            data: this.data.copyText,
            success: () => {
                wx.showToast({ title: '复制成功', icon: 'success' });
            }
        });
    },

    saveAll() {
        const imagesToSave = this.data.images.filter(img => img !== '');
        if (imagesToSave.length === 0) {
            wx.showToast({ title: '没有可保存的图片', icon: 'none' });
            return;
        }

        wx.showLoading({ title: '保存中...' });
        this.saveImagesSequentially(imagesToSave);
    },

    saveImagesSequentially(imagePaths) {
        let savedCount = 0;
        const saveNext = (index = 0) => {
            if (index >= imagePaths.length) {
                wx.hideLoading();
                wx.showModal({
                    title: '保存成功',
                    content: `已成功保存${savedCount}张图片到相册`,
                    showCancel: false
                });
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
                        console.error('Save failed:', err);
                        saveNext(index + 1);
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

        wx.getSetting({
            success: (res) => {
                if (!res.authSetting['scope.writePhotosAlbum']) {
                    wx.authorize({
                        scope: 'scope.writePhotosAlbum',
                        success: () => saveNext(),
                        fail: () => {
                            wx.hideLoading();
                            wx.showModal({
                                title: '提示',
                                content: '需要相册权限才能保存图片',
                                showCancel: false
                            });
                        }
                    });
                } else {
                    saveNext();
                }
            }
        });
    }
});
