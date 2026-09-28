/**
 * 切多宫格图形状定义
 */
const shapes = [
  {
    id: 'square',
    name: '默认',
    iconType: 'svg',
    iconUrl: 'https://api.zjzxcx.top/image/cut0.png',
    activeIconUrl: 'https://api.zjzxcx.top/image/cut0.png',
    maskUrl: '',
    path: null
  },
  {
    id: 'circle',
    name: '圆形遮罩',
    iconType: 'svg',
    iconUrl: 'https://api.zjzxcx.top/image/cut1.png',
    activeIconUrl: 'https://api.zjzxcx.top/image/cut1.png',
    maskUrl: 'https://api.zjzxcx.top/image/mask_cut1.png',
    path: null
  },
  {
    id: 'bear',
    name: '小熊',
    iconType: 'svg',
    iconUrl: 'https://api.zjzxcx.top/image/cut3.png',
    activeIconUrl: 'https://api.zjzxcx.top/image/cut3.png',
    maskUrl: 'https://api.zjzxcx.top/image/mask_cut3.png',
    // Optimized full-bleed Bear shape - cute bear with round head and ears
    // Left ear (22, 22), Right ear (78, 22), Head centered at (50, 60)
    path: 'M22 5 C10 5 0 15 0 27 C0 39 10 49 22 49 C24 49 26 48.5 28 48 C28 55 28 62 28 68 C28 86 37 100 50 100 C63 100 72 86 72 68 C72 62 72 55 72 48 C74 48.5 76 49 78 49 C90 49 100 39 100 27 C100 15 90 5 78 5 C69 5 61 10 57 18 C53 10 45 5 36 5 C31 5 26 6.5 22 9 C22 7 22 6 22 5 Z M36 10 C44 10 50 16 50 24 C50 16 56 10 64 10 C72 10 78 16 78 24 C78 32 72 38 64 38 C62 38 60 37.5 58 36.5 C58 50 58 64 58 72 C58 82 55 90 50 90 C45 90 42 82 42 72 C42 64 42 50 42 36.5 C40 37.5 38 38 36 38 C28 38 22 32 22 24 C22 16 28 10 36 10 Z'
  },
  {
    id: 'heart',
    name: '爱心',
    iconType: 'svg',
    iconUrl: 'https://api.zjzxcx.top/image/cut2.png',
    activeIconUrl: 'https://api.zjzxcx.top/image/cut2.png',
    maskUrl: 'https://api.zjzxcx.top/image/mask_cut2.png',
    // Optimized full-bleed Heart - fills more of the canvas
    path: 'M50 98 L8 56 C0 48 0 35 0 28 C0 12 12 0 28 0 C38 0 44 4 50 12 C56 4 62 0 72 0 C88 0 100 12 100 28 C100 35 100 48 92 56 L50 98 Z'
  },
  {
    id: 'flower',
    name: '花朵',
    iconType: 'svg',
    iconUrl: 'https://api.zjzxcx.top/image/cut4.png',
    activeIconUrl: 'https://api.zjzxcx.top/image/cut4.png',
    maskUrl: 'https://api.zjzxcx.top/image/mask_cut4.png',
    // Optimized full-bleed Flower - 4 rounded petals with center
    path: 'M50 0 C65 0 78 8 85 20 C92 8 100 8 100 20 C100 32 92 40 85 40 C92 47 100 55 100 67 C100 79 92 87 80 87 C80 92 75 100 63 100 C51 100 43 92 43 87 C35 92 27 100 15 100 C3 100 0 92 0 80 C0 68 8 60 15 53 C8 53 0 45 0 33 C0 21 8 13 20 13 C20 8 28 0 40 0 C45 0 48 0 50 0 Z M50 25 C58 25 65 32 65 40 C65 48 58 55 50 55 C42 55 35 48 35 40 C35 32 42 25 50 25 Z'
  }
];

// 简单标准化SVG路径，使其适应 0-100 的坐标系
const getShapePath = (id) => {
  const shape = shapes.find(s => s.id === id);
  return shape ? shape.path : null;
};

module.exports = {
  shapes,
  getShapePath
};
