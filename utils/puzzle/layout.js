function getHeightRatio(imageInfos, index) {
  const info = imageInfos[index];
  if (info && info.width > 0 && info.height > 0) {
    if (info.rotate === 90 || info.rotate === 270) {
      return info.width / info.height;
    }
    return info.height / info.width;
  }
  return 1;
}

function calculateFixedRatioCells(count, W, H, gap, modes) {
  const {
    layoutMode,
    tripleLayoutMode,
    fourLayoutMode,
    fiveLayoutMode,
    sixLayoutMode,
    sevenLayoutMode,
    eightLayoutMode,
    nineLayoutMode
  } = modes;
  const cells = [];
  const b = gap;

  if (count === 1) {
    cells.push({ x: 0, y: 0, w: W, h: H });
  } else if (count === 2) {
    if (layoutMode === 'vertical') {
      const h = (H - b) / 2;
      cells.push({ x: 0, y: 0, w: W, h });
      cells.push({ x: 0, y: h + b, w: W, h });
    } else {
      const w = (W - b) / 2;
      cells.push({ x: 0, y: 0, w, h: H });
      cells.push({ x: w + b, y: 0, w, h: H });
    }
  } else if (count === 3) {
    if (tripleLayoutMode === 'vertical') {
      const h = (H - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w: W, h });
      cells.push({ x: 0, y: h + b, w: W, h });
      cells.push({ x: 0, y: (h + b) * 2, w: W, h });
    } else if (tripleLayoutMode === 'horizontal') {
      const w = (W - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w, h: H });
      cells.push({ x: w + b, y: 0, w, h: H });
      cells.push({ x: (w + b) * 2, y: 0, w, h: H });
    } else if (tripleLayoutMode === 'bottom-large') {
      const subH = (H - b) / 3;
      const mainH = (H - b) * 2 / 3;
      const subW = (W - b) / 2;
      cells.push({ x: 0, y: 0, w: subW, h: subH });
      cells.push({ x: subW + b, y: 0, w: subW, h: subH });
      cells.push({ x: 0, y: subH + b, w: W, h: mainH });
    } else if (tripleLayoutMode === 'left-large') {
      const mainW = (W - b) * 2 / 3;
      const subW = (W - b) / 3;
      const subH = (H - b) / 2;
      cells.push({ x: 0, y: 0, w: mainW, h: H });
      cells.push({ x: mainW + b, y: 0, w: subW, h: subH });
      cells.push({ x: mainW + b, y: subH + b, w: subW, h: subH });
    } else if (tripleLayoutMode === 'right-large') {
      const subW = (W - b) / 3;
      const mainW = (W - b) * 2 / 3;
      const subH = (H - b) / 2;
      cells.push({ x: 0, y: 0, w: subW, h: subH });
      cells.push({ x: 0, y: subH + b, w: subW, h: subH });
      cells.push({ x: subW + b, y: 0, w: mainW, h: H });
    } else {
      const mainH = (H - b) * 2 / 3;
      const subH = (H - b) / 3;
      const subW = (W - b) / 2;
      cells.push({ x: 0, y: 0, w: W, h: mainH });
      cells.push({ x: 0, y: mainH + b, w: subW, h: subH });
      cells.push({ x: subW + b, y: mainH + b, w: subW, h: subH });
    }
  } else if (count === 4) {
    if (fourLayoutMode === 'vertical') {
      const h = (H - 3 * b) / 4;
      for (let i = 0; i < 4; i++) cells.push({ x: 0, y: i * (h + b), w: W, h });
    } else if (fourLayoutMode === 'horizontal') {
      const w = (W - 3 * b) / 4;
      for (let i = 0; i < 4; i++) cells.push({ x: i * (w + b), y: 0, w, h: H });
    } else if (fourLayoutMode === 'top-large') {
      const mainH = (H - b) * 2 / 3;
      const subH = (H - b) / 3;
      const subW = (W - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w: W, h: mainH });
      cells.push({ x: 0, y: mainH + b, w: subW, h: subH });
      cells.push({ x: subW + b, y: mainH + b, w: subW, h: subH });
      cells.push({ x: subW * 2 + b * 2, y: mainH + b, w: subW, h: subH });
    } else if (fourLayoutMode === 'bottom-large') {
      const subH = (H - b) / 3;
      const mainH = (H - b) * 2 / 3;
      const subW = (W - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w: subW, h: subH });
      cells.push({ x: subW + b, y: 0, w: subW, h: subH });
      cells.push({ x: subW * 2 + b * 2, y: 0, w: subW, h: subH });
      cells.push({ x: 0, y: subH + b, w: W, h: mainH });
    } else if (fourLayoutMode === 'left-large') {
      const mainW = (W - b) * 2 / 3;
      const subW = (W - b) / 3;
      const subH = (H - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w: mainW, h: H });
      cells.push({ x: mainW + b, y: 0, w: subW, h: subH });
      cells.push({ x: mainW + b, y: subH + b, w: subW, h: subH });
      cells.push({ x: mainW + b, y: subH * 2 + b * 2, w: subW, h: subH });
    } else if (fourLayoutMode === 'right-large') {
      const subW = (W - b) / 3;
      const mainW = (W - b) * 2 / 3;
      const subH = (H - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w: subW, h: subH });
      cells.push({ x: 0, y: subH + b, w: subW, h: subH });
      cells.push({ x: 0, y: subH * 2 + b * 2, w: subW, h: subH });
      cells.push({ x: subW + b, y: 0, w: mainW, h: H });
    } else {
      const w = (W - b) / 2;
      const h = (H - b) / 2;
      cells.push({ x: 0, y: 0, w, h });
      cells.push({ x: w + b, y: 0, w, h });
      cells.push({ x: 0, y: h + b, w, h });
      cells.push({ x: w + b, y: h + b, w, h });
    }
  } else if (count === 5) {
    if (fiveLayoutMode === 'vertical') {
      const h = (H - 4 * b) / 5;
      for (let i = 0; i < 5; i++) cells.push({ x: 0, y: i * (h + b), w: W, h });
    } else if (fiveLayoutMode === 'horizontal') {
      const w = (W - 4 * b) / 5;
      for (let i = 0; i < 5; i++) cells.push({ x: i * (w + b), y: 0, w, h: H });
    } else if (fiveLayoutMode === 'left-two') {
      const w2 = (W - b) / 2;
      const h2 = (H - b) / 2;
      const h3 = (H - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w: w2, h: h2 });
      cells.push({ x: 0, y: h2 + b, w: w2, h: h2 });
      cells.push({ x: w2 + b, y: 0, w: w2, h: h3 });
      cells.push({ x: w2 + b, y: h3 + b, w: w2, h: h3 });
      cells.push({ x: w2 + b, y: h3 * 2 + b * 2, w: w2, h: h3 });
    } else {
      const h = (H - b) / 2;
      const w2 = (W - b) / 2;
      const w3 = (W - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w: w2, h });
      cells.push({ x: w2 + b, y: 0, w: w2, h });
      cells.push({ x: 0, y: h + b, w: w3, h });
      cells.push({ x: w3 + b, y: h + b, w: w3, h });
      cells.push({ x: w3 * 2 + b * 2, y: h + b, w: w3, h });
    }
  } else if (count === 6) {
    if (sixLayoutMode === 'vertical') {
      const h = (H - 5 * b) / 6;
      for (let i = 0; i < 6; i++) cells.push({ x: 0, y: i * (h + b), w: W, h });
    } else if (sixLayoutMode === 'horizontal') {
      const w = (W - 5 * b) / 6;
      for (let i = 0; i < 6; i++) cells.push({ x: i * (w + b), y: 0, w, h: H });
    } else {
      const w = (W - b) / 2;
      const h = (H - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w, h });
      cells.push({ x: w + b, y: 0, w, h });
      cells.push({ x: 0, y: h + b, w, h });
      cells.push({ x: w + b, y: h + b, w, h });
      cells.push({ x: 0, y: h * 2 + b * 2, w, h });
      cells.push({ x: w + b, y: h * 2 + b * 2, w, h });
    }
  } else if (count === 7) {
    if (sevenLayoutMode === 'vertical') {
      const h = (H - 6 * b) / 7;
      for (let i = 0; i < 7; i++) cells.push({ x: 0, y: i * (h + b), w: W, h });
    } else if (sevenLayoutMode === 'horizontal') {
      const w = (W - 6 * b) / 7;
      for (let i = 0; i < 7; i++) cells.push({ x: i * (w + b), y: 0, w, h: H });
    } else if (sevenLayoutMode === 'grid-4-3') {
      const h = (H - b) / 2;
      const w4 = (W - 3 * b) / 4;
      const w3 = (W - 2 * b) / 3;
      for (let i = 0; i < 4; i++) cells.push({ x: i * (w4 + b), y: 0, w: w4, h });
      for (let i = 0; i < 3; i++) cells.push({ x: i * (w3 + b), y: h + b, w: w3, h });
    } else if (sevenLayoutMode === 'top-one') {
      const h = (H - 2 * b) / 3;
      const w3 = (W - 2 * b) / 3;
      cells.push({ x: 0, y: 0, w: W, h });
      for (let i = 0; i < 3; i++) cells.push({ x: i * (w3 + b), y: h + b, w: w3, h });
      for (let i = 0; i < 3; i++) cells.push({ x: i * (w3 + b), y: h * 2 + b * 2, w: w3, h });
    } else {
      const h = (H - b) / 2;
      const w3 = (W - 2 * b) / 3;
      const w4 = (W - 3 * b) / 4;
      for (let i = 0; i < 3; i++) cells.push({ x: i * (w3 + b), y: 0, w: w3, h });
      for (let i = 0; i < 4; i++) cells.push({ x: i * (w4 + b), y: h + b, w: w4, h });
    }
  } else if (count === 8) {
    if (eightLayoutMode === 'vertical') {
      const h = (H - 7 * b) / 8;
      for (let i = 0; i < 8; i++) cells.push({ x: 0, y: i * (h + b), w: W, h });
    } else if (eightLayoutMode === 'horizontal') {
      const w = (W - 7 * b) / 8;
      for (let i = 0; i < 8; i++) cells.push({ x: i * (w + b), y: 0, w, h: H });
    } else if (eightLayoutMode === 'grid-4-4') {
      const h = (H - b) / 2;
      const w4 = (W - 3 * b) / 4;
      for (let i = 0; i < 4; i++) cells.push({ x: i * (w4 + b), y: 0, w: w4, h });
      for (let i = 0; i < 4; i++) cells.push({ x: i * (w4 + b), y: h + b, w: w4, h });
    } else {
      const h = (H - 2 * b) / 3;
      const w3 = (W - 2 * b) / 3;
      const w2 = (W - b) / 2;
      for (let i = 0; i < 3; i++) cells.push({ x: i * (w3 + b), y: 0, w: w3, h });
      for (let i = 0; i < 3; i++) cells.push({ x: i * (w3 + b), y: h + b, w: w3, h });
      for (let i = 0; i < 2; i++) cells.push({ x: i * (w2 + b), y: h * 2 + b * 2, w: w2, h });
    }
  } else if (count === 9) {
    if (nineLayoutMode === 'vertical') {
      const h = (H - 8 * b) / 9;
      for (let i = 0; i < 9; i++) cells.push({ x: 0, y: i * (h + b), w: W, h });
    } else if (nineLayoutMode === 'horizontal') {
      const w = (W - 8 * b) / 9;
      for (let i = 0; i < 9; i++) cells.push({ x: i * (w + b), y: 0, w, h: H });
    } else {
      const h = (H - 2 * b) / 3;
      const w3 = (W - 2 * b) / 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          cells.push({ x: c * (w3 + b), y: r * (h + b), w: w3, h });
        }
      }
    }
  } else if (count > 9) {
    if (layoutMode === 'horizontal') {
      const w = (W - (count - 1) * b) / count;
      for (let i = 0; i < count; i++) {
        cells.push({ x: i * (w + b), y: 0, w, h: H });
      }
    } else {
      const h = (H - (count - 1) * b) / count;
      for (let i = 0; i < count; i++) {
        cells.push({ x: 0, y: i * (h + b), w: W, h });
      }
    }
  }

  return cells;
}

