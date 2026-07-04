/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import { BienBan, ThanhPhan } from '../types';
import { numberToVietnameseWords, translateMoneyToWords } from '../utils';

/**
 * Approximate OKLCH colors to standard CSS rgb/rgba values for html2canvas compatibility.
 */
export function replaceOklchWithRgb(cssText: string): string {
  return cssText.replace(/oklch\(([^)]+)\)/g, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s/]+/).filter(Boolean);
      if (parts.length < 3) {
        return 'rgb(120, 120, 120)';
      }
      
      let lVal = parts[0];
      let lightness = 0.5;
      if (lVal.endsWith('%')) {
        lightness = parseFloat(lVal) / 100;
      } else {
        lightness = parseFloat(lVal);
        if (lightness > 1) lightness = lightness / 100;
      }

      let chroma = parseFloat(parts[1]);
      let hue = parseFloat(parts[2]);

      let alpha = 1;
      if (parts[3] || p1.includes('/')) {
        // find alpha part
        const slashIdx = p1.indexOf('/');
        if (slashIdx !== -1) {
          const aStr = p1.substring(slashIdx + 1).trim();
          if (aStr.endsWith('%')) {
            alpha = parseFloat(aStr) / 100;
          } else {
            alpha = parseFloat(aStr);
          }
        }
      }

      if (isNaN(chroma) || chroma < 0.01) {
        const grey = Math.round(lightness * 255);
        return alpha < 1 ? `rgba(${grey}, ${grey}, ${grey}, ${alpha})` : `rgb(${grey}, ${grey}, ${grey})`;
      }

      let r = 128, g = 128, b = 128;
      
      if (hue >= 0 && hue < 30) {
        r = 239; g = 68; b = 68;
      } else if (hue >= 30 && hue < 60) {
        r = 249; g = 115; b = 22;
      } else if (hue >= 60 && hue < 90) {
        r = 234; g = 179; b = 8;
      } else if (hue >= 90 && hue < 150) {
        r = 34; g = 197; b = 94;
      } else if (hue >= 150 && hue < 200) {
        r = 20; g = 184; b = 166;
      } else if (hue >= 200 && hue < 260) {
        r = 59; g = 130; b = 246;
      } else if (hue >= 260 && hue < 320) {
        r = 168; g = 85; b = 247;
      } else {
        r = 236; g = 72; b = 153;
      }

      if (lightness > 0.5) {
        const factor = (lightness - 0.5) * 2;
        r = Math.round(r + (255 - r) * factor);
        g = Math.round(g + (255 - g) * factor);
        b = Math.round(b + (255 - b) * factor);
      } else {
        const factor = lightness * 2;
        r = Math.round(r * factor);
        g = Math.round(g * factor);
        b = Math.round(b * factor);
      }

      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
    } catch (e) {
      return 'rgb(120, 120, 120)';
    }
  });
}

/**
 * Approximate OKLAB colors to standard CSS rgb/rgba values for html2canvas compatibility.
 */
export function replaceOklabWithRgb(cssText: string): string {
  return cssText.replace(/oklab\(([^)]+)\)/g, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s/]+/).filter(Boolean);
      if (parts.length < 3) {
        return 'rgb(120, 120, 120)';
      }
      
      let lVal = parts[0];
      let lightness = 0.5;
      if (lVal.endsWith('%')) {
        lightness = parseFloat(lVal) / 100;
      } else {
        lightness = parseFloat(lVal);
        if (lightness > 1) lightness = lightness / 100;
      }

      let aVal = parseFloat(parts[1]);
      let bVal = parseFloat(parts[2]);

      let alpha = 1;
      if (parts[3] || p1.includes('/')) {
        const slashIdx = p1.indexOf('/');
        if (slashIdx !== -1) {
          const aStr = p1.substring(slashIdx + 1).trim();
          if (aStr.endsWith('%')) {
            alpha = parseFloat(aStr) / 100;
          } else {
            alpha = parseFloat(aStr);
          }
        }
      }

      // Simple OKLab to RGB approximation
      const L_cone = lightness + 0.3963377774 * aVal + 0.2158037573 * bVal;
      const M_cone = lightness - 0.1055613458 * aVal - 0.0638541728 * bVal;
      const S_cone = lightness - 0.0894841775 * aVal - 1.291485548 * bVal;

      const l_3 = L_cone * L_cone * L_cone;
      const m_3 = M_cone * M_cone * M_cone;
      const s_3 = S_cone * S_cone * S_cone;

      // Linear sRGB
      const r_lin = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
      const g_lin = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
      const b_lin = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

      // Gamma correction and bounding/clamping
      const f = (c: number) => {
        const clamped = Math.max(0, Math.min(1, c));
        return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      };

      const r = Math.round(f(r_lin) * 255);
      const g = Math.round(f(g_lin) * 255);
      const b = Math.round(f(b_lin) * 255);

      return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
    } catch (e) {
      return 'rgb(120, 120, 120)';
    }
  });
}

