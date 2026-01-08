
import React from 'react';
import { Stethoscope, Pill, MapPin, Globe, ChevronLeft, Activity, ShieldCheck, Truck } from 'lucide-react';
import { AppMode } from '../types';

interface GatewayProps {
  onSelectMode: (mode: AppMode) => void;
}

const Gateway: React.FC<GatewayProps> = ({ onSelectMode }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans" dir="rtl">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-400 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="p-6 lg:p-10 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
            <Activity size={28} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">طبیب هوشمند</h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Smart Medical Ecosystem</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
          <Globe size={18} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700">افغانستان</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 relative z-10">
        <div className="text-center mb-12 lg:mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-6xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">
            به هوشمندترین مرکز <span className="text-blue-600">سلامت</span> خوش آمدید
          </h2>
          <p className="text-gray-500 text-lg lg:text-xl font-medium max-w-2xl mx-auto">
            لطفاً جهت ورود به بخش مورد نظر خود، یکی از گزینه‌های زیر را انتخاب کنید.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {/* Pharmacy Card (Patient Entry) */}
          <button 
            onClick={() => onSelectMode(AppMode.PHARMACY)}
            className="group relative bg-white p-8 lg:p-12 rounded-[3rem] shadow-2xl shadow-gray-200 border-2 border-transparent hover:border-blue-600 transition-all duration-500 text-right overflow-hidden flex flex-col h-full active:scale-[0.98]"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-teal-400"></div>
            <div className="flex justify-between items-start mb-8">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <Pill size={40} />
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                <ChevronLeft size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-black text-gray-800 mb-4 group-hover:text-blue-600 transition-colors">داروخانه آنلاین</h3>
            <p className="text-gray-500 font-bold leading-relaxed mb-8 flex-1">
              سفارش آنی دارو، اسکن هوشمند نسخه با هوش مصنوعی و ارسال توسط پیک موتوری در سراسر ولایت.
            </p>
            <div className="flex items-center gap-4 pt-6 border-t border-gray-50 mt-auto">
              <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                <Truck size={14} /> ارسال سریع
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full">
                <MapPin size={14} /> لوکیشن زنده
              </div>
            </div>
          </button>

          {/* Doctor Card (Specialist Entry) */}
          <button 
            onClick={() => onSelectMode(AppMode.DOCTOR)}
            className="group relative bg-gray-900 p-8 lg:p-12 rounded-[3rem] shadow-2xl shadow-blue-900/10 border-2 border-transparent hover:border-blue-500 transition-all duration-500 text-right overflow-hidden flex flex-col h-full active:scale-[0.98]"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
            <div className="flex justify-between items-start mb-8">
              <div className="w-20 h-20 bg-white/10 text-white rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <Stethoscope size={40} />
              </div>
              <div className="p-3 bg-white/5 rounded-2xl text-gray-500 group-hover:text-white group-hover:bg-white/10 transition-colors">
                <ChevronLeft size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-black text-white mb-4 group-hover:text-blue-400 transition-colors">میز کار متخصصین</h3>
            <p className="text-gray-400 font-bold leading-relaxed mb-8 flex-1">
              تشخیص هوشمند، نسخه‌نویسی الکترونیک، بایگانی پرونده‌ها و مدیریت کامل دپارتمان‌های تخصصی پزشکی.
            </p>
            <div className="flex items-center gap-4 pt-6 border-t border-white/5 mt-auto">
              <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 bg-white/5 px-3 py-1.5 rounded-full">
                <Activity size={14} /> پایش هوشمند
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 bg-white/5 px-3 py-1.5 rounded-full">
                <ShieldCheck size={14} /> محیط امن Sentinel
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-10 text-center relative z-10">
        <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em]">Developed by AI Medical Council &bull; Afghanistan 2025</p>
      </footer>
    </div>
  );
};

export default Gateway;
