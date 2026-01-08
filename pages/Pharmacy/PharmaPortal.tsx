import React, { useState, useRef, useEffect } from 'react';
/* Added missing RotateCw icon to the import list below */
import { Pill, MapPin, Camera, ArrowLeft, Loader2, ShoppingBag, CheckCircle2, Truck, X, Menu, Phone, ChevronRight, Building2, ShieldCheck, Archive, Stethoscope, RefreshCw, RotateCw } from 'lucide-react';
import { PharmaOrder, PharmaInventoryItem, AppMode } from '../../types';
import { getPharmaInventory, createPharmaOrder, getPharmaCompanies } from '../../services/pharmaDb';
import { analyzeAndMatchPrescription } from '../../services/geminiPharma';

const PharmaPortal: React.FC<{ onSwitchMode: (m: AppMode) => void, onOpenAuth: () => void }> = ({ onSwitchMode, onOpenAuth }) => {
  const [language, setLanguage] = useState<'fa' | 'en'>('fa');
  const [province, setProvince] = useState('فراه');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Flow State
  const [step, setStep] = useState<'landing' | 'scanning' | 'quoting' | 'finalizing' | 'success'>('landing');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Scanned Data
  const [scannedDrugs, setScannedDrugs] = useState<any[]>([]);
  const [inventory, setInventory] = useState<PharmaInventoryItem[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  
  // Final Form
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Camera Refs & State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const provinces = ["فراه", "کابل", "هرات", "قندهار", "بلخ", "ننگرهار", "هلمند", "کندز", "غزنی", "پکتیا"];

  useEffect(() => {
    loadBaseData();
  }, []);

  // CRITICAL: Bind camera stream to video element when the scanning UI is rendered
  useEffect(() => {
    if (step === 'scanning' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [step, stream]);

  const loadBaseData = async () => {
    try {
      const [inv, comps] = await Promise.all([getPharmaInventory(), getPharmaCompanies()]);
      setInventory(inv);
      setCompanies(comps);
    } catch (e) {
      console.error("Failed to load inventory for portal", e);
    }
  };

  const startScanning = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(s);
      setStep('scanning'); // Change step AFTER obtaining stream
    } catch (e) {
      alert("خطا در دسترسی به کمره. لطفا اجازه دسترسی به دوربین را صادر کنید.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setStream(null);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    
    stopCamera();
    setIsProcessing(true);
    setStep('quoting');

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "rx.jpg", { type: "image/jpeg" });
      try {
        const res = await analyzeAndMatchPrescription(file, inventory, language);
        if (res && res.quotation) {
          const initialItems = res.quotation.map((q: any) => {
            const availableOptions = inventory.filter(i => i.generic_name.toLowerCase().includes(q.matchedGeneric.toLowerCase()));
            return {
               ...q,
               options: availableOptions.length > 0 ? availableOptions : [{id: 'none', brand_name: q.selectedBrand, price_afn: 0, company_id: 'Unknown'}],
               selectedIndex: 0
            };
          }).map((item: any) => {
             const selected = item.options[0];
             const qtyNum = parseInt(item.qty.replace(/[^0-9]/g, '')) || 1;
             return { ...item, unitPrice: selected.price_afn, totalPrice: selected.price_afn * qtyNum };
          });
          setScannedDrugs(initialItems);
        }
      } catch (e) {
        alert("خطا در تحلیل نسخه توسط هوش مصنوعی");
        setStep('landing');
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleDialScroll = (itemIdx: number, direction: 'up' | 'down') => {
    const updated = [...scannedDrugs];
    const item = updated[itemIdx];
    let newIdx = item.selectedIndex;

    if (direction === 'up') newIdx = Math.max(0, newIdx - 1);
    else newIdx = Math.min(item.options.length - 1, newIdx + 1);

    if (newIdx !== item.selectedIndex) {
      item.selectedIndex = newIdx;
      const selected = item.options[newIdx];
      item.selectedBrand = selected.brand_name;
      item.unitPrice = selected.price_afn;
      const qtyNum = parseInt(item.qty.replace(/[^0-9]/g, '')) || 1;
      item.totalPrice = item.unitPrice * qtyNum;
      setScannedDrugs(updated);
      if (window.navigator.vibrate) window.navigator.vibrate(12);
    }
  };

  const calculateGrandTotal = () => {
    return scannedDrugs.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  };

  const handleFinalSubmit = async () => {
    if (!customerPhone || !customerAddress) {
      alert("لطفاً شماره تماس و آدرس دقیق را وارد کنید.");
      return;
    }
    setIsProcessing(true);
    try {
      await createPharmaOrder({
        customer_name: 'بیمار محترم',
        customer_phone: customerPhone,
        customer_address: customerAddress,
        items: scannedDrugs,
        total_price: calculateGrandTotal(),
        status: 'pending'
      });
      setStep('success');
    } catch (e) {
      alert("خطا در ثبت نهایی سفارش. لطفا اینترنت خود را چک کنید.");
    } finally {
      setIsProcessing(false);
    }
  };

  const DialPicker = ({ item, idx }: { item: any, idx: number }) => {
    const activeCompany = companies.find(c => c.id === item.options[item.selectedIndex]?.company_id);
    return (
      <div className="relative h-32 bg-gray-900 rounded-3xl p-1 overflow-hidden shadow-[inset_0_4px_16px_rgba(0,0,0,0.8)] border border-white/10 group">
         <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-gray-950 via-gray-950/40 to-transparent z-10 pointer-events-none"></div>
         <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent z-10 pointer-events-none"></div>
         
         <div className="flex items-center h-full">
            <div className="flex-1 h-full relative overflow-hidden flex flex-col items-center">
               <div 
                 className="absolute inset-y-0 w-full transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)" 
                 style={{ transform: `translateY(${-item.selectedIndex * 40 + 44}px)` }}
               >
                  {item.options.map((opt: any, oIdx: number) => (
                     <div 
                       key={oIdx} 
                       className={`h-10 flex items-center justify-center transition-all duration-500 ${oIdx === item.selectedIndex ? 'text-white text-xl font-black scale-110' : 'text-gray-600 text-sm opacity-10 blur-[0.5px]'}`}
                     >
                        {opt.brand_name}
                     </div>
                  ))}
               </div>
            </div>

            <div className="flex flex-col gap-1 pr-3 z-20">
               <button onClick={() => handleDialScroll(idx, 'up')} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl active:scale-90 transition-all border border-white/5 shadow-lg"><X className="rotate-45" size={14} /></button>
               <button onClick={() => handleDialScroll(idx, 'down')} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl active:scale-90 transition-all border border-white/5 shadow-lg"><X className="-rotate-135" size={14} /></button>
            </div>
         </div>
         <div className="absolute bottom-2 left-6 right-12 flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em]">
            <span className="text-blue-500">{activeCompany?.name_fa || 'Global Supply'}</span>
            <span className="text-gray-700">Stock: {item.options[item.selectedIndex]?.stock_quantity || '---'}</span>
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans" dir="rtl">
      <header className="p-4 flex justify-between items-center bg-white shadow-sm border-b border-gray-100 sticky top-0 z-[100]">
         <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="p-2.5 bg-gray-50 rounded-xl text-gray-400 active:scale-90 transition-transform"><Menu size={24} /></button>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-200"><Pill size={22}/></div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">دارویار هوشمند</h1>
         </div>
         <div className="flex gap-2">
            <button onClick={() => setLanguage(l => l === 'fa' ? 'en' : 'fa')} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-500">{language}</button>
            <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-black text-blue-600 flex items-center gap-1.5"><MapPin size={12} /> {province}</div>
         </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full">
         {step === 'landing' && (
            <div className="flex flex-col items-center justify-center min-h-[75vh] px-8 text-center animate-fade-in">
               <div className="mb-12 space-y-3">
                  <h2 className="text-4xl font-black text-gray-900 leading-tight">سلام دکتر عزیز،<br/>نسخه را اسکن کنید.</h2>
                  <p className="text-gray-400 font-bold text-sm leading-relaxed max-w-xs mx-auto">هوش مصنوعی دارویار آماده تحلیل و قیمت‌گذاری نسخه‌های شماست.</p>
               </div>

               <button 
                 onClick={startScanning}
                 className="w-64 h-64 bg-white rounded-full shadow-[0_50px_100px_rgba(37,99,235,0.18)] border-[16px] border-blue-50 flex flex-col items-center justify-center gap-4 group active:scale-95 transition-all duration-500 relative"
               >
                  <div className="absolute inset-[-12px] rounded-full border-2 border-dashed border-blue-200 animate-spin-slow opacity-30"></div>
                  <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform">
                     <Camera size={48} />
                  </div>
                  <span className="text-xl font-black text-gray-800">اسکن نسخه پزشک</span>
               </button>

               <div className="mt-20 flex items-center gap-3 text-blue-600 font-black text-[10px] bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 uppercase tracking-widest">
                  <ShieldCheck size={18} />
                  <span>AI Precision Recognition</span>
               </div>
            </div>
         )}

         {step === 'scanning' && (
            <div className="fixed inset-0 z-[150] bg-black flex flex-col overflow-hidden">
               <div className="p-6 text-white flex justify-between items-center absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                     <h3 className="font-black text-lg">در حال واکاوی بصری...</h3>
                  </div>
                  <button onClick={() => { stopCamera(); setStep('landing'); }} className="p-2 bg-white/20 rounded-full hover:bg-red-50 transition-colors"><X /></button>
               </div>
               
               <video ref={videoRef} autoPlay playsInline className="flex-1 object-contain w-full h-full" />
               <canvas ref={canvasRef} className="hidden" />
               
               <div className="p-12 flex justify-center bg-black/90 relative z-20">
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-blue-500 shadow-[0_0_20px_blue] animate-scan-line opacity-60"></div>
                  <button onClick={capturePhoto} className="w-24 h-24 bg-white rounded-full border-[10px] border-gray-800 p-1 active:scale-90 transition-transform shadow-2xl">
                     <div className="w-full h-full rounded-full bg-white shadow-inner border border-gray-100"></div>
                  </button>
               </div>
            </div>
         )}

         {step === 'quoting' && (
            isProcessing ? (
               <div className="flex flex-col items-center justify-center py-48 gap-6">
                  <Loader2 className="animate-spin text-blue-600" size={64} />
                  <p className="text-gray-400 font-black animate-pulse">در حال استخراج اقلام نسخه...</p>
               </div>
            ) : (
               <div className="p-6 space-y-6 animate-slide-up pb-32">
                  <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                     <h3 className="text-lg font-black text-gray-800">اقلام شناسایی شده</h3>
                     <button onClick={() => setStep('landing')} className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 uppercase">Rescan</button>
                  </div>

                  {scannedDrugs.map((drug, idx) => (
                     <div key={idx} className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100 space-y-6 relative group overflow-hidden transition-all hover:border-blue-200">
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600/10 group-hover:bg-blue-600 transition-colors"></div>
                        <div className="flex justify-between items-start">
                           <div>
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Matched Generic</span>
                              <h4 className="text-xl font-black text-gray-800 mt-1">{drug.matchedGeneric}</h4>
                           </div>
                           <div className="text-right">
                              <span className="text-[10px] font-black text-gray-400 uppercase">Quantity</span>
                              <p className="font-black text-lg text-gray-700">{drug.qty}</p>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-tighter flex items-center gap-1.5"><RotateCw size={12}/> Turn the dial to change Brand</label>
                           <DialPicker item={drug} idx={idx} />
                        </div>

                        <div className="flex justify-between items-center pt-5 border-t border-gray-50">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing Policy</span>
                           <div className="text-right">
                              <span className="text-2xl font-black text-gray-900">{drug.totalPrice.toLocaleString()}</span>
                              <span className="text-[10px] font-black text-emerald-600 ml-1.5">AFN</span>
                           </div>
                        </div>
                     </div>
                  ))}

                  <div className="sticky bottom-6 inset-x-0 bg-gray-900 text-white p-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center border border-white/10 z-40">
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimated Total</p>
                        <h4 className="text-3xl font-black text-emerald-400">{calculateGrandTotal().toLocaleString()} <span className="text-sm">AFN</span></h4>
                     </div>
                     <button 
                       onClick={() => setStep('finalizing')}
                       className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 rounded-[1.5rem] font-black shadow-xl flex items-center gap-3 transition-all active:scale-95 shadow-blue-900/40"
                     >
                        تایید نهایی <ArrowLeft size={24} />
                     </button>
                  </div>
               </div>
            )
         )}

         {step === 'finalizing' && (
            <div className="p-8 space-y-10 animate-slide-up">
               <div className="text-center space-y-3">
                  <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-200 rotate-3"><Truck size={40}/></div>
                  <h3 className="text-3xl font-black text-gray-900">اطلاعات تحویل</h3>
                  <p className="text-gray-500 font-bold text-sm leading-relaxed">سفیران دارویار جهت تحویل و دریافت وجه با شما تماس خواهند گرفت.</p>
               </div>

               <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 space-y-6">
                  <div className="space-y-1">
                     <label className="text-xs font-black text-blue-600 mr-2 uppercase tracking-tighter">Contact Number</label>
                     <input dir="ltr" className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-black text-left text-gray-800 text-xl" placeholder="09XX XXX XXXX" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-black text-blue-600 mr-2 uppercase tracking-tighter">Precise Address</label>
                     <textarea className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-gray-800 h-32 resize-none leading-relaxed" placeholder="آدرس دقیق ولایت، شهر، کوچه و پلاک..." value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                  </div>
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setStep('quoting')} className="flex-1 py-5 bg-white text-gray-400 rounded-2xl font-black border border-gray-200 shadow-sm">بازگشت</button>
                  <button onClick={handleFinalSubmit} disabled={isProcessing} className="flex-[3] py-5 bg-gray-900 text-white rounded-[1.5rem] font-black shadow-2xl flex items-center justify-center gap-3 text-lg hover:bg-black transition-all active:scale-95">
                     {isProcessing ? <Loader2 className="animate-spin" /> : <><ShoppingBag size={24} /> ارسال سفارش</>}
                  </button>
               </div>
            </div>
         )}

         {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-32 px-6 text-center animate-bounce-in">
               <div className="w-44 h-44 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-50"><CheckCircle2 size={96} className="animate-pulse" /></div>
               <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">سفارش با موفقیت ثبت شد</h2>
               <p className="text-gray-500 font-bold mb-12 max-w-sm leading-relaxed">فاکتور شما در صف بررسی مدیریت قرار گرفت. سفیران ما بزودی با شما تماس می‌گیرند.</p>
               <button onClick={() => { setStep('landing'); setScannedDrugs([]); }} className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95"><RefreshCw size={24}/> ثبت نسخه جدید</button>
            </div>
         )}
      </main>

      {/* Hamburger Menu */}
      {isMenuOpen && (
         <div className="fixed inset-0 z-[200] bg-gray-900/98 backdrop-blur-2xl animate-fade-in flex flex-col font-sans" dir="rtl">
            <div className="p-6 flex justify-between items-center border-b border-white/5">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Pill /></div>
                  <span className="text-xl font-black text-white">منوی سیستم</span>
               </div>
               <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-white/5 text-gray-400 rounded-2xl hover:text-white transition-colors"><X size={28}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-10">
               <section>
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-5 mr-2">Core Management</h4>
                  <div className="grid grid-cols-1 gap-4">
                     <button onClick={() => { onSwitchMode(AppMode.ADMIN); setIsMenuOpen(false); }} className="w-full p-6 bg-white/5 rounded-[2rem] flex items-center justify-between group hover:bg-white/10 transition-all border border-white/5 shadow-inner">
                        <div className="flex items-center gap-5">
                           <div className="p-4 bg-blue-500/20 text-blue-400 rounded-2xl"><Archive size={28}/></div>
                           <div className="text-right">
                              <p className="font-black text-white text-lg">مدیریت انبار و موجودی</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase">Pharmacy Inventory</p>
                           </div>
                        </div>
                        <ChevronRight size={24} className="text-gray-700 group-hover:text-blue-400" />
                     </button>
                     <button onClick={() => { onSwitchMode(AppMode.LOGISTICS); setIsMenuOpen(false); }} className="w-full p-6 bg-white/5 rounded-[2rem] flex items-center justify-between group hover:bg-white/10 transition-all border border-white/5 shadow-inner">
                        <div className="flex items-center gap-5">
                           <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl"><Truck size={28}/></div>
                           <div className="text-right">
                              <p className="font-black text-white text-lg">پنل سفیران (لجستیک)</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase">Fleet Logistics</p>
                           </div>
                        </div>
                        <ChevronRight size={24} className="text-gray-700 group-hover:text-emerald-400" />
                     </button>
                  </div>
               </section>

               <section>
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-5 mr-2">Specialist Portal</h4>
                  <button onClick={() => { onOpenAuth(); setIsMenuOpen(false); }} className="w-full p-8 bg-gradient-to-br from-indigo-600 to-blue-800 rounded-[2.5rem] shadow-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md shadow-lg"><Stethoscope size={36}/></div>
                        <div className="text-right">
                           <p className="text-2xl font-black text-white">ورود متخصصین</p>
                           <p className="text-xs text-white/50 font-bold uppercase">Clinical Board Access</p>
                        </div>
                     </div>
                     <ArrowLeft size={24} className="text-white/40 group-hover:text-white transition-all -translate-x-2" />
                  </button>
               </section>
            </div>

            <div className="p-8 border-t border-white/5 text-center">
               <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em]">Daroyar Engine v4.2 Stable</p>
            </div>
         </div>
      )}
    </div>
  );
};

export default PharmaPortal;