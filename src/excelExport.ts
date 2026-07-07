/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from 'exceljs';
import { BienBan } from './types';
import { numberToVietnameseWords, translateMoneyToWords } from './utils';

// Helper to apply thin borders around a specific rectangular cell range (A1 to F10, etc.)
function applyBorderToRange(ws: ExcelJS.Worksheet, startCell: string, endCell: string, border: any) {
  const start = ws.getCell(startCell);
  const end = ws.getCell(endCell);
  const startRow = Number(start.row);
  const startCol = Number(start.col);
  const endRow = Number(end.row);
  const endCol = Number(end.col);

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      ws.getCell(r, c).border = border;
    }
  }
}

// Convert column index (1, 2, 3...) to Excel column letter (A, B, C...)
function colIndexToLabel(idx: number): string {
  let temp = idx;
  let label = '';
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    temp = Math.floor((temp - 1) / 26);
  }
  return label;
}

export async function exportInspectionToExcel(bb: BienBan, meta?: { maSo?: string; lanBanHanh?: string; ngayBanHanh?: string }) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Phieu nghiem thu QC");

  worksheet.views = [{ showGridLines: true }];
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.25,
      bottom: 0.25,
      header: 0.1,
      footer: 0.1,
    },
  };

  worksheet.columns = [
    { key: 'A', width: 8 },   // TT
    { key: 'B', width: 26 },  // Thành phần / Quy cách
    { key: 'C', width: 24 },  // Chức vụ / Đơn vị tính
    { key: 'D', width: 18 },  // Đơn vị cung ứng / KL nguyên thủy
    { key: 'E', width: 18 },  // KL nhập kho
    { key: 'F', width: 24 },  // BBNT / Ghi chú
  ];

  const fontRegular = { name: 'Times New Roman', size: 12, bold: false, italic: false };
  const fontSmall = { name: 'Times New Roman', size: 11, bold: false, italic: false };
  const fontBold = { name: 'Times New Roman', size: 12, bold: true, italic: false };
  const fontTitle = { name: 'Times New Roman', size: 14, bold: true, italic: false };
  const fontMainTitle = { name: 'Times New Roman', size: 16, bold: true, italic: false };
  const fontBoldItalicVal = { name: 'Times New Roman', size: 12, bold: true, italic: true };

  const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'center' as const, wrapText: true };
  const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'left' as const, wrapText: true };
  const alignRight: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'right' as const, wrapText: true };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } },
  };

  const applyStyle = (cell: ExcelJS.Cell, font = fontRegular, alignment: Partial<ExcelJS.Alignment> = alignCenter, border = thinBorder) => {
    cell.font = font;
    cell.alignment = alignment;
    cell.border = border;
  };

  const dateFormatted = bb.ngay_nt
    ? bb.ngay_nt.split('-').reverse().join('.')
    : new Date().toLocaleDateString('vi-VN').replace(/\//g, '.');

  const fscText = (bb.chung_chi_fsc || '').toString();
  const markF100 = fscText.includes('100') ? 'v' : ' ';
  const markFMix = fscText.toLowerCase().includes('mix') ? 'v' : ' ';
  const markFCw = fscText.toLowerCase().includes('cw') ? 'v' : ' ';
  const markKls = (!fscText || fscText.toUpperCase() === 'KLS' || fscText.toUpperCase() === 'V' || fscText.toUpperCase() === 'X') ? 'v' : ' ';

  // -------------------------------------------------------------
  // 1. HEADER - template compact style
  // -------------------------------------------------------------
  worksheet.mergeCells('A1:B2');
  worksheet.mergeCells('C1:E1');
  worksheet.mergeCells('C2:E2');

  const logo = worksheet.getCell('A1');
  logo.value = {
    richText: [
      { text: 'NFC\n', font: { name: 'Arial Black', size: 28, bold: true, italic: true, color: { argb: 'FF0D733E' } } },
      { text: 'NAFOCO', font: { name: 'Arial', size: 10, bold: true, italic: true, color: { argb: 'FF0D733E' } } },
    ],
  };
  logo.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  logo.border = thinBorder;

  const proc = worksheet.getCell('C1');
  proc.value = 'QUY TRÌNH KIỂM HÀNG ĐẦU VÀO';
  applyStyle(proc, fontTitle);

  const docName = worksheet.getCell('C2');
  docName.value = 'BIÊN BẢN NGHIỆM THU GỖ KEO XẺ THÔ';
  applyStyle(docName, fontMainTitle);

  const code = worksheet.getCell('F1');
  code.value = `Mã số: ${meta?.maSo || 'BM01/QT01/QLCL1'}`;
  applyStyle(code, { name: 'Times New Roman', size: 11, bold: true, italic: false }, alignLeft);

  const issue = worksheet.getCell('F2');
  issue.value = `Lần ban hành: ${meta?.lanBanHanh || '07'}\nNgày ban hành: ${meta?.ngayBanHanh || '15/04/2023'}`;
  applyStyle(issue, { name: 'Times New Roman', size: 11, bold: true, italic: false }, alignLeft);

  applyBorderToRange(worksheet, 'A1', 'F2', thinBorder);
  worksheet.getRow(1).height = 34;
  worksheet.getRow(2).height = 34;

  // -------------------------------------------------------------
  // 2. MEMBERS / SUPPLIER
  // -------------------------------------------------------------
  const headers = [
    { cell: 'A3', value: 'TT' },
    { cell: 'B3', value: 'Thành Phần' },
    { cell: 'C3', value: 'Chức vụ' },
    { cell: 'D3', value: 'Đơn vị cung ứng' },
    { cell: 'F3', value: bb.ma_bbnt ? `BBNT số: ${bb.ma_bbnt}` : 'BBNT số: GB01' },
  ];
  worksheet.mergeCells('D3:E3');
  headers.forEach(h => {
    const cell = worksheet.getCell(h.cell);
    cell.value = h.value;
    applyStyle(cell, fontBold);
  });
  applyBorderToRange(worksheet, 'A3', 'F3', thinBorder);
  worksheet.getRow(3).height = 20;

  const listTP = bb.thanh_phan || [];
  const members = [
    {
      name: listTP[0]?.ho_ten || bb.nguoi_ky_nguoi_lap || 'Ngô Văn Trường',
      role: listTP[0]?.chuc_vu || 'Người lập biên bản (QC)',
    },
    {
      name: listTP[1]?.ho_ten || bb.nguoi_ky_tp_pqlcl || 'Đặng Văn Tùng',
      role: listTP[1]?.chuc_vu || 'QC bộ phận QLCL1',
    },
    {
      name: listTP[2]?.ho_ten || bb.nguoi_ky_thu_kho || 'Bùi Thị Hạnh',
      role: listTP[2]?.chuc_vu || 'Thủ kho gỗ',
    },
  ];

  members.forEach((m, idx) => {
    const r = 4 + idx;
    worksheet.getRow(r).height = 22;

    const cA = worksheet.getCell(`A${r}`);
    cA.value = idx + 1;
    applyStyle(cA, fontBold);

    const cB = worksheet.getCell(`B${r}`);
    cB.value = m.name;
    applyStyle(cB, fontBold);

    const cC = worksheet.getCell(`C${r}`);
    cC.value = m.role;
    applyStyle(cC, fontSmall, alignLeft);
  });

  worksheet.mergeCells('D4:E6');
  const supplier = worksheet.getCell('D4');
  supplier.value = bb.don_vi_cung_ung || 'Công Ty Trường Thịnh Phát';
  applyStyle(supplier, { name: 'Times New Roman', size: 13, bold: true, italic: false });

  worksheet.mergeCells('F4:F6');
  const ntDate = worksheet.getCell('F4');
  ntDate.value = `Ngày NT: ${dateFormatted}`;
  applyStyle(ntDate, fontBold, alignLeft);

  applyBorderToRange(worksheet, 'A4', 'F6', thinBorder);

  // -------------------------------------------------------------
  // 3. WOOD INFO + ENVIRONMENT STATUS
  // -------------------------------------------------------------
  worksheet.getRow(7).height = 20;
  worksheet.mergeCells('A7:C7');
  const wood = worksheet.getCell('A7');
  wood.value = {
    richText: [
      { text: 'Tên - chủng loại gỗ: ', font: fontBold },
      { text: 'GỖ KEO RỪNG TRỒNG', font: fontBold },
    ],
  };
  applyStyle(wood, fontBold, alignLeft);

  worksheet.mergeCells('D7:F7');
  const loc = worksheet.getCell('D7');
  loc.value = {
    richText: [
      { text: 'Địa điểm nhập: ', font: fontBold },
      { text: bb.dia_diem_nhap || 'Kho Gỗ .NMBM', font: fontBold },
    ],
  };
  applyStyle(loc, fontBold, alignLeft);
  applyBorderToRange(worksheet, 'A7', 'F7', thinBorder);

  worksheet.getRow(8).height = 22;
  worksheet.mergeCells('A8:F8');
  const subWood = worksheet.getCell('A8');
  const loaiGo = (bb.loai_go || 'gỗ keo xẻ thô').trim().replace(/\s+/g, ' ');
  subWood.value = `Gỗ sơ chế thông thường - ${loaiGo}`;
  applyStyle(subWood, fontBold);

  worksheet.getRow(9).height = 22;
  worksheet.mergeCells('A9:F9');
  const env = worksheet.getCell('A9');
  env.value = `Trạng thái môi trường:          FSC 100% [ ${markF100} ]          FSC Mix [ ${markFMix} ]          FSC CW [ ${markFCw} ]          KLS [ ${markKls} ]`;
  applyStyle(env, fontBold, alignLeft);
  applyBorderToRange(worksheet, 'A8', 'F9', thinBorder);

  let cursorRow = 11;

  // -------------------------------------------------------------
  // 4. PART A
  // -------------------------------------------------------------
  worksheet.getRow(cursorRow).height = 24;
  worksheet.mergeCells(`A${cursorRow}:F${cursorRow}`);
  const partA = worksheet.getCell(`A${cursorRow}`);
  partA.value = 'A. Tổng khối lượng giao nhận';
  partA.font = { name: 'Times New Roman', size: 13, bold: true, italic: false };
  partA.alignment = alignLeft;
  cursorRow++;

  worksheet.getRow(cursorRow).height = 22;
  worksheet.mergeCells(`B${cursorRow}:D${cursorRow}`);
  [
    { cell: `A${cursorRow}`, value: 'TT' },
    { cell: `B${cursorRow}`, value: 'Quy cách kích thước (mm)' },
    { cell: `E${cursorRow}`, value: 'Đơn vị tính' },
    { cell: `F${cursorRow}`, value: 'Khối lượng (m3)' },
  ].forEach(h => {
    const cell = worksheet.getCell(h.cell);
    cell.value = h.value;
    applyStyle(cell, fontBold);
  });
  applyBorderToRange(worksheet, `A${cursorRow}`, `F${cursorRow}`, thinBorder);
  cursorRow++;

  const listA = bb.quy_cach_a || [];
  listA.forEach((row, idx) => {
    worksheet.getRow(cursorRow).height = 22;
    worksheet.mergeCells(`B${cursorRow}:D${cursorRow}`);

    const c1 = worksheet.getCell(`A${cursorRow}`);
    c1.value = idx + 1;
    applyStyle(c1, fontRegular);

    const c2 = worksheet.getCell(`B${cursorRow}`);
    c2.value = (row.kich_thuoc_mm || '').replace(/×/g, 'x');
    applyStyle(c2, fontBold);

    const c5 = worksheet.getCell(`E${cursorRow}`);
    c5.value = 'm3';
    applyStyle(c5, fontBold);

    const c6 = worksheet.getCell(`F${cursorRow}`);
    c6.value = Number(row.kl_nguyen_thuy || 0);
    c6.numFmt = '#,##0.###';
    applyStyle(c6, fontBold, alignRight);

    applyBorderToRange(worksheet, `A${cursorRow}`, `F${cursorRow}`, thinBorder);
    cursorRow++;
  });

  const totalVolA = listA.reduce((sum, curr) => sum + Number(curr.kl_nguyen_thuy || 0), 0);
  worksheet.getRow(cursorRow).height = 22;
  worksheet.mergeCells(`A${cursorRow}:E${cursorRow}`);
  const congA = worksheet.getCell(`A${cursorRow}`);
  congA.value = 'Cộng';
  applyStyle(congA, fontBold);
  const congAVal = worksheet.getCell(`F${cursorRow}`);
  congAVal.value = Number(totalVolA);
  congAVal.numFmt = '#,##0.###';
  applyStyle(congAVal, fontBold, alignRight);
  applyBorderToRange(worksheet, `A${cursorRow}`, `F${cursorRow}`, thinBorder);
  cursorRow += 2;

  // -------------------------------------------------------------
  // 5. PART B
  // -------------------------------------------------------------
  worksheet.getRow(cursorRow).height = 24;
  worksheet.mergeCells(`A${cursorRow}:F${cursorRow}`);
  const partB = worksheet.getCell(`A${cursorRow}`);
  partB.value = 'B. Kết luận khối lượng gỗ thực tế nhập kho';
  partB.font = { name: 'Times New Roman', size: 13, bold: true, italic: false };
  partB.alignment = alignLeft;
  cursorRow++;

  worksheet.getRow(cursorRow).height = 22;
  const headersB = [
    { c: 'A', v: 'TT' },
    { c: 'B', v: 'Quy cách kích thước' },
    { c: 'C', v: 'K. Lượng nguyên thủy' },
    { c: 'D', v: 'Tỉ lệ %' },
    { c: 'E', v: 'K. Lượng nhập kho' },
    { c: 'F', v: 'Ghi chú' },
  ];
  headersB.forEach(h => {
    const cell = worksheet.getCell(`${h.c}${cursorRow}`);
    cell.value = h.v;
    applyStyle(cell, fontBold);
  });
  applyBorderToRange(worksheet, `A${cursorRow}`, `F${cursorRow}`, thinBorder);
  cursorRow++;

  const listB = bb.quy_cach_b || [];
  let idxB = 1;
  listB.forEach(row => {
    const rowA = listA.find(a => a.id === row.id) || { kl_nguyen_thuy: 0 };
    const hasParts = row.co_phan_loai && row.chi_tiet && row.chi_tiet.length > 0;
    if (!hasParts) {
      worksheet.getRow(cursorRow).height = 22;
      const values = [
        { col: 'A', value: idxB++, font: fontRegular, align: alignCenter },
        { col: 'B', value: (row.kich_thuoc_mm || '').replace(/×/g, 'x'), font: fontRegular, align: alignCenter },
        { col: 'C', value: Number(rowA.kl_nguyen_thuy || 0), font: fontRegular, align: alignRight, numFmt: '#,##0.###' },
        { col: 'D', value: 100, font: fontRegular, align: alignCenter, numFmt: '0' },
        { col: 'E', value: Number(rowA.kl_nguyen_thuy || 0), font: fontBold, align: alignRight, numFmt: '#,##0.###' },
        { col: 'F', value: row.ghi_chu || '', font: fontRegular, align: alignLeft },
      ];
      values.forEach(v => {
        const cell = worksheet.getCell(`${v.col}${cursorRow}`);
        cell.value = v.value as any;
        if (v.numFmt) cell.numFmt = v.numFmt;
        applyStyle(cell, v.font, v.align);
      });
      cursorRow++;
    } else {
      worksheet.getRow(cursorRow).height = 22;
      const cA = worksheet.getCell(`A${cursorRow}`);
      cA.value = idxB++;
      applyStyle(cA);
      const cB = worksheet.getCell(`B${cursorRow}`);
      cB.value = (row.kich_thuoc_mm || '').replace(/×/g, 'x');
      applyStyle(cB);
      const cC = worksheet.getCell(`C${cursorRow}`);
      cC.value = Number(rowA.kl_nguyen_thuy || 0);
      cC.numFmt = '#,##0.###';
      applyStyle(cC, fontRegular, alignRight);
      ['D','E','F'].forEach(c => applyStyle(worksheet.getCell(`${c}${cursorRow}`)));
      cursorRow++;

      row.chi_tiet?.forEach(child => {
        worksheet.getRow(cursorRow).height = 22;
        ['A','C'].forEach(c => applyStyle(worksheet.getCell(`${c}${cursorRow}`)));
        const cB2 = worksheet.getCell(`B${cursorRow}`);
        cB2.value = child.ten_loai;
        applyStyle(cB2, fontRegular, alignLeft);
        const cD2 = worksheet.getCell(`D${cursorRow}`);
        cD2.value = Number(child.ti_le || 0);
        cD2.numFmt = Number(child.ti_le || 0) % 1 === 0 ? '0' : '0.0';
        applyStyle(cD2);
        const cE2 = worksheet.getCell(`E${cursorRow}`);
        cE2.value = Number(child.kl_nhap_kho || 0);
        cE2.numFmt = '#,##0.###';
        applyStyle(cE2, fontBold, alignRight);
        const cF2 = worksheet.getCell(`F${cursorRow}`);
        cF2.value = child.ghi_chu || '';
        applyStyle(cF2, fontRegular, alignLeft);
        cursorRow++;
      });
    }
  });

  const totalVolB = listB.reduce((sum, r) => {
    if (r.co_phan_loai && r.chi_tiet && r.chi_tiet.length > 0) {
      return sum + r.chi_tiet.reduce((s, c) => s + Number(c.kl_nhap_kho || 0), 0);
    }
    const rowA = listA.find(a => a.id === r.id);
    return sum + Number(rowA ? rowA.kl_nguyen_thuy : r.kl_tong || 0);
  }, 0);

  worksheet.getRow(cursorRow).height = 22;
  worksheet.mergeCells(`A${cursorRow}:B${cursorRow}`);
  const congB = worksheet.getCell(`A${cursorRow}`);
  congB.value = 'Cộng';
  applyStyle(congB, fontBold);
  const congBC = worksheet.getCell(`C${cursorRow}`);
  congBC.value = Number(totalVolA);
  congBC.numFmt = '#,##0.###';
  applyStyle(congBC, fontBold, alignRight);
  const congBD = worksheet.getCell(`D${cursorRow}`);
  congBD.value = '';
  applyStyle(congBD);
  const congBE = worksheet.getCell(`E${cursorRow}`);
  congBE.value = Number(totalVolB);
  congBE.numFmt = '#,##0.###';
  applyStyle(congBE, fontBold, alignRight);
  const congBF = worksheet.getCell(`F${cursorRow}`);
  congBF.value = '';
  applyStyle(congBF);
  applyBorderToRange(worksheet, `A${cursorRow}`, `F${cursorRow}`, thinBorder);
  cursorRow++;

  // Spelling row
  worksheet.getRow(cursorRow).height = 22;
  worksheet.mergeCells(`A${cursorRow}:F${cursorRow}`);
  const spelling = worksheet.getCell(`A${cursorRow}`);
  spelling.value = `Bằng chữ: ${numberToVietnameseWords(totalVolB, false)} ./.`;
  applyStyle(spelling, fontSmall);
  applyBorderToRange(worksheet, `A${cursorRow}`, `F${cursorRow}`, thinBorder);
  cursorRow++;

  // Conclusion row
  worksheet.getRow(cursorRow).height = 22;
  worksheet.mergeCells(`A${cursorRow}:F${cursorRow}`);
  const conclusion = worksheet.getCell(`A${cursorRow}`);
  const isOk = bb.ket_luan === 'Đạt' ? 'v' : ' ';
  const isNotOk = bb.ket_luan !== 'Đạt' ? 'v' : ' ';
  conclusion.value = `C. Kết luận chung lô hàng:   Đạt yêu cầu nhập kho  [ ${isOk} ]     Không đạt yêu cầu nhập kho  [ ${isNotOk} ]`;
  applyStyle(conclusion, fontSmall);
  applyBorderToRange(worksheet, `A${cursorRow}`, `F${cursorRow}`, thinBorder);
  cursorRow += 2;

  // -------------------------------------------------------------
  // 6. SIGNATURES - same as sample
  // -------------------------------------------------------------
  const sigTitleRow = cursorRow;
  worksheet.getRow(sigTitleRow).height = 24;
  const sigRoles = [
    { col: 'A', title: 'Phó TGĐ' },
    { col: 'B', title: 'TP. PQLCL 1' },
    { col: 'C', title: 'Thủ kho' },
    { col: 'D', title: 'Đại diện ĐV cung ứng' },
    { col: 'F', title: 'Người lập' },
  ];
  worksheet.mergeCells(`D${sigTitleRow}:E${sigTitleRow}`);
  sigRoles.forEach(r => {
    const cell = worksheet.getCell(`${r.col}${sigTitleRow}`);
    cell.value = r.title;
    applyStyle(cell, fontBold, alignCenter, {});
  });

  const sigNameRow = sigTitleRow + 5;
  worksheet.getRow(sigNameRow).height = 24;

  const creatorName = worksheet.getCell(`F${sigNameRow}`);
  creatorName.value = bb.nguoi_ky_nguoi_lap || 'Ngô Văn Trường';
  creatorName.font = fontBoldItalicVal;
  creatorName.alignment = alignCenter;

  // Sheet cleanup / print view
  worksheet.eachRow(row => {
    row.eachCell(cell => {
      if (!cell.font) cell.font = fontRegular;
      if (!cell.alignment) cell.alignment = alignCenter;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const aElement = document.createElement('a');
  aElement.href = url;
  const cleanCode = bb.ma_bbnt ? bb.ma_bbnt.trim().replace(/\s+/g, "") : "GB01";
  aElement.download = `BBQC.${cleanCode}.xlsx`;
  aElement.click();
  window.URL.revokeObjectURL(url);
}

export async function exportPaymentToExcel(bb: BienBan, meta?: {
  maSo?: string;
  lanBanHanh?: string;
  ngayThanhToan?: string;
  quyTrinhTitle?: string;
  bienBanTitle?: string;
  nguoiLapTitle?: string;
  nguoiLapName?: string;
  truongBoPhanTitle?: string;
  truongBoPhanName?: string;
}) {
  // Create workbook & worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Chi tiet thanh toan go");

  worksheet.views = [{ showGridLines: true }];

  // Common styles
  const fontRegular = { name: 'Times New Roman', size: 11, bold: false };
  const fontBold = { name: 'Times New Roman', size: 11, bold: true };
  const fontItalicVal = { name: 'Times New Roman', size: 11, italic: true };
  const fontRedBold = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFF0000' } };

  const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'center' as const };
  const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'left' as const };
  const alignRight: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'right' as const };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } }
  };

  const paymentRows = bb.bang_thanh_toan || [];

  const hasThuong = paymentRows.some(p => p.thuong !== 0 && p.thuong !== undefined && p.thuong !== null);
  const hasVanChuyen = paymentRows.some(p => p.van_chuyen !== 0 && p.van_chuyen !== undefined && p.van_chuyen !== null && p.van_chuyen !== '' && p.van_chuyen !== '0');
  const hasFsc = paymentRows.some(p => p.hd_fsc !== 0 && p.hd_fsc !== undefined && p.hd_fsc !== null && p.hd_fsc !== '' && p.hd_fsc !== '0');
  const hasThanhToan = paymentRows.some(p => p.thanh_toan !== 0 && p.thanh_toan !== undefined && p.thanh_toan !== null);

  // We have dynamic columns: TT (1) | TÊN HÀNG (2) | ĐVT (3) | KHỐI LƯỢNG (4) | ĐƠN GIÁ GỐC (5)
  // [THƯỞNG] | [VẬN CHUYỂN] | [HĐ.FSC] | [THANH TOÁN]
  // ĐƠN GIÁ THANH TOÁN (colIndex1) | THÀNH TIỀN (colIndex2)
  let activeColIdx = 6;
  const colMap = {
    thuong: hasThuong ? activeColIdx++ : 0,
    van_chuyen: hasVanChuyen ? activeColIdx++ : 0,
    hd_fsc: hasFsc ? activeColIdx++ : 0,
    thanh_toan: hasThanhToan ? activeColIdx++ : 0
  };

  const colDonGiaTong = activeColIdx++;
  const colThanhTien = activeColIdx++;
  const numCols = colThanhTien;

  // Set worksheet columns based on dynamic count for beautiful spacing
  const colWidths: { width: number }[] = [];
  for (let c = 1; c <= numCols; c++) {
    if (c === 1) colWidths.push({ width: 6 }); // TT
    else if (c === 2) colWidths.push({ width: 28 }); // TÊN HÀNG
    else if (c === 3) colWidths.push({ width: 10 }); // ĐVT
    else if (c === 4) colWidths.push({ width: 22 }); // KL
    else if (c === 5) colWidths.push({ width: 16 }); // DG GỐC
    else if (c === colDonGiaTong) colWidths.push({ width: 22 }); // DG THANH TOAN
    else if (c === colThanhTien) colWidths.push({ width: 22 }); // THÀNH TIỀN
    else colWidths.push({ width: 15 }); // Adjustment columns
  }
  worksheet.columns = colWidths.map((w, idx) => ({ key: colIndexToLabel(idx + 1), width: w.width }));

  const dateFormatted = bb.ngay_nt ? new Date(bb.ngay_nt).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'}) : "10.06.2026";

  // -------------------------------------------------------------
  // 1. PAYMENT HEADER (Rows 1 & 2)
  // -------------------------------------------------------------
  const logoRangeStr = `A1:B2`;
  const titleRangeStr = `C1:${colIndexToLabel(numCols - 1)}1`;
  const titleSubRangeStr = `C2:${colIndexToLabel(numCols - 1)}2`;
  const codeCellStr = `${colIndexToLabel(numCols)}1`;
  const codeMetaCellStr = `${colIndexToLabel(numCols)}2`;

  worksheet.mergeCells(logoRangeStr);
  worksheet.mergeCells(titleRangeStr);
  worksheet.mergeCells(titleSubRangeStr);

  const cellLogo = worksheet.getCell('A1');
  cellLogo.value = {
    richText: [
      { text: 'NFC\n', font: { name: 'Arial', size: 18, bold: true, color: { argb: 'FF0D733E' } } },
      { text: 'FINANCE', font: { name: 'Arial', size: 8, bold: true, color: { argb: 'FF0D733E' } } }
    ]
  };
  cellLogo.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  const cellTitle = worksheet.getCell('C1');
  cellTitle.value = meta?.quyTrinhTitle || 'QUY TRÌNH THANH TOÁN LÂM SẢN';
  cellTitle.font = { name: 'Times New Roman', size: 12, bold: true };
  cellTitle.alignment = alignCenter;

  const cellSubTitle = worksheet.getCell('C2');
  cellSubTitle.value = meta?.bienBanTitle || 'BẢNG CHI TIẾT THANH TOÁN GỖ';
  cellSubTitle.font = { name: 'Times New Roman', size: 14, bold: true };
  cellSubTitle.alignment = alignCenter;

  const cellCode = worksheet.getCell(codeCellStr);
  cellCode.value = `Ngày thanh toán: ${meta?.ngayThanhToan || dateFormatted}`;
  cellCode.font = { name: 'Times New Roman', size: 10, bold: true };
  cellCode.alignment = alignLeft;

  const cellMeta = worksheet.getCell(codeMetaCellStr);
  cellMeta.value = '';
  cellMeta.font = { name: 'Times New Roman', size: 9, bold: false };
  cellMeta.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  applyBorderToRange(worksheet, 'A1', 'B2', thinBorder);
  applyBorderToRange(worksheet, `C1`, `${colIndexToLabel(numCols - 1)}1`, thinBorder);
  applyBorderToRange(worksheet, `C2`, `${colIndexToLabel(numCols - 1)}2`, thinBorder);
  worksheet.getCell(codeCellStr).border = thinBorder;
  worksheet.getCell(codeMetaCellStr).border = thinBorder;

  worksheet.getRow(1).height = 36;
  worksheet.getRow(2).height = 32;

  // -------------------------------------------------------------
  // 2. METADATA BRIEF (Rows 3 & 4)
  // -------------------------------------------------------------
  const metadataStart = 4;
  worksheet.mergeCells(`A${metadataStart}:C${metadataStart}`);
  const metaC1 = worksheet.getCell(`A${metadataStart}`);
  metaC1.value = `Cơ sở nghiệm thu đối chiếu: BBGN số ${bb.ma_bbnt}`;
  metaC1.font = fontBold;
  metaC1.alignment = alignLeft;
  applyBorderToRange(worksheet, `A${metadataStart}`, `C${metadataStart}`, thinBorder);

  worksheet.mergeCells(`D${metadataStart}:${colIndexToLabel(numCols)}${metadataStart}`);
  const metaC2 = worksheet.getCell(`D${metadataStart}`);
  let supplierValueText = `Đơn vị cung ứng: ${bb.don_vi_cung_ung || 'CTY TNHH SXTM Gia Bảo'}`;
  metaC2.value = supplierValueText;
  metaC2.font = fontBold;
  metaC2.alignment = alignLeft;
  applyBorderToRange(worksheet, `D${metadataStart}`, `${colIndexToLabel(numCols)}${metadataStart}`, thinBorder);

  const metadataNext = metadataStart + 1;
  worksheet.mergeCells(`A${metadataNext}:C${metadataNext}`);
  const metaD1 = worksheet.getCell(`A${metadataNext}`);
  metaD1.value = `Trực thuộc vùng: ${bb.vung_quan_ly || 'Vùng Thanh Hóa'}`;
  metaD1.font = fontRegular;
  metaD1.alignment = alignLeft;
  applyBorderToRange(worksheet, `A${metadataNext}`, `C${metadataNext}`, thinBorder);

  worksheet.mergeCells(`D${metadataNext}:${colIndexToLabel(numCols)}${metadataNext}`);
  const metaD2 = worksheet.getCell(`D${metadataNext}`);
  metaD2.value = `Phương án logistics & vận tải: ${bb.phuong_thuc_van_chuyen || 'NCC tự vận chuyển'}`;
  metaD2.font = fontRegular;
  metaD2.alignment = alignLeft;
  applyBorderToRange(worksheet, `D${metadataNext}`, `${colIndexToLabel(numCols)}${metadataNext}`, thinBorder);

  worksheet.getRow(metadataStart).height = 24;
  worksheet.getRow(metadataNext).height = 24;

  // Space
  let ledgerCurrentRow = metadataNext + 2;

  // -------------------------------------------------------------
  // 3. LEDGER HEADERS
  // -------------------------------------------------------------
  worksheet.getRow(ledgerCurrentRow).height = 28;
  const headers = [
    { idx: 1, v: 'TT' },
    { idx: 2, v: 'TÊN HÀNG' },
    { idx: 3, v: 'ĐVT' },
    { idx: 4, v: 'KHỐI LƯỢNG NHẬP KHO (M³)' },
    { idx: 5, v: 'ĐƠN GIÁ GỐC' }
  ];

  if (hasThuong) headers.push({ idx: colMap.thuong, v: 'THƯỞNG' });
  if (hasVanChuyen) headers.push({ idx: colMap.van_chuyen, v: 'VẬN CHUYỂN' });
  if (hasFsc) headers.push({ idx: colMap.hd_fsc, v: 'HĐ.FSC' });
  if (hasThanhToan) headers.push({ idx: colMap.thanh_toan, v: 'THANH TOÁN' });
  headers.push({ idx: colDonGiaTong, v: 'ĐƠN GIÁ THANH TOÁN' });
  headers.push({ idx: colThanhTien, v: 'THÀNH TIỀN (VND)' });

  headers.forEach(h => {
    const cell = worksheet.getCell(ledgerCurrentRow, h.idx);
    cell.value = h.v;
    cell.font = fontBold;
    cell.alignment = alignCenter;
    cell.border = thinBorder;
  });

  ledgerCurrentRow++;

  // -------------------------------------------------------------
  // 4. LEDGER ROWS
  // -------------------------------------------------------------
  paymentRows.forEach((p, idx) => {
    worksheet.getRow(ledgerCurrentRow).height = 24;

    const cellTT = worksheet.getCell(ledgerCurrentRow, 1);
    cellTT.value = p.stt || idx + 1;
    cellTT.font = fontRegular;
    cellTT.alignment = alignCenter;
    cellTT.border = thinBorder;

    const cellName = worksheet.getCell(ledgerCurrentRow, 2);
    cellName.value = p.ten_hang;
    cellName.font = fontBold;
    cellName.alignment = alignLeft;
    cellName.border = thinBorder;

    const cellDvt = worksheet.getCell(ledgerCurrentRow, 3);
    cellDvt.value = p.dvt || 'm3';
    cellDvt.font = fontRegular;
    cellDvt.alignment = alignCenter;
    cellDvt.border = thinBorder;

    const cellKl = worksheet.getCell(ledgerCurrentRow, 4);
    cellKl.value = Number(p.kl || 0);
    cellKl.numFmt = '#,##0.###';
    cellKl.font = fontBold;
    cellKl.alignment = alignRight;
    cellKl.border = thinBorder;

    const cellDgGoc = worksheet.getCell(ledgerCurrentRow, 5);
    cellDgGoc.value = Number(p.don_gia || 0);
    cellDgGoc.numFmt = '#,##0';
    cellDgGoc.font = fontRegular;
    cellDgGoc.alignment = alignRight;
    cellDgGoc.border = thinBorder;

    if (hasThuong) {
      const cell = worksheet.getCell(ledgerCurrentRow, colMap.thuong);
      cell.value = p.thuong ? Number(p.thuong) : 0;
      cell.numFmt = '#,##0';
      cell.font = fontRegular;
      cell.alignment = alignRight;
      cell.border = thinBorder;
    }
    if (hasVanChuyen) {
      const cell = worksheet.getCell(ledgerCurrentRow, colMap.van_chuyen);
      const val = typeof p.van_chuyen === 'number' ? p.van_chuyen : parseFloat(p.van_chuyen || '') || 0;
      cell.value = val;
      cell.numFmt = '#,##0';
      cell.font = fontRegular;
      cell.alignment = alignRight;
      cell.border = thinBorder;
    }
    if (hasFsc) {
      const cell = worksheet.getCell(ledgerCurrentRow, colMap.hd_fsc);
      const val = typeof p.hd_fsc === 'number' ? p.hd_fsc : parseFloat(p.hd_fsc || '') || 0;
      cell.value = val;
      cell.numFmt = '#,##0';
      cell.font = fontRegular;
      cell.alignment = alignRight;
      cell.border = thinBorder;
    }
    if (hasThanhToan) {
      const cell = worksheet.getCell(ledgerCurrentRow, colMap.thanh_toan);
      cell.value = p.thanh_toan ? Number(p.thanh_toan) : 0;
      cell.numFmt = '#,##0';
      cell.font = fontRegular;
      cell.alignment = alignRight;
      cell.border = thinBorder;
    }

    const cellDgTong = worksheet.getCell(ledgerCurrentRow, colDonGiaTong);
    cellDgTong.value = Number(p.don_gia_tong || p.don_gia || 0);
    cellDgTong.numFmt = '#,##0';
    cellDgTong.font = fontBold;
    cellDgTong.alignment = alignRight;
    cellDgTong.border = thinBorder;

    const cellThanhTien = worksheet.getCell(ledgerCurrentRow, colThanhTien);
    cellThanhTien.value = Number(p.thanh_tien || 0);
    cellThanhTien.numFmt = '#,##0';
    cellThanhTien.font = fontBold;
    cellThanhTien.alignment = alignRight;
    cellThanhTien.border = thinBorder;

    ledgerCurrentRow++;
  });

  const totalVolume = paymentRows.reduce((sum, r) => sum + (r.kl || 0), 0);
  const baseTotal = paymentRows.reduce((sum, r) => sum + (r.thanh_tien || 0), 0);

  // -------------------------------------------------------------
  // 5. INCURRED ADJUSTMENTS BLOCK
  // -------------------------------------------------------------
  let calculatedTotal = baseTotal;
  const incurredList = bb.phat_sinh_chi_phi || [];
  if (incurredList.length > 0) {
    // Spacer row
    worksheet.getRow(ledgerCurrentRow).height = 22;
    worksheet.mergeCells(ledgerCurrentRow, 2, ledgerCurrentRow, numCols);
    const labelIncurredH = worksheet.getCell(ledgerCurrentRow, 2);
    labelIncurredH.value = 'CHI PHÍ PHÁT SINH VÀ PHẠT GIẢM TRỪ ĐIỀU CHỈNH TÀI CHÍNH';
    labelIncurredH.font = fontBold;
    labelIncurredH.alignment = alignLeft;
    applyBorderToRange(worksheet, `${colIndexToLabel(1)}${ledgerCurrentRow}`, `${colIndexToLabel(numCols)}${ledgerCurrentRow}`, thinBorder);
    worksheet.getCell(ledgerCurrentRow, 1).value = '—';
    worksheet.getCell(ledgerCurrentRow, 1).alignment = alignCenter;

    ledgerCurrentRow++;

    incurredList.forEach(cost => {
      worksheet.getRow(ledgerCurrentRow).height = 22;
      const amtSign = cost.type === 'plus' ? cost.amount : -cost.amount;
      calculatedTotal += amtSign;

      // Fill in cells
      for (let c = 1; c <= numCols; c++) {
        const cell = worksheet.getCell(ledgerCurrentRow, c);
        cell.border = thinBorder;
        if (c === 1) {
          cell.value = '—';
          cell.alignment = alignCenter;
        } else if (c === 2) {
          cell.value = cost.name;
          cell.font = fontItalicVal;
          cell.alignment = alignLeft;
        } else if (c === colDonGiaTong) {
          cell.value = amtSign;
          cell.numFmt = '#,##0';
          cell.font = fontBold;
          cell.alignment = alignRight;
        } else if (c === colThanhTien) {
          cell.value = amtSign;
          cell.numFmt = '#,##0';
          cell.font = fontBold;
          cell.alignment = alignRight;
        } else {
          cell.value = '—';
          cell.alignment = alignCenter;
        }
      }
      ledgerCurrentRow++;
    });
  }

  const finalGrandTotal = Math.max(0, calculatedTotal);

  // -------------------------------------------------------------
  // 6. TOTAL ROW (CỘNG)
  // -------------------------------------------------------------
  worksheet.getRow(ledgerCurrentRow).height = 26;
  worksheet.mergeCells(ledgerCurrentRow, 1, ledgerCurrentRow, 2);
  const cellCongLabel = worksheet.getCell(ledgerCurrentRow, 1);
  cellCongLabel.value = 'CỘNG';
  cellCongLabel.font = fontBold;
  cellCongLabel.alignment = alignCenter;
  applyBorderToRange(worksheet, `${colIndexToLabel(1)}${ledgerCurrentRow}`, `${colIndexToLabel(2)}${ledgerCurrentRow}`, thinBorder);

  const cellCongDvtHyphen = worksheet.getCell(ledgerCurrentRow, 3);
  cellCongDvtHyphen.value = '—';
  cellCongDvtHyphen.alignment = alignCenter;
  cellCongDvtHyphen.border = thinBorder;

  // Red and bold total volume
  const cellCongVol = worksheet.getCell(ledgerCurrentRow, 4);
  cellCongVol.value = Number(totalVolume);
  cellCongVol.numFmt = '#,##0.###';
  cellCongVol.font = fontRedBold;
  cellCongVol.alignment = alignRight;
  cellCongVol.border = thinBorder;

  // Hyphen out other cells
  for (let c = 5; c < colThanhTien; c++) {
    const cell = worksheet.getCell(ledgerCurrentRow, c);
    cell.value = '—';
    cell.alignment = alignCenter;
    cell.border = thinBorder;
  }

  // Red and bold final grand total
  const cellCongMoneyVal = worksheet.getCell(ledgerCurrentRow, colThanhTien);
  cellCongMoneyVal.value = Number(finalGrandTotal);
  cellCongMoneyVal.numFmt = '#,##0';
  cellCongMoneyVal.font = fontRedBold;
  cellCongMoneyVal.alignment = alignRight;
  cellCongMoneyVal.border = thinBorder;

  ledgerCurrentRow++;

  // Spelling Row
  worksheet.getRow(ledgerCurrentRow).height = 26;
  worksheet.mergeCells(ledgerCurrentRow, 1, ledgerCurrentRow, numCols);
  const cellSpellingText = worksheet.getCell(ledgerCurrentRow, 1);
  cellSpellingText.value = {
    richText: [
      { text: 'BẰNG CHỮ: ', font: fontBold },
      { text: `${translateMoneyToWords(finalGrandTotal)} ./.`, font: { name: 'Times New Roman', size: 11, italic: true, bold: true } }
    ]
  };
  cellSpellingText.alignment = alignCenter;
  applyBorderToRange(worksheet, `${colIndexToLabel(1)}${ledgerCurrentRow}`, `${colIndexToLabel(numCols)}${ledgerCurrentRow}`, thinBorder);

  ledgerCurrentRow++;

  // -------------------------------------------------------------
  // 7. SIGNATURES ROW
  // -------------------------------------------------------------
  const sigTitleRow = ledgerCurrentRow + 2; // leaves double blank rows space
  worksheet.getRow(sigTitleRow).height = 24;

  // Chỉ giữ 2 chân ký: Người lập biểu và Trưởng bộ phận
  worksheet.mergeCells(sigTitleRow, 1, sigTitleRow, 2);
  const leftTitle = worksheet.getCell(sigTitleRow, 1);
  leftTitle.value = meta?.nguoiLapTitle || 'Người lập biểu';
  leftTitle.font = fontBold;
  leftTitle.alignment = alignCenter;

  worksheet.mergeCells(sigTitleRow, 4, sigTitleRow, numCols);
  const rightTitle = worksheet.getCell(sigTitleRow, 4);
  rightTitle.value = meta?.truongBoPhanTitle || 'Trưởng bộ phận (Duyệt)';
  rightTitle.font = fontBold;
  rightTitle.alignment = alignCenter;

  const sigSignRow = sigTitleRow + 1;
  worksheet.getRow(sigSignRow).height = 20;

  worksheet.mergeCells(sigSignRow, 1, sigSignRow, 2);
  const leftSign = worksheet.getCell(sigSignRow, 1);
  leftSign.value = '(Ký & ghi rõ họ tên)';
  leftSign.font = fontItalicVal;
  leftSign.alignment = alignCenter;

  worksheet.mergeCells(sigSignRow, 4, sigSignRow, numCols);
  const rightSign = worksheet.getCell(sigSignRow, 4);
  rightSign.value = '(Ký, đóng dấu & phê duyệt)';
  rightSign.font = fontItalicVal;
  rightSign.alignment = alignCenter;

  const sigNameRow = sigSignRow + 4;
  worksheet.getRow(sigNameRow).height = 24;

  worksheet.mergeCells(sigNameRow, 1, sigNameRow, 2);
  const leftName = worksheet.getCell(sigNameRow, 1);
  leftName.value = meta?.nguoiLapName || bb.nguoi_ky_nguoi_lap || 'Ngô Văn Trường';
  leftName.font = fontBold;
  leftName.alignment = alignCenter;

  worksheet.mergeCells(sigNameRow, 4, sigNameRow, numCols);
  const rightName = worksheet.getCell(sigNameRow, 4);
  rightName.value = meta?.truongBoPhanName || 'Trần Anh Tuấn';
  rightName.font = fontBold;
  rightName.alignment = alignCenter;

  // Output File Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const aElement = document.createElement('a');
  aElement.href = url;
  aElement.download = `Thanhtoan.${bb.ma_bbnt.replace(/[^a-zA-Z0-9.-]/g, "_")}.xlsx`;
  aElement.click();
  window.URL.revokeObjectURL(url);
}

