
import React, { useState, useEffect, useRef } from 'react';
/* Added missing ChevronRight and ArrowLeft icons to the import list below */
import { Activity, Beaker, Stethoscope, Menu, X, User, ScanEye, Eye, Archive, HeartPulse, BrainCircuit, Sparkles, Glasses, Baby, Bone, Smile, Flower, Wind, Utensils, Droplets, Droplet, Ambulance, Dna, FileSignature, Settings as SettingsIcon, Wifi, WifiOff, Shield, Key, BarChart3, Lock, AlertTriangle, Download, FolderOpen, UserPlus, Grid, LogOut, Loader2, CheckCircle2, Pill, Truck, LayoutDashboard, ChevronRight, ArrowLeft } from 'lucide-react';
import { AppRoute, AppMode } from '../types';
import { supabase } from '../services/supabase';
import { clearAuthMetadata, setAuthHardLock } from '../services/db';

interface LayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  appMode: AppMode;
  onSwitchMode: (mode: AppMode) => void;
  onOpenAuth: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentRoute, onNavigate, appMode, onSwitchMode, onOpenAuth, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutStage, setLogoutStage] = useState<'idle' | 'clearing' | 'success'>('idle');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    setLogoutStage('clearing');
    try {
      setAuthHardLock(true);
      await clearAuthMetadata();
      await supabase.auth.signOut();
      setLogoutStage('success');
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (error) {
      window.location.reload();
    }
  };

  const NavItem = ({ route, icon: Icon, label, onClick }: { route?: AppRoute; icon: any; label: string, onClick?: () => void }) => {
    const isActive = currentRoute === route;
    return (
      <button
        onClick={() => {
          if (onClick) onClick();
          else if (route) {
             onNavigate(route);
             setIsSidebarOpen(false);
             setIsMoreMenuOpen(false);
             setIsMobileMenuOpen(false);
          }
        }}
        className={`flex items-center w-full p-4 space-x-3 space-x-reverse rounded-xl transition-all duration-200 ${
          isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
        }`}
      >
        <Icon size={24} />
        <span className="font-medium text-lg">{label}</span>
      </button>
    );
  };

  const MobileMenuOverlay = () => (
    <div className="fixed inset-0 z-[200] bg-gray-900/95 backdrop-blur-xl animate-fade-in flex flex-col font-sans" dir="rtl">
       <div className="p-6 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Pill /></div>
             <span className="text-xl font-black text-white">منوی سیستم</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-3 bg-white/5 text-gray-400 rounded-2xl hover:text-white"><X size={28}/></button>
       </div>
       
       <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Admin/Logistics Section */}
          <section>
             <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">مدیریت داروخانه</h4>
             <div className="grid grid-cols-1 gap-3">
                <button onClick={() => { onSwitchMode(AppMode.ADMIN); setIsMobileMenuOpen(false); }} className="w-full p-5 bg-white/5 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all border border-white/5">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl"><Archive size={24}/></div>
                      <div className="text-right">
                         <p className="font-black text-white">مدیریت انبار</p>
                         <p className="text-[10px] text-gray-500 font-bold">Inventory Control</p>
                      </div>
                   </div>
                   {/* Fix for Error line 97: ChevronRight is now defined via import */}
                   <ChevronRight size={20} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                </button>
                <button onClick={() => { onSwitchMode(AppMode.LOGISTICS); setIsMobileMenuOpen(false); }} className="w-full p-5 bg-white/5 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all border border-white/5">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl"><Truck size={24}/></div>
                      <div className="text-right">
                         <p className="font-black text-white">پنل لجستیک</p>
                         <p className="text-[10px] text-gray-500 font-bold">Fleet Management</p>
                      </div>
                   </div>
                   {/* Fix for Error line 107: ChevronRight is now defined via import */}
                   <ChevronRight size={20} className="text-gray-600 group-hover:text-emerald-400 transition-colors" />
                </button>
             </div>
          </section>

          {/* Specialist Section */}
          <section>
             <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">بخش تخصصی پزشکان</h4>
             <button onClick={() => { onOpenAuth(); setIsMobileMenuOpen(false); }} className="w-full p-6 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] shadow-xl flex items-center justify-between group active:scale-[0.98] transition-all">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white"><Stethoscope size={32}/></div>
                   <div className="text-right">
                      <p className="text-xl font-black text-white">ورود متخصصین</p>
                      <p className="text-xs text-white/50 font-bold">Specialist Dashboard</p>
                   </div>
                </div>
                {/* Fix for Error line 123: ArrowLeft is now defined via import */}
                <ArrowLeft size={24} className="text-white/40 group-hover:text-white transition-all -translate-x-2" />
             </button>
          </section>

          {/* System Settings */}
          <section>
             <button onClick={() => { onNavigate(AppRoute.SETTINGS); setIsMobileMenuOpen(false); }} className="w-full p-5 bg-white/5 rounded-3xl flex items-center gap-4 text-gray-400 hover:text-white transition-all border border-white/5">
                <SettingsIcon size={20} />
                <span className="font-bold">تنظیمات سیستمی</span>
             </button>
          </section>
       </div>

       <div className="p-8 border-t border-white/5 text-center">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Smart Medical Suite v3.1</p>
       </div>
    </div>
  );

  const BottomNavItem = ({ route, icon: Icon, label, isActive, onClick }: { route?: AppRoute, icon: any, label: string, isActive?: boolean, onClick?: () => void }) => (
    <button onClick={() => onClick ? onClick() : (route && onNavigate(route))} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-300 ${isActive ? 'text-blue-600 -translate-y-2' : 'text-gray-400'}`}>
      <div className={`p-2 rounded-full transition-all ${isActive ? 'bg-blue-100 shadow-md' : 'bg-transparent'}`}><Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} /></div>
      <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {isLoggingOut && (
        <div className="fixed inset-0 z-[1001] bg-white flex flex-col items-center justify-center animate-fade-in">
           {logoutStage === 'clearing' ? (
             <div className="flex flex-col items-center gap-6 animate-slide-up"><div className="relative"><div className="w-24 h-24 border-4 border-blue-50 rounded-full animate-pulse"></div><div className="absolute inset-0 flex items-center justify-center"><Loader2 size={48} className="text-blue-600 animate-spin" /></div></div><div className="text-center space-y-2"><h3 className="text-2xl font-bold text-gray-800">ابطال دسترسی‌ها...</h3></div></div>
           ) : (
             <div className="flex flex-col items-center gap-6 animate-bounce-in"><div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg"><CheckCircle2 size={56} /></div><div className="text-center space-y-2"><h3 className="text-2xl font-bold text-gray-800">خروج با موفقیت</h3></div></div>
           )}
        </div>
      )}

      <aside className={`hidden lg:flex fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl flex-col`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center cursor-pointer select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white relative overflow-hidden"><Activity className="animate-pulse" /></div>
            <h1 className="text-2xl font-bold text-gray-800">میز کار دکتر</h1>
          </div>
        </div>
        <nav className="p-4 space-y-2 mt-2 overflow-y-auto flex-1 custom-scrollbar">
          <NavItem route={AppRoute.PRESCRIPTION} icon={FileSignature} label="نسخه‌نویسی" />
          <NavItem route={AppRoute.INTAKE} icon={User} label="مشاوره هوشمند" />
          <NavItem route={AppRoute.DIAGNOSIS} icon={Stethoscope} label="اتاق تشخیص" />
          <NavItem route={AppRoute.DASHBOARD} icon={Archive} label="بایگانی" />
          <div className="border-t my-4 border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400 px-4 mb-2">دپارتمان‌های تخصصی</p>
            <NavItem route={AppRoute.EMERGENCY} icon={Ambulance} label="اورژانس" /><NavItem route={AppRoute.CARDIOLOGY} icon={HeartPulse} label="قلب" /><NavItem route={AppRoute.NEUROLOGY} icon={BrainCircuit} label="مغز" />
          </div>
          <NavItem route={AppRoute.SETTINGS} icon={SettingsIcon} label="تنظیمات" />
          <button onClick={() => onSwitchMode(AppMode.PHARMACY)} className="flex items-center w-full p-4 space-x-3 space-x-reverse rounded-xl transition-all duration-200 text-teal-600 hover:bg-teal-50"><Pill size={24} /><span className="font-medium text-lg">بازگشت به داروخانه</span></button>
        </nav>
        <div className="p-6 bg-blue-50 border-t border-blue-100 flex justify-between items-center">
          <button onClick={handleSignOut} className="p-2.5 bg-white text-red-500 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"><LogOut size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative lg:mr-72 transition-all duration-300">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:hidden fixed top-0 left-0 right-0 z-40 shadow-sm">
          <div className="flex items-center gap-2">
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-gray-50 rounded-xl text-gray-600"><Menu size={24} /></button>
             <span className="font-black text-lg text-gray-800 tracking-tight">طبیب هوشمند</span>
          </div>
          <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
             {appMode === AppMode.PHARMACY && <Pill className="text-blue-600" size={20} />}
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto pt-20 pb-28 lg:pt-8 lg:pb-8 p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">{children}</div>
        </div>

        {isMobileMenuOpen && <MobileMenuOverlay />}

        {appMode === AppMode.DOCTOR && (
           <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-end pb-safe px-2 py-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-2xl">
              <BottomNavItem route={AppRoute.DASHBOARD} icon={FolderOpen} label="بایگانی" isActive={currentRoute === AppRoute.DASHBOARD} />
              <BottomNavItem route={AppRoute.PRESCRIPTION} icon={FileSignature} label="میز کار" isActive={currentRoute === AppRoute.PRESCRIPTION} />
              <BottomNavItem route={AppRoute.DIAGNOSIS} icon={Activity} label="تشخیص" isActive={currentRoute === AppRoute.DIAGNOSIS} />
              <BottomNavItem icon={Grid} label="دپارتمان" isActive={isMoreMenuOpen} onClick={() => setIsMoreMenuOpen(true)} />
           </nav>
        )}

        {isMoreMenuOpen && (
           <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMoreMenuOpen(false)}></div>
              <div className="bg-white rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 max-h-[85vh] overflow-y-auto animate-slide-up">
                 <div className="grid grid-cols-3 gap-3 mb-8">
                    {[
                      { r: AppRoute.EMERGENCY, i: Ambulance, l: 'اورژانس', c: 'bg-red-50 text-red-600' },
                      { r: AppRoute.CARDIOLOGY, i: HeartPulse, l: 'قلب', c: 'bg-rose-50 text-rose-600' },
                      { r: AppRoute.PEDIATRICS, i: Baby, l: 'کودکان', c: 'bg-pink-50 text-pink-600' },
                      { r: AppRoute.GYNECOLOGY, i: Flower, l: 'زنان', c: 'bg-purple-50 text-purple-600' },
                      { r: AppRoute.NEUROLOGY, i: BrainCircuit, l: 'مغز', c: 'bg-violet-50 text-violet-600' },
                    ].map(item => (
                       <button key={item.l} onClick={() => { onNavigate(item.r); setIsMoreMenuOpen(false); }} className={`${item.c} p-4 rounded-2xl flex flex-col items-center gap-2`}><item.i size={24} /><span className="text-xs font-bold">{item.l}</span></button>
                    ))}
                 </div>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default Layout;