function calculateOriginalLayoutCellsFallback(maxWidth, gap, imageInfos, gridRows, layoutMode) {
  const cells = [];
  let canvasH = 0;
  const count = imageInfos.length;

  if (count > 9) {
    if (layoutMode === 'horizontal') {
      const w = (maxWidth - (count + 1) * gap) / count;
      for (let i = 0; i < count; i++) {
        cells.push({ x: gap + i * (w + gap), y: gap, w, h: w });
      }
      canvasH = w + 2 * gap;
    } else {
      const w = maxWidth - 2 * gap;
      let y = gap;
      for (let i = 0; i < count; i++) {
        const h = w * getHeightRatio(imageInfos, i);
        cells.push({ x: gap, y, w, h });
        y += h + gap;
      }
      canvasH = y;
    }
    return { canvasHeight: Math.floor(canvasH), cells };
  }

  if (gridRows && gridRows.length > 0) {
    let currentY = gap;
    let imgIndex = 0;
    gridRows.forEach(row => {
      const rowGap = gap;
      const contentWidth = maxWidth - 2 * gap - (row.length - 1) * rowGap;
      let invSum = 0;
      for (let i = 0; i < row.length; i++) {
        invSum += 1 / getHeightRatio(imageInfos, imgIndex + i);
      }
      const H_row = contentWidth / invSum;
      let currentX = gap;
      let remainingWidth = contentWidth;
      for (let i = 0; i < row.length; i++) {
        const w_i = i === row.length - 1 ? remainingWidth : H_row / getHeightRatio(imageInfos, imgIndex + i);
        cells.push({ x: currentX, y: currentY, w: w_i, h: H_row });
        currentX += w_i + rowGap;
        remainingWidth -= w_i;
      }
      imgIndex += row.length;
      currentY += H_row + gap;
    });
    canvasH = currentY;
  } else {
    canvasH = maxWidth;
  }
  return { canvasHeight: Math.floor(canvasH), cells };
}

