// 长图拼接入口：选图统一走 image-source-sheet 组件（内含鉴黄/校验）
Page({
  data: {
    showSourceSheet: false,
    puzzleMode: 'horizontal' // 拼接方向：horizontal / vertical
  },

  goHorizontal() {
    this.setData({ showSourceSheet: true, puzzleMode: 'horizontal' });
  },

  goVertical() {
    this.setData({ showSourceSheet: true, puzzleMode: 'vertical' });
  },

  closeSourceSheet() {
    this.setData({ showSourceSheet: false });
  },

  // 统一弹窗选图完成（组件已做大小校验 + 鉴黄）
  onSourceChosen(e) {
    const paths = (e.detail && e.detail.paths) || [];
    if (!paths.length) return;
    this.setData({ showSourceSheet: false });

    wx.navigateTo({
      url: `/pages/pintu/index?longMode=${this.data.puzzleMode}`,
      success: (resNav) => {
        resNav.eventChannel.emit('acceptDataFromOpenerPage', {
          images: paths,
          prechecked: true
        });
      }
    });
  }
});
