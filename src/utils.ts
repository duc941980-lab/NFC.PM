/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuyCachA, QuyCachB, BienBan, ThanhPhan } from './types';

/**
 * Translates an integer (0 to 999,999) into Vietnamese words.
 */
function translateIntegerPart(num: number): string {
  if (num === 0) return "không";

  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];

  if (num < 10) return units[num];

  let result = "";

  const hundreds = Math.floor(num / 100) % 10;
  const thousandGroup = Math.floor(num / 1000);
  const remaining = num % 100;

  // Render thousands if exists
  if (thousandGroup > 0) {
    result += translateIntegerPart(thousandGroup) + " nghìn ";
  }

  // Render hundreds if thousands exist or hundreds > 0
  if (thousandGroup > 0 || hundreds > 0) {
    result += units[hundreds] + " trăm ";
  }

  // Render tens and units
  if (remaining > 0) {
    const tenValue = Math.floor(remaining / 10);
    const unitValue = remaining % 10;

    if (tenValue === 0) {
      if (hundreds > 0 || thousandGroup > 0) {
        result += "lẻ ";
      }
      result += units[unitValue];
    } else {
      if (tenValue === 1) {
        result += "mười ";
      } else {
        result += units[tenValue] + " mươi ";
      }

      if (unitValue > 0) {
        if (unitValue === 5 && tenValue > 0) {
          result += "lăm";
        } else if (unitValue === 1 && tenValue > 1) {
          result += "mốt";
        } else if (unitValue === 4 && tenValue > 1) {
          result += "bốn";
        } else {
          result += units[unitValue];
        }
      }
    }
  }

  return result.trim().replace(/\s+/g, " ");
}

/**
 * Translates an integer into casual Vietnamese words (omitting "mươi" for tens, e.g. "ba bẩy" instead of "ba mươi bảy").
 */
function translateIntegerPartCasual(num: number): string {
  if (num === 0) return "không";

  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bẩy", "tám", "chín"];

  if (num < 10) return units[num];

  let result = "";

  const millionGroup = Math.floor(num / 1000000);
  const remainingMillion = num % 1000000;
  if (millionGroup > 0) {
    result += translateIntegerPartCasual(millionGroup) + " triệu ";
  }

  const thousandGroup = Math.floor(remainingMillion / 1000);
  const remainingThousand = remainingMillion % 1000;
  if (thousandGroup > 0) {
    result += translateIntegerPartCasual(thousandGroup) + " nghìn ";
  }

  const hundreds = Math.floor(remainingThousand / 100);
  const remainingHundreds = remainingThousand % 100;

  if (hundreds > 0) {
    result += units[hundreds] + " trăm ";
  } else if (millionGroup > 0 || thousandGroup > 0) {
    if (remainingHundreds > 0) {
      result += "không trăm ";
    }
  }

  if (remainingHundreds > 0) {
    const tenValue = Math.floor(remainingHundreds / 10);
    const unitValue = remainingHundreds % 10;

    if (tenValue === 0) {
      if (hundreds > 0 || thousandGroup > 0 || millionGroup > 0) {
        result += "lẻ ";
      }
      result += units[unitValue];
    } else if (tenValue === 1) {
      result += "mười ";
      if (unitValue > 0) {
        if (unitValue === 5) result += "lăm";
        else if (unitValue === 4) result += "bốn";
        else result += units[unitValue];
      }
    } else {
      result += units[tenValue] + " ";
      if (unitValue === 0) {
        result += "mươi";
      } else if (unitValue === 1) {
        result += "mốt";
      } else if (unitValue === 4) {
        result += "bốn";
      } else if (unitValue === 5) {
        result += "lăm";
      } else {
        result += units[unitValue];
      }
    }
  }

  return result.trim().replace(/\s+/g, " ");
}

/**
 * Converts a floating-point number (representing wood volume in m³) to Vietnamese text.
 * Handles both casual forest yard style ("khối một hai bốn") and formal style ("mét khối").
 */
