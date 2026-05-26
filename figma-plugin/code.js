figma.showUI(__html__, { width: 360, height: 280, title: 'TC 표 붙여넣기' });

figma.ui.onmessage = async function(msg) {
  if (msg.type === 'create-table') {
    try {
      await createTable(msg.headers, msg.rows, msg.issues || {});
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
var DEFAULT_W  = 140;
var MIN_ROW_H  = 36;
var PAD_H      = 10;
var PAD_V      = 8;
var FONT_SZ    = 11;
var LINE_H     = 18;   // 줄 높이 (px)
var CHAR_W_AVG = 7;    // 한글/영문 평균 글자 너비 추정치

var C_HEADER   = { r:0.118, g:0.227, b:0.373 };  // #1E3A5F
var C_ODD      = { r:0.980, g:0.984, b:0.988 };  // #FAFBFC
var C_ERR_BG   = { r:0.996, g:0.886, b:0.886 };  // #FEE2E2
var C_WARN_BG  = { r:0.996, g:0.953, b:0.780 };  // #FEF3C7
var C_BORDER   = { r:0.886, g:0.910, b:0.941 };  // #E2E8F0
var C_WHITE    = { r:1,     g:1,     b:1     };
var C_TEXT     = { r:0.102, g:0.125, b:0.173 };  // #1A202C

async function createTable(headers, rows, issues) {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  var colW    = headers.map(function(h) { return COL_WIDTHS[h] || DEFAULT_W; });
  var totalW  = colW.reduce(function(a, b) { return a + b; }, 0);
  var numRows = rows.length;

  // ── 행 높이 & 누적 Y 계산 ──────────────────
  var rowHeights = rows.map(function(row) { return calcRowH(row, colW); });
  var rowYs = [];
  var y = MIN_ROW_H; // 헤더 높이 = MIN_ROW_H 고정
  for (var r = 0; r < numRows; r++) {
    rowYs.push(y);
    y += rowHeights[r];
  }
  var totalH = y;

  // ── 메인 프레임 ────────────────────────────
  var frame = figma.createFrame();
  frame.name = 'TC 표';
  frame.resize(totalW, totalH);
  frame.fills = [{ type: 'SOLID', color: C_WHITE }];
  frame.clipsContent = true;

  // ① 헤더 배경
  addRect(frame, 0, 0, totalW, MIN_ROW_H, C_HEADER);

  // ② 데이터 행 배경 (교대색)
  for (var r = 0; r < numRows; r++) {
    if (r % 2 === 0) addRect(frame, 0, rowYs[r], totalW, rowHeights[r], C_ODD);
  }

  // ③ 셀별 이슈 색상 (오류·경고)
  for (var r = 0; r < numRows; r++) {
    var x = 0;
    for (var c = 0; c < headers.length; c++) {
      var key = r + '-' + c;
      if (issues[key] === 'error') {
        addRect(frame, x, rowYs[r], colW[c], rowHeights[r], C_ERR_BG);
      } else if (issues[key] === 'warning') {
        addRect(frame, x, rowYs[r], colW[c], rowHeights[r], C_WARN_BG);
      }
      x += colW[c];
    }
  }

  // ④ 가로 구분선
  addRect(frame, 0, MIN_ROW_H - 1, totalW, 1, C_BORDER);
  for (var r = 0; r < numRows; r++) {
    addRect(frame, 0, rowYs[r] + rowHeights[r] - 1, totalW, 1, C_BORDER);
  }

  // ⑤ 세로 구분선
  var lx = 0;
  for (var c = 0; c < headers.length - 1; c++) {
    lx += colW[c];
    addRect(frame, lx, 0, 1, totalH, C_BORDER);
  }

  // ⑥ 헤더 텍스트
  var x = 0;
  for (var c = 0; c < headers.length; c++) {
    addText(frame, String(headers[c] || ''),
            x + PAD_H, PAD_V,
            colW[c] - PAD_H * 2, MIN_ROW_H - PAD_V * 2,
            'Bold', C_WHITE);
    x += colW[c];
  }

  // ⑦ 데이터 텍스트
  for (var r = 0; r < numRows; r++) {
    x = 0;
    var ry = rowYs[r];
    var rh = rowHeights[r];
    for (var c = 0; c < headers.length; c++) {
      var val = String(((rows[r] || [])[c]) || '');
      addText(frame, val,
              x + PAD_H, ry + PAD_V,
              colW[c] - PAD_H * 2, rh - PAD_V * 2,
              'Regular', C_TEXT);
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

// 행 높이 추정: 각 셀의 텍스트 줄 수 계산 후 최댓값
function calcRowH(rowData, colW) {
  var maxH = MIN_ROW_H;
  for (var c = 0; c < rowData.length; c++) {
    var txt = String(rowData[c] || '');
    if (!txt) continue;
    var usableW = Math.max(colW[c] - PAD_H * 2, 10);
    var charsPerLine = Math.max(1, Math.floor(usableW / CHAR_W_AVG));
    var lines = Math.ceil(txt.length / charsPerLine);
    var h = lines * LINE_H + PAD_V * 2;
    if (h > maxH) maxH = h;
  }
  return maxH;
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
  t.fontSize = FONT_SZ;
  t.fills = [{ type: 'SOLID', color: color }];
  t.textAutoResize = 'NONE';
  t.resize(Math.max(w, 1), Math.max(h, 1));
  t.characters = str;
  t.x = x; t.y = y;
  parent.appendChild(t);
}
