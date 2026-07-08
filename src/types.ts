/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThanhPhan {
  id: string;
  stt: number;
  ho_ten: string;
  chuc_vu: string;
}

export interface QuyCachA {
  id: string;
  stt: number;
  kich_thuoc_mm: string; // e.g., "470×50×14"
  chieu_dai?: number; // mm
  chieu_rong?: number; // mm
  chieu_day?: number; // mm
  so_thanh: number; // Pieces (for calculations)
  kl_nguyen_thuy: number; // Volume in m³
  co_phan_loai: boolean; // true if classified into Type 1, 2, 3 in Part B
  ten_quy_cach?: string;
  ghi_chu?: string;
  dg?: string;
}

export interface PhanLoaiDong {
  id: string;
  ten_loai: string; // "Loại 1", "Loại 2", "Loại 2.1", "Loại 3", "Loại hẳn", etc.
  so_thanh: number;
  ti_le: number; // %
  kl_nhap_kho: number; // m³
  ghi_chu?: string;
}

export interface QuyCachB {
  id: string; // references QuyCachA.id
  kich_thuoc_mm: string;
  so_thanh_tong: number;
  kl_tong: number;
  co_phan_loai: boolean; // if false, intake list is 100% accepted auto
  chi_tiet: PhanLoaiDong[];
  ghi_chu?: string;
}

export interface BienBan {
  id: string;
  ma_bbnt: string; // BBNT số, e.g. GB 12.05
  ngay_nt: string; // e.g., "2026-05-26"
  don_vi_cung_ung: string;
  loai_go: string;
  chung_chi_fsc: string; // e.g. FSC 100%, FSC Mix, FSC CW, KLS
  dia_diem_nhap: string;
  ket_luan: 'Đạt' | 'Không đạt';
  ghi_chu: string;
  
  // Custom signing names
  nguoi_ky_pho_tgd: string;
  nguoi_ky_tp_pqlcl: string;
  nguoi_ky_thu_kho: string;
  nguoi_ky_dai_dien_ncc: string;
  nguoi_ky_nguoi_lap: string;

  // Embedded arrays to act as unified documents
  thanh_phan: ThanhPhan[];
  quy_cach_a: QuyCachA[];
  quy_cach_b: QuyCachB[];
  bang_duyet_gia?: DongDuyetGia[];
  bang_thanh_toan?: DongThanhToan[];
  
  // New pricing-profile and transportation integration fields
  phuong_thuc_van_chuyen?: 'NCC' | 'LS_VC';
  ten_don_vi_van_chuyen?: string;
  selected_profile_name?: string;
  is_auto_apply_price?: boolean;
  vung_quan_ly?: string; // e.g., "Thanh Hóa", "Nghệ An"
  ma_ncc?: string; // Supplier code
  phat_sinh_chi_phi?: IncurredCostRow[]; // Incurred costs on payment
  trang_thai_thanh_toan?: 'Chờ hạch toán' | 'Chưa thanh toán' | 'Đã thanh toán';
  nhan_vien_kinh_doanh?: string; // Sales staff assigned to this report
  da_luu_thanh_toan?: boolean; // True if saved from payment/billing screens

  // Thông tin hợp đồng phục vụ xuất bảng chi tiết thanh toán
  so_hop_dong?: string;
  ngay_hop_dong?: string;
  
  created_at: string;
}

export interface IncurredCostRow {
  id: string;
  name: string; // e.g., "Chi phí bốc xếp", "Cước phụ trội", "Hao hụt khấu trừ"
  amount: number; // Value in VND
  type: 'plus' | 'minus'; // Plus or minus from final total
  notes?: string;
}

export interface RegionSuppliers {
  id: string;
  name: string; // e.g., "Thanh Hóa", "Nghệ An"
  suppliers: string[]; // List of supplier names in this region
}

export interface DongGiaChiTiet {
  dg?: string;
  don_gia_kpl?: number; // Đơn giá Không phân loại (VND/m³)
  don_gia_l1: number;
  don_gia_l2: number;
  don_gia_l3: number;
  don_gia_tandung: number;
  don_gia_l21: number;
  don_gia_tam20?: number;
  don_gia_tam23?: number;
  don_gia_tam27?: number;
  don_gia_tam29?: number;
  don_gia_tam30?: number;
  don_gia_tam35?: number;
  