export function numberToVietnameseWords(num: number, formal: boolean = false): string {
  if (num === 0) return formal ? "Không mét khối" : "Không khối";
  if (isNaN(num)) return "";

  // Standardize up to 3 decimal places
  const fixedStr = num.toFixed(3);
  const parts = fixedStr.split(".");
  const integerPart = parseInt(parts[0], 10);
  const decimalPartStr = parts[1] || "000";

  let integerWords = translateIntegerPart(integerPart);
  // Capitalize first letter
  integerWords = integerWords.charAt(0).toUpperCase() + integerWords.slice(1);

  const decimalVal = parseInt(decimalPartStr, 10);

  if (decimalVal > 0) {
    if (!formal) {
      // Yard inspection style: e.g., "khối, một hai bốn" structure
      const digitNames = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bẩy", "tám", "chín"];
      const decimalWords = decimalPartStr
        .split("")
        .map(d => digitNames[parseInt(d, 10)])
        .join(" ");
      return `${integerWords} khối, ${decimalWords}`.trim().toLowerCase().replace(/^\w/, c => c.toUpperCase());
    } else {
      // Formal document style: e.g., "ba mươi bảy phẩy một trăm hai mươi tư mét khối"
      const d1 = parseInt(decimalPartStr[0], 10);
      const d2 = parseInt(decimalPartStr[1], 10);
      const d3 = parseInt(decimalPartStr[2], 10);

      const units = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
      let decText = "";

      decText += units[d1] + " trăm ";

      if (d2 === 0) {
        if (d3 !== 0) {
          decText += "lẻ ";
        }
      } else if (d2 === 1) {
        decText += "mười ";
      } else {
        decText += units[d2] + " mươi ";
      }

      if (d3 !== 0) {
        if (d3 === 5 && d2 > 0) {
          decText += "lăm";
        } else if (d3 === 1 && d2 > 1) {
          decText += "mốt";
        } else if (d3 === 4 && d2 > 1) {
          decText += "bốn";
        } else {
          decText += units[d3];
        }
      }

      decText = decText.trim().replace(/\s+/g, " ");
      return `${integerWords} phẩy ${decText} mét khối`.trim();
    }
  } else {
    return formal ? `${integerWords} mét khối` : `${integerWords} khối`;
  }
}

/**
 * Parses wood dimensions from a standardized format string, e.g. "470×50×14" or "470 x 50 x 14"
 */
export function parseDimensions(specStr: string) {
  const sanitized = specStr.replace(/\s+/g, "").toLowerCase();
  const delimiters = [/[×]/, /[x]/, /[*]/, /[.,_]/];
  
  let parts: string[] = [];
  for (const delim of delimiters) {
    const split = sanitized.split(delim);
    if (split.length >= 3) {
      parts = split;
      break;
    }
  }

  // Fallback to 2 parts if 3 parts not found (e.g. Length x Thickness)
  if (parts.length < 3) {
    for (const delim of delimiters) {
      const split = sanitized.split(delim);
      if (split.length === 2) {
        parts = split;
        break;
      }
    }
  }

  if (parts.length >= 3) {
    const l = parseFloat(parts[0]);
    const w = parseFloat(parts[1]);
    const t = parseFloat(parts[2]);
    if (!isNaN(l) && !isNaN(w) && !isNaN(t)) {
      return { length: l, width: w, thickness: t };
    }
  } else if (parts.length === 2) {
    const l = parseFloat(parts[0]);
    const t = parseFloat(parts[1]);
    if (!isNaN(l) && !isNaN(t)) {
      return { length: l, width: 0, thickness: t };
    }
  }
  return null;
}

/**
 * Calculates wood volume in cubic meters based on specs
 * Formula: V = (L * W * T * N) / 1,000,000,000
 */
