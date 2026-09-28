const DEFAULT_RENDER_WIDTH = 1080;
const DEFAULT_RENDER_HEIGHT = 1440;

const COLOR_OPTIONS = [
  { value: '#FFFFFF' },
  { value: '#000000' },
  { value: '#F04438' },
  { value: '#F97316' },
  { value: '#F7B500' },
  { value: '#13B5B1' },
  { value: '#1A73E8' }
];

const WATERMARK_POSITIONS = [
  { key: 'center', label: '居中' },
  { key: 'topLeft', label: '左上' },
  { key: 'topRight', label: '右上' },
  { key: 'bottomLeft', label: '左下' },
  { key: 'bottomRight', label: '右下' },
  { key: 'tile', label: '平铺' }
];

const defaultWatermark = () => ({
  enabled: false,
  text: '水印',
  color: '#FFFFFF',
  colorRgba: 'rgba(255,255,255,1)',
  opacity: 100,
  size: 24,
  bold: false,
  angle: 16,
  spacing: 26,
  positionIndex: 5
});

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    previewWidth: 0,
    previewHeight: 0,
    baseImage: '',
    baseImageWidth: 0,
    baseImageHeight: 0,
    layers: [],
    activeLayerId: '',
    renderWidth: DEFAULT_RENDER_WIDTH,
    renderHeight: DEFAULT_RENDER_HEIGHT,
    colorOptions: COLOR_OPTIONS,
    watermarkPositions: WATERMARK_POSITIONS,
    watermarkPositionLabel: WATERMARK_POSITIONS[5].label,
    showTextPanel: false,
    showWatermarkPanel: false,
    wmActiveTab: 'basic',
    editingTextLayerId: '',
    textEditor: {
      text: '',
      color: '#FFFFFF',
      opacity: 100,
      size: 42,
      bold: false
    },
    watermark: defaultWatermark(),
    watermarkDraft: defaultWatermark(),
    watermarkPreview: defaultWatermark(),
    watermarkPreviewItems: []
  },

  onLoad(options) {
    this.layerSeq = 1;
    this.touchState = null;
    this.textSession = null;
    this.calculateNavHeight();
    if (options && options.image) {
      this.setBaseImage(decodeURIComponent(options.image));
    }
    this.rebuildWatermarkPreview();
  },

  onReady() {
    this.measurePreviewBox();
    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (eventChannel) {
      eventChannel.on('acceptImageToEdit', (payload = {}) => {
        if (payload.image) this.setBaseImage(payload.image);
      });
    }
    if (!this.data.baseImage) this.chooseBaseImage(true);
  },

  calculateNavHeight() {
    const systemInfo = wx.getSystemInfoSync();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navContentHeight = (menuButtonInfo.top - statusBarHeight) * 2 + menuButtonInfo.height;
    this.setData({ statusBarHeight, navHeight: statusBarHeight + navContentHeight });
  },

  measurePreviewBox() {
    wx.createSelectorQuery()
      .select('#previewBox')
      .boundingClientRect((rect) => {
        if (!rect) return;
        this.setData({
          previewWidth: rect.width,
          previewHeight: rect.height
        }, () => this.rebuildWatermarkPreview());
      })
      .exec();
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  noop() {},

  chooseBaseImage(backIfCancel = false) {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFilePaths || [];
        if (paths[0]) this.setBaseImage(paths[0]);
      },
      fail: (err) => {
        if (!backIfCancel) return;
        if (err && err.errMsg && err.errMsg.includes('cancel')) {
          wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
        }
      }
    });
  },

  setBaseImage(path) {
    if (!path) return;
    this.getImageInfo(path).then((info) => {
      this.setData({
        baseImage: path,
        baseImageWidth: info.width || 0,
        baseImageHeight: info.height || 0,
        renderWidth: info.width || DEFAULT_RENDER_WIDTH,
        renderHeight: info.height || DEFAULT_RENDER_HEIGHT
      }, () => this.rebuildWatermarkPreview());
    }).catch(() => {
      this.setData({ baseImage: path }, () => this.rebuildWatermarkPreview());
    });
  },

  onAddSticker() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = (res.tempFilePaths || [])[0];
        if (!path) return;
        const layer = this.createStickerLayer(path);
        this.setData({
          layers: [...this.data.layers, layer],
          activeLayerId: layer.id
        });
      }
    });
  },

  createStickerLayer(src) {
    const width = Math.max(110, (this.data.previewWidth || 320) * 0.3);
    const bounds = this.getEditableBounds();
    return {
      id: `layer_${Date.now()}_${this.layerSeq++}`,
      type: 'image',
      src,
      text: '',
      x: bounds.x + Math.max(0, (bounds.width - width) / 2),
      y: bounds.y + Math.max(0, (bounds.height - width) / 2),
      w: width,
      h: width,
      rotation: 0,
      opacity: 1
    };
  },

  onAddText() {
    const layer = this.buildTextLayer({
      text: '请输入文字',
      color: '#FFFFFF',
      opacity: 100,
      size: 42,
      bold: false
    });
    this.textSession = { mode: 'edit', layerId: layer.id };
    this.setData({
      layers: [...this.data.layers, layer],
      activeLayerId: layer.id,
      editingTextLayerId: layer.id,
      showTextPanel: true,
      textEditor: {
        text: layer.text,
        color: '#FFFFFF',
        opacity: 100,
        size: 42,
        bold: false
      }
    });
  },

  openTextEditorForLayer(layer) {
    if (!layer || layer.type !== 'text') return;
    this.textSession = { mode: 'edit', layerId: layer.id };
    this.setData({
      activeLayerId: layer.id,
      editingTextLayerId: layer.id,
      showTextPanel: true,
      textEditor: {
        text: layer.text || '',
        color: layer.color || '#FFFFFF',
        opacity: Math.round((layer.opacity == null ? 1 : layer.opacity) * 100),
        size: layer.fontSize || 42,
        bold: !!layer.bold
      }
    });
  },

  buildTextLayer(editor, layerId) {
    const text = editor.text || '';
    const fontSize = Number(editor.size || 42);
    const opacity = Number(editor.opacity || 100) / 100;
    const metrics = this.measureTextLayerBox(text, fontSize, !!editor.bold);
    const width = metrics.width;
    const height = metrics.height;
    const bounds = this.getEditableBounds();
    return {
      id: layerId || `layer_${Date.now()}_${this.layerSeq++}`,
      type: 'text',
      src: '',
      text,
      lines: metrics.lines,
      x: bounds.x + Math.max(0, (bounds.width - width) / 2),
      y: bounds.y + Math.max(0, (bounds.height - height) / 2),
      w: width,
      h: height,
      rotation: 0,
      fontSize,
      color: editor.color,
      colorRgba: this.hexToRgba(editor.color, opacity),
      bold: !!editor.bold,
      opacity
    };
  },

  closeTextPanel() {
    this.textSession = null;
    this.setData({ showTextPanel: false, editingTextLayerId: '' });
  },

  onTextInput(e) {
    const nextText = String(e.detail.value || '').replace(/\r\n|\r|\n/g, ' ');
    this.setData({ 'textEditor.text': nextText }, () => this.applyTextPreview());
  },

  onTextColorPick(e) {
    this.setData({ 'textEditor.color': e.currentTarget.dataset.color }, () => this.applyTextPreview());
  },

  onTextSizeChange(e) {
    this.setData({ 'textEditor.size': Number(e.detail.value || 42) }, () => this.applyTextPreview());
  },

  onTextOpacityChange(e) {
    this.setData({ 'textEditor.opacity': Number(e.detail.value || 100) }, () => this.applyTextPreview());
  },

  onTextBoldChange(e) {
    this.setData({ 'textEditor.bold': !!e.detail.value }, () => this.applyTextPreview());
  },

  applyTextPreview() {
    const layerId = this.data.editingTextLayerId;
    if (!layerId) return;
    const idx = this.getLayerIndex(layerId);
    if (idx < 0) return;
    const editor = this.data.textEditor;
    const prev = this.data.layers[idx];
    const sanitizedText = String(editor.text || '').replace(/\r\n|\r|\n/g, ' ');
    const metrics = this.measureTextLayerBox(sanitizedText, editor.size, !!editor.bold);
    const nextWidth = metrics.width;
    const nextHeight = metrics.height;
    const centerX = prev.x + prev.w / 2;
    const centerY = prev.y + prev.h / 2;
    const bounds = this.getEditableBounds();
    const nextX = this.clamp(centerX - nextWidth / 2, bounds.x, Math.max(bounds.x, bounds.x + bounds.width - nextWidth));
    const nextY = this.clamp(centerY - nextHeight / 2, bounds.y, Math.max(bounds.y, bounds.y + bounds.height - nextHeight));

    const layers = [...this.data.layers];
    layers[idx] = {
      ...prev,
      text: sanitizedText,
      lines: metrics.lines,
      w: nextWidth,
      h: nextHeight,
      x: nextX,
      y: nextY,
      fontSize: editor.size,
      color: editor.color,
      colorRgba: this.hexToRgba(editor.color, editor.opacity / 100),
      bold: !!editor.bold,
      opacity: editor.opacity / 100
    };
    this.setData({ layers });
  },

  confirmText() {
    this.closeTextPanel();
  },

  onOpenWatermarkPanel() {
    const draft = { ...this.data.watermark };
    this.setData({
      showWatermarkPanel: true,
      wmActiveTab: 'basic',
      watermarkDraft: draft,
      watermarkPositionLabel: WATERMARK_POSITIONS[draft.positionIndex]?.label || WATERMARK_POSITIONS[0].label
    }, () => this.rebuildWatermarkPreview());
  },

  onSwitchWmTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab) return;
    this.setData({ wmActiveTab: tab });
  },

  closeWatermarkPanel() {
    this.setData({
      showWatermarkPanel: false,
      watermarkPositionLabel: WATERMARK_POSITIONS[this.data.watermark.positionIndex]?.label || WATERMARK_POSITIONS[0].label
    }, () => this.rebuildWatermarkPreview());
  },

  confirmWatermark() {
    this.closeWatermarkPanel();
  },

  onWatermarkTextInput(e) {
    this.updateWatermarkDraft({ text: e.detail.value || '' });
  },

  onWatermarkEnableChange(e) {
    this.updateWatermarkDraft({ enabled: !!e.detail.value });
  },

  onWatermarkColorPick(e) {
    this.updateWatermarkDraft({ color: e.currentTarget.dataset.color });
  },

  onWatermarkSizeChange(e) {
    this.updateWatermarkDraft({ size: Number(e.detail.value || 24) });
  },

  onWatermarkOpacityChange(e) {
    this.updateWatermarkDraft({ opacity: Number(e.detail.value || 100) });
  },

  onWatermarkAngleChange(e) {
    this.updateWatermarkDraft({ angle: Number(e.detail.value || 0) });
  },

  onWatermarkSpacingChange(e) {
    this.updateWatermarkDraft({ spacing: Number(e.detail.value || 80) });
  },

  onWatermarkBoldChange(e) {
    this.updateWatermarkDraft({ bold: !!e.detail.value });
  },

  onWatermarkPositionChange(e) {
    const idx = Number(e.detail.value || 0);
    this.updateWatermarkDraft({ positionIndex: idx });
  },

  updateWatermarkDraft(patch) {
    const next = {
      ...this.data.watermarkDraft,
      ...patch
    };
    next.colorRgba = this.hexToRgba(next.color, next.opacity / 100);
    this.setData({
      watermark: next,
      watermarkDraft: next,
      watermarkPositionLabel: WATERMARK_POSITIONS[next.positionIndex]?.label || WATERMARK_POSITIONS[0].label
    }, () => this.rebuildWatermarkPreview());
  },

  rebuildWatermarkPreview() {
    const wmRaw = this.data.watermark;
    const wm = { ...wmRaw, colorRgba: this.hexToRgba(wmRaw.color, wmRaw.opacity / 100) };
    this.setData({ watermarkPreview: wm });

    const { previewWidth, previewHeight } = this.data;
    if (!previewWidth || !previewHeight || !wm.enabled || !wm.text) {
      this.setData({ watermarkPreviewItems: [] });
      return;
    }
    const actualRect = this.getEditableBounds();
    const metrics = this.estimateTextMetrics(wm.text, wm.size, wm.bold);
    const positionKey = WATERMARK_POSITIONS[wm.positionIndex]?.key || 'center';
    if (positionKey === 'tile') {
      const stepX = metrics.width + wm.spacing;
      const stepY = metrics.height * 1.4 + wm.spacing;
      const items = [];
      let row = 0;
      for (let y = actualRect.y + metrics.height / 2; y <= actualRect.y + actualRect.height - metrics.height / 2; y += stepY) {
        const shiftX = row % 2 === 0 ? 0 : stepX / 2;
        for (let x = actualRect.x + metrics.width / 2; x <= actualRect.x + actualRect.width - metrics.width / 2 + stepX; x += stepX) {
          const centeredX = x + shiftX;
          if (centeredX > actualRect.x + actualRect.width - metrics.width / 2) continue;
          items.push({ idx: `${centeredX}_${y}`, x: centeredX, y });
        }
        row += 1;
      }
      this.setData({ watermarkPreviewItems: items });
      return;
    }

    const pos = this.getSingleWatermarkPosition(positionKey, actualRect, metrics.width, metrics.height, Math.max(16, wm.size * 0.6));
    this.setData({ watermarkPreviewItems: [{ idx: 'single', x: pos.x, y: pos.y }] });
  },

  getSingleWatermarkPosition(positionKey, rect, contentWidth, contentHeight, margin = 26) {
    const minX = rect.x + margin + contentWidth / 2;
    const maxX = rect.x + rect.width - margin - contentWidth / 2;
    const minY = rect.y + margin + contentHeight / 2;
    const maxY = rect.y + rect.height - margin - contentHeight / 2;
    if (positionKey === 'topLeft') return { x: minX, y: minY };
    if (positionKey === 'topRight') return { x: maxX, y: minY };
    if (positionKey === 'bottomLeft') return { x: minX, y: maxY };
    if (positionKey === 'bottomRight') return { x: maxX, y: maxY };
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  },

  onDeleteActiveLayer() {
    if (!this.data.activeLayerId) {
      wx.showToast({ title: '请选择图层', icon: 'none' });
      return;
    }
    this.setData({
      layers: this.data.layers.filter((item) => item.id !== this.data.activeLayerId),
      activeLayerId: ''
    });
  },

  onLayerTap(e) {
    if (this.suppressNextLayerTap) {
      this.suppressNextLayerTap = false;
      return;
    }
    if (this.layerTapMoved) {
      this.layerTapMoved = false;
      return;
    }
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const layer = this.data.layers.find((item) => item.id === id);
    if (!layer) return;
    if (layer.type === 'text') {
      this.openTextEditorForLayer(layer);
      return;
    }
    this.setData({ activeLayerId: id });
  },

  onDeleteLayerTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const wasEditing = this.data.editingTextLayerId === id;
    this.setData({
      layers: this.data.layers.filter((item) => item.id !== id),
      activeLayerId: this.data.activeLayerId === id ? '' : this.data.activeLayerId,
      editingTextLayerId: wasEditing ? '' : this.data.editingTextLayerId,
      showTextPanel: wasEditing ? false : this.data.showTextPanel
    });
    if (wasEditing) this.textSession = null;
  },

  onPreviewTap() {
    if (this.data.showTextPanel || this.data.showWatermarkPanel) return;
    if (!this.data.activeLayerId) return;
    this.setData({ activeLayerId: '' });
  },

  getLayerIndex(id) {
    return this.data.layers.findIndex((item) => item.id === id);
  },

  getActiveLayer() {
    if (!this.data.activeLayerId) return null;
    return this.data.layers.find((item) => item.id === this.data.activeLayerId) || null;
  },

  onLayerTouchStart(e) {
    if (this.data.showTextPanel || this.data.showWatermarkPanel) return;
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const idx = this.getLayerIndex(id);
    if (idx < 0) return;
    const layer = this.data.layers[idx];
    this.setData({ activeLayerId: id });
    this.layerTapMoved = false;

    if (e.touches.length >= 2 && layer.type === 'image') {
      const a = e.touches[0];
      const b = e.touches[1];
      this.touchState = {
        mode: 'transform',
        id,
        startDistance: this.getDistance(a, b),
        startAngle: this.getAngle(a, b),
        originW: layer.w,
        originRotation: layer.rotation || 0,
        centerX: layer.x + layer.w / 2,
        centerY: layer.y + layer.h / 2,
        aspect: layer.w / layer.h
      };
      return;
    }

    const touch = e.touches[0];
    this.touchState = {
      mode: 'drag',
      id,
      startX: touch.clientX,
      startY: touch.clientY,
      originX: layer.x,
      originY: layer.y
    };
  },

  onLayerTouchMove(e) {
    if (!this.touchState) return;
    const idx = this.getLayerIndex(this.touchState.id);
    if (idx < 0) return;
    const layer = this.data.layers[idx];
    const layers = [...this.data.layers];

    if (this.touchState.mode === 'drag') {
      const t = e.touches[0];
      if (Math.abs(t.clientX - this.touchState.startX) > 4 || Math.abs(t.clientY - this.touchState.startY) > 4) {
        this.layerTapMoved = true;
      }
      const bounds = this.getEditableBounds();
      const x = this.clamp(this.touchState.originX + (t.clientX - this.touchState.startX), bounds.x, Math.max(bounds.x, bounds.x + bounds.width - layer.w));
      const y = this.clamp(this.touchState.originY + (t.clientY - this.touchState.startY), bounds.y, Math.max(bounds.y, bounds.y + bounds.height - layer.h));
      layers[idx] = { ...layer, x, y };
      this.setData({ layers });
      return;
    }

    if (this.touchState.mode === 'transform' && e.touches.length >= 2) {
      this.layerTapMoved = true;
      const a = e.touches[0];
      const b = e.touches[1];
      const dist = this.getDistance(a, b);
      const angle = this.getAngle(a, b);
      const scale = this.clamp(dist / (this.touchState.startDistance || 1), 0.25, 3.5);
      const bounds = this.getEditableBounds();
      const w = this.clamp(this.touchState.originW * scale, 40, bounds.width * 1.2);
      const h = w / (this.touchState.aspect || 1);
      const x = this.clamp(this.touchState.centerX - w / 2, bounds.x, Math.max(bounds.x, bounds.x + bounds.width - w));
      const y = this.clamp(this.touchState.centerY - h / 2, bounds.y, Math.max(bounds.y, bounds.y + bounds.height - h));
      layers[idx] = {
        ...layer,
        w,
        h,
        x,
        y,
        rotation: this.touchState.originRotation + (angle - this.touchState.startAngle)
      };
      this.setData({ layers });
    }
  },

  onLayerTouchEnd() {
    if (this.touchState && this.touchState.mode === 'drag' && !this.layerTapMoved) {
      const layer = this.data.layers.find((item) => item.id === this.touchState.id);
      if (layer && layer.type === 'text') {
        this.openTextEditorForLayer(layer);
        this.suppressNextLayerTap = true;
      }
    }
    this.touchState = null;
  },

  onResizeHandleStart(e) {
    if (this.data.showTextPanel || this.data.showWatermarkPanel) return;
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const idx = this.getLayerIndex(id);
    if (idx < 0) return;
    const layer = this.data.layers[idx];
    const touch = (e.touches && e.touches[0]) || null;
    if (!touch) return;
    this.touchState = {
      mode: 'resize-handle',
      id,
      startX: touch.clientX,
      startY: touch.clientY,
      originW: layer.w,
      originH: layer.h,
      originFontSize: layer.fontSize || 42,
      originX: layer.x,
      originY: layer.y
    };
  },

  onResizeHandleMove(e) {
    if (!this.touchState || this.touchState.mode !== 'resize-handle') return;
    const idx = this.getLayerIndex(this.touchState.id);
    if (idx < 0) return;
    const layer = this.data.layers[idx];
    const touch = (e.touches && e.touches[0]) || null;
    if (!touch) return;
    const dx = touch.clientX - this.touchState.startX;
    const dy = touch.clientY - this.touchState.startY;
    const delta = Math.max(dx, dy);
    const layers = [...this.data.layers];

    if (layer.type === 'text') {
      const bounds = this.getEditableBounds();
      const nextW = this.clamp(this.touchState.originW + delta, 80, bounds.width * 0.95);
      const ratio = nextW / Math.max(1, this.touchState.originW);
      const nextFontSize = this.clamp(Math.round(this.touchState.originFontSize * ratio), 18, 120);
      const text = layer.text || '';
      const metrics = this.measureTextLayerBox(text, nextFontSize, !!layer.bold, layer.w);
      const textW = metrics.width;
      const textH = metrics.height;
      const nextX = this.clamp(this.touchState.originX, bounds.x, Math.max(bounds.x, bounds.x + bounds.width - textW));
      const nextY = this.clamp(this.touchState.originY, bounds.y, Math.max(bounds.y, bounds.y + bounds.height - textH));
      layers[idx] = {
        ...layer,
        w: textW,
        h: textH,
        lines: metrics.lines,
        x: nextX,
        y: nextY,
        fontSize: nextFontSize
      };
      this.setData({ layers });
      return;
    }

    const bounds = this.getEditableBounds();
    const aspect = layer.w / Math.max(1, layer.h);
    const nextW = this.clamp(this.touchState.originW + delta, 40, bounds.width * 1.2);
    const nextH = nextW / aspect;
    layers[idx] = {
      ...layer,
      w: nextW,
      h: nextH
    };
    this.setData({ layers });
  },

  onResizeHandleEnd() {
    if (this.touchState && this.touchState.mode === 'resize-handle') {
      this.touchState = null;
    }
  },

  getDistance(a, b) {
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  getAngle(a, b) {
    return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI;
  },

  clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  },

  // 计算预览区域中图片的实际显示区域（考虑 aspectFit 模式下的留白）
  getPreviewImageActualRect(baseImgWidth, baseImgHeight) {
    const { previewWidth, previewHeight } = this.data;
    if (!previewWidth || !previewHeight || !baseImgWidth || !baseImgHeight) {
      return { x: 0, y: 0, width: previewWidth || 0, height: previewHeight || 0, scale: 1 };
    }

    const imgRatio = baseImgWidth / baseImgHeight;
    const boxRatio = previewWidth / previewHeight;

    let actualWidth, actualHeight, offsetX, offsetY, scale;

    if (imgRatio > boxRatio) {
      // 图片比容器更宽，以宽度为基准缩放
      actualWidth = previewWidth;
      actualHeight = previewWidth / imgRatio;
      offsetX = 0;
      offsetY = (previewHeight - actualHeight) / 2;
      scale = previewWidth / baseImgWidth;
    } else {
      // 图片比容器更高或等比，以高度为基准缩放
      actualHeight = previewHeight;
      actualWidth = previewHeight * imgRatio;
      offsetX = (previewWidth - actualWidth) / 2;
      offsetY = 0;
      scale = previewHeight / baseImgHeight;
    }

    return {
      x: offsetX,
      y: offsetY,
      width: actualWidth,
      height: actualHeight,
      scale
    };
  },

  getEditableBounds() {
    const { baseImageWidth, baseImageHeight, previewWidth, previewHeight } = this.data;
    if (baseImageWidth > 0 && baseImageHeight > 0) {
      return this.getPreviewImageActualRect(baseImageWidth, baseImageHeight);
    }
    return { x: 0, y: 0, width: previewWidth || 0, height: previewHeight || 0, scale: 1 };
  },

  // 将预览坐标映射到渲染坐标
  // previewX, previewY: 图层在预览容器中的绝对坐标
  // baseImgWidth, baseImgHeight: 底图原始尺寸
  mapPreviewToRender(previewX, previewY, baseImgWidth, baseImgHeight) {
    const actualRect = this.getPreviewImageActualRect(baseImgWidth, baseImgHeight);

    // 计算图层相对于实际图片显示区域的坐标
    const relativeX = previewX - actualRect.x;
    const relativeY = previewY - actualRect.y;

    // 将相对坐标映射到渲染坐标
    const renderX = relativeX / actualRect.scale;
    const renderY = relativeY / actualRect.scale;

    return {
      x: renderX,
      y: renderY,
      scale: actualRect.scale
    };
  },

  // 将渲染坐标映射到预览坐标（用于未来需要）
  mapRenderToPreview(renderX, renderY, baseImgWidth, baseImgHeight) {
    const actualRect = this.getPreviewImageActualRect(baseImgWidth, baseImgHeight);

    const previewX = renderX * actualRect.scale + actualRect.x;
    const previewY = renderY * actualRect.scale + actualRect.y;

    return {
      x: previewX,
      y: previewY,
      scale: actualRect.scale
    };
  },

  estimateTextMetrics(text, fontSize, bold) {
    const content = String(text || '');
    const chineseCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherCount = Math.max(0, content.length - chineseCount);
    const weightFactor = bold ? 1.06 : 1;
    const width = Math.max(fontSize, (chineseCount * fontSize + otherCount * fontSize * 0.62) * weightFactor);
    const height = Math.max(fontSize, fontSize * 1.25);
    return { width, height };
  },

  measureTextLayerBox(text, fontSize, bold, preferredWidth) {
    const bounds = this.getEditableBounds();
    const horizontalPadding = Math.max(8, fontSize * 0.16);
    const verticalPadding = Math.max(4, fontSize * 0.08);
    const minWidth = 80;
    const maxWidth = Math.max(minWidth, bounds.width - horizontalPadding * 2);
    const preferredContentWidth = preferredWidth
      ? Math.max(minWidth - horizontalPadding * 2, Math.min(maxWidth, preferredWidth - horizontalPadding * 2))
      : maxWidth;
    const lines = this.wrapTextForLayer(text, fontSize, bold, preferredContentWidth);
    const lineHeight = fontSize * 1.25;
    const widest = lines.reduce((max, line) => {
      return Math.max(max, this.estimateTextMetrics(line, fontSize, bold).width);
    }, 0);
    return {
      width: Math.max(minWidth, Math.ceil(Math.min(maxWidth, widest) + horizontalPadding * 2)),
      height: Math.max(32, Math.ceil(lines.length * lineHeight + verticalPadding * 2)),
      lines
    };
  },

  wrapTextForLayer(text, fontSize, bold, maxWidth) {
    const content = String(text || '');
    if (!content) return [''];
    const normalized = content.replace(/\r\n|\r/g, '\n');
    const paragraphs = normalized.split('\n');
    const lines = [];

    paragraphs.forEach((paragraph) => {
      let current = '';
      Array.from(paragraph).forEach((char) => {
        const next = current + char;
        if (current && this.estimateTextMetrics(next, fontSize, bold).width > maxWidth) {
          lines.push(current);
          current = char;
        } else {
          current = next;
        }
      });
      lines.push(current);
    });

    return lines.length ? lines : [''];
  },

  hexToRgba(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(255,255,255,${alpha})`;
    const s = hex.replace('#', '');
    const full = s.length === 3 ? s.split('').map((c) => `${c}${c}`).join('') : s;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  async onSave() {
    if (!this.data.baseImage) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '正在保存...' });
    try {
      await this.ensureAlbumPermission();
      
      // 获取原始图片尺寸
      const baseImgInfo = await this.getImageInfo(this.data.baseImage);
      const renderWidth = baseImgInfo.width;
      const renderHeight = baseImgInfo.height;
      
      const canvasInfo = await new Promise((resolve, reject) => {
        wx.createSelectorQuery()
          .in(this)
          .select('.render-canvas')
          .fields({ node: true, size: true }, (res) => {
            if (!res || !res.node) return reject(new Error('canvas-not-found'));
            resolve(res);
          })
          .exec();
      });

      const canvas = canvasInfo.node;
      const ctx = canvas.getContext('2d');
      // 使用原始图片尺寸
      canvas.width = renderWidth;
      canvas.height = renderHeight;
      ctx.clearRect(0, 0, renderWidth, renderHeight);

      await this.drawBase(ctx, canvas, renderWidth, renderHeight);
      await this.drawLayers(ctx, canvas, renderWidth, renderHeight);
      this.drawWatermarkPattern(ctx, this.data.watermark, renderWidth, renderHeight);

      const tempFilePath = await this.exportCanvas(canvas, renderWidth, renderHeight);
      await this.saveToAlbum(tempFilePath);
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (e) {
      console.error('image-edit save failed:', e);
      wx.hideLoading();
      const errMsg = (e && e.errMsg) || (e && e.message) || '';
      if (String(errMsg).includes('auth') || String(errMsg).includes('deny')) {
        wx.showToast({ title: '缺少相册权限', icon: 'none' });
      } else {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      }
    }
  },

  // 获取图片信息
  getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: src,
        success: (res) => resolve(res),
        fail: reject
      });
    });
  },

  async drawBase(ctx, canvas, renderWidth, renderHeight) {
    const img = await this.loadImage(canvas, this.data.baseImage);
    // 按原始尺寸绘制底图，不添加背景，不缩放
    ctx.drawImage(img, 0, 0, renderWidth, renderHeight);
  },

  async drawLayers(ctx, canvas, renderWidth, renderHeight) {
    // 获取预览区域中图片的实际显示区域信息
    const actualRect = this.getPreviewImageActualRect(renderWidth, renderHeight);

    for (const layer of this.data.layers) {
      // 使用正确的坐标映射将预览坐标转换为渲染坐标
      const mappedPos = this.mapPreviewToRender(layer.x, layer.y, renderWidth, renderHeight);

      // 计算图层在渲染时的尺寸（基于预览尺寸与实际显示区域的比例）
      const sizeScaleX = renderWidth / actualRect.width;
      const sizeScaleY = renderHeight / actualRect.height;
      const w = layer.w * sizeScaleX;
      const h = layer.h * sizeScaleY;

      const x = mappedPos.x;
      const y = mappedPos.y;

      ctx.save();
      ctx.globalAlpha = layer.opacity == null ? 1 : layer.opacity;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);

      if (layer.type === 'image' && layer.src) {
        const img = await this.loadImage(canvas, layer.src);
        this.drawImageAspectFit(ctx, img, -w / 2, -h / 2, w, h);
      } else if (layer.type === 'text' && layer.text) {
        ctx.fillStyle = layer.colorRgba || '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 文字大小也需要根据缩放比例调整
        const fontScale = renderHeight / actualRect.height;
        const renderFontSize = Math.round((layer.fontSize || 42) * fontScale);
        ctx.font = `${layer.bold ? '700' : '200'} ${renderFontSize}px sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 6;
        const lines = layer.lines && layer.lines.length
          ? layer.lines
          : this.wrapTextForLayer(layer.text, layer.fontSize || 42, !!layer.bold, layer.w);
        const lineHeight = renderFontSize * 1.25;
        const startY = -((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, index) => {
          ctx.fillText(line, 0, startY + index * lineHeight);
        });
      }
      ctx.restore();
    }
  },

  drawWatermarkPattern(ctx, wmRaw, renderWidth, renderHeight) {
    const wm = { ...wmRaw };
    if (!wm.enabled || !wm.text) return;

    const alpha = this.clamp(wm.opacity / 100, 0.05, 1);
    const fontPx = wm.size * 1.8;
    const color = this.hexToRgba(wm.color, alpha);
    const positionKey = WATERMARK_POSITIONS[wm.positionIndex]?.key || 'center';

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${wm.bold ? '700' : '300'} ${fontPx}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const actualRect = { x: 0, y: 0, width: renderWidth, height: renderHeight };

    if (positionKey === 'tile') {
      const textWidth = ctx.measureText(wm.text).width;
      const textHeight = fontPx * 1.25;
      const stepX = textWidth + wm.spacing * 1.8;
      const stepY = textHeight + wm.spacing * 1.6;
      const rad = (wm.angle * Math.PI) / 180;
      let row = 0;
      for (let y = actualRect.y + textHeight / 2; y <= actualRect.y + actualRect.height - textHeight / 2; y += stepY) {
        const shiftX = row % 2 === 0 ? 0 : stepX / 2;
        for (let x = actualRect.x + textWidth / 2; x <= actualRect.x + actualRect.width - textWidth / 2 + stepX; x += stepX) {
          const centeredX = x + shiftX;
          if (centeredX > actualRect.x + actualRect.width - textWidth / 2) continue;
          ctx.save();
          ctx.translate(centeredX, y);
          ctx.rotate(rad);
          ctx.fillText(wm.text, 0, 0);
          ctx.restore();
        }
        row += 1;
      }
      ctx.restore();
      return;
    }

    const textWidth = ctx.measureText(wm.text).width;
    const textHeight = fontPx * 1.25;
    const pos = this.getSingleWatermarkPosition(positionKey, actualRect, textWidth, textHeight, Math.max(24, fontPx * 0.4));
    ctx.translate(pos.x, pos.y);
    ctx.rotate((wm.angle * Math.PI) / 180);
    ctx.fillText(wm.text, 0, 0);
    ctx.restore();
  },

  drawImageAspectFill(ctx, img, dx, dy, dw, dh) {
    const imgRatio = img.width / img.height;
    const areaRatio = dw / dh;
    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;
    if (imgRatio > areaRatio) {
      sw = sh * areaRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = sw / areaRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  },

  drawImageAspectFit(ctx, img, dx, dy, dw, dh) {
    const imgRatio = img.width / img.height;
    const areaRatio = dw / dh;
    let drawW = dw;
    let drawH = dh;
    let drawX = dx;
    let drawY = dy;
    if (imgRatio > areaRatio) {
      drawH = dw / imgRatio;
      drawY = dy + (dh - drawH) / 2;
    } else {
      drawW = dh * imgRatio;
      drawX = dx + (dw - drawW) / 2;
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  },

  loadImage(canvas, src) {
    return new Promise((resolve, reject) => {
      const img = canvas.createImage();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  exportCanvas(canvas, renderWidth, renderHeight) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        x: 0,
        y: 0,
        width: renderWidth,
        height: renderHeight,
        destWidth: renderWidth,
        destHeight: renderHeight,
        fileType: 'jpg',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      });
    });
  },

  ensureAlbumPermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (settingRes) => {
          const auth = settingRes.authSetting['scope.writePhotosAlbum'];
          if (auth === true) {
            resolve();
            return;
          }
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: resolve,
            fail: () => {
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中允许保存到相册',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting({
                      success: (openRes) => {
                        if (openRes.authSetting && openRes.authSetting['scope.writePhotosAlbum']) {
                          resolve();
                        } else {
                          reject(new Error('album-auth-denied'));
                        }
                      },
                      fail: () => reject(new Error('open-setting-failed'))
                    });
                  } else {
                    reject(new Error('album-auth-denied'));
                  }
                },
                fail: () => reject(new Error('album-auth-denied'))
              });
            }
          });
        },
        fail: reject
      });
    });
  },

  saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: (err) => {
          if (err && err.errMsg && err.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许保存到相册',
              success: (res) => {
                if (res.confirm) wx.openSetting({});
              }
            });
          }
          reject(err);
        }
      });
    });
  }
});
