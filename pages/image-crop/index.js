const { checkImageSize } = require('../../utils/util.js');

Page({
  data: {
    hasStarted: false,
    imagePath: '',
    
    // Viewport (Fixed crop frame)
    viewportWidth: 300,
    viewportHeight: 300,
    viewportX: 0,
    viewportY: 0,
    
    // Image Transform State
    imgDrawWidth: 0,
    imgDrawHeight: 0,
    imgX: 0,
    imgY: 0,
    imgScale: 1,
    imgRotate: 0,
    
    // Initial State for Reset
    initialImgScale: 1,
    
    // Touch Handling
    isDragging: false,
    isScaling: false,
    isResizing: false,
    activeCorner: '',
    startTouch: null,
    startImgX: 0,
    startImgY: 0,
    startImgScale: 1,
    startDistance: 0,
    startViewport: null,
    
    // Config
    aspectRatio: 0, // 0 = Free (Fit Image), >0 = Fixed Ratio
    
    // Export Canvas
    canvasWidth: 1080,
    canvasHeight: 1080
  },

  onLoad(options) {
    if (options.imagePath) {
      this.setData({ hasStarted: true });
      this.initImage(options.imagePath);
    } else {
      // Auto open chooser if no image
      // this.uploadImage(); 
    }
  },

  startExperience() {
    this.setData({ hasStarted: true });
    this.uploadImage();
  },

  uploadImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (!checkImageSize(res.tempFiles)) return;
        this.initImage(res.tempFilePaths[0]);
      }
    });
  },

  initImage(path) {
    wx.showLoading({ title: 'Loading...' });

    wx.getImageInfo({
      src: path,
      success: (res) => {
        const { windowWidth, windowHeight, safeArea } = wx.getSystemInfoSync();
        const safeInsetBottom = safeArea?.bottom ? Math.max(0, windowHeight - safeArea.bottom) : 0;
        const controlsHeight = 240 + safeInsetBottom;
        const safeHeight = windowHeight - controlsHeight - 24;
        
        // Calculate initial viewport (fit image into screen with some padding)
        const padding = 40;
        const availWidth = windowWidth - padding * 2;
        const availHeight = safeHeight - padding * 2;
        
        const imgRatio = res.width / res.height;
        let vw, vh;
        
        // Initial viewport fits the image aspect ratio (Free mode)
        if (imgRatio > availWidth / availHeight) {
          vw = availWidth;
          vh = availWidth / imgRatio;
        } else {
          vh = availHeight;
          vw = availHeight * imgRatio;
        }
        
        const vx = (windowWidth - vw) / 2;
        const vy = (safeHeight - vh) / 2 + 20; // Top padding
        
        this.setData({
          imagePath: path,
          imgDrawWidth: vw,
          imgDrawHeight: vh,
          viewportWidth: vw,
          viewportHeight: vh,
          viewportX: vx,
          viewportY: vy,
          imgX: 0,
          imgY: 0,
          imgScale: 1,
          imgRotate: 0,
          initialImgScale: 1,
          aspectRatio: 0 // Default to Free/Original
        });
        
        wx.hideLoading();
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: 'Load failed', icon: 'none' });
      }
    });
  },

  setAspectRatio(e) {
    const ratio = parseFloat(e.currentTarget.dataset.ratio);
    this.setData({ aspectRatio: ratio });
    this.updateViewport(ratio);
  },

  updateViewport(ratio) {
    const { windowWidth, windowHeight, safeArea } = wx.getSystemInfoSync();
    const safeInsetBottom = safeArea?.bottom ? Math.max(0, windowHeight - safeArea.bottom) : 0;
    const controlsHeight = 240 + safeInsetBottom;
    const safeHeight = windowHeight - controlsHeight - 24;
    const padding = 40;
    const availWidth = windowWidth - padding * 2;
    const availHeight = safeHeight - padding * 2;
    
    let vw, vh;
    
    if (ratio === 0) {
      // Use current visual image ratio
      const isRotatedRatio = Math.abs(this.data.imgRotate) % 180 === 90;
      const curRatio = isRotatedRatio ? (this.data.imgDrawHeight / this.data.imgDrawWidth) : (this.data.imgDrawWidth / this.data.imgDrawHeight);
      if (curRatio > availWidth / availHeight) {
        vw = availWidth;
        vh = availWidth / curRatio;
      } else {
        vh = availHeight;
        vw = availHeight * curRatio;
      }
    } else {
      if (ratio > availWidth / availHeight) {
        vw = availWidth;
        vh = availWidth / ratio;
      } else {
        vh = availHeight;
        vw = availHeight * ratio;
      }
    }
    
    const vx = (windowWidth - vw) / 2;
    const vy = (safeHeight - vh) / 2 + 20;
    
    // Reset image position/scale to fit new viewport
    // Calculate scale to cover viewport
    const isRotated = Math.abs(this.data.imgRotate) % 180 === 90;
    const baseW = isRotated ? this.data.imgDrawHeight : this.data.imgDrawWidth;
    const baseH = isRotated ? this.data.imgDrawWidth : this.data.imgDrawHeight;
    
    const imgRatio = baseW / baseH;
    const viewRatio = vw / vh;
    
    let scale = 1;
    // Cover mode: Ensure image covers the viewport
    if (imgRatio > viewRatio) {
       // Image is wider than viewport -> fit height
       scale = vh / baseH;
    } else {
       // Image is taller -> fit width
       scale = vw / baseW;
    }
    
    // We want image to be at least viewport size.
    const scaleW = vw / baseW;
    const scaleH = vh / baseH;
    const newScale = Math.max(scaleW, scaleH);
    
    // Also, when centering, we want the visual center to align with viewport center
    // imgX, imgY are translations of the unrotated element center.
    // Since transform-origin is center, translating the unrotated element also translates the visual center perfectly.
    // So to center it, imgX should be (vw - imgDrawWidth)/2
    
    this.setData({
      viewportWidth: vw,
      viewportHeight: vh,
      viewportX: vx,
      viewportY: vy,
      imgScale: newScale,
      imgX: (vw - this.data.imgDrawWidth) / 2, // Center
      imgY: (vh - this.data.imgDrawHeight) / 2
    });
  },

  rotateLeft() {
    this.setData({ imgRotate: this.data.imgRotate - 90 });
    this.updateViewport(this.data.aspectRatio);
  },

  rotateRight() {
    this.setData({ imgRotate: this.data.imgRotate + 90 });
    this.updateViewport(this.data.aspectRatio);
  },

  resetCrop() {
    this.setData({ imgRotate: 0 }, () => {
      this.updateViewport(this.data.aspectRatio);
    });
  },

  // Sync data from WXS
  syncData(data) {
    this.setData({
      viewportX: data.viewportX,
      viewportY: data.viewportY,
      viewportWidth: data.viewportWidth,
      viewportHeight: data.viewportHeight,
      imgX: data.imgX,
      imgY: data.imgY
    });
  },

  // Crop Resize Handling
  startResize(e) {
    if (e.touches.length !== 1) return;
    const corner = e.currentTarget.dataset.corner;
    this.setData({
      isResizing: true,
      activeCorner: corner,
      startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      startViewport: {
        x: this.data.viewportX,
        y: this.data.viewportY,
        w: this.data.viewportWidth,
        h: this.data.viewportHeight
      },
      startImgX: this.data.imgX,
      startImgY: this.data.imgY
    });
  },

  onResize(e) {
    if (!this.data.isResizing || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - this.data.startTouch.x;
    const dy = touch.clientY - this.data.startTouch.y;
    
    let { x, y, w, h } = this.data.startViewport;
    const minSize = 50; // Minimum crop size

    const scaledWidth = this.data.imgDrawWidth * this.data.imgScale;
    const scaledHeight = this.data.imgDrawHeight * this.data.imgScale;
    
    // Check if rotated by 90 or 270 degrees
    const isRotated = Math.abs(this.data.imgRotate) % 180 === 90;
    const visualWidth = isRotated ? scaledHeight : scaledWidth;
    const visualHeight = isRotated ? scaledWidth : scaledHeight;
    
    // Image visual top-left and bottom-right on screen
    const imgScreenX = this.data.startViewport.x + this.data.startImgX + this.data.imgDrawWidth / 2 - visualWidth / 2;
    const imgScreenY = this.data.startViewport.y + this.data.startImgY + this.data.imgDrawHeight / 2 - visualHeight / 2;
    const imgScreenRight = imgScreenX + visualWidth;
    const imgScreenBottom = imgScreenY + visualHeight;
    
    // Adjust viewport based on corner
    switch (this.data.activeCorner) {
      case 'tl':
        // Top-Left: Moves x, y, changes w, h
        let newX = Math.min(x + dx, x + w - minSize);
        let newY = Math.min(y + dy, y + h - minSize);
        
        // Constrain to image bounds
        newX = Math.max(imgScreenX, newX);
        newY = Math.max(imgScreenY, newY);
        
        let newW = (x + w) - newX;
        let newH = (y + h) - newY;
        
        x = newX;
        y = newY;
        w = newW;
        h = newH;
        break;
        
      case 'tr':
        // Top-Right: Moves y, changes w, h
        w = Math.max(minSize, w + dx);
        // Constrain right bound
        if (x + w > imgScreenRight) w = imgScreenRight - x;
        
        let newY_tr = Math.min(y + dy, y + h - minSize);
        // Constrain top bound
        newY_tr = Math.max(imgScreenY, newY_tr);
        
        h = (y + h) - newY_tr;
        y = newY_tr;
        break;
        
      case 'bl':
        // Bottom-Left: Moves x, changes w, h
        let newX_bl = Math.min(x + dx, x + w - minSize);
        // Constrain left bound
        newX_bl = Math.max(imgScreenX, newX_bl);
        
        w = (x + w) - newX_bl;
        x = newX_bl;
        
        h = Math.max(minSize, h + dy);
        // Constrain bottom bound
        if (y + h > imgScreenBottom) h = imgScreenBottom - y;
        break;
        
      case 'br':
        // Bottom-Right: changes w, h
        w = Math.max(minSize, w + dx);
        h = Math.max(minSize, h + dy);
        
        // Constrain right and bottom bounds
        if (x + w > imgScreenRight) w = imgScreenRight - x;
        if (y + h > imgScreenBottom) h = imgScreenBottom - y;
        break;
    }
    
    // Compensate Image Position to keep it static visually
    const dVx = x - this.data.startViewport.x;
    const dVy = y - this.data.startViewport.y;
    
    const newImgX = this.data.startImgX - dVx;
    const newImgY = this.data.startImgY - dVy;
    
    this.setData({
      viewportX: x,
      viewportY: y,
      viewportWidth: w,
      viewportHeight: h,
      imgX: newImgX,
      imgY: newImgY
    });
  },

  endResize() {
    this.setData({ isResizing: false, activeCorner: '' });
  },

  // Legacy Touch Handling (Kept for reference or fallback, but events are now intercepted by WXS)
  startTouch(e) {
    if (e.touches.length === 1) {
      this.setData({
        isDragging: true,
        startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
        startImgX: this.data.imgX,
        startImgY: this.data.imgY
      });
    } else if (e.touches.length === 2) {
      const dist = this.getDistance(e.touches);
      this.setData({
        isScaling: true,
        startDistance: dist,
        startImgScale: this.data.imgScale
      });
    }
  },

  onTouchMove(e) {
    if (this.data.isScaling && e.touches.length === 2) {
      const dist = this.getDistance(e.touches);
      let scale = this.data.startImgScale * (dist / this.data.startDistance);
      
      // Constrain minimum scale so image covers viewport
       const isRotatedScale = Math.abs(this.data.imgRotate) % 180 === 90;
       const baseW = isRotatedScale ? this.data.imgDrawHeight : this.data.imgDrawWidth;
       const baseH = isRotatedScale ? this.data.imgDrawWidth : this.data.imgDrawHeight;
       const minScaleW = this.data.viewportWidth / baseW;
       const minScaleH = this.data.viewportHeight / baseH;
       const minScale = Math.max(minScaleW, minScaleH);
       scale = Math.max(minScale, scale);
      
      // Also clamp imgX and imgY to ensure no bounds are exceeded after scaling
      const scaledWidth = this.data.imgDrawWidth * scale;
      const scaledHeight = this.data.imgDrawHeight * scale;
      
      const isRotated = Math.abs(this.data.imgRotate) % 180 === 90;
      const visualWidth = isRotated ? scaledHeight : scaledWidth;
      const visualHeight = isRotated ? scaledWidth : scaledHeight;
      
      const maxX = visualWidth / 2 - this.data.imgDrawWidth / 2;
      const minX = this.data.viewportWidth - visualWidth / 2 - this.data.imgDrawWidth / 2;
      const maxY = visualHeight / 2 - this.data.imgDrawHeight / 2;
      const minY = this.data.viewportHeight - visualHeight / 2 - this.data.imgDrawHeight / 2;
      
      let newImgX = Math.max(minX, Math.min(this.data.imgX, maxX));
      let newImgY = Math.max(minY, Math.min(this.data.imgY, maxY));

      this.setData({ 
        imgScale: scale,
        imgX: newImgX,
        imgY: newImgY
      });
    } else if (this.data.isDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - this.data.startTouch.x;
      const dy = e.touches[0].clientY - this.data.startTouch.y;
      
      let newImgX = this.data.startImgX + dx;
      let newImgY = this.data.startImgY + dy;
      
      // Constrain image movement to viewport bounds
      const scaledWidth = this.data.imgDrawWidth * this.data.imgScale;
      const scaledHeight = this.data.imgDrawHeight * this.data.imgScale;
      
      const isRotated = Math.abs(this.data.imgRotate) % 180 === 90;
      const visualWidth = isRotated ? scaledHeight : scaledWidth;
      const visualHeight = isRotated ? scaledWidth : scaledHeight;
      
      const maxX = visualWidth / 2 - this.data.imgDrawWidth / 2;
      const minX = this.data.viewportWidth - visualWidth / 2 - this.data.imgDrawWidth / 2;
      
      const maxY = visualHeight / 2 - this.data.imgDrawHeight / 2;
      const minY = this.data.viewportHeight - visualHeight / 2 - this.data.imgDrawHeight / 2;
      
      newImgX = Math.max(minX, Math.min(newImgX, maxX));
      newImgY = Math.max(minY, Math.min(newImgY, maxY));

      this.setData({
        imgX: newImgX,
        imgY: newImgY
      });
    }
  },

  endTouch() {
    this.setData({ isDragging: false, isScaling: false });
    // Optional: Snap back logic if image is out of bounds
  },

  getDistance(touches) {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  saveImage() {
    wx.showLoading({ title: 'Saving...' });
    
    const query = wx.createSelectorQuery();
    query.select('#cropCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
           wx.hideLoading();
           wx.showToast({ title: 'Canvas not found', icon: 'none' });
           return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 1. Get original image size first to decide output quality
        const img = canvas.createImage();
        img.onload = () => {
          const originalWidth = img.width;
          const originalHeight = img.height;
          
          // 2. Calculate crop area relative to original image
          // Screen Viewport (vw, vh)
          // Image on Screen (imgDrawWidth * imgScale, imgDrawHeight * imgScale) at (imgX, imgY)
          
          // We need to find the rectangle in the original image that corresponds to the viewport.
          // Ratio: screen_to_original = originalWidth / imgDrawWidth;
          
          // Let's use the inverse transform logic:
          // Canvas Output Size: We want high quality, so let's base it on the original image resolution
          // or a fixed high resolution like 1080p/4k.
          // Let's stick to max(originalWidth, 1080) but cropped?
          // Simpler: Define export width (e.g. 1080 or original width if smaller)
          
          // Target Width logic:
          // If crop is small part of image, we want that part in high res.
          // Let's try to map the viewport back to the original image pixels.
          
          const scaleFactor = originalWidth / this.data.imgDrawWidth; // How many original pixels per screen pixel (unscaled)
          
          // Image Top-Left on Screen relative to Viewport:
          // imgX, imgY
          
          // Viewport Top-Left relative to Image Top-Left (in screen pixels):
          // vx_rel_img = -imgX
          // vy_rel_img = -imgY
          
          // Since image is also scaled by `imgScale` (user zoom):
          // The visual size of image on screen is `imgDrawWidth * imgScale`.
          // The effective scale from Original to Screen Visual is: `(imgDrawWidth / originalWidth) * imgScale`.
          
          // We need coordinates in Original Image Space.
          // Scale from Screen Visual to Original: `1 / ((imgDrawWidth / originalWidth) * imgScale)`
          // = `originalWidth / (imgDrawWidth * imgScale)`
          
          const screenToOriginalRatio = originalWidth / (this.data.imgDrawWidth * this.data.imgScale);
          
          // Crop Rect in Original Image Coordinates:
          // x = -imgX * screenToOriginalRatio
          // y = -imgY * screenToOriginalRatio
          // w = viewportWidth * screenToOriginalRatio
          // h = viewportHeight * screenToOriginalRatio
          
          // Also need to handle Rotation.
          // Rotation happens around the center of the image.
          // This complicates "Crop Rect" calculation because it's not axis-aligned in original space if rotated.
          
          // If rotated, we must use Canvas to draw and crop.
          // We can set Canvas size to the desired output size (e.g. 1080p width equivalent).
          
          const destWidth = 1080;
          const destHeight = destWidth * (this.data.viewportHeight / this.data.viewportWidth);
          
          canvas.width = destWidth;
          canvas.height = destHeight;
          
          // Clear and Fill White
          ctx.clearRect(0, 0, destWidth, destHeight);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, destWidth, destHeight);
          
          ctx.save();
          
          // We want to transform the context so that the "Viewport" area of the image 
          // fills the "Canvas" area (0, 0, destWidth, destHeight).
          
          // 1. Move Canvas Origin to Center
          ctx.translate(destWidth / 2, destHeight / 2);
          
          // 2. Scale Canvas to match Screen Viewport coordinate system (scaled up to dest)
          // Screen Viewport Width = viewportWidth
          // Canvas Width = destWidth
          // Scale S = destWidth / viewportWidth
          const s = destWidth / this.data.viewportWidth;
          ctx.scale(s, s);
          
          // Now we are working in "Screen Pixels" units, centered at the viewport center.
          
          // 3. Apply Image Transforms (reverse order of operation logic effectively)
          // Image Position on Screen (relative to Viewport Top-Left): (imgX, imgY)
          // Image Center on Screen: 
          // cx = imgX + (imgDrawWidth * imgScale) / 2  <-- WRONG, transform-origin is center of unscaled element usually?
          // In wxml: transform-origin: center;
          // transform: translate(imgX, imgY) scale(imgScale) rotate(imgRotate);
          
          // CSS Transform Origin "center" refers to the center of the element itself (imgDrawWidth/2, imgDrawHeight/2).
          // And translate moves the element including its origin.
          // So visual center = (imgX + imgDrawWidth/2, imgY + imgDrawHeight/2).
          
          // We want to move this visual center to the current context origin (which is Viewport Center).
          // Viewport Center = (viewportWidth/2, viewportHeight/2).
          
          // Delta = VisualCenter - ViewportCenter
          const dx = (this.data.imgX + this.data.imgDrawWidth / 2) - (this.data.viewportWidth / 2);
          const dy = (this.data.imgY + this.data.imgDrawHeight / 2) - (this.data.viewportHeight / 2);
          
          ctx.translate(dx, dy);
          
          // 4. Rotate
          ctx.rotate(this.data.imgRotate * Math.PI / 180);
          
          // 5. Scale (User Zoom)
          ctx.scale(this.data.imgScale, this.data.imgScale);
          
          // 6. Draw Image centered at current origin
          // We draw it at its "screen size" (imgDrawWidth), but using the high-res source `img`.
          // ctx.drawImage(img, -imgDrawWidth/2, -imgDrawHeight/2, imgDrawWidth, imgDrawHeight)
          // This would downsample the high-res image to screen size, then we scaled it up by `s` (canvas/screen ratio).
          // This might lose quality if `s` is large.
          
          // Better approach for quality:
          // Don't scale the context by `imgScale` and `s` for the image drawing itself if possible?
          // But we need the composition to be correct.
          
          // Actually, since we use `img` (original high res), 
          // if we say `drawImage(img, -w/2, -h/2, w, h)`, Canvas will scale it.
          // We want `w` to be such that when multiplied by CTM (Current Transform Matrix), it matches output pixels.
          // CTM scale = s * imgScale.
          // We want `w * s * imgScale` approx `originalWidth` (if we want 1:1) or `destWidth`?
          // No, we want the geometry to match.
          
          // If we draw it with `imgDrawWidth`, the pixels are: `imgDrawWidth * s * imgScale`.
          // Example: 300px * 3.6 * 1 = 1080px.
          // If original image is 3000px, we are drawing it into 1080px space.
          // Canvas `drawImage` handles the resampling. 
          // Since `img` is the large source, drawing it into a smaller rect (defined by geometry) is fine (downsampling).
          // If we zoom in (imgScale = 10), then `300 * 3.6 * 10 = 10800` px.
          // Drawing 3000px image into 10800px space -> upsampling (blur).
          // This is expected behavior (zooming in past 100%).
          
          // So the logic holds: Draw using the "Screen Layout Dimensions", and let the Context Scale handle the resolution mapping.
          
          ctx.drawImage(img, -this.data.imgDrawWidth / 2, -this.data.imgDrawHeight / 2, this.data.imgDrawWidth, this.data.imgDrawHeight);
          
          ctx.restore();
          
          wx.canvasToTempFilePath({
            canvas,
            width: destWidth,
            height: destHeight,
            destWidth: destWidth,
            destHeight: destHeight,
            fileType: 'jpg',
            quality: 0.9,
            success: (res) => {
              wx.saveImageToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => {
                  wx.hideLoading();
                  wx.showToast({ title: '已保存', icon: 'success' });
                },
                fail: (err) => {
                  console.error('saveImageToPhotosAlbum fail', err);
                  wx.hideLoading();
                  // Handle permission denied
                  if (err.errMsg && err.errMsg.includes('auth')) {
                     wx.showModal({
                       title: '提示',
                       content: '需要保存到相册权限',
                       success: (sm) => { if (sm.confirm) wx.openSetting(); }
                     });
                  } else {
                     wx.showToast({ title: '保存失败', icon: 'none' });
                  }
                }
              });
            },
            fail: (err) => {
              console.error('canvasToTempFilePath fail', err);
              wx.hideLoading();
              wx.showToast({ title: '导出失败', icon: 'none' });
            }
          });
        };

        img.onerror = (err) => {
          console.error('Image load error', err);
          wx.hideLoading();
          wx.showToast({ title: '图片加载失败', icon: 'none' });
        };

        img.src = this.data.imagePath;
      });
  }
});