export function calculateWoodVolume(length: number, width: number, thickness: number, quantity: number): number {
  if (isNaN(length) || isNaN(width) || isNaN(thickness) || isNaN(quantity)) return 0;
  // Compute precisely
  const vol = (length * width * thickness * quantity) / 1000000000;
  return parseFloat(vol.toFixed(3)); // Standard round to 3 decimal places of wood measurement
}

/**
 * Formats a wood volume number to a clean string with exactly 3 decimal places as per Vietnam wood standard.
 * E.g., 3.000 -> "3.000", 1.500 -> "1.500", 1.438 -> "1.438"
 */
export function formatVolume(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "0.000";
  return num.toFixed(3);
}

/**
 * Recalculates the "Loại 1" sub-row to absorb the remaining volume, pieces, and ratio in Part B
 * based on the totals from Part A. This is used for downgrading ("hạ loại").
 */
export function recalculateLoai1(chiTiet: any[], rowA: { so_thanh: number; kl_nguyen_thuy: number }): any[] {
  if (!chiTiet || chiTiet.length === 0) return [];

  let remainderIdx = chiTiet.findIndex(sub => sub.ten_loai === "Loại 1");
  if (remainderIdx === -1) {
    remainderIdx = 0; // fallback to the first row if no "Loại 1" exists
  }

  let otherPieces = 0;
  let otherVolume = 0;
  let otherRatio = 0;

  chiTiet.forEach((sub, idx) => {
    if (idx !== remainderIdx) {
      otherPieces += sub.so_thanh || 0;
      otherVolume += sub.kl_nhap_kho || 0;
      otherRatio += sub.ti_le || 0;
    }
  });

  const nextPieces = Math.max(0, rowA.so_thanh - otherPieces);
  const nextVolume = parseFloat(Math.max(0, rowA.kl_nguyen_thuy - otherVolume).toFixed(3));
  const nextRatio = parseFloat(Math.max(0, 100 - otherRatio).toFixed(1));

  return chiTiet.map((sub, idx) => {
    if (idx === remainderIdx) {
      return {
        ...sub,
        so_thanh: nextPieces,
        kl_nhap_kho: nextVolume,
        ti_le: nextRatio
      };
    }
    return sub;
  });
}

/**
 * Auto populates or updates QuyCachB given a QuyCachA change
 */
export function rebalanceSubRows(details: any[], rowA: { so_thanh: number; kl_nguyen_thuy: number }): any[] {
  if (!details || details.length === 0) return [];
  
  const sumPieces = details.reduce((sum, d) => sum + d.so_thanh, 0);
  if (sumPieces === 0) {
    return details.map(d => ({
      ...d,
      kl_nhap_kho: 0,
      ti_le: 0
    }));
  }
  
  const activeSubRows = details.filter(d => d.so_thanh > 0);
  const targetSubRow = activeSubRows.length > 0 ? activeSubRows[activeSubRows.length - 1] : details[details.length - 1];
  
  let sumVolCalculated = 0;
  let sumRatioCalculated = 0;
  
  const balancedDetails = details.map(d => {
    let kl = 0;
    let ratio = 0;
    if (sumPieces > 0) {
      kl = parseFloat((rowA.kl_nguyen_thuy * d.so_thanh / sumPieces).toFixed(3));
    }
    if (rowA.so_thanh > 0) {
      ratio = parseFloat(((d.so_thanh / rowA.so_thanh) * 100).toFixed(1));
    }
    
    if (d.id !== targetSubRow.id) {
      sumVolCalculated += kl;
      sumRatioCalculated += ratio;
      return {
        ...d,
        kl_nhap_kho: kl,
        ti_le: ratio
      };
    } else {
      return d;
    }
  });
  
  // For target row:
  const targetIndex = balancedDetails.findIndex(d => d.id === targetSubRow.id);
  if (targetIndex !== -1) {
    const targetKl = parseFloat((rowA.kl_nguyen_thuy - sumVolCalculated).toFixed(3));
    const targetRatio = parseFloat((100 - sumRatioCalculated).toFixed(1));
    balancedDetails[targetIndex] = {
      ...balancedDetails[targetIndex],
      kl_nhap_kho: targetKl < 0 ? 0 : targetKl,
      ti_le: targetRatio < 0 ? 0 : targetRatio
    };
  }
  
  return balancedDetails;
}

