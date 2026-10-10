const NSFW = require('../../utils/nsfw.js');

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgba(hex, alpha) {
  const safeHex = (hex || '#222222').replace('#', '');
  const short = safeHex.length === 3;
  const r = parseInt(short ? safeHex[0] + safeHex[0] : safeHex.slice(0, 2), 16);
  const g = parseInt(short ? safeHex[1] + safeHex[1] : safeHex.slice(2, 4), 16);
  const b = parseInt(short ? safeHex[2] + safeHex[2] : safeHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0
];

const lunarMonthName = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const lunarDayName = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

function lYearDays(y) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
  }
  return sum + leapDays(y);
}

function leapMonth(y) {
  return lunarInfo[y - 1900] & 0xf;
}

function leapDays(y) {
  if (leapMonth(y)) {
    return (lunarInfo[y - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}

function monthDays(y, m) {
  return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
}

function getLunarLabel(year, month, day) {
  if (year < 1900 || year > 2049) {
    return '';
  }
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(year, month - 1, day);
  let offset = Math.floor((targetDate - baseDate) / 86400000);
  let lunarYear = 1900;
  let daysOfYear = 0;
  while (lunarYear < 2050 && offset > 0) {
    daysOfYear = lYearDays(lunarYear);
    if (offset >= daysOfYear) {
      offset -= daysOfYear;
      lunarYear += 1;
    } else {
      break;
    }
  }

  const leap = leapMonth(lunarYear);
  let isLeap = false;
  let lunarMonth = 1;
  let daysOfMonth = 0;
  while (lunarMonth <= 12 && offset >= 0) {
    if (leap > 0 && lunarMonth === leap + 1 && !isLeap) {
      lunarMonth -= 1;
      isLeap = true;
      daysOfMonth = leapDays(lunarYear);
    } else {
      daysOfMonth = monthDays(lunarYear, lunarMonth);
    }
    if (offset < daysOfMonth) {
      break;
    }
    offset -= daysOfMonth;
    if (isLeap && lunarMonth === leap) {
      isLeap = false;
    }
    lunarMonth += 1;
  }

  const lunarDay = offset + 1;
  if (lunarDay === 1) {
    return `${isLeap ? '闰' : ''}${lunarMonthName[lunarMonth - 1]}月`;
  }
  return lunarDayName[lunarDay - 1] || '';
}

function getCalendarCells(year, month, selectedDay) {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const monthDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const day = i - firstWeekday + 1;
    if (day > 0 && day <= monthDays) {
      cells.push({
        day,
        lunar: getLunarLabel(year, month, day),
        isSelected: day === selectedDay
      });
    } else {
      cells.push(null);
    }
  }
  return cells;
}

function chooseImageAsync() {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        // 先做内容安全检测，不合规则中断（不提示，检测函数内部已提示）
        const src = (res.tempFilePaths || [])[0];
        const isSafe = await NSFW.checkAndAlert(src, true);
        if (!isSafe) {
          reject(new Error('image-rejected'));
          return;
        }
        resolve(res);
      },
      fail: reject
    });
  });
}

function getImageInfoAsync(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: resolve,
      fail: reject
    });
  });
}

function downloadFileAsync(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: resolve,
      fail: reject
    });
  });
}

function canvasToTempFileAsync(option, context) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      ...option,
      success: resolve,
      fail: reject
    }, context);
  });
}

function saveImageAsync(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: reject
    });
  });
}

function isRemoteUrl(src) {
  return typeof src === 'string' && /^https?:\/\//.test(src);
}

const PRESET_BACKGROUNDS = [
  'https://api.zjzxcx.top/uploads/file/1a1b428da97e5b55f100a7c1c8943f17_20260308132634.webp',
  'https://api.zjzxcx.top/uploads/file/3d4b40fff6c0929c71e7ad18b222e966_20260308132634.jpg',
  'https://api.zjzxcx.top/uploads/file/722de653c7ffe4df1ff5581497f004ff_20260308132634.jpeg',
  'https://api.zjzxcx.top/uploads/file/4f8e47c7c91d7987b795d2d8615f40e3_20260308132633.webp',
  'https://api.zjzxcx.top/uploads/file/02cea467f5ea3b9330617937b615c51d_20260308132634.webp',
  'https://api.zjzxcx.top/uploads/file/a6732ecfa10548bb3be6545a0462342f_20260308132634.webp'
];

