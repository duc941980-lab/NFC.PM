/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BienBan } from '../types';
import { exportInspectionToExcel, exportPaymentToExcel } from '../excelExport';
import { 
  FileSpreadsheet, 
  ChevronDown, 
  Printer, 
  Image as ImageIcon, 
  FileCode,
  FileCheck2,
  FilePlus,
  BookOpen
} from 'lucide-react';

interface ExportDropdownProps {
  bienBan: BienBan;
  onPrint?: (bb: BienBan, preferredMode: 'qc' | 'payment') => void;
  // Custom design configurations
  align?: 'left' | 'right';
  className?: string;
  buttonId?: string;
  onlyMode?: 'qc' | 'payment';
}

export default function ExportDropdown({ 
  bienBan, 
  onPrint, 
  align = 'right', 
  className = '',
  buttonId = '',
  onlyMode
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Retrieve user role from current logged in user memory natively
  const [userRole, setUserRole] = useState('');
  useEffect(() => {
    const currentUserStr = localStorage.getItem('wood_current_user_v1');
    if (currentUserStr) {
      try {
        const u = JSON.parse(currentUserStr);
        setUserRole(u.role || '');
      } catch (_) {}
    }
  }, [isOpen]); // Refresh role when dropdown is opened

  const isQcc = userRole.includes('QCC') || userRole.includes('QC') || userRole.toLowerCase().includes('kiểm hàng');
  const isNlg = userRole.includes('NLG') || userRole.includes('Thu Mua') || userRole.toLowerCase().includes('nguyên liệu');

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideButton = dropdownRef.current && dropdownRef.current.contains(target);
      const clickedInsideMenu = menuRef.current && menuRef.current.contains(target);
      if (!clickedInsideButton && !clickedInsideMenu) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate dynamic portal coordinates to stay precisely layered over elements without overflow-hidden cropping
  useEffect(() => {
    if (!isOpen) return;

    const updateCoords = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const menuWidth = 304; // w-76 is 19rem = 304px
        
        let targetLeft = rect.left;
        if (align === 'right') {
          targetLeft = rect.right - menuWidth;
        }

        // Prevent rendering outside of viewports (horizontal)
        if (targetLeft < 6) targetLeft = 6;
        if (targetLeft + menuWidth > window.innerWidth - 6) {
          targetLeft = window.innerWidth - menuWidth - 6;
        }

        // Detect appropriate menu height to prevent vertical cutting/overflow
        let menuHeight = 280;
        if (onlyMode === 'qc' || onlyMode === 'payment') {
          menuHeight = 150;
        }

        // Prevent rendering outside of viewport (vertical)
        let targetTop = rect.bottom + 6;
        if (targetTop + menuHeight > window.innerHeight - 6) {
          const potentialTop = rect.top - menuHeight - 6;
          if (potentialTop > 6) {
            targetTop = potentialTop;
          }
        }

        setCoords({
          top: targetTop,
          left: targetLeft
        });
      }
    };

    updateCoords();
    
    // Use capture: true to monitor scroll events on any scrollable container on the page
    window.addEventListener('scroll', updateCoords, { passive: true, capture: true });
    window.addEventListener('resize', updateCoords, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', updateCoords, { capture: true } as any);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen, align, onlyMode]);

  const handleExportExcelQC = () => {
    exportInspectionToExcel(bienBan);
    setIsOpen(false);
  };

  const handleExportExcelPayment = () => {
    exportPaymentToExcel(bienBan);
    setIsOpen(false);
  };


  const handleGoToPdfPrint = (mode: 'qc' | 'payment') => {
    if (onPrint) {
      onPrint(bienBan, mode);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef} id={`export-dropdown-wrapper-${bienBan.id}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-150 transition active:scale-95 cursor-pointer shadow-3xs"
        title="Danh menu options xuất các định dạng tệp tin"
        id={buttonId || `export-trigger-${bienBan.id}`}
      >
        <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600" />
        <span className="hidden sm:inline font-bold">Xuất File</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {/* Corporate Droplist rendered via Portal to escape overflow hidden constraints */}
      {isOpen && createPortal(
        <div 
          ref={menuRef}
          className="fixed z-[99999] w-76 rounded-2xl bg-white border border-slate-200/90 shadow-2xl py-2 text-left text-xs leading-tight font-sans animate-fade-in"
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            transformOrigin: 'top right' 
          }}
          id={`export-dropdown-menu-${bienBan.id}`}
        >
          {/* Section 1: QC Report */}
          {onlyMode !== 'payment' && (
            <>
              <div className="px-3.5 py-1.5 text-[9.5px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                Biên bản chất lượng QC
              </div>
              <div className="p-1 space-y-1">
                <button
                  onClick={handleExportExcelQC}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-700 hover:bg-emerald-50/80 hover:text-emerald-850 rounded-xl transition text-left cursor-pointer font-medium"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100/85 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700 font-black" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[11.5px] text-slate-800">Xuất file Excel</span>
                    <span className="text-[9.5px] text-slate-450 font-semibold">Tải bảng nghiệm thu gỗ (.xlsx)</span>
                  </div>
                </button>

                <button
                  onClick={() => handleGoToPdfPrint('qc')}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-700 hover:bg-rose-50/80 hover:text-rose-850 rounded-xl transition text-left cursor-pointer font-medium"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-100/85 flex items-center justify-center shrink-0">
                    <Printer className="w-4 h-4 text-rose-650" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[11.5px] text-slate-800">In Biên bản & Ảnh chụp</span>
                    <span className="text-[9.5px] text-slate-450 font-semibold">Mở bảng in & tải ảnh biên bản</span>
                  </div>
                </button>
              </div>
            </>
          )}

          {onlyMode !== 'payment' && onlyMode !== 'qc' && <div className="h-px bg-slate-100 my-1.5"></div>}

          {/* Section 2: Payment Checklist */}
          {onlyMode !== 'qc' && (
            <>
              {bienBan.bang_thanh_toan && bienBan.bang_thanh_toan.length > 0 ? (
                <>
                  <div className="px-3.5 py-1.5 text-[9.5px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                    Thanh toán nguyên liệu
                  </div>
                  <div className="p-1 space-y-1">
                    <button
                      onClick={handleExportExcelPayment}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-700 hover:bg-emerald-50/80 hover:text-emerald-850 rounded-xl transition text-left cursor-pointer font-medium"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100/85 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700 font-black" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[11.5px] text-slate-800">Xuất file Excel</span>
                        <span className="text-[9.5px] text-slate-450 font-semibold">Tải chi tiết thanh toán gỗ (.xlsx)</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleGoToPdfPrint('payment')}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-700 hover:bg-rose-50/80 hover:text-rose-850 rounded-xl transition text-left cursor-pointer font-medium"
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-100/85 flex items-center justify-center shrink-0">
                        <Printer className="w-4 h-4 text-rose-650" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[11.5px] text-slate-800">In Thanh toán & Ảnh chụp</span>
                        <span className="text-[9.5px] text-slate-450 font-semibold">Mở bảng in & chụp ảnh hạch toán</span>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-3.5 py-1.5 text-[9.5px] font-black uppercase tracking-widest text-slate-300 border-b border-slate-50">
                    Thanh toán nguyên liệu
                  </div>
                  <div className="px-4 py-3 text-[10px] text-slate-400 italic">
                    (Chưa có dữ liệu thanh toán)
                  </div>
                </>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
