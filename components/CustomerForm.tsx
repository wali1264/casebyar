
import React, { useState } from 'react';
import { Customer, Measurements } from '../types';
import { MEASUREMENT_LABELS } from '../constants';
import { X, Save, UserPlus } from 'lucide-react';

interface CustomerFormProps {
  onSave: (customer: Partial<Customer>) => void;
  onClose: () => void;
  initialData?: Customer;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onSave, onClose, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [measurements, setMeasurements] = useState<Measurements>(initialData?.measurements || {});

  const handleMeasureChange = (key: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setMeasurements(prev => ({ ...prev, [key]: numValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('نام و شماره تماس الزامی است.');
      return;
    }
    onSave({
      name,
      phone,
      measurements
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center">
      {/* Background Overlay Click to Close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-white rounded-t-[2.5rem] md:rounded-3xl w-full max-w-4xl max-h-[92vh] md:max-h-[90vh] overflow-hidden flex flex-col mobile-bottom-sheet shadow-2xl">
        {/* Handle for mobile bottom sheet */}
        <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
        
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="text-indigo-600" size={24} />
            {initialData ? 'ویرایش اطلاعات' : 'ثبت مشتری جدید'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors hidden md:block">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">نام و نام خانوادگی</label>
              <input 
                required
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                placeholder="مثلاً: علی رضایی"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">شماره تماس</label>
              <input 
                required
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-left transition-all placeholder:text-slate-400"
                dir="ltr"
                placeholder="0912..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">اندازه‌گیری‌ها (سانتی‌متر)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 mr-1">{label}</label>
                  <input 
                    type="number" 
                    step="0.1"
                    inputMode="decimal"
                    value={measurements[key] || ''} 
                    onChange={(e) => handleMeasureChange(key, e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border-none rounded-xl focus:ring-1 focus:ring-indigo-400 outline-none text-center font-bold text-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-6 border-t bg-white flex justify-end gap-3 pb-safe mb-2 md:mb-0">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 md:flex-none px-6 py-4 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 transition-colors"
          >
            انصراف
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-[2] md:flex-none px-10 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 font-bold"
          >
            <Save size={20} />
            ذخیره اطلاعات
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;
