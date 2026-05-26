figma.showUI(__html__, { width: 360, height: 300, title: 'TC 표 붙여넣기' });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-table') {
    try {
      await createTable(msg.headers, msg.rows);
      figma.notify('✅ TC 표가 생성됐어요!');
      figma.closePlugin();
    } catch (e) {
      figma.notify('오류: ' + e.message, { error: true });
    }
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

// ── 컬럼별 기본 너비 ──────────────────────────
const COL_WIDTHS = {
  'TEST ID': 60, '화면번호': 70, '테스트일자': 85, '담당자': 70,
  '결과': 55, 'AS-IS': 80, 'TO-BE': 80, '지라 ID': 80,
  '1차 통합 테스트': 95, '화면명': 100, '화면구분': 90,
  '테스트 구분': 90, '테스트 시나리오': 210, '예상결과': 210, '비고': 140,
};
const DEFAULT_W = 140;
const PAD_V     = 8;
const PAD_H     = 12;
const BORDER    = { type: 'SOLID', color: { r: 0.886, g: 0.910, b: 0.941 } };  // #E2E8F0
const HDR_BG    = { type: 'SOLID', color: { r: 0.118, g: 0.227, b: 0.373 } };  // #1E3A5F
const ROW_ODD   = { type: 'SOLID', color: { r: 0.980, g: 0.984, b: 0.988 } };  // #FAFBFC
const ROW_EVEN  = { type: 'SOLID', color: { r: 1,     g: 1,     b: 1     } };  // #FFFFFF
const TEXT_HDR  = { type: 'SOLID', color: { r: 1,     g: 1,     b: 1     } };  // white
const TEXT_BODY = { type: 'SOLID', color: { r: 0.102, g: 0.125, b: 0.173 } };  // #1A202C

async function createTable(headers, rows) {
  // 폰트 로드 (Noto Sans KR → Inter 순 시도)
  let fReg = { family: 'Noto Sans KR', style: 'Regular' };
  let fBold = { family: 'Noto Sans KR', style: 'Bold' };
  try {
    await figma.loadFontAsync(fReg);
    await figma.loadFontAsync(fBold);
  } catch {
    fReg  = { family: 'Inter', style: 'Regular' };
    fBold = { family: 'Inter', style: 'Bold' };
    await figma.loadFontAsync(fReg);
    await figma.loadFontAsync(fBold);
  }

  const colW   = headers.map(h => COL_WIDTHS[h] || DEFAULT_W);
  const totalW = colW.reduce((s, w) => s + w, 0);

  // 메인 테이블 프레임
  const table = figma.createFrame();
  table.name = 'TC 표';
  table.layoutMode = 'VERTICAL';
  table.primaryAxisSizingMode = 'AUTO';
  table.counterAxisSizingMode = 'AUTO';
  table.itemSpacing = 0;
  table.paddingTop = table.paddingBottom = table.paddingLeft = table.paddingRight = 0;
  table.fills = [];
  table.clipsContent = false;

  // 헤더 행
  table.appendChild(makeRow(headers, true, colW, fBold, fReg, 0));

  // 데이터 행
  rows.forEach((row, i) => {
    const cells = headers.map((_, c) => String(row[c] ?? ''));
    table.appendChild(makeRow(cells, false, colW, fBold, fReg, i));
  });

  // 뷰포트 중앙에 배치
  const center = figma.viewport.center;
  table.x = Math.round(center.x - totalW / 2);
  table.y = Math.round(center.y - 100);

  figma.currentPage.appendChild(table);
  figma.currentPage.selection = [table];
  figma.viewport.scrollAndZoomIntoView([table]);
}

function makeRow(cells, isHeader, colW, fBold, fReg, rowIdx) {
  const row = figma.createFrame();
  row.name = isHeader ? '헤더' : `행 ${rowIdx + 1}`;
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.counterAxisAlignItems = 'MIN';
  row.itemSpacing = 0;
  row.paddingTop = row.paddingBottom = row.paddingLeft = row.paddingRight = 0;
  row.fills = [isHeader ? HDR_BG : (rowIdx % 2 === 0 ? ROW_ODD : ROW_EVEN)];

  cells.forEach((text, c) => {
    row.appendChild(makeCell(text, isHeader, colW[c], fBold, fReg));
  });
  return row;
}

function makeCell(text, isHeader, width, fBold, fReg) {
  const cell = figma.createFrame();
  cell.name = 'cell';
  cell.layoutMode = 'VERTICAL';
  cell.primaryAxisSizingMode = 'AUTO';      // 높이: 콘텐츠 기준 자동
  cell.counterAxisSizingMode = 'FIXED';     // 너비: 고정
  cell.resize(width, 36);                   // 최소 높이 36
  cell.paddingTop  = PAD_V; cell.paddingBottom = PAD_V;
  cell.paddingLeft = PAD_H; cell.paddingRight  = PAD_H;
  cell.primaryAxisAlignItems  = 'MIN';
  cell.counterAxisAlignItems  = 'MIN';
  cell.fills = [];
  cell.strokeWeight = 1;
  cell.strokes = [BORDER];
  cell.strokeAlign = 'INSIDE';

  const t = figma.createText();
  t.fontName = isHeader ? fBold : fReg;
  t.fontSize = 12;
  t.lineHeight = { value: 160, unit: 'PERCENT' };
  t.characters = text;
  t.fills = [isHeader ? TEXT_HDR : TEXT_BODY];
  t.layoutAlign = 'STRETCH';        // 셀 너비만큼 가로로 채움
  t.textAutoResize = 'HEIGHT';      // 텍스트 길이에 따라 세로 자동 확장

  cell.appendChild(t);
  return cell;
}
