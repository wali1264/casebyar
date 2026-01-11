
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Layout, FileText, Settings, Archive, User, Search, Printer, Plus, Save, Move, RotateCw, Upload, Trash2, AlignLeft, AlignCenter, AlignRight, Grid, List, Layers, PlusCircle, ChevronDown, Files, UserPlus, X, ChevronLeft, CheckCircle2, Type, Maximize2, Bell, Pencil, ShieldCheck, Database, Download, FileJson, Key, Check, Lock, LogOut, UserCheck, Shield, Eye, EyeOff, Repeat, Phone, CreditCard, UserCircle } from 'lucide-react';
import { PaperSize, ContractField, ContractTemplate, TextAlignment, ContractPage, ClientProfile } from './types';
import { INITIAL_FIELDS } from './constants';

// --- Asra GPS Custom SVG Logo ---
const AsraLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="55" rx="45" ry="15" stroke="#0072BC" strokeWidth="4" />
    <path d="M50 85C50 85 80 55 80 35C80 18.4315 66.5685 5 50 5C33.4315 5 20 18.4315 20 35C20 55 50 85 50 85Z" fill="#ED1C24" />
    <path d="M35 45C35 43 37 41 40 40.5L42 37C43 35.5 45 35 47 35H53C55 35 57 35.5 58 37L60 40.5C63 41 65 43 65 45V50C65 51 64 52 63 52H37C36 52 35 51 35 50V45Z" fill="white" />
    <rect x="38" y="47" width="4" height="2" rx="1" fill="#ED1C24" opacity="0.5" />
    <rect x="58" y="47" width="4" height="2" rx="1" fill="#ED1C24" opacity="0.5" />
    <path d="M42 41H58L56 38H44L42 41Z" fill="#ED1C24" opacity="0.3" />
  </svg>
);

const STORAGE_KEYS = {
  TEMPLATE: 'contract_flow_template_v1',
  CLIENTS: 'contract_flow_clients_v1',
  ARCHIVE: 'contract_flow_archive_v1',
  USERS: 'contract_flow_users_v2',
  ROLES: 'contract_flow_roles_v2',
  SESSION: 'contract_flow_session_v1'
};

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent('show-app-toast', { detail: message }));
};

const Toast = () => {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: any) => {
      setMsg(e.detail);
      setTimeout(() => setMsg(null), 3000);
    };
    window.addEventListener('show-app-toast', handler);
    return () => window.removeEventListener('show-app-toast', handler);
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 z-[1000] animate-in slide-in-from-bottom-10 border border-slate-700 backdrop-blur-xl no-print">
      <Bell size={18} className="text-blue-400" />
      <span className="font-bold text-sm">{msg}</span>
    </div>
  );
};

const INITIAL_ROLES = [
  { 
    id: 'admin_role', 
    name: 'مدیر کل', 
    perms: ['workspace', 'workspace_create', 'workspace_search', 'archive', 'archive_print', 'archive_edit', 'archive_delete', 'settings', 'settings_boom', 'settings_users', 'settings_backup'] 
  }
];

const INITIAL_USERS = [
  { id: '1', username: 'admin', password: '12345', roleId: 'admin_role' }
];

