// pages/compress/index.js
const MAX_CANVAS_DIM = 4096;

Page({
  data: {
    imageList: [], // Array of { id, path, originalSize, originalSizeStr, compressedPath, compressedSize, compressedSizeStr, status, ratio }
    mode: 'target', // target: 指定大小 | quality: 按质量
    quality: 80,
    targetValue: '',
    targetUnit: 'KB', // KB | MB
    resizeMode: 'both', // both | width | height | percent
    resizeOpen: true, // 尺寸调整面板默认展开
    resizeWidth: '',
    resizeHeight: '',
    resizePercent: '100',
    keepRatio: true,
    isCompressing: false
  },

  runId: 0,

  onLoad(options) {
    if (options.imagePath) {
      this.addImages([options.imagePath]);
    }
  },

  onUnload() {
    this.runId++;
    wx.hideLoading();
  },

  // ---------- 设置项 ----------

  setMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.mode) return;
    this.setData({ mode });
    this.recompressAll();
  },

  onQualityChange(e) {
    this.setData({ quality: e.detail.value });
    this.recompressAll();
  },

  onTargetInput(e) {
    this.setData({ targetValue: e.detail.value });
  },

  onTargetBlur() {
    this.recompressAll();
  },

  setTargetUnit(e) {
    const unit = e.currentTarget.dataset.unit;
    if (unit === this.data.targetUnit) return;
    this.setData({ targetUnit: unit });
    this.recompressAll();
  },

  setResizeMode(e) {
    const resizeMode = e.currentTarget.dataset.mode;
    if (resizeMode === this.data.resizeMode) return;
    this.setData({ resizeMode });
    this.recompressAll();
  },

  toggleResizeOpen() {
    this.setData({ resizeOpen: !this.data.resizeOpen });
  },

  resetResize() {
    this.setData({
      resizeMode: 'both',
      resizeWidth: this.firstWidth ? String(this.firstWidth) : '',
      resizeHeight: this.firstHeight ? String(this.firstHeight) : '',
      resizePercent: '100',
      keepRatio: true
    });
    this.recompressAll();
  },

  onResizeInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onResizeBlur() {
    this.recompressAll();
  },

  toggleKeepRatio(e) {
    this.setData({ keepRatio: e.detail.value.length > 0 });
    this.recompressAll();
  },

  getTargetBytes() {
    const val = parseFloat(this.data.targetValue);
    if (!val || val <= 0) return 0;
    return Math.round(val * 1024 * (this.data.targetUnit === 'MB' ? 1024 : 1));
  },

  validateSettings() {
    if (this.data.mode === 'target' && !this.getTargetBytes()) {
      wx.showToast({ title: '请输入目标大小', icon: 'none' });
      return false;
    }
    const r = this.data.resizeMode;
    if (r === 'width' || r === 'height' || r === 'both') {
      const w = parseInt(this.data.resizeWidth);
      const h = parseInt(this.data.resizeHeight);
      const wOk = r !== 'width' && r !== 'both' ? true : (w > 0);
      const hOk = r !== 'height' && r !== 'both' ? true : (h > 0);
      if (!wOk || !hOk) {
        wx.showToast({ title: '请输入有效的宽/高', icon: 'none' });
        return false;
      }
    }
    if (r === 'percent') {
      const p = parseFloat(this.data.resizePercent);
      if (!p || p <= 0) {
        wx.showToast({ title: '请输入有效百分比', icon: 'none' });
        return false;
      }
    }
    return true;
  },

  recompressAll() {
    if (this.data.imageList.length === 0) return;
    if (!this.validateSettings()) return;
    this.runId++;
    const list = this.data.imageList.map(item => ({ ...item, status: 'waiting' }));
    this.setData({ imageList: list });
    this.processQueue();
  },

  // ---------- 图片队列 ----------

  chooseImage() {
    const currentCount = this.data.imageList.length;
    const maxCount = 20;
    if (currentCount >= maxCount) {
      wx.showToast({ title: '最多支持20张图片', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: maxCount - currentCount,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.addImages(res.tempFilePaths);
      }
    });
  },

  addImages(paths) {
    const newItems = paths.map(path => ({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      path: path,
      originalSize: 0,
      originalSizeStr: '...',
      compressedPath: '',
      compressedSize: 0,
      compressedSizeStr: '',
      status: 'waiting', // waiting, compressing, success, fail
      ratio: 0
    }));

    const list = [...this.data.imageList, ...newItems];
    this.setData({ imageList: list });

    // 获取原图尺寸用于展示, 并把第一张图的尺寸预填到调整输入框
    const startIdx = list.length - newItems.length;
    paths.forEach((p, i) => {
      const idx = startIdx + i;
      wx.getImageInfo({
        src: p,
        success: (info) => {
          const patch = {
            [`imageList[${idx}].width`]: info.width,
            [`imageList[${idx}].height`]: info.height
          };
          if (!this.firstWidth) {
            this.firstWidth = info.width;
            this.firstHeight = info.height;
          }
          if (!this.data.resizeWidth) {
            patch.resizeWidth = String(info.width);
          }
          if (!this.data.resizeHeight) {
            patch.resizeHeight = String(info.height);
          }
          this.setData(patch);
        }
      });
    });

    // 已有压缩链在跑时会顺带处理新加的 waiting 项, 避免双重队列
    if (!this.data.isCompressing) {
      this.processQueue();
    }
  },

  processQueue() {
    const pendingIdx = this.data.imageList.findIndex(item => item.status === 'waiting');

    if (pendingIdx === -1) {
      wx.hideLoading();
      this.setData({ isCompressing: false });
      return;
    }

    const done = this.data.imageList.filter(i => i.status === 'success' || i.status === 'fail').length;
    wx.showLoading({ title: `压缩中 ${done + 1}/${this.data.imageList.length}`, mask: true });
    this.setData({ isCompressing: true });

    this.processItem(pendingIdx, this.runId);
  },

  processItem(index, runId) {
    const item = this.data.imageList[index];
    const key = `imageList[${index}]`;

    this.setData({ [`${key}.status`]: 'compressing' });

    wx.getFileInfo({
      filePath: item.path,
      success: (res) => {
        if (runId !== this.runId) return;
        this.setData({
          [`${key}.originalSize`]: res.size,
          [`${key}.originalSizeStr`]: this.formatSize(res.size)
        });
        this.compress(index, runId);
      },
      fail: () => {
        if (runId !== this.runId) return;
        this.failItem(index, runId);
      }
    });
  },

  compress(index, runId) {
    const path = this.data.imageList[index].path;
    const targetBytes = this.data.mode === 'target' ? this.getTargetBytes() : 0;

    wx.getImageInfo({
      src: path,
      success: (info) => {
        if (runId !== this.runId) return;
        const out = this.calcOutputSize(info.width, info.height);
        if (targetBytes > 0) {
          this.compressToTargetSize(path, out.width, out.height, targetBytes)
            .then((result) => this.finishItem(index, result.path, result.size, runId, result.width, result.height))
            .catch(() => this.failItem(index, runId));
        } else if (out.width === info.width && out.height === info.height) {
          // 尺寸未变: 走系统压缩接口更快
          this.doCompressNative(index, path, runId);
        } else {
          this.renderToTempFile(path, out.width, out.height, this.data.quality / 100)
            .then((tmpPath) => this.finishItemByPath(index, tmpPath, runId, out.width, out.height))
            .catch(() => this.failItem(index, runId));
        }
      },
      fail: () => {
        if (runId !== this.runId) return;
        this.failItem(index, runId);
      }
    });
  },

  // 质量模式 + 不改尺寸: wx.compressImage, 失败回退 canvas
  doCompressNative(index, path, runId) {
    wx.compressImage({
      src: path,
      quality: this.data.quality,
      success: (res) => {
        if (runId !== this.runId) return;
        this.finishItemByPath(index, res.tempFilePath, runId);
      },
      fail: () => {
        if (runId !== this.runId) return;
        // 回退: canvas 按原尺寸重绘压缩
        wx.getImageInfo({
          src: path,
          success: (info) => {
            if (runId !== this.runId) return;
            const out = this.calcOutputSize(info.width, info.height);
            this.renderToTempFile(path, out.width, out.height, this.data.quality / 100)
              .then((tmpPath) => this.finishItemByPath(index, tmpPath, runId))
              .catch(() => this.failItem(index, runId));
          },
          fail: () => {
            if (runId !== this.runId) return;
            this.failItem(index, runId);
          }
        });
      }
    });
  },

  // 根据设置计算输出尺寸
  calcOutputSize(srcW, srcH) {
    const d = this.data;
    let w = srcW, h = srcH;

    switch (d.resizeMode) {
      case 'width': {
        const tw = parseInt(d.resizeWidth);
        if (tw > 0) {
          w = tw;
          h = Math.round(tw * srcH / srcW);
        }
        break;
      }
      case 'height': {
        const th = parseInt(d.resizeHeight);
        if (th > 0) {
          h = th;
          w = Math.round(th * srcW / srcH);
        }
        break;
      }
      case 'both': {
        const tw = parseInt(d.resizeWidth);
        const th = parseInt(d.resizeHeight);
        if (tw > 0 && th > 0) {
          if (d.keepRatio) {
            const scale = Math.min(tw / srcW, th / srcH);
            w = Math.round(srcW * scale);
            h = Math.round(srcH * scale);
          } else {
            w = tw;
            h = th;
          }
        }
        break;
      }
      case 'percent': {
        const p = parseFloat(d.resizePercent);
        if (p > 0) {
          w = Math.round(srcW * p / 100);
          h = Math.round(srcH * p / 100);
        }
        break;
      }
    }

    // 限制 canvas 最大尺寸, 等比缩小
    if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
      const s = Math.min(MAX_CANVAS_DIM / w, MAX_CANVAS_DIM / h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    w = Math.max(w, 1);
    h = Math.max(h, 1);

    return { width: w, height: h };
  },

  // ---------- Canvas 渲染 (OffscreenCanvas) ----------

  prepareCanvas(src, w, h) {
    return new Promise((resolve, reject) => {
      const canvas = wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
      const ctx = canvas.getContext('2d');
      const img = canvas.createImage();
      img.onload = () => resolve({ canvas, ctx, img });
      img.onerror = reject;
      img.src = src;
    });
  },

  drawToTempFile(prepared, w, h, quality) {
    const { canvas, ctx, img } = prepared;
    // 白底, 避免透明 PNG 转 JPG 后变黑
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        fileType: 'jpg',
        quality,
        width: w,
        height: h,
        destWidth: w,
        destHeight: h,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      });
    });
  },

  renderToTempFile(src, w, h, quality) {
    return this.prepareCanvas(src, w, h)
      .then((prepared) => this.drawToTempFile(prepared, w, h, quality));
  },

  // 目标大小压缩: 二分质量逼近, 达不到则逐步缩小尺寸
  async compressToTargetSize(path, outW, outH, targetBytes) {
    let w = outW, h = outH;

    for (let round = 0; round < 4; round++) {
      let prepared = null;
      try {
        prepared = await this.prepareCanvas(path, w, h);
      } catch (e) {
        prepared = null;
      }

      if (prepared) {
        let lo = 5, hi = 95;
        let best = null;
        for (let i = 0; i < 6 && lo <= hi; i++) {
          const q = Math.floor((lo + hi) / 2);
          try {
            const tmpPath = await this.drawToTempFile(prepared, w, h, q / 100);
            const size = await this.getFileSize(tmpPath);
            if (size <= targetBytes) {
              // 达标里挑质量最高(文件最大)的
              if (!best || size > best.size) best = { path: tmpPath, size };
              lo = q + 1;
            } else {
              hi = q - 1;
            }
          } catch (e) {
            break;
          }
        }
        if (best) return { path: best.path, size: best.size, width: w, height: h };
      }

      // 最低质量仍超标: 缩小尺寸重试
      w = Math.max(Math.round(w * 0.8), 50);
      h = Math.max(Math.round(h * 0.8), 50);
    }

    // 兜底: 最小尺寸 + 最低质量
    const prepared = await this.prepareCanvas(path, w, h);
    const tmpPath = await this.drawToTempFile(prepared, w, h, 0.05);
    const size = await this.getFileSize(tmpPath);
    return { path: tmpPath, size, width: w, height: h };
  },

  // ---------- 结果处理 ----------

  finishItemByPath(index, compressedPath, runId, outW, outH) {
    this.getFileSize(compressedPath)
      .then((size) => this.finishItem(index, compressedPath, size, runId, outW, outH))
      .catch(() => this.failItem(index, runId));
  },

  finishItem(index, compressedPath, size, runId, outW, outH) {
    if (runId !== this.runId) return;
    const key = `imageList[${index}]`;
    const item = this.data.imageList[index];
    const originalSize = item.originalSize;
    const ratio = originalSize > 0 ? Math.round((1 - size / originalSize) * 100) : 0;
    const w = outW || item.width || 0;
    const h = outH || item.height || 0;
    this.setData({
      [`${key}.compressedPath`]: compressedPath,
      [`${key}.compressedSize`]: size,
      [`${key}.compressedSizeStr`]: this.formatSize(size),
      [`${key}.ratio`]: ratio,
      [`${key}.outWidth`]: w,
      [`${key}.outHeight`]: h,
      [`${key}.status`]: 'success'
    });
    this.processQueue();
  },

  failItem(index, runId) {
    if (runId !== this.runId) return;
    this.setData({ [`imageList[${index}].status`]: 'fail' });
    this.processQueue();
  },

  getFileSize(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath,
        success: (res) => resolve(res.size),
        fail: reject
      });
    });
  },

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // ---------- 列表操作 ----------

  deleteImage(e) {
    if (this.data.isCompressing) {
      wx.showToast({ title: '压缩中, 请稍候', icon: 'none' });
      return;
    }
    const index = e.currentTarget.dataset.index;
    const list = [...this.data.imageList];
    list.splice(index, 1);
    this.setData({ imageList: list });
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.imageList[index];
    const urls = this.data.imageList.map(i => i.compressedPath || i.path);
    wx.previewImage({
      current: item.compressedPath || item.path,
      urls: urls
    });
  },

  saveAll() {
    const successList = this.data.imageList.filter(i => i.status === 'success');
    if (successList.length === 0) {
      wx.showToast({ title: '没有可保存的图片', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...', mask: true });

    let savedCount = 0;
    let failCount = 0;

    const saveOne = (index) => {
      if (index >= successList.length) {
        wx.hideLoading();
        wx.showToast({
          title: `成功${savedCount}张, 失败${failCount}张`,
          icon: 'none'
        });
        return;
      }

      wx.saveImageToPhotosAlbum({
        filePath: successList[index].compressedPath,
        success: () => {
          savedCount++;
          saveOne(index + 1);
        },
        fail: (err) => {
          failCount++;
          if (err.errMsg && err.errMsg.includes('auth')) {
            wx.hideLoading();
            wx.showModal({
              title: '提示',
              content: '需要保存到相册权限',
              success: (sm) => { if (sm.confirm) wx.openSetting(); }
            });
            return;
          }
          saveOne(index + 1);
        }
      });
    };

    saveOne(0);
  },

  onShareAppMessage() {
    return {
      title: '图片批量压缩工具',
      path: '/pages/compress/index'
    };
  }
});
