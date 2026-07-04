/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { BienBan } from '../types';
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Calendar, 
  Trash2, 
  Edit, 
  Printer, 
  TrendingUp, 
  Layers, 
  CheckCircle, 
  XCircle,
  Copy,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import ExportDropdown from './ExportDropdown';
import { numberToVietnameseWords } from '../utils';

const formatVolNoTrailing = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const fixed = val.toFixed(3);
  const parsed = parseFloat(fixed);
  return parsed.toString();
};

interface InspectionListProps {
  records: BienBan[];
  onSelect: (bb: BienBan) => void;
  onEdit: (bb: BienBan) => void;
  onPrint: (bb: BienBan) => void;
  onDelete: (id: string) => void;
  onDeleteAll?: () => void;
  onDuplicate: (bb: BienBan) => void;
  onCreateNew: () => void;
  onExportExcel: (bb: BienBan) => void;
  onLoadSample: () => void;
}

export default function InspectionList({
  records,
  onSelect,
  onEdit,
  onPrint,
  onDelete,
  onDeleteAll,
  onDuplicate,
  onCreateNew,
  onExportExcel,
  onLoadSample
}: InspectionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fscFilter, setFscFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [recordToDelete, setRecordToDelete] = useState<BienBan | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setFscFilter('all');
    setDateFilter('');
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const matchesSearch = 
        rec.ma_bbnt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.don_vi_cung_ung?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.dia_diem_nhap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.loai_go?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || rec.ket_luan === statusFilter;
      const matchesFsc = fscFilter === 'all' || rec.chung_chi_fsc === fscFilter;
      const matchesDate = !dateFilter || rec.ngay_nt === dateFilter;

      return matchesSearch && matchesStatus && matchesFsc && matchesDate;
    });
  }, [records, searchTerm, statusFilter, fscFilter, dateFilter]);

  // Aggregate stats
  const totalVolume = useMemo(() => {
    return filteredRecords.reduce((sum, rec) => {
      return sum + rec.quy_cach_a.reduce((subSum, item) => subSum + item.kl_nguyen_thuy, 0);
    }, 0);
  }, [filteredRecords]);

  const totalQty = useMemo(() => {
    return filteredRecords.reduce((sum, rec) => {
      return sum + rec.quy_cach_a.reduce((subSum, item) => subSum + item.so_thanh, 0);
    }, 0);
  }, [filteredRecords]);

  const passCount = useMemo(() => {
    return filteredRecords.filter(rec => rec.ket_luan === 'Đạt').length;
  }, [filteredRecords]);

  const passRate = useMemo(() => {
    if (filteredRecords.length === 0) return 0;
    return Math.round((passCount / filteredRecords.length) * 100);
  }, [filteredRecords, passCount]);

  return (
    <div className="space-y-6">
      
      {/* Redesigned Premium Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Records */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng số biên bản</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{filteredRecords.length}</span>
                <span className="text-xs text-slate-400 font-semibold">bản</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Lưu trữ bảo mật local</p>
            </div>
            <div className="bg-blue-50/80 text-blue-600 p-3 rounded-xl transition-colors duration-300 group-hover:bg-blue-100/80">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Metric 2: Total Volume */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1 overflow-hidden w-full">
              <span className="text-[11px] font-bold text-emerald-600/90 uppercase tracking-wider block">Tổng khối lượng</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-emerald-600 tracking-tight font-mono">{formatVolNoTrailing(totalVolume)}</span>
                <span className="text-xs text-emerald-500 font-bold">m³</span>
              </div>
              <p className="text-[10px] text-emerald-700/80 font-medium italic truncate" title={numberToVietnameseWords(totalVolume, false)}>
                {totalVolume > 0 ? `"${numberToVietnameseWords(totalVolume, false)}"` : "Chưa có gỗ"}
              </p>
            </div>
            <div className="bg-emerald-50/80 text-emerald-600 p-3 rounded-xl transition-colors duration-300 group-hover:bg-emerald-100/80 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Metric 3: Total Quantity */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider block">Tổng sản lượng</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-indigo-600 tracking-tight font-mono">{totalQty.toLocaleString('vi-VN')}</span>
                <span className="text-xs text-indigo-500 font-bold">thanh</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Gỗ keo xẻ trồng</p>
            </div>
            <div className="bg-indigo-50/80 text-indigo-600 p-3 rounded-xl transition-colors duration-300 group-hover:bg-indigo-100/80">
              <Plus className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Metric 4: Quality Rate */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider block">Tỉ lệ đạt QC</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-teal-600 tracking-tight">{passRate}</span>
                <span className="text-sm font-bold text-teal-500">%</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{passCount} biên bản thông qua</p>
            </div>
            <div className="bg-teal-50/80 text-teal-600 p-3 rounded-xl transition-colors duration-300 group-hover:bg-teal-100/80">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Compact Control Center & Advanced Search */}
      <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-xs space-y-4">
        
        {/* Search Line & Major action buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Nhập số BBNT, nhà cung ứng gỗ keo, loại gỗ cần tìm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition duration-150"
              id="list-search-input"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {records.length > 0 && onDeleteAll && (
              <button
                onClick={() => setIsDeletingAll(true)}
                className="flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition shadow-3xs cursor-pointer"
                id="list-btn-delete-all"
                title="Xóa vĩnh viễn tất cả biên bản"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa tất cả ({records.length})</span>
              </button>
            )}
            {records.length === 0 && (
              <button
                onClick={onLoadSample}
                className="flex items-center gap-1.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                id="list-btn-load-sample"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Nạp lại GB 12.05
              </button>
            )}
            <button
              onClick={onCreateNew}
              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-95 font-semibold text-xs px-4.5 py-2.5 rounded-xl transition duration-150 shadow-sm hover:shadow-md cursor-pointer active:scale-97"
              id="list-btn-create"
            >
              <Plus className="w-4 h-4" />
              Lập biên bản mới
            </button>
          </div>
        </div>

        {/* Polished Filter Row */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3.5 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Lọc nhanh:</span>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 border border-slate-200/80 rounded-xl bg-slate-50/50 px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-700 font-medium cursor-pointer"
              id="filter-date"
            />
          </div>

          {/* FSC Select */}
          <select
            value={fscFilter}
            onChange={(e) => setFscFilter(e.target.value)}
            className="border border-slate-200/80 rounded-xl bg-slate-50/50 px-3 py-1.5 focus:outline-none text-slate-700 font-semibold cursor-pointer"
            id="filter-fsc"
          >
            <option value="all">Tất cả chứng chỉ môi trường</option>
            <option value="FSC 100%">FSC 100%</option>
            <option value="FSC Mix">FSC Mix</option>
            <option value="FSC CW">FSC CW</option>
            <option value="KLS">Không chứng chỉ (KLS)</option>
          </select>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200/80 rounded-xl bg-slate-50/50 px-3 py-1.5 focus:outline-none text-slate-700 font-semibold cursor-pointer"
            id="filter-status"
          >
            <option value="all">Tất cả kết luận</option>
            <option value="Đạt">Đạt (Thông quan)</option>
            <option value="Không đạt">Không đạt (Hủy hất)</option>
          </select>

          {/* Clear button if any filter applied */}
          {(searchTerm || statusFilter !== 'all' || fscFilter !== 'all' || dateFilter) && (
            <button
              onClick={handleClearFilters}
              className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer hover:underline ml-auto pr-1"
              id="filter-clear-all"
            >
              Hủy bộ lọc ×
            </button>
          )}
        </div>
      </div>

      {/* Main List Table Container */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 w-12 text-center select-none">STT</th>
                <th className="px-5 py-3.5 text-slate-600">Số BBNT / Lập ngày</th>
                <th className="px-5 py-3.5 text-slate-600">Đối tác cung ứng & Loại gỗ</th>
                <th className="px-5 py-3.5 text-right text-slate-600">Khối lượng</th>
                <th className="px-5 py-3.5 text-center text-slate-600">Chứng chỉ môi trường</th>
                <th className="px-5 py-3.5 text-center text-slate-600">Kiểm định</th>
                <th className="px-5 py-3.5 text-right w-48 text-slate-600 select-none">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.map((bb, index) => {
                const totalVol = bb.quy_cach_a.reduce((sum, item) => sum + item.kl_nguyen_thuy, 0);
                const totalRows = bb.quy_cach_a.length;

                return (
                  <tr key={bb.id} className="hover:bg-slate-50/50 group transition duration-150">
                    <td className="px-5 py-4 text-center text-slate-400 font-bold font-mono">
                      {index + 1}
                    </td>
                    
                    {/* Code & NT Date */}
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900 cursor-pointer hover:text-emerald-600 transition" onClick={() => onSelect(bb)}>
                        {bb.ma_bbnt}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-350" />
                        {bb.ngay_nt ? new Date(bb.ngay_nt).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'}) : "Chưa rõ"}
                      </div>
                    </td>

                    {/* Partner & Wood type */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800 line-clamp-1 max-w-sm">{bb.don_vi_cung_ung}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 max-w-sm mt-1">{bb.loai_go} • <strong className="text-slate-500 font-semibold">{totalRows} quy cách xẻ</strong></div>
                    </td>

                    {/* Wood total volume */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-mono font-bold text-slate-900 text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 group-hover:bg-white transition">
                        {formatVolNoTrailing(totalVol)} m³
                      </span>
                    </td>

                    {/* FSC Badge */}
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[9px] tracking-wide uppercase ${
                        bb.chung_chi_fsc?.includes('100%') 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/65'
                          : bb.chung_chi_fsc?.includes('Mix')
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/65'
                          : 'bg-amber-50 text-amber-700 border border-amber-100/65'
                      }`}>
                        {bb.chung_chi_fsc?.split(' ')[0] || bb.chung_chi_fsc}
                      </span>
                    </td>

                    {/* Outcome Stamp */}
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        bb.ket_luan === 'Đạt'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50'
                          : 'bg-rose-50 text-rose-700 border border-rose-100/50'
                      }`}>
                        {bb.ket_luan === 'Đạt' ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            <span>Đạt chuẩn</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                            <span>Hủy lỗi</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Row controls */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ExportDropdown 
                          bienBan={bb} 
                          onPrint={(b, preferred) => onPrint(b)} 
                          align="right" 
                          buttonId={`list-export-${bb.id}`}
                        />
                        
                        <button
                          onClick={() => onPrint(bb)}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                          title="Xem bản in phiếu & ký xác nhận"
                          id={`list-print-${bb.id}`}
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEdit(bb)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Chỉnh sửa biên bản này"
                          id={`list-edit-${bb.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDuplicate(bb)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Nhân bản biên bản"
                          id={`list-duplicate-${bb.id}`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setRecordToDelete(bb)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa biên bản này"
                          id={`list-delete-${bb.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-400 italic">
                    {records.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-4 py-4">
                        <div className="bg-slate-50 text-slate-400 p-4 rounded-full w-fit mx-auto">
                          <Layers className="w-8 h-8" />
                        </div>
                        <p className="text-slate-500 font-medium">Chưa có biên bản nghiệm thu nào trong hệ thống tự động.</p>
                        <button
                          onClick={onLoadSample}
                          className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-3xs cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Nạp dữ liệu mẫu gỗ keo (GB 12.05)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 py-4">
                        <p className="text-slate-500 font-semibold">Không tìm thấy biên bản gỗ nào.</p>
                        <p className="text-[11px] text-slate-400">Vui lòng kiểm tra lại bộ lọc hoặc điều chỉnh từ khóa tìm kiếm.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgraded Modal: Delete Single Invoice */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">Xác nhận xóa biên bản?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hành động này sẽ xóa vĩnh viễn biên bản nghiệm thu mang mã hiệu <strong className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 border border-rose-100/50 rounded">{recordToDelete.ma_bbnt}</strong>.
                </p>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-2.5 text-[10.5px] text-amber-700 leading-normal">
                  ⚠️ <strong>Lưu ý:</strong> Dữ liệu đã xóa trên bộ nhớ cục bộ sẽ bị hủy vĩnh viễn và không hề lưu dự phòng ở máy chủ.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition duration-150 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(recordToDelete.id);
                  setRecordToDelete(null);
                }}
                className="px-4.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgraded Modal: Delete All Invoices */}
      {isDeletingAll && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-rose-100 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="bg-rose-100/80 text-rose-700 p-3.5 rounded-2xl shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-rose-700 uppercase tracking-wide flex items-center gap-1.5">
                  ⚠️ CẢNH BÁO NGUY HIỂM!
                </h3>
                <p className="text-sm font-bold text-slate-800">
                  Xác nhận xóa sạch toàn bộ ({records.length}) hồ sơ đã lập?
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Thao tác này sẽ dọn sạch hoàn toàn <strong className="text-rose-600 font-extrabold">{records.length} biên bản</strong> hiện có trên bộ nhớ thiết bị. Người dùng sẽ mất toàn bộ tiến trình và lịch sử nghiệm thu gỗ keo từ trước đến nay, không thể phục hồi dưới bất kỳ hình thức nào.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setIsDeletingAll(false)}
                className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-850 text-xs font-bold rounded-xl transition duration-150 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAll) {
                    onDeleteAll();
                  }
                  setIsDeletingAll(false);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition duration-150 shadow-md active:scale-97 cursor-pointer"
              >
                Vẫn xóa tất cả hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
