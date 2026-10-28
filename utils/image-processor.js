// 集中管理的证件照背景颜色映射
const ID_PHOTO_COLORS = {
  'white': { name: '白色', rgb: 'rgb(255, 255, 255)', hex: 'FFFFFF', type: 'solid' },
  'gray': { name: '灰色', rgb: '#aeaeae', hex: 'AEAEAE', type: 'solid' },
  'red': { name: '红色', rgb: 'rgb(215, 69, 50)', hex: 'D74532', type: 'solid' },
  'blue': { name: '蓝色', rgb: 'rgb(98, 139, 206)', hex: '628BCE', type: 'solid' },
  'green': { name: '绿色', rgb: 'rgb(52, 168, 83)', hex: '34A853', type: 'solid' },
  'skyblue': { name: '天蓝', rgb: 'rgb(135, 206, 235)', hex: '87CEEB', type: 'solid' },
  'darkred': { name: '深红色', rgb: 'rgb(178, 34, 34)', hex: 'B22222', type: 'solid' },
  'darkblue': { name: '深蓝色', rgb: 'rgb(30, 144, 255)', hex: '1E90FF', type: 'solid' },
  'hmt-blue': { name: '海马体蓝', type: 'gradient', direction: 'diagonal', gradientCss: 'linear-gradient(160deg, #dfeeff 0%, #9bbcf3 55%, #5f86d8 100%)', stops: [{ offset: 0, color: '#dfeeff' }, { offset: 0.55, color: '#9bbcf3' }, { offset: 1, color: '#5f86d8' }] },
  'hmt-pink': { name: '海马体粉', type: 'gradient', direction: 'diagonal', gradientCss: 'linear-gradient(160deg, #ffe6ef 0%, #f8b8cf 50%, #e78faf 100%)', stops: [{ offset: 0, color: '#ffe6ef' }, { offset: 0.5, color: '#f8b8cf' }, { offset: 1, color: '#e78faf' }] },
  'hmt-gray': { name: '海马体灰', type: 'gradient', direction: 'diagonal', gradientCss: 'linear-gradient(160deg, #f7f7f9 0%, #dfe1e8 55%, #b9beca 100%)', stops: [{ offset: 0, color: '#f7f7f9' }, { offset: 0.55, color: '#dfe1e8' }, { offset: 1, color: '#b9beca' }] }
};

