/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { BienBan } from '../types';
import { 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  DollarSign,
  ArrowRight,
  ClipboardList,
  Save,
  HelpCircle,
  FileSpreadsheet,
  Printer,
  Sliders,
  Eye,
  Activity
} from 'lucide-react';

import { 
  PlanCycle, 
  PlanSpecification, 
  LOCAL_STORAGE_CYCLES_KEY, 
  LOCAL_STORAGE_SPECS_KEY,
  INITIAL_CYCLES,
  INITIAL_SPECS
} from './WoodPlanDashboard';

interface WoodPlanTrackingProps {
  allRecords: BienBan[];
  onSelectCycle: (cycleId: string) => void;
  onGoToSection: (section: string) => void;
}

export default function WoodPlanTracking({ allRecords = [], onSelectCycle, onGoToSection }: WoodPlanTrackingProps) {
  const [cycles, setCycles] = useState<PlanCycle[]>([]);
  const [specifications, setSpecifications] = useState<PlanSpecification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Modals
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [newCycleData, setNewCycleData] = useState({ name: '', monthStart: '05', monthEnd: '06', year: '2026' });
  const [deletingCycleId, setDeletingCycleId] = useState<string | null>(null);

  // Load Initial Cycles and Specs
  useEffect(() => {
    const savedCycles = localStorage.getItem(LOCAL_STORAGE_CYCLES_KEY);
    let resolvedCycles = INITIAL_CYCLES;
    if (savedCycles) {
      try {
        const parsed = JSON.parse(savedCycles);
        if (Array.isArray(parsed) && parsed.length > 0) resolvedCycles = parsed;
      } catch (e) {
        console.error(e);
      }
    }
    setCycles(resolvedCycles);

    const savedSpecs = localStorage.getItem(LOCAL_STORAGE_SPECS_KEY);
    let resolvedSpecs = INITIAL_SPECS;
    if (savedSpecs) {
      try {
        const parsed = JSON.parse(savedSpecs);
        if (Array.isArray(parsed)) resolvedSpecs = parsed;
      } catch (e) {
        console.error(e);
      }
    }
    setSpecifications(resolvedSpecs);
  }, []);

  const saveCyclesToCache = (updated: PlanCycle[]) => {
    setCycles(updated);
    localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(updated));
  };

  const saveSpecsToCache = (updated: PlanSpecification[]) => {
    setSpecifications(updated);
    localStorage.setItem(LOCAL_STORAGE_SPECS_KEY, JSON.stringify(updated));
  };

  // Standardize dimension string for matching size inputs
  const cleanInputSize = (sizeStr: string): string => {
    return (sizeStr || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/×|x/g, "*");
  };

  // Dimensional slash logic matcher (e.g. "380/760*56*17" matches "380*56*17" or "760*56*17")
  const matchQuyCach = (planSpec: string, recordSpec: string): boolean => {
    const p = cleanInputSize(planSpec);
    const r = cleanInputSize(recordSpec);
    if (!p || !r) return false;
    if (p === r) return true;
    
    if (p.includes('/')) {
      const parts = p.split('*'); // e.g. ["380/760", "56", "17"]
      if (parts.length >= 3) {
        const lengthsStr = parts[0]; 
        const remainingStr = parts.slice(1).join('*'); 
        
        const lengths = lengthsStr.split('/'); 
        return lengths.some(l => {
          const joined = `${l}*${remainingStr}`;
          return joined === r;
        });
      }
    }
    return false;
  };

  // Smart background synchronization of all cycles with live QC record database
  const runSmartUpdateSync = (forceAlert = false) => {
    setIsSyncing(true);
    
    const targetCycles = [...cycles];
    const nextSpecifications = specifications.map(spec => {
      const cycle = targetCycles.find(c => c.id === spec.cycleId);
      if (!cycle) return spec;

      const { months, year } = cycle;
      const targetYearNum = parseInt(year, 10);
      const targetMonthsSet = new Set(months.map(m => m.trim().padStart(2, '0')));

      const updatedAllocations = spec.allocations.map(alloc => {
        let accumulatedVolume = 0;

        allRecords.forEach(record => {
          if (!record.ngay_nt) return;
          
          const parts = record.ngay_nt.split('-');
          if (parts.length >= 2) {
            const rYear = parseInt(parts[0], 10);
            const rMonth = parts[1].padStart(2, '0');

            const yearMatch = rYear === targetYearNum;
            const monthMatch = targetMonthsSet.has(rMonth);
            const supplierMatch = record.don_vi_cung_ung?.trim().toUpperCase() === alloc.supplierName.trim().toUpperCase();

            if (yearMatch && monthMatch && supplierMatch) {
              if (record.quy_cach_a) {
                record.quy_cach_a.forEach(woodItem => {
                  if (matchQuyCach(spec.quy_cach, woodItem.kich_thuoc_mm)) {
                    accumulatedVolume += (woodItem.kl_nguyen_thuy || 0);
                  }
                });
              }
            }
          }
        });

        const finalActual = parseFloat(accumulatedVolume.toFixed(3));
        return {
          ...alloc,
          actualVolume: finalActual
        };
      });

      return {
        ...spec,
        allocations: updatedAllocations
      };
    });

    saveSpecsToCache(nextSpecifications);
    setIsSyncing(false);

    const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncTime(currentTime);

    if (forceAlert) {
      alert(`✓ Đã tự động hạch toán đối soát sản lượng xong!\nĐã quét ${allRecords.length} biên bản nghiệm thu QC để cập nhật tiến độ live.`);
    }
  };

  // Auto sync on mount if allRecords changed
  useEffect(() => {
    if (cycles.length > 0 && specifications.length > 0) {
      runSmartUpdateSync(false);
    }
  }, [allRecords, cycles.length, specifications.length]);

  // Calculations for each cycle
  const computedCycles = useMemo(() => {
    return cycles.map(cycle => {
      const cycleSpecs = specifications.filter(s => s.cycleId === cycle.id);
      
      let totalPlan = 0;
      let totalActual = 0;

      cycleSpecs.forEach(spec => {
        const specPlan = (spec.month1_volume ?? 0) + (spec.month2_volume ?? 0);
        if (specPlan > 0) {
          totalPlan += specPlan;
        } else {
          totalPlan += spec.allocations.reduce((sum, a) => sum + a.plannedVolume, 0);
        }
        totalActual += spec.allocations.reduce((sum, a) => sum + a.actualVolume, 0);
      });

      const difference = totalActual - totalPlan;
      const progress = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;

      return {
        ...cycle,
        specCount: cycleSpecs.length,
        totalPlan: parseFloat(totalPlan.toFixed(2)),
        totalActual: parseFloat(totalActual.toFixed(2)),
        difference: parseFloat(difference.toFixed(2)),
        progress: parseFloat(progress.toFixed(1))
      };
    });
  }, [cycles, specifications]);

  // Filter cycles based on search
  const filteredCycles = useMemo(() => {
    return computedCycles.filter(c => {
      if (!searchQuery.trim()) return true;
      const term = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.year.includes(term) ||
        `tháng ${c.months.join('-')}`.toLowerCase().includes(term)
      );
    });
  }, [computedCycles, searchQuery]);

  // Handlers
  const handleCreateCycleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleData.name.trim()) {
      alert("Vui lòng điền tên đợt kế hoạch!");
      return;
    }

    const newId = `cycle-${Date.now()}`;
    const newCycle: PlanCycle = {
      id: newId,
      name: newCycleData.name,
      months: [newCycleData.monthStart, newCycleData.monthEnd],
      year: newCycleData.year
    };

    saveCyclesToCache([...cycles, newCycle]);
    setShowCycleModal(false);
    setNewCycleData({ name: '', monthStart: '05', monthEnd: '06', year: '2026' });

    alert(`✓ Lập đợt kế hoạch sấy gỗ "${newCycle.name}" thành công!`);
  };

  const handleDeleteCycle = (cycleId: string, cycleName: string) => {
    if (cycles.length <= 1) {
      alert("⚠️ Hệ thống phải giữ lại ít nhất một kỳ kế hoạch thu mua!");
      return;
    }

    const updatedSpecs = specifications.filter(s => s.cycleId !== cycleId);
    const updatedCycles = cycles.filter(c => c.id !== cycleId);
    
    saveCyclesToCache(updatedCycles);
    saveSpecsToCache(updatedSpecs);

    setDeletingCycleId(null);
    alert(`✓ Đã xóa kỳ kế hoạch "${cycleName}" thành công.`);
  };

  const exportSingleCyclePlanExcel = (cycle: any) => {
    try {
      const cycleSpecs = specifications.filter(s => s.cycleId === cycle.id);
      const rows = [];
      rows.push([`BÁO CÁO CHỈ TIÊU KẾ HOẠCH MULTI-SUPPLIERS`]);
      rows.push([`Kỳ hoạt động:`, cycle.name]);
      rows.push([`Năm kế hoạch:`, cycle.year]);
      rows.push([`Ngày kết xuất:`, new Date().toLocaleDateString('vi-VN')]);
      rows.push([]); 

      rows.push([
        "STT",
        "Quy cách kích thước",
        "Nhóm sản phẩm",
        "Nhà cung cấp đối tác",
        "Sản lượng Kế hoạch phân bổ (m³)",
        "Sản lượng Thực mua m³",
        "Tiến độ phân phối (%)",
        "Ghi chú phân xưởng"
      ]);

      let idx = 1;
      cycleSpecs.forEach(spec => {
        if (spec.allocations.length === 0) {
          rows.push([
            idx,
            spec.quy_cach,
            spec.group,
            "Chưa phân bổ đối tác",
            (spec.month1_volume ?? 0) + (spec.month2_volume ?? 0),
            0,
            "0%",
            spec.ghi_chu || ""
          ]);
          idx++;
        } else {
          spec.allocations.forEach(a => {
            const specPlan = a.plannedVolume;
            const specActual = a.actualVolume;
            const progressRate = specPlan > 0 ? `${Math.round((specActual / specPlan) * 100)}%` : "0%";
            rows.push([
              idx,
              spec.quy_cach,
              spec.group,
              a.supplierName,
              specPlan,
              specActual,
              progressRate,
              spec.ghi_chu || ""
            ]);
            idx++;
          });
        }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 25 }, // Quy cách
        { wch: 20 }, // Nhóm
        { wch: 35 }, // NCC
        { wch: 25 }, // Sản lượng KH
        { wch: 22 }, // Thực mua
        { wch: 18 }, // Tiến độ
        { wch: 30 }  // Ghi chú
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Ke hoach chi tiet");
      XLSX.writeFile(wb, `Ke_hoach_mua_go_NLG_${cycle.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
    } catch (e) {
      alert("Lỗi xuất Excel: " + e);
    }
  };

  return (
    <div className="space-y-6 py-2 animate-fade-in font-sans text-left">
      
      {/* Title Header area matching Bảng theo dõi phiếu QC header design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
        <div>
          <h4 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce shadow-sm"></span>
            BẢNG THEO DÕI KẾ HOẠCH MUA GỖ THÔ (PHÒNG NGUYÊN LIỆU)
          </h4>
          <p className="text-[11.5px] text-slate-500 font-semibold mt-1">
            Chuyên cho phòng Nguyên liệu: Thiết lập hạn ngạch thu mua, theo dõi tổng chỉ tiêu sấy và tỷ lệ thực hiện tích lũy từ các biên bản QC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lastSyncTime && (
            <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-50 px-2 py-1 rounded">
              Live Sync: {lastSyncTime}
            </span>
          )}
          <button
            type="button"
            onClick={() => runSmartUpdateSync(true)}
            disabled={isSyncing}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-650 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            title="Đồng bộ cập nhật ngay sản lượng m³ từ toàn bộ phiếu gỗ QC"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            Đối soát live m³
          </button>
          
          <button
            type="button"
            onClick={() => setShowCycleModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Lập kế hoạch mới
          </button>
        </div>
      </div>

      {/* Main card panel like 'Bảng theo dõi phiếu QC' */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-3xs overflow-hidden">
        
        {/* Filters and search box identical to Tabbed Dashboard lists */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-120 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Bộ lọc dữ liệu</span>
            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              Kỳ lưu trữ: <span className="font-mono text-blue-600 font-black">{filteredCycles.length}</span> đợt
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm tên đợt, năm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-250 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-350 rounded-xl pl-9 pr-4 py-2 w-full sm:w-64 text-xs font-bold text-slate-800 shadow-3xs"
              />
            </div>
          </div>
        </div>

        {/* Elegant tracking table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/35 border-b border-slate-125 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                <th className="px-5 py-3.5 w-[5%] text-center">STT</th>
                <th className="px-5 py-3.5 w-[25%]">Tên đợt kế hoạch</th>
                <th className="px-5 py-3.5 w-[12%] text-center">Năm quản lý</th>
                <th className="px-5 py-3.5 w-[14%] text-center">Kỳ hoạt động</th>
                <th className="px-5 py-3.5 text-right w-[11%]">Chỉ tiêu định biên</th>
                <th className="px-5 py-3.5 text-right w-[11%]">Sản lượng m³ live</th>
                <th className="px-5 py-3.5 text-center w-[10%]">Tiến độ đợt</th>
                <th className="px-5 py-3.5 text-center w-[12%]">Trạng thái</th>
                <th className="px-4 py-3.5 text-right w-[15%]">Tác vụ quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705">
              {filteredCycles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400 font-semibold">
                    <HelpCircle className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    Không có đợt kế hoạch thu mua nào khớp với điều kiện lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredCycles.map((cycle, index) => {
                  const isFinished = cycle.progress >= 100;
                  const isStarted = cycle.totalActual > 0;
                  
                  return (
                    <tr key={cycle.id} className="hover:bg-slate-50/30 transition duration-100">
                      {/* STT */}
                      <td className="px-5 py-4 text-center text-slate-400 font-mono font-bold">
                        {index + 1}
                      </td>

                      {/* Name */}
                      <td className="px-5 py-4 font-black text-slate-900 truncate" title={cycle.name}>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${isFinished ? 'bg-emerald-500' : isStarted ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
                          <span>{cycle.name}</span>
                        </div>
                      </td>

                      {/* Year */}
                      <td className="px-5 py-4 text-center font-bold font-mono text-slate-600">
                        {cycle.year}
                      </td>

                      {/* Months cycle duration */}
                      <td className="px-5 py-4 text-center font-bold text-slate-500">
                        Tháng {cycle.months.join(' - ')}
                      </td>

                      {/* Target plan volume */}
                      <td className="px-5 py-4 text-right font-mono font-extrabold text-slate-800 text-xs">
                        {cycle.totalPlan > 0 ? `${cycle.totalPlan.toLocaleString('vi-VN')} m³` : '0.00 m³'}
                      </td>

                      {/* Direct actual volume check */}
                      <td className="px-5 py-4 text-right font-mono font-black text-slate-900 text-xs bg-slate-50/10">
                        {cycle.totalActual > 0 ? `${cycle.totalActual.toLocaleString('vi-VN')} m³` : '0 m³'}
                      </td>

                      {/* Progress bar and percent indicator */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <span className={`font-mono text-xs font-black ${isFinished ? 'text-emerald-700' : isStarted ? 'text-blue-700' : 'text-slate-505'}`}>
                            {cycle.progress.toFixed(1)}%
                          </span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${isFinished ? 'bg-emerald-500' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(100, cycle.progress)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Completed status badge */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.75 rounded-full text-[9px] font-black uppercase tracking-wider border leading-none ${
                          isFinished 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : isStarted 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {isFinished ? 'Đạt chỉ tiêu' : isStarted ? 'Đang thực hiện' : 'Chờ bắt đầu'}
                        </span>
                      </td>

                      {/* Action buttons like table actions */}
                      <td className="px-4 py-4 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* Go to cycle details */}
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCycle(cycle.id);
                              onGoToSection('plan');
                            }}
                            className="p-1 px-2.5 bg-blue-50 hover:bg-blue-105 border border-blue-150 text-blue-700 font-extrabold text-[10.5px] rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                            title="Xem cơ cấu quy cách & phân bổ nhà cung cấp"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                            Chi tiết
                          </button>

                          {/* Export single Excel */}
                          <button
                            type="button"
                            onClick={() => exportSingleCyclePlanExcel(cycle)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Xuất file đối soát Excel riêng cho kỳ này"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          {/* Delete Plan */}
                          {deletingCycleId === cycle.id ? (
                            <div className="flex items-center gap-1 animate-fade-in">
                              <button
                                type="button"
                                onClick={() => handleDeleteCycle(cycle.id, cycle.name)}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] px-1.5 py-0.5 rounded font-black cursor-pointer"
                                title="Bấm lại để đồng ý xóa vĩnh viễn"
                              >
                                Xóa?
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingCycleId(null)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingCycleId(cycle.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa kỳ kế hoạch mua hàng này"
                            >
                              <Trash2 className="w-3.8 h-3.8" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footnote instruction indicator block like QC dashboard footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-120 text-[10.5px] text-slate-400 font-semibold italic flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>* Hệ thống tự động thu thập và phân tích dữ liệu khối lượng m³ gỗ keo sấy thô thực tế ngay khi phiếu QC được lưu hoàn tất.</span>
          <span className="font-medium text-slate-505 font-sans">© NLG Workspace</span>
        </div>

      </div>

      {/* CREATE NEW KỲ KẾ HOẠCH MODAL POPUP (Identical design style to WoodPlanDashboard modal) */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-150">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase font-mono flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                Lập Kỳ Kế Hoạch Thu Mua Mới
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCycleModal(false)}
                className="text-slate-450 hover:text-white transition duration-100 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCycleSubmit} className="p-6 space-y-4 font-sans">
              
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Tên đợt kế hoạch sấy gỗ NL</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đợt Tháng 09 - Tháng 10/2026"
                  value={newCycleData.name}
                  onChange={(e) => setNewCycleData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Tháng đầu đợt</label>
                  <select
                    value={newCycleData.monthStart}
                    onChange={(e) => setNewCycleData(prev => ({ ...prev, monthStart: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Tháng sau đợt</label>
                  <select
                    value={newCycleData.monthEnd}
                    onChange={(e) => setNewCycleData(prev => ({ ...prev, monthEnd: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Năm kế hoạch (YYYY)</label>
                <input
                  type="text"
                  required
                  placeholder="2026"
                  maxLength={4}
                  value={newCycleData.year}
                  onChange={(e) => setNewCycleData(prev => ({ ...prev, year: e.target.value.replace(/\D/g, '') }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCycleModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  Khởi Tạo Đợt
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
