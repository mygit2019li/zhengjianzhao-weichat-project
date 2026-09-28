function buildPreviewBorders({
  imageTransforms = [],
  canvasWidth = 0,
  canvasHeight = 0,
  outerGap = 0,
  innerGap = 0,
  borderColor = '#ffffff',
  borderWidth = 0
}) {
  if (borderWidth <= 0) {
    return [];
  }

  const borders = [];
  const tolerance = Math.max(1, outerGap, innerGap) * 0.6;

  if (outerGap > 0) {
    borders.push(
      { x: 0, y: 0, w: canvasWidth, h: outerGap, color: borderColor },
      { x: 0, y: canvasHeight - outerGap, w: canvasWidth, h: outerGap, color: borderColor },
      { x: 0, y: 0, w: outerGap, h: canvasHeight, color: borderColor },
      { x: canvasWidth - outerGap, y: 0, w: outerGap, h: canvasHeight, color: borderColor }
    );
  }

  imageTransforms.forEach(transform => {
    const c = transform.container;
    if (!c) return;

    const hasLeftGap = c.x - outerGap > tolerance;
    const hasTopGap = c.y - outerGap > tolerance;

    if (hasLeftGap && innerGap > 0) {
      borders.push({
        x: c.x - innerGap,
        y: c.y - (hasTopGap ? innerGap : 0),
        w: innerGap,
        h: c.h + (hasTopGap ? innerGap : 0),
        color: borderColor
      });
    }

    if (hasTopGap && innerGap > 0) {
      borders.push({
        x: c.x - (hasLeftGap ? innerGap : 0),
        y: c.y - innerGap,
        w: c.w + (hasLeftGap ? innerGap : 0),
        h: innerGap,
        color: borderColor
      });
    }
  });

  return borders;
}

function buildPuzzleRenderModel({
  images = [],
  imageTransforms = [],
  texts = [],
  canvasWidth = 0,
  canvasHeight = 0,
  borderWidth = 0,
  borderColor = '#ffffff',
  borderRadius = 0,
  outerGap = borderWidth,
  innerGap = borderWidth,
  templateId = ''
}) {
  const previewBackground = 'transparent';
  const exportBackground = borderWidth > 0 ? borderColor : 'transparent';
  const borders = buildPreviewBorders({
    imageTransforms,
    canvasWidth,
    canvasHeight,
    outerGap,
    innerGap,
    borderColor,
    borderWidth
  });

  return {
    templateId,
    canvas: {
      width: canvasWidth,
      height: canvasHeight,
      borderWidth,
      borderColor,
      borderRadius,
      outerGap,
      innerGap,
      previewBackground,
      exportBackground
    },
    borders,
    images: imageTransforms.map((transform, index) => ({
      index,
      src: images[index],
      container: transform.container,
      width: transform.width,
      height: transform.height,
      x: transform.x,
      y: transform.y,
      minX: transform.minX,
      maxX: transform.maxX,
      minY: transform.minY,
      maxY: transform.maxY,
      containerStyle: transform.containerStyle,
      style: transform.style
    })),
    texts: texts.map((text, index) => ({
      index,
      ...text
    }))
  };
}

module.exports = {
  buildPuzzleRenderModel
};
