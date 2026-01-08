
import React, { useState, useEffect } from 'react';
import { Building2, Package, Plus, Trash2, Save, Star, ChevronLeft, Search, TrendingUp, Loader2, X, Globe, AlertTriangle, RefreshCw } from 'lucide-react';
import { getPharmaCompanies, savePharmaCompany, deletePharmaCompany, getPharmaInventory, saveInventoryItem, deleteInventoryItem } from '../../services/pharmaDb';
import { PharmaCompany, PharmaInventoryItem } from '../../types';

const PharmaAdmin: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<'inventory' | 'companies'>('inventory');
  const [companies, setCompanies] = useState<PharmaCompany[]>([]);
  const [inventory, setInventory] = useState<PharmaInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name_fa: '', name_en: '', country: '', quality_rating: 3 });

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ generic_name: '', brand_name: '', company_id: '', price_afn: '', ai_priority_score: '5', stock_quantity: '100' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [c, i] = await Promise.all([getPharmaCompanies(), getPharmaInventory()]);
      setCompanies(c);
      setInventory(i);
    } catch (e: any) {
      console.error("Fetch failed", e);
      setErrorMsg(e.message || "خطا در برقراری ارتباط با دیتابیس");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompany.name_fa || !newCompany.name_en) {
       alert("دکتر عزیز، لطفا نام فارسی و انگلیسی کمپانی را وارد کنید.");
       return;
    }
    setLoading(true);
    try {
      await savePharmaCompany({
        id: crypto.randomUUID(),
        name_fa: newCompany.name_fa.trim(),
        name_en: newCompany.name_en.trim(),
        country: newCompany.country.trim() || 'Afghanistan',
        quality_rating: newCompany.quality_rating
      });
      setShowAddCompany(false);
      setNewCompany({ name_fa: '', name_en: '', country: '', quality_rating: 3 });
      await fetchData();
    } catch (e: any) {
      console.error("Company Save Error", e);
      alert(`خطا در ثبت: ${e.message}. مطمئن شوید دیتابیس آزاد شده است.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.generic_name || !newItem.brand_name || !newItem.company_id) {
       alert("لطفاً تمام فیلدها بخصوص کمپانی سازنده را تکمیل کنید.");
       return;
    }
    setLoading(true);
    try {
      const drugPayload = {
        id: crypto.randomUUID(),
        generic_name: newItem.generic_name.trim(),
        brand_name: newItem.brand_name.trim(),
        company_id: newItem.company_id,
        price_afn: Math.max(0, parseInt(newItem.price_afn) || 0),
        ai_priority_score: Math.min(10, Math.max(0, parseInt(newItem.ai_priority_score) || 5)),
        stock_quantity: Math.max(0, parseInt(newItem.stock_quantity) || 0)
      };
      
      await saveInventoryItem(drugPayload);
      setShowAddItem(false);
      setNewItem({ generic_name: '', brand_name: '', company_id: '', price_afn: '', ai_priority_score: '5', stock_quantity: '100' });
      await fetchData();
    } catch (e: any) { 
      console.error("Inventory Save Error", e);
      alert(`خطا: ${e.message}`); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDeleteItem = async (id: string) => {
    if(!confirm("آیا از حذف این دارو اطمینان دارید؟")) return;
    setLoading(true);
    try {
      await deleteInventoryItem(id);
      await fetchData();
    } catch (e) { alert("خطا در حذف"); } finally { setLoading(false); }
  };

  const handleDeleteCompany = async (id: string) => {
    if(!confirm("حذف کمپانی باعث می‌شود داروهای مرتبط با آن بدون برند شوند. ادامه می‌دهید؟")) return;
    setLoading(true);
    try {
      await deletePharmaCompany(id);
      await fetchData();
    } catch (e) { alert("خطا در حذف کمپانی"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans" dir="rtl">
      <header className="bg-gray-900 text-white p-6 sticky top-0 z-50 shadow-2xl">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-black tracking-tight">مدیریت مرکزی داروخانه</h2>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setTab('inventory')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${tab === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'}`}>لیست داروها</button>
             <button onClick={() => setTab('companies')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${tab === 'companies' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'}`}>کمپانی‌ها</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {loading && !companies.length && !inventory.length ? (
           <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 size={48} className="text-blue-600 animate-spin" />
              <p className="text-gray-400 font-black">در حال همگام‌سازی با سرور...</p>
           </div>
        ) : errorMsg ? (
           <div className="bg-red-50 border border-red-100 p-10 rounded-[2.5rem] text-center max-w-lg mx-auto animate-bounce-in">
              <AlertTriangle size={64} className="text-red-500 mx-auto mb-6" />
              <h3 className="text-xl font-black text-red-900 mb-2">اختلال در دسترسی</h3>
              <p className="text-red-700 text-sm mb-8 font-bold">{errorMsg}</p>
              <button onClick={fetchData} className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black flex items-center justify-center gap-2 mx-auto"><RefreshCw size={20}/> تلاش مجدد</button>
           </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                   <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                   <input className="w-full p-4 pr-12 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-blue-50 font-bold" placeholder="جستجو در لیست..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button onClick={() => tab === 'inventory' ? setShowAddItem(true) : setShowAddCompany(true)} className="bg-gray-900 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl hover:bg-black transition-all active:scale-95 flex items-center gap-2">
                  <Plus size={24} />
                  {tab === 'inventory' ? 'افزودن دارو' : 'ثبت کمپانی جدید'}
                </button>
             </div>

             {tab === 'inventory' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-slide-up">
                   <table className="w-full text-right">
                      <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         <tr><th className="p-6">نام ژنریک</th><th className="p-6">برند / کمپانی</th><th className="p-6">قیمت (AFN)</th><th className="p-6">موجودی</th><th className="p-6 text-center">عملیات</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {inventory.filter(i => i.generic_name.toLowerCase().includes(search.toLowerCase()) || i.brand_name.toLowerCase().includes(search.toLowerCase())).map(item => (
                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                               <td className="p-6 font-black text-gray-800 text-lg">{item.generic_name}</td>
                               <td className="p-6">
                                  <div className="flex flex-col"><span className="font-bold text-blue-600">{item.brand_name}</span><span className="text-[10px] text-gray-400 font-bold">{companies.find(c => c.id === item.company_id)?.name_fa || '---'}</span></div>
                               </td>
                               <td className="p-6">
                                  <div className="flex items-center gap-2">
                                     <span className="text-xl font-black text-gray-900">{item.price_afn.toLocaleString()}</span>
                                     <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">AFN</span>
                                  </div>
                               </td>
                               <td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black ${item.stock_quantity > 10 ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600'}`}>{item.stock_quantity} واحد</span></td>
                               <td className="p-6 text-center"><button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={20} /></button></td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             )}

             {tab === 'companies' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                   {companies.filter(c => c.name_fa.includes(search) || c.name_en.toLowerCase().includes(search.toLowerCase())).map(c => (
                      <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-lg relative overflow-hidden group hover:shadow-2xl transition-all">
                         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Building2 size={80} /></div>
                         <div className="flex justify-between items-start mb-6">
                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center font-black text-2xl uppercase shadow-inner">{c.name_en.charAt(0)}</div>
                            <div className="flex gap-0.5 text-amber-400">
                               {[...Array(5)].map((_, i) => <Star key={i} size={16} fill={i < c.quality_rating ? "currentColor" : "none"} />)}
                            </div>
                         </div>
                         <h3 className="text-2xl font-black text-gray-800">{c.name_fa}</h3>
                         <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tight">{c.name_en} &bull; {c.country}</p>
                         <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Quality: {c.quality_rating}/5</span>
                            <button onClick={() => handleDeleteCompany(c.id)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        )}
      </main>

      {/* MODALS: ADD ITEM */}
      {showAddItem && (
         <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl animate-slide-up overflow-hidden">
               <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="text-2xl font-black">تعریف داروی جدید در انبار</h3>
                  <button onClick={() => setShowAddItem(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><X size={24}/></button>
               </div>
               <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-xs font-black text-gray-400 block mb-2 mr-1">Generic Name</label><input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="Amoxicillin" value={newItem.generic_name} onChange={e => setNewItem({...newItem, generic_name: e.target.value})} /></div>
                     <div><label className="text-xs font-black text-gray-400 block mb-2 mr-1">Brand Name</label><input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="Amoxil 500" value={newItem.brand_name} onChange={e => setNewItem({...newItem, brand_name: e.target.value})} /></div>
                  </div>
                  <div>
                     <label className="text-xs font-black text-gray-400 block mb-2 mr-1">انتخاب کمپانی سازنده</label>
                     <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={newItem.company_id} onChange={e => setNewItem({...newItem, company_id: e.target.value})}>
                        <option value="">-- یک کمپانی انتخاب کنید --</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name_fa} ({c.name_en})</option>)}
                     </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <div><label className="text-xs font-black text-gray-400 block mb-2 mr-1">قیمت (AFN)</label><input type="number" className="w-full p-4 bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-2xl font-black" value={newItem.price_afn} onChange={e => setNewItem({...newItem, price_afn: e.target.value})} /></div>
                     <div><label className="text-xs font-black text-gray-400 block mb-2 mr-1">امتیاز AI</label><input type="number" className="w-full p-4 bg-blue-50 border border-blue-100 text-blue-900 rounded-2xl font-black" value={newItem.ai_priority_score} onChange={e => setNewItem({...newItem, ai_priority_score: e.target.value})} /></div>
                     <div><label className="text-xs font-black text-gray-400 block mb-2 mr-1">موجودی اولیه</label><input type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black" value={newItem.stock_quantity} onChange={e => setNewItem({...newItem, stock_quantity: e.target.value})} /></div>
                  </div>
               </div>
               <div className="p-8 bg-gray-50 border-t border-gray-100">
                  <button onClick={handleAddItem} disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-blue-200 flex items-center justify-center gap-3 text-lg hover:bg-blue-700 transition-all active:scale-95">
                     {loading ? <Loader2 className="animate-spin" /> : <><Save size={24} /> ثبت نهایی در انبار</>}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* MODALS: ADD COMPANY */}
      {showAddCompany && (
         <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl animate-slide-up overflow-hidden">
               <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="text-2xl font-black text-gray-800">ثبت کمپانی دارویی</h3>
                  <button onClick={() => setShowAddCompany(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><X size={24}/></button>
               </div>
               <div className="p-8 space-y-6">
                  <div><label className="text-xs font-black text-gray-400 block mb-2 mr-1">نام فارسی</label><input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="مثلا: هرات فارما" value={newCompany.name_fa} onChange={e => setNewCompany({...newCompany, name_fa: e.target.value})} /></div>
                  <div><label className="text-xs font-black text-gray-400 block mb-2 mr-1">English Name</label><input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-left" dir="ltr" placeholder="Herat Pharma" value={newCompany.name_en} onChange={e => setNewCompany({...newCompany, name_en: e.target.value})} /></div>
                  <div><label className="text-xs font-black text-gray-400 block mb-2 mr-1">کشور مبدأ</label><div className="relative"><Globe size={18} className="absolute left-4 top-4 text-gray-300"/><input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="افغانستان، آلمان..." value={newCompany.country} onChange={e => setNewCompany({...newCompany, country: e.target.value})} /></div></div>
                  <div>
                    <label className="text-xs font-black text-gray-400 block mb-2 mr-1">امتیاز کیفی (Quality Rating)</label>
                    <div className="flex gap-4 items-center bg-gray-50 p-5 rounded-2xl border border-gray-100 shadow-inner">
                       {[1, 2, 3, 4, 5].map(star => (
                         <button key={star} onClick={() => setNewCompany({...newCompany, quality_rating: star})} className={`transition-all ${star <= newCompany.quality_rating ? 'text-amber-400 scale-125' : 'text-gray-200'}`}><Star fill={star <= newCompany.quality_rating ? "currentColor" : "none"} size={32}/></button>
                       ))}
                       <span className="mr-auto font-black text-indigo-400">{newCompany.quality_rating}/5</span>
                    </div>
                  </div>
               </div>
               <div className="p-8 bg-gray-50 border-t border-gray-100">
                  <button onClick={handleAddCompany} disabled={loading} className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 text-lg hover:bg-indigo-700 transition-all active:scale-95">
                     {loading ? <Loader2 className="animate-spin" /> : <><Building2 size={24} /> ثبت پروفایل کمپانی</>}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default PharmaAdmin;
