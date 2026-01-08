
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientIntake from './pages/PatientIntake';
import Diagnosis from './pages/Diagnosis';
import Laboratory from './pages/Laboratory';
import Radiology from './pages/Radiology';
import PhysicalExam from './pages/PhysicalExam';
import Cardiology from './pages/Cardiology';
import Neurology from './pages/Neurology';
import Psychology from './pages/Psychology';
import Ophthalmology from './pages/Ophthalmology';
import Pediatrics from './pages/Pediatrics';
import Orthopedics from './pages/Orthopedics';
import Dentistry from './pages/Dentistry';
import Gynecology from './pages/Gynecology';
import Pulmonology from './pages/Pulmonology';
import Gastroenterology from './pages/Gastroenterology';
import Urology from './pages/Urology';
import Hematology from './pages/Hematology';
import Emergency from './pages/Emergency';
import Genetics from './pages/Genetics';
import Prescription from './pages/Prescription';
import Settings from './pages/Settings';
import AuthPage from './components/AuthPage';
import PharmaPortal from './pages/Pharmacy/PharmaPortal';
import PharmaAdmin from './pages/Pharmacy/PharmaAdmin';
import PharmaDelivery from './pages/Pharmacy/PharmaDelivery';
import { AppRoute, PatientRecord, AppMode } from './types';
import { supabase } from './services/supabase';
import { getAuthMetadata, saveAuthMetadata, clearAuthMetadata, isAuthHardLocked, getSessionAge, setAuthHardLock, getSettings, exportDatabase, uploadBackupOnline, updateLastBackupTime, getLastBackupTime, isDatabaseEmpty, getOnlineBackupMetadata, fetchOnlineBackup, importDatabase, savePendingBackup, getPendingBackup, clearPendingBackup } from './services/db';
import { Loader2, LogOut, Clock, ShieldCheck, ShieldAlert, AlertTriangle, Smartphone, Database, CloudDownload, RefreshCw, X, History, Sparkles } from 'lucide-react';