export function updateClassifiedRow(rowA: QuyCachA, existingB?: QuyCachB): QuyCachB {
  const parsed = parseDimensions(rowA.kich_thuoc_mm) || { length: 0, width: 0, thickness: 0 };
  const { length, width, thickness } = parsed;

  const coPhanLoai = existingB !== undefined ? existingB.co_phan_loai : rowA.co_phan_loai;

  if (existingB && existingB.chi_tiet && existingB.chi_tiet.length > 0) {
    const isSingle = !coPhanLoai;

    let updatedDetails;
    if (isSingle) {
      // If it is single (not classified), force a single detail row matching Part A's totals precisely.
      const firstItem = existingB.chi_tiet[0] || { id: `${rowA.id}-default`, ten_loai: "Loại 1" };
      updatedDetails = [
        {
          ...firstItem,
          so_thanh: rowA.so_thanh,
          kl_nhap_kho: rowA.kl_nguyen_thuy,
          ti_le: 100
        }
      ];
    } else if (existingB.co_phan_loai === false) {
      // Turning classification ON: initialize with a single "Loại 1" row taking the full volume
      updatedDetails = [
        {
          id: `${rowA.id}-std-1`,
          ten_loai: "Loại 1",
          so_thanh: rowA.so_thanh,
          ti_le: 100,
          kl_nhap_kho: rowA.kl_nguyen_thuy,
          ghi_chu: ""
        }
      ];
    } else {
      // Keep existing sub-rows, but auto-recalculate "Loại 1" as the remainder of Part A's original total volume/pieces
      updatedDetails = recalculateLoai1(existingB.chi_tiet, rowA);
    }

    const sumPieces = updatedDetails.reduce((sum, d) => sum + d.so_thanh, 0);
    const sumVolume = updatedDetails.reduce((sum, d) => sum + d.kl_nhap_kho, 0);

    return {
      id: rowA.id,
      kich_thuoc_mm: rowA.kich_thuoc_mm,
      so_thanh_tong: sumPieces,
      kl_tong: sumVolume,
      co_phan_loai: coPhanLoai,
      chi_tiet: updatedDetails,
      ghi_chu: existingB.ghi_chu || ""
    };
  }

  // Default distribution if brand new: initially 100% "Loại 1" or the 5 standard categories if co_phan_loai is true
  const defaultVol = rowA.kl_nguyen_thuy;
  if (!coPhanLoai) {
    return {
      id: rowA.id,
      kich_thuoc_mm: rowA.kich_thuoc_mm,
      so_thanh_tong: rowA.so_thanh,
      kl_tong: defaultVol,
      co_phan_loai: false,
      chi_tiet: [
        {
          id: `${rowA.id}-default`,
          ten_loai: "Loại 1",
          so_thanh: rowA.so_thanh,
          ti_le: 100,
          kl_nhap_kho: defaultVol,
          ghi_chu: ""
        }
      ],
      ghi_chu: ""
    };
  } else {
    return {
      id: rowA.id,
      kich_thuoc_mm: rowA.kich_thuoc_mm,
      so_thanh_tong: rowA.so_thanh,
      kl_tong: defaultVol,
      co_phan_loai: true,
      chi_tiet: [
        {
          id: `${rowA.id}-std-1`,
          ten_loai: "Loại 1",
          so_thanh: rowA.so_thanh,
          ti_le: 100,
          kl_nhap_kho: defaultVol,
          ghi_chu: ""
        }
      ],
      ghi_chu: ""
    };
  }
}

/**
 * Generates sample initial data to populate the app for direct visual clarity.
 */
