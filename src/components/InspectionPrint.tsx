/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BienBan, ThanhPhan } from '../types';
import { numberToVietnameseWords, formatVolume, translateMoneyToWords } from '../utils';
import { Printer, ArrowLeft, Layers, CreditCard, Receipt, FileSpreadsheet, FileText, Image as ImageIcon, FileDown, Loader2, ExternalLink } from 'lucide-react';
import { exportInspectionToExcel, exportPaymentToExcel } from '../excelExport';
import { exportToImage } from '../utils/exportHelpers';
import { buildPrintCss, getPrintTemplate } from '../printTemplateSettings';

interface InspectionPrintProps {
  bienBan: BienBan;
  onBack: () => void;
  initialPrintMode?: 'qc' | 'payment';
  currentUser?: { username: string; email: string; fullName: string; role: string; avatar?: string };
}

export default function InspectionPrint({ bienBan, onBack, initialPrintMode = 'qc', currentUser }: InspectionPrintProps) {
  const qcPrintSettings = getPrintTemplate('qc_report');
  const paymentPrintSettings = getPrintTemplate('payment_detail');
  const [isInIframe, setIsInIframe] = useState(false);

  const parseDateParts = (dateStr: string) => {
    if (!dateStr) return { day: '...', month: '...', year: '...' };
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return {
          day: parseInt(parts[2], 10).toString(),
          month: parseInt(parts[1], 10).toString(),
          year: parts[0]
        };
      } else {
        return {
          day: parseInt(parts[0], 10).toString(),
          month: parseInt(parts[1], 10).toString(),
          year: parts[2]
        };
      }
    }
    return { day: '26', month: '5', year: '2026' };
  };

  const isSubRow = (tenHang: string) => {
    const norm = (tenHang || '').trim().toLowerCase();
    return (
      norm.startsWith('loại 2') || 
      norm.startsWith('loại 3') || 
      norm === 'loại 2' || 
      norm === 'loại 3' || 
      norm === 'loại tận dụng' || 
      norm === 'loại 2.1' || 
      norm.startsWith('loại 2.1') || 
      norm.startsWith('tấm') ||
      norm.startsWith('l2') ||
      norm.startsWith('l3')
    );
  };

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  const userRole = currentUser?.role || '';
  const isQcc = userRole.includes('QCC') || userRole.includes('QC') || userRole.toLowerCase().includes('kiểm hàng');
  const isNlg = userRole.includes('NLG') || userRole.includes('Thu Mua') || userRole.toLowerCase().includes('nguyên liệu');

  // Stateful print mode selection inside the print preview for maximum flexibility
  const [printMode, setPrintMode] = useState<'qc' | 'payment' | 'both'>(initialPrintMode);

  const [capturingQc, setCapturingQc] = useState(false);
  const [capturingPay, setCapturingPay] = useState(false);

  // Custom user preferences for editing mode, document font, and dynamic column toggles
  const isEditable = false;
  const selectedFont = 'times';

  // --- PAGE 1 EDITABLE STATES ---
  const [quyTrinhTitle1, setQuyTrinhTitle1] = useState("QUY TRÌNH KIỂM HÀNG ĐẦU VÀO");
  const [maSoQc, setMaSoQc] = useState("BM01/QT01/QLCL1");
  const [bienBanTitle1, setBienBanTitle1] = useState(qcPrintSettings.titleText || "BIÊN BẢN NGHIỆM THU GỖ KEO XẺ THÔ");
  const [lanBanHanhQc, setLanBanHanhQc] = useState("07");
  const [ngayBanHanhQc, setNgayBanHanhQc] = useState("15/04/2023");

  const [maBbnt, setMaBbnt] = useState(bienBan.ma_bbnt || "GB 06.06");
  const [ngayNt, setNgayNt] = useState(() => {
    return bienBan.ngay_nt ? new Date(bienBan.ngay_nt).toLocaleDateString('vi-VN') : "";
  });
  const [donViCungUng, setDonViCungUng] = useState(bienBan.don_vi_cung_ung || "");
  const [maNcc, setMaNcc] = useState(bienBan.ma_ncc || "");
  const [loaiGo, setLoaiGo] = useState(bienBan.loai_go || "gỗ keo xẻ thô");
  const [diaDiemNhap, setDiaDiemNhap] = useState(bienBan.dia_diem_nhap || "NMSX đồ gỗ nội thất Xuất Khẩu");

  // FSC Option State: 'fsc100' | 'fscMix' | 'fscCw' | 'kls'
  const [fscOption, setFscOption] = useState(() => {
    const fsc = bienBan.chung_chi_fsc?.toUpperCase() || "";
    if (fsc.includes('100')) return 'fsc100';
    if (fsc.includes('MIX')) return 'fscMix';
    if (fsc.includes('CW')) return 'fscCw';
    return 'kls';
  });

  // Section C (Kết luận): 'Đạt' | 'Không đạt'
  const [ketLuan, setKetLuan] = useState(bienBan.ket_luan || "Đạt");

  // Members of Page 1 list
  const [members, setMembers] = useState(() => {
    const list = [];
    list.push({
      id: "1",
      stt: 1,
      ho_ten: bienBan.nguoi_ky_nguoi_lap || "Ngô Văn Trường",
      chuc_vu: "Người lập biên bản (QC)"
    });
    const savedQC = bienBan.thanh_phan?.find(m => m.stt === 2 || m.chuc_vu.toLowerCase().includes("qc"));
    list.push({
      id: "2",
      stt: 2,
      ho_ten: savedQC?.ho_ten || "Đặng Văn Tùng",
      chuc_vu: "QC bộ phận QLCL1"
    });
    list.push({
      id: "3",
      stt: 3,
      ho_ten: bienBan.nguoi_ky_thu_kho || "Trần Ngọc Ánh",
      chuc_vu: "Thủ kho gỗ"
    });
    return list;
  });

  // --- PAGE 1 SIGNATURE TITLES & NAMES ---
  const [sigPhoTgdTitle, setSigPhoTgdTitle] = useState("Phó TGĐ");
  const [sigPhoTgdName, setSigPhoTgdName] = useState(bienBan.nguoi_ky_pho_tgd || "");

  const [sigTpPqlclTitle, setSigTpPqlclTitle] = useState("TP. PQLCL 1");
  const [sigTpPqlclName, setSigTpPqlclName] = useState(bienBan.nguoi_ky_tp_pqlcl || "");

  const [sigThuKhoTitle, setSigThuKhoTitle] = useState("Thủ kho");
  const [sigThuKhoName, setSigThuKhoName] = useState(bienBan.nguoi_ky_thu_kho || "Trần Ngọc Ánh");

  const [sigDaiDienNccTitle, setSigDaiDienNccTitle] = useState("Đại diện ĐV cung ứng");
  const [sigDaiDienNccName, setSigDaiDienNccName] = useState(bienBan.nguoi_ky_dai_dien_ncc || "");

  const [sigNguoiLapTitle, setSigNguoiLapTitle] = useState("Người lập");
  const [sigNguoiLapName, setSigNguoiLapName] = useState(bienBan.nguoi_ky_nguoi_lap || "Ngô Văn Trường");

  // --- PAGE 2 EDITABLE STATES ---
  const [quyTrinhTitle2, setQuyTrinhTitle2] = useState("QUY TRÌNH THANH TOÁN LÂM SẢN");
  const [maSoPay, setMaSoPay] = useState("BM02/QT02/TCKT");
  const [bienBanTitle2, setBienBanTitle2] = useState(paymentPrintSettings.titleText || "BẢNG CHI TIẾT THANH TOÁN GỖ");
  const [lanBanHanhPay, setLanBanHanhPay] = useState("03");
  const [ngayThanhToanPay, setNgayThanhToanPay] = useState(() => {
    return bienBan.ngay_nt ? new Date(bienBan.ngay_nt).toLocaleDateString('vi-VN') : "";
  });

  const [soHopDongPay, setSoHopDongPay] = useState(() => (bienBan as any).so_hop_dong || "");
  const [ngayHopDongPay, setNgayHopDongPay] = useState(() => (bienBan as any).ngay_hop_dong || "");

  const [vungQuanLy, setVungQuanLy] = useState(bienBan.vung_quan_ly || "Vùng Thanh Hóa");
  const [phuongAnLogistics, setPhuongAnLogistics] = useState(bienBan.phuong_thuc_van_chuyen || "Cước vận tải ghép");
  const [danhMucLamSan, setDanhMucLamSan] = useState(bienBan.loai_go || "Gỗ keo xẻ trồng rừng chuẩn FSC");
  const [diemDoBai, setDiemDoBai] = useState(bienBan.dia_diem_nhap || "NMSX đồ gỗ nội thất Xuất Khẩu");

  // Editable lists for tables
  const [quyCachA, setQuyCachA] = useState(() => [...bienBan.quy_cach_a]);
  const [quyCachB, setQuyCachB] = useState(() => 
    bienBan.quy_cach_b.map(row => ({
      ...row,
      chi_tiet: row.chi_tiet ? row.chi_tiet.map(ct => ({ ...ct })) : []
    }))
  );
  const isTransportPaymentRow = (row: any) => {
    const tenHang = (row?.ten_hang || '').trim().toLowerCase();
    const phanHang = (row?.phan_hang || '').trim().toLowerCase();
    return tenHang.startsWith('cước vc') || phanHang.startsWith('vc ');
  };

  const [paymentRows, setPaymentRows] = useState(() => 
    (bienBan.bang_thanh_toan || [])
      .filter(row => !isTransportPaymentRow(row))
      .map(row => ({ ...row }))
  );
  const [phatSinhChiPhi, setPhatSinhChiPhi] = useState(() => 
    (bienBan.phat_sinh_chi_phi || []).map(item => ({ ...item }))
  );

  // Editable signature text states for the payment sheet ("Bảng chi tiết thanh toán gỗ") with localStorage memory
  const [nguoiLapTitle, setNguoiLapTitle] = useState(() => {
    return localStorage.getItem('payment_nguoi_lap_title') || "Người lập";
  });

  const [nguoiLapOptions, setNguoiLapOptions] = useState<string[]>(() => {
    const stored = localStorage.getItem('payment_nguoi_lap_options');
    return stored ? JSON.parse(stored) : ["Nguyễn Thị Mai Hiên", "Ngô Văn Trường", "Nguyễn Minh Đức", "Trần Quốc Bảo"];
  });

  const [nguoiLapName, setNguoiLapNameState] = useState(() => {
    return localStorage.getItem('payment_selected_nguoi_lap_name') || "Nguyễn Thị Mai Hiên";
  });

  const [truongBoPhanTitle, setTruongBoPhanTitle] = useState(() => {
    return localStorage.getItem('payment_truong_bo_phan_title') || "PT. Bộ phận";
  });

  const [truongBoPhanOptions, setTruongBoPhanOptions] = useState<string[]>(() => {
    const stored = localStorage.getItem('payment_truong_bo_phan_options');
    return stored ? JSON.parse(stored) : ["Bùi Văn Thám", "Trần Anh Tuấn", "Phạm Đức Thắng", "Vương Đình Huệ"];
  });

  const [truongBoPhanName, setTruongBoPhanNameState] = useState(() => {
    return localStorage.getItem('payment_selected_truong_bo_phan_name') || "Bùi Văn Thám";
  });

  const handleUpdateNguoiLapName = (val: string) => {
    setNguoiLapNameState(val);
    localStorage.setItem('payment_selected_nguoi_lap_name', val);
    if (val && val.trim() !== "" && !nguoiLapOptions.includes(val)) {
      const updated = [...nguoiLapOptions, val];
      setNguoiLapOptions(updated);
      localStorage.setItem('payment_nguoi_lap_options', JSON.stringify(updated));
    }
  };

  const handleUpdateTruongBoPhanName = (val: string) => {
    setTruongBoPhanNameState(val);
    localStorage.setItem('payment_selected_truong_bo_phan_name', val);
    if (val && val.trim() !== "" && !truongBoPhanOptions.includes(val)) {
      const updated = [...truongBoPhanOptions, val];
      setTruongBoPhanOptions(updated);
      localStorage.setItem('payment_truong_bo_phan_options', JSON.stringify(updated));
    }
  };

  const handleUpdateNguoiLapTitle = (val: string) => {
    setNguoiLapTitle(val);
    localStorage.setItem('payment_nguoi_lap_title', val);
  };

  const handleUpdateTruongBoPhanTitle = (val: string) => {
    setTruongBoPhanTitle(val);
    localStorage.setItem('payment_truong_bo_phan_title', val);
  };

  // Auto-initiate print dialogue on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn("Auto-print triggered in restricted environment:", err);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Sync inputs, selects, and textareas inside the documents with the isEditable state
  useEffect(() => {
    const doc1 = document.getElementById('wood-inspection-document');
    const doc2 = document.getElementById('wood-payment-document');
    const documents = [doc1, doc2].filter(Boolean) as HTMLElement[];
    
    documents.forEach(doc => {
      const inputs = doc.querySelectorAll('input, textarea, select');
      inputs.forEach(el => {
        if (el.getAttribute('data-always-editable') === 'true') {
          el.removeAttribute('tabindex');
          el.removeAttribute('readonly');
          if (el.tagName === 'SELECT') {
            el.removeAttribute('disabled');
          }
          return;
        }
        if (!isEditable) {
          el.setAttribute('tabindex', '-1');
          el.setAttribute('readonly', 'true');
          if (el.tagName === 'SELECT') {
            el.setAttribute('disabled', 'true');
          }
        } else {
          el.removeAttribute('tabindex');
          el.removeAttribute('readonly');
          if (el.tagName === 'SELECT') {
            el.removeAttribute('disabled');
          }
        }
      });
    });
  }, [isEditable, printMode, paymentRows, phatSinhChiPhi, members, quyCachA, quyCachB]);

  const totalQtyA = quyCachA.reduce((acc, curr) => acc + (curr.so_thanh || 0), 0);
  const totalVolA = quyCachA.reduce((acc, curr) => acc + (curr.kl_nguyen_thuy || 0), 0);

  const totalVolB = quyCachB.reduce((sum, r) => {
    if (r.co_phan_loai && r.chi_tiet && r.chi_tiet.length > 0) {
      return sum + r.chi_tiet.reduce((s, c) => s + (c.kl_nhap_kho || 0), 0);
    }
    return sum + (r.kl_tong || 0);
  }, 0);

  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error("Print error:", err);
    }
  };

  // Organize B row detailed mappings, exactly matching image layout with inline editors
  const bRowsHtml: React.ReactNode[] = [];
  let runningIndexB = 1;

  quyCachB.forEach((row, idx) => {
    const rowA = quyCachA.find(a => a.id === row.id) || { so_thanh: 0, kl_nguyen_thuy: 0 };
    const hasParts = row.co_phan_loai && row.chi_tiet && row.chi_tiet.length > 0;

    if (!hasParts) {
      // Straight import straight 100% row
      bRowsHtml.push(
        <tr key={row.id || idx} className="border-b border-black text-[11px] h-6.5">
          <td className="border-r border-black p-1 text-center font-serif font-medium">{runningIndexB++}</td>
          <td className="border-r border-black px-2 py-0.5 text-center font-bold">
            <input
              type="text"
              value={row.kich_thuoc_mm}
              onChange={(e) => {
                const updated = [...quyCachB];
                updated[idx].kich_thuoc_mm = e.target.value;
                setQuyCachB(updated);
              }}
              className="bg-transparent text-center font-normal text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
            />
          </td>
          <td className="border-r border-black px-2 py-0.5 text-center font-serif font-semibold">
            {formatVolume(rowA.kl_nguyen_thuy)}
          </td>
          <td className="border-r border-black p-1 text-center font-serif text-slate-700">100</td>
          <td className="border-r border-black px-2 py-0.5 text-center font-serif font-semibold">
            {formatVolume(rowA.kl_nguyen_thuy)}
          </td>
          <td className="px-2 py-0.5 text-left font-sans text-[10px] text-slate-500">
            <input
              type="text"
              value={row.ghi_chu || ""}
              onChange={(e) => {
                const updated = [...quyCachB];
                updated[idx].ghi_chu = e.target.value;
                setQuyCachB(updated);
              }}
              className="bg-transparent text-left font-normal text-slate-500 border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
              placeholder="..."
            />
          </td>
        </tr>
      );
    } else {
      // Classification split row: Write parent header
      bRowsHtml.push(
        <tr key={row.id || idx} className="border-b border-black text-[11px] bg-slate-50/10 font-bold h-6.5">
          <td className="border-r border-black p-1 text-center font-serif font-black">{runningIndexB++}</td>
          <td className="border-r border-black px-2 py-0.5 text-center font-bold text-slate-900">
            <input
              type="text"
              value={row.kich_thuoc_mm}
              onChange={(e) => {
                const updated = [...quyCachB];
                updated[idx].kich_thuoc_mm = e.target.value;
                setQuyCachB(updated);
              }}
              className="bg-transparent text-center font-normal text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
            />
          </td>
          <td className="border-r border-black px-2 py-0.5 text-center font-serif font-bold text-slate-900">
            {formatVolume(rowA.kl_nguyen_thuy)}
          </td>
          <td className="border-r border-black p-1 text-center font-serif"></td>
          <td className="border-r border-black px-2 py-0.5 text-center font-serif"></td>
          <td className="px-2 py-0.5 text-left font-sans text-[10px] text-slate-500">
            <input
              type="text"
              value={row.ghi_chu || ""}
              onChange={(e) => {
                const updated = [...quyCachB];
                updated[idx].ghi_chu = e.target.value;
                setQuyCachB(updated);
              }}
              className="bg-transparent text-left font-normal text-slate-500 border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
              placeholder="..."
            />
          </td>
        </tr>
      );

      // Write subgrades row children
      row.chi_tiet?.forEach((item, subIdx) => {
        bRowsHtml.push(
          <tr key={`${row.id}-${item.id || subIdx}`} className="border-b border-black text-[11px] h-5">
            <td className="border-r border-black p-1 text-center font-serif"></td>
            <td className="border-r border-black px-4 py-0.5 text-left pl-8 text-slate-700 font-medium">
              <input
                type="text"
                value={item.ten_loai}
                onChange={(e) => {
                  const updated = [...quyCachB];
                  const parentRow = updated.find(r => r.id === row.id);
                  if (parentRow && parentRow.chi_tiet) {
                    parentRow.chi_tiet[subIdx].ten_loai = e.target.value;
                    setQuyCachB(updated);
                  }
                }}
                className="bg-transparent text-left text-slate-700 font-medium border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent pl-2"
              />
            </td>
            <td className="border-r border-black px-2 py-0.5 text-center font-serif text-slate-350"></td>
            <td className="border-r border-black p-1 text-center font-serif text-slate-650">
              <input
                type="number"
                step="0.1"
                value={item.ti_le}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const updated = [...quyCachB];
                  const parentRow = updated.find(r => r.id === row.id);
                  if (parentRow && parentRow.chi_tiet) {
                    parentRow.chi_tiet[subIdx].ti_le = val;
                    if (rowA) {
                      parentRow.chi_tiet[subIdx].kl_nhap_kho = Number(((rowA.kl_nguyen_thuy * val) / 100).toFixed(3));
                    }
                    setQuyCachB(updated);
                  }
                }}
                className="bg-transparent text-center font-serif text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
              />
            </td>
            <td className="border-r border-black px-2 py-0.5 text-center font-serif font-bold text-slate-850">
              <input
                type="number"
                step="0.001"
                value={item.kl_nhap_kho !== undefined && item.kl_nhap_kho !== null ? parseFloat(item.kl_nhap_kho.toFixed(3)) : ''}
                onChange={(e) => {
                  const val = parseFloat(parseFloat(e.target.value).toFixed(3)) || 0;
                  const updated = [...quyCachB];
                  const parentRow = updated.find(r => r.id === row.id);
                  if (parentRow && parentRow.chi_tiet) {
                    parentRow.chi_tiet[subIdx].kl_nhap_kho = val;
                    if (rowA && rowA.kl_nguyen_thuy > 0) {
                      parentRow.chi_tiet[subIdx].ti_le = Number(((val / rowA.kl_nguyen_thuy) * 100).toFixed(1));
                    }
                    setQuyCachB(updated);
                  }
                }}
                className="bg-transparent text-center font-serif font-normal text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
              />
            </td>
            <td className="px-2 py-0.5 text-left font-sans text-[10px] text-slate-400">
              <input
                type="text"
                value={item.ghi_chu || ""}
                onChange={(e) => {
                  const updated = [...quyCachB];
                  const parentRow = updated.find(r => r.id === row.id);
                  if (parentRow && parentRow.chi_tiet) {
                    parentRow.chi_tiet[subIdx].ghi_chu = e.target.value;
                    setQuyCachB(updated);
                  }
                }}
                className="bg-transparent text-left font-normal text-slate-400 border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                placeholder="..."
              />
            </td>
          </tr>
        );
      });
    }
  });

  // Handler to update payment row cells and trigger recalculation
  const handleUpdatePaymentField = (index: number, field: string, val: any) => {
    const updated = [...paymentRows];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    // Recalculate and update state
    updated[index] = recalculatePaymentRow(updated[index]);
    setPaymentRows(updated);
  };

  // Helper to recalculate unit pricing & line items
  const recalculatePaymentRow = (row: typeof paymentRows[0]) => {
    const kl = parseFloat(row.kl as any) || 0;
    const don_gia = parseFloat(row.don_gia as any) || 0;
    const thuong = parseFloat(row.thuong as any) || 0;
    const van_chuyen = parseFloat(row.van_chuyen as any) || 0;
    const hd_fsc = parseFloat(row.hd_fsc as any) || 0;
    const thanh_toan = parseFloat(row.thanh_toan as any) || 0;
    
    const don_gia_tong = don_gia + thuong + van_chuyen + hd_fsc + thanh_toan;
    const thanh_tien = Number((kl * don_gia_tong).toFixed(0));
    
    return {
      ...row,
      don_gia_tong,
      thanh_tien
    };
  };

  // Calculate accounting variables for second tab / page 2
  const totalPaymentVol = paymentRows.reduce((sum, r) => sum + (r.kl || 0), 0);
  const baseTotal = paymentRows.reduce((sum, r) => sum + (r.thanh_tien || 0), 0);
  const incurredTotal = phatSinhChiPhi.reduce(
    (sum, item) => sum + (item.type === 'plus' ? (item.amount || 0) : -(item.amount || 0)),
    0
  );
  const grandTotal = Math.max(0, baseTotal + incurredTotal);

  const cleanPaymentWoodName = (value?: string) => {
    const raw = (value || '').replace(/\s+/g, ' ').trim();
    if (!raw) return 'gỗ keo xẻ thô';

    // Chuẩn hoá đúng 1 phần tên gỗ, không để lặp dòng sai trong mẫu thanh toán.
    return raw
      .replace(/^Gỗ\s+sơ\s+chế\s+thông\s+thường\s*-\s*/i, '')
      .replace(/\s+theo\s+HĐ\s+số:.*$/i, '')
      .trim();
  };

  const formatShortDateNoLeadingZero = (value?: string) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(raw)) {
      const [y, m, d] = raw.split('T')[0].split('-').map(Number);
      return `${d}/${m}/${y}`;
    }
    if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split(/[\/.-]/).map(Number);
      return `${d}/${m}/${y}`;
    }
    return raw;
  };

  const paymentWoodName = 'gỗ keo xẻ thô';
  const paymentContractLine = `Gỗ sơ chế thông thường - ${paymentWoodName}${soHopDongPay ? ` theo HĐ số: ${soHopDongPay}${ngayHopDongPay ? ` ngày ${formatShortDateNoLeadingZero(ngayHopDongPay)}` : ''}` : ''}`;

  const hasThuongColumn = (paymentRows || []).some(p => p.thuong !== 0 && p.thuong !== undefined && p.thuong !== null);
  const hasVanChuyenColumn = (paymentRows || []).some(p => p.van_chuyen !== 0 && p.van_chuyen !== undefined && p.van_chuyen !== null && p.van_chuyen !== '' && p.van_chuyen !== '0');
  const hasFscColumn = (paymentRows || []).some(p => p.hd_fsc !== 0 && p.hd_fsc !== undefined && p.hd_fsc !== null && p.hd_fsc !== '' && p.hd_fsc !== '0');
  const hasThanhToanColumn = (paymentRows || []).some(p => p.thanh_toan !== 0 && p.thanh_toan !== undefined && p.thanh_toan !== null);

  const visibleColumnsCount = 5 + (hasThuongColumn ? 1 : 0) + (hasVanChuyenColumn ? 1 : 0) + (hasFscColumn ? 1 : 0) + (hasThanhToanColumn ? 1 : 0) + 2;
  const hasAnyAdjustment = hasThuongColumn || hasVanChuyenColumn || hasFscColumn || hasThanhToanColumn;
  const colSpanTotal = 5 + 
    (hasThuongColumn ? 1 : 0) + 
    (hasVanChuyenColumn ? 1 : 0) + 
    (hasFscColumn ? 1 : 0) + 
    (hasThanhToanColumn ? 1 : 0) + 
    (hasAnyAdjustment ? 1 : 0) + 
    1;

  const renderAdjustment = (val: string | number | undefined) => {
    if (val === undefined || val === null || val === '') return '—';
    if (typeof val === 'number') {
      if (val > 0) return `+${val.toLocaleString('vi-VN')}`;
      if (val < 0) return val.toLocaleString('vi-VN');
      return '—';
    }
    const n = parseFloat(val as string);
    if (!isNaN(n)) {
      if (n > 0) return `+${n.toLocaleString('vi-VN')}`;
      if (n < 0) return n.toLocaleString('vi-VN');
      return '—';
    }
    return val;
  };

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 text-black print:bg-white print:p-0">
      <style>{buildPrintCss(qcPrintSettings, '#wood-inspection-document') + buildPrintCss(paymentPrintSettings, '#wood-payment-document')}</style>

      {/* Dynamic Action Control Bar (Hidden on printout) */}
      <div className="max-w-4xl mx-auto flex flex-col gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100 text-black">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-black text-slate-700 bg-slate-50 hover:bg-slate-100 px-4.5 py-2.5 rounded-xl border border-slate-200 transition duration-150 cursor-pointer"
              id="print-btn-back"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Quay lại Chỉnh sửa</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95 text-white font-black text-xs px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
              id="print-btn-now"
            >
              <Printer className="w-4 h-4" />
              <span>In Biên Bản Ngay (PDF / Giấy)</span>
            </button>
          </div>
        </div>



        {isInIframe && (
          <div className="bg-amber-50/80 border border-amber-200/80 p-4.5 rounded-xl text-amber-900 text-xs leading-relaxed animate-fade-in print:hidden">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">⚠️</span>
              <div className="space-y-1">
                <p className="font-extrabold text-[12.5px] text-amber-950">
                  Lưu ý quan trọng để In trực tiếp ra Máy in không bị lỗi:
                </p>
                <p className="text-slate-700 font-medium">
                  Do ứng dụng đang chạy trong khung xem thử của hệ thống, trình duyệt của bạn sẽ <strong className="font-extrabold text-red-600">chặn không cho mở hộp thoại in</strong> hoặc in không đúng khổ giấy.
                </p>
                <div className="pt-1.5 flex flex-wrap items-center gap-3">
                  <p className="font-bold text-amber-950">
                    👉 Giải pháp: Vui lòng click nút dưới đây để mở ứng dụng ở Tab mới rồi nhấn In lại:
                  </p>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black px-4 py-1.5 rounded-lg transition duration-150 shadow-xs cursor-pointer select-none"
                  >
                    <span>Mở ở Tab Mới Để In Hoàn Hảo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Multi-Format Export Panel with outstanding clarity and design */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-white border border-slate-250 rounded-2xl shadow-xs mt-4 print:hidden animate-fade-in">
          {/* Column 1: Excel Templates */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider flex items-center gap-2 border-b border-emerald-100 pb-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              XUẤT TẬP TIN EXCEL (.XLSX)
            </h4>
            <div className="flex flex-col gap-2.5">
              {(printMode === 'qc' || printMode === 'both') && (
                <button
                  type="button"
                  onClick={() => {
                    let rawDate = bienBan.ngay_nt;
                    if (ngayNt) {
                      const parts = ngayNt.split('/');
                      if (parts.length === 3) {
                        rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                      }
                    }
                    let fscText = bienBan.chung_chi_fsc;
                    if (fscOption === 'fsc100') fscText = 'FSC 100%';
                    else if (fscOption === 'fscMix') fscText = 'FSC Mix';
                    else if (fscOption === 'fscCw') fscText = 'FSC CW';
                    else if (fscOption === 'kls') fscText = 'KLS';

                    const merged = {
                      ...bienBan,
                      ma_bbnt: maBbnt,
                      ngay_nt: rawDate,
                      don_vi_cung_ung: donViCungUng,
                      ma_ncc: maNcc,
                      loai_go: loaiGo,
                      dia_diem_nhap: diaDiemNhap,
                      chung_chi_fsc: fscText,
                      thanh_phan: members,
                      ket_luan: ketLuan,
                      nguoi_ky_pho_tgd: sigPhoTgdName,
                      nguoi_ky_tp_pqlcl: sigTpPqlclName,
                      nguoi_ky_thu_kho: sigThuKhoName,
                      nguoi_ky_dai_dien_ncc: sigDaiDienNccName,
                      nguoi_ky_nguoi_lap: sigNguoiLapName,
                      quy_cach_a: quyCachA,
                      quy_cach_b: quyCachB,
                    };
                    exportInspectionToExcel(merged, {
                      maSo: maSoQc,
                      lanBanHanh: lanBanHanhQc,
                      ngayBanHanh: ngayBanHanhQc
                    });
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-xl transition cursor-pointer shadow-3xs"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Mẫu QC Nghiệm thu</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-extrabold uppercase bg-emerald-200/50 px-2 py-0.5 rounded-md">XLSX</span>
                </button>
              )}
              
              {(printMode === 'payment' || printMode === 'both') && (
                <button
                  type="button"
                  onClick={() => {
                    let rawDate = bienBan.ngay_nt;
                    if (ngayThanhToanPay) {
                      const parts = ngayThanhToanPay.split('/');
                      if (parts.length === 3) {
                        rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                      }
                    }
                    const merged = {
                      ...bienBan,
                      ma_ncc: maNcc,
                      vung_quan_ly: vungQuanLy,
                      phuong_thuc_van_chuyen: phuongAnLogistics,
                      ngay_nt: rawDate,
                      loai_go: danhMucLamSan,
                      dia_diem_nhap: diemDoBai,
                      bang_thanh_toan: paymentRows,
                      phat_sinh_chi_phi: phatSinhChiPhi,
                      so_hop_dong: soHopDongPay,
                      ngay_hop_dong: ngayHopDongPay,
                    };
                    exportPaymentToExcel(merged, {
                      maSo: maSoPay,
                      lanBanHanh: lanBanHanhPay,
                      ngayThanhToan: ngayThanhToanPay,
                      quyTrinhTitle: quyTrinhTitle2,
                      bienBanTitle: bienBanTitle2,
                      nguoiLapTitle,
                      nguoiLapName,
                      truongBoPhanTitle,
                      truongBoPhanName
                    });
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-xl transition cursor-pointer shadow-3xs"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Mẫu Thanh toán Gỗ</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-extrabold uppercase bg-emerald-200/50 px-2 py-0.5 rounded-md">XLSX</span>
                </button>
              )}
            </div>
          </div>

          {/* Column 2: Image captures */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-orange-800 tracking-wider flex items-center gap-2 border-b border-orange-100 pb-1.5">
              <ImageIcon className="w-4 h-4 text-orange-600 shrink-0" />
              CHỤP VÀ TẢI ẢNH (.PNG) SẮC NÉT
            </h4>
            <div className="flex flex-col gap-2.5">
              {(printMode === 'qc' || printMode === 'both') && (
                <button
                  type="button"
                  disabled={capturingQc}
                  onClick={async () => {
                    setCapturingQc(true);
                    const originalMode = printMode;
                    if (printMode !== 'both' && printMode !== 'qc') {
                      setPrintMode('both');
                      await new Promise(resolve => setTimeout(resolve, 350));
                    }
                    await exportToImage('wood-inspection-document', `Nghiem_Thu_Keo_Xe_${bienBan.ma_bbnt}`);
                    if (originalMode !== 'both' && originalMode !== 'qc') {
                      setPrintMode(originalMode);
                    }
                    setCapturingQc(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-orange-900 bg-orange-50/70 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 rounded-xl transition cursor-pointer shadow-3xs disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-orange-600" />
                    <span>{capturingQc ? 'Đang xuất ảnh...' : 'Ảnh chụp Biên bản QC'}</span>
                  </span>
                  <span className="text-[10px] text-orange-700 font-extrabold uppercase bg-orange-200/50 px-2 py-0.5 rounded-md">PNG</span>
                </button>
              )}

              {(printMode === 'payment' || printMode === 'both') && (
                <button
                  type="button"
                  disabled={capturingPay}
                  onClick={async () => {
                    setCapturingPay(true);
                    const originalMode = printMode;
                    if (printMode !== 'both' && printMode !== 'payment') {
                      setPrintMode('both');
                      await new Promise(resolve => setTimeout(resolve, 350));
                    }
                    await exportToImage('wood-payment-document', `Bieu_Hach_Toan_Thanh_Toan_${bienBan.ma_bbnt}`);
                    if (originalMode !== 'both' && originalMode !== 'payment') {
                      setPrintMode(originalMode);
                    }
                    setCapturingPay(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-orange-900 bg-orange-50/70 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 rounded-xl transition cursor-pointer shadow-3xs disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-orange-600" />
                    <span>{capturingPay ? 'Đang xuất ảnh...' : 'Ảnh chụp Thanh Toán'}</span>
                  </span>
                  <span className="text-[10px] text-orange-700 font-extrabold uppercase bg-orange-200/50 px-2 py-0.5 rounded-md">PNG</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* PAGE 1: WOOD INSPECTION QUALITY CERTIFICATE REPORT */}
      {(printMode === 'qc' || printMode === 'both') && (
        <div 
          id="wood-inspection-document"
          className={`nfc-print-document max-w-4xl mx-auto bg-white border border-black p-6 md:p-10 shadow-sm print:shadow-none print:border-none print:p-0 text-[12.5px] leading-snug ${
            selectedFont === 'times' ? 'document-font-times' : selectedFont === 'sans' ? 'document-font-sans' : 'document-font-serif'
          } ${!isEditable ? 'document-read-only' : ''} ${
            printMode === 'both' ? 'print:break-after-page' : ''
          }`}
          style={{ 
            pageBreakAfter: printMode === 'both' ? 'always' : 'auto',
            breakAfter: printMode === 'both' ? 'page' : 'auto',
            fontFamily: qcPrintSettings.fontFamily,
            fontSize: `${qcPrintSettings.fontSize}px`,
          }}
        >
          
          {/* UPPER PRIMARY HEADER GRID */}
          <table className="w-full table-fixed border-collapse border border-black text-center text-[12.5px] leading-snug font-sans">
            <tbody>
              <tr>
                <td rowSpan={2} className="border-r border-b border-black w-[22%] text-center p-2 bg-white">
                  <div className="brand-logo-text flex flex-col items-center justify-center select-none">
                    <span className="text-[#0d733e] italic text-[46px] tracking-tighter leading-none" style={{ fontFamily: '"Arial Black", Impact, sans-serif', fontWeight: 900, fontStyle: 'italic' }}>
                      NFC
                    </span>
                    <span className="text-[#0d733e] font-sans font-extrabold italic text-[10.5px] tracking-[0.24em] leading-none uppercase -mt-0.5" style={{ fontStyle: 'italic' }}>
                      NAFOCO
                    </span>
                  </div>
                </td>
                <td className="border-r border-b border-black py-2 font-bold uppercase tracking-wide text-[12.5px] text-black w-[53%] text-center">
                  <input
                    type="text"
                    value={quyTrinhTitle1}
                    onChange={(e) => setQuyTrinhTitle1(e.target.value)}
                    className="bg-transparent text-center font-bold uppercase tracking-wide text-[12.5px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                  />
                </td>
                <td className="border-b border-black text-left px-3 py-2 text-[11.5px] w-[25%]">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <strong className="shrink-0">Mã số:</strong>
                    <span className="hidden print:inline font-serif text-[11.5px] text-black">
                      {maSoQc}
                    </span>
                    <input
                      type="text"
                      value={maSoQc}
                      onChange={(e) => setMaSoQc(e.target.value)}
                      className="bg-transparent text-left font-serif text-[11.5px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:hidden"
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border-r border-black font-bold text-[18px] py-3.5 uppercase text-black tracking-tight text-center w-[53%]">
                  <input
                    type="text"
                    value={bienBanTitle1}
                    onChange={(e) => setBienBanTitle1(e.target.value)}
                    className="bg-transparent text-center font-bold uppercase tracking-tight text-[18px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                  />
                </td>
                <td className="text-left px-3 py-1 text-[11.5px] w-[25%]">
                  <div className="border-b border-dashed border-black/20 pb-1 flex items-center gap-1 whitespace-nowrap">
                    <strong className="shrink-0">Lần ban hành:</strong>
                    <span className="hidden print:inline text-[11.5px] text-black">
                      {lanBanHanhQc}
                    </span>
                    <input
                      type="text"
                      value={lanBanHanhQc}
                      onChange={(e) => setLanBanHanhQc(e.target.value)}
                      className="bg-transparent text-left text-[11.5px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:hidden"
                    />
                  </div>
                  <div className="pt-1 flex items-center gap-1 whitespace-nowrap">
                    <strong className="shrink-0">Ngày ban hành:</strong>
                    <span className="hidden print:inline text-[11.5px] text-black">
                      {ngayBanHanhQc}
                    </span>
                    <input
                      type="text"
                      value={ngayBanHanhQc}
                      onChange={(e) => setNgayBanHanhQc(e.target.value)}
                      className="bg-transparent text-left text-[11.5px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:hidden"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* SECONDARY INFO GRID (Attendees and Suppliers) */}
          <table className="w-full table-fixed border-collapse border-b border-l border-r border-black text-left text-[12.5px] leading-tight font-serif text-black">
            <thead>
              <tr className="border-b border-black text-center font-bold">
                <th className="border-r border-black w-[5%] py-1">TT</th>
                <th className="border-r border-black px-2 py-1 text-center w-[22%]">Thành phần</th>
                <th className="border-r border-black px-2 py-1 text-center w-[22%]">Chức vụ</th>
                <th className="border-r border-black px-2 py-1 text-center w-[31%]">Đơn vị cung ứng</th>
                <th className="px-3 py-1 text-left w-[20%] font-bold text-black">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span className="shrink-0">BBNT số:</span>
                    <span className="hidden print:inline font-serif font-normal text-black">
                      {maBbnt}
                    </span>
                    <input
                      type="text"
                      value={maBbnt}
                      onChange={(e) => setMaBbnt(e.target.value)}
                      className="bg-transparent text-left font-serif font-normal text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:hidden"
                      autoComplete="off"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => {
                const isFirst = index === 0;
                let docText = "";
                if (index === 0) {
                  docText = `Ngày NT: ${ngayNt}`;
                } else {
                  docText = "";
                }
                
                return (
                  <tr key={member.id || index} className="border-b last:border-b-0 border-black">
                    <td className="border-r border-black text-center py-1.5 font-bold w-[5%]">{index + 1}</td>
                    <td className="border-r border-black px-2 py-1.5 font-bold w-[22%]">
                      <input
                        type="text"
                        value={member.ho_ten}
                        onChange={(e) => {
                          const updated = [...members];
                          updated[index].ho_ten = e.target.value;
                          setMembers(updated);
                        }}
                        className="bg-transparent text-center font-normal text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                      />
                    </td>
                    <td className="border-r border-black px-2 py-1.5 w-[22%]">
                      <input
                        type="text"
                        value={member.chuc_vu}
                        onChange={(e) => {
                          const updated = [...members];
                          updated[index].chuc_vu = e.target.value;
                          setMembers(updated);
                        }}
                        className="bg-transparent text-left text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                      />
                    </td>
                    {isFirst && (
                      <td className="border-r border-black px-3 py-1 text-center font-bold text-[15px] uppercase leading-tight w-[31%]" rowSpan={members.length}>
                        <div className="flex flex-col items-center justify-center gap-1 h-full py-1">
                          <textarea
                            rows={2}
                            value={donViCungUng}
                            onChange={(e) => setDonViCungUng(e.target.value)}
                            className="bg-transparent text-center font-bold text-[15.5px] uppercase leading-tight text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent resize-none overflow-hidden"
                            placeholder="ĐƠN VỊ CUNG ỨNG"
                          />
                        </div>
                      </td>
                    )}
                    {isFirst && (
                      <td className="px-3 py-1.5 font-bold w-[20%] text-black align-middle" rowSpan={members.length}>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span className="shrink-0">Ngày NT:</span>
                          <span className="hidden print:inline font-bold text-black">
                            {ngayNt}
                          </span>
                          <input
                            type="text"
                            value={ngayNt}
                            onChange={(e) => setNgayNt(e.target.value)}
                            className="bg-transparent text-center font-normal text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:hidden"
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* CORE SPECIFICATIONS METADATA SUMMARY TABLE (PART A & B COMBINED) */}
          <table className="w-full table-fixed border-collapse border-b border-l border-r border-black text-left text-[12.5px] leading-snug font-serif text-black">
            <tbody>
              <tr className="border-b border-black">
                <td className="px-3 py-2 border-r border-black" colSpan={4}>
                  <div className="flex gap-2">
                    <span className="font-bold text-black">Tên - chủng loại gỗ:</span>
                    <span className="font-bold text-black uppercase">Gỗ keo rừng trồng</span>
                  </div>
                  <div className="text-center font-normal text-black mt-1 py-1 text-[12.5px] flex items-center justify-center gap-1">
                    <span>Gỗ sơ chế thông thường -</span>
                    <span className="hidden print:inline-block font-bold text-black uppercase">
                      {loaiGo}
                    </span>
                    <input
                      type="text"
                      value={loaiGo}
                      onChange={(e) => setLoaiGo(e.target.value)}
                      style={{ width: `${Math.max((loaiGo || '').length * 8.5, 60)}px` }}
                      className="bg-transparent text-center font-normal text-black border-b border-dashed border-black/20 hover:border-black/40 focus:border-indigo-500 focus:outline-none print:hidden uppercase px-1"
                    />
                  </div>
                </td>
                <td className="px-3 py-2 align-top" colSpan={1}>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-black">Địa điểm nhập:</span>
                    <textarea
                      rows={2}
                      value={diaDiemNhap}
                      onChange={(e) => setDiaDiemNhap(e.target.value)}
                      className="bg-transparent text-center font-normal text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent resize-none overflow-hidden"
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2.5" colSpan={5}>
                  <div className="flex items-center gap-12 font-bold text-black">
                    <span className="font-bold text-black">Trạng thái môi trường:</span>
                    <span className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setFscOption('fsc100')}>
                      FSC 100%
                      <span className="inline-flex items-center justify-center w-5 h-6 border border-black font-sans text-[12.5px] font-black bg-white">
                        {fscOption === 'fsc100' ? 'v' : ' '}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setFscOption('fscMix')}>
                      FSC Mix
                      <span className="inline-flex items-center justify-center w-5 h-6 border border-black font-sans text-[12.5px] font-black bg-white">
                        {fscOption === 'fscMix' ? 'v' : ' '}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setFscOption('fscCw')}>
                      FSC CW
                      <span className="inline-flex items-center justify-center w-5 h-6 border border-black font-sans text-[12.5px] font-black bg-white">
                        {fscOption === 'fscCw' ? 'v' : ' '}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setFscOption('kls')}>
                      KLS
                      <span className="inline-flex items-center justify-center w-5 h-6 border border-black font-sans text-[12.5px] font-black bg-white">
                        {fscOption === 'kls' ? 'v' : ' '}
                      </span>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* A. Tổng khối lượng giao nhận SPECIFICATION TABLE */}
          <div className="mt-3.5 text-black">
            <h4 className="font-bold text-[14px] uppercase text-black mb-1">
              A. Tổng khối lượng giao nhận
            </h4>
            <table className="w-full table-fixed border-collapse border border-black text-center text-[12.5px] font-serif text-black">
              <thead>
                <tr className="bg-white font-bold border-b border-black h-7">
                  <th className="border-r border-black text-center py-1 w-[8%]">TT</th>
                  <th className="border-r border-black text-center py-1 w-[52%]">Quy cách kích thước (mm)</th>
                  <th className="border-r border-black text-center py-1 w-[15%]">Đơn vị tính</th>
                  <th className="border-black text-center px-4 py-1 w-[25%]">Khối lượng (m3)</th>
                </tr>
              </thead>
              <tbody>
                {quyCachA.map((row, index) => {
                  const cleanKichThuoc = (row.kich_thuoc_mm || "").replace(/×/g, 'x');
                  return (
                    <tr key={row.id || index} className="border-b border-black h-7 text-black font-bold">
                      <td className="border-r border-black p-1 text-center w-[8%]">{index + 1}</td>
                      <td className="border-r border-black px-3 py-1 text-center w-[52%]">
                        <input
                          type="text"
                          value={row.kich_thuoc_mm}
                          onChange={(e) => {
                            const updated = [...quyCachA];
                            updated[index].kich_thuoc_mm = e.target.value;
                            setQuyCachA(updated);
                          }}
                          className="bg-transparent text-center font-normal text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                        />
                      </td>
                      <td className="border-r border-black p-1 text-center w-[15%]">m3</td>
                      <td className="px-4 py-1 text-center w-[25%]">
                        <input
                          type="number"
                          step="0.001"
                          value={row.kl_nguyen_thuy}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...quyCachA];
                            updated[index].kl_nguyen_thuy = val;
                            setQuyCachA(updated);
                          }}
                          className="bg-transparent text-center font-normal text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                        />
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-bold h-7 border-t border-black bg-white text-black">
                  <td className="border-r border-black p-1 py-1.5 text-center font-bold uppercase" colSpan={3}>
                    Cộng
                  </td>
                  <td className="px-4 py-1.5 text-center font-bold">
                    {formatVolume(totalVolA)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* MAIN GRID BLOCK SPECIFICATIONS DETAILS */}
          <div className="mt-4 text-black">
            <h4 className="font-bold text-[14px] uppercase text-black mb-1">
              B. Kết luận khối lượng gỗ thực tế nhập kho
            </h4>

            <table className="w-full table-fixed border-collapse border border-black text-center font-sans text-[12.5px] text-black">
              <thead>
                <tr className="bg-white font-bold border-b border-black text-[12.5px] h-9">
                  <th className="border-r border-black w-[6%] text-center py-1">TT</th>
                  <th className="border-r border-black w-[32%] text-center px-1 py-1">Quy cách kích thước</th>
                  <th className="border-r border-black w-[18%] text-center px-3 py-1">K. Lượng nguyên thuỷ</th>
                  <th className="border-r border-black w-[11%] text-center py-1">Tỉ lệ %</th>
                  <th className="border-r border-black w-[18%] text-center px-3 py-1">K. Lượng nhập kho</th>
                  <th className="w-[15%] text-left px-3 py-1">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {bRowsHtml}
                {/* Grand total summaries matching standard layout exactly */}
                <tr className="bg-white font-bold border-t border-black uppercase text-[12.5px] h-8 text-black">
                  <td className="border-r border-black p-1 text-center font-bold" colSpan={2}>Cộng</td>
                  <td className="border-r border-black px-3 py-1 text-center font-bold text-red-650">
                    {formatVolume(totalVolA)}
                  </td>
                  <td className="border-r border-black p-1 text-center font-bold"></td>
                  <td className="border-r border-black px-3 py-1 text-center font-bold text-red-650">
                    {formatVolume(totalVolB)}
                  </td>
                  <td className="px-3 py-1"></td>
                </tr>
              </tbody>
            </table>

            {/* Spell out spelling-words line directly derived from image and user requirements */}
            <div className="border-l border-r border-b border-black px-3 py-2 font-bold text-[12.5px] bg-white text-black leading-normal">
              <span className="text-black font-extrabold uppercase text-[11.5px] mr-2">Bằng chữ:</span>
              <span className="font-sans font-bold text-black">
                {numberToVietnameseWords(totalVolB, false)} ./.
              </span>
            </div>

            {/* SECTION C: Active conclusions */}
            <div className="border-l border-r border-b border-black px-3 py-2.5 bg-white text-[12.5px] font-bold flex items-center gap-12 text-black">
              <span className="font-bold text-[12.5px] uppercase tracking-tight text-black">C. Kết luận chung lô hàng:</span>
              
              <div className="flex items-center gap-12 text-black font-bold">
                <span className="flex items-center gap-2 font-bold cursor-pointer select-none" onClick={() => setKetLuan('Đạt')}>
                  Đạt yêu cầu nhập kho
                  <span className="inline-flex items-center justify-center w-5 h-6 border border-black font-sans text-[12.5px] font-black bg-white select-none">
                    {ketLuan === 'Đạt' ? 'v' : ' '}
                  </span>
                </span>
                <span className="flex items-center gap-2 font-bold cursor-pointer select-none" onClick={() => setKetLuan('Không đạt')}>
                  Không đạt yêu cầu nhập kho
                  <span className="inline-flex items-center justify-center w-5 h-6 border border-black font-sans text-[12.5px] font-black bg-white select-none">
                    {ketLuan !== 'Đạt' ? 'v' : ' '}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* DYNAMIC SYSTEM SIGNATURES ROW LINKED FROM DETAILED PARTICIPANTS - EXACT ORDER FROM USER IMAGE */}
          <div className="mt-8 pt-6 print:mt-2 print:pt-2 break-inside-avoid">
            <div className="grid grid-cols-5 gap-1.5 text-center text-[12.5px] font-bold leading-snug font-serif text-black break-inside-avoid">
              {/* 1. Phó TGĐ */}
              <div className="flex flex-col justify-between h-28 text-center">
                <input
                  type="text"
                  value={sigPhoTgdTitle}
                  onChange={(e) => setSigPhoTgdTitle(e.target.value)}
                  className="bg-transparent text-center uppercase font-bold text-[12.5px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                />
                <input
                  type="text"
                  value={sigPhoTgdName}
                  onChange={(e) => setSigPhoTgdName(e.target.value)}
                  className="bg-transparent text-center font-bold italic text-[12.5px] text-black mt-12 border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                  placeholder="Nhập họ tên"
                />
              </div>

              {/* 2. TP. PQLCL 1 */}
              <div className="flex flex-col justify-between h-28 text-center">
                <input
                  type="text"
                  value={sigTpPqlclTitle}
                  onChange={(e) => setSigTpPqlclTitle(e.target.value)}
                  className="bg-transparent text-center uppercase font-bold text-[12.5px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                />
                <input
                  type="text"
                  value={sigTpPqlclName}
                  onChange={(e) => setSigTpPqlclName(e.target.value)}
                  className="bg-transparent text-center font-bold italic text-[12.5px] text-black mt-12 border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                  placeholder="Nhập họ tên"
                />
              </div>

              {/* 3. Thủ kho */}
              <div className="flex flex-col justify-between h-28 text-center">
                <input
                  type="text"
                  value={sigThuKhoTitle}
                  onChange={(e) => setSigThuKhoTitle(e.target.value)}
                  className="bg-transparent text-center uppercase font-bold text-[12.5px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                />
                <input
                  type="text"
                  value={sigThuKhoName}
                  onChange={(e) => setSigThuKhoName(e.target.value)}
                  className="bg-transparent text-center font-bold italic text-[12.5px] text-black mt-12 border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                  placeholder="Nhập họ tên"
                />
              </div>

              {/* 4. Đại diện ĐV cung ứng */}
              <div className="flex flex-col justify-between h-28 text-center">
                <input
                  type="text"
                  value={sigDaiDienNccTitle}
                  onChange={(e) => setSigDaiDienNccTitle(e.target.value)}
                  className="bg-transparent text-center uppercase font-bold text-[12.5px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent leading-tight"
                />
                <input
                  type="text"
                  value={sigDaiDienNccName}
                  onChange={(e) => setSigDaiDienNccName(e.target.value)}
                  className="bg-transparent text-center font-bold italic text-[12.5px] text-black mt-12 border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                  placeholder="Nhập họ tên"
                />
              </div>

              {/* 5. Người lập */}
              <div className="flex flex-col justify-between h-28 text-center">
                <input
                  type="text"
                  value={sigNguoiLapTitle}
                  onChange={(e) => setSigNguoiLapTitle(e.target.value)}
                  className="bg-transparent text-center uppercase font-bold text-[12.5px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                />
                <input
                  type="text"
                  value={sigNguoiLapName}
                  onChange={(e) => setSigNguoiLapName(e.target.value)}
                  className="bg-transparent text-center font-bold italic text-[12.5px] text-black mt-12 border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                  placeholder="Nhập họ tên"
                />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Preview Section divider (Only visible on web UI, hidden when printing physically) */}
      {printMode === 'both' && (
        <div className="max-w-4xl mx-auto my-12 border-t-2 border-dashed border-slate-300 print:hidden flex items-center justify-center">
          <span className="bg-slate-200 text-slate-705 px-4 py-1.5 rounded-full text-[10.5px] font-black uppercase tracking-wider shadow-2xs">
            👉 BẢNG CHI TIẾT THANH TOÁN GỖ
          </span>
        </div>
      )}

      {/* PAGE 2: DETAILED PAYMENT SETTLEMENT DISCLOSURE SHEETS */}
      {(printMode === 'payment' || printMode === 'both') && (
        <div 
          id="wood-payment-document"
          className={`nfc-print-document max-w-[794px] mx-auto bg-white border border-black p-8 md:p-10 shadow-sm print:shadow-none print:border-none print:p-0 text-xs leading-tight ${
            selectedFont === 'times' ? 'document-font-times' : selectedFont === 'sans' ? 'document-font-sans' : 'document-font-serif'
          } ${!isEditable ? 'document-read-only' : ''}`}
          style={{ fontFamily: paymentPrintSettings.fontFamily, fontSize: `${paymentPrintSettings.fontSize}px` }}
        >
          
          {/* HEADER BAR SHEET 2 - MATCH PAYMENT EXCEL TEMPLATE */}
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="text-center font-bold text-[16px] uppercase tracking-wide text-black font-serif flex items-center justify-center gap-1.5">
              <span>SỐ:</span>
              <input 
                type="text" 
                value={maBbnt} 
                onChange={(e) => setMaBbnt(e.target.value)} 
                className="bg-transparent text-center font-bold text-[16px] text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-32 print:border-none print:bg-transparent"
                placeholder="SỐ"
              />
            </div>

            <div className="text-center font-bold text-[11px] text-black font-serif mt-1">
              Ngày {parseDateParts(ngayThanhToanPay).day} tháng {parseDateParts(ngayThanhToanPay).month} năm {parseDateParts(ngayThanhToanPay).year}
            </div>

          </div>

          {/* DETAILED LEDGER PAYMENTS TABLE */}
          <div className="mt-2">
            <div className="bg-white text-black text-center font-bold text-[18px] uppercase py-1 border border-black border-b-0 font-serif">
              BẢNG CHI TIẾT THANH TOÁN GỖ
            </div>
            <table className="w-full border-collapse border border-black text-center text-[11px] font-serif text-black">
              <thead>
                <tr className="bg-white text-black text-center font-bold text-[11px] border-b border-black h-5">
                  <th className="border-r border-b border-black p-1.5 w-10 text-center font-bold">STT</th>
                  <th className="border-r border-b border-black p-1.5 text-center font-bold min-w-[200px]">Tên hàng</th>
                  <th className="border-r border-b border-black p-1.5 w-12 text-center font-bold">Đvt</th>
                  <th className="border-r border-b border-black p-1.5 w-24 text-center font-bold">KL</th>
                  <th className="border-r border-b border-black p-1.5 w-28 text-center font-bold">Đơn giá</th>
                  
                  {hasThuongColumn && (
                    <th className="border-r border-b border-black p-1.5 w-24 text-center font-bold">Thưởng</th>
                  )}
                  {hasVanChuyenColumn && (
                    <th className="border-r border-b border-black p-1.5 w-24 text-center font-bold">Vận chuyển</th>
                  )}
                  {hasFscColumn && (
                    <th className="border-r border-b border-black p-1.5 w-24 text-center font-bold">HĐ.FSC</th>
                  )}
                  {hasThanhToanColumn && (
                    <th className="border-r border-b border-black p-1.5 w-24 text-center font-bold">Thanh toán</th>
                  )}
                  {hasAnyAdjustment && (
                    <th className="border-r border-b border-black p-1.5 w-28 text-center font-bold">Đơn giá TT</th>
                  )}
                  
                  <th className="border-b border-black p-1.5 w-32 text-center font-bold">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {/* Spanning Row: Wood Category & Contract */}
                <tr>
                  <td colSpan={colSpanTotal} className="border-r border-b border-black px-1 py-0.5 pl-2 text-left italic text-black bg-white font-serif text-[11px] leading-tight">
                    {paymentContractLine}
                  </td>
                </tr>

                {(() => {
                  let runningStt = 1;
                  return paymentRows.map((p, idx) => {
                    const isSub = isSubRow(p.ten_hang);
                    const sttText = isSub ? "" : (runningStt++).toString();
                    const isRedPrice = p.don_gia === 4700000;

                    return (
                      <tr key={p.id || idx} className="border-b border-black h-5 hover:bg-slate-50/5">
                        <td className="border-r border-black p-1.5 text-center font-serif text-black font-medium">
                          {sttText}
                        </td>
                        <td className="border-r border-black px-1 py-0.5 text-center text-black font-bold">
                          <input
                            type="text"
                            value={p.ten_hang}
                            onChange={(e) => handleUpdatePaymentField(idx, 'ten_hang', e.target.value)}
                            className="bg-transparent text-center font-bold text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                          />
                        </td>
                        <td className="border-r border-black px-1 py-0.5 text-center text-black">
                          {isSub ? '"' : 'm3'}
                        </td>
                        <td className="border-r border-black px-1 py-0.5 text-center font-serif text-black font-normal">
                          <input
                            type="number"
                            step="0.001"
                            value={p.kl}
                            onChange={(e) => handleUpdatePaymentField(idx, 'kl', parseFloat(e.target.value) || 0)}
                            className="bg-transparent text-center font-bold text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                          />
                        </td>
                        <td className="border-r border-black px-1 py-0.5 text-center font-serif text-black font-normal">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={p.don_gia ? p.don_gia.toLocaleString('vi-VN') : '0'}
                            onChange={(e) => {
                              const rawVal = e.target.value.replace(/\D/g, '');
                              const numericVal = parseFloat(rawVal) || 0;
                              handleUpdatePaymentField(idx, 'don_gia', numericVal);
                            }}
                            className={`bg-transparent text-center border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent font-bold ${isRedPrice ? 'text-red-650' : 'text-black'}`}
                          />
                        </td>
                        
                        {hasThuongColumn && (
                          <td className="border-r border-black px-1 py-0.5 text-center font-serif text-black font-normal">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={p.thuong ? p.thuong.toLocaleString('vi-VN') : ''}
                              onChange={(e) => {
                                const isNegative = e.target.value.includes('-');
                                const rawVal = e.target.value.replace(/\D/g, '');
                                const numericVal = (parseFloat(rawVal) || 0) * (isNegative ? -1 : 1);
                                handleUpdatePaymentField(idx, 'thuong', numericVal);
                              }}
                              className="bg-transparent text-center text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent font-bold"
                            />
                          </td>
                        )}
                        
                        {hasVanChuyenColumn && (
                          <td className="border-r border-black px-1 py-0.5 text-center font-serif text-black font-normal">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={p.van_chuyen ? p.van_chuyen.toLocaleString('vi-VN') : ''}
                              onChange={(e) => {
                                const isNegative = e.target.value.includes('-');
                                const rawVal = e.target.value.replace(/\D/g, '');
                                const numericVal = (parseFloat(rawVal) || 0) * (isNegative ? -1 : 1);
                                handleUpdatePaymentField(idx, 'van_chuyen', numericVal);
                              }}
                              className="bg-transparent text-center text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent font-bold"
                            />
                          </td>
                        )}
                        
                        {hasFscColumn && (
                          <td className="border-r border-black px-1 py-0.5 text-center font-serif text-black font-normal">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={p.hd_fsc ? p.hd_fsc.toLocaleString('vi-VN') : ''}
                              onChange={(e) => {
                                const isNegative = e.target.value.includes('-');
                                const rawVal = e.target.value.replace(/\D/g, '');
                                const numericVal = (parseFloat(rawVal) || 0) * (isNegative ? -1 : 1);
                                handleUpdatePaymentField(idx, 'hd_fsc', numericVal);
                              }}
                              className="bg-transparent text-center text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent font-bold"
                            />
                          </td>
                        )}
                        
                        {hasThanhToanColumn && (
                          <td className="border-r border-black px-1 py-0.5 text-center font-serif text-black font-normal">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={p.thanh_toan ? p.thanh_toan.toLocaleString('vi-VN') : ''}
                              onChange={(e) => {
                                const isNegative = e.target.value.includes('-');
                                const rawVal = e.target.value.replace(/\D/g, '');
                                const numericVal = (parseFloat(rawVal) || 0) * (isNegative ? -1 : 1);
                                handleUpdatePaymentField(idx, 'thanh_toan', numericVal);
                              }}
                              className="bg-transparent text-center text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent font-bold"
                            />
                          </td>
                        )}
                        
                        {hasAnyAdjustment && (
                          <td className="border-r border-black px-1 py-0.5 text-center font-serif text-black font-normal">
                            {p.don_gia_tong ? p.don_gia_tong.toLocaleString('vi-VN') : '0'}
                          </td>
                        )}
                        
                        <td className="px-1 py-0.5 text-center font-serif font-normal text-black">
                          {p.thanh_tien ? p.thanh_tien.toLocaleString('vi-VN') : '0'}
                        </td>
                      </tr>
                    );
                  });
                })()}

                {/* Optional additional costs & fines if any */}
                {phatSinhChiPhi && phatSinhChiPhi.length > 0 && (
                  <>
                    <tr className="border-b border-black bg-white font-bold text-[10.5px]">
                      <td colSpan={colSpanTotal} className="p-1.5 pl-3 uppercase tracking-wider text-black bg-white font-bold text-left">
                        CHI PHÍ PHÁT SINH VÀ PHẠT GIẢM TRỪ ĐIỀU CHỈNH TÀI CHÍNH
                      </td>
                    </tr>
                    {phatSinhChiPhi.map((cost, idx) => {
                      const numMiddleCols = 
                        (hasThuongColumn ? 1 : 0) + 
                        (hasVanChuyenColumn ? 1 : 0) + 
                        (hasFscColumn ? 1 : 0) + 
                        (hasThanhToanColumn ? 1 : 0) + 
                        (hasAnyAdjustment ? 1 : 0);
                      
                      return (
                        <tr key={cost.id || idx} className="border-b border-black hover:bg-slate-50/5 text-black">
                          <td className="border-r border-black p-1.5 text-center font-serif text-gray-400">—</td>
                          <td className="border-r border-black p-1.5 text-left pl-3 font-medium italic" colSpan={2}>
                            <input
                              type="text"
                              value={cost.name}
                              onChange={(e) => {
                                const updated = [...phatSinhChiPhi];
                                updated[idx].name = e.target.value;
                                setPhatSinhChiPhi(updated);
                              }}
                              className="bg-transparent text-left font-medium italic text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                            />
                          </td>
                          <td className="border-r border-black p-1.5 text-center font-serif text-gray-400">—</td>
                          
                          {numMiddleCols > 0 ? (
                            <>
                              <td className="border-r border-black p-1.5 text-center font-serif text-gray-400">—</td>
                              <td className="border-r border-black p-1.5 text-center font-serif" colSpan={numMiddleCols}>
                                <div className="flex items-center justify-center gap-1">
                                  <select
                                    value={cost.type}
                                    onChange={(e) => {
                                      const updated = [...phatSinhChiPhi];
                                      updated[idx].type = e.target.value as 'plus' | 'minus';
                                      setPhatSinhChiPhi(updated);
                                    }}
                                    className="bg-transparent font-bold text-center border-none outline-none cursor-pointer print:hidden text-slate-600 focus:ring-0 focus:outline-none"
                                  >
                                    <option value="plus">+</option>
                                    <option value="minus">-</option>
                                  </select>
                                  <span className="hidden print:inline">{cost.type === 'plus' ? '+' : '-'}</span>
                                  <input
                                    type="number"
                                    step="1"
                                    value={cost.amount}
                                    onChange={(e) => {
                                      const updated = [...phatSinhChiPhi];
                                      updated[idx].amount = parseFloat(e.target.value) || 0;
                                      setPhatSinhChiPhi(updated);
                                    }}
                                    className="bg-transparent text-center font-semibold text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-20 print:border-none print:bg-transparent"
                                  />
                                </div>
                              </td>
                            </>
                          ) : (
                            <td className="border-r border-black p-1.5 text-center font-serif" colSpan={1}>
                              <div className="flex items-center justify-center gap-1">
                                <select
                                  value={cost.type}
                                  onChange={(e) => {
                                    const updated = [...phatSinhChiPhi];
                                    updated[idx].type = e.target.value as 'plus' | 'minus';
                                    setPhatSinhChiPhi(updated);
                                  }}
                                  className="bg-transparent font-bold text-center border-none outline-none cursor-pointer print:hidden text-slate-600 focus:ring-0 focus:outline-none"
                                >
                                  <option value="plus">+</option>
                                  <option value="minus">-</option>
                                </select>
                                <span className="hidden print:inline">{cost.type === 'plus' ? '+' : '-'}</span>
                                <input
                                  type="number"
                                  step="1"
                                  value={cost.amount}
                                  onChange={(e) => {
                                    const updated = [...phatSinhChiPhi];
                                    updated[idx].amount = parseFloat(e.target.value) || 0;
                                    setPhatSinhChiPhi(updated);
                                  }}
                                  className="bg-transparent text-center font-semibold text-black border-b border-transparent hover:border-black/20 focus:border-indigo-500 focus:outline-none w-20 print:border-none print:bg-transparent"
                                />
                              </div>
                            </td>
                          )}
                          
                          <td className="p-1.5 text-center font-serif font-bold">
                            {cost.type === 'plus' ? '+' : '-'}{cost.amount?.toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}

                {/* Overall total row: Cộng */}
                {(() => {
                  const totalPaymentVol = paymentRows.reduce((sum, p) => sum + (p.kl || 0), 0);
                  const blankColumnsCount = colSpanTotal - 5;
                  return (
                    <tr className="bg-white font-bold border-b border-black text-[12px] h-6">
                      <td colSpan={3} className="border-r border-black p-2 text-center tracking-wider font-extrabold text-black">Cộng</td>
                      <td className="border-r border-black p-2 text-center font-serif font-normal text-black">
                        {totalPaymentVol.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </td>
                      
                      {Array.from({ length: blankColumnsCount }).map((_, i) => (
                        <td key={i} className="border-r border-black p-2 text-center text-black font-bold"></td>
                      ))}
                      
                      <td className="p-2 text-center font-serif font-normal text-black bg-white">
                        {grandTotal.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })()}

                {/* Spell out spelling-words line: Bằng chữ */}
                <tr className="bg-white">
                  <td colSpan={colSpanTotal} className="p-1.5 border-b border-black text-left">
                    <div className="flex items-center gap-1.5 normal-case font-bold text-[11.5px]">
                      <span className="text-black font-bold">Bằng chữ:</span>
                      <span className="text-black font-bold ml-2">
                        {translateMoneyToWords(grandTotal)} ./.
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FINANCIAL SIGNATURES SECTION */}
          <div className="mt-12 print:mt-6 break-inside-avoid">
            <div className="grid grid-cols-2 gap-8 px-12 text-center font-bold">
              {/* Left Column: PT. Bộ phận */}
              <div className="flex flex-col items-center justify-between min-h-[140px] text-center">
                <input
                  type="text"
                  data-always-editable="true"
                  value={truongBoPhanTitle}
                  onChange={(e) => handleUpdateTruongBoPhanTitle(e.target.value)}
                  className="bg-transparent text-center uppercase font-bold text-[11.5px] text-black border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full max-w-[200px] print:border-none print:bg-transparent"
                  placeholder="Chức vụ ký"
                />
                
                <div className="w-full max-w-[200px]">
                  <input
                    list="payment-truong-bo-phan-list"
                    type="text"
                    data-always-editable="true"
                    value={truongBoPhanName}
                    onChange={(e) => handleUpdateTruongBoPhanName(e.target.value)}
                    className="bg-transparent text-center font-bold text-[12px] text-black border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                    placeholder="Nhập tên"
                  />
                  <datalist id="payment-truong-bo-phan-list">
                    {truongBoPhanOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Right Column: Người lập */}
              <div className="flex flex-col items-center justify-between min-h-[140px] text-center">
                <input
                  type="text"
                  data-always-editable="true"
                  value={nguoiLapTitle}
                  onChange={(e) => handleUpdateNguoiLapTitle(e.target.value)}
                  className="bg-transparent text-center uppercase font-bold text-[11.5px] text-black border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full max-w-[200px] print:border-none print:bg-transparent"
                  placeholder="Chức vụ ký"
                />
                
                <div className="w-full max-w-[200px]">
                  <input
                    list="payment-nguoi-lap-list"
                    type="text"
                    data-always-editable="true"
                    value={nguoiLapName}
                    onChange={(e) => handleUpdateNguoiLapName(e.target.value)}
                    className="bg-transparent text-center font-bold text-[12px] text-black border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full print:border-none print:bg-transparent"
                    placeholder="Nhập tên"
                  />
                  <datalist id="payment-nguoi-lap-list">
                    {nguoiLapOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