/**
 * Capture a DOM element by its ID and trigger a PNG image download.
 * Since html2canvas fails or crashes when parsing Tailwind v4 modern CSS stylesheets (including oklch, @theme, @import, etc.),
 * we clone the element and copy its resolved browser computed styles directly as plain inline rgb styles.
 * We then render this standalone, pre-styled clone inside a temporary sandbox container which bypasses stylesheet parsing entirely.
 */
export async function exportToImage(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Cannot find element with ID: ${elementId}`);
    return false;
  }

  // 1. Create a deep clone of the element
  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = `cloned-${elementId}`;

  // 2. Recursively copy computed styles from original DOM tree to clone using standard kebab-case CSS properties
  const copyStyles = (src: Element, dest: Element) => {
    const computed = window.getComputedStyle(src);
    const destHtml = dest as HTMLElement;

    // Standard list of visual, text, and layout properties in kebab-case format
    const props = [
      'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style',
      'text-align', 'line-height', 'letter-spacing', 'text-transform',
      'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
      'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
      'border', 'border-style', 'border-width', 'border-color',
      'border-top', 'border-top-color', 'border-top-width', 'border-top-style',
      'border-bottom', 'border-bottom-color', 'border-bottom-width', 'border-bottom-style',
      'border-left', 'border-left-color', 'border-left-width', 'border-left-style',
      'border-right', 'border-right-color', 'border-right-width', 'border-right-style',
      'border-collapse', 'width', 'height', 'max-width', 'min-width',
      'display', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap',
      'flex-grow', 'flex-shrink', 'box-sizing', 'align-self', 'justify-self',
      'grid-template-columns', 'grid-column', 'grid-row', 'gap'
    ];

    props.forEach(prop => {
      let val = computed.getPropertyValue(prop);
      if (val) {
        // Convert any oklch or oklab in computed values to rgb/rgba format for html2canvas
        if (typeof val === 'string' && val.includes('oklch')) {
          val = replaceOklchWithRgb(val);
        }
        if (typeof val === 'string' && val.includes('oklab')) {
          val = replaceOklabWithRgb(val);
        }
        destHtml.style.setProperty(prop, val);
      }
    });

    // Recursively process children
    const srcChildren = Array.from(src.children);
    const destChildren = Array.from(dest.children);
    for (let i = 0; i < srcChildren.length; i++) {
      if (srcChildren[i] && destChildren[i]) {
        copyStyles(srcChildren[i], destChildren[i]);
      }
    }
  };

  // Run style copier
  copyStyles(element, clone);

  // Apply some high quality screenshot visual overrides to the outer clone container
  clone.style.padding = '35px';
  clone.style.boxShadow = 'none';
  clone.style.border = '1px solid #111111';
  clone.style.backgroundColor = '#ffffff';

  // 3. Assemble sandbox under body, safely off-screen using left: -9999px
  // This keeps the element in the paint viewport so it is rendered with accurate browser computations, 
  // without disturbing the visual view of the end user or causing negative zIndex bugs.
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0px';
  container.style.left = '-9999px';
  container.style.width = (element.offsetWidth || 800) + 'px';
  container.style.height = (element.offsetHeight || 1200) + 'px';
  container.style.zIndex = '99999';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    // 4. Run html2canvas on the pre-styled clone
    const canvas = await html2canvas(clone, {
      scale: 2.2, // Double precision scaling for high resolution print standard
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
    });

    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `${filename}.png`;
    link.click();

    return true;
  } catch (error) {
    console.error('Error generating image via html2canvas (cloned sandboxed):', error);
    return false;
  } finally {
    // Standard cleanup of container
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Export a document as high-fidelity MS Word (.doc) with complete tables and inline styles.
 */
export function exportToWord(bb: BienBan, type: 'qc' | 'payment') {
  const dateObj = bb.ngay_nt ? new Date(bb.ngay_nt) : new Date();
  const dateFormatted = dateObj.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  let contentHtml = '';

  if (type === 'qc') {
    // QC REPORT (BM01/QT01/QLCL1)
    const displayMembers: ThanhPhan[] = [];
    
    // 1. STT 1: Người lập (always exists)
    displayMembers.push({
      id: "1",
      stt: 1,
      ho_ten: bb.nguoi_ky_nguoi_lap || "Ngô Văn Trường",
      chuc_vu: "Người lập biên bản (QC)"
    });

    // 2. STT 2: QC bộ phận QLCL1 (always exists)
    const savedQC = bb.thanh_phan?.find(m => m.stt === 2 || m.chuc_vu.toLowerCase().includes("qc"));
    displayMembers.push({
      id: "2",
      stt: 2,
      ho_ten: savedQC?.ho_ten || "Đặng Văn Tùng",
      chuc_vu: "QC bộ phận QLCL1"
    });

    // 3. STT 3: Thủ kho (only exists if bb.nguoi_ky_thu_kho is provided)
    if (bb.nguoi_ky_thu_kho && bb.nguoi_ky_thu_kho.trim() !== "") {
      displayMembers.push({
        id: "3",
        stt: 3,
        ho_ten: bb.nguoi_ky_thu_kho,
        chuc_vu: "Thủ kho gỗ"
      });
    }

    const totalQtyA = bb.quy_cach_a.reduce((acc, curr) => acc + curr.so_thanh, 0);
    const totalVolA = bb.quy_cach_a.reduce((acc, curr) => acc + curr.kl_nguyen_thuy, 0);

    const totalVolB = bb.quy_cach_b.reduce((sum, r) => {
      if (r.co_phan_loai && r.chi_tiet && r.chi_tiet.length > 0) {
        return sum + r.chi_tiet.reduce((s, c) => s + c.kl_nhap_kho, 0);
      }
      return sum + r.kl_tong;
    }, 0);

    const totalVolBWords = numberToVietnameseWords(totalVolB, false);

    // Table A rows - clean dimensions
    const rowsA = bb.quy_cach_a.map((spec, idx) => {
      const cleanDim = spec.kich_thuoc_mm.replace(/×/g, 'x');
      return `
        <tr style="font-family: 'Times New Roman', serif; font-size: 11pt;">
          <td align="center" style="border: 1px solid #000000; padding: 6px;">${idx + 1}</td>
          <td align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${cleanDim}</td>
          <td align="center" style="border: 1px solid #000000; padding: 6px;">m3</td>
          <td align="right" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${spec.kl_nguyen_thuy.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
        </tr>
      `;
    }).join('');

    // Table B rows
    let rowsB = '';
    let counterB = 1;
    bb.quy_cach_b.forEach((item) => {
      const matchedA = bb.quy_cach_a.find(a => a.id === item.id);
      const parentVol = matchedA ? matchedA.kl_nguyen_thuy : item.kl_tong;
      const cleanDim = item.kich_thuoc_mm.replace(/×/g, 'x');
      
      if (item.co_phan_loai && item.chi_tiet && item.chi_tiet.length > 0) {
        rowsB += `
          <tr style="font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
            <td align="center" style="border: 1px solid #000000; padding: 6px;">${counterB++}</td>
            <td align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${cleanDim}</td>
            <td align="right" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${parentVol.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
            <td style="border: 1px solid #000000; padding: 6px;"></td>
            <td style="border: 1px solid #000000; padding: 6px;"></td>
            <td style="border: 1px solid #000000; padding: 6px;">${item.ghi_chu || ''}</td>
          </tr>
        `;
        item.chi_tiet.forEach((detail) => {
          rowsB += `
            <tr style="font-family: 'Times New Roman', serif; font-size: 10.5pt;">
              <td style="border: 1px solid #000000; padding: 5px;"></td>
              <td style="border: 1px solid #000000; padding: 5px; padding-left: 15px; font-style: italic;">${detail.ten_loai}</td>
              <td style="border: 1px solid #000000; padding: 5px;"></td>
              <td align="center" style="border: 1px solid #000000; padding: 5px;">${detail.ti_le % 1 === 0 ? detail.ti_le.toFixed(0) : detail.ti_le.toFixed(1)}</td>
              <td align="right" style="border: 1px solid #000000; padding: 5px; font-weight: bold;">${detail.kl_nhap_kho.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
              <td style="border: 1px solid #000000; padding: 5px;">${detail.ghi_chu || ''}</td>
            </tr>
          `;
        });
      } else {
        rowsB += `
          <tr style="font-family: 'Times New Roman', serif; font-size: 11pt;">
            <td align="center" style="border: 1px solid #000000; padding: 6px;">${counterB++}</td>
            <td align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${cleanDim}</td>
            <td align="right" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${parentVol.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
            <td align="center" style="border: 1px solid #000000; padding: 6px;">100</td>
            <td align="right" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${parentVol.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
            <td style="border: 1px solid #000000; padding: 6px;">${item.ghi_chu || ''}</td>
          </tr>
        `;
      }
    });

    const isFsc100 = bb.chung_chi_fsc?.includes('100') ? '☑' : '☐';
    const isFscMix = bb.chung_chi_fsc?.toLowerCase().includes('mix') ? '☑' : '☐';
    const isFscCw = bb.chung_chi_fsc?.toLowerCase().includes('cw') ? '☑' : '☐';
    const isKls = (!bb.chung_chi_fsc || bb.chung_chi_fsc?.toUpperCase() === 'KLS') ? '☑' : '☐';
    const woodCategoryName = bb.loai_go ? `Gổ sơ chế thông thường - ${bb.loai_go}` : 'Gổ sơ chế thông thường-gỗ keo xẻ thô';

    // 1. Title Table
    const titleHeaderTableHtml = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; margin-bottom: 12px; font-family: 'Times New Roman', serif;">
        <tr>
          <td rowspan="2" width="22%" align="center" style="border: 1px solid #000000; padding: 6px; vertical-align: middle;">
            <div style="font-size: 28px; font-weight: 900; font-style: italic; color: #0d733e; font-family: 'Arial Black', Impact, sans-serif; line-height: 1.0;">NFC</div>
            <div style="font-size: 7.5px; font-weight: bold; font-style: italic; color: #0d733e; font-family: Arial, sans-serif; letter-spacing: 2.5px; line-height: 1.0; margin-top: 1px; padding-left: 2px; text-transform: uppercase;">NAFOCO</div>
          </td>
          <td width="53%" align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">
            QUY TRÌNH KIỂM HÀNG ĐẦU VÀO
          </td>
          <td width="25%" style="border: 1px solid #000000; padding: 6px; font-size: 10pt; text-align: left; font-family: 'Times New Roman', serif;">
            <strong>Mã số:</strong> BM01/QT01/QLCL1
          </td>
        </tr>
        <tr>
          <td align="center" style="border: 1px solid #000000; padding: 8px; font-weight: bold; font-size: 13.5pt; text-transform: uppercase;">
            BIÊN BẢN NGHIỆM THU GỖ KEO XẺ THÔ
          </td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 9.5pt; text-align: left; font-family: 'Times New Roman', serif;">
            <div><strong>Lần ban hành:</strong> 07</div>
            <div style="border-top: 1px dashed #d1d5db; margin-top: 3px; padding-top: 3px;"><strong>Ngày ban hành:</strong> 15/04/2023</div>
          </td>
        </tr>
      </table>
    `;

    // 2. Members & Supplier Grid matching exact mockup columns
    let membersAndMetaHtml = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; font-family: 'Times New Roman', serif; margin-bottom: 12px;">
        <tr style="font-weight: bold; text-align: center; font-size: 11pt;">
          <td width="5%" style="border: 1px solid #000000; padding: 6px;">TT</td>
          <td width="22%" style="border: 1px solid #000000; padding: 6px;">Thành Phần</td>
          <td width="23%" style="border: 1px solid #000000; padding: 6px;">Chức vụ</td>
          <td width="30%" style="border: 1px solid #000000; padding: 6px;">Đơn vị cung ứng</td>
          <td width="20%" style="border: 1px solid #000000; padding: 6px; text-align: left;">BBNT số: ${bb.ma_bbnt || 'GB100'}</td>
        </tr>
    `;

    const supplierRowSpan = displayMembers.length;
    displayMembers.forEach((m, idx) => {
      let docText = '';
      if (idx === 0) {
        docText = `Ngày NT: ${dateFormatted}`;
      }

      membersAndMetaHtml += `
        <tr style="font-family: 'Times New Roman', serif; font-size: 11pt;">
          <td align="center" style="border: 1px solid #000000; padding: 6px;">${idx + 1}</td>
          <td style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${m.ho_ten}</td>
          <td style="border: 1px solid #000000; padding: 6px;">${m.chuc_vu}</td>
          ${idx === 0 ? `
          <td rowspan="${supplierRowSpan}" align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold; text-transform: uppercase; font-size: 12pt; vertical-align: middle;">
            ${bb.don_vi_cung_ung || 'CÔNG TY GIA BẢO'}
          </td>
          ` : ''}
          <td align="left" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${docText}</td>
        </tr>
      `;
    });

    membersAndMetaHtml += `
        <tr style="font-family: 'Times New Roman', serif; font-size: 11pt;">
          <td colspan="3" style="border: 1px solid #000000; padding: 6px; text-align: left; font-weight: bold;">
            Tên - chủng loại gỗ: <span style="font-weight: normal;">${woodCategoryName}</span>
          </td>
          <td align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: middle;">
            Địa điểm Nhập
          </td>
          <td style="border: 1px solid #000000; padding: 6px; text-align: left; vertical-align: middle;">
            ${bb.dia_diem_nhap || ''}
          </td>
        </tr>
        <tr style="font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
          <td colspan="5" style="border: 1px solid #000000; padding: 6px; text-align: left; vertical-align: middle;">
            Trạng thái môi trường:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FSC 100% ${isFsc100}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FSC Mix ${isFscMix}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FSC CW ${isFscCw}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;KLS ${isKls}
          </td>
        </tr>
      </table>
    `;

    contentHtml = `
      ${titleHeaderTableHtml}
      ${membersAndMetaHtml}

      <div style="font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 15px; margin-bottom: 5px;">A. Tổng khối lượng giao nhận</div>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; margin-bottom: 12px; font-family: 'Times New Roman', serif;">
        <tr style="font-weight: bold; text-align: center; font-size: 11pt; background-color: #ffffff;">
          <td width="8%" style="border: 1px solid #000000; padding: 6px;">TT</td>
          <td style="border: 1px solid #000000; padding: 6px; text-align: center;">Quy cách kích thước (mm)</td>
          <td width="20%" style="border: 1px solid #000000; padding: 6px; text-align: center;">Đơn vị tính</td>
          <td width="25%" style="border: 1px solid #000000; padding: 6px; text-align: right;">Khối lượng (m3)</td>
        </tr>
        ${rowsA}
        <tr style="font-weight: bold; font-family: 'Times New Roman', serif; font-size: 11pt;">
          <td colspan="2" style="border: 1px solid #000000; padding: 6px;"></td>
          <td align="center" style="border: 1px solid #000000; padding: 6px; text-transform: uppercase;">Cộng</td>
          <td align="right" style="border: 1px solid #000000; padding: 6px;">${totalVolA.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
        </tr>
      </table>

      <div style="font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 15px; margin-bottom: 5px;">B. Kết luận khối lượng gỗ thực tế nhập kho</div>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; font-family: 'Times New Roman', serif;">
        <tr style="font-weight: bold; text-align: center; font-size: 11pt; background-color: #ffffff;">
          <td width="8%" style="border: 1px solid #000000; padding: 6px;">TT</td>
          <td style="border: 1px solid #000000; padding: 6px; text-align: center;">Quy cách kích thước</td>
          <td width="20%" style="border: 1px solid #000000; padding: 6px; text-align: right;">K. Lượng nguyên thủy</td>
          <td width="12%" style="border: 1px solid #000000; padding: 6px; text-align: center;">Tỉ lệ %</td>
          <td width="20%" style="border: 1px solid #000000; padding: 6px; text-align: right;">K. Lượng nhập kho</td>
          <td width="15%" style="border: 1px solid #000000; padding: 6px; text-align: left;">Ghi chú</td>
        </tr>
        ${rowsB}
        <tr style="font-weight: bold; font-family: 'Times New Roman', serif; font-size: 11pt;">
          <td colspan="2" align="center" style="border: 1px solid #000000; padding: 6px; text-transform: uppercase;">Cộng</td>
          <td align="right" style="border: 1px solid #000000; padding: 6px; color: red;">${totalVolA.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
          <td style="border: 1px solid #000000; padding: 6px;"></td>
          <td align="right" style="border: 1px solid #000000; padding: 6px; color: red;">${totalVolB.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
          <td style="border: 1px solid #000000; padding: 6px;"></td>
        </tr>
        <tr style="font-weight: bold; font-family: 'Times New Roman', serif; font-size: 11pt;">
          <td colspan="6" align="left" style="border: 1px solid #000000; padding: 8px;">
            Bằng chữ: <strong>${totalVolBWords} ./.</strong>
          </td>
        </tr>
        <tr style="font-weight: bold; font-family: 'Times New Roman', serif; font-size: 11pt;">
          <td colspan="6" style="border: 1px solid #000000; padding: 8px; text-align: left;">
            C. Kết luận chung lô hàng:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Đạt yêu cầu nhập kho ${bb.ket_luan === 'Đạt' ? '☑' : '☐'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Không đạt yêu cầu nhập kho ${bb.ket_luan !== 'Đạt' ? '☑' : '☐'}
          </td>
        </tr>
      </table>

      <table border="0" cellspacing="0" cellpadding="4" style="border-collapse: collapse; width: 100%; font-family: 'Times New Roman', serif; margin-top: 25px;" class="no-border">
        <tr style="font-weight: bold; font-size: 11pt; text-align: center; text-transform: uppercase;">
          <td width="20%" style="border: none;">Phó TGĐ</td>
          <td width="20%" style="border: none;">TP. PQLCL 1</td>
          <td width="20%" style="border: none;">Thủ kho</td>
          <td width="20%" style="border: none;">Đại diện ĐV cung ứng</td>
          <td width="20%" style="border: none;">Người lập</td>
        </tr>
        <tr style="font-size: 9pt; text-align: center; font-style: italic; color: #4b5563;">
          <td style="border: none;">(Ký & ghi rõ họ tên)</td>
          <td style="border: none;">(Ký & ghi rõ họ tên)</td>
          <td style="border: none;">(Ký & ghi rõ họ tên)</td>
          <td style="border: none;">(Ký & ghi rõ họ tên)</td>
          <td style="border: none;">(Ký & ghi rõ họ tên)</td>
        </tr>
        <tr style="height: 60px;">
          <td colspan="5" style="border: none;">&nbsp;</td>
        </tr>
        <tr style="font-weight: bold; font-size: 11pt; text-align: center;">
          <td style="border: none;">${bb.nguoi_ky_pho_tgd || ''}</td>
          <td style="border: none;">${bb.nguoi_ky_tp_pqlcl || ''}</td>
          <td style="border: none;">${bb.nguoi_ky_thu_kho || ''}</td>
          <td style="border: none;">${bb.nguoi_ky_dai_dien_ncc || ''}</td>
          <td style="border: none;">${bb.nguoi_ky_nguoi_lap || 'Ngô Văn Trường'}</td>
        </tr>
      </table>
    `;
  } else {
    // PAYMENT SETTLEMENT DETAILS REPORT (BM02/QT02/TCKT)
    const paymentRows = bb.bang_thanh_toan || [];
    const grandTotalVol = paymentRows.reduce((sum, r) => sum + (r.kl || 0), 0);
    const grandTotalMoney = paymentRows.reduce((sum, r) => sum + (r.thanh_tien || 0), 0);

    const hasThuongColumn = paymentRows.some(p => p.thuong !== 0 && p.thuong !== undefined && p.thuong !== null);
    const hasVanChuyenColumn = paymentRows.some(p => p.van_chuyen !== 0 && p.van_chuyen !== undefined && p.van_chuyen !== null && p.van_chuyen !== '' && p.van_chuyen !== '0');
    const hasFscColumn = paymentRows.some(p => p.hd_fsc !== 0 && p.hd_fsc !== undefined && p.hd_fsc !== null && p.hd_fsc !== '' && p.hd_fsc !== '0');
    const hasThanhToanColumn = paymentRows.some(p => p.thanh_toan !== 0 && p.thanh_toan !== undefined && p.thanh_toan !== null);

    const adjustmentColumnsCount = (hasThuongColumn ? 1 : 0) + (hasVanChuyenColumn ? 1 : 0) + (hasFscColumn ? 1 : 0) + (hasThanhToanColumn ? 1 : 0);
    const visibleColumnsCount = 7 + adjustmentColumnsCount;

    const renderAdjustment = (val: any) => {
      if (val === undefined || val === null || val === '') return '—';
      const num = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(num) || num === 0) return '—';
      return num > 0 ? `+${num.toLocaleString('vi-VN')}` : num.toLocaleString('vi-VN');
    };

    const tableRowsHtml = paymentRows.map((p, idx) => {
      let extraCells = '';
      if (hasThuongColumn) {
        extraCells += `<td align="center" style="border: 1px solid #000000; padding: 6px;">${renderAdjustment(p.thuong)}</td>`;
      }
      if (hasVanChuyenColumn) {
        extraCells += `<td align="center" style="border: 1px solid #000000; padding: 6px;">${renderAdjustment(p.van_chuyen)}</td>`;
      }
      if (hasFscColumn) {
        extraCells += `<td align="center" style="border: 1px solid #000000; padding: 6px;">${renderAdjustment(p.hd_fsc)}</td>`;
      }
      if (hasThanhToanColumn) {
        extraCells += `<td align="center" style="border: 1px solid #000000; padding: 6px;">${renderAdjustment(p.thanh_toan)}</td>`;
      }

      const pPrice = p.don_gia || 0;
      const pPriceTong = p.don_gia_tong || pPrice;
      const pThanhTien = p.thanh_tien || 0;

      return `
        <tr style="font-family: 'Times New Roman', serif; font-size: 10.5pt;">
          <td align="center" style="border: 1px solid #000000; padding: 6px;">${p.stt || idx + 1}</td>
          <td style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${p.ten_hang}</td>
          <td align="center" style="border: 1px solid #000000; padding: 6px;">m3</td>
          <td align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${(p.kl || 0).toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
          <td align="center" style="border: 1px solid #000000; padding: 6px;">${pPrice.toLocaleString('vi-VN')}</td>
          ${extraCells}
          <td align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold;">${pPriceTong.toLocaleString('vi-VN')}</td>
          <td align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold; background-color: #ffffff;">${pThanhTien.toLocaleString('vi-VN')}</td>
        </tr>
      `;
    }).join('');

    // Additional extra costs block for Word output
    let extraCostsHtml = '';
    if (bb.phat_sinh_chi_phi && bb.phat_sinh_chi_phi.length > 0) {
      extraCostsHtml += `
        <tr style="font-family: 'Times New Roman', serif; font-size: 10.5pt; font-weight: bold;">
          <td colspan="${visibleColumnsCount}" style="border: 1px solid #000000; padding: 6px; text-transform: uppercase; background-color: #ffffff;">
            CHI PHÍ PHÁT SINH VÀ PHẠT GIẢM TRỪ ĐIỀU CHỈNH TÀI CHÍNH
          </td>
        </tr>
      `;
      bb.phat_sinh_chi_phi.forEach((cost) => {
        const sign = cost.type === 'plus' ? '+' : '-';
        extraCostsHtml += `
          <tr style="font-family: 'Times New Roman', serif; font-size: 10.5pt; font-style: italic;">
            <td align="center" style="border: 1px solid #000000; padding: 5px;">—</td>
            <td colspan="2" style="border: 1px solid #000000; padding: 5px; font-weight: bold;">${cost.name}</td>
            <td align="center" style="border: 1px solid #000000; padding: 5px;">—</td>
            <td align="center" style="border: 1px solid #000000; padding: 5px;">—</td>
            ${hasThuongColumn ? '<td align="center" style="border: 1px solid #000000; padding: 5px;">—</td>' : ''}
            ${hasVanChuyenColumn ? '<td align="center" style="border: 1px solid #000000; padding: 5px;">—</td>' : ''}
            ${hasFscColumn ? '<td align="center" style="border: 1px solid #000000; padding: 5px;">—</td>' : ''}
            ${hasThanhToanColumn ? '<td align="center" style="border: 1px solid #000000; padding: 5px;">—</td>' : ''}
            <td align="center" style="border: 1px solid #000000; padding: 5px; font-weight: bold;">${sign}${cost.amount?.toLocaleString('vi-VN')}</td>
            <td align="center" style="border: 1px solid #000000; padding: 5px; font-weight: bold; color: ${cost.type === 'plus' ? '#166534' : '#991b1b'};">${sign}${cost.amount?.toLocaleString('vi-VN')}</td>
          </tr>
        `;
      });
    }

    const textTotalAmount = translateMoneyToWords(grandTotalMoney);
    const finalNguoiLap = bb.nguoi_ky_nguoi_lap || "Ngô Văn Trường";

    // Build spacing columns for totals
    let footerEmptyAdjustments = '';
    for (let c = 0; c < adjustmentColumnsCount; c++) {
      footerEmptyAdjustments += '<td style="border: 1px solid #000000; padding: 6px;"></td>';
    }

    // 1. Header Grid
    const paymentHeaderTableHtml = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; margin-bottom: 12px; font-family: 'Times New Roman', serif;">
        <tr>
          <td rowspan="2" width="22%" align="center" style="border: 1px solid #000000; padding: 6px; vertical-align: middle;">
            <div style="font-size: 28px; font-weight: 900; font-style: italic; color: #0d733e; font-family: 'Arial Black', Impact, sans-serif; line-height: 1.0;">NFC</div>
            <div style="font-size: 7.5px; font-weight: bold; font-style: italic; color: #0d733e; font-family: Arial, sans-serif; letter-spacing: 2.5px; line-height: 1.0; margin-top: 1px; padding-left: 2px; text-transform: uppercase;">FINANCE</div>
          </td>
          <td width="53%" align="center" style="border: 1px solid #000000; padding: 6px; font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">
            QUY TRÌNH THANH TOÁN LÂM SẢN
          </td>
          <td rowspan="2" width="25%" style="border: 1px solid #000000; padding: 6px; font-size: 9.5pt; text-align: left; vertical-align: middle;">
            <strong>Ngày lập:</strong> ${dateFormatted}
          </td>
        </tr>
        <tr>
          <td align="center" style="border: 1px solid #000000; padding: 8px; font-weight: bold; font-size: 13.5pt; text-transform: uppercase;">
            BẢNG CHI TIẾT THANH TOÁN GỖ
          </td>
        </tr>
      </table>
    `;

    // 2. Contract Metadata grid
    const metadataPanelHtml = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; font-family: 'Times New Roman', serif; font-size: 11pt; margin-bottom: 12px; background-color: #ffffff;">
        <tr>
          <td width="50%" style="border: 1px solid #000000; padding: 6px;">
            <strong>Cơ sở nghiệm thu đối chiếu:</strong> BBGN số: <span style="font-weight: bold;">${bb.ma_bbnt}</span>
          </td>
          <td width="50%" style="border: 1px solid #000000; padding: 6px;">
            <strong>Trực thuộc vùng quản lý:</strong> <span style="font-weight: bold;">${bb.vung_quan_ly || 'Vùng Thanh Hóa'}</span>
          </td>
        </tr>
        <tr>
          <td style="border: 1px solid #000000; padding: 6px;">
            <strong>Đơn vị cung ứng (Bên bán):</strong> <span style="font-weight: bold; text-transform: uppercase;">${bb.don_vi_cung_ung}</span>
          </td>
          <td style="border: 1px solid #000000; padding: 6px;">
            <strong>Phương án logistics:</strong> <span>${bb.phuong_thuc_van_chuyen || 'Cước vận tải ghép'} ${bb.ten_don_vi_van_chuyen ? `(${bb.ten_don_vi_van_chuyen})` : ''}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border: 1px solid #000000; padding: 6px;">
            <strong>Danh mục lâm sản giao nhận:</strong> <span>${bb.loai_go || 'Gỗ keo xẻ trồng rừng chuẩn FSC'}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border: 1px solid #000000; padding: 6px;">
            <strong>Địa điểm nhập kho:</strong> <span>${bb.dia_diem_nhap}</span>
          </td>
        </tr>
      </table>
    `;

    contentHtml = `
      ${paymentHeaderTableHtml}
      ${metadataPanelHtml}

      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; font-family: 'Times New Roman', serif; margin-bottom: 12px;">
        <thead>
          <tr style="font-weight: bold; text-align: center; font-size: 10.5pt; background-color: #ffffff;">
            <td width="4%" style="border: 1px solid #000000; padding: 6px;">TT</td>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center;">TÊN HÀNG</td>
            <td width="6%" style="border: 1px solid #000000; padding: 6px;">ĐVT</td>
            <td width="14%" style="border: 1px solid #000000; padding: 6px; text-align: center;">KHỐI LƯỢNG (M³)</td>
            <td width="11%" style="border: 1px solid #000000; padding: 6px; text-align: center;">ĐƠN GIÁ GỐC</td>
            ${hasThuongColumn ? '<td width="10%" style="border: 1px solid #000000; padding: 6px; text-align: center;">THƯỞNG</td>' : ''}
            ${hasVanChuyenColumn ? '<td width="10%" style="border: 1px solid #000000; padding: 6px; text-align: center;">VẬN CHUYỂN</td>' : ''}
            ${hasFscColumn ? '<td width="10%" style="border: 1px solid #000000; padding: 6px; text-align: center;">HĐ FSC</td>' : ''}
            ${hasThanhToanColumn ? '<td width="10%" style="border: 1px solid #000000; padding: 6px; text-align: center;">THANH TOÁN</td>' : ''}
            <td width="11%" style="border: 1px solid #000000; padding: 6px; text-align: center;">ĐƠN GIÁ TT</td>
            <td width="14%" style="border: 1px solid #000000; padding: 6px; text-align: center;">THÀNH TIỀN (VND)</td>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
          ${extraCostsHtml}
          <tr style="font-weight: bold; font-family: 'Times New Roman', serif; font-size: 11pt;">
            <td colspan="3" align="center" style="border: 1px solid #000000; padding: 6px; text-transform: uppercase;">CỘNG</td>
            <td align="center" style="border: 1px solid #000000; padding: 6px; color: #000000;">${(grandTotalVol).toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
            <td style="border: 1px solid #000000; padding: 6px;"></td>
            ${footerEmptyAdjustments}
            <td style="border: 1px solid #000000; padding: 6px;"></td>
            <td align="center" style="border: 1px solid #000000; padding: 6px; color: red;">${grandTotalMoney.toLocaleString('vi-VN')}</td>
          </tr>
          <tr style="font-weight: bold; font-family: 'Times New Roman', serif; font-size: 11pt;">
            <td colspan="${visibleColumnsCount}" align="left" style="border: 1px solid #000000; padding: 8px;">
              BẰNG CHỮ: <strong>${textTotalAmount} ./.</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <table border="0" cellspacing="0" cellpadding="4" style="border-collapse: collapse; width: 100%; font-family: 'Times New Roman', serif; margin-top: 25px;" class="no-border">
        <tr style="font-weight: bold; font-size: 10.5pt; text-align: center; text-transform: uppercase;">
          <td width="20%" style="border: none;">Trưởng bộ phận nguyên liệu</td>
          <td width="20%" style="border: none;">TP. Kế hoạch vận tư</td>
          <td width="20%" style="border: none;">Thủ kho nhận gỗ</td>
          <td width="20%" style="border: none;">Đại diện bên bán</td>
          <td width="20%" style="border: none;">Người lập biểu hạch toán</td>
        </tr>
        <tr style="font-size: 9pt; text-align: center; font-style: italic; color: #4b5563;">
          <td style="border: none;">(Ký, đóng dấu & phê duyệt)</td>
          <td style="border: none;">(Ký & ghi rõ họ tên)</td>
          <td style="border: none;">(Ký & ghi rõ họ tên)</td>
          <td style="border: none;">(Ký & ghi rõ họ tên)</td>
          <td style="border: none;">(Ký & ghi rõ họ tên)</td>
        </tr>
        <tr style="height: 60px;">
          <td colspan="5" style="border: none;">&nbsp;</td>
        </tr>
        <tr style="font-weight: bold; font-size: 10.5pt; text-align: center;">
          <td style="border: none;">Trần Anh Tuấn</td>
          <td style="border: none;"></td>
          <td style="border: none;"></td>
          <td style="border: none;">${bb.nguoi_ky_dai_dien_ncc || 'Đại diện bên bán'}</td>
          <td style="border: none;">${finalNguoiLap}</td>
        </tr>
      </table>
    `;
  }

  // standard Word file container header and footer envelopes
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>Export Doc</title>
      <style>
        @page {
          size: 21cm 29.7cm; /* A4 page dimensions */
          margin: 1.5cm 1.5cm 1.5cm 1.5cm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.35;
          color: #000000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        table[border="1"] th, table[border="1"] td {
          border: 1px solid #000000 !important;
          padding: 7px 5px !important;
        }
        table.no-border td, table.no-border th, .no-border td, .no-border th {
          border: none !important;
          padding: 4px !important;
        }
      </style>
    </head>
    <body>
  `;

  const footer = `
    </body>
    </html>
  `;

  const fullHtml = header + contentHtml + footer;
  const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const fileNameSuffix = type === 'qc' ? 'BM01_QC_Nghiem_Thu' : 'BM02_TT_Thanh_Toan';
  link.download = `${fileNameSuffix}_${bb.ma_bbnt}.doc`;
  link.click();

  URL.revokeObjectURL(url);
}
