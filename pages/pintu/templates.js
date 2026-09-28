const TEMPLATE_GROUPS = {
  1: [{ id: '1-single', label: '单图' }],
  2: [
    { id: '2-vertical', label: '上下' },
    { id: '2-horizontal', label: '左右' }
  ],
  3: [
    { id: '3-top-large', label: '上大下二' },
    { id: '3-bottom-large', label: '上二下大' },
    { id: '3-vertical', label: '三竖排' },
    { id: '3-horizontal', label: '三横排' },
    { id: '3-left-large', label: '左大右二' },
    { id: '3-right-large', label: '左二右大' }
  ],
  4: [
    { id: '4-grid', label: '四宫格' },
    { id: '4-vertical', label: '四竖排' },
    { id: '4-horizontal', label: '四横排' },
    { id: '4-top-large', label: '上一下三' },
    { id: '4-bottom-large', label: '上三下一' },
    { id: '4-left-large', label: '左大右三' },
    { id: '4-right-large', label: '左三右大' }
  ],
  5: [
    { id: '5-grid', label: '二行三列' },
    { id: '5-vertical', label: '五竖排' },
    { id: '5-horizontal', label: '五横排' },
    { id: '5-left-two', label: '左二右三' },
    { id: '5-top-two', label: '上二下三' }
  ],
  6: [
    { id: '6-grid', label: '两列三行' },
    { id: '6-vertical', label: '六竖排' },
    { id: '6-horizontal', label: '六横排' }
  ],
  7: [
    { id: '7-grid-3-4', label: '三四排布' },
    { id: '7-grid-4-3', label: '四三排布' },
    { id: '7-top-one', label: '上一下三三' },
    { id: '7-vertical', label: '七竖排' },
    { id: '7-horizontal', label: '七横排' }
  ],
  8: [
    { id: '8-grid-3-3-2', label: '三三二' },
    { id: '8-grid-4-4', label: '四四' },
    { id: '8-vertical', label: '八竖排' },
    { id: '8-horizontal', label: '八横排' }
  ],
  9: [
    { id: '9-grid', label: '九宫格' },
    { id: '9-vertical', label: '九竖排' },
    { id: '9-horizontal', label: '九横排' }
  ],
  many: [
    { id: 'many-vertical', label: '长图竖拼' },
    { id: 'many-horizontal', label: '长图横拼' }
  ]
};

function getTemplateId(count, data) {
  if (count <= 1) return '1-single';
  if (count === 2) return `2-${data.layoutMode}`;
  if (count === 3) return `3-${data.tripleLayoutMode}`;
  if (count === 4) return `4-${data.fourLayoutMode}`;
  if (count === 5) return `5-${data.fiveLayoutMode}`;
  if (count === 6) return `6-${data.sixLayoutMode}`;
  if (count === 7) return `7-${data.sevenLayoutMode}`;
  if (count === 8) return `8-${data.eightLayoutMode}`;
  if (count === 9) return `9-${data.nineLayoutMode}`;
  return `many-${data.layoutMode}`;
}

function getTemplateOptions(count) {
  if (count <= 0) return [];
  if (count > 9) return TEMPLATE_GROUPS.many;
  return TEMPLATE_GROUPS[count] || [];
}

module.exports = {
  TEMPLATE_GROUPS,
  getTemplateId,
  getTemplateOptions
};