export async function exportDebtToExcel(
  summaryData: any[],
  billingPeriodLabel: string,
  allRecords?: any[],
  invoices?: any[],
  payments?: any[],
  paymentProposals?: any[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Cong No");

  // Ensure grid lines are visible in Microsoft Excel
  worksheet.views = [{ showGridLines: true }];

  // Column definitions matching the columns in the image
  const alignCenter = { vertical: 'middle' as const, horizontal: 'center' as const };
  const alignLeft = { vertical: 'middle' as const, horizontal: 'left' as const };
  const alignRight = { vertical: 'middle' as const, horizontal: 'right' as const };

  worksheet.columns = [
    { key: 'A', width: 8, style: { alignment: alignCenter } },   // TT
    { key: 'B', width: 22, style: { alignment: alignCenter } },  // Số phiếu
    { key: 'C', width: 22, style: { alignment: alignCenter } },  // Số Biên bản
    { key: 'D', width: 18, style: { alignment: alignRight } },   // Khối lượng (m³)
    { key: 'E', width: 22, style: { alignment: alignRight } },   // Tổng nợ
    { key: 'F', width: 22, style: { alignment: alignRight } },   // Đã trả
    { key: 'G', width: 22, style: { alignment: alignRight } },   // Dư nợ còn lại
    { key: 'H', width: 20, style: { alignment: alignCenter } }   // Trạng thái
  ];

  const fontTitle = { name: 'Times New Roman', size: 16, bold: true, italic: false };
  const fontSubtitle = { name: 'Times New Roman', size: 11, bold: true, italic: true };
  const fontHeader = { name: 'Times New Roman', size: 10, bold: true, italic: false };
  const fontBold = { name: 'Times New Roman', size: 11, bold: true, italic: false };
  const fontRegular = { name: 'Times New Roman', size: 10, bold: false, italic: false };
  const fontItalic = { name: 'Times New Roman', size: 10, italic: true };

  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } }
  };

  // Helper helper to format "YYYY-MM-DD" -> "DD/MM" (like "23/9")
  const formatDateShort = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length >= 3) {
      return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`;
    }
    return dateStr;
  };

  // Parse Year & Week from billingPeriodLabel
  let year = '2026';
  let week = '38';
  if (billingPeriodLabel) {
    const weekMatch = billingPeriodLabel.match(/Tuần\s+(\d+)/i);
    const yearMatch = billingPeriodLabel.match(/\/\s*(\d{4})/);
    if (weekMatch) week = weekMatch[1];
    if (yearMatch) year = yearMatch[1];
    else {
      const fourOpts = billingPeriodLabel.match(/\b(202\d)\b/);
      if (fourOpts) year = fourOpts[1];
    }
  }

  // Parse date ranges for filtering if we have parentheses date range
  let startDateMs = 0;
  let endDateMs = Infinity;

  if (billingPeriodLabel && billingPeriodLabel.includes('(')) {
    try {
      const openIdx = billingPeriodLabel.indexOf('(');
      const closeIdx = billingPeriodLabel.indexOf(')');
      if (openIdx !== -1 && closeIdx !== -1) {
        const parenthesesContent = billingPeriodLabel.slice(openIdx + 1, closeIdx).trim();
        const dateParts = parenthesesContent.split('-');
        if (dateParts.length === 2) {
          const startStr = dateParts[0].trim(); // e.g. "08/06"
          const endStr = dateParts[1].trim();   // e.g. "14/06/2026"
          
          const endSplit = endStr.split('/');
          if (endSplit.length === 3) {
            const dYear = parseInt(endSplit[2], 10);
            const dMonth = parseInt(endSplit[1], 10) - 1;
            const dDay = parseInt(endSplit[0], 10);
            
            const endOfW = new Date(dYear, dMonth, dDay, 23, 59, 59, 999);
            endDateMs = endOfW.getTime();
            
            const startSplit = startStr.split('/');
            if (startSplit.length === 2) {
              const sMonth = parseInt(startSplit[1], 10) - 1;
              const sDay = parseInt(startSplit[0], 10);
              const startOfW = new Date(dYear, sMonth, sDay, 0, 0, 0, 0);
              startDateMs = startOfW.getTime();
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse billing period date range", e);
    }
  }

  // 1. TITLE BLOCK
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'DANH SÁCH THEO DÕI CHI TIẾT CÔNG NỢ';
  titleCell.font = { name: 'Times New Roman', size: 18, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = alignCenter;
  worksheet.getRow(1).height = 36;

  worksheet.mergeCells('A2:H2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `BỘ PHẬN CUNG ỨNG GỖ NĂM ${year} - TUẦN ${week}`;
  subCell.font = { name: 'Times New Roman', size: 12, bold: true, italic: true, color: { argb: 'FF000000' } };
  subCell.alignment = alignCenter;
  worksheet.getRow(2).height = 24;

  worksheet.mergeCells('A3:H3');
  const periodCell = worksheet.getCell('A3');
  periodCell.value = `Kỳ thanh toán: ${billingPeriodLabel}`;
  periodCell.font = fontItalic;
  periodCell.alignment = alignCenter;
  worksheet.getRow(3).height = 20;

  // Space row
  worksheet.getRow(4).height = 15;

  // 2. HEADER ROW
  const headerRowIdx = 5;
  worksheet.getRow(headerRowIdx).height = 32;
  const headers = [
    'TT',
    'Số phiếu',
    'Số Biên bản',
    'Khối lượng (m³)',
    'Tổng nợ',
    'Đã trả',
    'Dư nợ còn lại',
    'Trạng thái'
  ];

  headers.forEach((h, idx) => {
    const cell = worksheet.getCell(headerRowIdx, idx + 1);
    cell.value = h;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate-800
    };
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  // Supplier Region Classify Helper
  const getSupplierRegion = (name: string): 'I. Phía Bắc' | 'II. Phía Nam' => {
    const norm = (name || '').toLowerCase();
    if (
      norm.includes('xuân sơn') ||
      norm.includes('quang thành thắng') ||
      norm.includes('trần thị trang') ||
      norm.includes('trường quang việt') ||
      norm.includes('nguyễn văn hải') ||
      norm.includes('phan văn vinh') ||
      norm.includes('phía nam') ||
      norm.includes('nam bộ')
    ) {
      return 'II. Phía Nam';
    }
    return 'I. Phía Bắc';
  };

  const northernSuppliers: any[] = [];
  const southernSuppliers: any[] = [];

  summaryData.forEach((s) => {
    const reg = getSupplierRegion(s.supplierName);
    if (reg === 'II. Phía Nam') {
      southernSuppliers.push(s);
    } else {
      northernSuppliers.push(s);
    }
  });

  let currentRow = 6;

  const renderSection = (sectionLabel: string, suppliers: any[]) => {
    if (suppliers.length === 0) return { sectionSum: 0, sectionVolSum: 0, sectionPaidSum: 0, sectionRemainingSum: 0 };

    let sectionSum = 0;
    let sectionVolSum = 0;
    let sectionPaidSum = 0;
    let sectionRemainingSum = 0;

    // A. Section Header Row (e.g. I. Phía Bắc)
    worksheet.getRow(currentRow).height = 26;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const labelCell = worksheet.getCell(`A${currentRow}`);
    labelCell.value = sectionLabel;
    labelCell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    for (let c = 1; c <= 8; c++) {
      const cell = worksheet.getCell(currentRow, c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCBD5E1' } // Slate-300
      };
      cell.border = thinBorder;
    }
    currentRow++;

    // B. List Suppliers within Section
    suppliers.forEach((sup) => {
      // Collect details for this supplier using BBNT records
      const partnerRecords = (allRecords || []).filter(r => {
        const nameMatch = (r.don_vi_cung_ung || '').trim().toLowerCase() === sup.supplierName.trim().toLowerCase();
        const hasPaymentTable = r.bang_thanh_toan && r.bang_thanh_toan.length > 0;
        if (!nameMatch || !hasPaymentTable) return false;
        
        if (!r.ngay_nt) return true;
        const rTime = new Date(r.ngay_nt).getTime();
        return rTime >= startDateMs && rTime <= endDateMs;
      });

      const details: any[] = [];

      partnerRecords.forEach((r) => {
        const costAmt = (r.bang_thanh_toan || []).reduce((sum: number, item: any) => sum + (item.thanh_tien || 0), 0);
        const incurredCostsSum = (r.phat_sinh_chi_phi || []).reduce((sum: number, item: any) => {
          return sum + (item.type === 'plus' ? item.amount : -item.amount);
        }, 0);
        const totalAmt = costAmt + incurredCostsSum;

        const vol = (r.quy_cach_a || []).reduce((sum, item) => sum + (item.kl_nguyen_thuy || 0), 0);

        // Find associated payment proposal (whether paid or unpaid) to get proposalNo as "Số phiếu"
        let proposalNo = '—';
        if (paymentProposals) {
          const matchedProp = paymentProposals.find(p => p.bbntId === r.id);
          if (matchedProp) {
            proposalNo = matchedProp.proposalNo;
          } else {
            // Check by supplier name and approximate amount/volume/date
            const anyMatchedProp = paymentProposals.find(p => 
              p.supplierName.trim().toLowerCase() === sup.supplierName.trim().toLowerCase() &&
              Math.abs(p.amount - totalAmt) < 1000
            );
            if (anyMatchedProp) {
              proposalNo = anyMatchedProp.proposalNo;
            }
          }
        }

        // If no proposalNo found, check in invoices
        if (proposalNo === '—' && invoices) {
          const matchedInv = invoices.find(inv => inv.bbntIds && inv.bbntIds.includes(r.id));
          if (matchedInv) {
            proposalNo = matchedInv.invoiceNo;
          }
        }

        details.push({
          id: r.id,
          ma_bbnt: r.ma_bbnt,
          ngay_nt: r.ngay_nt,
          volume: vol,
          amount: totalAmt,
          proposalNo,
          trang_thai: r.trang_thai_thanh_toan || 'Chưa thanh toán'
        });
      });

      // Sort details chronologically
      details.sort((a, b) => new Date(a.ngay_nt || '').getTime() - new Date(b.ngay_nt || '').getTime());

      // Find total paid amount for this supplier from payments (which contains paid proposals)
      const supplierPayments = (payments || []).filter(p => 
        p.supplierName.trim().toLowerCase() === sup.supplierName.trim().toLowerCase()
      );
      const totalPaid = supplierPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Apply progressive FIFO allocation
      let remainingPayments = totalPaid;
      details.forEach((item) => {
        const recordAmount = item.amount;
        let allocatedPaid = 0;
        
        if (remainingPayments > 0) {
          if (remainingPayments >= recordAmount) {
            allocatedPaid = recordAmount;
            remainingPayments -= recordAmount;
          } else {
            allocatedPaid = remainingPayments;
            remainingPayments = 0;
          }
        }
        
        const calculatedRemaining = item.trang_thai === 'Đã thanh toán' ? 0 : (recordAmount - allocatedPaid);
        item.allocatedPaid = allocatedPaid;
        item.calculatedRemaining = calculatedRemaining;
      });

      // If details are empty but the supplier has a summary balance, add a fallback row
      if (details.length === 0) {
        details.push({
          id: 'fallback-' + sup.supplierName,
          ma_bbnt: '—',
          ngay_nt: '',
          volume: sup.periodVolume || 0,
          amount: sup.periodPurchases || sup.endingBalance || 0,
          proposalNo: '—',
          trang_thai: sup.endingBalance <= 1000 ? 'Đã thanh toán' : 'Chưa thanh toán',
          allocatedPaid: sup.periodPaid || 0,
          calculatedRemaining: sup.endingBalance || 0
        });
      }

      // Group Header Row (e.g. Cty Trường Thịnh Phát)
      worksheet.getRow(currentRow).height = 24;
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const supNameCell = worksheet.getCell(`A${currentRow}`);
      supNameCell.value = `Nhà cung cấp: ${sup.supplierName}`;
      supNameCell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF000000' } };
      supNameCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      
      for (let c = 1; c <= 8; c++) {
        const cell = worksheet.getCell(currentRow, c);
        // White background (no fill) as in template image
        cell.fill = undefined;
        cell.border = thinBorder;
      }
      currentRow++;

      // Detail Rows under this supplier
      details.forEach((det, idx) => {
        worksheet.getRow(currentRow).height = 22;

        const cA = worksheet.getCell(`A${currentRow}`);
        cA.value = idx + 1;
        cA.font = fontRegular;
        cA.alignment = alignCenter;
        cA.border = thinBorder;

        const cB = worksheet.getCell(`B${currentRow}`);
        cB.value = det.proposalNo;
        cB.font = fontRegular;
        cB.alignment = alignCenter;
        cB.border = thinBorder;

        const cC = worksheet.getCell(`C${currentRow}`);
        cC.value = det.ma_bbnt;
        cC.font = fontRegular;
        cC.alignment = alignCenter;
        cC.border = thinBorder;

        const cD = worksheet.getCell(`D${currentRow}`);
        cD.value = det.volume;
        cD.font = fontRegular;
        cD.alignment = alignRight;
        cD.numFmt = '#,##0.000';
        cD.border = thinBorder;

        const cE = worksheet.getCell(`E${currentRow}`);
        cE.value = det.amount;
        cE.font = fontRegular;
        cE.alignment = alignRight;
        cE.numFmt = '#,##0';
        cE.border = thinBorder;

        const cF = worksheet.getCell(`F${currentRow}`);
        cF.value = det.allocatedPaid;
        cF.font = { name: 'Times New Roman', size: 10, color: { argb: 'FF008000' }, italic: false }; // Green for Paid
        cF.alignment = alignRight;
        cF.numFmt = '#,##0';
        cF.border = thinBorder;

        const cG = worksheet.getCell(`G${currentRow}`);
        cG.value = det.calculatedRemaining;
        const isRemaining = det.calculatedRemaining > 1000;
        cG.font = { name: 'Times New Roman', size: 10, color: isRemaining ? { argb: 'FFB45309' } : { argb: 'FF64748B' }, italic: false }; // Amber if owing, Slate if settled
        cG.alignment = alignRight;
        cG.numFmt = '#,##0';
        cG.border = thinBorder;

        const cH = worksheet.getCell(`H${currentRow}`);
        let statusText = 'Chưa thanh toán';
        let statusFont = { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FFB45309' } };
        
        if (det.trang_thai === 'Chờ hạch toán') {
          statusText = 'Chờ duyệt giá';
          statusFont = { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FF64748B' } };
        } else if (det.calculatedRemaining <= 1000) {
          statusText = 'Đã tất toán';
          statusFont = { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FF008000' } };
        } else {
          statusText = 'Đang nợ';
        }
        
        cH.value = statusText;
        cH.font = statusFont;
        cH.alignment = alignCenter;
        cH.border = thinBorder;

        currentRow++;
      });

      // Supplier Summary Row (subtotal)
      worksheet.getRow(currentRow).height = 24;
      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      const supSumLabel = worksheet.getCell(`A${currentRow}`);
      supSumLabel.value = 'Cộng';
      supSumLabel.font = fontBold;
      supSumLabel.alignment = alignCenter;

      const supplierSumVol = details.reduce((acc, d) => acc + d.volume, 0);
      const supplierSumAmt = details.reduce((acc, d) => acc + d.amount, 0);
      const supplierSumPaid = details.reduce((acc, d) => acc + d.allocatedPaid, 0);
      const supplierSumRem = details.reduce((acc, d) => acc + d.calculatedRemaining, 0);

      sectionSum += supplierSumAmt;
      sectionVolSum += supplierSumVol;
      sectionPaidSum += supplierSumPaid;
      sectionRemainingSum += supplierSumRem;

      const sD = worksheet.getCell(`D${currentRow}`);
      sD.value = supplierSumVol;
      sD.font = fontBold;
      sD.alignment = alignRight;
      sD.numFmt = '#,##0.000';

      const sE = worksheet.getCell(`E${currentRow}`);
      sE.value = supplierSumAmt;
      sE.font = fontBold;
      sE.alignment = alignRight;
      sE.numFmt = '#,##0';

      const sF = worksheet.getCell(`F${currentRow}`);
      sF.value = supplierSumPaid;
      sF.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF008000' }, italic: false };
      sF.alignment = alignRight;
      sF.numFmt = '#,##0';

      const sG = worksheet.getCell(`G${currentRow}`);
      sG.value = supplierSumRem;
      sG.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFB45309' }, italic: false };
      sG.alignment = alignRight;
      sG.numFmt = '#,##0';

      const sH = worksheet.getCell(`H${currentRow}`);
      sH.value = '';

      for (let c = 1; c <= 8; c++) {
        const cell = worksheet.getCell(currentRow, c);
        // White background (no fill) as in template image
        cell.fill = undefined;
        cell.border = thinBorder;
      }

      currentRow++;
    });

    return { sectionSum, sectionVolSum, sectionPaidSum, sectionRemainingSum };
  };

  const northResult = renderSection('I. Phía Bắc', northernSuppliers);
  const southResult = renderSection('II. Phía Nam', southernSuppliers);

  const grandTotalVol = northResult.sectionVolSum + southResult.sectionVolSum;
  const grandTotalAmt = northResult.sectionSum + southResult.sectionSum;
  const grandTotalPaid = northResult.sectionPaidSum + southResult.sectionPaidSum;
  const grandTotalRemaining = northResult.sectionRemainingSum + southResult.sectionRemainingSum;

  // 3. GRAND TOTAL ROW
  worksheet.getRow(currentRow).height = 30;
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const grandTotalLabel = worksheet.getCell(`A${currentRow}`);
  grandTotalLabel.value = 'TỔNG CỘNG';
  grandTotalLabel.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF000000' }, italic: false };
  grandTotalLabel.alignment = alignCenter;

  const grandTotalVolVal = worksheet.getCell(`D${currentRow}`);
  grandTotalVolVal.value = grandTotalVol;
  grandTotalVolVal.font = fontBold;
  grandTotalVolVal.alignment = alignRight;
  grandTotalVolVal.numFmt = '#,##0.000';

  const grandTotalAmtVal = worksheet.getCell(`E${currentRow}`);
  grandTotalAmtVal.value = grandTotalAmt;
  grandTotalAmtVal.font = fontBold;
  grandTotalAmtVal.alignment = alignRight;
  grandTotalAmtVal.numFmt = '#,##0';

  const grandTotalPaidVal = worksheet.getCell(`F${currentRow}`);
  grandTotalPaidVal.value = grandTotalPaid;
  grandTotalPaidVal.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF008000' }, italic: false };
  grandTotalPaidVal.alignment = alignRight;
  grandTotalPaidVal.numFmt = '#,##0';

  const grandTotalRemainingVal = worksheet.getCell(`G${currentRow}`);
  grandTotalRemainingVal.value = grandTotalRemaining;
  grandTotalRemainingVal.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFB45309' }, italic: false };
  grandTotalRemainingVal.alignment = alignRight;
  grandTotalRemainingVal.numFmt = '#,##0';

  const grandTotalStatusVal = worksheet.getCell(`H${currentRow}`);
  grandTotalStatusVal.value = '';

  for (let c = 1; c <= 8; c++) {
    const cell = worksheet.getCell(currentRow, c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E2F3' } // light grey-blue as in the image
    };
    cell.border = thinBorder;
  }
  currentRow += 2;

  // 4. SIGNATURE BLOCK
  // Date section on the right side
  worksheet.getRow(currentRow).height = 20;
  worksheet.mergeCells(`F${currentRow}:H${currentRow}`);
  const dateSignCell = worksheet.getCell(`F${currentRow}`);
  dateSignCell.value = `Nam Định, ngày       tháng       năm ${year}`;
  dateSignCell.font = fontItalic;
  dateSignCell.alignment = alignCenter;

  currentRow++;

  // Role names
  worksheet.getRow(currentRow).height = 22;
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const roleLeftCell = worksheet.getCell(`A${currentRow}`);
  roleLeftCell.value = 'PT. Bộ phận';
  roleLeftCell.font = fontBold;
  roleLeftCell.alignment = alignCenter;

  worksheet.mergeCells(`F${currentRow}:H${currentRow}`);
  const roleRightCell = worksheet.getCell(`F${currentRow}`);
  roleRightCell.value = 'Người lập';
  roleRightCell.font = fontBold;
  roleRightCell.alignment = alignCenter;

  currentRow += 4; // leave blank lines for signing

  // Signer personal names
  worksheet.getRow(currentRow).height = 24;
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const nameLeftCell = worksheet.getCell(`A${currentRow}`);
  nameLeftCell.value = 'Bùi Văn Thám';
  nameLeftCell.font = fontBold;
  nameLeftCell.alignment = alignCenter;

  worksheet.mergeCells(`F${currentRow}:H${currentRow}`);
  const nameRightCell = worksheet.getCell(`F${currentRow}`);
  nameRightCell.value = 'Nguyễn Thị Mai Hiên';
  nameRightCell.font = fontBold;
  nameRightCell.alignment = alignCenter;

  // Output file to the browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const aElement = document.createElement('a');
  aElement.href = url;
  aElement.download = `Danh_Sach_Cong_No_NCC_Tuan_${week}_Nam_${year}.xlsx`;
  aElement.click();
  window.URL.revokeObjectURL(url);
}

export async function exportInvoiceToExcel(inv: any, historyInspections: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bang ke VAT detail");
  worksheet.views = [{ showGridLines: true }];

  // Common styles
  const fontRegular = { name: 'Times New Roman', size: 11, bold: false };
  const fontBold = { name: 'Times New Roman', size: 11, bold: true };
  const fontItalic = { name: 'Times New Roman', size: 11, italic: true };
  const fontTitle = { name: 'Times New Roman', size: 14, bold: true };

  const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'center' as const };
  const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'left' as const };
  const alignRight: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'right' as const };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } }
  };

  const doubleBottomBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'double' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } }
  };

  // Configure column widths
  worksheet.columns = [
    { key: 'A', width: 6 },   // TT
    { key: 'B', width: 32 },  // Tên, quy cách, kích thước
    { key: 'C', width: 10 },  // Đvt
    { key: 'D', width: 16 },  // KL
    { key: 'E', width: 18 },  // Đơn giá gốc
    { key: 'F', width: 18 },  // Đơn Giá
    { key: 'G', width: 22 },  // Thành tiền
  ];

  // Helper to extract clean specification like 470*50*14
  const cleanSpecName = (tenHang: string): string => {
    const regex = /quy cách\s*([0-9xX×* \.\-\+]+)/i;
    const match = tenHang.match(regex);
    if (match && match[1]) {
      return match[1].trim().replace(/×/g, '*').replace(/x/gi, '*');
    }
    return tenHang;
  };

  // Title block
  worksheet.getRow(2).height = 25;
  worksheet.mergeCells('A2:G2');
  worksheet.getCell('A2').value = 'BẢNG KÊ CHI TIẾT LÂM SẢN HẠCH TOÁN ĐỐI CHIẾU HÓA ĐƠN VAT';
  worksheet.getCell('A2').font = fontTitle;
  worksheet.getCell('A2').alignment = alignCenter;

  worksheet.getRow(3).height = 20;
  worksheet.mergeCells('A3:G3');
  worksheet.getCell('A3').value = `(Căn cứ theo số liệu thanh toán, Biên bản số: ${inv.bbntIds?.join(', ') || 'N/A'})`;
  worksheet.getCell('A3').font = fontItalic;
  worksheet.getCell('A3').alignment = alignCenter;

  // Table Headers (Row 5)
  worksheet.getRow(5).height = 25;
  const headers = [
    'TT', 'Tên, quy cách, kích thước', 'Đvt', 'KL', 'Đơn giá gốc', 'Đơn Giá', 'Thành tiền'
  ];
  for (let colIdx = 1; colIdx <= 7; colIdx++) {
    const cell = worksheet.getCell(5, colIdx);
    cell.value = headers[colIdx - 1];
    cell.font = fontBold;
    cell.alignment = alignCenter;
    cell.border = thinBorder;
  }

  // Retrieve displaying rows
  const matchedBBNTs = historyInspections.filter(bb => inv.bbntIds?.includes(bb.ma_bbnt));
  const invoiceDetailRows = matchedBBNTs.flatMap(bb => bb.bang_thanh_toan || []);
  const displayRows = invoiceDetailRows.length > 0 ? invoiceDetailRows : [
    {
      id: 'synth-1',
      stt: 1,
      ten_hang: `Gỗ nguyên liệu quy cách đối chiếu hạch toán (Số HĐ: ${inv.symbol} / BB QC: ${inv.invoiceNo})`,
      dvt: 'm³',
      kl: inv.totalVolume || 0,
      don_gia: Math.round(inv.amountBeforeTax / (inv.totalVolume || 1)),
      thuong: 0,
      don_gia_tong: Math.round(inv.amountBeforeTax / (inv.totalVolume || 1)),
      thanh_tien: inv.amountBeforeTax || 0,
    }
  ];

  // Populate data rows starting at row 6
  let currentRow = 6;
  displayRows.forEach((row: any, index: number) => {
    worksheet.getRow(currentRow).height = 22;

    const cellA = worksheet.getCell(`A${currentRow}`);
    cellA.value = row.stt || (index + 1);
    cellA.font = fontRegular;
    cellA.alignment = alignCenter;
    cellA.border = thinBorder;

    const cellB = worksheet.getCell(`B${currentRow}`);
    cellB.value = cleanSpecName(row.ten_hang);
    cellB.font = fontBold;
    cellB.alignment = alignCenter;
    cellB.border = thinBorder;

    const cellC = worksheet.getCell(`C${currentRow}`);
    cellC.value = row.dvt || 'm³';
    cellC.font = fontRegular;
    cellC.alignment = alignCenter;
    cellC.border = thinBorder;

    const cellD = worksheet.getCell(`D${currentRow}`);
    cellD.value = row.kl;
    cellD.font = fontRegular;
    cellD.alignment = alignRight;
    cellD.numFmt = '#,##0.###';
    cellD.border = thinBorder;

    const cellE = worksheet.getCell(`E${currentRow}`);
    cellE.value = row.don_gia;
    cellE.font = fontRegular;
    cellE.alignment = alignRight;
    cellE.numFmt = '#,##0';
    cellE.border = thinBorder;

    const cellF = worksheet.getCell(`F${currentRow}`);
    cellF.value = row.don_gia_tong || row.don_gia;
    cellF.font = fontRegular;
    cellF.alignment = alignRight;
    cellF.numFmt = '#,##0';
    cellF.border = thinBorder;

    const cellG = worksheet.getCell(`G${currentRow}`);
    cellG.value = row.thanh_tien;
    cellG.font = fontBold;
    cellG.alignment = alignRight;
    cellG.numFmt = '#,##0';
    cellG.border = thinBorder;

    currentRow++;
  });

  const totalVolSum = displayRows.reduce((sum, r) => sum + (r.kl || 0), 0);
  const totalAmountBeforeTaxSum = displayRows.reduce((sum, r) => sum + (r.thanh_tien || 0), 0);

  // Row: Cộng trước thuế VAT
  worksheet.getRow(currentRow).height = 24;
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const labelCong = worksheet.getCell(`A${currentRow}`);
  labelCong.value = 'Cộng trước thuế VAT';
  labelCong.font = fontBold;
  labelCong.alignment = alignCenter;

  for (let c = 1; c <= 3; c++) {
    worksheet.getCell(currentRow, c).border = thinBorder;
  }

  const sumVolCell = worksheet.getCell(`D${currentRow}`);
  sumVolCell.value = totalVolSum;
  sumVolCell.font = fontBold;
  sumVolCell.alignment = alignRight;
  sumVolCell.numFmt = '#,##0.###';
  sumVolCell.border = thinBorder;

  const emptyGocCell = worksheet.getCell(`E${currentRow}`);
  emptyGocCell.value = '-';
  emptyGocCell.font = fontRegular;
  emptyGocCell.alignment = alignCenter;
  emptyGocCell.border = thinBorder;

  const emptyDgCell = worksheet.getCell(`F${currentRow}`);
  emptyDgCell.value = '';
  emptyDgCell.border = thinBorder;

  const sumAmtCell = worksheet.getCell(`G${currentRow}`);
  sumAmtCell.value = totalAmountBeforeTaxSum;
  sumAmtCell.font = fontBold;
  sumAmtCell.alignment = alignRight;
  sumAmtCell.numFmt = '#,##0';
  sumAmtCell.border = thinBorder;

  currentRow++;

  // Summary and tax rows on the right
  const taxRate = inv.taxRate;
  const taxAmount = totalAmountBeforeTaxSum * (taxRate / 100);
  const totalWithTax = totalAmountBeforeTaxSum + taxAmount;

  // Row VAT
  worksheet.getRow(currentRow).height = 22;
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const vatLabel = worksheet.getCell(`A${currentRow}`);
  vatLabel.value = `Thuế suất VAT (${taxRate}%)`;
  vatLabel.font = fontRegular;
  vatLabel.alignment = alignRight;
  for (let c = 1; c <= 6; c++) {
    worksheet.getCell(currentRow, c).border = thinBorder;
  }
  const vatAmtCell = worksheet.getCell(`G${currentRow}`);
  vatAmtCell.value = taxAmount;
  vatAmtCell.font = fontBold;
  vatAmtCell.alignment = alignRight;
  vatAmtCell.numFmt = '#,##0';
  vatAmtCell.border = thinBorder;

  currentRow++;

  // Row Tổng cộng thanh toán
  worksheet.getRow(currentRow).height = 24;
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const totalLabel = worksheet.getCell(`A${currentRow}`);
  totalLabel.value = 'Tổng cộng tiền thanh toán (sau thuế)';
  totalLabel.font = fontBold;
  totalLabel.alignment = alignRight;
  for (let c = 1; c <= 6; c++) {
    worksheet.getCell(currentRow, c).border = thinBorder;
  }
  const totalAmtCell = worksheet.getCell(`G${currentRow}`);
  totalAmtCell.value = totalWithTax;
  totalAmtCell.font = fontBold;
  totalAmtCell.alignment = alignRight;
  totalAmtCell.numFmt = '#,##0';
  totalAmtCell.border = doubleBottomBorder;

  currentRow++;

  // Bằng chữ row directly under the table
  worksheet.getRow(currentRow).height = 24;
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const wordAmtCell = worksheet.getCell(`A${currentRow}`);
  wordAmtCell.value = {
    richText: [
      { text: 'Bằng chữ (tiền sau thuế): ', font: { name: 'Times New Roman', size: 11, italic: true } },
      { text: `${translateMoneyToWords(totalWithTax)} ./.`, font: { name: 'Times New Roman', size: 11, italic: true } }
    ]
  };
  wordAmtCell.alignment = alignLeft;

  currentRow += 2; // leave 1 row blank

  // Trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const aElement = document.createElement('a');
  aElement.href = url;
  aElement.download = `Bang_Ke_VAT_Chi_Tiet_HD.${inv.symbol}.xlsx`;
  aElement.click();
  window.URL.revokeObjectURL(url);
}

export async function exportProposalToExcel(
  prop: any,
  detailedRows: any[],
  invoices: any[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Giay De Nghi Thanh Toan");

  // Disable grid lines to match the user's request to hide all lines/gridlines
  worksheet.views = [{ showGridLines: false }];

  // Configure Worksheet Page Setup to landscape A5 (A5 paper size is 11)
  worksheet.pageSetup = {
    paperSize: 11,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: {
      left: 0.3, right: 0.3,
      top: 0.25, bottom: 0.25,
      header: 0, footer: 0
    }
  };

  // Column definitions (8 columns total, spaced out beautifully for landscape)
  worksheet.columns = [
    { key: 'A', width: 14 },
    { key: 'B', width: 14 },
    { key: 'C', width: 14 },
    { key: 'D', width: 18 },
    { key: 'E', width: 14 },
    { key: 'F', width: 14 },
    { key: 'G', width: 16 },
    { key: 'H', width: 18 }
  ];

  const fontRegular = { name: 'Times New Roman', size: 11, bold: false };
  const fontBold = { name: 'Times New Roman', size: 11, bold: true };
  const fontItalic = { name: 'Times New Roman', size: 11, italic: true };
  const fontBoldItalic = { name: 'Times New Roman', size: 11, bold: true, italic: true };
  const fontTitle = { name: 'Times New Roman', size: 16, bold: true };

  const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center' };
  const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'left' };

  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } }
  };

  // Helper to merge, value, style and border ranges nicely to make the output 100% professional
  function styleMergedRange(
    ws: any,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    value: any,
    font: any,
    alignment: Partial<ExcelJS.Alignment>,
    border?: any
  ) {
    ws.mergeCells(startRow, startCol, endRow, endCol);
    const mainCell = ws.getCell(startRow, startCol);
    mainCell.value = value;
    if (font) {
      mainCell.font = font;
    }
    mainCell.alignment = alignment;
    if (border) {
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          ws.getCell(r, c).border = border;
        }
      }
    }
  }

  // Row 1: Company Header (left) & Template Metadata (right)
  worksheet.getRow(1).height = 20;
  styleMergedRange(worksheet, 1, 1, 1, 3, 'CÔNG TY CP LÂM SẢN', fontBold, alignCenter);
  styleMergedRange(worksheet, 1, 4, 1, 8, 'Mẫu số: 05 – TT', { name: 'Times New Roman', size: 12.5, bold: true }, alignCenter);

  // Row 2: Sub-header
  worksheet.getRow(2).height = 18;
  styleMergedRange(worksheet, 2, 1, 2, 3, 'NAM ĐỊNH', fontBold, alignCenter);
  styleMergedRange(worksheet, 2, 4, 2, 8, '(Ban hành theo TT số 99/2025/TT-BTC', { name: 'Times New Roman', size: 9.5, italic: true }, alignCenter);

  // Row 3: Sub-header metadata
  worksheet.getRow(3).height = 18;
  styleMergedRange(worksheet, 3, 4, 3, 8, 'ngày 27/10/2025 Bộ Tài chính )', { name: 'Times New Roman', size: 9.5, italic: true }, alignCenter);

  // Row 4: Spacer
  worksheet.getRow(4).height = 10;

  // Row 5: Main Title
  worksheet.getRow(5).height = 28;
  styleMergedRange(worksheet, 5, 1, 5, 8, 'GIẤY ĐỀ NGHỊ THANH TOÁN', fontTitle, alignCenter);

  // Row 6: Date string
  let day = '...';
  let month = '...';
  let year = '...';
  if (prop.proposalDate) {
    const parts = prop.proposalDate.split('-');
    if (parts.length >= 3) {
      day = parts[2];
      month = parts[1];
      year = parts[0];
    }
  }
  worksheet.getRow(6).height = 20;
  styleMergedRange(worksheet, 6, 1, 6, 8, `Ngày ${day} tháng ${month} năm ${year}`, fontItalic, alignCenter);

  // Row 7: Spacer
  worksheet.getRow(7).height = 10;

  // Row 8: Kính gửi
  worksheet.getRow(8).height = 22;
  styleMergedRange(worksheet, 8, 1, 8, 8, 'Kính gửi: Ông Tổng Giám Đốc Công Ty', fontBoldItalic, alignLeft);

  // Row 9: Họ tên & BP công tác
  worksheet.getRow(9).height = 22;
  const valA9 = {
    richText: [
      { text: ' Họ và tên: ', font: { name: 'Times New Roman', size: 11, bold: true } },
      { text: prop.requesterName || '...', font: { name: 'Times New Roman', size: 11, bold: false } }
    ]
  };
  styleMergedRange(worksheet, 9, 1, 9, 4, valA9, undefined, alignLeft);

  const bpCongTac = prop.notes && prop.notes.includes('BP') ? prop.notes : 'BP cung ứng gỗ';
  const valE9 = {
    richText: [
      { text: ' BP công tác: ', font: { name: 'Times New Roman', size: 11, bold: true } },
      { text: bpCongTac, font: { name: 'Times New Roman', size: 11, bold: false } }
    ]
  };
  styleMergedRange(worksheet, 9, 5, 9, 8, valE9, undefined, alignLeft);

  // Row 10: Nội dung thanh toán header
  worksheet.getRow(10).height = 20;
  styleMergedRange(worksheet, 10, 1, 10, 8, 'Nội dung thanh toán:', fontRegular, alignLeft);

  // Row 11: Tiền nhập gỗ keo xẻ của:
  worksheet.getRow(11).height = 22;
  const valA11 = {
    richText: [
      { text: ' Tiền nhập gỗ keo xẻ của:', font: { name: 'Times New Roman', size: 11, bold: true } }
    ]
  };
  styleMergedRange(worksheet, 11, 1, 11, 3, valA11, undefined, alignLeft);
  styleMergedRange(worksheet, 11, 4, 11, 8, prop.supplierName, fontRegular, alignLeft);

  // Row 12: Invoice / BBNT Detail
  worksheet.getRow(12).height = 22;
  const isInvoice = !!prop.invoiceId;
  const valA12 = {
    richText: [
      { text: isInvoice ? ' Theo Hóa đơn VAT số:' : ' Theo Biên bản số:', font: { name: 'Times New Roman', size: 11, bold: true } }
    ]
  };
  styleMergedRange(worksheet, 12, 1, 12, 3, valA12, undefined, alignLeft);

  let invoiceNoOrBbntNo = prop.bbntId || '...';
  if (prop.invoiceId) {
    const matchingInv = invoices.find(i => i.id === prop.invoiceId);
    invoiceNoOrBbntNo = matchingInv ? (matchingInv.symbol || matchingInv.invoiceNo) : prop.invoiceId.replace(/^inv-/, '');
  }

  let formattedDateVal = '...';
  if (prop.invoiceId) {
    const matchingInv = invoices.find(i => i.id === prop.invoiceId);
    if (matchingInv && matchingInv.invoiceDate) {
      formattedDateVal = matchingInv.invoiceDate.split('-').reverse().join('/');
    }
  } else {
    formattedDateVal = prop.proposalDate ? prop.proposalDate.split('-').reverse().join('/') : '...';
  }

  const valD12 = {
    richText: [
      { text: invoiceNoOrBbntNo + '   ', font: { name: 'Times New Roman', size: 11, bold: true } },
      { text: `(${isInvoice ? 'Ngày hóa đơn' : 'Ngày biên bản'}: ${formattedDateVal})`, font: { name: 'Times New Roman', size: 10, italic: true } }
    ]
  };
  styleMergedRange(worksheet, 12, 4, 12, 8, valD12, undefined, alignLeft);

  // Row 13: Số tiền
  worksheet.getRow(13).height = 22;
  const valA13 = {
    richText: [
      { text: ' Số tiền:', font: { name: 'Times New Roman', size: 11, bold: true } }
    ]
  };
  styleMergedRange(worksheet, 13, 1, 13, 3, valA13, undefined, alignLeft);

  const valD13 = {
    richText: [
      { text: prop.amount.toLocaleString('vi-VN'), font: { name: 'Times New Roman', size: 11, bold: true } },
      { text: ' đồng', font: { name: 'Times New Roman', size: 11, bold: false } }
    ]
  };
  styleMergedRange(worksheet, 13, 4, 13, 8, valD13, undefined, alignLeft);

  // Row 14: Viết bằng chữ
  worksheet.getRow(14).height = 24;
  const valA14 = {
    richText: [
      { text: ' Viết bằng chữ:', font: { name: 'Times New Roman', size: 11, bold: true } }
    ]
  };
  styleMergedRange(worksheet, 14, 1, 14, 3, valA14, undefined, alignLeft);
  styleMergedRange(worksheet, 14, 4, 14, 8, translateMoneyToWords(prop.amount), fontItalic, { ...alignLeft, wrapText: true });

  // Row 15: Kèm theo
  worksheet.getRow(15).height = 22;
  const valA15 = {
    richText: [
      { text: ' Kèm theo: ', font: { name: 'Times New Roman', size: 11, bold: true } },
      { text: '                 chứng từ gốc liên quan.', font: { name: 'Times New Roman', size: 11, bold: false } }
    ]
  };
  styleMergedRange(worksheet, 15, 1, 15, 8, valA15, undefined, alignLeft);

  // Row 16: Spacer
  worksheet.getRow(16).height = 12;

  // Row 17: Signatures Header
  worksheet.getRow(17).height = 20;
  styleMergedRange(worksheet, 17, 1, 17, 2, 'TL.Thủ trưởng đơn vị', fontBold, alignCenter);
  styleMergedRange(worksheet, 17, 3, 17, 4, 'Kế Toán Trưởng', fontBold, alignCenter);
  styleMergedRange(worksheet, 17, 5, 17, 6, 'Phụ trách bộ phận', fontBold, alignCenter);
  styleMergedRange(worksheet, 17, 7, 17, 8, 'Người đề nghị', fontBold, alignCenter);

  // Row 18: Signatures Subtitle
  worksheet.getRow(18).height = 18;
  styleMergedRange(worksheet, 18, 1, 18, 2, '(Ký, họ tên)', fontItalic, alignCenter);
  styleMergedRange(worksheet, 18, 3, 18, 4, '(Ký, họ tên)', fontItalic, alignCenter);
  styleMergedRange(worksheet, 18, 5, 18, 6, '(Ký, họ tên)', fontItalic, alignCenter);
  styleMergedRange(worksheet, 18, 7, 18, 8, '(Ký, họ tên)', fontItalic, alignCenter);

  // Row 19 & 20: Empty rows creating space for physical signing
  worksheet.getRow(19).height = 20;
  styleMergedRange(worksheet, 19, 1, 19, 2, '', fontRegular, alignCenter);
  styleMergedRange(worksheet, 19, 3, 19, 4, '', fontRegular, alignCenter);
  styleMergedRange(worksheet, 19, 5, 19, 6, '', fontRegular, alignCenter);
  styleMergedRange(worksheet, 19, 7, 19, 8, '', fontRegular, alignCenter);

  worksheet.getRow(20).height = 20;
  styleMergedRange(worksheet, 20, 1, 20, 2, '', fontRegular, alignCenter);
  styleMergedRange(worksheet, 20, 3, 20, 4, '', fontRegular, alignCenter);
  styleMergedRange(worksheet, 20, 5, 20, 6, '', fontRegular, alignCenter);
  styleMergedRange(worksheet, 20, 7, 20, 8, '', fontRegular, alignCenter);

  // Row 21: Requester Name
  worksheet.getRow(21).height = 22;
  styleMergedRange(worksheet, 21, 1, 21, 2, '', fontBoldItalic, alignCenter);
  styleMergedRange(worksheet, 21, 3, 21, 4, '', fontBoldItalic, alignCenter);
  styleMergedRange(worksheet, 21, 5, 21, 6, '', fontBoldItalic, alignCenter);
  styleMergedRange(worksheet, 21, 7, 21, 8, prop.requesterName, fontBoldItalic, alignCenter);

  // Trigger Excel file download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const aElement = document.createElement('a');
  aElement.href = url;
  const safeFilename = `De_Nghi_Thanh_Toan_${prop.proposalNo || prop.id}.xlsx`.replace(/[\s\/:\*\?"<>\|]/g, '_');
  aElement.download = safeFilename;
  aElement.click();
  window.URL.revokeObjectURL(url);
}

