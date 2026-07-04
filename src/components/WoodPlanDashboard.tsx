/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { BienBan } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  RefreshCw, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  Info,
  DollarSign,
  Layers,
  ArrowRight,
  User,
  Package,
  ClipboardCheck,
  Save,
  HelpCircle,
  FileSpreadsheet,
  Printer
} from 'lucide-react';

// --- DATA TYPES ---
export interface SupplierAllocation {
  supplierName: string;
  plannedVolume: number; // Kế hoạch phân bổ (m³)
  actualVolume: number;  // Thực tế đã mua (m³)
}

export interface PlanSpecification {
  id: string;
  cycleId: string;
  group: string;
  quy_cach: string;
  ghi_chu?: string;
  allocations: SupplierAllocation[];
  month1_volume?: number; // Kế hoạch Tháng 1
  month2_volume?: number; // Kế hoạch Tháng 2
}

export interface PlanCycle {
  id: string;
  name: string;
  months: string[]; // e.g. ["05", "06"]
  year: string;     // e.g. "2026"
}

// --- LOCAL STORAGE KEYS ---
export const LOCAL_STORAGE_CYCLES_KEY = 'wood_plan_cycles_v2';
export const LOCAL_STORAGE_SPECS_KEY = 'wood_plan_specifications_v2';

// Dummy variables to maintain backward-compatibility with InspectionForm.tsx imports
export const DEFAULT_PLAN_ITEMS = [];
export const LOCAL_STORAGE_PLAN_KEY = 'wood_purchase_plan_db';

// --- SEED INITIAL SEED DATA ---
export const INITIAL_CYCLES: PlanCycle[] = [
  { id: 'cycle-2026-05-06', name: 'Đợt Tháng 05 - Tháng 06/2026', months: ['05', '06'], year: '2026' },
  { id: 'cycle-2026-07-08', name: 'Đợt Tháng 07 - Tháng 08/2026', months: ['07', '08'], year: '2026' },
  { id: 'cycle-2026-09-10', name: 'Đợt Tháng 09 - Tháng 10/2026', months: ['09', '10'], year: '2026' }
];

export const INITIAL_SPECS: PlanSpecification[] = [
  // --- Cycle 2026-05-06 Seeds ---
  {
    id: 'spec-1',
    cycleId: 'cycle-2026-05-06',
    group: 'Phối Nammaro',
    quy_cach: '380/760*56*17',
    ghi_chu: 'Mác gỗ thô sấy',
    month1_volume: 150,
    month2_volume: 200,
    allocations: [
      { supplierName: 'CÔNG TY GIA BẢO', plannedVolume: 150, actualVolume: 153.53 },
      { supplierName: 'DNTN SÁNG LẬP', plannedVolume: 200, actualVolume: 162.00 }
    ]
  },
  {
    id: 'spec-2',
    cycleId: 'cycle-2026-05-06',
    group: 'Phối Nammaro',
    quy_cach: '480*56*20',
    ghi_chu: 'Phối gỗ Nammaro dầy 20',
    month1_volume: 75,
    month2_volume: 85,
    allocations: [
      { supplierName: 'CÔNG TY GIA BẢO', plannedVolume: 75, actualVolume: 61.30 },
      { supplierName: 'CÔNG TY CP LÂM NGHIỆP YÊN THẾ', plannedVolume: 85, actualVolume: 72.84 }
    ]
  },
  {
    id: 'spec-3',
    cycleId: 'cycle-2026-05-06',
    group: 'Phối Nammaro',
    quy_cach: '540*56*20',
    ghi_chu: 'Đã giao đầy đủ',
    month1_volume: 20,
    month2_volume: 25,
    allocations: [
      { supplierName: 'DNTN SÁNG LẬP', plannedVolume: 45, actualVolume: 57.31 }
    ]
  },
  {
    id: 'spec-4',
    cycleId: 'cycle-2026-05-06',
    group: 'Phối Nammaro',
    quy_cach: '600*56*20',
    ghi_chu: 'Phải đốc thúc NCC',
    month1_volume: 110,
    month2_volume: 145,
    allocations: [
      { supplierName: 'CÔNG TY GIA BẢO', plannedVolume: 110, actualVolume: 50.00 },
      { supplierName: 'DNTN SÁNG LẬP', plannedVolume: 145, actualVolume: 88.50 }
    ]
  }
];

interface WoodPlanDashboardProps {
  allRecords: BienBan[];
  defaultCycleId?: string;
}

