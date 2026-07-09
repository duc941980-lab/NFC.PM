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
  // Create workbook & worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Phieu nghiem thu QC");

  // Ensure grid lines are visible in Microsoft Excel
  worksheet.views = [{ showGridLines: true }];

  // Column width configurations
  worksheet.columns = [
    { key: 'A', width: 6 },   // TT
    { key: 'B', width: 30 },  // Quy cách kích thước (mm)
    { key: 'C', width: 14 },  // Đơn vị tính
    { key: 'D', width: 14 },  // K. lượng nguyên thủy / Tỉ lệ %
    { key: 'E', width: 22 },  // K. lượng nhập kho
    { key: 'F', width: 30 },  // Ghi chú
  ];

  // Common styles in Times New Roman for ultimate professional print layout
  const fontRegular = { name: 'Times New Roman', size: 11, bold: false, italic: false };
  const fontBold = { name: 'Times New Roman', size: 11, bold: true, italic: false };
  const fontItalicVal = { name: 'Times New Roman', size: 11, italic: true };
  const fontBoldItalicVal = { name: 'Times New Roman', size: 11, bold: true, italic: true };
  const fontRedBold = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFF0000' }, italic: false };
  const fontRedBoldItalic = { name: 'Times New Roman', size: 11, bold: true, italic: true, color: { argb: 'FFFF0000' } };

  const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'center' as const };
  const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'left' as const };
  const alignRight: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'right' as const };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } }
  };

  // -------------------------------------------------------------
  // 1. HEADER BLOCK (Rows 1 & 2)
  // -------------------------------------------------------------
  worksheet.mergeCells('A1:B2');
  worksheet.mergeCells('C1:E1');
  worksheet.mergeCells('C2:E2');

  const cellLogo = worksheet.getCell('A1');
  cellLogo.value = {
    richText: [
      { text: 'NFC\n', font: { name: 'Arial Black', size: 22, bold: true, italic: true, color: { argb: 'FF0D733E' } } },
      { text: ' NAFOCO', font: { name: 'Arial', size: 8, bold: true, italic: true, color: { argb: 'FF0D733E' } } }
    ]
  };
  cellLogo.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  const cellProcName = worksheet.getCell('C1');
  cellProcName.value = 'QUY TRÌNH KIỂM HÀNG ĐẦU VÀO';
  cellProcName.font = { name: 'Times New Roman', size: 12, bold: true };
  cellProcName.alignment = alignCenter;

  const cellDocName = worksheet.getCell('C2');
  cellDocName.value = 'BIÊN BẢN NGHIỆM THU GỖ KEO XẺ THÔ';
  cellDocName.font = { name: 'Times New Roman', size: 13, bold: true };
  cellDocName.alignment = alignCenter;

  const cellDocCode = worksheet.getCell('F1');
  cellDocCode.value = `Mã số: ${meta?.maSo || 'BM01/QT01/QLCL1'}`;
  cellDocCode.font = { name: 'Times New Roman', size: 9, bold: false };
  cellDocCode.alignment = alignLeft;

  const cellDocMeta = worksheet.getCell('F2');
  cellDocMeta.value = `Lần ban hành: ${meta?.lanBanHanh || '07'}\nNgày ban hành: ${meta?.ngayBanHanh || '15/04/2023'}`;
  cellDocMeta.font = { name: 'Times New Roman', size: 9, bold: false };
  cellDocMeta.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  // Apply borders for the header cells
  applyBorderToRange(worksheet, 'A1', 'B2', thinBorder);
  applyBorderToRange(worksheet, 'C1', 'E1', thinBorder);
  applyBorderToRange(worksheet, 'C2', 'E2', thinBorder);
  worksheet.getCell('F1').border = thinBorder;
  worksheet.getCell('F2').border = thinBorder;

  worksheet.getRow(1).height = 36;
  worksheet.getRow(2).height = 32;

  // -------------------------------------------------------------
  // 2. DETAILED MEMBERS & SUPPLIER BLOCK (Rows 3 to 6)
  // -------------------------------------------------------------
  worksheet.mergeCells('A3:B3');
  const hTP = worksheet.getCell('A3');
  hTP.value = 'Thành Phần';
  hTP.font = fontBold;
  hTP.alignment = alignCenter;

  const hCV = worksheet.getCell('C3');
  hCV.value = 'Chức vụ';
  hCV.font = fontBold;
  hCV.alignment = alignCenter;

  worksheet.mergeCells('D3:E3');
  const hNCC = worksheet.getCell('D3');
  hNCC.value = 'Đơn vị cung ứng';
  hNCC.font = fontBold;
  hNCC.alignment = alignCenter;

  const hHS = worksheet.getCell('F3');
  hHS.value = bb.ma_bbnt ? `BBNT số: ${bb.ma_bbnt}` : 'BBNT số: GB 06.06';
  hHS.font = fontBold;
  hHS.alignment = alignLeft;

  applyBorderToRange(worksheet, 'A3', 'B3', thinBorder);
  hCV.border = thinBorder;
  applyBorderToRange(worksheet, 'D3', 'E3', thinBorder);
  hHS.border = thinBorder;
  worksheet.getRow(3).height = 24;

  const displayMembers: any[] = [];
  const listTP = bb.thanh_phan || [];

  // Always generate exactly 3 rows of members to match the template image precisely
  for (let i = 0; i < 3; i++) {
    const tp = listTP[i];
    if (i === 0) {
      displayMembers.push({
        ho_ten: tp?.ho_ten || bb.nguoi_ky_nguoi_lap || "Ngô Văn Trường",
        chuc_vu: tp?.chuc_vu || "Người lập"
      });
    } else if (i === 1) {
      displayMembers.push({
        ho_ten: tp?.ho_ten || bb.nguoi_ky_tp_pqlcl || "Đặng Văn Tùng",
        chuc_vu: tp?.chuc_vu || "QCQLCL1"
      });
    } else {
      displayMembers.push({
        ho_ten: tp?.ho_ten || bb.nguoi_ky_thu_kho || "Trần Ngọc Ánh",
        chuc_vu: tp?.chuc_vu || "Thủ kho gỗ"
      });
    }
  }

  // Format date with dot separators to match the image exactly, e.g. "10.06.2026"
  const dateFormatted = bb.ngay_nt 
    ? bb.ngay_nt.split('-').reverse().join('.') 
    : "10.06.2026";

  const memberStartRow = 4;
  displayMembers.forEach((m, idx) => {
    const rowNum = memberStartRow + idx;
    worksheet.getRow(rowNum).height = 22;

    const cellA = worksheet.getCell(`A${rowNum}`);
    cellA.value = idx + 1;
    cellA.font = fontRegular;
    cellA.alignment = alignCenter;
    cellA.border = thinBorder;

    const cellB = worksheet.getCell(`B${rowNum}`);
    cellB.value = m.ho_ten;
    cellB.font = fontBold;
    cellB.alignment = alignLeft;
    cellB.border = thinBorder;

    const cellC = worksheet.getCell(`C${rowNum}`);
    cellC.value = m.chuc_vu;
    cellC.font = fontRegular;
    cellC.alignment = alignLeft;
    cellC.border = thinBorder;

    const cellF = worksheet.getCell(`F${rowNum}`);
    if (idx === 0) {
      cellF.value = `Ngày NT: ${dateFormatted}`;
      cellF.font = fontBold;
    } else {
      cellF.value = "";
    }
    cellF.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cellF.border = thinBorder;
  });

  const memberEndRow = memberStartRow + displayMembers.length - 1; // Row 6

  // Merge supplier block over Rows 4, 5, 6
  worksheet.mergeCells(`D4:E${memberEndRow}`);
  const supplierCell = worksheet.getCell('D4');
  let supplierValue = bb.don_vi_cung_ung || 'CTY TNHH SXTM Gia Bảo';
  supplierCell.value = supplierValue;
  supplierCell.font = { name: 'Times New Roman', size: 12, bold: true };
  supplierCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  applyBorderToRange(worksheet, 'D4', `E${memberEndRow}`, thinBorder);

  // Merge date block over Rows 4, 5, 6
  worksheet.mergeCells(`F4:F${memberEndRow}`);
  const dateCell = worksheet.getCell('F4');
  dateCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  applyBorderToRange(worksheet, 'F4', `F${memberEndRow}`, thinBorder);

  // -------------------------------------------------------------
  // 3. WOOD DETAILS & ENVIRONMENTAL STATUS (Rows 7, 8, 9)
  // -------------------------------------------------------------
  const row7 = memberEndRow + 1; // Row 7
  worksheet.getRow(row7).height = 24;

  // A7:C7 merged for Wood Type
  worksheet.mergeCells(`A${row7}:C${row7}`);
  const cellWoodType = worksheet.getCell(`A${row7}`);
  cellWoodType.value = {
    richText: [
      { text: 'Tên - chủng loại gỗ: ', font: fontBold },
      { text: 'GỖ KEO RỪNG TRỒNG', font: fontBold }
    ]
  };
  cellWoodType.alignment = alignLeft;
  applyBorderToRange(worksheet, `A${row7}`, `C${row7}`, thinBorder);

  // D7:F7 merged for Location
  worksheet.mergeCells(`D${row7}:F${row7}`);
  const cellLoc = worksheet.getCell(`D${row7}`);
  cellLoc.value = {
    richText: [
      { text: 'Địa điểm nhập: ', font: fontBold },
      { text: bb.dia_diem_nhap || 'NMSX đồ gỗ nội thất Xuất Khẩu', font: fontRegular }
    ]
  };
  cellLoc.alignment = alignLeft;
  applyBorderToRange(worksheet, `D${row7}`, `F${row7}`, thinBorder);

  // Row 8: Sub-title wood details
  const row8 = row7 + 1; // Row 8
  worksheet.getRow(row8).height = 24;
  worksheet.mergeCells(`A${row8}:F${row8}`);
  const cellSubGo = worksheet.getCell(`A${row8}`);
  const subGoVal = (bb.loai_go || 'gỗ keo xẻ thô').trim().replace(/\s+/g, ' ');
  cellSubGo.value = `Gỗ sơ chế thông thường - ${subGoVal}`;
  cellSubGo.font = fontBold;
  cellSubGo.alignment = alignCenter;
  applyBorderToRange(worksheet, `A${row8}`, `F${row8}`, thinBorder);

  // Row 9: FSC Environmental status checkboxes
  const row9 = row8 + 1; // Row 9
  worksheet.getRow(row9).height = 24;
  worksheet.mergeCells(`A${row9}:F${row9}`);
  const cellEnv = worksheet.getCell(`A${row9}`);

  const fscText = bb.chung_chi_fsc || '';
  const checkF100 = fscText.includes('100') ? 'v' : ' ';
  const checkFMix = fscText.toLowerCase().includes('mix') ? 'v' : ' ';
  const checkFCw = fscText.toLowerCase().includes('cw') ? 'v' : ' ';
  const checkKls = (!fscText || fscText.toUpperCase() === 'KLS' || fscText.toUpperCase() === 'V' || fscText.toUpperCase() === 'X') ? 'v' : ' ';

  cellEnv.value = {
    richText: [
      { text: 'Trạng thái môi trường:      ', font: fontBold },
      { text: 'FSC 100% ', font: fontRegular },
      { text: `[ ${checkF100} ]          `, font: fontBold },
      { text: 'FSC Mix ', font: fontRegular },
      { text: `[ ${checkFMix} ]          `, font: fontBold },
      { text: 'FSC CW ', font: fontRegular },
      { text: `[ ${checkFCw} ]          `, font: fontBold },
      { text: 'KLS ', font: fontRegular },
      { text: `[ ${checkKls} ]`, font: fontBold }
    ]
  };
  cellEnv.alignment = alignLeft;
  applyBorderToRange(worksheet, `A${row9}`, `F${row9}`, thinBorder);

  // -------------------------------------------------------------
  // 4. PART A: TOTAL QUANTITY IMPORT TABLE
  // -------------------------------------------------------------
  const partATitleRow = row9 + 1;
  worksheet.getRow(partATitleRow).height = 24;
  worksheet.mergeCells(`A${partATitleRow}:F${partATitleRow}`);
  const cellPartATitle = worksheet.getCell(`A${partATitleRow}`);
  cellPartATitle.value = 'A. Tông khôi lượng giao nhận'; // exact label to match screen / model
  cellPartATitle.font = fontBold;
  cellPartATitle.alignment = alignLeft;

  const partAHeaderRow = partATitleRow + 1;
  worksheet.getRow(partAHeaderRow).height = 24;

  const hA_tt = worksheet.getCell(`A${partAHeaderRow}`);
  hA_tt.value = 'TT';
  hA_tt.font = fontBold;
  hA_tt.alignment = alignCenter;
  hA_tt.border = thinBorder;

  const hA_dims = worksheet.getCell(`B${partAHeaderRow}`);
  hA_dims.value = 'Quy cách kích thước (mm)';
  hA_dims.font = fontBold;
  hA_dims.alignment = alignCenter;
  hA_dims.border = thinBorder;

  const hA_dvt = worksheet.getCell(`C${partAHeaderRow}`);
  hA_dvt.value = 'Đơn vị tính';
  hA_dvt.font = fontBold;
  hA_dvt.alignment = alignCenter;
  hA_dvt.border = thinBorder;

  worksheet.mergeCells(`D${partAHeaderRow}:F${partAHeaderRow}`);
  const hA_vol = worksheet.getCell(`D${partAHeaderRow}`);
  hA_vol.value = 'Khối lượng (m3)';
  hA_vol.font = fontBold;
  hA_vol.alignment = alignCenter;
  applyBorderToRange(worksheet, `D${partAHeaderRow}`, `F${partAHeaderRow}`, thinBorder);

  let cursorRow = partAHeaderRow + 1;
  const listA = bb.quy_cach_a || [];
  listA.forEach((row, idx) => {
    worksheet.getRow(cursorRow).height = 22;

    const cellTT = worksheet.getCell(`A${cursorRow}`);
    cellTT.value = idx + 1;
    cellTT.font = fontRegular;
    cellTT.alignment = alignCenter;
    cellTT.border = thinBorder;

    const cellSize = worksheet.getCell(`B${cursorRow}`);
    cellSize.value = (row.kich_thuoc_mm || '').replace(/×/g, 'x');
    cellSize.font = fontRegular;
    cellSize.alignment = alignCenter;
    cellSize.border = thinBorder;

    const cellDvt = worksheet.getCell(`C${cursorRow}`);
    cellDvt.value = 'm3';
    cellDvt.font = fontRegular;
    cellDvt.alignment = alignCenter;
    cellDvt.border = thinBorder;

    worksheet.mergeCells(`D${cursorRow}:F${cursorRow}`);
    const cellVol = worksheet.getCell(`D${cursorRow}`);
    const valVol = Number(row.kl_nguyen_thuy);
    cellVol.value = valVol;
    cellVol.numFmt = '#,##0.###';
    cellVol.font = fontRegular;
    cellVol.alignment = alignRight;
    applyBorderToRange(worksheet, `D${cursorRow}`, `F${cursorRow}`, thinBorder);

    cursorRow++;
  });

  // Cộng Part A
  const congRowA = cursorRow;
  worksheet.getRow(congRowA).height = 24;
  worksheet.mergeCells(`A${congRowA}:C${congRowA}`);
  const cellCongLabelA = worksheet.getCell(`A${congRowA}`);
  cellCongLabelA.value = 'Cộng';
  cellCongLabelA.font = fontBold;
  cellCongLabelA.alignment = alignCenter;
  applyBorderToRange(worksheet, `A${congRowA}`, `C${congRowA}`, thinBorder);

  worksheet.mergeCells(`D${congRowA}:F${congRowA}`);
  const cellCongValA = worksheet.getCell(`D${congRowA}`);
  const totalVolA = listA.reduce((sum, curr) => sum + curr.kl_nguyen_thuy, 0);
  const valTotalVolA = Number(totalVolA);
  cellCongValA.value = valTotalVolA;
  cellCongValA.numFmt = '#,##0.###';
  cellCongValA.font = fontBold;
  cellCongValA.alignment = alignRight;
  applyBorderToRange(worksheet, `D${congRowA}`, `F${congRowA}`, thinBorder);

  cursorRow++;

  // -------------------------------------------------------------
  // 5. PART B: ACTUAL RECEIVED QUANTITY AFTER GRADING
  // -------------------------------------------------------------
  const partBTitleRow = cursorRow;
  worksheet.getRow(partBTitleRow).height = 24;
  worksheet.mergeCells(`A${partBTitleRow}:F${partBTitleRow}`);
  const cellPartBTitle = worksheet.getCell(`A${partBTitleRow}`);
  cellPartBTitle.value = 'B. Kết luận khối lượng gỗ thực tế nhập kho';
  cellPartBTitle.font = fontBold;
  cellPartBTitle.alignment = alignLeft;

  const partBHeaderRow = partBTitleRow + 1;
  worksheet.getRow(partBHeaderRow).height = 24;

  const headersB = [
    { c: 'A', v: 'TT' },
    { c: 'B', v: 'Quy cách kích thước' },
    { c: 'C', v: 'K. Lượng nguyên thuỷ' },
    { c: 'D', v: 'Ti lệ %' },
    { c: 'E', v: 'K. Lượng nhập kho' },
    { c: 'F', v: 'Ghi chú' }
  ];

  headersB.forEach(h => {
    const cell = worksheet.getCell(`${h.c}${partBHeaderRow}`);
    cell.value = h.v;
    cell.font = fontBold;
    cell.alignment = alignCenter;
    cell.border = thinBorder;
  });

  cursorRow = partBHeaderRow + 1;
  const listB = bb.quy_cach_b || [];
  let runningIdxB = 1;

  listB.forEach(row => {
    const rowA = listA.find(a => a.id === row.id) || { kl_nguyen_thuy: 0 };
    const hasParts = row.co_phan_loai && row.chi_tiet && row.chi_tiet.length > 0;

    if (!hasParts) {
      worksheet.getRow(cursorRow).height = 22;

      const c1 = worksheet.getCell(`A${cursorRow}`);
      c1.value = runningIdxB++;
      c1.font = fontRegular;
      c1.alignment = alignCenter;
      c1.border = thinBorder;

      const c2 = worksheet.getCell(`B${cursorRow}`);
      c2.value = row.kich_thuoc_mm;
      c2.font = fontRegular;
      c2.alignment = alignCenter;
      c2.border = thinBorder;

      const c3 = worksheet.getCell(`C${cursorRow}`);
      const valC3 = Number(rowA.kl_nguyen_thuy);
      c3.value = valC3;
      c3.numFmt = '#,##0.###';
      c3.font = fontRegular;
      c3.alignment = alignRight;
      c3.border = thinBorder;

      const c4 = worksheet.getCell(`D${cursorRow}`);
      const valC4 = 100;
      c4.value = valC4;
      c4.numFmt = '0';
      c4.font = fontRegular;
      c4.alignment = alignCenter;
      c4.border = thinBorder;

      const c5 = worksheet.getCell(`E${cursorRow}`);
      const valC5 = Number(rowA.kl_nguyen_thuy);
      c5.value = valC5;
      c5.numFmt = '#,##0.###';
      c5.font = fontRegular;
      c5.alignment = alignRight;
      c5.border = thinBorder;

      const c6 = worksheet.getCell(`F${cursorRow}`);
      c6.value = row.ghi_chu || '';
      c6.font = fontRegular;
      c6.alignment = alignLeft;
      c6.border = thinBorder;

      cursorRow++;
    } else {
      // Group with grades
      worksheet.getRow(cursorRow).height = 22;

      const c1 = worksheet.getCell(`A${cursorRow}`);
      c1.value = runningIdxB++;
      c1.font = fontRegular;
      c1.alignment = alignCenter;
      c1.border = thinBorder;

      const c2 = worksheet.getCell(`B${cursorRow}`);
      c2.value = row.kich_thuoc_mm;
      c2.font = fontRegular;
      c2.alignment = alignCenter;
      c2.border = thinBorder;

      const c3 = worksheet.getCell(`C${cursorRow}`);
      const valC3Group = Number(rowA.kl_nguyen_thuy);
      c3.value = valC3Group;
      c3.numFmt = '#,##0.###';
      c3.font = fontRegular;
      c3.alignment = alignRight;
      c3.border = thinBorder;

      const c4 = worksheet.getCell(`D${cursorRow}`);
      c4.value = '';
      c4.border = thinBorder;

      const c5 = worksheet.getCell(`E${cursorRow}`);
      c5.value = '';
      c5.border = thinBorder;

      const c6 = worksheet.getCell(`F${cursorRow}`);
      c6.value = row.ghi_chu || '';
      c6.font = fontRegular;
      c6.alignment = alignLeft;
      c6.border = thinBorder;

      cursorRow++;

      // Grade parts rows
      row.chi_tiet?.forEach(child => {
        worksheet.getRow(cursorRow).height = 22;

        const sc1 = worksheet.getCell(`A${cursorRow}`);
        sc1.value = '';
        sc1.border = thinBorder;

        const sc2 = worksheet.getCell(`B${cursorRow}`);
        sc2.value = child.ten_loai;
        sc2.font = fontRegular;
        sc2.alignment = alignLeft;
        sc2.border = thinBorder;

        const sc3 = worksheet.getCell(`C${cursorRow}`);
        sc3.value = '';
        sc3.border = thinBorder;

        const sc4 = worksheet.getCell(`D${cursorRow}`);
        const valSc4 = Number(child.ti_le);
        sc4.value = valSc4;
        sc4.numFmt = valSc4 % 1 === 0 ? '0' : '0.0';
        sc4.font = fontRegular;
        sc4.alignment = alignCenter;
        sc4.border = thinBorder;

        const sc5 = worksheet.getCell(`E${cursorRow}`);
        const valSc5 = Number(child.kl_nhap_kho);
        sc5.value = valSc5;
        sc5.numFmt = '#,##0.###';
        sc5.font = fontRegular;
        sc5.alignment = alignRight;
        sc5.border = thinBorder;

        const sc6 = worksheet.getCell(`F${cursorRow}`);
        sc6.value = child.ghi_chu || '';
        sc6.font = fontRegular;
        sc6.alignment = alignLeft;
        sc6.border = thinBorder;

        cursorRow++;
      });
    }
  });

  // Cộng Part B with RED styling matching target image exactly
  const congRowB = cursorRow;
  worksheet.getRow(congRowB).height = 24;

  worksheet.mergeCells(`A${congRowB}:B${congRowB}`);
  const cellCongLabelB = worksheet.getCell(`A${congRowB}`);
  cellCongLabelB.value = 'Cộng';
  cellCongLabelB.font = fontBold;
  cellCongLabelB.alignment = alignCenter;
  applyBorderToRange(worksheet, `A${congRowB}`, `B${congRowB}`, thinBorder);

  // Red and bold total original volume column
  const cellTotalVolB_orig = worksheet.getCell(`C${congRowB}`);
  const valTotalVolB_orig = Number(totalVolA);
  cellTotalVolB_orig.value = valTotalVolB_orig;
  cellTotalVolB_orig.numFmt = '#,##0.###';
  cellTotalVolB_orig.font = fontBold;
  cellTotalVolB_orig.alignment = alignRight;
  cellTotalVolB_orig.border = thinBorder;

  const cellHyphenB = worksheet.getCell(`D${congRowB}`);
  cellHyphenB.value = '';
  cellHyphenB.border = thinBorder;

  // Red and bold total received volume column
  const cellTotalVolB_received = worksheet.getCell(`E${congRowB}`);
  const totalVolB_rec = listB.reduce((sum, r) => {
    if (r.co_phan_loai && r.chi_tiet && r.chi_tiet.length > 0) {
      return sum + r.chi_tiet.reduce((s, c) => s + c.kl_nhap_kho, 0);
    }
    const rowA = listA.find(a => a.id === r.id);
    return sum + (rowA ? rowA.kl_nguyen_thuy : r.kl_tong);
  }, 0);
  const valTotalVolB_rec = Number(totalVolB_rec);
  cellTotalVolB_received.value = valTotalVolB_rec;
  cellTotalVolB_received.numFmt = '#,##0.###';
  cellTotalVolB_received.font = fontBold;
  cellTotalVolB_received.alignment = alignRight;
  cellTotalVolB_received.border = thinBorder;

  const cellNoteB = worksheet.getCell(`F${congRowB}`);
  cellNoteB.value = '';
  cellNoteB.border = thinBorder;

  cursorRow++;

  // Spelling Row
  const spellingRow = cursorRow;
  worksheet.getRow(spellingRow).height = 26;
  worksheet.mergeCells(`A${spellingRow}:F${spellingRow}`);
  const cellSpelling = worksheet.getCell(`A${spellingRow}`);
  cellSpelling.value = {
    richText: [
      { text: 'Bằng chữ: ', font: fontBold },
      { text: `${numberToVietnameseWords(totalVolB_rec, false)} ./.`, font: fontBoldItalicVal }
    ]
  };
  cellSpelling.alignment = alignCenter;
  applyBorderToRange(worksheet, `A${spellingRow}`, `F${spellingRow}`, thinBorder);

  cursorRow++;

  // -------------------------------------------------------------
  // 6. CONCLUSION C BLOCK
  // -------------------------------------------------------------
  const conclRow = cursorRow;
  worksheet.getRow(conclRow).height = 28;
  worksheet.mergeCells(`A${conclRow}:F${conclRow}`);
  const cellConcl = worksheet.getCell(`A${conclRow}`);

  const isDNTValue = bb.ket_luan === 'Đạt' ? 'v' : ' ';
  const isKDNTValue = bb.ket_luan !== 'Đạt' ? 'v' : ' ';

  cellConcl.value = {
    richText: [
      { text: 'C. Kết luận chung lô hàng:   ', font: fontBold },
      { text: 'Đạt yêu cầu nhập kho  ', font: fontBold },
      { text: `[ ${isDNTValue} ]      `, font: fontBold },
      { text: 'Không đạt yêu cầu nhập kho  ', font: fontBold },
      { text: `[ ${isKDNTValue} ]`, font: fontBold }
    ]
  };
  cellConcl.alignment = alignCenter;
  applyBorderToRange(worksheet, `A${conclRow}`, `F${conclRow}`, thinBorder);

  cursorRow++;

  // -------------------------------------------------------------
  // 7. SIGNATURES SECTION
  // -------------------------------------------------------------
  const sigTitleRow = cursorRow + 1; // leave 1 row blank
  worksheet.getRow(sigTitleRow).height = 24;

  const roles = [
    { col: 'A', name: 'Phó TGĐ' },
    { col: 'B', name: 'TP. PQLCL 1' },
    { col: 'C', name: 'Thủ kho' },
    { col: 'DF', name: 'Đại diện ĐV cung ứng' }, // merge D & E
    { col: 'F', name: 'Người lập' }
  ];

  roles.forEach(r => {
    if (r.col === 'DF') {
      worksheet.mergeCells(`D${sigTitleRow}:E${sigTitleRow}`);
      const cell = worksheet.getCell(`D${sigTitleRow}`);
      cell.value = r.name;
      cell.font = fontBold;
      cell.alignment = alignCenter;
    } else {
      const cell = worksheet.getCell(`${r.col}${sigTitleRow}`);
      cell.value = r.name;
      cell.font = fontBold;
      cell.alignment = alignCenter;
    }
  });

  // Space for physical signatures
  const sigNameRow = sigTitleRow + 5;
  worksheet.getRow(sigNameRow).height = 24;

  // Render ONLY the creator name at the bottom of column F (matching image template exactly)
  const cellCreatorName = worksheet.getCell(`F${sigNameRow}`);
  cellCreatorName.value = bb.nguoi_ky_nguoi_lap || 'Ngô Văn Trường';
  cellCreatorName.font = fontBoldItalicVal;
  cellCreatorName.alignment = alignCenter;

  // Output as File Download
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
  // Template: Bảng chi tiết thanh toán - khớp mẫu Thanhtoan.GB01.xlsx
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Chi tiết thanh toán");

  worksheet.views = [{ showGridLines: true }];
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.35,
      bottom: 0.35,
      header: 0.15,
      footer: 0.15,
    },
  };

  const fontRegular = { name: 'Times New Roman', size: 11, bold: false };
  const fontBold = { name: 'Times New Roman', size: 11, bold: true };
  const fontItalic = { name: 'Times New Roman', size: 11, italic: true };
  const fontHeader = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontTitle = { name: 'Times New Roman', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontSign = { name: 'Times New Roman', size: 11, bold: true };
  const fontSignName = { name: 'Times New Roman', size: 11, bold: true, italic: true };

  const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'center' as const };
  const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'left' as const };
  const alignRight: Partial<ExcelJS.Alignment> = { vertical: 'middle' as const, horizontal: 'right' as const };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } }
  };

  const greenFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF145D32' } };
  const lightGreenFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD9FBE5' } };
  const lightGrayFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF8FAFC' } };
  const lightPeachFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF7ED' } };

  const formatVietnameseLongDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const raw = dateStr.trim();
    let d = 0, m = 0, y = 0;
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(raw)) {
      const parts = raw.split('T')[0].split('-');
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      d = parseInt(parts[2], 10);
    } else if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(raw)) {
      const parts = raw.split(/[\/.-]/);
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    }
    if (!d || !m || !y) return raw;
    return `Ngày ${d} tháng ${m} năm ${y}`;
  };

  worksheet.columns = [
    { key: 'A', width: 8 },   // STT
    { key: 'B', width: 28 },  // Tên hàng
    { key: 'C', width: 12 },
    { key: 'D', width: 10 },  // Đvt
    { key: 'E', width: 16 },  // KL
    { key: 'F', width: 18 },  // Đơn giá
    { key: 'G', width: 20 },  // Thành tiền
  ];

  // -------------------------------------------------------------
  // 1. Header giống mẫu
  // -------------------------------------------------------------
  worksheet.getRow(1).height = 34;
  worksheet.mergeCells('E1:E1');
  worksheet.mergeCells('F1:G1');

  const soLabel = worksheet.getCell('E1');
  soLabel.value = 'SỐ:';
  soLabel.font = { name: 'Times New Roman', size: 16, bold: true };
  soLabel.alignment = alignCenter;
  soLabel.fill = lightGrayFill;

  const soValue = worksheet.getCell('F1');
  soValue.value = bb.ma_bbnt || 'GB01';
  soValue.font = { name: 'Times New Roman', size: 16, bold: true };
  soValue.alignment = alignCenter;
  soValue.fill = lightGrayFill;

  applyBorderToRange(worksheet, 'E1', 'G1', thinBorder);

  worksheet.getRow(2).height = 22;
  worksheet.mergeCells('A2:G2');
  const dateTitleCell = worksheet.getCell('A2');
  dateTitleCell.value = formatVietnameseLongDate(meta?.ngayThanhToan || bb.ngay_nt);
  dateTitleCell.font = { name: 'Times New Roman', size: 11, bold: true };
  dateTitleCell.alignment = alignCenter;
  applyBorderToRange(worksheet, 'A2', 'G2', thinBorder);

  worksheet.getRow(3).height = 30;
  worksheet.mergeCells('A3:G3');
  const titleCell = worksheet.getCell('A3');
  titleCell.value = meta?.bienBanTitle || 'BẢNG CHI TIẾT THANH TOÁN';
  titleCell.font = fontTitle;
  titleCell.alignment = alignCenter;
  titleCell.fill = greenFill;
  applyBorderToRange(worksheet, 'A3', 'G3', thinBorder);

  const cleanPaymentWoodName = (value?: string) => {
    const raw = (value || '').trim();
    if (!raw) return 'gỗ keo xẻ thô';
    return raw
      .replace(/^Gỗ\s+sơ\s+chế\s+thông\s+thường\s*-\s*/i, '')
      .trim();
  };
  const loaiGo = cleanPaymentWoodName(bb.loai_go || 'gỗ keo xẻ thô');
  const hopDongText = bb.so_hop_dong
    ? ` theo HĐ số: ${bb.so_hop_dong}${bb.ngay_hop_dong ? ` ngày ${bb.ngay_hop_dong}` : ''}`
    : '';
  const paymentDescription = `Gỗ sơ chế thông thường - ${loaiGo}${hopDongText}`;

  // Row 4 intentionally left blank to match the official payment template.
  // Contract/payment description is shown only once in the green detail row below the table header.
  worksheet.getRow(4).height = 22;
  worksheet.mergeCells('A4:G4');

  // -------------------------------------------------------------
  // 2. Ledger header
  // -------------------------------------------------------------
  worksheet.getRow(5).height = 28;
  const headerCells = [
    { cell: 'A5', value: 'STT' },
    { cell: 'D5', value: 'Đvt' },
    { cell: 'E5', value: 'KL' },
    { cell: 'F5', value: 'Đơn giá' },
    { cell: 'G5', value: 'Thành tiền' },
  ];

  worksheet.mergeCells('B5:C5');
  const tenHangHeader = worksheet.getCell('B5');
  tenHangHeader.value = 'Tên hàng';
  tenHangHeader.font = fontHeader;
  tenHangHeader.alignment = alignCenter;
  tenHangHeader.fill = greenFill;

  headerCells.forEach(h => {
    const cell = worksheet.getCell(h.cell);
    cell.value = h.value;
    cell.font = fontHeader;
    cell.alignment = alignCenter;
    cell.fill = greenFill;
  });
  applyBorderToRange(worksheet, 'A5', 'G5', thinBorder);

  // -------------------------------------------------------------
  // 3. Description row
  // -------------------------------------------------------------
  worksheet.getRow(6).height = 30;
  worksheet.mergeCells('B6:G6');
  const descCell = worksheet.getCell('B6');
  descCell.value = paymentDescription;
  descCell.font = fontItalic;
  descCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  descCell.fill = lightGreenFill;
  worksheet.getCell('A6').fill = lightGreenFill;
  applyBorderToRange(worksheet, 'A6', 'G6', thinBorder);

  // -------------------------------------------------------------
  // 4. Ledger rows
  // -------------------------------------------------------------
  const isTransportPaymentRow = (row: any) => {
    const tenHang = (row?.ten_hang || '').trim().toLowerCase();
    const phanHang = (row?.phan_hang || '').trim().toLowerCase();
    return tenHang.startsWith('cước vc') || phanHang.startsWith('vc ');
  };

  const isSubPaymentRow = (tenHang?: string) => {
    const norm = (tenHang || '').trim().toLowerCase();
    return norm.startsWith('loại 2') || norm.startsWith('loại 3') || norm === 'loại tận dụng' || norm.startsWith('tấm') || norm.startsWith('l2') || norm.startsWith('l3');
  };

  const paymentRows = (bb.bang_thanh_toan || []).filter(row => !isTransportPaymentRow(row));
  let rowIdx = 7;
  let runningStt = 1;

  paymentRows.forEach((p, idx) => {
    worksheet.getRow(rowIdx).height = 30;
    worksheet.mergeCells(rowIdx, 2, rowIdx, 3);

    const isSub = isSubPaymentRow(p.ten_hang);

    const cellTT = worksheet.getCell(rowIdx, 1);
    cellTT.value = isSub ? '' : runningStt++;
    cellTT.font = fontRegular;
    cellTT.alignment = alignCenter;

    const cellName = worksheet.getCell(rowIdx, 2);
    cellName.value = p.ten_hang || '';
    cellName.font = fontRegular;
    cellName.alignment = alignCenter;

    const cellDvt = worksheet.getCell(rowIdx, 4);
    cellDvt.value = isSub ? '"' : (p.dvt || 'm3');
    cellDvt.font = fontRegular;
    cellDvt.alignment = alignCenter;

    const cellKl = worksheet.getCell(rowIdx, 5);
    cellKl.value = Number(p.kl || 0);
    cellKl.numFmt = '#,##0.###';
    cellKl.font = fontRegular;
    cellKl.alignment = alignRight;

    const cellDonGia = worksheet.getCell(rowIdx, 6);
    cellDonGia.value = Number(p.don_gia_tong || p.don_gia || 0);
    cellDonGia.numFmt = '#,##0';
    cellDonGia.font = fontRegular;
    cellDonGia.alignment = alignRight;

    const cellThanhTien = worksheet.getCell(rowIdx, 7);
    cellThanhTien.value = Number(p.thanh_tien || 0);
    cellThanhTien.numFmt = '#,##0';
    cellThanhTien.font = fontRegular;
    cellThanhTien.alignment = alignRight;

    applyBorderToRange(worksheet, `A${rowIdx}`, `G${rowIdx}`, thinBorder);
    rowIdx++;
  });

  // -------------------------------------------------------------
  // 5. Total row
  // -------------------------------------------------------------
  const totalVolume = paymentRows.reduce((sum, r) => sum + Number(r.kl || 0), 0);
  const finalGrandTotal = paymentRows.reduce((sum, r) => sum + Number(r.thanh_tien || 0), 0);

  worksheet.getRow(rowIdx).height = 32;
  worksheet.mergeCells(rowIdx, 2, rowIdx, 4);

  worksheet.getCell(rowIdx, 1).value = '';
  worksheet.getCell(rowIdx, 2).value = 'Cộng';
  worksheet.getCell(rowIdx, 2).font = { name: 'Times New Roman', size: 12, bold: true };
  worksheet.getCell(rowIdx, 2).alignment = alignCenter;

  worksheet.getCell(rowIdx, 5).value = Number(totalVolume);
  worksheet.getCell(rowIdx, 5).numFmt = '#,##0.###';
  worksheet.getCell(rowIdx, 5).font = { name: 'Times New Roman', size: 12, bold: true };
  worksheet.getCell(rowIdx, 5).alignment = alignRight;

  worksheet.getCell(rowIdx, 7).value = Number(finalGrandTotal);
  worksheet.getCell(rowIdx, 7).numFmt = '#,##0';
  worksheet.getCell(rowIdx, 7).font = { name: 'Times New Roman', size: 12, bold: true };
  worksheet.getCell(rowIdx, 7).alignment = alignRight;

  for (let c = 1; c <= 7; c++) {
    worksheet.getCell(rowIdx, c).fill = lightGrayFill;
  }
  applyBorderToRange(worksheet, `A${rowIdx}`, `G${rowIdx}`, thinBorder);
  rowIdx++;

  // -------------------------------------------------------------
  // 6. Amount in words
  // -------------------------------------------------------------
  worksheet.getRow(rowIdx).height = 38;
  worksheet.mergeCells(rowIdx, 2, rowIdx, 7);
  const bangChuLabel = worksheet.getCell(rowIdx, 1);
  bangChuLabel.value = 'Bằng chữ:';
  bangChuLabel.font = { name: 'Times New Roman', size: 11, bold: true };
  bangChuLabel.alignment = alignLeft;

  const bangChuValue = worksheet.getCell(rowIdx, 2);
  bangChuValue.value = finalGrandTotal > 0 ? `${translateMoneyToWords(finalGrandTotal)} ./.` : '';
  bangChuValue.font = { name: 'Times New Roman', size: 11, bold: true, italic: true };
  bangChuValue.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  for (let c = 1; c <= 7; c++) {
    worksheet.getCell(rowIdx, c).fill = lightPeachFill;
  }
  applyBorderToRange(worksheet, `A${rowIdx}`, `G${rowIdx}`, thinBorder);
  rowIdx++;

  // -------------------------------------------------------------
  // 7. Signature area - đúng mẫu 2 chân ký
  // -------------------------------------------------------------
  worksheet.getRow(rowIdx).height = 28;
  rowIdx++;

  const sigTitleRow = rowIdx;
  worksheet.getRow(sigTitleRow).height = 34;
  worksheet.mergeCells(sigTitleRow, 2, sigTitleRow, 3);
  worksheet.mergeCells(sigTitleRow, 6, sigTitleRow, 7);

  const leftSigTitle = worksheet.getCell(sigTitleRow, 2);
  leftSigTitle.value = meta?.truongBoPhanTitle || 'PT.Bộ Phận';
  leftSigTitle.font = fontSign;
  leftSigTitle.alignment = alignCenter;

  const rightSigTitle = worksheet.getCell(sigTitleRow, 6);
  rightSigTitle.value = meta?.nguoiLapTitle || 'Người Lập';
  rightSigTitle.font = fontSign;
  rightSigTitle.alignment = alignCenter;

  rowIdx++;

  // spacing for signatures
  worksheet.getRow(rowIdx).height = 34;
  rowIdx++;
  worksheet.getRow(rowIdx).height = 34;
  rowIdx++;

  const sigNameRow = rowIdx;
  worksheet.getRow(sigNameRow).height = 34;
  worksheet.mergeCells(sigNameRow, 2, sigNameRow, 3);
  worksheet.mergeCells(sigNameRow, 6, sigNameRow, 7);

  const leftSigName = worksheet.getCell(sigNameRow, 2);
  leftSigName.value = meta?.truongBoPhanName || 'Bùi Văn Thắm';
  leftSigName.font = fontSignName;
  leftSigName.alignment = alignCenter;

  const rightSigName = worksheet.getCell(sigNameRow, 6);
  rightSigName.value = meta?.nguoiLapName || bb.nguoi_ky_nguoi_lap || 'Nguyễn T.Mai Hiền';
  rightSigName.font = fontSignName;
  rightSigName.alignment = alignCenter;

  worksheet.pageSetup.printArea = `A1:G${sigNameRow}`;
  // Output File Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const aElement = document.createElement('a');
  aElement.href = url;
  const cleanCode = bb.ma_bbnt ? bb.ma_bbnt.trim().replace(/[^a-zA-Z0-9.-]/g, "_") : "GB01";
  aElement.download = `Thanhtoan.${cleanCode}.xlsx`;
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