function App() {
  const [appMode, setAppMode] = useState<AppMode>(AppMode.PHARMACY); // Default to Drug Application
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [currentRecord, setCurrentRecord] = useState<PatientRecord | null>(null);
  
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true); 
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [securityStatus, setSecurityStatus] = useState<'idle' | 'syncing' | 'verified' | 'offline'>('idle');
  const [conflictDetected, setConflictDetected] = useState(false);
  const [showSpecialistLogin, setShowSpecialistLogin] = useState(false);

  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [onlineBackupDate, setOnlineBackupDate] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const isVerifyingRef = useRef(false);
  const localSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleOnlineSync = () => {
       if (session?.user?.id) {
          flushPendingBackup(session.user.id);
       }
    };
    window.addEventListener('online', handleOnlineSync);
    return () => window.removeEventListener('online', handleOnlineSync);
  }, [session]);

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthHardLocked()) {
        setAuthLoading(false);
        setIsApproved(null);
        return;
      }

      const localData = await getAuthMetadata();
      localSessionIdRef.current = localData.sessionId;
      
      if (localData.sessionId && localData.isApproved === true) {
         setIsApproved(true);
         setSession({ user: { id: 'local_user' } });
         // We stay in Pharmacy mode by default even if auth exists, unless routed otherwise
         setAuthLoading(false); 
         if (!navigator.onLine) setSecurityStatus('offline');
      }

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          await verifySecurityOnce(currentSession.user.id, true);
          setupRealtimeSecurity(currentSession.user.id);
          handleAutoBackup(currentSession.user.id);
          checkDatabaseMigration(currentSession.user.id);
        }
      } catch (e) {
        console.warn("Auth initialization silent failure.");
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession) {
         setSession(newSession);
         verifySecurityOnce(newSession.user.id, false);
         setupRealtimeSecurity(newSession.user.id);
         handleAutoBackup(newSession.user.id);
         checkDatabaseMigration(newSession.user.id);
         setAppMode(AppMode.DOCTOR); // Auto-switch on login
         setShowSpecialistLogin(false);
      } else if (!newSession && !localSessionIdRef.current) {
         setAuthLoading(false);
         setIsApproved(null);
         setConflictDetected(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkDatabaseMigration = async (userId: string) => {
     try {
        const isEmpty = await isDatabaseEmpty();
        if (isEmpty && navigator.onLine) {
           const { updatedAt } = await getOnlineBackupMetadata(userId);
           if (updatedAt) {
              setOnlineBackupDate(updatedAt);
              setShowRestorePrompt(true);
           }
        }
     } catch (e) {
        console.warn("Migration check skipped.", e);
     }
  };

  const handleConfirmRestore = async () => {
     if (!session?.user?.id) return;
     setRestoreLoading(true);
     try {
        const json = await fetchOnlineBackup(session.user.id);
        if (json) {
           await importDatabase(json);
           setShowRestorePrompt(false);
           window.location.reload();
        }
     } catch (e) {
        alert("خطا در بازیابی اطلاعات ابری.");
     } finally {
        setRestoreLoading(false);
     }
  };

  const flushPendingBackup = async (userId: string) => {
     const pending = getPendingBackup();
     if (pending && navigator.onLine) {
        try {
           await uploadBackupOnline(userId, pending);
           clearPendingBackup();
        } catch (e) {
           console.warn("Flush pending backup failed.");
        }
     }
  };

  const handleAutoBackup = async (userId: string) => {
    try {
      const settings = await getSettings();
      if (!settings?.autoBackupEnabled) return;

      const lastBackup = getLastBackupTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (now - lastBackup >= twentyFourHours) {
        const json = await exportDatabase();
        if (navigator.onLine) {
          try {
            await uploadBackupOnline(userId, json);
            updateLastBackupTime();
          } catch (e) {
            savePendingBackup(json);
          }
        } else {
          savePendingBackup(json);
        }
      }
    } catch (error) {
      console.error("Auto Backup Engine Error:", error);
    }
  };

  const setupRealtimeSecurity = (userId: string) => {
    if (!navigator.onLine) return;
    const channel = supabase
      .channel(`profile_changes_${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const remoteId = payload.new.active_session_id;
          const localId = localSessionIdRef.current;
          if (remoteId && localId && remoteId !== localId) {
             const age = getSessionAge();
             if (age > 8000) setConflictDetected(true);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const verifySecurityOnce = async (userId: string, silent: boolean = false) => {
    if (isVerifyingRef.current || !navigator.onLine) return;
    if (!silent) setSecurityStatus('syncing');
    isVerifyingRef.current = true;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_approved, active_session_id')
        .eq('id', userId)
        .single();
      if (data) {
          setIsApproved(data.is_approved);
          const remoteId = data.active_session_id || null;
          const localId = localSessionIdRef.current;
          await saveAuthMetadata({ isApproved: data.is_approved, sessionId: remoteId });
          localSessionIdRef.current = remoteId;
          const age = getSessionAge();
          if (remoteId && localId && remoteId !== localId && age > 8000) setConflictDetected(true);
          setSecurityStatus('verified');
          setTimeout(() => setSecurityStatus('idle'), 3000);
      }
    } catch (e) {
      setSecurityStatus('offline');
      setTimeout(() => setSecurityStatus('idle'), 3000);
    } finally {
      setAuthLoading(false);
      isVerifyingRef.current = false;
    }
  };

  const handleSignOutForced = async () => {
    setAuthLoading(true);
    setConflictDetected(false);
    setIsApproved(null);
    setSession(null);
    setAppMode(AppMode.PHARMACY);
    setAuthHardLock(true);
    try {
       await clearAuthMetadata();
       await supabase.auth.signOut();
    } catch (e) {
       console.error("Signout error", e);
    }
    window.location.reload();
  };

  const handleNavigate = (route: AppRoute, record?: PatientRecord) => {
    if (record) setCurrentRecord(record);
    setCurrentRoute(route);
    setAppMode(AppMode.DOCTOR);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
           <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-50 rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
           </div>
           <p className="text-gray-400 text-sm font-black animate-pulse uppercase tracking-widest">Waking Up...</p>
        </div>
      </div>
    );
  }

  if (appMode === AppMode.PHARMACY) {
     return <PharmaPortal onSwitchMode={setAppMode} onOpenAuth={() => setShowSpecialistLogin(true)} />;
  }

  if (appMode === AppMode.ADMIN) {
     return <PharmaAdmin onBack={() => setAppMode(AppMode.PHARMACY)} />;
  }

  if (appMode === AppMode.LOGISTICS) {
     return <PharmaDelivery onBack={() => setAppMode(AppMode.PHARMACY)} />;
  }

  if (showSpecialistLogin && !session) {
    return (
       <div className="relative min-h-screen">
          <button onClick={() => setShowSpecialistLogin(false)} className="fixed top-6 right-6 z-[110] p-4 bg-white rounded-full shadow-xl text-gray-500 hover:text-red-500 transition-all"><X /></button>
          <AuthPage onAuthSuccess={() => { setAppMode(AppMode.DOCTOR); setShowSpecialistLogin(false); }} />
       </div>
    );
  }

  if (conflictDetected) {
    return (
      <div className="fixed inset-0 z-[1000] bg-gray-900/95 backdrop-blur-xl flex items-center justify-center p-4 font-sans text-right" dir="rtl">
         <div className="bg-white max-w-md w-full rounded-[2.5rem] shadow-2xl p-10 text-center border-t-8 border-red-600 animate-bounce-in">
            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 relative">
               <AlertTriangle size={56} className="animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-gray-800 mb-4 tracking-tight">تداخل نشست فعال</h2>
            <p className="text-gray-500 leading-relaxed mb-10 font-medium">دکتر عزیز، حساب شما هم‌زمان در دستگاه دیگری باز گردید.</p>
            <button onClick={handleSignOutForced} className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 text-lg group"><LogOut size={24} /> خروج و تایید امنیت</button>
         </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.DASHBOARD: return <Dashboard onNavigate={handleNavigate} />;
      case AppRoute.INTAKE: return <PatientIntake onSubmit={(r) => { setCurrentRecord(r); setCurrentRoute(AppRoute.DIAGNOSIS); }} />;
      case AppRoute.DIAGNOSIS: return <Diagnosis patientRecord={currentRecord} onNavigate={handleNavigate} />;
      case AppRoute.PRESCRIPTION: return <Prescription initialRecord={currentRecord} />;
      case AppRoute.SETTINGS: return <Settings />;
      case AppRoute.LABORATORY: return <Laboratory />;
      case AppRoute.RADIOLOGY: return <Radiology />;
      case AppRoute.PHYSICAL_EXAM: return <PhysicalExam />;
      case AppRoute.CARDIOLOGY: return <Cardiology />;
      case AppRoute.NEUROLOGY: return <Neurology />;
      case AppRoute.PSYCHOLOGY: return <Psychology />;
      case AppRoute.OPHTHALMOLOGY: return <Ophthalmology />;
      case AppRoute.PEDIATRICS: return <Pediatrics />;
      case AppRoute.ORTHOPEDICS: return <Orthopedics />;
      case AppRoute.DENTISTRY: return <Dentistry />;
      case AppRoute.GYNECOLOGY: return <Gynecology />;
      case AppRoute.PULMONOLOGY: return <Pulmonology />;
      case AppRoute.GASTROENTEROLOGY: return <Gastroenterology />;
      case AppRoute.UROLOGY: return <Urology />;
      case AppRoute.HEMATOLOGY: return <Hematology />;
      case AppRoute.EMERGENCY: return <Emergency />;
      case AppRoute.GENETICS: return <Genetics />;
      default: return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <div className="fixed top-2.5 lg:top-4 left-1/2 -translate-x-1/2 lg:left-10 lg:translate-x-0 z-[100] pointer-events-none transition-all duration-500">
        {securityStatus === 'syncing' && (
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-blue-100 animate-slide-down">
             <Loader2 size={14} className="text-blue-500 animate-spin" />
             <span className="text-[11px] font-black text-blue-700">به‌روزرسانی امنیت...</span>
          </div>
        )}
      </div>

      <Layout 
        currentRoute={currentRoute} 
        onNavigate={handleNavigate} 
        appMode={appMode} 
        onSwitchMode={setAppMode}
        onOpenAuth={() => setShowSpecialistLogin(true)}
      >
        {renderContent()}
      </Layout>
    </>
  );
}

export default App;