export function getSampleInspection(): BienBan {
  return {
    id: "sample-gb-12-05",
    ma_bbnt: "GB 12.05",
    ngay_nt: "2026-05-26",
    don_vi_cung_ung: "Công ty Cổ phần Lâm nghiệp Yên Thế",
    loai_go: "Gỗ keo rừng trồng / Gỗ sơ chế thông thường",
    chung_chi_fsc: "FSC 100%",
    dia_diem_nhap: "Kho gỗ nguyên liệu 1 - NM Chế biến Gỗ Keo",
    ket_luan: "Đạt",
    ghi_chu: "Lô hàng đạt tiêu chuẩn kích thước và độ ẩm quy định, hồ sơ FSC hợp lệ. Cho phép nhập kho 100% khối lượng.",
    
    nguoi_ky_pho_tgd: "",
    nguoi_ky_tp_pqlcl: "",
    nguoi_ky_thu_kho: "",
    nguoi_ky_dai_dien_ncc: "Trần Quốc Toản",
    nguoi_ky_nguoi_lap: "Ngô Văn Trường",
 
    thanh_phan: [
      { id: "tp-1", stt: 1, ho_ten: "Ngô Văn Trường", chuc_vu: "Người lập biên bản (QC)" },
      { id: "tp-2", stt: 2, ho_ten: "Đặng Văn Tùng", chuc_vu: "QC bộ phận QLCL1" }
    ],
 
    quy_cach_a: [
      { id: "a-1", stt: 1, kich_thuoc_mm: "470×50×14", so_thanh: 4400, kl_nguyen_thuy: 1.438, co_phan_loai: true },
      { id: "a-2", stt: 2, kich_thuoc_mm: "650×50×14", so_thanh: 13000, kl_nguyen_thuy: 5.897, co_phan_loai: true },
      { id: "a-3", stt: 3, kich_thuoc_mm: "990×50×14", so_thanh: 30000, kl_nguyen_thuy: 14.969, co_phan_loai: true },
      { id: "a-4", stt: 4, kich_thuoc_mm: "820×50×14", so_thanh: 4100, kl_nguyen_thuy: 1.584, co_phan_loai: true },
      { id: "a-5", stt: 5, kich_thuoc_mm: "460×56×23", so_thanh: 11900, kl_nguyen_thuy: 7.051, co_phan_loai: true },
      { id: "a-6", stt: 6, kich_thuoc_mm: "650×51×23", so_thanh: 1900, kl_nguyen_thuy: 1.441, co_phan_loai: true },
      { id: "a-7", stt: 7, kich_thuoc_mm: "650×51×29", so_thanh: 1600, kl_nguyen_thuy: 1.557, co_phan_loai: true },
      { id: "a-8", stt: 8, kich_thuoc_mm: "650×105×29", so_thanh: 1600, kl_nguyen_thuy: 3.187, co_phan_loai: true }
    ],
 
    // Filled Part B
    quy_cach_b: [
      {
        id: "a-1",
        kich_thuoc_mm: "470×50×14",
        so_thanh_tong: 4400,
        kl_tong: 1.438,
        co_phan_loai: true,
        chi_tiet: [
          { id: "a-1-l1", ten_loai: "Loại 1", so_thanh: 4400, ti_le: 100, kl_nhap_kho: 1.438 }
        ]
      },
      {
        id: "a-2",
        kich_thuoc_mm: "650×50×14",
        so_thanh_tong: 13000,
        kl_tong: 5.897,
        co_phan_loai: true,
        chi_tiet: [
          { id: "a-2-l1", ten_loai: "Loại 1", so_thanh: 13000, ti_le: 100, kl_nhap_kho: 5.897 }
        ]
      },
      {
        id: "a-3",
        kich_thuoc_mm: "990×50×14",
        so_thanh_tong: 30000,
        kl_tong: 14.969,
        co_phan_loai: true,
        chi_tiet: [
          { id: "a-3-l1", ten_loai: "Loại 1", so_thanh: 30000, ti_le: 100, kl_nhap_kho: 14.969 }
        ]
      },
      {
        id: "a-4",
        kich_thuoc_mm: "820×50×14",
        so_thanh_tong: 4100,
        kl_tong: 1.584,
        co_phan_loai: true,
        chi_tiet: [
          { id: "a-4-l1", ten_loai: "Loại 1", so_thanh: 4100, ti_le: 100, kl_nhap_kho: 1.584 }
        ]
      },
      {
        id: "a-5",
        kich_thuoc_mm: "460×56×23",
        so_thanh_tong: 11900,
        kl_tong: 7.051,
        co_phan_loai: true,
        chi_tiet: [
          { id: "a-5-l1", ten_loai: "Loại 1", so_thanh: 6362, ti_le: 53.5, kl_nhap_kho: 3.772 },
          { id: "a-5-l2", ten_loai: "Loại 2", so_thanh: 4016, ti_le: 33.7, kl_nhap_kho: 2.376 },
          { id: "a-5-l3", ten_loai: "Loại 3", so_thanh: 1522, ti_le: 12.8, kl_nhap_kho: 0.903 }
        ]
      },
      {
        id: "a-6",
        kich_thuoc_mm: "650×51×23",
        so_thanh_tong: 1900,
        kl_tong: 1.441,
        co_phan_loai: true,
        chi_tiet: [
          { id: "a-6-l1", ten_loai: "Loại 1", so_thanh: 1140, ti_le: 60.0, kl_nhap_kho: 0.865 },
          { id: "a-6-l2", ten_loai: "Loại 2", so_thanh: 570, ti_le: 30.0, kl_nhap_kho: 0.432 },
          { id: "a-6-l3", ten_loai: "Loại 3", so_thanh: 190, ti_le: 10.0, kl_nhap_kho: 0.144 }
        ]
      },
      {
        id: "a-7",
        kich_thuoc_mm: "650×51×29",
        so_thanh_tong: 1600,
        kl_tong: 1.557,
        co_phan_loai: true,
        chi_tiet: [
          { id: "a-7-l1", ten_loai: "Loại 1", so_thanh: 1120, ti_le: 70.0, kl_nhap_kho: 1.090 },
          { id: "a-7-l2", ten_loai: "Loại 2", so_thanh: 320, ti_le: 20.0, kl_nhap_kho: 0.311 },
          { id: "a-7-l3", ten_loai: "Loại 3", so_thanh: 160, ti_le: 10.0, kl_nhap_kho: 0.156 }
        ]
      },
      {
        id: "a-8",
        kich_thuoc_mm: "650×105×29",
        so_thanh_tong: 1600,
        kl_tong: 3.187,
        co_phan_loai: true,
        chi_tiet: [
          { id: "a-8-l1", ten_loai: "Loại 1", so_thanh: 960, ti_le: 60.0, kl_nhap_kho: 1.912 },
          { id: "a-8-l2", ten_loai: "Loại 2", so_thanh: 480, ti_le: 30.0, kl_nhap_kho: 0.956 },
          { id: "a-8-l3", ten_loai: "Loại 3", so_thanh: 160, ti_le: 10.0, kl_nhap_kho: 0.319 }
        ]
      }
    ],
    bang_duyet_gia: [
      { id: "a-1", kich_thuoc_mm: "470×50×14", don_gia_l1: 3500000, don_gia_l2: 2800000, don_gia_l3: 2000000, don_gia_tandung: 1200000, don_gia_l21: 2500000 },
      { id: "a-2", kich_thuoc_mm: "650×50×14", don_gia_l1: 3500000, don_gia_l2: 2800000, don_gia_l3: 2000000, don_gia_tandung: 1200000, don_gia_l21: 2500000 },
      { id: "a-3", kich_thuoc_mm: "990×50×14", don_gia_l1: 3600000, don_gia_l2: 2900050, don_gia_l3: 2010000, don_gia_tandung: 1250000, don_gia_l21: 2550000 },
      { id: "a-4", kich_thuoc_mm: "820×50×14", don_gia_l1: 3500000, don_gia_l2: 2800000, don_gia_l3: 2000000, don_gia_tandung: 1200000, don_gia_l21: 2500000 },
      { id: "a-5", kich_thuoc_mm: "460×56×23", don_gia_l1: 3700000, don_gia_l2: 3000000, don_gia_l3: 2200000, don_gia_tandung: 1400000, don_gia_l21: 2700000 },
      { id: "a-6", kich_thuoc_mm: "650×51×23", don_gia_l1: 3700000, don_gia_l2: 3000000, don_gia_l3: 2200000, don_gia_tandung: 1400000, don_gia_l21: 2700000 },
      { id: "a-7", kich_thuoc_mm: "650×51×29", don_gia_l1: 3805000, don_gia_l2: 3100000, don_gia_l3: 2300000, don_gia_tandung: 1500000, don_gia_l21: 2800000 },
      { id: "a-8", kich_thuoc_mm: "650×105×29", don_gia_l1: 3900000, don_gia_l2: 3200000, don_gia_l3: 2400000, don_gia_tandung: 1600000, don_gia_l21: 2900000 }
    ],
    bang_thanh_toan: [
      { id: "bt-1", stt: 1, ten_hang: "Gỗ Loại 1 - quy cách 470×50×14", dvt: "m³", kl: 0.197, don_gia: 3500000, thuong: 50000, don_gia_tong: 3550000, thanh_tien: 699350 },
      { id: "bt-2", stt: 2, ten_hang: "Gỗ Loại 2 - quy cách 470×50×14", dvt: "m³", kl: 0.049, don_gia: 2800000, thuong: 0, don_gia_tong: 2800000, thanh_tien: 137200 },
      { id: "bt-3", stt: 3, ten_hang: "Gỗ Loại 1 - quy cách 650×105×29", dvt: "m³", kl: 1.912, don_gia: 3900000, thuong: 100000, don_gia_tong: 4000000, thanh_tien: 7648000 },
      { id: "bt-4", stt: 4, ten_hang: "Gỗ Loại 2 - quy cách 650×105×29", dvt: "m³", kl: 0.956, don_gia: 3200000, thuong: 0, don_gia_tong: 3200000, thanh_tien: 3059200 }
    ],
    da_luu_thanh_toan: true,
    created_at: new Date('2026-05-26').toISOString()
  };
}

