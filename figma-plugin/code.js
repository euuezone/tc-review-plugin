figma.showUI(__html__, { width: 360, height: 280, title: 'TC 표 붙여넣기' });

figma.ui.onmessage = async function(msg) {
  if (msg.type === 'create-table') {
    try {
      await createTable(msg.headers, msg.rows);
      figma.notify('TC 표가 생성됐어요!');
    } catch (e) {
      figma.notify('오류: ' + e.message, { error: true });
    }
    figma.closePlugin();
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

var COL_WIDTHS = {
  'TEST ID': 60, '화면번호': 72, '테스트일자': 86, '담당자': 70,
  '결과': 56, 'AS-IS': 80, 'TO-BE': 80, '지라 ID': 80,
  '1차 통합 테스트': 96, '화면명': 100, '화면구분': 90,
  '테스트 구분': 90, '테스트 시나리오': 210, '예상결과': 210, '비고': 140
};
var DEFAULT_W = 140;
var ROW_H     = 36;
var PAD_H     = 10;
var PAD_V     = 8;

var C_HEADER  = { r: 0.118, g: 0.227, b: 0.373 };
var C_ODD     = { r: 0.980, g: 0.984, b: 0.988 };
var C_EVEN    = { r: 1,     g: 1,     b: 1     };
var C_BORDER  = { r: 0.886, g: 0.910, b: 0.941 };
var C_WHITE   = { r: 1,     g: 1,     b: 1     };
var C_TEXT    = { r: 0.102, g: 0.125, b: 0.173 };

async function createTable(headers, rows) {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  var colW   = headers.map(function(h) { return COL_WIDTHS[h] || DEFAULT_W; });
  var totalW = colW.reduce(function(a, b) { return a + b; }, 0);
  var totalH = ROW_H * (rows.length + 1);

  var frame = figma.createFrame();
  frame.name = 'TC 표';
  frame.resize(totalW, totalH);
  frame.fills = [{ type: 'SOLID', color: C_EVEN }];
  frame.clipsContent = true;

  // 헤더 행
  makeRow(frame, headers, 0, colW, C_HEADER, C_WHITE, 'Bold');

  // 데이터 행
  for (var r = 0; r < rows.length; r++) {
    var cells = headers.map(function(_, c) { return String((rows[r] || [])[c] || ''); });
    makeRow(frame, cells, (r + 1) * ROW_H, colW, r % 2 === 0 ? C_ODD : C_EVEN, C_TEXT, 'Regular');
  }

  var center = figma.viewport.center;
  frame.x = center.x - totalW / 2;
  frame.y = center.y - totalH / 2;

  figma.currentPage.appendChild(frame);
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}

function makeRow(parent, cells, y, colW, bgColor, textColor, fontStyle) {
  var x = 0;
  for (var c = 0; c < cells.length; c++) {
    var cell = figma.createFrame();
    cell.x = x;
    cell.y = y;
    cell.resize(colW[c], ROW_H);
    cell.fills  = [{ type: 'SOLID', color: bgColor }];
    cell.strokeWeight = 1;
    cell.strokes = [{ type: 'SOLID', color: C_BORDER }];
    cell.strokeAlign = 'INSIDE';
    cell.clipsContent = true;

    var t = figma.createText();
    t.fontName = { family: 'Inter', style: fontStyle };
    t.fontSize = 11;
    t.fills    = [{ type: 'SOLID', color: textColor }];
    t.characters = cells[c];
    t.x = PAD_H;
    t.y = PAD_V;
    t.resize(colW[c] - PAD_H * 2, ROW_H - PAD_V * 2);

    cell.appendChild(t);
    parent.appendChild(cell);
    x += colW[c];
  }
}
