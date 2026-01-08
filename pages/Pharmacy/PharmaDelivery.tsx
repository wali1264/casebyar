
import React, { useState, useEffect, useRef } from 'react';
import { Truck, Navigation, Phone, CheckCircle2, Clock, MapPin, ChevronLeft, Loader2, Package, Map as MapIcon, ExternalLink, AlertCircle, User, X } from 'lucide-react';
import { getPharmaOrders, updateOrderStatus } from '../../services/pharmaDb';
import { PharmaOrder } from '../../types';

declare const L: any; // Leaflet global

const PharmaDelivery: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [orders, setOrders] = useState<PharmaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'ongoing'>('pending');
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<PharmaOrder | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showMapModal && mapContainerRef.current) {
      setTimeout(() => {
        if (!mapInstanceRef.current) {
          // Initialize map centered on Farah, Afghanistan (default for now or order location)
          const lat = 32.3745;
          const lng = 62.1164;
          mapInstanceRef.current = L.map(mapContainerRef.current).setView([lat, lng], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapInstanceRef.current);
          
          L.marker([lat, lng], {
            icon: L.divIcon({
               className: 'bg-blue-600 rounded-full w-4 h-4 border-2 border-white'
            })
          }).addTo(mapInstanceRef.current).bindPopup("مقصد تحویل").openPopup();
        } else {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    }
  }, [showMapModal]);

  const fetchOrders = async () => {
    try {
      const all = await getPharmaOrders();
      setOrders(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: PharmaOrder['status']) => {
    setLoading(true);
    try {
      await updateOrderStatus(id, status);
      await fetchOrders();
    } catch (e) {
      alert("خطا در بروزرسانی وضعیت");
    } finally {
      setLoading(false);
    }
  };

  const closeMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    setShowMapModal(false);
  };

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');
  const ongoingOrders = orders.filter(o => o.status === 'out_for_delivery');

  return (
    <div className="min-h-screen bg-[#111827] text-gray-100 flex flex-col font-sans" dir="rtl">
      {/* Header */}
      <header className="p-6 bg-gray-900 border-b border-gray-800 sticky top-0 z-40 shadow-xl">
        <div className="flex justify-between items-center max-w-2xl mx-auto w-full">
           <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 bg-gray-800 rounded-xl text-gray-400">
                 <ChevronLeft size={24} />
              </button>
              <div>
                 <h2 className="text-xl font-black">پنل سفیر داروخانه</h2>
                 <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Rider Logistics Center</p>
              </div>
           </div>
           <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-500/20 animate-pulse">Online</div>
        </div>
      </header>

      {/* Tabs */}
      <div className="p-4 flex gap-2 max-w-2xl mx-auto w-full">
         <button 
           onClick={() => setActiveTab('pending')}
           className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-gray-800 text-gray-400'}`}
         >
            <Package size={18} /> سفارشات جدید ({pendingOrders.length})
         </button>
         <button 
           onClick={() => setActiveTab('ongoing')}
           className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'ongoing' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-gray-800 text-gray-400'}`}
         >
            <Truck size={18} /> در حال تحویل ({ongoingOrders.length})
         </button>
      </div>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-20">
         {loading && !orders.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <Loader2 className="animate-spin text-blue-500" size={40} />
               <p className="text-gray-500 font-bold">بروزرسانی لیست تحویل...</p>
            </div>
         ) : (
            <>
               {(activeTab === 'pending' ? pendingOrders : ongoingOrders).length === 0 ? (
                  <div className="text-center py-20 bg-gray-900/50 rounded-[2.5rem] border border-gray-800">
                     <MapIcon size={64} className="mx-auto text-gray-800 mb-4" />
                     <p className="text-gray-500 font-bold">سفارشی در این بخش موجود نیست</p>
                  </div>
               ) : (
                  (activeTab === 'pending' ? pendingOrders : ongoingOrders).map(order => (
                     <div key={order.id} className="bg-gray-900 rounded-[2rem] p-6 border border-gray-800 shadow-xl space-y-6 animate-slide-up">
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-blue-500">
                                 <User size={24} />
                              </div>
                              <div>
                                 <h3 className="font-black text-lg">{order.customer_name}</h3>
                                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Customer Profile</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-black text-emerald-500">{order.total_price.toLocaleString()} AFN</p>
                              <p className="text-[10px] text-gray-600 font-bold mt-1">Total COD</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <a href={`tel:${order.customer_phone}`} className="bg-gray-800 p-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-black text-blue-400 hover:bg-gray-750 transition-all">
                              <Phone size={18} /> تماس با مشتری
                           </a>
                           <button onClick={() => { setSelectedOrderForMap(order); setShowMapModal(true); }} className="bg-indigo-600 p-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-black text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20">
                              <MapIcon size={18} /> مشاهده نقشه (OSM)
                           </button>
                        </div>

                        <div className="bg-black/20 p-4 rounded-2xl border border-gray-800/50">
                           <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Order Items</h4>
                           <div className="space-y-2">
                              {order.items.map((it, i) => (
                                 <div key={i} className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-400">{it.matchedGeneric} ({it.selectedBrand})</span>
                                    <span className="text-blue-500">{it.qty}</span>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {activeTab === 'pending' ? (
                           <button 
                             onClick={() => handleStatusUpdate(order.id, 'out_for_delivery')}
                             className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 text-lg shadow-lg active:scale-95 transition-all"
                           >
                              <Truck size={24} /> شروع فرآیند تحویل
                           </button>
                        ) : (
                           <div className="flex gap-2">
                              <button 
                                onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                                className="flex-1 py-5 bg-red-500/10 text-red-500 rounded-2xl font-black text-sm"
                              >
                                 عدم حضور
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                className="flex-[3] py-5 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 text-lg shadow-xl"
                              >
                                 <CheckCircle2 size={24} /> تایید تحویل و دریافت وجه
                              </button>
                           </div>
                        )}
                     </div>
                  ))
               )}
            </>
         )}
      </main>

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col p-4">
          <div className="flex justify-between items-center p-4 bg-gray-900 rounded-t-[2rem] border-b border-gray-800">
             <h3 className="font-black text-lg">موقعیت تحویل سفارش</h3>
             <button onClick={closeMap} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"><X /></button>
          </div>
          <div className="flex-1 bg-gray-800 relative rounded-b-[2rem] overflow-hidden">
             <div ref={mapContainerRef} className="absolute inset-0"></div>
          </div>
          <div className="p-4 flex gap-4">
             <button className="flex-1 py-4 bg-blue-600 rounded-2xl font-black text-white flex items-center justify-center gap-2"><Navigation size={20} /> مسیریابی (Direction)</button>
          </div>
        </div>
      )}

      <footer className="p-6 text-center text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">
         Daroyar Logistics Engine v1.1
      </footer>
    </div>
  );
};

export default PharmaDelivery;
