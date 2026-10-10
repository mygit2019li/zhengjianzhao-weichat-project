const NSFW = require('../../../utils/nsfw.js');

Page({
  data: {
    title: '切多宫格图结果',
    rows: 3,
    cols: 3,
    items: [],
    selectedIndex: 0,
    toolOverlayIndex: -1,
    toolPanelVisible: false,
    selectedItem: null,

    isSorting: false,
    dragFromIndex: -1,
    gridRects: [],

    canvasWidth: 300,
    canvasHeight: 300
  },

  onUnload() {
    this.clearToolOverlayTimer();
  },

  onLoad() {
    const app = getApp();
    const result = app.globalData && app.globalData.gridCutResult;

    if (!result || !Array.isArray(result.images) || result.images.length === 0) {
      wx.showToast({ title: '没有可编辑的切图结果', icon: 'none' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
      return;
    }

    const rows = Number(result.rows) || 3;
    const cols = Number(result.cols) || 3;
    const title = result.title || `${rows}x${cols}宫格切图`;
    const cellRatio = result.cellRatio || 1; // 单元格宽高比 (H/W)
    const items = result.images.map((path, index) => ({
      id: `${Date.now()}_${index}`,
      path,
      rotate: 0,
      scale: 1,
      offsetX: 0,
      offsetY: 0
    }));

    this.setData({
      title,
      rows,
      cols,
      cellRatio,
      items,
      selectedIndex: 0
    }, () => {
      this.computeGridScale();
    });
  },

  computeGridScale() {
    const query = wx.createSelectorQuery().in(this);
    query.select('.grid').boundingClientRect();
    query.selectViewport().boundingClientRect();
    query.exec((res) => {
      const gridRect = res[0];
      const viewportRect = res[1];
      if (!gridRect || !viewportRect) return;

      // 计算可用高度（减去 header、footer 和 padding 的估算值）
      const headerHeight = 140; // rpx 估算值
      const footerHeight = 140; // rpx 估算值
      const padding = 60; // rpx 估算值
      const windowInfo = wx.getWindowInfo();
      const rpxToPx = windowInfo.windowWidth / 750;
      const availableHeight = viewportRect.height - (headerHeight + footerHeight + padding) * rpxToPx;

      // 如果 grid 实际高度超出可用高度，计算缩放比例
      if (gridRect.height > availableHeight) {
        const scale = availableHeight / gridRect.height;
        // 负 margin 补偿 transform: scale() 不改变文档流导致的多余空间
        const marginBottom = -Math.round(gridRect.height * (1 - scale));
        this.setData({ gridScale: scale, gridMarginBottom: marginBottom });
      } else {
        this.setData({ gridScale: 1, gridMarginBottom: 0 });
      }
    });
  },

  selectCell(e) {
    if (this.suppressTapAfterSort) return;
    if (this.data.isSorting) return;
    const index = Number(e.currentTarget.dataset.index);
    this.showImageTools(index);
  },

  showImageTools(index) {
    const selectedItem = this.data.items[index] || null;
    this.setData({
      selectedIndex: index,
      toolOverlayIndex: index,
      toolPanelVisible: true,
      selectedItem
    });
  },

  hideImageTools() {
    this.clearToolOverlayTimer();
    this.setData({
      toolOverlayIndex: -1,
      toolPanelVisible: false
    });
  },

  scheduleToolOverlayHide() {
    this.clearToolOverlayTimer();
    this.toolOverlayTimer = setTimeout(() => {
      this.setData({ toolOverlayIndex: -1 });
    }, 5000);
  },

  clearToolOverlayTimer() {
    if (this.toolOverlayTimer) {
      clearTimeout(this.toolOverlayTimer);
      this.toolOverlayTimer = null;
    }
  },

  stopToolMaskTap() {
  },

  preventModalMove() {
  },

  onSortStart(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.suppressTapAfterSort = true;
    this.setData({
      isSorting: true,
      dragFromIndex: index,
      selectedIndex: index,
      toolOverlayIndex: -1,
      toolPanelVisible: false
    });
    this.clearToolOverlayTimer();
    this.cacheGridRects();
    wx.vibrateShort({ type: 'light' });
  },

  onSortMove(e) {
    if (!this.data.isSorting || !e.touches || !e.touches[0]) return;

    const touch = e.touches[0];
    const targetIndex = this.findGridIndexByPoint(touch.clientX, touch.clientY);

    if (targetIndex < 0 || targetIndex === this.data.dragFromIndex) return;
    this.swapItem(this.data.dragFromIndex, targetIndex);
    this.setData({
      dragFromIndex: targetIndex,
      selectedIndex: targetIndex
    });
  },

  onSortEnd() {
    if (!this.data.isSorting) return;
    this.setData({
      isSorting: false,
      dragFromIndex: -1,
      gridRects: []
    });
    setTimeout(() => {
      this.suppressTapAfterSort = false;
    }, 350);
  },

  cacheGridRects() {
    wx.createSelectorQuery()
      .in(this)
      .selectAll('.grid-item')
      .boundingClientRect((rects) => {
        this.setData({ gridRects: rects || [] });
      })
      .exec();
  },

  findGridIndexByPoint(x, y) {
    const rects = this.data.gridRects || [];
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (!rect) continue;
      const inX = x >= rect.left && x <= rect.right;
      const inY = y >= rect.top && y <= rect.bottom;
      if (inX && inY) return i;
    }
    return -1;
  },

  swapItem(fromIndex, toIndex) {
    const items = [...this.data.items];
    const temp = items[fromIndex];
    items[fromIndex] = items[toIndex];
    items[toIndex] = temp;
    this.setData({ items });
  },

  rotateSelected() {
    const index = this.data.selectedIndex;
    if (!this.data.items[index]) return;
    const next = ((this.data.items[index].rotate || 0) + 45) % 360;
    const rad = (next * Math.PI) / 180;
    // Auto compensate scale after rotation so the tile keeps filled.
    const autoScale = Number((Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad))).toFixed(3));
    this.setData({
      [`items[${index}].rotate`]: next,
      [`items[${index}].scale`]: autoScale,
      selectedItem: {
        ...this.data.items[index],
        rotate: next,
        scale: autoScale
      }
    });
  },

  resetSelected() {
    const index = this.data.selectedIndex;
    if (!this.data.items[index]) return;
    this.setData({
      [`items[${index}].rotate`]: 0,
      [`items[${index}].scale`]: 1,
      [`items[${index}].offsetX`]: 0,
      [`items[${index}].offsetY`]: 0,
      selectedItem: {
        ...this.data.items[index],
        rotate: 0,
        scale: 1,
        offsetX: 0,
        offsetY: 0
      }
    });
  },

  replaceSelectedImage() {
    const index = this.data.selectedIndex;
    if (!this.data.items[index]) return;
    this.clearToolOverlayTimer();
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        const isSafe = await NSFW.checkAndAlert(tempFilePath, true);
        if (!isSafe) return;
        this.setData({
          [`items[${index}].path`]: tempFilePath,
          [`items[${index}].rotate`]: 0,
          [`items[${index}].scale`]: 1,
          [`items[${index}].offsetX`]: 0,
          [`items[${index}].offsetY`]: 0,
          selectedItem: {
            ...this.data.items[index],
            path: tempFilePath,
            rotate: 0,
            scale: 1,
            offsetX: 0,
            offsetY: 0
          }
        });
        wx.showToast({ title: '已替换图片', icon: 'success' });
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') > -1) {
          return;
        }
        console.error('Replace image failed:', err);
        wx.showToast({ title: '替换失败', icon: 'none' });
      }
    });
  },

  oneKeySave() {
    const images = this.data.items || [];
    if (!images.length) {
      wx.showToast({ title: '没有可保存的图片', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    this.exportEditedImages()
      .then((paths) => this.saveToAlbum(paths))
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('Save all failed:', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
  },

  goSharePage() {
    const images = this.data.items || [];
    if (!images.length) {
      wx.showToast({ title: '没有可分享的图片', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '准备分享...' });
    this.exportEditedImages()
      .then((paths) => this.createShareGridImage(paths))
      .then((shareImagePath) => {
        wx.hideLoading();
        this.shareImageToFriend(shareImagePath);
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('Prepare share failed:', err);
        wx.showToast({ title: '准备分享失败', icon: 'none' });
      });
  },

  createShareGridImage(imagePaths) {
    return new Promise((resolve, reject) => {
      const { rows, cols, cellRatio } = this.data;
      const cellW = 360;
      const cellH = cellW * cellRatio;
      const canvasWidth = cols * cellW;
      const canvasHeight = rows * cellH;
      this.prepareShareImagePaths(imagePaths)
        .then((readyPaths) => {
          const ctx = wx.createCanvasContext('shareCanvas', this);
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.setFillStyle('#ffffff');
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          readyPaths.forEach((path, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = col * cellW;
            const y = row * cellH;
            ctx.drawImage(path, x, y, cellW, cellH);
          });

          ctx.setStrokeStyle('rgba(255, 255, 255, 0.9)');
          ctx.setLineWidth(2);
          for (let i = 1; i < rows; i++) {
            const y = i * cellH;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
          }
          for (let i = 1; i < cols; i++) {
            const x = i * cellW;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
          }

          ctx.draw(false, () => {
            wx.canvasToTempFilePath({
              canvasId: 'shareCanvas',
              x: 0,
              y: 0,
              width: canvasWidth,
              height: canvasHeight,
              destWidth: canvasWidth,
              destHeight: canvasHeight,
              fileType: 'png',
              success: (res) => resolve(res.tempFilePath),
              fail: reject
            }, this);
          });
        })
        .catch(reject);
    });
  },

  prepareShareImagePaths(imagePaths) {
    const tasks = (imagePaths || []).map((path) => this.ensureLocalDrawablePath(path));
    return Promise.all(tasks);
  },

  ensureLocalDrawablePath(path) {
    return new Promise((resolve) => {
      if (!path) {
        resolve(path);
        return;
      }

      const useLocal = (localPath) => {
        wx.getImageInfo({
          src: localPath,
          success: (info) => resolve(info.path || localPath),
          fail: () => resolve(localPath)
        });
      };

      if (String(path).startsWith('http')) {
        wx.downloadFile({
          url: path,
          success: (res) => {
            if (res.statusCode === 200 && res.tempFilePath) {
              useLocal(res.tempFilePath);
            } else {
              resolve(path);
            }
          },
          fail: () => resolve(path)
        });
        return;
      }

      useLocal(path);
    });
  },

  shareImageToFriend(path) {
    if (!wx.showShareImageMenu) {
      wx.showToast({ title: '当前微信版本不支持图片分享', icon: 'none' });
      return;
    }

    wx.showShareImageMenu({
      path,
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') > -1) return;
        console.error('Share image failed:', err);
        wx.showToast({ title: '分享失败', icon: 'none' });
      }
    });
  },

  exportEditedImages() {
    const tasks = this.data.items || [];
    const output = [];

    return tasks.reduce((chain, item) => {
      return chain.then(() => this.renderEditedItem(item).then((path) => {
        output.push(path);
      }));
    }, Promise.resolve()).then(() => output);
  },

  renderEditedItem(item) {
    return new Promise((resolve, reject) => {
      // 如果没有编辑（无旋转、缩放、偏移），直接返回原图
      const hasEdit = (item.rotate || 0) !== 0 || (item.scale || 1) !== 1 || (item.offsetX || 0) !== 0 || (item.offsetY || 0) !== 0;
      if (!hasEdit) {
        resolve(item.path);
        return;
      }

      wx.getImageInfo({
        src: item.path,
        success: (info) => {
          const { cellRatio } = this.data;
          // 使用原始图片尺寸，保持与切图时相同的比例
          let width, height;
          // cellRatio = H / W
          if (cellRatio >= 1) {
            // 竖向或正方形 (H >= W): 以高度为基准
            height = info.height;
            width = Math.floor(height / cellRatio);
          } else {
            // 横向 (H < W): 以宽度为基准
            width = info.width;
            height = Math.floor(width * cellRatio);
          }
          this.setData({ canvasWidth: width, canvasHeight: height }, () => {
            const ctx = wx.createCanvasContext('editCanvas', this);
            ctx.clearRect(0, 0, width, height);
            ctx.setFillStyle('#ffffff');
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            ctx.translate(width / 2 + (item.offsetX || 0), height / 2 + (item.offsetY || 0));
            ctx.rotate(((item.rotate || 0) * Math.PI) / 180);
            const scale = item.scale || 1;
            ctx.scale(scale, scale);
            const drawSize = this.getAspectFillDrawRect(info.width, info.height, width, height);
            ctx.drawImage(item.path, drawSize.x, drawSize.y, drawSize.width, drawSize.height);
            ctx.restore();

            ctx.draw(false, () => {
              wx.canvasToTempFilePath({
                canvasId: 'editCanvas',
                x: 0,
                y: 0,
                width,
                height,
                destWidth: width,
                destHeight: height,
                fileType: 'png',
                success: (res) => resolve(res.tempFilePath),
                fail: reject
              }, this);
            });
          });
        },
        fail: reject
      });
    });
  },

  getAspectFillDrawRect(imageWidth, imageHeight, targetWidth, targetHeight) {
    const scale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    return {
      x: -width / 2,
      y: -height / 2,
      width,
      height
    };
  },

  saveToAlbum(imagePaths) {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.writePhotosAlbum']) {
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success: () => this.saveImagesSequentially(imagePaths).then(resolve).catch(reject),
              fail: () => {
                wx.showModal({
                  title: '需要相册权限',
                  content: '请在设置中开启相册权限',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) wx.openSetting();
                  }
                });
                reject(new Error('Permission denied'));
              }
            });
            return;
          }

          this.saveImagesSequentially(imagePaths).then(resolve).catch(reject);
        }
      });
    });
  },

  saveImagesSequentially(imagePaths) {
    return new Promise((resolve) => {
      let index = 0;
      const saveNext = () => {
        if (index >= imagePaths.length) {
          resolve();
          return;
        }

        const filePath = imagePaths[index];
        index += 1;

        wx.saveImageToPhotosAlbum({
          filePath,
          success: saveNext,
          fail: (err) => {
            console.error('Save image failed:', err);
            saveNext();
          }
        });
      };

      saveNext();
    });
  }
});