export function translateMoneyToWords(amount: number): string {
  if (amount === 0) return "Không đồng";
  const units = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  
  function readThreeDigits(threeDigits: number, showZeroHundred: boolean): string {
    const hundred = Math.floor(threeDigits / 100);
    const ten = Math.floor((threeDigits % 100) / 10);
    const unit = threeDigits % 10;
    let res = "";
    
    if (hundred > 0 || showZeroHundred) {
      res += units[hundred] + " trăm ";
    }
    
    if (ten === 0) {
      if (unit > 0 && (hundred > 0 || showZeroHundred)) {
        res += "lẻ ";
      }
    } else if (ten === 1) {
      res += "mười ";
    } else {
      res += units[ten] + " mươi ";
    }
    
    if (unit > 0) {
      if (unit === 1 && ten > 1) {
        res += "mốt";
      } else if (unit === 5 && ten > 0) {
        res += "lăm";
      } else if (unit === 4 && ten > 1) {
        res += "bốn";
      } else {
        res += units[unit];
      }
    }
    return res.trim();
  }

  const temp = Math.floor(amount);
  if (temp === 0) return "Không đồng";
  
  let currentVal = temp;
  const groups: number[] = [];
  while (currentVal > 0) {
    groups.push(currentVal % 1000);
    currentVal = Math.floor(currentVal / 1000);
  }
  
  const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  let words = "";
  
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const showZero = i < groups.length - 1;
      const groupText = readThreeDigits(groupVal, showZero);
      words += groupText + " " + scales[i] + " ";
    }
  }
  
  words = words.trim().replace(/\s+/g, " ") + " đồng chẵn";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