  vc_don_gia_kpl?: number; // Cước vận chuyển Không phân loại
  vc_don_gia_l1?: number;
  vc_don_gia_l2?: number;
  vc_don_gia_l3?: number;
  vc_don_gia_tandung?: number;
  vc_don_gia_l21?: number;
  vc_don_gia_tam20?: number;
  vc_don_gia_tam23?: number;
  vc_don_gia_tam27?: number;
  vc_don_gia_tam29?: number;
  vc_don_gia_tam30?: number;
  vc_don_gia_tam35?: number;
}

export interface PricingProfile {
  id: string;
  name: string; // Contract title or description
  region: string; // Region, e.g. "Thanh Hóa", "Nghệ An"
  supplierName: string; // Connected supplier
  effectiveDate: string; // Applicable starting date (YYYY-MM-DD)
  phuongThucVanChuyen: 'NCC' | 'LS_VC';
  tenDonViVanChuyen?: string;
  prices: { [kich_thuoc_mm: string]: DongGiaChiTiet };
  notes?: string;
}

export interface DongDuyetGia {
  id: string; // references QuyCachA.id or custom uuid
  kich_thuoc_mm: string;
  dg?: string;
  don_gia_kpl?: number; // Đơn giá Không phân loại (VND/m³)
  don_gia_l1: number; // Price per m³ or standard unit in VND
  don_gia_l2: number;
  don_gia_l3: number;
  don_gia_tandung: number;
  don_gia_l21: number;
  
  // Custom classifications from user
  don_gia_tam20?: number;
  don_gia_tam23?: number;
  don_gia_tam27?: number;
  don_gia_tam29?: number;
  don_gia_tam30?: number;
  don_gia_tam35?: number;
  
  // Đơn giá vận chuyển
  vc_don_gia_kpl?: number; // Cước vận chuyển Không phân loại
  vc_don_gia_l1?: number;
  vc_don_gia_l2?: number;
  vc_don_gia_l3?: number;
  vc_don_gia_tandung?: number;
  vc_don_gia_l21?: number;
  
  vc_don_gia_tam20?: number;
  vc_don_gia_tam23?: number;
  vc_don_gia_tam27?: number;
  vc_don_gia_tam29?: number;
  vc_don_gia_tam30?: number;
  vc_don_gia_tam35?: number;
}

export interface DongThanhToan {
  id: string; // unique ID
  stt: number;
  ten_hang: string; // Name of wood / item, e.g., "Gỗ Loại 1 (Quy cách 470x50x14)"
  dvt: string; // Unit, e.g., "m³"
  kl: number; // Volume (Khối lượng)
  don_gia: number; // Unit Price
  thuong: number; // Bonus
  don_gia_tong: number; // don_gia + thuong (represented as the second "Đơn giá" column)
  thanh_tien: number; // Amount: kl * don_gia_tong
  van_chuyen?: string | number; // Shipping information (supports string or amount of money)
  hd_fsc?: string | number; // FSC Certificate or Contract status (supports string or amount of money)
  thanh_toan?: number; // Custom pay adjustment
  kich_thuoc_mm?: string; // Optional spec dimensions
  phan_hang?: string;    // Optional quality class / wood grade
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  symbol: string;
  invoiceDate: string;
  supplierName: string;
  bbntIds: string[];
  totalVolume: number;
  amountBeforeTax: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: 'Đã ký số' | 'Chờ ký' | 'Hủy bỏ';
  linkUrl?: string;
  note?: string;
}

export interface PaymentProposal {
  id: string;
  proposalNo: string;
  proposalDate: string;
  supplierName: string;
  bbntId?: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: 'Chuyển khoản' | 'Tiền mặt';
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  reason: string;
  status: 'Chưa thanh toán' | 'Đã thanh toán';
  requesterName: string;
  notes?: string;
  totalVolume?: number;
}



