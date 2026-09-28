Page({
  goHorizontal() {
    this.chooseImages('horizontal');
  },

  goVertical() {
    this.chooseImages('vertical');
  },

  chooseImages(mode) {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFiles.map(file => file.tempFilePath);
        if (tempFilePaths.length === 0) return;
        
        wx.navigateTo({
          url: `/pages/pintu/index?longMode=${mode}`,
          success: (resNav) => {
            resNav.eventChannel.emit('acceptDataFromOpenerPage', {
              images: tempFilePaths
            });
          }
        });
      }
    });
  }
});
