Page({
  data: {
    shareId: '',
    title: '切多宫格图',
    rows: 3,
    cols: 3,
    images: []
  },

  onLoad(options) {
    const app = getApp();
    const shareId = options.shareId || (app.globalData && app.globalData.gridCutShareId) || '';

    if (!shareId) {
      this.handleNoData();
      return;
    }

    const payload = wx.getStorageSync(shareId);
    if (!payload || !Array.isArray(payload.images) || payload.images.length === 0) {
      this.handleNoData();
      return;
    }

    this.setData({
      shareId,
      title: payload.title || '切多宫格图',
      rows: Number(payload.rows) || 3,
      cols: Number(payload.cols) || 3,
      images: payload.images
    });
  },

  handleNoData() {
    wx.showToast({ title: '分享数据已失效', icon: 'none' });
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/grid-cut/index' });
    }, 900);
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.src;
    wx.previewImage({
      current,
      urls: this.data.images
    });
  },

  onShareAppMessage() {
    const { title, shareId, images } = this.data;
    return {
      title: title || '切多宫格图',
      path: `/pages/grid-cut/share/index?shareId=${shareId}`,
      imageUrl: images[0] || ''
    };
  }
});
