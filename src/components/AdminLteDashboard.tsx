import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar 
} from 'recharts';
import { 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Grid, 
  TrendingUp, 
  Layers, 
  Award, 
  Package, 
  ArrowRight,
  MoreHorizontal,
  ChevronRight,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { BienBan } from '../types';

const formatVolNoTrailing = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const fixed = val.toFixed(3);
  const parsed = parseFloat(fixed);
  return parsed.toString();
};

interface AdminLteDashboardProps {
  historyInspections: BienBan[];
  onSelectSection: (section: any) => void;
  onAddInspection?: () => void;
}

export default function AdminLteDashboard({ 
  historyInspections, 
  onSelectSection,
  onAddInspection 
}: AdminLteDashboardProps) {

  // Dynamic values based on actual database to make it feel fully alive!
  const totalInsps = historyInspections.length;
  const totalVolume = historyInspections.reduce((sum, bb) => {
  if (typeof bb.total_volume !== 'undefined' && bb.total_volume !== null) {
    return sum + Number(bb.total_volume || 0);
  }

  return sum + (bb.quy_cach_a || []).reduce((subSum, item) => {
    return subSum + Number(item.kl_nguyen_thuy || 0);
  }, 0);
}, 0);

  // High-fidelity visitor-like trend data from AdminLTE 3 mockup
  const visitorData = [
    { name: '18th', thisWeek: 100, lastWeek: 60 },
    { name: '20th', thisWeek: 120, lastWeek: 85 },
    { name: '22nd', thisWeek: 170, lastWeek: 70 },
    { name: '24th', thisWeek: 165, lastWeek: 65 },
    { name: '26th', thisWeek: 180, lastWeek: 85 },
    { name: '28th', thisWeek: 178, lastWeek: 80 },
    { name: '30th', thisWeek: 160, lastWeek: 110 }
  ];

  // High-fidelity sales-like trend data from AdminLTE 3 mockup (Monthly values in k$)
  const salesData = [
    { name: 'JUN', thisYear: 1000, lastYear: 800 },
    { name: 'JUL', thisYear: 2000, lastYear: 1700 },
    { name: 'AUG', thisYear: 2800, lastYear: 2605 },
    { name: 'SEP', thisYear: 2500, lastYear: 1950 },
    { name: 'OCT', thisYear: 2700, lastYear: 2100 },
    { name: 'NOV', thisYear: 2500, lastYear: 1850 },
    { name: 'DEC', thisYear: 2800, lastYear: 1800 }
  ];

  // Custom Products list for a wood veneer / pallet factory
  const products = [
    {
      id: 1,
      name: 'Gỗ keo xẻ sấy xuất khẩu',
      desc: 'Quy cách chuẩn 2000x100x20 mm',
      price: '$125.00',
      sales: '12,230 m³',
      trend: 'up',
      tag: 'Bán chạy nhất'
    },
    {
      id: 2,
      name: 'Ván keo xẻ thô pallet',
      desc: 'Quy cách 1200x80x20 mm',
      price: '$98.50',
      sales: '8,120 m³',
      trend: 'down',
      tag: 'Tiêu chuẩn'
    },
    {
      id: 3,
      name: 'Hộp keo chịu lực vuông',
      desc: 'Quy cách 3000x120x120 mm',
      price: '$148.00',
      sales: '3,450 m³',
      trend: 'up',
      tag: 'Liên kết'
    },
    {
      id: 4,
      name: 'Dăm gỗ băm xuất khẩu',
      desc: 'Gỗ nguyên liệu loại 3 tận dụng',
      price: '$45.00',
      sales: '15,010 tấn',
      trend: 'up',
      tag: 'Giá tốt'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Content Header (Page header) with Title and Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
        <h1 className="text-2xl font-semibold text-slate-800 font-sans tracking-tight">Dashboard v3</h1>
        <div className="flex items-center text-xs text-slate-500 font-medium">
          <span className="hover:text-blue-600 transition cursor-pointer" onClick={() => onSelectSection('dashboard_v3')}>Home</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-400">Dashboard v3</span>
        </div>
      </div>

      {/* Main AdminLTE 3 Grid System for Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: Online Store Visitors */}
        <div className="bg-white rounded border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Online Store Visitors</h3>
            <a 
              href="#view-report" 
              onClick={(e) => { e.preventDefault(); onSelectSection('qc_dashboard'); }}
              className="text-xs text-[#007bff] hover:text-blue-700 hover:underline font-semibold"
            >
              View Report
            </a>
          </div>
          {/* Card Body */}
          <div className="p-4 flex-1 flex flex-col justify-between">
            {/* Visitors Numbers */}
            <div className="flex items-start justify-between mb-4">
              <div className="text-left">
                <span className="text-[28px] font-extrabold text-zinc-900 leading-none">820</span>
                <span className="block text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Visitors Over Time</span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-emerald-500 font-bold text-sm flex items-center gap-0.5">
                  <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />
                  12.5%
                </span>
                <span className="text-[11px] font-medium text-slate-400 mt-0.5">Since last week</span>
              </div>
            </div>

            {/* Recharts Curve Line Chart with custom nodes exactly as matched */}
            <div className="w-full h-56 mt-2 relative">
              <ResponsiveContainer width="100%" height="105%">
                <LineChart 
                  data={visitorData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#adb5bd" 
                    tick={{ fontSize: 10, fontWeight: 500 }}
                  />
                  <YAxis 
                    domain={[0, 200]} 
                    ticks={[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]} 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#adb5bd"
                    tick={{ fontSize: 10, fontWeight: 500 }}
                  />
                  <Tooltip cursor={{ stroke: '#f1f5f9', strokeWidth: 1 }} />
                  <Line 
                    type="monotone" 
                    dataKey="thisWeek" 
                    stroke="#007bff" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#007bff' }} 
                    activeDot={{ r: 6 }}
                    name="This Week"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="lastWeek" 
                    stroke="#ced4da" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#ced4da' }} 
                    activeDot={{ r: 6 }}
                    name="Last Week"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Indicators centered */}
            <div className="flex items-center justify-end gap-4 mt-4 pt-2 border-t border-slate-50 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#007bff] rounded-xs shrink-0"></span>
                <span>This Week</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#ced4da] rounded-xs shrink-0"></span>
                <span>Last Week</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Sales */}
        <div className="bg-white rounded border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Sales</h3>
            <a 
              href="#view-report" 
              onClick={(e) => { e.preventDefault(); onSelectSection('materials'); }}
              className="text-xs text-[#007bff] hover:text-blue-700 hover:underline font-semibold"
            >
              View Report
            </a>
          </div>
          {/* Card Body */}
          <div className="p-4 flex-1 flex flex-col justify-between">
            {/* Sales Numbers */}
            <div className="flex items-start justify-between mb-4">
              <div className="text-left">
                <span className="text-[28px] font-extrabold text-zinc-900 leading-none">$18,230.00</span>
                <span className="block text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Sales Over Time</span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-emerald-500 font-bold text-sm flex items-center gap-0.5">
                  <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />
                  33.1%
                </span>
                <span className="text-[11px] font-medium text-slate-400 mt-0.5">Since last month</span>
              </div>
            </div>

            {/* Recharts Grouped Column Chart */}
            <div className="w-full h-56 mt-2 relative">
              <ResponsiveContainer width="100%" height="105%">
                <BarChart 
                  data={salesData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#adb5bd" 
                    tick={{ fontSize: 10, fontWeight: 500 }}
                  />
                  <YAxis 
                    domain={[0, 3000]} 
                    ticks={[0, 500, 1000, 1500, 2000, 2500, 3000]}
                    tickFormatter={(v) => v === 0 ? '$0' : `$${v/1000}k`}
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#adb5bd"
                    tick={{ fontSize: 10, fontWeight: 500 }}
                  />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar 
                    dataKey="thisYear" 
                    fill="#007bff" 
                    radius={[1, 1, 0, 0]} 
                    maxBarSize={12} 
                    name="This year" 
                  />
                  <Bar 
                    dataKey="lastYear" 
                    fill="#ced4da" 
                    radius={[1, 1, 0, 0]} 
                    maxBarSize={12} 
                    name="Last year" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Indicators */}
            <div className="flex items-center justify-end gap-4 mt-4 pt-2 border-t border-slate-50 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#007bff] rounded-xs shrink-0"></span>
                <span>This year</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#ced4da] rounded-xs shrink-0"></span>
                <span>Last year</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM ROW: PRODUCTS & ONLINE STORE OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* CARD 3: Products Table with custom thumbnail icons */}
        <div className="bg-white rounded border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
            <h3 className="text-sm font-bold text-slate-700">Products</h3>
            <div className="flex items-center gap-3 text-slate-400">
              <button 
                type="button"
                onClick={() => onSelectSection('qc_dashboard')} 
                className="hover:text-slate-600 transition" 
                title="Tải xuất báo cáo"
              >
                <Download className="w-4.5 h-4.5" />
              </button>
              <button 
                type="button"
                onClick={() => onSelectSection('info')} 
                className="hover:text-slate-600 transition" 
                title="Bảng biểu định dạng"
              >
                <Grid className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
          {/* Card Table Body */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wide bg-slate-50/40 text-[9.5px]">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Sales</th>
                  <th className="px-4 py-3 text-center">More</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/20 transition">
                    <td className="px-4 py-3 flex items-center gap-3">
                      {/* Product Visual Icon avatar */}
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-205">
                        {p.id === 1 ? <Package className="w-4.5 h-4.5 text-blue-500" /> :
                         p.id === 2 ? <Layers className="w-4.5 h-4.5 text-orange-500" /> :
                         p.id === 3 ? <TrendingUp className="w-4.5 h-4.5 text-emerald-500" /> :
                                      <Award className="w-4.5 h-4.5 text-purple-500" />}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <span className="block font-bold text-slate-800 text-[12px]">{p.name}</span>
                        <span className="block text-[10px] text-slate-400">{p.desc}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono">
                      {p.price}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 font-bold">
                        <span className="text-[11.5px] font-mono text-slate-700">{p.sales}</span>
                        {p.trend === 'up' ? (
                          <span className="text-emerald-500 text-[9px] bg-emerald-50 px-1 py-0.5 rounded font-black flex items-center gap-0.5">
                            ▲ +12%
                          </span>
                        ) : (
                          <span className="text-rose-500 text-[9px] bg-rose-50 px-1 py-0.5 rounded font-black flex items-center gap-0.5">
                            ▼ -3%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 hover:text-slate-600 transition cursor-pointer">
                      <button 
                        type="button" 
                        onClick={() => onSelectSection('info')}
                        className="p-1 hover:bg-slate-100 rounded-md"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD 4: Online Store Overview */}
        <div className="bg-white rounded border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
            <h3 className="text-sm font-bold text-slate-700">Online Store Overview</h3>
            <div className="flex items-center gap-3 text-slate-400">
              <button type="button" className="hover:text-slate-600 transition"><RefreshCw className="w-4 h-4" /></button>
              <button type="button" className="hover:text-slate-600 transition"><MoreHorizontal className="w-4.5 h-4.5" /></button>
            </div>
          </div>
          {/* Card Body List with indicators */}
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            
            {/* KPI METRIC 1: CONVERSION RATE */}
            <div className="pb-3 border-b border-slate-50 flex items-start justify-between">
              <div className="space-y-1 text-left w-2/3">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">CONVERSION RATE</span>
                <span className="text-xl font-bold text-slate-800 leading-none block">12.0%</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-[#007bff] h-full rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-emerald-500 font-bold text-xs flex items-center">
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                  +1.5%
                </span>
                <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Tỷ lệ chuyển đổi</span>
              </div>
            </div>

            {/* KPI METRIC 2: QC COMPLIANCE RATE */}
            <div className="py-3 border-b border-slate-50 flex items-start justify-between">
              <div className="space-y-1 text-left w-2/3">
                <span className="text-indigo-650 text-[10px] font-black uppercase tracking-widest block">QC COMPLIANCE RATE</span>
                <span className="text-xl font-bold text-slate-800 leading-none block">94.5%</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: '94.5%' }}></div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-indigo-600 font-bold text-xs flex items-center">
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                  +0.8%
                </span>
                <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Tỷ lệ đạt chuẩn</span>
              </div>
            </div>

            {/* KPI METRIC 3: RAW MATERIAL YIELD */}
            <div className="py-3 border-b border-slate-50 flex items-start justify-between">
              <div className="space-y-1 text-left w-2/3">
                <span className="text-emerald-700 text-[10px] font-black uppercase tracking-widest block">RAW MATERIAL YIELD</span>
                <span className="text-xl font-bold text-slate-800 leading-none block">76.0%</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '76%' }}></div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-emerald-600 font-bold text-xs flex items-center">
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                  +3.5%
                </span>
                <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Thu hồi thành phẩm</span>
              </div>
            </div>

            {/* KPI METRIC 4: INSOLVENT PROCESS LOSS */}
            <div className="pt-3 flex items-start justify-between">
              <div className="space-y-1 text-left w-2/3">
                <span className="text-rose-650 text-[10px] font-black uppercase tracking-widest block">PROCESS WASTE RATIO</span>
                <span className="text-xl font-bold text-slate-800 leading-none block">3.1%</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-rose-500 font-bold text-xs flex items-center">
                  <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                  -0.4%
                </span>
                <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Hao hụt sản xuất</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* QUICK SYSTEM INSIGHT BANNER */}
      <div className="bg-blue-50 border border-blue-200/50 rounded-lg p-4 text-left flex items-start gap-3.5 mt-6 font-sans">
        <TrendingUp className="w-5.5 h-5.5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">LƯU Ý ĐẶC BIỆT RA QUYẾT ĐỊNH</h4>
          <p className="text-[11.5px] text-blue-700 font-medium leading-relaxed">
            Hệ thống ERP phân tách luồng dữ liệu tự động giữa <b>Khối lượng thô (Phòng QC)</b> và <b>Tổng tiền thực thanh toán (Phòng Chế biến &amp; Nguyên liệu)</b>. Tổng biên bản đang ghi nhận <b>{totalInsps}</b> hồ sơ, với lượng gỗ luỹ kế đạt <b>{formatVolNoTrailing(totalVolume)} m³</b>. Hãy duyệt giá gỗ keo chuẩn tại mục Quản lý đơn giá để liên kết ERP trực tiếp.
          </p>
        </div>
      </div>

    </div>
  );
}