function applyBackgroundFill(ctx, drawWidth, drawHeight, backgroundConfig) {
  if (backgroundConfig && backgroundConfig.type === 'gradient' && Array.isArray(backgroundConfig.stops) && backgroundConfig.stops.length > 1) {
    let gradient;
    if (backgroundConfig.direction === 'horizontal') {
      gradient = ctx.createLinearGradient(0, 0, drawWidth, 0);
    } else if (backgroundConfig.direction === 'diagonal') {
      gradient = ctx.createLinearGradient(0, 0, drawWidth, drawHeight);
    } else if (backgroundConfig.direction === 'reverse-diagonal') {
      gradient = ctx.createLinearGradient(drawWidth, 0, 0, drawHeight);
    } else {
      gradient = ctx.createLinearGradient(0, 0, 0, drawHeight);
    }
    backgroundConfig.stops.forEach((stop) => {
      gradient.addColorStop(stop.offset, stop.color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, drawWidth, drawHeight);
    return;
  }
  ctx.fillStyle = backgroundConfig;
  ctx.fillRect(0, 0, drawWidth, drawHeight);
}

// 证件照常用尺寸（300dpi 像素，w/h 为目标输出像素）
const ID_PHOTO_SIZES = [
  { key: 'original', name: '原图', mm: '', w: 0, h: 0 },
  { key: 'inch1', name: '1寸', mm: '25×35mm', w: 295, h: 413 },
  { key: 'inch1-large', name: '大1寸', mm: '33×48mm', w: 390, h: 567 },
  { key: 'inch2-small', name: '小2寸', mm: '35×45mm', w: 413, h: 531 },
  { key: 'inch2', name: '2寸', mm: '35×49mm', w: 413, h: 579 },
  { key: 'inch2-large', name: '大2寸', mm: '35×53mm', w: 413, h: 626 }
];

// 将 base64 或本地路径转临时文件（base64写盘）
function base64ToTempFile(imageData) {
  return new Promise((resolve, reject) => {
    if (!imageData) {
      reject(new Error('empty image'));
      return;
    }
    // 已经是临时文件
    if (imageData.startsWith('wxfile://') || imageData.startsWith('http://tmp/') || imageData.startsWith('http://usr/')) {
      console.log('图片已经是临时文件，直接返回:', imageData);
      resolve(imageData);
      return;
    }
    // 处理base64
    let pureBase64 = imageData;
    if (pureBase64.startsWith('data:image/')) {
      pureBase64 = pureBase64.split(',')[1];
    }
    
    if (!pureBase64) {
      reject(new Error('invalid base64 data'));
      return;
    }

    // 去除可能存在的换行符、空格等非base64字符
    pureBase64 = pureBase64.replace(/[\r\n\s]/gm, '');
    
    const fs = wx.getFileSystemManager();
    const tempDir = wx.env.USER_DATA_PATH;
    const fileName = `idphoto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
    const tempFilePath = `${tempDir}/${fileName}`;
    
    console.log('开始写入临时文件:', tempFilePath, '数据长度:', pureBase64.length);
    
    fs.writeFile({
      filePath: tempFilePath,
      data: pureBase64,
      encoding: 'base64',
      success: () => {
        console.log('临时文件写入成功:', tempFilePath);
        resolve(tempFilePath);
      },
      fail: (e) => {
        console.error('临时文件写入失败:', e, '文件路径:', tempFilePath);
        reject(new Error('临时文件写入失败: ' + e.errMsg));
      }
    });
  });
}

// 在canvas上绘制背景色和透明照片 (使用 OffscreenCanvas)
function drawBackground(imagePath, width, height, bgColor, bgImage, callback) {
  console.log('开始绘制背景(Offscreen)，图片路径:', imagePath, '颜色:', bgColor, '背景图:', bgImage);
  
  // 确保尺寸有效
  let drawWidth = width || 295;
  let drawHeight = height || 413;
  
  // 限制最大尺寸
  const maxWidth = 2000;
  const maxHeight = 2000;
  if (drawWidth > maxWidth || drawHeight > maxHeight) {
    const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
    drawWidth = Math.floor(drawWidth * scale);
    drawHeight = Math.floor(drawHeight * scale);
  }
  
  // 创建离屏 Canvas
  const canvas = wx.createOffscreenCanvas({ type: '2d', width: drawWidth, height: drawHeight });
  const ctx = canvas.getContext('2d');

  const exportImage = () => {
    console.log('Canvas渲染完成，准备导出');
    wx.canvasToTempFilePath({
      canvas: canvas,
      width: drawWidth,
      height: drawHeight,
      destWidth: drawWidth,
      destHeight: drawHeight,
      quality: 0.9,
      success: (res) => {
        console.log('导出成功:', res.tempFilePath);
        callback(res.tempFilePath);
      },
      fail: (err) => {
        console.error('导出失败:', err);
        callback(imagePath);
      }
    });
  };

  // 加载主图片
  const img = canvas.createImage();
  img.src = imagePath;
  img.onload = () => {
    // 1. 绘制背景
    if (bgImage) {
      const bgImg = canvas.createImage();
      bgImg.src = bgImage;
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, drawWidth, drawHeight);
        // 2. 绘制人像
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
        exportImage();
      };
      bgImg.onerror = (err) => {
        console.error('背景图加载失败:', err);
        applyBackgroundFill(ctx, drawWidth, drawHeight, bgColor);
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
        exportImage();
      };
    } else {
      applyBackgroundFill(ctx, drawWidth, drawHeight, bgColor);
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
      exportImage();
    }
  };
  
  img.onerror = (err) => {
    console.error('主图片加载失败:', err);
    callback(imagePath);
  };
}

// 本地合成背景色
function compositeBackground(transparentImage, color, backgroundImage, onResult, onComplete) {
  console.log('开始合成背景色，颜色:', color);

  let backgroundConfig = color;
  if (ID_PHOTO_COLORS[color]) {
    const colorConfig = ID_PHOTO_COLORS[color];
    backgroundConfig = colorConfig.type === 'gradient' ? colorConfig : colorConfig.rgb;
  }
  console.log('使用的背景配置:', backgroundConfig);

  // 转换base64为临时文件，便于canvas绘制
  base64ToTempFile(transparentImage)
    .then((imagePath) => {
      console.log('base64转换成功，临时文件路径:', imagePath);
      // 获取图片信息以获取原始宽高
      wx.getImageInfo({
        src: imagePath,
        success: (imageInfo) => {
          const width = imageInfo.width;
          const height = imageInfo.height;
          console.log('图片信息获取成功，尺寸:', width, 'x', height);

          drawBackground(imagePath, width, height, backgroundConfig, backgroundImage, (result) => {
            console.log('背景色合成完成，结果路径:', result);
            if (onResult) onResult(result);
            if (onComplete) onComplete();
          });
        },
        fail: (error) => {
          console.warn('获取图片信息失败，使用默认1寸尺寸:', error);
          const defaultWidth = 295;
          const defaultHeight = 413;
          drawBackground(imagePath, defaultWidth, defaultHeight, backgroundConfig, backgroundImage, (result) => {
            if (onResult) onResult(result);
            if (onComplete) onComplete();
          });
        }
      });
    })
    .catch((err) => {
      console.error('base64转换失败:', err);
      if (onResult) onResult(transparentImage || '');
      if (onComplete) onComplete();
    });
}

// 按目标证件尺寸合成：人像 cover 裁切到目标比例，再填充背景色/背景图（或保持透明）
function cropAndComposite(transparentImage, color, backgroundImage, targetWidth, targetHeight, onResult, onComplete) {
  let backgroundConfig = null;
  if (color) {
    const colorConfig = ID_PHOTO_COLORS[color];
    backgroundConfig = colorConfig ? (colorConfig.type === 'gradient' ? colorConfig : colorConfig.rgb) : color;
  }

  base64ToTempFile(transparentImage)
    .then((imagePath) => {
      wx.getImageInfo({
        src: imagePath,
        success: (imageInfo) => {
          drawCroppedToSize(imagePath, imageInfo.width, imageInfo.height, targetWidth, targetHeight, backgroundConfig, backgroundImage, (result) => {
            if (onResult) onResult(result);
            if (onComplete) onComplete();
          });
        },
        fail: (error) => {
          console.warn('获取图片信息失败，按整图缩放处理:', error);
          drawCroppedToSize(imagePath, 0, 0, targetWidth, targetHeight, backgroundConfig, backgroundImage, (result) => {
            if (onResult) onResult(result);
            if (onComplete) onComplete();
          });
        }
      });
    })
    .catch((err) => {
      console.error('base64转换失败:', err);
      if (onResult) onResult(transparentImage || '');
      if (onComplete) onComplete();
    });
}

// 离屏 canvas：背景填充 + 人像按目标尺寸 cover 裁切（裁切偏上保留头部）
function drawCroppedToSize(imagePath, imgW, imgH, targetW, targetH, backgroundConfig, bgImage, callback) {
  const drawWidth = targetW;
  const drawHeight = targetH;
  const canvas = wx.createOffscreenCanvas({ type: '2d', width: drawWidth, height: drawHeight });
  const ctx = canvas.getContext('2d');

  const exportImage = () => {
    // 统一导出 PNG：透明底保留 alpha，证件照保存更清晰
    wx.canvasToTempFilePath({
      canvas: canvas,
      width: drawWidth,
      height: drawHeight,
      destWidth: drawWidth,
      destHeight: drawHeight,
      fileType: 'png',
      success: (res) => callback(res.tempFilePath),
      fail: (err) => {
        console.error('尺寸裁切导出失败:', err);
        callback(imagePath);
      }
    });
  };

  const drawPerson = () => {
    const img = canvas.createImage();
    img.src = imagePath;
    img.onload = () => {
      let sx = 0;
      let sy = 0;
      let sw = img.width || imgW;
      let sh = img.height || imgH;

      if (imgW > 0 && imgH > 0) {
        // cover 裁切：等比放大填满目标框，多余部分裁掉
        const scale = Math.max(drawWidth / imgW, drawHeight / imgH);
        sw = Math.round(drawWidth / scale);
        sh = Math.round(drawHeight / scale);
        sx = Math.round((imgW - sw) / 2);
        // 竖向多余高度偏上取（25% 位置），保留头部
        sy = Math.round((imgH - sh) * 0.25);
        sx = Math.max(0, Math.min(sx, imgW - sw));
        sy = Math.max(0, Math.min(sy, imgH - sh));
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, drawWidth, drawHeight);
      exportImage();
    };
    img.onerror = (err) => {
      console.error('主图片加载失败:', err);
      callback(imagePath);
    };
  };

  if (bgImage) {
    const bgImg = canvas.createImage();
    bgImg.src = bgImage;
    bgImg.onload = () => {
      ctx.drawImage(bgImg, 0, 0, drawWidth, drawHeight);
      drawPerson();
    };
    bgImg.onerror = () => {
      if (backgroundConfig) {
        applyBackgroundFill(ctx, drawWidth, drawHeight, backgroundConfig);
      }
      drawPerson();
    };
  } else if (backgroundConfig) {
    applyBackgroundFill(ctx, drawWidth, drawHeight, backgroundConfig);
    drawPerson();
  } else {
    // 透明底：不填充背景，保留人像 alpha
    drawPerson();
  }
}

module.exports = {
  ID_PHOTO_COLORS,
  ID_PHOTO_SIZES,
  base64ToTempFile,
  compositeBackground,
  drawBackground,
  cropAndComposite
};