function calculateOriginalLayoutCells(maxWidth, outerGap, innerGap, options) {
  const { images, imageInfos, gridRows, modes } = options;
  const {
    layoutMode,
    tripleLayoutMode,
    fourLayoutMode,
    fiveLayoutMode,
    sixLayoutMode,
    sevenLayoutMode,
    eightLayoutMode,
    nineLayoutMode
  } = modes;
  const cells = [];
  let canvasH = 0;
  const margin = outerGap > 0 ? outerGap : 0;
  const spacing = innerGap > 0 ? innerGap : 0;
  const count = images.length;

  const layoutRow = (startIndex, num, yOffset, availableWidth) => {
    let invSum = 0;
    for (let i = 0; i < num; i++) {
      invSum += 1 / getHeightRatio(imageInfos, startIndex + i);
    }

    const contentWidth = availableWidth - (num - 1) * spacing;
    const h = contentWidth / invSum;
    const rowCells = [];
    let currentX = margin;
    let remainingContentWidth = contentWidth;

    for (let i = 0; i < num; i++) {
      const w_i = i === num - 1 ? remainingContentWidth : h / getHeightRatio(imageInfos, startIndex + i);
      rowCells.push({ x: currentX, y: yOffset, w: w_i, h });
      currentX += w_i + spacing;
      remainingContentWidth -= w_i;
    }

    return { h, cells: rowCells };
  };

  if (count === 0) {
    canvasH = Math.floor(maxWidth * 4 / 3);
  } else if (count === 1) {
    const w = maxWidth - 2 * margin;
    const h = w * getHeightRatio(imageInfos, 0);
    canvasH = h + 2 * margin;
    cells.push({ x: margin, y: margin, w, h });
  } else if (count === 2) {
    if (layoutMode === 'vertical') {
      const w = maxWidth - 2 * margin;
      const h0 = w * getHeightRatio(imageInfos, 0);
      const h1 = w * getHeightRatio(imageInfos, 1);
      canvasH = h0 + h1 + 2 * margin + spacing;
      cells.push({ x: margin, y: margin, w, h: h0 });
      cells.push({ x: margin, y: margin + h0 + spacing, w, h: h1 });
    } else {
      const availableWidth = maxWidth - 2 * margin;
      const res = layoutRow(0, 2, margin, availableWidth);
      canvasH = res.h + 2 * margin;
      cells.push(...res.cells);
    }
  } else if (count === 3) {
    if (tripleLayoutMode === 'vertical') {
      const w = maxWidth - 2 * margin;
      let y = margin;
      for (let i = 0; i < 3; i++) {
        const h = w * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w, h });
        y += h + spacing;
      }
      canvasH = y - spacing + margin;
    } else if (tripleLayoutMode === 'horizontal') {
      const availableWidth = maxWidth - 2 * margin;
      const res = layoutRow(0, 3, margin, availableWidth);
      canvasH = res.h + 2 * margin;
      cells.push(...res.cells);
    } else if (tripleLayoutMode === 'top-large') {
      const w_total = maxWidth - 2 * margin;
      const h0 = w_total * getHeightRatio(imageInfos, 0);
      const res = layoutRow(1, 2, margin + h0 + spacing, w_total);
      canvasH = h0 + res.h + 2 * margin + spacing;
      cells.push({ x: margin, y: margin, w: w_total, h: h0 });
      cells.push(...res.cells);
    } else if (tripleLayoutMode === 'bottom-large') {
      const w_total = maxWidth - 2 * margin;
      const res = layoutRow(0, 2, margin, w_total);
      const h2 = w_total * getHeightRatio(imageInfos, 2);
      canvasH = res.h + h2 + 2 * margin + spacing;
      cells.push(...res.cells);
      cells.push({ x: margin, y: margin + res.h + spacing, w: w_total, h: h2 });
    } else if (tripleLayoutMode === 'left-large') {
      const availableWidth = maxWidth - 2 * margin - spacing;
      const r0 = getHeightRatio(imageInfos, 0);
      const r1 = getHeightRatio(imageInfos, 1);
      const r2 = getHeightRatio(imageInfos, 2);
      const rightRatioSum = r1 + r2;
      const H = (availableWidth + spacing / rightRatioSum) / (1 / r0 + 1 / rightRatioSum);
      canvasH = H + 2 * margin;
      const w_left = H / r0;
      const w_right = availableWidth - w_left;
      const h1 = w_right * r1;
      const h2 = w_right * r2;
      cells.push({ x: margin, y: margin, w: w_left, h: H });
      cells.push({ x: margin + w_left + spacing, y: margin, w: w_right, h: h1 });
      cells.push({ x: margin + w_left + spacing, y: margin + h1 + spacing, w: w_right, h: h2 });
    } else if (tripleLayoutMode === 'right-large') {
      const availableWidth = maxWidth - 2 * margin - spacing;
      const r0 = getHeightRatio(imageInfos, 0);
      const r1 = getHeightRatio(imageInfos, 1);
      const r2 = getHeightRatio(imageInfos, 2);
      const leftRatioSum = r0 + r1;
      const H = (availableWidth + spacing / leftRatioSum) / (1 / leftRatioSum + 1 / r2);
      canvasH = H + 2 * margin;
      const w_left = (H - spacing) / leftRatioSum;
      const w_right = availableWidth - w_left;
      const h0 = w_left * r0;
      const h1 = w_left * r1;
      cells.push({ x: margin, y: margin, w: w_left, h: h0 });
      cells.push({ x: margin, y: margin + h0 + spacing, w: w_left, h: h1 });
      cells.push({ x: margin + w_left + spacing, y: margin, w: w_right, h: H });
    } else {
      return calculateOriginalLayoutCellsFallback(maxWidth, Math.max(margin, spacing), imageInfos, gridRows, layoutMode);
    }
  } else if (count === 4) {
    if (fourLayoutMode === 'grid') {
      const availableWidth = maxWidth - 2 * margin;
      const row1 = layoutRow(0, 2, margin, availableWidth);
      const row2 = layoutRow(2, 2, margin + row1.h + spacing, availableWidth);
      canvasH = row1.h + row2.h + 2 * margin + spacing;
      cells.push(...row1.cells, ...row2.cells);
    } else if (fourLayoutMode === 'vertical') {
      const w = maxWidth - 2 * margin;
      let y = margin;
      for (let i = 0; i < 4; i++) {
        const h = w * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w, h });
        y += h + spacing;
      }
      canvasH = y - spacing + margin;
    } else if (fourLayoutMode === 'horizontal') {
      const availableWidth = maxWidth - 2 * margin;
      const res = layoutRow(0, 4, margin, availableWidth);
      canvasH = res.h + 2 * margin;
      cells.push(...res.cells);
    } else if (fourLayoutMode === 'top-large') {
      const w_total = maxWidth - 2 * margin;
      const h0 = w_total * getHeightRatio(imageInfos, 0);
      const res = layoutRow(1, 3, margin + h0 + spacing, w_total);
      canvasH = h0 + res.h + 2 * margin + spacing;
      cells.push({ x: margin, y: margin, w: w_total, h: h0 });
      cells.push(...res.cells);
    } else if (fourLayoutMode === 'bottom-large') {
      const w_total = maxWidth - 2 * margin;
      const res = layoutRow(0, 3, margin, w_total);
      const h3 = w_total * getHeightRatio(imageInfos, 3);
      canvasH = res.h + h3 + 2 * margin + spacing;
      cells.push(...res.cells);
      cells.push({ x: margin, y: margin + res.h + spacing, w: w_total, h: h3 });
    } else if (fourLayoutMode === 'left-large') {
      const availableWidth = maxWidth - 2 * margin - spacing;
      const r0 = getHeightRatio(imageInfos, 0);
      const rightRatioSum = getHeightRatio(imageInfos, 1) + getHeightRatio(imageInfos, 2) + getHeightRatio(imageInfos, 3);
      const H = (availableWidth + 2 * spacing / rightRatioSum) / (1 / r0 + 1 / rightRatioSum);
      canvasH = H + 2 * margin;
      const w_left = H / r0;
      const w_right = availableWidth - w_left;
      cells.push({ x: margin, y: margin, w: w_left, h: H });
      let y = margin;
      for (let i = 1; i < 4; i++) {
        const h = w_right * getHeightRatio(imageInfos, i);
        cells.push({ x: margin + w_left + spacing, y, w: w_right, h });
        y += h + spacing;
      }
    } else if (fourLayoutMode === 'right-large') {
      const availableWidth = maxWidth - 2 * margin - spacing;
      const leftRatioSum = getHeightRatio(imageInfos, 0) + getHeightRatio(imageInfos, 1) + getHeightRatio(imageInfos, 2);
      const r3 = getHeightRatio(imageInfos, 3);
      const H = (availableWidth + 2 * spacing / leftRatioSum) / (1 / leftRatioSum + 1 / r3);
      canvasH = H + 2 * margin;
      const w_left = (H - 2 * spacing) / leftRatioSum;
      const w_right = availableWidth - w_left;
      let y = margin;
      for (let i = 0; i < 3; i++) {
        const h = w_left * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w: w_left, h });
        y += h + spacing;
      }
      cells.push({ x: margin + w_left + spacing, y: margin, w: w_right, h: H });
    } else {
      return calculateOriginalLayoutCellsFallback(maxWidth, Math.max(margin, spacing), imageInfos, gridRows, layoutMode);
    }
  } else if (count === 5) {
    if (fiveLayoutMode === 'grid' || fiveLayoutMode === 'top-two') {
      const availableWidth = maxWidth - 2 * margin;
      const row1 = layoutRow(0, 2, margin, availableWidth);
      const row2 = layoutRow(2, 3, margin + row1.h + spacing, availableWidth);
      canvasH = row1.h + row2.h + 2 * margin + spacing;
      cells.push(...row1.cells, ...row2.cells);
    } else if (fiveLayoutMode === 'vertical') {
      const w = maxWidth - 2 * margin;
      let y = margin;
      for (let i = 0; i < 5; i++) {
        const h = w * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w, h });
        y += h + spacing;
      }
      canvasH = y - spacing + margin;
    } else if (fiveLayoutMode === 'horizontal') {
      const availableWidth = maxWidth - 2 * margin;
      const res = layoutRow(0, 5, margin, availableWidth);
      canvasH = res.h + 2 * margin;
      cells.push(...res.cells);
    } else if (fiveLayoutMode === 'left-two') {
      const availableWidth = maxWidth - 2 * margin - spacing;
      const leftRatioSum = getHeightRatio(imageInfos, 0) + getHeightRatio(imageInfos, 1);
      const rightRatioSum = getHeightRatio(imageInfos, 2) + getHeightRatio(imageInfos, 3) + getHeightRatio(imageInfos, 4);
      const H = (availableWidth + spacing / leftRatioSum + 2 * spacing / rightRatioSum) / (1 / leftRatioSum + 1 / rightRatioSum);
      canvasH = H + 2 * margin;
      const w_left = (H - spacing) / leftRatioSum;
      const w_right = availableWidth - w_left;

      let y = margin;
      for (let i = 0; i < 2; i++) {
        const h = w_left * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w: w_left, h });
        y += h + spacing;
      }

      y = margin;
      for (let i = 2; i < 5; i++) {
        const h = w_right * getHeightRatio(imageInfos, i);
        cells.push({ x: margin + w_left + spacing, y, w: w_right, h });
        y += h + spacing;
      }
    } else {
      return calculateOriginalLayoutCellsFallback(maxWidth, Math.max(margin, spacing), imageInfos, gridRows, layoutMode);
    }
  } else if (count === 6) {
    if (sixLayoutMode === 'grid') {
      const availableWidth = maxWidth - 2 * margin;
      const row1 = layoutRow(0, 2, margin, availableWidth);
      const row2 = layoutRow(2, 2, margin + row1.h + spacing, availableWidth);
      const row3 = layoutRow(4, 2, margin + row1.h + row2.h + 2 * spacing, availableWidth);
      canvasH = row1.h + row2.h + row3.h + 2 * margin + 2 * spacing;
      cells.push(...row1.cells, ...row2.cells, ...row3.cells);
    } else if (sixLayoutMode === 'vertical') {
      const w = maxWidth - 2 * margin;
      let y = margin;
      for (let i = 0; i < 6; i++) {
        const h = w * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w, h });
        y += h + spacing;
      }
      canvasH = y - spacing + margin;
    } else if (sixLayoutMode === 'horizontal') {
      const availableWidth = maxWidth - 2 * margin;
      const res = layoutRow(0, 6, margin, availableWidth);
      canvasH = res.h + 2 * margin;
      cells.push(...res.cells);
    } else {
      return calculateOriginalLayoutCellsFallback(maxWidth, Math.max(margin, spacing), imageInfos, gridRows, layoutMode);
    }
  } else if (count === 7) {
    if (sevenLayoutMode === 'grid-3-4') {
      const availableWidth = maxWidth - 2 * margin;
      const row1 = layoutRow(0, 3, margin, availableWidth);
      const row2 = layoutRow(3, 4, margin + row1.h + spacing, availableWidth);
      canvasH = row1.h + row2.h + 2 * margin + spacing;
      cells.push(...row1.cells, ...row2.cells);
    } else if (sevenLayoutMode === 'grid-4-3') {
      const availableWidth = maxWidth - 2 * margin;
      const row1 = layoutRow(0, 4, margin, availableWidth);
      const row2 = layoutRow(4, 3, margin + row1.h + spacing, availableWidth);
      canvasH = row1.h + row2.h + 2 * margin + spacing;
      cells.push(...row1.cells, ...row2.cells);
    } else if (sevenLayoutMode === 'top-one') {
      const w_total = maxWidth - 2 * margin;
      const h0 = w_total * getHeightRatio(imageInfos, 0);
      const row1 = layoutRow(1, 3, margin + h0 + spacing, w_total);
      const row2 = layoutRow(4, 3, margin + h0 + row1.h + 2 * spacing, w_total);
      canvasH = h0 + row1.h + row2.h + 2 * margin + 2 * spacing;
      cells.push({ x: margin, y: margin, w: w_total, h: h0 });
      cells.push(...row1.cells, ...row2.cells);
    } else if (sevenLayoutMode === 'vertical') {
      const w = maxWidth - 2 * margin;
      let y = margin;
      for (let i = 0; i < 7; i++) {
        const h = w * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w, h });
        y += h + spacing;
      }
      canvasH = y - spacing + margin;
    } else if (sevenLayoutMode === 'horizontal') {
      const availableWidth = maxWidth - 2 * margin;
      const res = layoutRow(0, 7, margin, availableWidth);
      canvasH = res.h + 2 * margin;
      cells.push(...res.cells);
    } else {
      return calculateOriginalLayoutCellsFallback(maxWidth, Math.max(margin, spacing), imageInfos, gridRows, layoutMode);
    }
  } else if (count === 8) {
    if (eightLayoutMode === 'grid-3-3-2') {
      const availableWidth = maxWidth - 2 * margin;
      const row1 = layoutRow(0, 3, margin, availableWidth);
      const row2 = layoutRow(3, 3, margin + row1.h + spacing, availableWidth);
      const row3 = layoutRow(6, 2, margin + row1.h + row2.h + 2 * spacing, availableWidth);
      canvasH = row1.h + row2.h + row3.h + 2 * margin + 2 * spacing;
      cells.push(...row1.cells, ...row2.cells, ...row3.cells);
    } else if (eightLayoutMode === 'grid-4-4') {
      const availableWidth = maxWidth - 2 * margin;
      const row1 = layoutRow(0, 4, margin, availableWidth);
      const row2 = layoutRow(4, 4, margin + row1.h + spacing, availableWidth);
      canvasH = row1.h + row2.h + 2 * margin + spacing;
      cells.push(...row1.cells, ...row2.cells);
    } else if (eightLayoutMode === 'vertical') {
      const w = maxWidth - 2 * margin;
      let y = margin;
      for (let i = 0; i < 8; i++) {
        const h = w * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w, h });
        y += h + spacing;
      }
      canvasH = y - spacing + margin;
    } else if (eightLayoutMode === 'horizontal') {
      const availableWidth = maxWidth - 2 * margin;
      const res = layoutRow(0, 8, margin, availableWidth);
      canvasH = res.h + 2 * margin;
      cells.push(...res.cells);
    } else {
      return calculateOriginalLayoutCellsFallback(maxWidth, Math.max(margin, spacing), imageInfos, gridRows, layoutMode);
    }
  } else if (count === 9) {
    if (nineLayoutMode === 'grid') {
      const availableWidth = maxWidth - 2 * margin;
      const row1 = layoutRow(0, 3, margin, availableWidth);
      const row2 = layoutRow(3, 3, margin + row1.h + spacing, availableWidth);
      const row3 = layoutRow(6, 3, margin + row1.h + row2.h + 2 * spacing, availableWidth);
      canvasH = row1.h + row2.h + row3.h + 2 * margin + 2 * spacing;
      cells.push(...row1.cells, ...row2.cells, ...row3.cells);
    } else if (nineLayoutMode === 'vertical') {
      const w = maxWidth - 2 * margin;
      let y = margin;
      for (let i = 0; i < 9; i++) {
        const h = w * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w, h });
        y += h + spacing;
      }
      canvasH = y - spacing + margin;
    } else if (nineLayoutMode === 'horizontal') {
      const availableWidth = maxWidth - 2 * margin;
      const res = layoutRow(0, 9, margin, availableWidth);
      canvasH = res.h + 2 * margin;
      cells.push(...res.cells);
    } else {
      return calculateOriginalLayoutCellsFallback(maxWidth, Math.max(margin, spacing), imageInfos, gridRows, layoutMode);
    }
  } else if (count > 9) {
    if (layoutMode === 'horizontal') {
      const availableWidth = maxWidth - 2 * margin;
      const res = layoutRow(0, count, margin, availableWidth);
      canvasH = res.h + 2 * margin;
      cells.push(...res.cells);
    } else {
      const w = maxWidth - 2 * margin;
      let y = margin;
      for (let i = 0; i < count; i++) {
        const h = w * getHeightRatio(imageInfos, i);
        cells.push({ x: margin, y, w, h });
        y += h + spacing;
      }
      canvasH = y - spacing + margin;
    }
  } else {
    return calculateOriginalLayoutCellsFallback(maxWidth, Math.max(margin, spacing), imageInfos, gridRows, layoutMode);
  }

  return { canvasHeight: Math.ceil(canvasH), cells };
}