export default function WoodPlanDashboard({ allRecords = [], defaultCycleId }: WoodPlanDashboardProps) {
  // --- ACCORDION & VIEW STATE ---
  const [activeTab, setActiveTab] = useState<'planning' | 'report-spec'>('planning');
  const [cycles, setCycles] = useState<PlanCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(defaultCycleId || 'cycle-2026-05-06');
  const [specifications, setSpecifications] = useState<PlanSpecification[]>([]);

  // Watch for external cycle select updates
  useEffect(() => {
    if (defaultCycleId) {
      setSelectedCycleId(defaultCycleId);
    }
  }, [defaultCycleId]);
  
  // Navigation / Search within planning tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'all' | 'I' | 'II' | 'III'>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modal State
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [specModalMode, setSpecModalMode] = useState<'add' | 'edit'>('add');
  const [editingSpec, setEditingSpec] = useState<Partial<PlanSpecification>>({});
  
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [newCycleData, setNewCycleData] = useState({ name: '', monthStart: '05', monthEnd: '06', year: '2026' });

  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteData, setPasteData] = useState('');

  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Safe state-based tracking variables for deleting items (Iframe/Embedded-safe)
  const [confirmDeleteSpecId, setConfirmDeleteSpecId] = useState<string | null>(null);
  const [confirmDeleteCycleId, setConfirmDeleteCycleId] = useState<string | null>(null);
  const [confirmDeleteAllocSupplierName, setConfirmDeleteAllocSupplierName] = useState<{ specId: string; supplierName: string } | null>(null);

  // --- INITIAL DATA SEEDING ---
  useEffect(() => {
    // 1. Load or seed plan cycles
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
    localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(resolvedCycles));

    // Determine current default active cycle
    if (resolvedCycles.some(c => c.id === 'cycle-2026-05-06')) {
      setSelectedCycleId('cycle-2026-05-06');
    } else if (resolvedCycles.length > 0) {
      setSelectedCycleId(resolvedCycles[0].id);
    }

    // 2. Load or seed specifications list
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
    localStorage.setItem(LOCAL_STORAGE_SPECS_KEY, JSON.stringify(resolvedSpecs));
  }, []);

  const saveCyclesToCache = (updated: PlanCycle[]) => {
    setCycles(updated);
    localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(updated));
  };

  const saveSpecsToCache = (updated: PlanSpecification[]) => {
    setSpecifications(updated);
    localStorage.setItem(LOCAL_STORAGE_SPECS_KEY, JSON.stringify(updated));
  };

  // --- EXCEL & INLINE EDITING HELPERS ---
  const getMonthHeader = (cycle: PlanCycle, index: number): string => {
    if (!cycle || !cycle.months || cycle.months.length <= index) {
      return index === 0 ? "T5" : "T6";
    }
    const m = cycle.months[index];
    return `T${parseInt(m, 10)}`;
  };

  const handleUpdateSpecVolume = (specId: string, field: 'month1_volume' | 'month2_volume', value: number) => {
    const updated = specifications.map(s => {
      if (s.id === specId) {
        return {
          ...s,
          [field]: Math.max(0, value)
        };
      }
      return s;
    });
    saveSpecsToCache(updated);
  };

  const handleAutoDistributeEvenly = (specId: string) => {
    const spec = specifications.find(s => s.id === specId);
    if (!spec) return;

    const N = spec.allocations.length;
    if (N === 0) {
      alert("⚠️ Quy cách này chưa được gán nhà cung cấp nào! Hãy gán ít nhất một nhà cung cấp ở mục bên dưới.");
      return;
    }

    const totalPlan = (spec.month1_volume ?? 0) + (spec.month2_volume ?? 0);
    if (totalPlan <= 0) {
      alert("⚠️ Khối lượng kế hoạch hiện bằng 0 (Hãy điền kế hoạch các tháng hoặc dán từ Excel trước)!");
      return;
    }

    const dividedPlan = parseFloat((totalPlan / N).toFixed(3));

    const updated = specifications.map(s => {
      if (s.id === specId) {
        const nextAllocations = s.allocations.map(alloc => ({
          ...alloc,
          plannedVolume: dividedPlan
        }));
        return { ...s, allocations: nextAllocations };
      }
      return s;
    });

    saveSpecsToCache(updated);
    alert(`✓ Đã phân bổ đều ${totalPlan} m³ cho ${N} nhà cung cấp (${dividedPlan} m³ mỗi nhà) thành công!`);
  };

  const handleImportPaste = () => {
    if (!pasteData.trim()) {
      alert("⚠️ Vui lòng dán dữ liệu copy từ Excel vào khung văn bản!");
      return;
    }

    const lines = pasteData.split(/\r?\n/);
    let successCount = 0;
    const importedSpecs: PlanSpecification[] = [];

    lines.forEach(line => {
      if (!line.trim()) return;
      const columns = line.split('\t'); // tab separated from excel
      if (columns.length < 1) return;

      const quyCachInput = columns[0].trim();
      if (!quyCachInput) return;

      // Clean Excel number strings (replace spaces, dots/commas as separators where appropriate)
      // Excel values usually copy as e.g. "120.50" or "120,50" or "100"
      const cleanNum = (str: string) => {
        if (!str) return 0;
        const clean = str.trim()
          .replace(/\s/g, '')                 // remove spaces
          .replace(/\./g, '')                  // common Vietnamese dot thousands separator
          .replace(/,/g, '.');                 // swap comma for dot decimal
        return parseFloat(clean) || 0;
      };

      const m1Val = columns.length > 1 ? cleanNum(columns[1]) : 0;
      const m2Val = columns.length > 2 ? cleanNum(columns[2]) : 0;

      // Autoselect category group based on keywords
      let groupName: 'I. Phối Nammaro' | 'II. Phối Askholmen + Runnen' | 'III. Gỗ Tấm' = 'I. Phối Nammaro';
      if (quyCachInput.toLowerCase().includes('ask') || quyCachInput.toLowerCase().includes('run')) {
        groupName = 'II. Phối Askholmen + Runnen';
      } else if (quyCachInput.toLowerCase().includes('tấm') || quyCachInput.toLowerCase().includes('tam')) {
        groupName = 'III. Gỗ Tấm';
      }

      importedSpecs.push({
        id: `spec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        cycleId: selectedCycleId,
        group: groupName,
        quy_cach: quyCachInput,
        ghi_chu: 'Dán từ Excel',
        month1_volume: m1Val,
        month2_volume: m2Val,
        allocations: []
      });
      successCount++;
    });

    if (successCount > 0) {
      const nextSpecifications = [...specifications];
      importedSpecs.forEach(newSpec => {
        const existingIdx = nextSpecifications.findIndex(
          s => s.cycleId === selectedCycleId && cleanInputSize(s.quy_cach) === cleanInputSize(newSpec.quy_cach)
        );
        if (existingIdx !== -1) {
          // Update month volumes for existing Quy Cách
          nextSpecifications[existingIdx].month1_volume = newSpec.month1_volume;
          nextSpecifications[existingIdx].month2_volume = newSpec.month2_volume;
        } else {
          // Insert new Quy Cách
          nextSpecifications.push(newSpec);
        }
      });

      saveSpecsToCache(nextSpecifications);
      setPasteData('');
      setShowPasteModal(false);
      alert(`✓ Đã phân tích & nhập thành công ${successCount} dòng Quy Cách từ Excel!\nCác chỉ tiêu trùng tên Quy cách đã được cập nhật khối lượng kế hoạch.`);
    } else {
      alert("⚠️ Không tìm thấy dòng dữ liệu nào hợp lệ! Thử copy lại các dòng từ bảng Excel có dạng: [Quy cách] [Target T5] [Target T6]");
    }
  };

  // --- DYNAMIC HELPERS ---
  const activeCycle = useMemo(() => {
    return cycles.find(c => c.id === selectedCycleId) || cycles[0];
  }, [cycles, selectedCycleId]);

  // Extract all historical supplier names from saved records + currently allocated suppliers to allow autocomplete
  const historicalSuppliers = useMemo(() => {
    const list = new Set<string>();
    // Default system seed values
    list.add('CÔNG TY GIA BẢO');
    list.add('CÔNG TY CP LÂM NGHIỆP YÊN THẾ');
    list.add('DNTN SÁNG LẬP');
    list.add('DOANH NGHIỆP TƯ NHÂN ANH QUÂN');

    if (allRecords) {
      allRecords.forEach(rec => {
        if (rec.don_vi_cung_ung) list.add(rec.don_vi_cung_ung.trim().toUpperCase());
      });
    }
    specifications.forEach(spec => {
      spec.allocations.forEach(alloc => {
        list.add(alloc.supplierName.trim().toUpperCase());
      });
    });
    return Array.from(list).sort();
  }, [allRecords, specifications]);

  // Standardize dimension string to match inputs
  const cleanInputSize = (sizeStr: string): string => {
    return (sizeStr || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/×|x/g, "*");
  };

  // Advanced flexible matching checker
  const matchQuyCach = (planSpec: string, recordSpec: string): boolean => {
    const p = cleanInputSize(planSpec);
    const r = cleanInputSize(recordSpec);
    if (!p || !r) return false;
    if (p === r) return true;
    
    // Slash dimension logic, e.g. "380/760*56*17" matches "380*56*17" or "760*56*17"
    if (p.includes('/')) {
      const parts = p.split('*'); // e.g. ["380/760", "56", "17"]
      if (parts.length >= 3) {
        const lengthsStr = parts[0]; // "380/760"
        const remainingStr = parts.slice(1).join('*'); // "56*17"
        
        const lengths = lengthsStr.split('/'); // ["380", "760"]
        return lengths.some(l => {
          const joined = `${l}*${remainingStr}`;
          return joined === r;
        });
      }
    }
    return false;
  };

  // --- COMPUTE ACTIVE SPECIFICATION DATA ---
  const activeCycleSpecs = useMemo(() => {
    return specifications.filter(spec => spec.cycleId === selectedCycleId);
  }, [specifications, selectedCycleId]);

  // Dynamic filter on active cycle specs for planning list
  const filteredActiveSpecs = useMemo(() => {
    return activeCycleSpecs.filter(spec => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesQuyCach = spec.quy_cach.toLowerCase().includes(query);
        const matchesNote = (spec.ghi_chu || "").toLowerCase().includes(query);
        const matchesSupplier = spec.allocations.some(a => a.supplierName.toLowerCase().includes(query));
        if (!matchesQuyCach && !matchesNote && !matchesSupplier) return false;
      }
      return true;
    });
  }, [activeCycleSpecs, searchQuery]);

  // --- AUTOMATIC INTELLIGENT RECORD SYNCHRONIZATION ---
  const performSync = (isManual: boolean = false) => {
    if (!activeCycle || !specifications.length || !allRecords.length) return;

    const { months, year } = activeCycle;
    const targetYearNum = parseInt(year, 10);
    const targetMonthsSet = new Set(months.map(m => m.trim().padStart(2, '0')));

    let hasChanges = false;

    // Deep clone specifications list to modify actual volumes
    const nextSpecifications = specifications.map(spec => {
      if (spec.cycleId !== selectedCycleId) return spec;

      // Find all suppliers with matching inspection records for this specification
      const suppliersWithRecords = new Set<string>();
      allRecords.forEach(record => {
        if (!record.ngay_nt || !record.don_vi_cung_ung) return;
        const parts = record.ngay_nt.split('-');
        if (parts.length >= 2) {
          const rYear = parseInt(parts[0], 10);
          const rMonth = parts[1].padStart(2, '0');
          const yearMatch = rYear === targetYearNum;
          const monthMatch = targetMonthsSet.has(rMonth);
          if (yearMatch && monthMatch) {
            let hasMatchingSpec = false;
            if (record.quy_cach_b && record.quy_cach_b.length > 0) {
              record.quy_cach_b.forEach(item => {
                if (matchQuyCach(spec.quy_cach, item.kich_thuoc_mm)) {
                  hasMatchingSpec = true;
                }
              });
            } else if (record.quy_cach_a) {
              record.quy_cach_a.forEach(item => {
                if (matchQuyCach(spec.quy_cach, item.kich_thuoc_mm)) {
                  hasMatchingSpec = true;
                }
              });
            }

            if (hasMatchingSpec) {
              suppliersWithRecords.add(record.don_vi_cung_ung.trim().toUpperCase());
            }
          }
        }
      });

      // Merge current allocated suppliers and newly found suppliers from records
      const allSupplierNames = Array.from(new Set([
        ...spec.allocations.map(a => a.supplierName.trim().toUpperCase()),
        ...Array.from(suppliersWithRecords)
      ]));

      const updatedAllocations = allSupplierNames.map(supplierName => {
        const existingAlloc = spec.allocations.find(a => a.supplierName.trim().toUpperCase() === supplierName);
        const plannedVolume = existingAlloc ? existingAlloc.plannedVolume : 0;

        let accumulatedVolume = 0;

        allRecords.forEach(record => {
          if (!record.ngay_nt || !record.don_vi_cung_ung) return;
          if (record.don_vi_cung_ung.trim().toUpperCase() !== supplierName) return;

          const parts = record.ngay_nt.split('-');
          if (parts.length >= 2) {
            const rYear = parseInt(parts[0], 10);
            const rMonth = parts[1].padStart(2, '0');
            const yearMatch = rYear === targetYearNum;
            const monthMatch = targetMonthsSet.has(rMonth);

            if (yearMatch && monthMatch) {
              // Prefer Part B (quy_cach_b) as it represents the classified stored volume (kl_nhap_kho)
              if (record.quy_cach_b && record.quy_cach_b.length > 0) {
                record.quy_cach_b.forEach(item => {
                  if (matchQuyCach(spec.quy_cach, item.kich_thuoc_mm)) {
                    if (item.co_phan_loai && item.chi_tiet && item.chi_tiet.length > 0) {
                      item.chi_tiet.forEach(sub => {
                        accumulatedVolume += (sub.kl_nhap_kho || 0);
                      });
                    } else {
                      accumulatedVolume += (item.kl_tong || 0);
                    }
                  }
                });
              } else if (record.quy_cach_a) {
                // Fallback to Part A (quy_cach_a)
                record.quy_cach_a.forEach(item => {
                  if (matchQuyCach(spec.quy_cach, item.kich_thuoc_mm)) {
                    accumulatedVolume += (item.kl_nguyen_thuy || 0);
                  }
                });
              }
            }
          }
        });

        const finalActual = parseFloat(accumulatedVolume.toFixed(3));
        const oldActual = existingAlloc ? existingAlloc.actualVolume : 0;

        if (finalActual !== oldActual || !existingAlloc) {
          hasChanges = true;
        }

        return {
          supplierName: existingAlloc ? existingAlloc.supplierName : supplierName,
          plannedVolume,
          actualVolume: finalActual
        };
      });

      if (updatedAllocations.length !== spec.allocations.length) {
        hasChanges = true;
      }

      return {
        ...spec,
        allocations: updatedAllocations
      };
    });

    if (hasChanges) {
      saveSpecsToCache(nextSpecifications);
      const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(currentTime);
      if (isManual) {
        alert(`✓ Đồng bộ hóa thông minh hoàn tất lúc ${currentTime}!\nĐã quét ${allRecords.length} biên bản nghiệm thu trong hệ thống để tự động hạch toán khối lượng thực nhận.`);
      }
    } else {
      if (isManual) {
        alert("✓ Dữ liệu kế hoạch và biên bản nghiệm thu hiện tại đã hoàn toàn đồng bộ!");
      }
    }
  };

  const handleSmartSync = () => {
    performSync(true);
  };

  // Automatic sync hook whenever records, selected cycle, or specifications change
  useEffect(() => {
    performSync(false);
  }, [allRecords, selectedCycleId, specifications.length]);

  // --- SUPPLIER REPORT GENERATION ---
  const supplierReportData = useMemo(() => {
    // Map with supplier name as key
    const map: { [name: string]: { planned: number; actual: number; items: { quyCach: string; group: string; planned: number; actual: number }[] } } = {};

    activeCycleSpecs.forEach(spec => {
      spec.allocations.forEach(alloc => {
        const name = alloc.supplierName.trim().toUpperCase();
        if (!map[name]) {
          map[name] = { planned: 0, actual: 0, items: [] };
        }
        map[name].planned += alloc.plannedVolume;
        map[name].actual += alloc.actualVolume;
        map[name].items.push({
          quyCach: spec.quy_cach,
          group: spec.group,
          planned: alloc.plannedVolume,
          actual: alloc.actualVolume
        });
      });
    });

    return Object.entries(map).map(([name, data]) => {
      const difference = data.actual - data.planned;
      const progress = data.planned > 0 ? (data.actual / data.planned) * 100 : 0;
      return {
        supplierName: name,
        planned: parseFloat(data.planned.toFixed(2)),
        actual: parseFloat(data.actual.toFixed(2)),
        difference: parseFloat(difference.toFixed(2)),
        progress: parseFloat(progress.toFixed(1)),
        items: data.items
      };
    }).sort((a,b) => b.planned - a.planned);
  }, [activeCycleSpecs]);

  // --- GENERAL STATS ---
  const overallStats = useMemo(() => {
    let totalPlan = 0;
    let totalActual = 0;

    activeCycleSpecs.forEach(spec => {
      const specPlan = (spec.month1_volume ?? 0) + (spec.month2_volume ?? 0);
      if (specPlan > 0) {
        totalPlan += specPlan;
      } else {
        totalPlan += spec.allocations.reduce((sum, a) => sum + a.plannedVolume, 0);
      }
      totalActual += spec.allocations.reduce((sum, a) => sum + a.actualVolume, 0);
    });

    const diff = totalActual - totalPlan;
    const pct = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;

    return {
      plan: parseFloat(totalPlan.toFixed(2)),
      actual: parseFloat(totalActual.toFixed(2)),
      difference: parseFloat(diff.toFixed(2)),
      percent: parseFloat(pct.toFixed(2))
    };
  }, [activeCycleSpecs]);

  // --- ACTIONS: SPECIFICATIONS ---
  const handleAddSpecClick = () => {
    setSpecModalMode('add');
    setEditingSpec({
      group: 'I. Phối Nammaro',
      quy_cach: '',
      ghi_chu: '',
      allocations: []
    });
    setShowSpecModal(true);
  };

  const handleEditSpecClick = (spec: PlanSpecification) => {
    setSpecModalMode('edit');
    setEditingSpec({ ...spec });
    setShowSpecModal(true);
  };

  const handleDeleteSpec = (specId: string) => {
    const updated = specifications.filter(s => s.id !== specId);
    saveSpecsToCache(updated);
    if (expandedRowId === specId) setExpandedRowId(null);
    setConfirmDeleteSpecId(null);
  };

  const handleSaveSpecSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpec.quy_cach) {
      alert("⚠️ Vui lòng điền quy cách kích thước!");
      return;
    }

    if (specModalMode === 'add') {
      const newSpec: PlanSpecification = {
        id: `spec-${Date.now()}`,
        cycleId: selectedCycleId,
        group: editingSpec.group || 'Phối Nammaro',
        quy_cach: editingSpec.quy_cach,
        ghi_chu: editingSpec.ghi_chu || '',
        month1_volume: editingSpec.month1_volume || 0,
        month2_volume: editingSpec.month2_volume || 0,
        allocations: editingSpec.allocations || []
      };
      saveSpecsToCache([...specifications, newSpec]);
    } else {
      const updated = specifications.map(s => {
        if (s.id === editingSpec.id) {
          return {
            ...s,
            group: editingSpec.group || s.group || 'Phối Nammaro',
            quy_cach: editingSpec.quy_cach!,
            ghi_chu: editingSpec.ghi_chu || '',
            month1_volume: editingSpec.month1_volume || 0,
            month2_volume: editingSpec.month2_volume || 0,
            allocations: editingSpec.allocations || s.allocations
          };
        }
        return s;
      });
      saveSpecsToCache(updated);
    }

    setShowSpecModal(false);
    setEditingSpec({});
  };

  // --- ACTIONS: LOCAL ALLOCATIONS IN ACCORDION PANEL ---
  const handleUpdateAllocationVolume = (specId: string, supplierName: string, field: 'plan' | 'actual', value: number) => {
    const updated = specifications.map(spec => {
      if (spec.id === specId) {
        const nextAllocations = spec.allocations.map(alloc => {
          if (alloc.supplierName === supplierName) {
            return {
              ...alloc,
              plannedVolume: field === 'plan' ? Math.max(0, value) : alloc.plannedVolume,
              actualVolume: field === 'actual' ? Math.max(0, value) : alloc.actualVolume
            };
          }
          return alloc;
        });
        return { ...spec, allocations: nextAllocations };
      }
      return spec;
    });
    saveSpecsToCache(updated);
  };

  const handleAddSupplierToAllocation = (specId: string, supplierName: string) => {
    if (!supplierName.trim()) return;
    const upperName = supplierName.trim().toUpperCase();

    const spec = specifications.find(s => s.id === specId);
    if (!spec) return;

    if (spec.allocations.some(a => a.supplierName.trim().toUpperCase() === upperName)) {
      alert("⚠️ Nhà cung cấp này đã tồn tại trong danh sách phân bổ!");
      return;
    }

    const updated = specifications.map(s => {
      if (s.id === specId) {
        return {
          ...s,
          allocations: [
            ...s.allocations,
            { supplierName: upperName, plannedVolume: 0, actualVolume: 0 }
          ]
        };
      }
      return s;
    });

    saveSpecsToCache(updated);
  };

  const handleRemoveSupplierFromAllocation = (specId: string, supplierName: string) => {
    const updated = specifications.map(s => {
      if (s.id === specId) {
        return {
          ...s,
          allocations: s.allocations.filter(a => a.supplierName !== supplierName)
        };
      }
      return s;
    });
    saveSpecsToCache(updated);
    setConfirmDeleteAllocSupplierName(null);
  };

  // --- ACTIONS: CYCLES ---
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
    setSelectedCycleId(newId);
    setShowCycleModal(false);
    setNewCycleData({ name: '', monthStart: '05', monthEnd: '06', year: '2026' });

    alert(`✓ Lập đợt kế hoạch "${newCycle.name}" thành công!`);
  };

  const handleDeleteCycle = (cycleId: string) => {
    const cycleToDelete = cycles.find(c => c.id === cycleId);
    if (!cycleToDelete) return;

    if (cycles.length <= 1) {
      alert("⚠️ Hệ thống phải có ít nhất một kỳ kế hoạch thu mua!");
      return;
    }

    const updatedSpecs = specifications.filter(s => s.cycleId !== cycleId);
    const updatedCycles = cycles.filter(c => c.id !== cycleId);
    
    saveCyclesToCache(updatedCycles);
    saveSpecsToCache(updatedSpecs);

    // Reset selection
    setSelectedCycleId(updatedCycles[0].id);
    setConfirmDeleteCycleId(null);
    alert(`✓ Đã xóa kỳ kế hoạch "${cycleToDelete.name}" thành công.`);
  };

  // --- EXCEL REPORT EXPORT FUNCTION ---
  const exportPlanToExcel = async () => {
    try {
      // Create workbook and sheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Tien do Thu mua");

      // Set explicit columns widths
      worksheet.columns = [
        { key: 'stt', width: 8 },
        { key: 'supplier', width: 32 },
        { key: 'quy_cach', width: 22 },
        { key: 'plan', width: 22 },
        { key: 'actual', width: 22 },
        { key: 'diff', width: 20 },
        { key: 'progress', width: 18 },
        { key: 'status', width: 15 }
      ];

      // Row 1: Title block
      const titleRow = worksheet.addRow(["BẢNG TIẾN ĐỘ THU MUA GỖ THEO KẾ HOẠCH CHI TIẾT"]);
      titleRow.height = 35;
      worksheet.mergeCells('A1:H1');
      const titleCell = worksheet.getCell('A1');
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF000000' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Row 2: Kỳ kế hoạch
      const row2 = worksheet.addRow(["Kỳ kế hoạch:", activeCycle?.name || "N/A"]);
      row2.height = 18;
      worksheet.getCell('A2').font = { name: 'Arial', size: 10, bold: true };
      worksheet.getCell('B2').font = { name: 'Arial', size: 10, bold: false };

      // Row 3: Ngày xuất báo cáo
      const row3 = worksheet.addRow(["Ngày xuất báo cáo:", new Date().toLocaleDateString('vi-VN')]);
      row3.height = 18;
      worksheet.getCell('A3').font = { name: 'Arial', size: 10, bold: true };
      worksheet.getCell('B3').font = { name: 'Arial', size: 10, bold: false };

      // Row 4: Spacer
      const row4 = worksheet.addRow([]);
      row4.height = 15;

      // Row 5: Table Header
      const headerRow = worksheet.addRow([
        "STT",
        "Nhà cung cấp",
        "Quy cách kích thước",
        "Tổng Kế Hoạch (m³)",
        "Tổng Thực mua (m³)",
        "Chênh lệch (m³)",
        "Tiến độ chung",
        "Trạng thái"
      ]);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Data rows starting from Row 6
      let specIdx = 1;
      activeCycleSpecs.forEach(spec => {
        const totalSpecPlan = (spec.month1_volume ?? 0) + (spec.month2_volume ?? 0) || spec.allocations.reduce((sum, a) => sum + a.plannedVolume, 0);
        const totalSpecActual = spec.allocations.reduce((sum, a) => sum + a.actualVolume, 0);
        const specDiff = totalSpecActual - totalSpecPlan;
        const specPercentFraction = totalSpecPlan > 0 ? (totalSpecActual / totalSpecPlan) : 0;

        let statusText = 'Chờ giao';
        if (specPercentFraction >= 1) {
          statusText = 'Đạt chỉ tiêu';
        } else if (specPercentFraction > 0) {
          statusText = 'Thiếu';
        }

        const nccText = spec.allocations.length === 0 
          ? "Chưa phân bổ" 
          : spec.allocations.map(a => a.supplierName).join('\n');

        const rowData = [
          specIdx,
          nccText,
          spec.quy_cach,
          totalSpecPlan,
          totalSpecActual,
          specDiff,
          specPercentFraction,
          statusText
        ];

        const dataRow = worksheet.addRow(rowData);
        dataRow.height = 26;

        dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };

          // Column alignments & number formatting to match the screenshot
          if (colNumber === 1) { // STT
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '0';
          } else if (colNumber === 2) { // Nhà cung cấp
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          } else if (colNumber === 3) { // Quy cách kích thước
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 4 || colNumber === 5) { // Plan, Actual
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '0.00';
          } else if (colNumber === 6) { // Chênh lệch
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '0.00';
          } else if (colNumber === 7) { // Tiến độ chung
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '0%';
          } else if (colNumber === 8) { // Trạng thái
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });

        specIdx++;
      });

      // Total row is directly below the last data row, matching the screenshot
      const totalPlanSum = activeCycleSpecs.reduce((sum, spec) => {
        const plan = (spec.month1_volume ?? 0) + (spec.month2_volume ?? 0) || spec.allocations.reduce((s, a) => s + a.plannedVolume, 0);
        return sum + plan;
      }, 0);
      const totalActualSum = activeCycleSpecs.reduce((sum, spec) => {
        const actual = spec.allocations.reduce((s, a) => s + a.actualVolume, 0);
        return sum + actual;
      }, 0);
      const totalDiffSum = totalActualSum - totalPlanSum;
      const totalPercentFraction = totalPlanSum > 0 ? (totalActualSum / totalPlanSum) : 0;
      const totalStatusText = totalPercentFraction >= 1 ? 'Đạt chỉ tiêu' : (totalPercentFraction > 0 ? 'Thiếu' : 'Chờ giao');

      const totalRowData = [
        "", // STT is empty
        "TỔNG CỘNG TIẾN ĐỘ THU MUA",
        "", // Quy cách is empty
        totalPlanSum,
        totalActualSum,
        totalDiffSum,
        totalPercentFraction,
        totalStatusText
      ];

      const totalRow = worksheet.addRow(totalRowData);
      totalRow.height = 28;

      totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10, bold: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };

        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 4 || colNumber === 5) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '0.00';
        } else if (colNumber === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '0.00';
        } else if (colNumber === 7) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '0%';
        } else if (colNumber === 8) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      // Enable printable / viewable gridlines (acting as beautiful borders when printing)
      worksheet.views = [{ showGridLines: true }];

      // Set Landscape orientation on A4 paper, and scale to fit nicely on print
      worksheet.pageSetup = { 
        orientation: 'landscape', 
        paperSize: 9, // A4
        fitToPage: true, 
        fitToWidth: 1, 
        fitToHeight: 0,
        margins: { 
          left: 0.5, 
          right: 0.5, 
          top: 0.5, 
          bottom: 0.5, 
          header: 0.3, 
          footer: 0.3 
        }
      };

      // Download file using writeBuffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      let fileName = "KeHoach.xlsx";
      if (activeCycle) {
        if (activeCycle.months && activeCycle.months.length >= 2) {
          const m1 = parseInt(activeCycle.months[0]);
          const m2 = parseInt(activeCycle.months[1]);
          const m1Str = isNaN(m1) ? activeCycle.months[0] : `T${m1}`;
          const m2Str = isNaN(m2) ? activeCycle.months[1] : `T${m2}`;
          fileName = `Kế hoạch ${m1Str}.${m2Str}.${activeCycle.year}.xlsx`;
        } else {
          fileName = `Kế hoạch_${activeCycle.name.replace(/[^a-zA-Z0-9_À-ỹ.-]/g, "_")}.xlsx`;
        }
      }
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      alert("Lỗi xuất báo cáo Excel: " + e);
    }
  };

  // --- PDF EXPORT FUNCTION ---
  const handleExportPDF = () => {
    try {
      window.print();
    } catch (e) {
      alert("Lỗi xuất PDF: " + e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-left text-slate-800">
      
      {/* Visual Top Header Area */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-[#10B981] text-white rounded-3xl p-6 shadow-md relative overflow-hidden select-none">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 pointer-events-none">
          <TrendingUp className="w-80 h-80 text-white" />
        </div>
        <div className="max-w-4xl space-y-2 relative z-10">
          <h2 className="text-2xl font-black tracking-tight uppercase">
            Kế Hoạch Mua Gỗ (2 Tháng)
          </h2>
        </div>

        {/* Dynamic Quick Stats Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 flex flex-col justify-between border border-white/5 shadow-2xs hover:bg-white/15 transition-all duration-300">
            <span className="block text-[10px] md:text-xs text-emerald-200 uppercase font-bold tracking-wider leading-tight">
              Tổng chỉ tiêu đợt (2T)
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
                {overallStats.plan.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs text-emerald-200 font-medium font-sans">m³</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 flex flex-col justify-between border border-white/5 shadow-2xs hover:bg-white/15 transition-all duration-300">
            <span className="block text-[10px] md:text-xs text-emerald-200 uppercase font-bold tracking-wider leading-tight">
              Tổng thực mua (2T)
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-50 font-sans">
                {overallStats.actual.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs text-emerald-200 font-medium font-sans">m³</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 flex flex-col justify-between border border-white/5 shadow-2xs hover:bg-white/15 transition-all duration-300">
            <span className="block text-[10px] md:text-xs text-emerald-200 uppercase font-bold tracking-wider leading-tight">
              Chênh lệch thiếu hụt
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-2xl md:text-3xl font-extrabold tracking-tight font-sans ${overallStats.difference >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {overallStats.difference >= 0 ? `+${overallStats.difference.toLocaleString('vi-VN')}` : overallStats.difference.toLocaleString('vi-VN')}
              </span>
              <span className={`text-xs font-medium font-sans ${overallStats.difference >= 0 ? 'text-emerald-200' : 'text-amber-200/80'}`}>m³</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 flex flex-col justify-between border border-white/5 shadow-2xs hover:bg-white/15 transition-all duration-300">
            <span className="block text-[10px] md:text-xs text-emerald-200 uppercase font-bold tracking-wider leading-tight">
              Tiến độ thực hiện
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-2xl md:text-3xl font-extrabold tracking-tight font-sans ${overallStats.percent >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overallStats.percent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRIMARY CONTROLS PANEL: CYCLE SELECTOR & SYNC TOOLS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        
        {/* Cycle Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Đợt Kế Hoạch 2 Tháng:
          </span>
          <div className="flex items-center gap-1.5">
            <select
              value={selectedCycleId}
              onChange={(e) => {
                setSelectedCycleId(e.target.value);
                setExpandedRowId(null);
              }}
              className="bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 hover:border-slate-350 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 shadow-3xs cursor-pointer h-9 font-sans"
            >
              {cycles.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCycleModal(true)}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1 h-9 cursor-pointer"
              title="Lập đợt kế hoạch 2 tháng mới"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo đợt mới
            </button>
            {confirmDeleteCycleId === selectedCycleId ? (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-250 px-2 rounded-xl h-9">
                <button
                  type="button"
                  onClick={() => handleDeleteCycle(selectedCycleId)}
                  className="text-[10px] font-black text-rose-700 hover:text-rose-900 uppercase cursor-pointer"
                  title="Bấm để xác nhận xóa đợt này"
                >
                  Xóa kì {activeCycle?.name}?
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCycleId(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-655 font-bold font-sans cursor-pointer"
                  title="Hủy"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteCycleId(selectedCycleId)}
                className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                title="Xóa đợt kế hoạch hiện tại"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action buttons: Excel & PDF Export */}
        <div className="flex flex-wrap items-center gap-2 justify-end print:hidden">
          <button
            type="button"
            onClick={exportPlanToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-3xs inline-flex items-center gap-1.5 h-9"
            title="Xuất kế hoạch và báo cáo ra file Excel (.xlsx) chuyên nghiệp"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Xuất file Excel
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-3xs inline-flex items-center gap-1.5 h-9"
            title="Định dạng và in hoặc lưu thành file PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            Xuất file PDF
          </button>
        </div>

      </div>

      {/* DASHBOARD TAB SELECTOR */}
      <div className="flex border-b border-slate-200 gap-1.5 select-none font-sans print:hidden">
        <button
          onClick={() => setActiveTab('planning')}
          className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider transition ${
            activeTab === 'planning'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          I. Chỉ Tiêu Kế Hoạch
        </button>
        <button
          onClick={() => setActiveTab('report-spec')}
          className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider transition ${
            activeTab === 'report-spec'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          II. Theo dõi tiến độ thu mua
        </button>
      </div>

      {/* TAB 1: DATA PLANNING & ALLOCATIONS PANEL */}
      {activeTab === 'planning' && (
        <div className="space-y-4">
          
          {/* Header toolbar for specs search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">


            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm quy cách, NCC, ghi chú..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 hover:border-slate-350"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Dán nhanh quy cách và mức kế hoạch từ Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Dán từ Excel
              </button>
              <button
                type="button"
                onClick={handleAddSpecClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition inline-flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Quy Cách
              </button>
            </div>
          </div>

          {/* MASTER ACCORDION LIST */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
            {/* Elegant double header matching Excel layout */}
            <div className="bg-slate-50 border-b border-slate-200 select-none text-[10.5px]">
              <div className="grid grid-cols-12 font-black uppercase tracking-wider text-slate-500 border-b border-slate-150">
                <div className="col-span-5 px-4 py-2 border-r border-slate-200 flex items-center gap-1.5">
                  <PackagesIcon className="w-4 h-4 text-slate-400" />
                  Quy Cách Kích Thước
                </div>
                <div className="col-span-6 text-center border-r border-slate-200 py-2 font-black text-indigo-950 uppercase tracking-widest bg-slate-100/50">
                  KL Kế Hoạch (m³)
                </div>
                <div className="col-span-1 text-center py-2 print:hidden">
                  T.Tác
                </div>
              </div>
              <div className="grid grid-cols-12 font-black uppercase tracking-wider text-slate-500 bg-slate-50/50 select-none text-center">
                <div className="col-span-5 text-left px-4 py-1.5 border-r border-slate-150 text-[10px] text-slate-400">
                  Quy cách gỗ
                </div>
                <div className="col-span-2 text-right px-4 py-1.5 border-r border-slate-150">
                  {activeCycle ? getMonthHeader(activeCycle, 0) : 'T5'}
                </div>
                <div className="col-span-2 text-right px-4 py-1.5 border-r border-slate-150">
                  {activeCycle ? getMonthHeader(activeCycle, 1) : 'T6'}
                </div>
                <div className="col-span-2 text-right px-4 py-1.5 text-indigo-900 bg-indigo-50/20 font-black">
                  Tổng KH
                </div>
                <div className="col-span-1 py-1.5 print:hidden">
                  T.Tác
                </div>
              </div>
            </div>

            {filteredActiveSpecs.length === 0 ? (
              <div className="p-10 text-center space-y-2 select-none">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-black text-slate-500">Không tìm thấy quy cách chỉ tiêu nào trong đợt kế hoạch này.</p>
                <p className="text-[11px] text-slate-400">Bạn có thể tạo thêm Quy cách mới hoặc dán dữ liệu copy từ Excel.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredActiveSpecs.map((spec) => {
                  const totalSpecPlan = (spec.month1_volume ?? 0) + (spec.month2_volume ?? 0) || spec.allocations.reduce((sum, a) => sum + a.plannedVolume, 0);
                  const totalSpecActual = spec.allocations.reduce((sum, a) => sum + a.actualVolume, 0);
                  const specDiff = totalSpecActual - totalSpecPlan;
                  const specPercent = totalSpecPlan > 0 ? (totalSpecActual / totalSpecPlan) * 100 : 0;
                  return (
                    <div key={spec.id} className="transition-all duration-150 hover:bg-slate-50/20">
                      {/* Row Header */}
                      <div className="p-3 grid grid-cols-12 gap-1 items-center border-b border-dashed border-slate-100">
                        
                        {/* Title & Group name */}
                        <div className="col-span-5 pr-3.5">
                          <div className="text-left w-full flex flex-col gap-0.5">
                            <span className="text-xs font-black text-slate-800 tracking-tight font-mono">{spec.quy_cach}</span>
                            {spec.ghi_chu && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9.5px] text-slate-400 font-medium truncate max-w-[200px]">📝 {spec.ghi_chu}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Month 1 Target Input */}
                        <div className="col-span-2 px-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={spec.month1_volume === undefined || spec.month1_volume === 0 ? '' : spec.month1_volume}
                            onChange={(e) => handleUpdateSpecVolume(spec.id, 'month1_volume', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono text-slate-800 shadow-3xs hover:border-slate-350"
                            placeholder="0"
                          />
                        </div>

                        {/* Month 2 Target Input */}
                        <div className="col-span-2 px-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={spec.month2_volume === undefined || spec.month2_volume === 0 ? '' : spec.month2_volume}
                            onChange={(e) => handleUpdateSpecVolume(spec.id, 'month2_volume', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono text-slate-800 shadow-3xs hover:border-slate-350"
                            placeholder="0"
                          />
                        </div>

                        {/* Computed total targets */}
                        <div className="col-span-2 text-right pr-4">
                          <span className="text-xs font-black text-indigo-950 font-mono bg-indigo-50/50 py-1.5 px-2.5 rounded-lg border border-indigo-100 inline-block min-w-[70px]">
                            {totalSpecPlan > 0 ? `${totalSpecPlan.toLocaleString('vi-VN')}` : '0'}
                          </span>
                        </div>

                        {/* Expand & edit actions */}
                        <div className="col-span-1 flex items-center justify-center gap-0.5 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleEditSpecClick(spec)}
                            className="p-1 text-slate-400 hover:text-emerald-600 transition"
                            title="Sửa quy cách này"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteSpecId === spec.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded-lg select-none">
                              <button
                                type="button"
                                onClick={() => handleDeleteSpec(spec.id)}
                                className="text-[10px] font-black text-rose-600 hover:text-rose-850 uppercase cursor-pointer"
                                title="Xác nhận xóa hoàn toàn quy cách này"
                              >
                                Xóa?
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSpecId(null)}
                                className="text-[10px] text-slate-400 hover:text-slate-650 font-bold"
                                title="Hủy"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSpecId(spec.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Xóa quy cách"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={undefined}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition"
                            style={{ display: 'none' }} title="Bấm để xem phân bổ NCC"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                      </div>

                      {/* Expandable allocations and override inputs inline form */}
                      {false && (
                        <div className="px-4.5 pb-4 pt-1.5 bg-slate-50 border-t border-slate-100 border-b border-slate-100">
                          
                          {/* Sub-Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200">
                            <span className="text-[10.5px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                              Chi tiết phân bổ hạn ngạch &amp; Sản lượng thực tế theo nhà cung cấp (NCC)
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAutoDistributeEvenly(spec.id)}
                                className="bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-md transition shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Lấy tổng khối lượng kế hoạch chia đều cho các NCC đã gán"
                              >
                                ⚡ Phân bổ đều cho các NCC
                              </button>
                              <div className="text-[10px] text-slate-400 font-bold italic hidden md:block">
                                (Đồng bộ 'Thực tế' tự động từ Biên bản)
                              </div>
                            </div>
                          </div>

                          {/* Allocation Table / List */}
                          {spec.allocations.length === 0 ? (
                            <div className="bg-white border border-dashed border-slate-250 p-6 rounded-xl text-center">
                              <HelpCircle className="w-6 h-6 text-slate-350 mx-auto mb-1.5" />
                              <span className="block text-xs font-black text-slate-500">Chưa phân bổ hạn định ngạch cho bất cứ nhà cung cấp nào.</span>
                              <p className="text-[10px] text-slate-400 mt-0.5">Vui lòng chọn hoặc gán nhà cung cấp phía dưới để bắt đầu quản trị chỉ tiêu.</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-w-4xl">
                              <div className="grid grid-cols-12 gap-2 text-[10px] font-extrabold uppercase text-slate-450 tracking-wider px-2 select-none">
                                <div className="col-span-5 md:col-span-6">Tên Nhà Cung Cấp (NCC)</div>
                                <div className="col-span-3 text-right">Kế hoạch phân bổ (m³)</div>
                                <div className="col-span-3 text-right">Thực tế nhận về (m³)</div>
                                <div className="col-span-1"></div>
                              </div>

                              <div className="space-y-1">
                                {spec.allocations.map((alloc) => {
                                  return (
                                    <div key={alloc.supplierName} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-150 rounded-xl p-2 shadow-3xs">
                                      {/* Supplier Title */}
                                      <div className="col-span-5 md:col-span-6 flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-[11.5px] font-black text-slate-800 tracking-wide line-clamp-1 truncate">{alloc.supplierName}</span>
                                      </div>

                                      {/* Planned inputs */}
                                      <div className="col-span-3 flex items-center justify-end gap-1.5">
                                        <input
                                          type="number"
                                          step="any"
                                          min="0"
                                          value={alloc.plannedVolume === 0 ? '' : alloc.plannedVolume}
                                          placeholder="Chưa giao"
                                          onChange={(e) => handleUpdateAllocationVolume(spec.id, alloc.supplierName, 'plan', parseFloat(e.target.value) || 0)}
                                          className="w-24 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right px-2.5 py-1.5 rounded-lg text-xs font-extrabold text-slate-800 font-mono shadow-inner"
                                        />
                                        <span className="text-[10px] text-slate-400 font-semibold font-mono">m³</span>
                                      </div>

                                      {/* Actual inputs */}
                                      <div className="col-span-3 flex items-center justify-end gap-1.5">
                                        <input
                                          type="number"
                                          step="any"
                                          min="0"
                                          value={alloc.actualVolume === 0 ? '' : alloc.actualVolume}
                                          placeholder="Tự động"
                                          onChange={(e) => handleUpdateAllocationVolume(spec.id, alloc.supplierName, 'actual', parseFloat(e.target.value) || 0)}
                                          className="w-24 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right px-2.5 py-1.5 rounded-lg text-xs font-extrabold text-slate-800 font-mono shadow-inner"
                                        />
                                        <span className="text-[10px] text-slate-400 font-semibold font-mono">m³</span>
                                      </div>

                                      {/* Trash remove NCC */}
                                      <div className="col-span-1 flex items-center justify-center">
                                        {confirmDeleteAllocSupplierName?.specId === spec.id && confirmDeleteAllocSupplierName?.supplierName === alloc.supplierName ? (
                                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded-lg select-none">
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveSupplierFromAllocation(spec.id, alloc.supplierName)}
                                              className="text-[9px] font-black text-rose-600 hover:text-rose-850 uppercase cursor-pointer"
                                              title="Xác nhận gỡ bỏ NCC này"
                                            >
                                              Xóa?
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setConfirmDeleteAllocSupplierName(null)}
                                              className="text-[9px] text-slate-400 hover:text-slate-650"
                                              title="Hủy"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteAllocSupplierName({ specId: spec.id, supplierName: alloc.supplierName })}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                            title="Xóa NCC này ra khỏi quy cách"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>

                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Quick Add Supplier to Spec Form */}
                          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2 max-w-4xl">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Phân bổ thêm NCC cho quy cách này:</span>
                            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                              <select
                                id={`quick-allocate-supplier-select-${spec.id}`}
                                defaultValue=""
                                className="bg-white border border-slate-200 focus:outline-none rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-3xs flex-1"
                              >
                                <option value="">-- Chọn NCC hoặc gõ mới --</option>
                                {historicalSuppliers.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                id={`quick-allocate-supplier-custom-${spec.id}`}
                                placeholder="Tự nhập NCC chưa có..."
                                className="bg-white border border-slate-200 focus:outline-none rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-3xs flex-1 max-w-[130px]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const selectEl = document.getElementById(`quick-allocate-supplier-select-${spec.id}`) as HTMLSelectElement;
                                  const inputEl = document.getElementById(`quick-allocate-supplier-custom-${spec.id}`) as HTMLInputElement;

                                  const pickedName = selectEl?.value || inputEl?.value || "";
                                  if (pickedName.trim()) {
                                    handleAddSupplierToAllocation(spec.id, pickedName);
                                    if (selectEl) selectEl.value = "";
                                    if (inputEl) inputEl.value = "";
                                  } else {
                                    alert("Vui lòng chọn hoặc gõ tên nhà cung cấp gỗ!");
                                  }
                                }}
                                className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[10.5px] px-3.5 py-1.5 rounded-xl text-center cursor-pointer shadow-3xs"
                              >
                                Gán NCC
                              </button>
                            </div>
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: OVER/UNDER DELIVERY REPORT BY SPECIFICATION */}
      {activeTab === 'report-spec' && (
        <div className="space-y-6">
          
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-6 items-stretch md:items-center justify-between">
            <div className="space-y-1 max-w-2xl">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                II. Theo dõi tiến độ thu mua
              </h4>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-black text-slate-500 uppercase select-none">
              Ngày Đối Soát: {new Date().toLocaleDateString('vi-VN')}
            </div>
          </div>

          {/* TABLE DATA PORTAL WITH BADGES */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-150 text-[10.5px] font-black uppercase text-slate-500 tracking-wider">
              Bảng tiến độ thu mua theo kế hoạch
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] table-fixed text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 backdrop-blur-xs border-b border-slate-200 text-[10.5px] font-black uppercase text-slate-500 tracking-wider select-none">
                    <th className="px-4 py-3.5 text-center w-[4%] whitespace-nowrap">STT</th>
                    <th className="px-4 py-3.5 text-left w-[24%] whitespace-nowrap">Nhà cung cấp</th>
                    <th className="px-4 py-3.5 text-left w-[14%] whitespace-nowrap">Quy cách kích thước</th>
                    <th className="px-4 py-3.5 text-right w-[11%] whitespace-nowrap">Tổng Kế Hoạch (m³)</th>
                    <th className="px-4 py-3.5 text-right w-[11%] whitespace-nowrap">Tổng Thực mua (m³)</th>
                    <th className="px-4 py-3.5 text-right w-[11%] whitespace-nowrap">Chênh lệch</th>
                    <th className="px-4 py-3.5 text-center w-[12%] whitespace-nowrap">Tiến độ chung</th>
                    <th className="px-4 py-3.5 text-center w-[13%] whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {activeCycleSpecs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-xs font-black text-slate-400">
                        Chưa có quy cách chỉ tiêu nào được khởi lập trong kỳ này.
                      </td>
                    </tr>
                  ) : (
                    activeCycleSpecs.map((spec, sIdx) => {
                      const totalSpecPlan = (spec.month1_volume ?? 0) + (spec.month2_volume ?? 0) || spec.allocations.reduce((sum, a) => sum + a.plannedVolume, 0);
                      const totalSpecActual = spec.allocations.reduce((sum, a) => sum + a.actualVolume, 0);
                      const specDiff = totalSpecActual - totalSpecPlan;
                      const specPercent = totalSpecPlan > 0 ? (totalSpecActual / totalSpecPlan) * 100 : 0;
                      
                      const isComplete = specPercent >= 100;

                      return (
                        <tr key={spec.id} className="hover:bg-slate-50/30 transition-colors duration-150 font-medium">
                          {/* STT */}
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-400 text-center">{sIdx + 1}</td>
                          
                          {/* Splits of suppliers */}
                          <td className="px-4 py-3.5 pr-2 font-mono text-[10.5px] space-y-1.5 text-slate-500">
                            {spec.allocations.length === 0 ? (
                              <span className="text-slate-400 italic">-- Trống phân bổ --</span>
                            ) : (
                              spec.allocations.map((a, aIdx) => (
                                <div key={aIdx} className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                  <span className="truncate text-left font-sans font-semibold text-slate-700 block" title={a.supplierName}>{a.supplierName}</span>
                                </div>
                              ))
                            )}
                          </td>

                          {/* Quy cach size */}
                          <td className="px-4 py-3.5 font-mono font-black text-slate-800 text-xs">{spec.quy_cach}</td>
                          
                          {/* Plan total */}
                          <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-600">
                            {totalSpecPlan > 0 ? `${totalSpecPlan.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³` : '-'}
                          </td>
                          
                          {/* Actual total */}
                          <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900">
                            {totalSpecActual > 0 ? `${totalSpecActual.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³` : '-'}
                          </td>
                          
                          {/* Difference lack/excess */}
                          <td className={`px-4 py-3.5 text-right font-mono font-black text-xs ${
                            specDiff < 0 ? 'text-[#C51111]' : 'text-emerald-700'
                          }`}>
                            {specDiff < 0 
                              ? `-${Math.abs(specDiff).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³` 
                              : specDiff > 0 
                                ? `+${specDiff.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³` 
                                : '0,00 m³'
                            }
                          </td>
                          
                          {/* Percent complete */}
                          <td className="px-4 py-3.5 text-center">
                            {totalSpecPlan > 0 ? (
                              <div className="flex flex-col items-center gap-1.5 justify-center">
                                <span className={`font-mono font-black text-xs ${
                                  isComplete ? 'text-emerald-600' : 'text-slate-700'
                                }`}>
                                  {Math.round(specPercent)}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden select-none">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                    style={{ width: `${Math.min(specPercent, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : '-'}
                          </td>

                          {/* Badges details */}
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-sans text-[10px] font-extrabold uppercase tracking-wider border ${
                              specPercent >= 100 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : specPercent > 0 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                specPercent >= 100 ? 'bg-emerald-500' : specPercent > 0 ? 'bg-amber-500' : 'bg-slate-400'
                              }`} />
                              {specPercent >= 100 
                                ? 'Đạt chỉ tiêu' 
                                : specPercent > 0 
                                  ? 'Thiếu' 
                                  : 'Chờ giao'
                              }
                            </span>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: ADD / EDIT SPECIFICATION SIZE */}
      {showSpecModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-150">
            
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase font-mono flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-emerald-400" />
                {specModalMode === 'add' ? 'Thêm quy cách chỉ tiêu mới' : 'Cập nhật quy cách chỉ tiêu'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowSpecModal(false)}
                className="text-slate-450 hover:text-white transition duration-100 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSpecSubmit} className="p-6 space-y-4">
              {/* Specification Size */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Quy cách kích thước (mm)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 380/760*56*17 hoặc 480*56*20"
                  value={editingSpec.quy_cach || ''}
                  onChange={(e) => setEditingSpec(prev => ({ ...prev, quy_cach: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>

              {/* Monthly target volumes */}
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    KH {activeCycle ? getMonthHeader(activeCycle, 0) : 'Tháng 1'} (m³)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Khối lượng..."
                    value={editingSpec.month1_volume === undefined || editingSpec.month1_volume === 0 ? '' : editingSpec.month1_volume}
                    onChange={(e) => setEditingSpec(prev => ({ ...prev, month1_volume: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    KH {activeCycle ? getMonthHeader(activeCycle, 1) : 'Tháng 2'} (m³)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Khối lượng..."
                    value={editingSpec.month2_volume === undefined || editingSpec.month2_volume === 0 ? '' : editingSpec.month2_volume}
                    onChange={(e) => setEditingSpec(prev => ({ ...prev, month2_volume: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Ghi chu */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Ghi chú chỉ biên</label>
                <input
                  type="text"
                  placeholder="Hợp đồng số, độ dầy chỉ tiêu,..."
                  value={editingSpec.ghi_chu || ''}
                  onChange={(e) => setEditingSpec(prev => ({ ...prev, ghi_chu: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              {/* Action row buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowSpecModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-xl shadow-md"
                >
                  {specModalMode === 'add' ? 'Thêm quy cách' : 'Cập nhật'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW PLAN CYCLE */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-150">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase font-mono flex items-center gap-1">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Lập Kỳ Kế Hoạch 2 Tháng Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowCycleModal(false)}
                className="text-slate-450 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCycleSubmit} className="p-5 space-y-4 text-xs font-medium">
              
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Tên đợt kế hoạch</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kế hoạch Tháng 07 - 08/2026"
                  value={newCycleData.name}
                  onChange={(e) => setNewCycleData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>

              {/* Cycle Months and Year select */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Tháng Bắt đầu</label>
                  <select
                    value={newCycleData.monthStart}
                    onChange={(e) => setNewCycleData(prev => ({ ...prev, monthStart: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Tháng Kết thúc</label>
                  <select
                    value={newCycleData.monthEnd}
                    onChange={(e) => setNewCycleData(prev => ({ ...prev, monthEnd: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Năm hạch toán</label>
                <select
                  value={newCycleData.year}
                  onChange={(e) => setNewCycleData(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCycleModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-lg shadow-md"
                >
                  Tạo kỳ mới
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXCEL QUICK PASTE IMPORTER */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-left">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase font-mono flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Nhập nhanh Quy cách &amp; Kế hoạch từ Excel
              </h3>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-slate-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-medium text-slate-600">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-2xl leading-relaxed">
                <p className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wide mb-1">
                  💡 Hướng dẫn định dạng dữ liệu (Copy và dán):
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
                  <li>Mở bảng Excel kế hoạch gỗ của bạn.</li>
                  <li>Bôi đen &amp; copy 3 cột: <span className="font-extrabold text-amber-950">[Quy Cách]</span>, <span className="font-extrabold text-amber-950">[KL {activeCycle ? getMonthHeader(activeCycle, 0) : 'Tháng 1'}]</span>, <span className="font-extrabold text-amber-950">[KL {activeCycle ? getMonthHeader(activeCycle, 1) : 'Tháng 2'}]</span>.</li>
                  <li>Dán trực tiếp (Ctrl+V) vào khung bên dưới. Hệ thống sẽ tự phân tích và cập nhật.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Dữ liệu sao chép từ Excel
                </label>
                <textarea
                  rows={8}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="380/760*56*17	150	200&#10;480*56*20	75	85&#10;..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-2xl p-3.5 text-xs font-mono font-bold text-slate-850 focus:outline-none focus:ring-1 focus:ring-indigo-400 leading-relaxed shadow-3xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-slate-700">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold transition hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleImportPaste}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-lg shadow-md transition cursor-pointer"
                >
                  Phân tích &amp; Nhập dữ liệu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- SUB-COMPONENTS/ICONS (Self-contained) ---
function PackagesIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
