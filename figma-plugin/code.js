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
var ROW_H  = 36;
var PAD_H  = 10;
var PAD_V  = 8;

var C_HEADER = { r:0.118, g:0.227, b:0.373 };
var C_ODD    = { r:0.980, g:0.984, b:0.988 };
var C_BORDER = { r:0.886, g:0.910, b:0.941 };
var C_WHITE  = { r:1,     g:1,     b:1     };
var C_TEXT   = { r:0.102, g:0.125, b:0.173 };

async function createTable(headers, rows) {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  var colW   = headers.map(function(h) { return COL_WIDTHS[h] || DEFAULT_W; });
  var totalW = colW.reduce(function(a, b) { return a + b; }, 0);
  var numRows = rows.length;
  var totalH = ROW_H * (numRows + 1);

  // 메인 프레임 1개 — 모든 노드는 이 안에 flat하게 배치
  var frame = figma.createFrame();
  frame.name = 'TC 표';
  frame.resize(totalW, totalH);
  frame.fills = [{ type: 'SOLID', color: { r:1, g:1, b:1 } }];
  frame.clipsContent = true;

  // ① 헤더 배경
  addRect(frame, 0, 0, totalW, ROW_H, C_HEADER);

  // ② 홀수 행 배경 (짝수는 흰색 = 기본값)
  for (var r = 0; r < numRows; r++) {
    if (r % 2 === 0) addRect(frame, 0, (r+1)*ROW_H, totalW, ROW_H, C_ODD);
  }

  // ③ 가로 구분선
  for (var r = 0; r <= numRows; r++) {
    addRect(frame, 0, (r+1)*ROW_H - 1, totalW, 1, C_BORDER);
  }

  // ④ 세로 구분선
  var lx = 0;
  for (var c = 0; c < headers.length - 1; c++) {
    lx += colW[c];
    addRect(frame, lx, 0, 1, totalH, C_BORDER);
  }

  // ⑤ 헤더 텍스트
  var x = 0;
  for (var c = 0; c < headers.length; c++) {
    addText(frame, String(headers[c] || ''), x+PAD_H, PAD_V,
            colW[c]-PAD_H*2, ROW_H-PAD_V*2, 'Bold', C_WHITE);
    x += colW[c];
  }

  // ⑥ 데이터 텍스트
  for (var r = 0; r < numRows; r++) {
    x = 0;
    var rowY = (r+1) * ROW_H;
    for (var c = 0; c < headers.length; c++) {
      var val = String(((rows[r] || [])[c]) || '');
      addText(frame, val, x+PAD_H, rowY+PAD_V,
              colW[c]-PAD_H*2, ROW_H-PAD_V*2, 'Regular', C_TEXT);
      x += colW[c];
    }
  }

  var center = figma.viewport.center;
  frame.x = center.x - totalW / 2;
  frame.y = center.y - totalH / 2;

  figma.currentPage.appendChild(frame);
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}

function addRect(parent, x, y, w, h, color) {
  var r = figma.createRectangle();
  r.x = x; r.y = y;
  r.resize(Math.max(w, 1), Math.max(h, 1));
  r.fills = [{ type: 'SOLID', color: color }];
  parent.appendChild(r);
}

function addText(parent, str, x, y, w, h, style, color) {
  var t = figma.createText();
  t.fontName = { family: 'Inter', style: style };
  t.fontSize = 11;
  t.fills = [{ type: 'SOLID', color: color }];
  t.textAutoResize = 'NONE';
  t.resize(Math.max(w, 1), Math.max(h, 1));
  t.characters = str;
  t.x = x; t.y = y;
  parent.appendChild(t);
}