Page({
  data: {
    dateValue: '',
    displayDate: '',
    selectedYear: 0,
    selectedMonth: 0,
    selectedDay: 0,
    posterRatio: '1:1',
    weekHeaders: ['日', '一', '二', '三', '四', '五', '六'],
    calendarCells: [],
    monthLabel: '',
    fontColor: '#ffffff',
    fontAlpha: 100,
    fontScale: 100,
    fontRgba: 'rgba(255, 255, 255, 1)',
    fontColors: ['#ffffff', '#1d2333', '#808080', '#ffeb3b', '#29b6f6', '#ff6b6b', '#a7ff83'],
    previewW: 0,
    previewH: 0,
    presetBackgrounds: PRESET_BACKGROUNDS,
    selectedPresetBgIndex: 0,
    bgImage: '',
    bgCanvasImage: '',
    bgScale: 100,
    bgDisplayW: 0,
    bgDisplayH: 0,
    bgX: 0,
    bgY: 0,
    stickers: [],
    activeStickerId: null,
    settingsVisible: false,
    renderCanvasWidth: 1200,
    renderCanvasHeight: 1200,
    calendarLayerStyle: '',
    dayTouchGridStyle: ''
  },

  onLoad() {
    const now = new Date();
    const dateValue = formatDate(now);
    this.setData({
      dateValue,
      displayDate: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
      selectedYear: now.getFullYear(),
      selectedMonth: now.getMonth() + 1,
      selectedDay: now.getDate(),
      bgImage: PRESET_BACKGROUNDS[0]
    }, () => {
      this.refreshCalendar();
      this.updateFontRgba();
    });
  },

  onReady() {
    this.measurePreview(() => this.recalculateBackground());
  },

  onDateChange(e) {
    const [year, month, day] = e.detail.value.split('-').map(Number);
    this.setData({
      dateValue: e.detail.value,
      displayDate: `${year}年${month}月${day}日`,
      selectedYear: year,
      selectedMonth: month,
      selectedDay: day
    }, () => this.refreshCalendar());
  },

  onCalendarDayTouchEnd(e) {
    const day = Number(e.currentTarget.dataset.day);
    if (!day) {
      this.lastTapDay = null;
      this.lastTapTime = 0;
      return;
    }

    const now = Date.now();
    const threshold = 900;
    const isDoubleTap = this.lastTapDay === day && (now - (this.lastTapTime || 0)) <= threshold;
    this.lastTapDay = day;
    this.lastTapTime = now;

    if (!isDoubleTap) {
      wx.showToast({ title: `再点一次选中${day}日`, icon: 'none', duration: 500 });
      return;
    }

    if (day === this.data.selectedDay) {
      return;
    }

    const mm = String(this.data.selectedMonth).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    this.setData({
      selectedDay: day,
      dateValue: `${this.data.selectedYear}-${mm}-${dd}`,
      displayDate: `${this.data.selectedYear}年${this.data.selectedMonth}月${day}日`
    }, () => this.refreshCalendar());
  },

  onRatioChange(e) {
    const ratio = e.currentTarget.dataset.ratio;
    if (!ratio || ratio === this.data.posterRatio) {
      return;
    }
    this.setData({ posterRatio: ratio }, () => {
      this.measurePreview(() => this.recalculateBackground());
    });
  },

  toggleSettings() {
    this.setData({ settingsVisible: !this.data.settingsVisible });
  },

  closeSettings() {
    this.setData({ settingsVisible: false });
  },

  onFontColorChange(e) {
    this.setData({ fontColor: e.currentTarget.dataset.color }, () => this.updateFontRgba());
  },

  onFontAlphaChange(e) {
    this.setData({ fontAlpha: Number(e.detail.value) }, () => this.updateFontRgba());
  },

  onFontScaleChange(e) {
    this.setData({ fontScale: Number(e.detail.value) });
  },

  refreshCalendar() {
    const { selectedYear, selectedMonth, selectedDay } = this.data;
    this.setData({
      monthLabel: `${selectedMonth}月`,
      calendarCells: getCalendarCells(selectedYear, selectedMonth, selectedDay)
    });
  },

  updateFontRgba() {
    const alpha = this.data.fontAlpha / 100;
    this.setData({
      fontRgba: hexToRgba(this.data.fontColor, alpha)
    });
  },

  onBgScaleChange(e) {
    this.setData({ bgScale: Number(e.detail.value) }, () => {
      this.recalculateBackground();
    });
  },

  measurePreview(callback) {
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .in(this)
        .select('#posterPreview')
        .boundingClientRect(rect => {
          if (!rect) {
            return;
          }
          this.setData({
            previewW: rect.width,
            previewH: rect.height
          }, () => {
            this.updateCalendarFitLayout();
            if (typeof callback === 'function') {
              callback();
            }
          });
        })
        .exec();
    });
  },

  updateCalendarFitLayout() {
    const { previewW, previewH } = this.data;
    if (!previewW || !previewH) {
      this.setData({
        calendarLayerStyle: '',
        dayTouchGridStyle: ''
      });
      return;
    }
    const ratio = previewH / previewW;
    const fitScale = ratio >= 1 ? 1 : clamp(0.92 + (ratio - 0.75) * 0.28, 0.9, 1);
    const freeSpaceOffset = Math.round(previewH * (1 - fitScale) * 0.62);
    const ratioOffset = Math.round(previewH * clamp((ratio - 1) * 0.09, -0.015, 0.07));
    const offsetY = Math.max(0, freeSpaceOffset + ratioOffset);
    const transformStyle = `transform: translateY(${offsetY}px) scale(${fitScale}); transform-origin: top center;`;
    this.setData({
      calendarLayerStyle: transformStyle,
      dayTouchGridStyle: transformStyle
    });
  },

  async chooseBackground() {
    try {
      const res = await chooseImageAsync();
      const src = res.tempFilePaths[0];
      this.setData({
        bgImage: src,
        selectedPresetBgIndex: -1
      });
      await this.recalculateBackground();
    } catch (err) {
      if (err && err.errMsg && !err.errMsg.includes('cancel')) {
        wx.showToast({ title: '背景上传失败', icon: 'none' });
      }
    }
  },

  async onPresetBgSelect(e) {
    const index = Number(e.currentTarget.dataset.index);
    const src = this.data.presetBackgrounds[index];
    if (!src) {
      return;
    }
    this.setData({
      selectedPresetBgIndex: index,
      bgImage: src,
      bgScale: 100
    });
    await this.recalculateBackground();
  },

  async recalculateBackground() {
    const { bgImage, previewW, previewH } = this.data;
    if (!bgImage || !previewW || !previewH) {
      return;
    }
    try {
      const info = await this.resolveBgImageInfo(bgImage);
      if (!info) {
        const userScale = this.data.bgScale / 100;
        const drawW = previewW * userScale;
        const drawH = previewH * userScale;
        const x = (previewW - drawW) / 2;
        const y = (previewH - drawH) / 2;
        const fixed = this.getClampedBgPosition(x, y, drawW, drawH);
        this.setData({
          bgDisplayW: drawW,
          bgDisplayH: drawH,
          bgX: fixed.x,
          bgY: fixed.y
        });
        return;
      }
      const fitScale = Math.max(previewW / info.width, previewH / info.height);
      const userScale = this.data.bgScale / 100;
      const drawW = info.width * fitScale * userScale;
      const drawH = info.height * fitScale * userScale;
      const x = (previewW - drawW) / 2;
      const y = (previewH - drawH) / 2;
      const fixed = this.getClampedBgPosition(x, y, drawW, drawH);
      this.setData({
        bgCanvasImage: info.path || bgImage,
        bgDisplayW: drawW,
        bgDisplayH: drawH,
        bgX: fixed.x,
        bgY: fixed.y
      });
    } catch (err) {
      const userScale = this.data.bgScale / 100;
      const drawW = previewW * userScale;
      const drawH = previewH * userScale;
      const fixed = this.getClampedBgPosition((previewW - drawW) / 2, (previewH - drawH) / 2, drawW, drawH);
      this.setData({
        bgDisplayW: drawW,
        bgDisplayH: drawH,
        bgX: fixed.x,
        bgY: fixed.y
      });
    }
  },

  async resolveBgImageInfo(src) {
    try {
      const info = await getImageInfoAsync(src);
      return {
        width: info.width,
        height: info.height,
        path: info.path || src
      };
    } catch (err) {
      if (!isRemoteUrl(src)) {
        return null;
      }
      try {
        const downloaded = await downloadFileAsync(src);
        if (!downloaded || downloaded.statusCode !== 200 || !downloaded.tempFilePath) {
          return null;
        }
        const info = await getImageInfoAsync(downloaded.tempFilePath);
        return {
          width: info.width,
          height: info.height,
          path: downloaded.tempFilePath
        };
      } catch (downloadErr) {
        return null;
      }
    }
  },

  resetBackground() {
    if (!this.data.bgImage) {
      return;
    }
    this.setData({ bgScale: 100 }, () => this.recalculateBackground());
  },

  onBgTouchStart(e) {
    if (this.data.activeStickerId) {
      this.setData({ activeStickerId: null });
    }
    if (!this.data.bgImage) {
      return;
    }
    const touch = e.touches[0];
    this.bgDragStart = {
      x: touch.clientX,
      y: touch.clientY,
      originX: this.data.bgX,
      originY: this.data.bgY
    };
  },

  onBgTouchMove(e) {
    if (!this.bgDragStart || !this.data.bgImage) {
      return;
    }
    const touch = e.touches[0];
    const nextX = this.bgDragStart.originX + (touch.clientX - this.bgDragStart.x);
    const nextY = this.bgDragStart.originY + (touch.clientY - this.bgDragStart.y);
    const fixed = this.getClampedBgPosition(nextX, nextY, this.data.bgDisplayW, this.data.bgDisplayH);
    this.setData({
      bgX: fixed.x,
      bgY: fixed.y
    });
  },

  getClampedBgPosition(x, y, drawW, drawH) {
    const minX = Math.min(0, this.data.previewW - drawW);
    const maxX = 0;
    const minY = Math.min(0, this.data.previewH - drawH);
    const maxY = 0;
    return {
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY)
    };
  },

  async chooseSticker() {
    try {
      const res = await chooseImageAsync();
      const src = res.tempFilePaths[0];
      const info = await getImageInfoAsync(src);
      const maxSide = Math.max(80, Math.min(this.data.previewW, this.data.previewH) * 0.18);
      const scale = maxSide / Math.max(info.width, info.height);
      const w = Math.max(50, info.width * scale);
      const h = Math.max(50, info.height * scale);
      const x = Math.max(0, (this.data.previewW - w) / 2);
      const y = Math.max(0, (this.data.previewH - h) / 2);
      const sticker = {
        id: `${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        src,
        x,
        y,
        w,
        h,
        rotation: 0
      };
      this.setData({
        stickers: [...this.data.stickers, sticker],
        activeStickerId: sticker.id
      });
    } catch (err) {
      if (err && err.errMsg && !err.errMsg.includes('cancel')) {
        wx.showToast({ title: '贴纸上传失败', icon: 'none' });
      }
    }
  },

  onStickerTap(e) {
    if (e.target && e.target.dataset && e.target.dataset.handle) {
      return;
    }
    const id = e.currentTarget.dataset.id;
    this.setData({ activeStickerId: id });
  },

  noop() {},

  onStickerDeleteTap(e) {
    const id = e.currentTarget.dataset.id || (e.target && e.target.dataset && e.target.dataset.id);
    if (!id) {
      return;
    }
    this.removeStickerById(id);
  },

  onStickerTouchStart(e) {
    if (this.stickerHandleState) {
      return;
    }
    const id = e.currentTarget.dataset.id;
    const sticker = this.data.stickers.find(item => item.id === id);
    if (!sticker) {
      return;
    }
    const touch = e.touches[0];
    this.stickerDrag = {
      id,
      startX: touch.clientX,
      startY: touch.clientY,
      originX: sticker.x,
      originY: sticker.y
    };
    this.setData({ activeStickerId: id });
  },

  onStickerTouchMove(e) {
    if (!this.stickerDrag || this.stickerHandleState) {
      return;
    }
    const touch = e.touches[0];
    const { id, startX, startY, originX, originY } = this.stickerDrag;
    const stickers = this.data.stickers.map(item => {
      if (item.id !== id) {
        return item;
      }
      const maxX = Math.max(0, this.data.previewW - item.w);
      const maxY = Math.max(0, this.data.previewH - item.h);
      const x = clamp(originX + (touch.clientX - startX), 0, maxX);
      const y = clamp(originY + (touch.clientY - startY), 0, maxY);
      return { ...item, x, y };
    });
    this.setData({ stickers });
  },

  removeSticker(e) {
    const id = e.currentTarget.dataset.id || (e.target && e.target.dataset && e.target.dataset.id);
    if (!id) {
      return;
    }
    this.removeStickerById(id);
  },

  removeActiveSticker() {
    const id = this.data.activeStickerId;
    if (!id) {
      return;
    }
    const stickers = this.data.stickers.filter(item => item.id !== id);
    if (this.stickerHandleState && this.stickerHandleState.id === id) {
      this.stickerHandleState = null;
    }
    this.setData({ stickers, activeStickerId: null });
  },

  onStickerScaleStart(e) {
    const id = e.currentTarget.dataset.id;
    const sticker = this.data.stickers.find(item => item.id === id);
    if (!sticker) {
      return;
    }
    const touch = e.touches[0];
    const cx = sticker.x + sticker.w / 2;
    const cy = sticker.y + sticker.h / 2;
    this.stickerHandleState = {
      type: 'scale',
      id,
      startDistance: Math.hypot(touch.clientX - cx, touch.clientY - cy),
      originW: sticker.w,
      originH: sticker.h,
      centerX: cx,
      centerY: cy
    };
  },

  onStickerScaleMove(e) {
    if (!this.stickerHandleState || this.stickerHandleState.type !== 'scale') {
      return;
    }
    const touch = e.touches[0];
    const state = this.stickerHandleState;
    const currentDistance = Math.hypot(touch.clientX - state.centerX, touch.clientY - state.centerY);
    const ratio = state.startDistance > 0 ? (currentDistance / state.startDistance) : 1;
    const nextW = clamp(state.originW * ratio, 40, this.data.previewW * 0.9);
    const nextH = clamp(state.originH * ratio, 40, this.data.previewH * 0.9);
    let nextX = state.centerX - nextW / 2;
    let nextY = state.centerY - nextH / 2;
    nextX = clamp(nextX, 0, Math.max(0, this.data.previewW - nextW));
    nextY = clamp(nextY, 0, Math.max(0, this.data.previewH - nextH));
    this.updateSticker(state.id, {
      w: nextW,
      h: nextH,
      x: nextX,
      y: nextY
    });
  },

  onStickerRotateStart(e) {
    const id = e.currentTarget.dataset.id;
    const sticker = this.data.stickers.find(item => item.id === id);
    if (!sticker) {
      return;
    }
    const touch = e.touches[0];
    const cx = sticker.x + sticker.w / 2;
    const cy = sticker.y + sticker.h / 2;
    this.stickerHandleState = {
      type: 'rotate',
      id,
      startAngle: Math.atan2(touch.clientY - cy, touch.clientX - cx),
      originRotation: sticker.rotation || 0,
      centerX: cx,
      centerY: cy
    };
  },

  onStickerRotateMove(e) {
    if (!this.stickerHandleState || this.stickerHandleState.type !== 'rotate') {
      return;
    }
    const touch = e.touches[0];
    const state = this.stickerHandleState;
    const angle = Math.atan2(touch.clientY - state.centerY, touch.clientX - state.centerX);
    const delta = (angle - state.startAngle) * 180 / Math.PI;
    this.updateSticker(state.id, { rotation: state.originRotation + delta });
  },

  onStickerHandleEnd() {
    this.stickerHandleState = null;
  },

  updateSticker(id, patch) {
    const stickers = this.data.stickers.map(item => {
      if (item.id !== id) {
        return item;
      }
      return { ...item, ...patch };
    });
    this.setData({ stickers });
  },

  removeStickerById(id) {
    const stickers = this.data.stickers.filter(item => item.id !== id);
    if (this.stickerHandleState && this.stickerHandleState.id === id) {
      this.stickerHandleState = null;
    }
    this.setData({
      stickers,
      activeStickerId: this.data.activeStickerId === id ? null : this.data.activeStickerId
    });
  },

  getCanvasSize() {
    if (this.data.posterRatio === '3:4') {
      return { width: 1200, height: 1600 };
    }
    if (this.data.posterRatio === '4:3') {
      return { width: 1600, height: 1200 };
    }
    return { width: 1200, height: 1200 };
  },

  captureCalendarLayout() {
    return new Promise(resolve => {
      wx.nextTick(() => {
        wx.createSelectorQuery()
          .in(this)
          .select('#posterPreview')
          .boundingClientRect()
          .select('.month-text')
          .boundingClientRect()
          .selectAll('.week-cell')
          .boundingClientRect()
          .selectAll('.day-text')
          .boundingClientRect()
          .selectAll('.lunar-text')
          .boundingClientRect()
          .select('.day-mark')
          .boundingClientRect()
          .exec(res => {
            if (!res || !res[0] || !res[1]) {
              resolve(null);
              return;
            }
            resolve({
              preview: res[0],
              month: res[1],
              weekCells: res[2] || [],
              dayTexts: res[3] || [],
              lunarTexts: res[4] || [],
              dayMark: res[5] || null
            });
          });
      });
    });
  },

  async prepareBgForSave() {
    const { bgImage, bgCanvasImage } = this.data;
    if (!bgImage) {
      return '';
    }

    if (bgCanvasImage) {
      try {
        const info = await getImageInfoAsync(bgCanvasImage);
        if (info && (info.path || bgCanvasImage)) {
          return info.path || bgCanvasImage;
        }
      } catch (err) {}
    }

    const bgInfo = await this.resolveBgImageInfo(bgImage);
    if (bgInfo && bgInfo.path) {
      this.setData({ bgCanvasImage: bgInfo.path });
      return bgInfo.path;
    }

    if (isRemoteUrl(bgImage)) {
      try {
        const downloaded = await downloadFileAsync(bgImage);
        if (downloaded && downloaded.statusCode === 200 && downloaded.tempFilePath) {
          this.setData({ bgCanvasImage: downloaded.tempFilePath });
          return downloaded.tempFilePath;
        }
      } catch (err) {}
    }

    return bgImage;
  },

  async savePoster() {
    try {
      wx.showLoading({ title: '正在保存...' });
      const bgDrawSource = await this.prepareBgForSave();
      const { width, height } = this.getCanvasSize();
      this.setData({
        renderCanvasWidth: width,
        renderCanvasHeight: height
      });
      await new Promise(resolve => wx.nextTick(resolve));

      const ctx = wx.createCanvasContext('posterCanvas', this);
      const layoutMetrics = await this.captureCalendarLayout();
      this.drawPoster(ctx, width, height, layoutMetrics, bgDrawSource);
      await new Promise(resolve => ctx.draw(false, resolve));

      const tempFile = await canvasToTempFileAsync({
        canvasId: 'posterCanvas',
        fileType: 'png',
        quality: 1,
        width,
        height,
        destWidth: width,
        destHeight: height
      }, this);
      await saveImageAsync(tempFile.tempFilePath);
      wx.hideLoading();
      wx.showToast({ title: '已保存到相册', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      if (err && err.errMsg && err.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置中开启“保存到相册”权限',
          success: modalRes => {
            if (modalRes.confirm) {
              wx.openSetting();
            }
          }
        });
        return;
      }
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  drawPoster(ctx, canvasW, canvasH, layoutMetrics, bgDrawSource) {
    const {
      bgImage,
      bgCanvasImage,
      bgX,
      bgY,
      bgDisplayW,
      bgDisplayH,
      previewW,
      previewH,
      monthLabel,
      weekHeaders,
      calendarCells,
      stickers,
      fontColor,
      fontAlpha,
      fontScale
    } = this.data;

    const sx = previewW ? canvasW / previewW : 1;
    const sy = previewH ? canvasH / previewH : 1;
    const scale = fontScale / 100;

    ctx.clearRect(0, 0, canvasW, canvasH);

    if (bgImage) {
      const drawSrc = bgDrawSource || bgCanvasImage || bgImage;
      ctx.drawImage(drawSrc, bgX * sx, bgY * sy, bgDisplayW * sx, bgDisplayH * sy);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, canvasW, canvasH);
      gradient.addColorStop(0, '#ffc6a9');
      gradient.addColorStop(1, '#ffa4d0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    const color = hexToRgba(fontColor, fontAlpha / 100);
    const sidePadding = Math.round(canvasW * 0.06);
    const monthY = Math.round(canvasH * 0.11);
    const weekY = Math.round(canvasH * 0.22);
    const gridTop = Math.round(canvasH * 0.28);
    const gridHeight = Math.round(canvasH * 0.66);
    const cellW = (canvasW - sidePadding * 2) / 7;
    const cellH = gridHeight / 6;

    const canUseLayoutMetrics = layoutMetrics
      && layoutMetrics.preview
      && layoutMetrics.month
      && Array.isArray(layoutMetrics.weekCells)
      && layoutMetrics.weekCells.length === weekHeaders.length;

    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.font = `700 ${Math.round(canvasW * 0.082 * scale)}px sans-serif`;
    ctx.textAlign = 'left';

    if (canUseLayoutMetrics) {
      const previewRect = layoutMetrics.preview;
      const monthRect = layoutMetrics.month;
      const toCanvasX = x => (x - previewRect.left) * sx;
      const toCanvasY = y => (y - previewRect.top) * sy;

      ctx.fillText(monthLabel, toCanvasX(monthRect.left), toCanvasY(monthRect.top));

      ctx.font = `500 ${Math.round(canvasW * 0.03 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      layoutMetrics.weekCells.forEach((rect, i) => {
        const x = toCanvasX(rect.left + rect.width / 2);
        const y = toCanvasY(rect.top);
        ctx.fillText(weekHeaders[i], x, y);
      });

      const validCells = calendarCells.filter(Boolean);
      const dayTexts = Array.isArray(layoutMetrics.dayTexts) ? layoutMetrics.dayTexts : [];
      const lunarTexts = Array.isArray(layoutMetrics.lunarTexts) ? layoutMetrics.lunarTexts : [];
      const selectedCell = validCells.find(item => item && item.isSelected);

      if (selectedCell && layoutMetrics.dayMark) {
        const markRect = layoutMetrics.dayMark;
        const markCenterX = toCanvasX(markRect.left + markRect.width / 2);
        const markCenterY = toCanvasY(markRect.top + markRect.height / 2);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 79, 102, 0.95)';
        ctx.fillStyle = 'rgba(255, 79, 102, 0.18)';
        ctx.lineWidth = Math.max(4, canvasW * 0.0042);
        ctx.arc(markCenterX, markCenterY, Math.min(markRect.width * sx, markRect.height * sy) * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      validCells.forEach((cell, idx) => {
        const dayRect = dayTexts[idx];
        const lunarRect = lunarTexts[idx];
        if (!dayRect || !lunarRect) {
          return;
        }
        const x = toCanvasX(dayRect.left + dayRect.width / 2);
        const dayY = toCanvasY(dayRect.top);
        const lunarY = toCanvasY(lunarRect.top);

        ctx.fillStyle = color;
        ctx.font = `600 ${Math.round(canvasW * 0.035 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(String(cell.day), x, dayY);

        ctx.font = `400 ${Math.round(canvasW * 0.018 * scale)}px sans-serif`;
        ctx.fillText(cell.lunar, x, lunarY);
      });
    } else {
      ctx.fillText(monthLabel, sidePadding, monthY);

      ctx.font = `500 ${Math.round(canvasW * 0.03 * scale)}px sans-serif`;
      for (let i = 0; i < weekHeaders.length; i += 1) {
        const x = sidePadding + cellW * i + cellW / 2;
        ctx.textAlign = 'center';
        ctx.fillText(weekHeaders[i], x, weekY);
      }

      for (let i = 0; i < calendarCells.length; i += 1) {
      const cell = calendarCells[i];
      if (!cell) {
        continue;
      }
      const col = i % 7;
      const row = Math.floor(i / 7);
      const x = sidePadding + col * cellW + cellW / 2;
      const y = gridTop + row * cellH + cellH * 0.52;

      if (cell.isSelected) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 79, 102, 0.95)';
        ctx.fillStyle = 'rgba(255, 79, 102, 0.18)';
        ctx.lineWidth = Math.max(4, canvasW * 0.0042);
        ctx.arc(x, y - 8, Math.min(cellW, cellH) * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = color;
      ctx.font = `600 ${Math.round(canvasW * 0.035 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(cell.day), x, y);

      ctx.font = `400 ${Math.round(canvasW * 0.018 * scale)}px sans-serif`;
      ctx.fillText(cell.lunar, x, y + Math.round(canvasH * 0.03));
      }
    }

    stickers.forEach(item => {
      const drawW = item.w * sx;
      const drawH = item.h * sy;
      const centerX = (item.x + item.w / 2) * sx;
      const centerY = (item.y + item.h / 2) * sy;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((item.rotation || 0) * Math.PI / 180);
      ctx.drawImage(item.src, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    });
  }
});