// --- Print Renderer Component (Highly Precise) ---
const PrintLayout = ({ template, formData }: { template: ContractTemplate, formData: Record<string, string> }) => {
  return (
    <div className="print-only hidden print:block bg-white overflow-visible">
      {template.pages.map((page, index) => {
        // Only print pages that have at least one active field being used or if it's the first page
        const activeFields = page.fields.filter(f => f.isActive);
        if (activeFields.length === 0 && index > 0) return null;

        const isA4 = page.paperSize === PaperSize.A4;
        const width = isA4 ? '210mm' : '148mm';
        const height = isA4 ? '297mm' : '210mm';

        return (
          <div 
            key={index} 
            className="relative overflow-hidden bg-white" 
            style={{ 
              width, 
              height, 
              pageBreakAfter: 'always',
              backgroundImage: page.showBackgroundInPrint && page.bgImage ? `url(${page.bgImage})` : 'none',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {activeFields.map((field) => (
              <div
                key={field.id}
                className="absolute flex items-center"
                style={{
                  left: `${field.x}%`,
                  top: `${field.y}%`,
                  width: `${field.width}px`,
                  transform: `rotate(${field.rotation}deg)`,
                  fontSize: `${field.fontSize}px`,
                  textAlign: field.alignment === 'L' ? 'left' : field.alignment === 'R' ? 'right' : 'center',
                  justifyContent: field.alignment === 'L' ? 'flex-start' : field.alignment === 'R' ? 'flex-end' : 'center',
                  fontFamily: 'Vazirmatn, sans-serif',
                  fontWeight: 'bold',
                  lineHeight: '1.2'
                }}
              >
                <span className="w-full break-words">
                  {formData[field.key] || ''}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

const Sidebar = ({ activeTab, setActiveTab, userPermissions, onLogout }: { activeTab: string, setActiveTab: (t: string) => void, userPermissions: string[], onLogout: () => void }) => {
  const menuItems = [
    { id: 'workspace', icon: Layout, label: 'میز کار', perm: 'workspace' },
    { id: 'archive', icon: Archive, label: 'بایگانی', perm: 'archive' },
    { id: 'settings', icon: Settings, label: 'تنظیمات', perm: 'settings' }
  ].filter(item => userPermissions.includes(item.perm));

  return (
    <aside className="w-20 md:w-64 bg-slate-900 text-white min-h-screen flex flex-col p-4 no-print transition-all">
      <div className="flex items-center gap-3 mb-10 px-2 overflow-hidden">
        <div className="bg-white p-1 rounded-xl shadow-lg flex-shrink-0 flex items-center justify-center">
          <AsraLogo size={36} />
        </div>
        <h1 className="text-2xl font-black hidden md:block tracking-tight text-white whitespace-nowrap">اسراء GPS</h1>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 ${
              activeTab === item.id ? 'bg-blue-600 shadow-lg shadow-blue-900/20 scale-[1.02]' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <item.icon size={20} />
            <span className="hidden md:block font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <button 
        onClick={onLogout}
        className="flex items-center gap-3 p-4 rounded-2xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all mt-auto"
      >
        <LogOut size={20} />
        <span className="hidden md:block font-medium">خروج از سیستم</span>
      </button>
    </aside>
  );
};

const LoginForm = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || JSON.stringify(INITIAL_USERS));
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center p-6 z-[2000]">
      <div className="bg-white w-full max-w-md p-10 rounded-[48px] shadow-2xl border border-white animate-in zoom-in-95 duration-500 text-center">
        <div className="w-28 h-28 bg-white text-blue-600 rounded-[36px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-100 p-4 border border-blue-50">
           <AsraLogo size={80} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">ورود به اسراء GPS</h2>
        <p className="text-slate-400 font-medium mb-10">سامانه مدیریت هوشمند ردیاب‌ها</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="text" 
              placeholder="نام کاربری" 
              className="w-full pr-14 pl-6 py-5 bg-slate-50 rounded-[24px] outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold text-lg"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="relative">
            <Key className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="password" 
              placeholder="رمز عبور" 
              className="w-full pr-14 pl-6 py-5 bg-slate-50 rounded-[24px] outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold text-lg"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 font-black text-xs animate-bounce">اطلاعات کاربری اشتباه است</p>}
          <button className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all mt-4">ورود به پنل عملیاتی</button>
        </form>
      </div>
    </div>
  );
};

const Workspace = ({ template, editData, onEditCancel, perms, formData, setFormData }: { template: ContractTemplate, editData?: any, onEditCancel?: () => void, perms: string[], formData: Record<string, string>, setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>> }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (editData) {
      const client = clients.find(c => c.id === editData.clientId);
      if (client) {
        setSelectedClient(client);
        setFormData(editData.formData || {});
        const pagesWithData = template.pages
          .filter(p => p.fields.some(f => editData.formData[f.key]))
          .map(p => p.pageNumber);
        setVisiblePages(pagesWithData.length > 0 ? pagesWithData : [1]);
      }
    }
  }, [editData, clients, template.pages]);

  const filteredClients = useMemo(() => {
    if (!perms.includes('workspace_search')) return [];
    const lowerSearch = searchTerm.toLowerCase().trim();
    if (!lowerSearch) return [];
    return clients.filter(c => 
      c.name.toLowerCase().includes(lowerSearch) || 
      c.tazkira.toLowerCase().includes(lowerSearch)
    );
  }, [clients, searchTerm, perms]);

  const handleCreateClient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!perms.includes('workspace_create')) {
        showToast('شما دسترسی ایجاد پرونده ندارید');
        return;
    }
    const data = new FormData(e.currentTarget);
    const newClient: ClientProfile = {
      id: Date.now().toString(),
      name: data.get('name') as string,
      fatherName: data.get('fatherName') as string,
      tazkira: data.get('tazkira') as string,
      phone: data.get('phone') as string,
      createdAt: new Date().toLocaleDateString('fa-IR'),
    };
    if (!newClient.name || !newClient.tazkira) {
      showToast('لطفاً فیلدهای ضروری را پر کنید');
      return;
    }
    const updatedClients = [newClient, ...clients];
    setClients(updatedClients);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updatedClients));
    setSelectedClient(newClient);
    setIsModalOpen(false);
    showToast('پرونده دیجیتال مشتری ایجاد شد');
  };

  const handleSaveContract = (isExtension: boolean = false) => {
    if (!selectedClient) return;
    if (!perms.includes('workspace_create') && !editData) return;
    if (editData && !perms.includes('archive_edit') && !isExtension) {
        showToast('دسترسی ویرایش قرارداد را ندارید');
        return;
    }

    let archive = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE) || '[]');
    
    if (editData && !isExtension) {
      archive = archive.map((item: any) => 
        item.id === editData.id 
          ? { ...item, formData, timestamp: new Date().toISOString() } 
          : item
      );
      showToast('تغییرات قرارداد بروزرسانی شد');
    } else {
      const newEntry = {
        id: Date.now().toString(),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        formData,
        timestamp: new Date().toISOString(),
        templateId: template.id,
        isExtended: isExtension
      };
      archive = [newEntry, ...archive];
      showToast(isExtension ? 'قرارداد تمدید و به عنوان سند جدید ثبت شد' : 'قرارداد با موفقیت در بایگانی ثبت شد');
    }
    
    localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(archive));
    resetWorkspace();
  };

  const handleEnter = (e: React.KeyboardEvent, currentKey: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const allKeys = template.pages.flatMap(p => p.fields.filter(f => f.isActive)).map(f => f.key);
      const currentIndex = allKeys.indexOf(currentKey);
      if (currentIndex < allKeys.length - 1) {
        inputRefs.current[allKeys[currentIndex + 1]]?.focus();
      }
    }
  };

  const togglePage = (pageNum: number) => {
    if (visiblePages.includes(pageNum)) {
      setVisiblePages(visiblePages.filter(p => p !== pageNum));
    } else {
      setVisiblePages([...visiblePages, pageNum]);
    }
  };

  const resetWorkspace = () => {
    setSelectedClient(null);
    setFormData({});
    setVisiblePages([1]);
    if (onEditCancel) onEditCancel();
  };

  if (!selectedClient) {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center mb-12 pt-10">
          <div className="w-40 h-40 bg-white rounded-[48px] flex items-center justify-center mx-auto mb-6 shadow-2xl p-4 border border-slate-50">
             <AsraLogo size={120} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">میز کار اسراء GPS</h2>
          <p className="text-slate-500 font-medium text-lg italic opacity-80">سامانه هوشمند ثبت و تمدید خدمات ردیابی</p>
        </div>
        <div className="flex gap-5 items-center px-4">
          <div className="relative flex-1 group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
            <input 
              disabled={!perms.includes('workspace_search')}
              type="text" 
              placeholder={perms.includes('workspace_search') ? "جستجوی نام یا تذکره مشتری..." : "شما دسترسی جستجو ندارید"}
              className={`w-full pr-16 pl-8 py-6 bg-white border-2 border-slate-100 rounded-[32px] shadow-sm outline-none transition-all text-xl font-medium ${!perms.includes('workspace_search') ? 'opacity-50 grayscale cursor-not-allowed' : 'focus:border-blue-500 focus:shadow-[0_20px_50px_rgba(59,130,246,0.1)]'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {perms.includes('workspace_create') && (
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-6 rounded-[32px] shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-3 group">
                <UserPlus size={28} />
                <span className="hidden md:block font-black text-lg">تشکیل پرونده</span>
            </button>
          )}
        </div>
        {searchTerm && perms.includes('workspace_search') && (
          <div className="mt-8 bg-white/80 backdrop-blur-xl rounded-[40px] border border-white/50 shadow-2xl overflow-hidden animate-in zoom-in-95 mx-4">
            <div className="p-5 bg-slate-50/50 border-b text-xs font-black text-slate-400 uppercase tracking-widest">نتایج یافت شده در بایگانی</div>
            {filteredClients.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {filteredClients.map(client => (
                  <div key={client.id} onClick={() => setSelectedClient(client)} className="p-8 flex items-center justify-between hover:bg-blue-50/40 cursor-pointer transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">{client.name[0]}</div>
                      <div>
                        <h4 className="font-black text-xl text-slate-800 mb-1">{client.name}</h4>
                        <div className="flex gap-4 text-sm font-medium text-slate-400">
                           <span>پدر: {client.fatherName}</span>
                           <span className="opacity-30">|</span>
                           <span>تذکره: {client.tazkira}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="text-slate-300" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-14 text-center text-slate-400 font-bold">هیچ پرونده‌ای یافت نشد.</div>
            )}
          </div>
        )}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
            <form onSubmit={handleCreateClient} className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 border border-white/20">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-10 text-white flex justify-between items-center">
                <h3 className="text-2xl font-black flex items-center gap-3"><UserPlus size={32} /> تشکیل پرونده مشتری</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 rounded-full hover:bg-white/20 transition-all"><X size={24}/></button>
              </div>
              <div className="p-12 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase">نام و تخلص</label>
                    <input name="name" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all" placeholder="..." required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase">نام پدر</label>
                    <input name="fatherName" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all" placeholder="..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2 uppercase">شماره تذکره (ID)</label>
                  <input name="tazkira" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all" placeholder="..." required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2 uppercase">شماره تماس</label>
                  <input name="phone" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all" placeholder="..." />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">تایید و ایجاد پرونده</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto py-6 px-6 animate-in fade-in duration-500 flex flex-col h-full overflow-hidden no-print">
      {/* Smart 4-Column Slim Profile Bar */}
      <div className="bg-white rounded-[28px] px-8 py-5 shadow-sm border border-slate-100 mb-6 flex items-center justify-between no-print hover:shadow-md transition-all group w-full">
        <div className="flex-1 grid grid-cols-4 gap-8 items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UserCircle size={20}/></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">نام مشتری</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{selectedClient.name}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-lg"><User size={20}/></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">نام پدر</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{selectedClient.fatherName}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-lg"><CreditCard size={20}/></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">تذکره</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{selectedClient.tazkira}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Phone size={20}/></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">تماس</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{selectedClient.phone || '---'}</span>
                </div>
            </div>
        </div>
        <button onClick={resetWorkspace} className="mr-6 p-3 rounded-xl hover:bg-red-50 text-slate-200 hover:text-red-500 transition-all flex-shrink-0 no-print"><X size={24}/></button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 space-y-6 custom-scrollbar px-1 no-print">
        {template.pages.map((page) => {
          const isPageOpen = visiblePages.includes(page.pageNumber);
          const activeFields = page.fields.filter(f => f.isActive);
          if (activeFields.length === 0) return null;
          return (
            <div key={page.pageNumber} className={`bg-white rounded-[32px] border border-slate-100 transition-all w-full ${isPageOpen ? 'shadow-lg' : 'opacity-60 shadow-sm'}`}>
              <div onClick={() => togglePage(page.pageNumber)} className="p-6 flex items-center justify-between cursor-pointer group">
                <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full transition-all ${isPageOpen ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  برگ قرارداد شماره {page.pageNumber}
                </h4>
                <div className={`p-2 rounded-xl transition-all ${isPageOpen ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                   <ChevronDown className={`transition-transform duration-500 ${isPageOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {isPageOpen && (
                <div className="p-8 pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 animate-in slide-in-from-top-4 duration-300">
                  {activeFields.map((field) => (
                    <div key={field.id} className="flex flex-col gap-2">
                      <label className="text-[13px] font-black text-slate-800 px-1 tracking-tight truncate">{field.label}</label>
                      <input 
                        ref={el => inputRefs.current[field.key] = el}
                        type="text" 
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                        onKeyDown={(e) => handleEnter(e, field.key)}
                        placeholder="..."
                        className="w-full px-5 py-4 bg-slate-50/50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/30 focus:shadow-sm transition-all font-bold text-lg text-slate-700 placeholder:text-slate-300"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 no-print z-50">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 p-4 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-wrap gap-3 items-center justify-center">
          <button onClick={() => handleSaveContract(false)} className="flex-1 min-w-[180px] bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
            <Save size={24} /> {editData ? 'بروزرسانی سند' : 'ثبت نهایی قرارداد'}
          </button>
          
          {editData && (
            <button onClick={() => handleSaveContract(true)} className="flex-1 min-w-[180px] bg-emerald-500 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
              <Repeat size={24} /> تمدید قرارداد (ثبت جدید)
            </button>
          )}

          <button onClick={() => window.print()} className="px-10 bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 hover:bg-black hover:-translate-y-0.5 transition-all shadow-xl">
            <Printer size={22}/> چاپ
          </button>
        </div>
      </div>
    </div>
  );
};

const UsersManager = () => {
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || JSON.stringify(INITIAL_USERS)));
  const [roles, setRoles] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.ROLES) || JSON.stringify(INITIAL_ROLES)));
  const [subTab, setSubTab] = useState<'users' | 'roles'>('users');
  const [editingUser, setEditingUser] = useState<any>(null);

  const permissionsList = [
    { id: 'workspace', label: 'دسترسی به میز کار', parent: null },
    { id: 'workspace_create', label: 'ایجاد پرونده جدید', parent: 'workspace' },
    { id: 'workspace_search', label: 'جستجوی مشتریان', parent: 'workspace' },
    { id: 'archive', label: 'مشاهده بایگانی', parent: null },
    { id: 'archive_print', label: 'چاپ در بایگانی', parent: 'archive' },
    { id: 'archive_edit', label: 'ویرایش در بایگانی', parent: 'archive' },
    { id: 'archive_delete', label: 'حذف سوابق بایگانی', parent: 'archive' },
    { id: 'settings', label: 'دسترسی به تنظیمات', parent: null },
    { id: 'settings_boom', label: 'مدیریت بوم طراحی', parent: 'settings' },
    { id: 'settings_users', label: 'مدیریت کاربران و نقش‌ها', parent: 'settings' },
    { id: 'settings_backup', label: 'پشتیبان‌گیری داده‌ها', parent: 'settings' }
  ];

  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const username = data.get('username') as string;
    const password = data.get('password') as string;
    const roleId = data.get('roleId') as string;

    let updatedUsers;
    if (editingUser) {
      updatedUsers = users.map((u: any) => u.id === editingUser.id ? { ...u, username, password, roleId } : u);
    } else {
      updatedUsers = [...users, { id: Date.now().toString(), username, password, roleId }];
    }
    setUsers(updatedUsers);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    setEditingUser(null);
    showToast('اطلاعات کاربر ذخیره شد');
  };

  const handleSaveRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const roleName = data.get('roleName') as string;
    const checkedPerms = Array.from(data.getAll('perms') as string[]);
    
    const newRole = { id: Date.now().toString(), name: roleName, perms: checkedPerms };
    const updatedRoles = [...roles, newRole];
    setRoles(updatedRoles);
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(updatedRoles));
    showToast('نقش جدید تعریف شد');
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500 p-8 h-full overflow-y-auto custom-scrollbar no-print">
      <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button onClick={() => setSubTab('users')} className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${subTab === 'users' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>مدیریت کاربران</button>
        <button onClick={() => setSubTab('roles')} className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${subTab === 'roles' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>نقش‌ها و دسترسی</button>
      </div>

      {subTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
           <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-fit">
              <h3 className="font-black text-xl mb-8 flex items-center gap-2 text-slate-800"><UserPlus className="text-blue-600"/> {editingUser ? 'ویرایش کاربر' : 'ایجاد کاربر جدید'}</h3>
              <form onSubmit={handleSaveUser} className="space-y-6">
                <input name="username" type="text" defaultValue={editingUser?.username} placeholder="نام کاربری" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold" required />
                <input name="password" type="password" defaultValue={editingUser?.password} placeholder="رمز عبور" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold" required />
                <select name="roleId" defaultValue={editingUser?.roleId} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold">
                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-blue-100">{editingUser ? 'بروزرسانی' : 'ثبت کاربر'}</button>
                {editingUser && <button type="button" onClick={() => setEditingUser(null)} className="w-full text-slate-400 font-bold">انصراف</button>}
              </form>
           </div>
           <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
             <h3 className="font-black text-xl mb-8 text-slate-800">کاربران فعال</h3>
             <div className="divide-y divide-slate-100">
               {users.map((u: any) => (
                 <div key={u.id} className="py-5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400">{u.username[0]}</div>
                     <div>
                        <p className="font-bold text-slate-700">{u.username}</p>
                        <p className="text-xs text-slate-400">{roles.find((r:any)=>r.id===u.roleId)?.name}</p>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => setEditingUser(u)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Pencil size={18}/></button>
                     {u.username !== 'admin' && (
                        <button onClick={() => {
                            const up = users.filter((us:any)=>us.id!==u.id);
                            setUsers(up);
                            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(up));
                        }} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                     )}
                   </div>
                 </div>
               ))}
             </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
           <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-fit">
              <h3 className="font-black text-xl mb-8 flex items-center gap-2 text-slate-800"><ShieldCheck className="text-blue-600"/> تعریف نقش</h3>
              <form onSubmit={handleSaveRole} className="space-y-6">
                <input name="roleName" type="text" placeholder="نام نقش..." className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold" required />
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ماتریس دسترسی</p>
                  <div className="space-y-2">
                    {permissionsList.map(p => (
                      <div key={p.id} className={`${p.parent ? 'mr-6 scale-95 opacity-80' : 'mt-4 border-t pt-4'}`}>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-white transition-all">
                          <input type="checkbox" name="perms" value={p.id} className="w-5 h-5 accent-blue-600 rounded" />
                          <span className="text-xs font-bold text-slate-700">{p.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-blue-100">ثبت نقش و دسترسی</button>
              </form>
           </div>
           <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
             <h3 className="font-black text-xl mb-8 text-slate-800">نقش‌های سیستم</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((r:any) => (
                  <div key={r.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-black text-lg text-blue-600">{r.name}</h4>
                      {r.id !== 'admin_role' && <Trash2 size={16} className="text-slate-300 cursor-pointer hover:text-red-500" onClick={() => {
                        const nr = roles.filter((ro:any)=>ro.id!==r.id);
                        setRoles(nr);
                        localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(nr));
                      }} />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.perms.map((p:string) => (
                        <span key={p} className="px-3 py-1 bg-white rounded-lg text-[9px] font-black text-slate-500 border border-slate-100">
                            {permissionsList.find(pl => pl.id === p)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const BackupManager = () => {
  const handleExport = () => {
    const data = {
      template: localStorage.getItem(STORAGE_KEYS.TEMPLATE),
      clients: localStorage.getItem(STORAGE_KEYS.CLIENTS),
      archive: localStorage.getItem(STORAGE_KEYS.ARCHIVE),
      users: localStorage.getItem(STORAGE_KEYS.USERS),
      roles: localStorage.getItem(STORAGE_KEYS.ROLES),
      version: '1.2.0',
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asra_gps_backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;
    a.click();
    showToast('بک‌آپ کامل استخراج شد');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.template) localStorage.setItem(STORAGE_KEYS.TEMPLATE, data.template);
        if (data.clients) localStorage.setItem(STORAGE_KEYS.CLIENTS, data.clients);
        if (data.archive) localStorage.setItem(STORAGE_KEYS.ARCHIVE, data.archive);
        if (data.users) localStorage.setItem(STORAGE_KEYS.USERS, data.users);
        if (data.roles) localStorage.setItem(STORAGE_KEYS.ROLES, data.roles);
        showToast('سیستم با موفقیت بازیابی شد. بارگذاری مجدد...');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        showToast('خطا در خواندن فایل پشتیبان');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-12 animate-in fade-in zoom-in-95 h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto no-print">
      <div className="w-48 h-48 bg-white text-blue-600 rounded-[56px] flex items-center justify-center mb-10 shadow-2xl shadow-blue-100 ring-8 ring-white p-10">
        <AsraLogo size={140} />
      </div>
      <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">امنیت داده‌ها</h2>
      <p className="text-slate-500 font-medium text-lg leading-relaxed mb-12">فایل پشتیبان شامل تمام کاربران، نقش‌ها، مشتریان و قالب‌های طراحی شده می‌باشد.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <button onClick={handleExport} className="bg-slate-900 text-white p-8 rounded-[40px] flex flex-col items-center gap-4 hover:scale-105 transition-all shadow-2xl">
          <Download size={32} />
          <span className="font-black text-xl">خروجی کامل سیستم</span>
        </button>
        <label className="bg-blue-600 text-white p-8 rounded-[40px] flex flex-col items-center gap-4 hover:scale-105 transition-all shadow-2xl shadow-blue-200 cursor-pointer">
          <FileJson size={32} />
          <span className="font-black text-xl">بازیابی اطلاعات</span>
          <input type="file" className="hidden" accept=".cflow,.json" onChange={handleImport} />
        </label>
      </div>
    </div>
  );
};

const DesktopSettings = ({ template, setTemplate, activePageNum, activeSubTab, setActiveSubTab, onPageChange }: { template: ContractTemplate, setTemplate: (t: any) => void, activePageNum: number, activeSubTab: 'design' | 'fields', setActiveSubTab: (s: 'design' | 'fields') => void, onPageChange: (p: number) => void }) => {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [newField, setNewField] = useState({ label: '', fontSize: 14, width: 150, alignment: 'R' as TextAlignment });
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePage = template.pages.find(p => p.pageNumber === activePageNum) || template.pages[0];
  const selectedField = activePage.fields.find(f => f.id === selectedFieldId);

  const updatePage = (updates: Partial<ContractPage>) => {
    setTemplate({ ...template, pages: template.pages.map(p => p.pageNumber === activePageNum ? { ...p, ...updates } : p) });
  };
  const handleSaveTemplate = () => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATE, JSON.stringify(template));
    showToast('قالب طراحی در حافظه مرورگر تثبیت شد');
  };
  const updateField = (id: string, updates: Partial<ContractField>) => {
    setTemplate({ ...template, pages: template.pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: p.fields.map(f => f.id === id ? { ...f, ...updates } : f) } : p) });
  };
  const handleAddField = () => {
    if (!newField.label) { showToast('نام المان نمی‌تواند خالی باشد'); return; }
    const id = Date.now().toString();
    const field: ContractField = { id, label: newField.label, key: `f_${id}`, isActive: true, x: 40, y: 40, width: newField.width, height: 30, fontSize: newField.fontSize, rotation: 0, alignment: newField.alignment };
    setTemplate({ ...template, pages: template.pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: [...p.fields, field] } : p) });
    setNewField({ label: '', fontSize: 14, width: 150, alignment: 'R' });
    showToast('المان جدید به بوم اضافه شد');
  };
  const removeField = (id: string) => {
    setTemplate({ ...template, pages: template.pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: p.fields.filter(f => f.id !== id) } : p) });
    showToast('المان حذف شد');
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { updatePage({ bgImage: event.target?.result as string }); showToast('تصویر سربرگ آپلود شد'); };
      reader.readAsDataURL(file);
    }
  };
  const handleDrag = (e: React.MouseEvent, id: string) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setSelectedFieldId(id);
    const onMouseMove = (m: MouseEvent) => {
      const x = ((m.clientX - canvasRect.left) / canvasRect.width) * 100;
      const y = ((m.clientY - canvasRect.top) / canvasRect.height) * 100;
      updateField(id, { x: Math.max(0, Math.min(98, x)), y: Math.max(0, Math.min(98, y)) });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-2xl animate-in fade-in duration-700 no-print">
      <div className="bg-white/90 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between no-print z-10 sticky top-0">
        <div className="flex items-center gap-3">
           <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setActiveSubTab('design')} className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all ${activeSubTab === 'design' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}><Layers size={16} /> بوم</button>
              <button onClick={() => setActiveSubTab('fields')} className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all ${activeSubTab === 'fields' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}><List size={16} /> لایه‌ها</button>
           </div>
           <div className="h-6 w-[1px] bg-slate-200 mx-1" />
           <div className="flex bg-slate-100 p-1 rounded-2xl">
              {[1, 2, 3].map(p => (
                <button key={p} onClick={() => onPageChange(p)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activePageNum === p ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>برگ {p}</button>
              ))}
           </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md"><Upload size={16} /> آپلود سربرگ</button>
          <button onClick={() => { updatePage({ bgImage: undefined }); showToast('تصویر حذف شد'); }} className="bg-white border border-red-100 text-red-500 px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-red-50 transition-all">حذف</button>
          <div className="h-6 w-[1px] bg-slate-200 mx-1" />
          <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => updatePage({ paperSize: PaperSize.A5 })} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activePage.paperSize === PaperSize.A5 ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>A5</button>
              <button onClick={() => updatePage({ paperSize: PaperSize.A4 })} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activePage.paperSize === PaperSize.A4 ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>A4</button>
          </div>
          <button onClick={handleSaveTemplate} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-black shadow-lg shadow-emerald-100 transition-all ml-2"><Save size={16} /> ذخیره قالب</button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-[320px] border-l p-6 overflow-y-auto flex flex-col gap-6 no-print bg-slate-50/20 backdrop-blur-sm z-10 custom-scrollbar">
          {activeSubTab === 'design' ? (
            <>
              <div><h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Layers size={18} className="text-blue-600" /> لیست المان‌ها</h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                  {activePage.fields.map(f => (
                    <div key={f.id} onClick={() => setSelectedFieldId(f.id)} className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border-2 ${selectedFieldId === f.id ? 'bg-white border-blue-500 shadow-md text-blue-700 font-bold scale-[1.01]' : 'bg-white/50 border-transparent hover:bg-white text-slate-500'}`}>
                      <span className="text-xs font-black">{f.label}</span>
                      <div 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            updateField(f.id, { isActive: !f.isActive }); 
                        }} 
                        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${f.isActive ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white'}`}
                      >
                        {f.isActive && <Check size={10} className="text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedField && (
                <div className="bg-blue-50/50 rounded-[28px] p-6 border border-blue-100 animate-in slide-in-from-right-4 duration-500 shadow-inner">
                  <h4 className="text-xs font-black text-blue-900 mb-5 flex items-center gap-2"><Type size={14} /> ویرایش: {selectedField.label}</h4>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="space-y-1"><label className="text-[9px] font-black text-blue-400 block text-center uppercase tracking-widest">سایز</label><input type="number" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })} className="w-full bg-white border-none shadow-sm rounded-xl p-3 text-center font-black text-sm text-blue-700 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-blue-400 block text-center uppercase tracking-widest">عرض</label><input type="number" value={selectedField.width} onChange={e => updateField(selectedField.id, { width: Number(e.target.value) })} className="w-full bg-white border-none shadow-sm rounded-xl p-3 text-center font-black text-sm text-blue-700 outline-none" /></div>
                  </div>
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between items-center px-1"><label className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1"><RotateCw size={10} /> چرخش</label><span className="text-[10px] font-black text-blue-700">{selectedField.rotation}°</span></div>
                    <input type="range" min="0" max="360" value={selectedField.rotation} onChange={e => updateField(selectedField.id, { rotation: Number(e.target.value) })} className="w-full accent-blue-600 h-1.5 bg-blue-100 rounded-full cursor-pointer transition-all" />
                  </div>
                  <div className="grid grid-cols-3 bg-white p-1 rounded-xl shadow-sm border border-blue-100/30">
                    {(['L', 'C', 'R'] as TextAlignment[]).map(a => (
                      <button key={a} onClick={() => updateField(selectedField.id, { alignment: a })} className={`py-2 rounded-lg text-xs font-black transition-all duration-300 ${selectedField.alignment === a ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-blue-600'}`}>{a === 'L' ? <AlignLeft size={14} className="mx-auto" /> : a === 'C' ? <AlignCenter size={14} className="mx-auto" /> : <AlignRight size={14} className="mx-auto" />}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col gap-6">
              <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100">
                <h3 className="text-xs font-black text-blue-900 mb-4 flex items-center gap-2"><PlusCircle size={14} /> تعریف المان</h3>
                <div className="space-y-4">
                  <input type="text" value={newField.label} placeholder="عنوان فیلد..." onChange={e => setNewField({...newField, label: e.target.value})} className="w-full p-3.5 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-xs" />
                  <button onClick={handleAddField} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-blue-100">افزودن به برگه</button>
                </div>
              </div>
              <div className="space-y-3">
                   {activePage.fields.map(f => (
                     <div key={f.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-700 flex-1">{f.label}</span>
                        <div className="flex gap-1">
                           <button onClick={() => updateField(f.id, { isActive: !f.isActive })} className={`p-1.5 rounded transition-all ${f.isActive ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 bg-slate-50'}`}><Check size={14}/></button>
                           <button onClick={() => removeField(f.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 size={14}/></button>
                        </div>
                     </div>
                   ))}
              </div>
            </div>
          )}
          <div className="mt-auto pt-4 border-t border-slate-100">
             <div onClick={() => updatePage({ showBackgroundInPrint: !activePage.showBackgroundInPrint })} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${activePage.showBackgroundInPrint ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-700'}`}>
              <div className="flex flex-col"><span className="text-[10px] font-black">تصویر سربرگ در چاپ</span></div>
              <div className={`w-10 h-5 rounded-full relative transition-all ${activePage.showBackgroundInPrint ? 'bg-white/20' : 'bg-slate-200'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-md ${activePage.showBackgroundInPrint ? 'right-5.5 bg-white' : 'right-0.5 bg-white'}`} /></div>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-slate-200/30 p-8 overflow-auto flex items-start justify-center custom-scrollbar no-print">
          <div ref={canvasRef} className="bg-white shadow-2xl relative border border-slate-200 transition-all origin-top no-print" style={{ width: activePage.paperSize === PaperSize.A4 ? '595px' : '420px', height: activePage.paperSize === PaperSize.A4 ? '842px' : '595px', backgroundImage: activePage.bgImage ? `url(${activePage.bgImage})` : 'none', backgroundSize: '100% 100%' }}>
            {activePage.fields.filter(f => f.isActive).map(f => (
              <div 
                key={f.id} 
                onMouseDown={e => handleDrag(e, f.id)} 
                className={`absolute cursor-move select-none group/field ${selectedFieldId === f.id ? 'z-50' : 'z-10'}`} 
                style={{ 
                  left: `${f.x}%`, 
                  top: `${f.y}%`, 
                  width: `${f.width}px`, 
                  transform: `rotate(${f.rotation}deg)`, 
                  fontSize: `${f.fontSize}px`, 
                  textAlign: f.alignment === 'L' ? 'left' : f.alignment === 'R' ? 'right' : 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: f.alignment === 'L' ? 'flex-start' : f.alignment === 'R' ? 'flex-end' : 'center'
                }}
              >
                <div className={`absolute -inset-2 border-2 rounded-lg transition-all ${selectedFieldId === f.id ? 'border-blue-500 bg-blue-500/5 shadow-md' : 'border-transparent'}`} />
                <span className={`relative font-black tracking-tight w-full leading-tight break-words hyphens-auto ${selectedFieldId === f.id ? 'text-blue-700' : 'text-slate-800 opacity-60'}`} style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                  {f.label}
                </span>
              </div>
            ))}
            {!activePage.bgImage && <div className="absolute inset-0 flex flex-col items-center justify-center opacity-5 grayscale pointer-events-none"><Maximize2 size={60} /><span className="font-black text-xl mt-4">Canvas Ready</span></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPanel = ({ template, setTemplate, userPermissions }: { template: ContractTemplate, setTemplate: (t: any) => void, userPermissions: string[] }) => {
  const [mainTab, setMainTab] = useState<'users' | 'boom' | 'backup'>(() => {
    if (userPermissions.includes('settings_boom')) return 'boom';
    if (userPermissions.includes('settings_users')) return 'users';
    return 'backup';
  });
  const [activeSubTab, setActiveSubTab] = useState<'design' | 'fields'>('design');
  const [activePage, setActivePage] = useState(1);

  return (
    <div className="flex flex-col h-[calc(100vh-40px)] animate-in fade-in duration-500 no-print">
      <div className="flex items-center justify-center gap-4 py-6 bg-white border-b border-slate-100 no-print">
         {userPermissions.includes('settings_users') && (
            <button onClick={() => setMainTab('users')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'users' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><User size={18}/> مدیریت کاربران و نقش‌ها</button>
         )}
         {userPermissions.includes('settings_boom') && (
            <button onClick={() => setMainTab('boom')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'boom' ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Layers size={18}/> مدیریت سربرگ و المان‌ها</button>
         )}
         {userPermissions.includes('settings_backup') && (
            <button onClick={() => setMainTab('backup')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'backup' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Database size={18}/> پشتیبان‌گیری و داده‌ها</button>
         )}
      </div>

      <div className="flex-1 overflow-hidden no-print">
        {mainTab === 'boom' && <div className="h-full"><DesktopSettings template={template} setTemplate={setTemplate} activePageNum={activePage} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} onPageChange={setActivePage} /></div>}
        {mainTab === 'users' && <UsersManager />}
        {mainTab === 'backup' && <BackupManager />}
      </div>
    </div>
  );
};

const ArchivePanel = ({ onEdit, perms }: { onEdit: (contract: any) => void, perms: string[] }) => {
  const [contracts, setContracts] = useState<any[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE) || '[]'));
  
  const handleDelete = (id: string) => {
    if (!perms.includes('archive_delete')) return;
    const nc = contracts.filter(c => c.id !== id);
    setContracts(nc);
    localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(nc));
    showToast('قرارداد از بایگانی حذف شد');
  };

  return (
    <div className="max-w-5xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-700 no-print">
      <div className="flex justify-between items-center mb-10 px-4">
        <div><h2 className="text-3xl font-black text-slate-800 tracking-tight">بایگانی اسناد صادر شده</h2></div>
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 px-6"><Search size={18} className="text-slate-300" /><input type="text" placeholder="جستجوی سریع..." className="outline-none bg-transparent text-sm font-bold w-48" /></div>
      </div>
      {contracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          {contracts.map(contract => (
            <div key={contract.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative">
               {contract.isExtended && (
                 <div className="absolute top-4 left-4 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black z-10">تمدید شده</div>
               )}
               <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black">{contract.clientName[0]}</div>
                  <div className="flex gap-2">
                    {perms.includes('archive_edit') && <button onClick={() => onEdit(contract)} className="text-slate-300 hover:text-amber-500 transition-all p-2 bg-slate-50 rounded-xl"><Pencil size={20}/></button>}
                    {perms.includes('archive_print') && <button onClick={() => { onEdit(contract); setTimeout(() => window.print(), 100); }} className="text-slate-300 hover:text-blue-600 transition-all p-2 bg-slate-50 rounded-xl"><Printer size={20}/></button>}
                    {perms.includes('archive_delete') && <button onClick={() => handleDelete(contract.id)} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-slate-50 rounded-xl"><Trash2 size={20}/></button>}
                  </div>
               </div>
               <h4 className="font-black text-xl text-slate-800 mb-2">{contract.clientName}</h4>
               <p className="text-xs text-slate-400 font-medium mb-6">ثبت شده در: {new Date(contract.timestamp).toLocaleDateString('fa-IR')}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24"><h3 className="text-2xl font-black text-slate-300">هنوز قراردادی ثبت نشده است.</h3></div>
      )}
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  });
  const [activeTab, setActiveTab] = useState('workspace');
  const [editingContract, setEditingContract] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<ContractTemplate>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATE);
    if (saved) return JSON.parse(saved);
    return { id: 'default', pages: [
      { pageNumber: 1, paperSize: PaperSize.A4, fields: INITIAL_FIELDS, showBackgroundInPrint: true },
      { pageNumber: 2, paperSize: PaperSize.A4, fields: [], showBackgroundInPrint: true },
      { pageNumber: 3, paperSize: PaperSize.A4, fields: [], showBackgroundInPrint: true }
    ]};
  });

  const userPermissions = useMemo(() => {
    if (!currentUser) return [];
    const roles = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROLES) || JSON.stringify(INITIAL_ROLES));
    const role = roles.find((r: any) => r.id === currentUser.roleId);
    return role ? role.perms : [];
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && !userPermissions.includes(activeTab)) {
        if (userPermissions.includes('workspace')) setActiveTab('workspace');
        else if (userPermissions.includes('archive')) setActiveTab('archive');
        else if (userPermissions.includes('settings')) setActiveTab('settings');
    }
  }, [userPermissions, activeTab]);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    showToast(`خوش آمدید، ${user.username}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  };

  if (!currentUser) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#FDFDFD] font-sans overflow-hidden select-none" dir="rtl">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userPermissions={userPermissions} 
        onLogout={handleLogout} 
      />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative no-print">
        <div className="flex-1 overflow-auto p-0 md:p-5 custom-scrollbar h-full">
          {activeTab === 'workspace' && <Workspace template={template} editData={editingContract} onEditCancel={() => setEditingContract(null)} perms={userPermissions} formData={formData} setFormData={setFormData} />}
          {activeTab === 'settings' && <SettingsPanel template={template} setTemplate={setTemplate} userPermissions={userPermissions} />}
          {activeTab === 'archive' && <ArchivePanel onEdit={(c) => { setEditingContract(c); setActiveTab('workspace'); }} perms={userPermissions} />}
        </div>
      </main>
      
      {/* PROFESSIONAL PRINT ENGINE (Hidden Layer) */}
      <PrintLayout template={template} formData={formData} />
      
      <Toast />
      <style>{`
        @font-face { font-family: 'Vazirmatn'; font-display: swap; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        
        @media print { 
          body { 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
          } 
          .no-print { display: none !important; }
          #root > div:not(.print-only) { display: none !important; }
          .print-only { 
            display: block !important; 
            width: 100% !important;
            margin: 0 !important;
          }
          @page {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