function calculateLayoutGeometry(options) {
  const {
    maxWidth,
    maxHeight,
    canvasRatio,
    outerGap = 0,
    innerGap = 0,
    images = [],
    imageInfos = [],
    gridRows = [],
    modes = {}
  } = options;
  let canvasH = 0;
  let cells = [];

  if (canvasRatio !== 'original') {
    let ratio = 1;
    if (canvasRatio === '3:4') ratio = 4 / 3;
    else if (canvasRatio === '4:3') ratio = 3 / 4;
    else if (canvasRatio === '9:16') ratio = 16 / 9;
    else if (canvasRatio === '16:9') ratio = 9 / 16;

    canvasH = maxWidth * ratio;
    const totalOuterGap = outerGap > 0 ? 2 * outerGap : 0;
    const W = maxWidth - totalOuterGap;
    const H = canvasH - totalOuterGap;

    cells = calculateFixedRatioCells(images.length, W, H, innerGap, modes).map(cell => ({
      ...cell,
      x: cell.x + (outerGap > 0 ? outerGap : 0),
      y: cell.y + (outerGap > 0 ? outerGap : 0)
    }));
  } else {
    const result = calculateOriginalLayoutCells(maxWidth, outerGap, innerGap, {
      images,
      imageInfos,
      gridRows,
      modes
    });
    canvasH = result.canvasHeight;
    cells = result.cells;
  }

  let scale = 1;
  if (canvasH > maxHeight) {
    scale = maxHeight / canvasH;
    canvasH = maxHeight;
    cells = cells.map(c => ({
      x: c.x * scale,
      y: c.y * scale,
      w: c.w * scale,
      h: c.h * scale
    }));
  }

  return {
    canvasWidth: Math.floor(maxWidth * scale),
    canvasHeight: Math.ceil(canvasH),
    cells
  };
}

module.exports = {
  calculateLayoutGeometry
};
