/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BienBan } from './types';
import { getSampleInspection } from './utils';
import { exportInspectionToExcel } from './excelExport';
import InspectionForm from './components/InspectionForm';
import InspectionPrint from './components/InspectionPrint';
import AuthScreen from './components/AuthScreen';
import UserManagement from './components/UserManagement';
import { hydrateCloudLocalStorage, installCloudLocalStorageSync } from './cloudLocalStorage';
import { 
  getInspections, 
  saveInspectionToDb, 
  deleteInspectionFromDb, 
  getUsers, 
  saveUserToDb, 
  compressBase64Image,
  subscribeInspections
} from './firebase';
import { supabase } from './supabaseClient';
import { 
  FileSpreadsheet, 
  Settings, 
  HelpCircle, 
  Download, 
  Upload, 
  TrendingUp, 
  Layers, 
  Activity,
  FileCheck,
  Flame,
  Globe,
  Database,
  Monitor,
  ShieldCheck
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'wood_inspections_db';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'wood_current_user_v1';

export default function App() {
  const [records, setRecords] = useState<BienBan[]>([]);
  const [view, setView] = useState<'form' | 'print'>('form');
  const [activeRecord, setActiveRecord] = useState<BienBan | undefined>(undefined);
  const [formSessionKey, setFormSessionKey] = useState<number>(0);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [printMode, setPrintMode] = useState<'qc' | 'payment'>('qc');
  
  // Database cloud syncing states
  const [dbSyncing, setDbSyncing] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Auth state management
  const [currentUser, setCurrentUser] = useState<{ username: string; email: string; fullName: string; role: string; roleCode?: string; permissions?: string[]; avatar?: string } | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);

  const handleUpdateUser = (updatedUser: { username: string; email: string; fullName: string; role: string; avatar?: string }) => {
    setCurrentUser(updatedUser);
// Không lưu user session vào localStorage nữa.
// Supabase Auth sẽ quản lý phiên đăng nhập.
    // Also update in registered user list
    const rawUsers = localStorage.getItem('wood_users_db_v1');
    if (rawUsers) {
      try {
        const users = JSON.parse(rawUsers);
        const updatedUsers = users.map((u: any) => u.email.toLowerCase() === updatedUser.email.toLowerCase() ? { ...u, ...updatedUser } : u);
        localStorage.setItem('wood_users_db_v1', JSON.stringify(updatedUsers));
        // Sync to cloud
        saveUserToDb(updatedUser.email, updatedUser).catch(err => console.error("Cloud user update failed:", err));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 1. Initial Load of Documents from Supabase DB
  useEffect(() => {
    async function loadWorkplaceData() {
      try {
        setDbSyncing(true);
        setSyncStatus('Thu thập thông tin hệ thống...');
        
        // 1. Load users list from database
        let dbUsers: any[] = [];
        try {
          dbUsers = await getUsers();
        } catch (err) {
          console.warn("Could not load users list from Supabase:", err);
        }

        let localUsers: any[] = [];
        const rawUsers = localStorage.getItem('wood_users_db_v1');
        if (rawUsers) {
          try {
            localUsers = JSON.parse(rawUsers);
          } catch (e) {}
        }
        
        let mergedUsers = [...dbUsers];
        
        try {
          // Đồng bộ user registry compatibility nếu app_settings đã có dữ liệu
          if (dbUsers.length === 0 && localUsers.length > 0) {
            for (const u of localUsers) {
              await saveUserToDb(u.email, u);
            }
            mergedUsers = localUsers;
          } else if (localUsers.length > 0) {
            // Sync local-only accounts
            const dbEmails = new Set(dbUsers.map((u: any) => (u.email || '').toLowerCase()));
            const localOnlyUsers = localUsers.filter((u: any) => u.email && !dbEmails.has(u.email.toLowerCase()));
            for (const u of localOnlyUsers) {
              await saveUserToDb(u.email, u);
              mergedUsers.push(u);
            }
          }
          
          // Không tự tạo tài khoản/password mặc định trong code production.
          // User thật phải được tạo trong Supabase Authentication và bảng profiles.
        } catch (syncErr) {
          console.warn("Failed to sync some user records during startup:", syncErr);
        }

        try {
          // Pre-compress current user's avatar if stored with a massive size in localStorage
          const rawCurr = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
          if (rawCurr) {
            try {
              const parsedCurr = JSON.parse(rawCurr);
              if (parsedCurr && parsedCurr.avatar && parsedCurr.avatar.length > 50000) {
                const compressedAvatar = await compressBase64Image(parsedCurr.avatar);
                parsedCurr.avatar = compressedAvatar;
                setCurrentUser(parsedCurr);
                localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(parsedCurr));
              }
            } catch (e) {}
          }

          // Downscale massive avatars in user registry on startup
          for (let i = 0; i < mergedUsers.length; i++) {
            const u = mergedUsers[i];
            if (u.avatar && u.avatar.length > 50000) {
              try {
                u.avatar = await compressBase64Image(u.avatar);
                await saveUserToDb(u.email, u);
              } catch (compErr) {
                console.warn("Auto compression during load failed for user:", u.email, compErr);
              }
            }
          }
        } catch (avatarErr) {
          console.warn("Avatar downscaling crashed on startup:", avatarErr);
        }
        
        localStorage.setItem('wood_users_db_v1', JSON.stringify(mergedUsers));

        // 2. Fetch Wood Inspections records from Supabase
        setSyncStatus('Đang đồng bộ cơ sở dữ liệu đám mây...');
        const dbRecords = await getInspections() as BienBan[];
        
        // Supabase là nguồn dữ liệu bền vững duy nhất cho biên bản nghiệm thu.
        // Không merge/fallback từ browser localStorage nữa.
        let mergedList = [...dbRecords];
        
        // If everything is blank, insert the pre-compiled wood mill inspection sample only on first setup
        const isSeeded = localStorage.getItem('wood_database_seeded_v1') === 'true';
        if (mergedList.length === 0 && !isSeeded) {
          const sample = getSampleInspection();
          await saveInspectionToDb(sample.id, sample);
          mergedList = [sample];
          localStorage.setItem('wood_database_seeded_v1', 'true');
        } else if (mergedList.length > 0) {
          localStorage.setItem('wood_database_seeded_v1', 'true');
        }
        
        // Clean records if they contain Phạm Thành Nam, Lê Hoàng Hải, or Nguyễn Văn Hùng
        const cleaned = mergedList.map(record => {
          const updated = { ...record };
          if (updated.nguoi_ky_pho_tgd === "Phạm Thành Nam") updated.nguoi_ky_pho_tgd = "";
          if (updated.nguoi_ky_tp_pqlcl === "Lê Hoàng Hải") updated.nguoi_ky_tp_pqlcl = "";
          if (updated.nguoi_ky_thu_kho === "Nguyễn Văn Hùng") updated.nguoi_ky_thu_kho = "";
          if (updated.thanh_phan && Array.isArray(updated.thanh_phan)) {
            updated.thanh_phan = updated.thanh_phan.filter(
              tp => tp.ho_ten !== "Lê Hoàng Hải" && tp.ho_ten !== "Phạm Thành Nam" && tp.ho_ten !== "Nguyễn Văn Hùng"
            );
          }
          return updated;
        });
        
        setRecords(cleaned);
        
        setSyncStatus('✓ Đã kết nối & Đồng bộ dữ liệu');
        setTimeout(() => setSyncStatus(''), 2500);
      } catch (err) {
        console.error("Failed to sync with Supabase database:", err);
        setSyncStatus('⚠ Không kết nối được Supabase');
        setTimeout(() => setSyncStatus(''), 4000);
        setRecords([]);
      } finally {
        setDbSyncing(false);
      }
    }
    
   // Không tự khôi phục phiên đăng nhập sau khi tải lại trình duyệt.
   // Chỉ tải dữ liệu sau khi người dùng đăng nhập thành công.
   if (currentUser) loadWorkplaceData();

}, [currentUser?.email]);

  // 2. Automated background watcher to propagate account registries & updates to Supabase
  useEffect(() => {
    let lastRawUsers = localStorage.getItem('wood_users_db_v1') || '';
    
    const interval = setInterval(async () => {
      const currentRawUsers = localStorage.getItem('wood_users_db_v1') || '';
      if (currentRawUsers !== lastRawUsers) {
        lastRawUsers = currentRawUsers;
        try {
          const users = JSON.parse(currentRawUsers);
          if (Array.isArray(users)) {
            for (const u of users) {
              if (u.email) {
                await saveUserToDb(u.email, u).catch(err => {
                  console.warn(`Background save failed for user ${u.email}:`, err);
                });
              }
            }
          }
        } catch (e) {
          console.error("Automated background user sync failed:", e);
        }
      }
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  // 3. Persist database to Supabase
  const saveToLocalStorage = async (updated: BienBan[]) => {
    setRecords(updated);
    // Memory-only compatibility cho các component cũ; nguồn thật là Supabase DB.
    // localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    
    // Auto-save asynchronous upload to Supabase
    try {
      setSyncStatus('Đang sao lưu đám mây...');
      
      const dbRecords = await getInspections() as BienBan[];
      const dbIds = new Set(dbRecords.map(r => r.id));
      const updatedIds = new Set(updated.map(r => r.id));
      
      // Save current logs
      for (const rec of updated) {
        await saveInspectionToDb(rec.id, rec);
      }
      setRecords(updated);
      
      // Clean up deleted ones
      const deletedOnes = dbRecords.filter(r => r.id && !updatedIds.has(r.id));
      for (const rec of deletedOnes) {
        await deleteInspectionFromDb(rec.id);
      }
      
      setSyncStatus('✓ Đồng bộ hoàn tất');
      setTimeout(() => setSyncStatus(''), 2000);
    } catch (e) {
      console.error("Fail saving into Supabase:", e);
      setSyncStatus('⚠ Lỗi đồng bộ đám mây');
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  // 4. Save modified or new inspection document
  const handleSaveInspection = (savedDoc: BienBan, goToPrint?: boolean, preferredPrintMode?: 'qc' | 'payment') => {
    const exists = records.some(r => r.id === savedDoc.id);
    let nextList: BienBan[] = [];
    if (exists) {
      nextList = records.map(r => r.id === savedDoc.id ? savedDoc : r);
    } else {
      nextList = [savedDoc, ...records];
    }
    setRecords(nextList);
    saveToLocalStorage(nextList);
    
    // Store localized notification so that InspectionForm can render it as a real-time ringing toast alert
    localStorage.setItem('wood_saved_toast_notification', JSON.stringify({
      title: "Lưu biên bản thành công!",
      message: `Biên bản '${savedDoc.ma_bbnt}' đã lưu vào CSDL. Hệ thống đã tự động gửi tín hiệu thông báo sang mục 'Chi tiết thanh toán' để xử lý giải ngân.`,
      ma_bbnt: savedDoc.ma_bbnt,
      time: Date.now()
    }));
    
    if (goToPrint) {
      setActiveRecord(savedDoc);
      if (preferredPrintMode) {
        setPrintMode(preferredPrintMode);
      } else {
        setPrintMode('qc');
      }
      setView('print');
    } else {
      setView('form');
      setActiveRecord(undefined);
    }
    
    setSaveStatus(`✓ Đã lưu phiếu nghiệm thu gỗ '${savedDoc.ma_bbnt}' vào CSDL ERP thành công!`);
    setTimeout(() => setSaveStatus(''), 5000);
  };

  // 5. Record delete
  const handleDeleteInspection = (id: string) => {
    const nextList = records.filter(r => r.id !== id);
    saveToLocalStorage(nextList);
    if (activeRecord?.id === id) {
      setActiveRecord(undefined);
    }
  };

  const handleDeleteAllInspections = () => {
    if (window.confirm("Bạn có chắc muốn xóa TOÀN BỘ biên bản nghiệm thu khỏi CSDL Hệ thống đám mây?")) {
      saveToLocalStorage([]);
      return true;
    }
    return false;
  };

  // 6. Template Duplication
  const handleDuplicateInspection = (bb: BienBan) => {
    const newDoc: BienBan = {
      ...bb,
      id: `bb-dup-${Date.now()}`,
      ma_bbnt: `${bb.ma_bbnt} (Sao chép)`,
      ngay_nt: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    const nextList = [newDoc, ...records];
    saveToLocalStorage(nextList);
  };

  // 7. Hard refilling of default sample
  const handleLoadSample = () => {
    const sample = getSampleInspection();
    if (records.some(r => r.id === sample.id)) {
      alert("Hồ sơ mẫu GB 12.05 đã tồn tại trong danh sách của bạn.");
      return;
    }
    const nextList = [sample, ...records];
    saveToLocalStorage(nextList);
  };

  // 8. Interactive DB backup & restore
  const handleDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CSDL_NghiemThuGoKeo_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    
    setBackupStatus('✓ Sao lưu dữ liệu thô (.JSON) thành công!');
    setTimeout(() => setBackupStatus(''), 4000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (file) {
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const ok = parsed.every(doc => doc.id && doc.ma_bbnt && Array.isArray(doc.quy_cach_a));
            if (ok) {
              saveToLocalStorage(parsed);
              setBackupStatus('✓ Phục hồi cơ sở dữ liệu gỗ thành công!');
              setTimeout(() => setBackupStatus(''), 4000);
            } else {
              alert("Lỗi cấu trúc tệp sao lưu gỗ không hợp lệ.");
            }
          }
        } catch (err) {
          alert("Lỗi khi giải mã tệp dữ liệu.");
        }
      };
      fileReader.readAsText(file);
    }
  };

  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={async (user) => {
          installCloudLocalStorageSync();
          await hydrateCloudLocalStorage();
          setCurrentUser(user);
        }}
      />
    );
  }


  return (
    <div className="min-h-screen bg-[#f4f6f9] font-sans antialiased text-gray-800">
      {(currentUser.email.toLowerCase() === 'duc941980@gmail.com' || currentUser.roleCode === 'admin' || currentUser.role.toLowerCase().includes('quản trị')) && (
        <button
          type="button"
          onClick={() => setShowUserManagement(true)}
          className="fixed top-3 right-3 z-[9000] px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black shadow-xl flex items-center gap-2 hover:bg-slate-800"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Tài khoản & phân quyền
        </button>
      )}
      <UserManagement
        open={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        currentUserEmail={currentUser.email}
        onRegistryChanged={(users) => localStorage.setItem('wood_users_db_v1', JSON.stringify(users))}
      />
      {/* Main Interactive Screen Container */}
      <main className="w-full">

        {/* WORK BENCH FORM */}
        {view === 'form' && (
          <div className="animate-fade-in w-full">
            <InspectionForm
              key={activeRecord ? `loaded-${activeRecord.id}` : `new-${formSessionKey}`}
              initialBienBan={activeRecord}
              allRecords={records}
              onSave={handleSaveInspection}
              onCancel={() => {
                setActiveRecord(undefined);
                setFormSessionKey(prev => prev + 1);
              }}
              onDelete={handleDeleteInspection}
              onDeleteAll={handleDeleteAllInspections}
              onDuplicate={handleDuplicateInspection}
              onExportExcel={exportInspectionToExcel}
              onPrint={(bb, preferredMode) => {
                setActiveRecord(bb);
                setPrintMode(preferredMode || 'qc');
                setView('print');
              }}
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onLogout={() => {
                localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
                supabase?.auth.signOut().catch(() => {});
                setCurrentUser(null);
              }}
            />
          </div>
        )}

        {/* OFFICIAL BLACK-AND-WHITE PRINT LAYOUT */}
        {view === 'print' && activeRecord && (
          <div className="animate-fade-in max-w-5xl mx-auto py-8 px-4">
            <InspectionPrint
              bienBan={activeRecord}
              initialPrintMode={printMode}
              currentUser={currentUser || undefined}
              onBack={() => {
                setView('form');
                setActiveRecord(undefined);
              }}
            />
          </div>
        )}

      </main>

      {syncStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-white text-[11px] px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 transition-all duration-300 animate-slide-in-up">
          {dbSyncing ? (
            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          <span className="font-sans font-semibold text-slate-200 tracking-tight">{syncStatus}</span>
        </div>
      )}

    </div>
  );
}
