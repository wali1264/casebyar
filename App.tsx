
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Customer, 
  Order, 
  Transaction, 
  AppView, 
  OrderStatus
} from './types';
import { 
  NAVIGATION_ITEMS, 
  STATUS_COLORS, 
  MEASUREMENT_LABELS 
} from './constants';
import { StorageService } from './services/storage';
import { 
  Search, 
  Plus, 
  Scissors, 
  CreditCard, 
  User, 
  Users,
  Phone, 
  History,
  TrendingUp,
  TrendingDown,
  Download,
  Trash2,
  Calendar,
  Wallet,
  ChevronRight,
  X,
  Save,
  Clock
} from 'lucide-react';
import CustomerForm from './components/CustomerForm';

type MobileCustomerTab = 'INFO' | 'MEASUREMENTS' | 'ORDERS' | 'FINANCE';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('DASHBOARD');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(null as 'DEBT' | 'PAYMENT' | null);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeCustomerTab, setActiveCustomerTab] = useState<MobileCustomerTab>('INFO');

  // Initialize data
  useEffect(() => {
    setCustomers(StorageService.getCustomers());
    setOrders(StorageService.getOrders());
    setTransactions(StorageService.getTransactions());
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm));
  }, [customers, searchTerm]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const handleAddCustomer = (data: Partial<Customer>) => {
    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: data.name!,
      phone: data.phone!,
      measurements: data.measurements || {},
      balance: 0,
    };
    const updated = [...customers, newCustomer];
    setCustomers(updated);
    StorageService.saveCustomers(updated);
    setShowCustomerForm(false);
  };

  const handleAddTransaction = (amount: number, description: string, custId: string = selectedCustomerId!) => {
    const newTx: Transaction = {
      id: Date.now().toString(),
      customerId: custId,
      amount,
      date: new Date().toLocaleDateString('fa-IR'),
      description
    };
    const updatedTxs = [...transactions, newTx];
    setTransactions(updatedTxs);
    StorageService.saveTransactions(updatedTxs);

    const updatedCustomers = customers.map(c => 
      c.id === custId ? { ...c, balance: c.balance + amount } : c
    );
    setCustomers(updatedCustomers);
    StorageService.saveCustomers(updatedCustomers);
    setShowTransactionForm(null);
  };

  const handleCreateOrder = (orderData: { description: string, totalPrice: number, deposit: number, dueDate: string }) => {
    if (!selectedCustomerId) return;

    const newOrder: Order = {
      id: Date.now().toString(),
      customerId: selectedCustomerId,
      description: orderData.description,
      status: OrderStatus.PENDING,
      dateCreated: new Date().toLocaleDateString('fa-IR'),
      totalPrice: orderData.totalPrice,
      deposit: orderData.deposit,
      dueDate: orderData.dueDate || undefined
    };

    const updatedOrders = [...orders, newOrder];
    setOrders(updatedOrders);
    StorageService.saveOrders(updatedOrders);

    // Create financial movements
    if (orderData.totalPrice > 0) {
      handleAddTransaction(orderData.totalPrice, `هزینه سفارش: ${orderData.description}`, selectedCustomerId);
    }
    if (orderData.deposit > 0) {
      handleAddTransaction(-orderData.deposit, `بیعانه سفارش: ${orderData.description}`, selectedCustomerId);
    }
    
    setShowOrderForm(false);
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);
    setOrders(updated);
    StorageService.saveOrders(updated);
  };

  const handleExportData = () => {
    const data = { customers, orders, transactions, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tailormaster_backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;
    a.click();
  };

  // --- Sub-Components (Forms & Sheets) ---

  const OrderForm = () => {
    const [desc, setDesc] = useState('');
    const [price, setPrice] = useState('');
    const [depo, setDepo] = useState('');
    const [due, setDue] = useState('');

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center">
        <div className="absolute inset-0" onClick={() => setShowOrderForm(false)} />
        <div className="relative bg-white rounded-t-[2.5rem] md:rounded-3xl w-full max-w-lg overflow-hidden flex flex-col mobile-bottom-sheet shadow-2xl">
          <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Scissors className="text-indigo-600" /> ثبت سفارش جدید</h2>
            <button onClick={() => setShowOrderForm(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-2">شرح سفارش</label>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="مثلاً: دوخت مانتو اداری" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-2">قیمت کل (تومان)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-2">بیعانه (تومان)</label>
                <input type="number" value={depo} onChange={e => setDepo(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-2">تاریخ تحویل</label>
              <input type="text" value={due} onChange={e => setDue(e.target.value)} placeholder="۱۴۰۳/۰۴/۱۲" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" dir="ltr" />
            </div>
          </div>
          <div className="p-6 border-t bg-white flex gap-3 pb-safe">
            <button onClick={() => setShowOrderForm(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">انصراف</button>
            <button 
              onClick={() => handleCreateOrder({ description: desc, totalPrice: Number(price), deposit: Number(depo), dueDate: due })}
              disabled={!desc || !price}
              className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50"
            >
              ثبت نهایی سفارش
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TransactionForm = () => {
    const isDebt = showTransactionForm === 'DEBT';
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center">
        <div className="absolute inset-0" onClick={() => setShowTransactionForm(null)} />
        <div className="relative bg-white rounded-t-[2.5rem] md:rounded-3xl w-full max-w-lg overflow-hidden flex flex-col mobile-bottom-sheet shadow-2xl">
          <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDebt ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isDebt ? <TrendingUp /> : <TrendingDown />}
              {isDebt ? 'ثبت بدهی جدید' : 'ثبت دریافتی جدید'}
            </h2>
            <button onClick={() => setShowTransactionForm(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-2">مبلغ (تومان)</label>
              <input type="number" autoFocus value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-2">بابتِ (توضیحات)</label>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder={isDebt ? "مثلاً: اصلاح لباس" : "مثلاً: تسویه مانتو"} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="p-6 border-t bg-white flex gap-3 pb-safe">
             <button onClick={() => setShowTransactionForm(null)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">انصراف</button>
             <button 
              onClick={() => handleAddTransaction(isDebt ? Number(amount) : -Number(amount), desc)}
              disabled={!amount || !desc}
              className={`flex-[2] py-4 text-white font-bold rounded-2xl transition-all shadow-xl ${isDebt ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'}`}
             >
               تایید و ثبت نهایی
             </button>
          </div>
        </div>
      </div>
    );
  };

  const HistorySheet = () => {
    const recentActions = useMemo(() => {
      const combined = [
        ...orders.map(o => ({ ...o, type: 'ORDER', date: o.dateCreated })),
        ...transactions.map(t => ({ ...t, type: 'TX', date: t.date }))
      ].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 20);
      return combined;
    }, [orders, transactions]);

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end justify-center">
        <div className="absolute inset-0" onClick={() => setShowHistorySheet(false)} />
        <div className="relative bg-white rounded-t-[2.5rem] w-full max-w-xl h-[80vh] overflow-hidden flex flex-col mobile-bottom-sheet shadow-2xl">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Clock className="text-indigo-600" /> آخرین فعالیت‌ها</h2>
            <button onClick={() => setShowHistorySheet(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {recentActions.map((action: any, i) => {
              const cust = customers.find(c => c.id === action.customerId);
              return (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.type === 'ORDER' ? 'bg-indigo-100 text-indigo-600' : (action.amount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600')}`}>
                      {action.type === 'ORDER' ? <Scissors size={18}/> : (action.amount > 0 ? <TrendingUp size={18}/> : <TrendingDown size={18}/>)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{cust?.name}</div>
                      <div className="text-[10px] text-slate-500">{action.description || 'بدون توضیح'}</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 font-bold">{action.date}</div>
                    {action.amount && <div className={`text-xs font-bold ${action.amount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.abs(action.amount).toLocaleString()} ت</div>}
                  </div>
                </div>
              );
            })}
            {recentActions.length === 0 && <div className="text-center text-slate-400 py-10">هیچ فعالیتی ثبت نشده است.</div>}
          </div>
        </div>
      </div>
    );
  };

  // --- Main View Components ---

  const MobileHeader = () => {
    const isDetail = view === 'CUSTOMER_DETAIL';
    const title = isDetail ? selectedCustomer?.name : NAVIGATION_ITEMS.find(n => n.id === view)?.label;
    
    return (
      <header className="md:hidden sticky top-0 z-[60] bg-white/80 backdrop-blur-lg px-6 py-4 flex items-center justify-between border-b border-slate-100 pb-safe">
        <div className="flex items-center gap-4">
          {isDetail ? (
            <button onClick={() => setView('CUSTOMERS')} className="p-2 bg-slate-100 rounded-2xl text-slate-700">
              <ChevronRight size={20} />
            </button>
          ) : (
             <div className="bg-indigo-600 p-2 rounded-xl text-white">
                <Scissors size={20} />
             </div>
          )}
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        </div>
        <button onClick={() => setShowHistorySheet(true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><History size={24} /></button>
      </header>
    );
  };

  const MobileBottomNav = () => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav px-6 py-3 flex justify-between items-center z-[70] pb-safe rounded-t-[2rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
      {NAVIGATION_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setView(item.id as AppView);
            setSelectedCustomerId(null);
          }}
          className={`flex flex-col items-center gap-1.5 transition-all relative ${view === item.id || (view === 'CUSTOMER_DETAIL' && item.id === 'CUSTOMERS') ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`p-2 rounded-2xl transition-all ${view === item.id || (view === 'CUSTOMER_DETAIL' && item.id === 'CUSTOMERS') ? 'bg-indigo-50' : ''}`}>
            {React.cloneElement(item.icon as React.ReactElement, { size: 22 })}
          </div>
          <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  const DashboardCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between aspect-square md:aspect-auto md:h-40">
      <div className={`${color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <div>
        <span className="text-slate-500 text-sm font-bold block mb-1">{label}</span>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard label="تعداد مشتریان" value={`${customers.length} نفر`} icon={<Users size={24}/>} color="bg-indigo-500" />
        <DashboardCard label="سفارشات فعال" value={`${orders.filter(o => o.status !== OrderStatus.COMPLETED).length} مورد`} icon={<Scissors size={24}/>} color="bg-blue-500" />
        <DashboardCard label="کل طلب‌ها" value={`${customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0).toLocaleString()} ت`} icon={<TrendingUp size={24}/>} color="bg-rose-500" />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">آخرین سفارشات</h3>
          <button onClick={() => setView('CUSTOMERS')} className="text-indigo-600 text-sm font-bold hover:underline">مشاهده همه</button>
        </div>
        <div className="divide-y divide-slate-50">
          {orders.slice(-5).reverse().map(order => {
            const customer = customers.find(c => c.id === order.customerId);
            return (
              <div key={order.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setSelectedCustomerId(order.customerId); setView('CUSTOMER_DETAIL'); setActiveCustomerTab('ORDERS'); }}>
                <div className="flex gap-4 items-center">
                   <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400"><Scissors size={20} /></div>
                   <div>
                     <span className="font-bold text-slate-800 block">{customer?.name}</span>
                     <span className="text-xs text-slate-500">{order.description}</span>
                   </div>
                </div>
                <span className={`px-4 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[order.status]}`}>{order.status}</span>
              </div>
            );
          })}
        </div>
        {orders.length === 0 && <div className="p-10 text-center text-slate-400">هنوز سفارشی ثبت نشده است.</div>}
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input type="text" placeholder="جستجوی نام یا تلفن..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-12 pl-6 py-4 bg-white border border-slate-100 shadow-sm rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {filteredCustomers.map(customer => (
          <div key={customer.id} onClick={() => { setSelectedCustomerId(customer.id); setView('CUSTOMER_DETAIL'); setActiveCustomerTab('INFO'); }} className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm hover:shadow-xl cursor-pointer transition-all flex justify-between items-center group">
            <div className="flex gap-4 items-center">
              <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all"><User size={24} /></div>
              <div>
                <h4 className="text-lg font-bold text-slate-800">{customer.name}</h4>
                <div className="text-slate-400 text-xs mt-1" dir="ltr">{customer.phone}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${customer.balance > 0 ? 'text-rose-500' : customer.balance < 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                {customer.balance === 0 ? 'تسویه' : `${Math.abs(customer.balance).toLocaleString()} ت`}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setShowCustomerForm(true)} className="fixed bottom-28 right-6 w-16 h-16 bg-indigo-600 text-white rounded-3xl shadow-2xl flex items-center justify-center z-[80] active:scale-90 transition-all">
        <Plus size={32} />
      </button>
    </div>
  );

  const renderCustomerDetail = () => {
    if (!selectedCustomer) return null;
    const customerOrders = orders.filter(o => o.customerId === selectedCustomer.id);
    const customerTransactions = transactions.filter(t => t.customerId === selectedCustomer.id);

    const tabs: {id: MobileCustomerTab, label: string, icon: any}[] = [
      { id: 'INFO', label: 'اطلاعات کلی', icon: <User size={18} /> },
      { id: 'MEASUREMENTS', label: 'اندازه‌ها', icon: <Scissors size={18} /> },
      { id: 'ORDERS', label: 'سفارشات', icon: <History size={18} /> },
      { id: 'FINANCE', label: 'حسابداری', icon: <CreditCard size={18} /> },
    ];

    return (
      <div className="space-y-6 pb-20">
        <div className="md:hidden flex overflow-x-auto gap-2 no-scrollbar pb-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveCustomerTab(tab.id)} className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${activeCustomerTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(activeCustomerTab === 'INFO' || activeCustomerTab === 'MEASUREMENTS' || window.innerWidth > 768) && (
            <div className="lg:col-span-1 space-y-6">
              {activeCustomerTab === 'INFO' && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 text-center">
                  <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl"><User size={48} /></div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">{selectedCustomer.name}</h3>
                  <p className="text-slate-400 mb-6" dir="ltr">{selectedCustomer.phone}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-3xl"><span className="text-[10px] text-slate-400 block mb-1">تعداد سفارش</span><span className="font-bold text-slate-800">{customerOrders.length}</span></div>
                    <div className="bg-slate-50 p-4 rounded-3xl"><span className="text-[10px] text-slate-400 block mb-1">تراز مالی</span><span className={`font-bold ${selectedCustomer.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{Math.abs(selectedCustomer.balance).toLocaleString()} ت</span></div>
                  </div>
                </div>
              )}
              {(activeCustomerTab === 'MEASUREMENTS' || window.innerWidth > 768) && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800">جزئیات اندازه‌ها</h3><button className="text-indigo-600 text-xs font-bold" onClick={() => setShowCustomerForm(true)}>ویرایش</button></div>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedCustomer.measurements).map(([key, value]) => value !== undefined && (
                      <div key={key} className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center"><span className="text-[10px] text-slate-400">{MEASUREMENT_LABELS[key]}</span><span className="font-bold text-slate-800">{value}</span></div>
                    ))}
                    {Object.keys(selectedCustomer.measurements).length === 0 && <div className="col-span-2 text-center text-slate-400 py-10">هیچ اندازه‌ای ثبت نشده است.</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="lg:col-span-2 space-y-6">
            {(activeCustomerTab === 'ORDERS' || window.innerWidth > 768) && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800">تاریخچه سفارشات</h3><button onClick={() => setShowOrderForm(true)} className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Plus size={20}/></button></div>
                <div className="space-y-4">
                  {customerOrders.length > 0 ? customerOrders.map(order => (
                    <div key={order.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm"><Scissors size={20}/></div>
                          <div><div className="font-bold text-slate-800">{order.description}</div><div className="text-[10px] text-slate-400 flex gap-2 mt-1"><span>{order.dateCreated}</span>{order.dueDate && <span className="text-rose-500 font-bold"> تحویل: {order.dueDate}</span>}</div></div>
                        </div>
                        <select value={order.status} onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)} className={`text-[10px] px-3 py-1 rounded-full outline-none font-bold shadow-sm ${STATUS_COLORS[order.status]}`}>
                          {Object.values(OrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                      {order.totalPrice !== undefined && (
                        <div className="flex gap-6 mt-4 pt-4 border-t border-slate-200/50">
                          <div><span className="text-[10px] text-slate-400 block">قیمت کل</span><span className="font-bold text-slate-800 text-sm">{order.totalPrice.toLocaleString()} ت</span></div>
                          <div><span className="text-[10px] text-slate-400 block">بیعانه</span><span className="font-bold text-emerald-600 text-sm">{order.deposit?.toLocaleString() || 0} ت</span></div>
                        </div>
                      )}
                    </div>
                  )) : <div className="text-center text-slate-300 py-10">سفارشی یافت نشد.</div>}
                </div>
              </div>
            )}
            {(activeCustomerTab === 'FINANCE' || window.innerWidth > 768) && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800">تراکنش‌های مالی</h3><div className="flex gap-2">
                    <button onClick={() => setShowTransactionForm('DEBT')} className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm"><Plus size={20} /></button>
                    <button onClick={() => setShowTransactionForm('PAYMENT')} className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm"><Download size={20} /></button>
                </div></div>
                <div className="space-y-3">
                  {customerTransactions.slice().reverse().map((tx) => (
                    <div key={tx.id} className="p-4 bg-slate-50/50 rounded-2xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{tx.amount > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</div>
                        <div><div className="text-xs font-bold text-slate-800">{tx.description}</div><div className="text-[10px] text-slate-400">{tx.date}</div></div>
                      </div>
                      <div className={`text-sm font-bold ${tx.amount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.abs(tx.amount).toLocaleString()} ت</div>
                    </div>
                  ))}
                  {customerTransactions.length === 0 && <div className="text-center text-slate-300 py-10">تراکنشی یافت نشد.</div>}
                </div>
                <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white flex justify-between items-center"><span className="text-slate-400 font-bold">وضعیت نهایی تراز:</span><div className="text-right"><div className="text-2xl font-bold">{Math.abs(selectedCustomer.balance).toLocaleString()} ت</div><span className={`text-xs ${selectedCustomer.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedCustomer.balance > 0 ? 'بدهکار' : selectedCustomer.balance < 0 ? 'بستانکار' : 'تسویه شده'}</span></div></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAccounting = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2"><h2 className="text-2xl font-bold text-slate-800 hidden md:block">گزارش مالی</h2><button onClick={handleExportData} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 text-slate-700 rounded-3xl hover:bg-slate-50 text-sm font-bold shadow-sm active:scale-95 transition-all"><Download size={20} /> خروجی پشتیبان (JSON)</button></div>
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden mb-20">
         <div className="divide-y divide-slate-50">
           {customers.map(c => (
             <div key={c.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setSelectedCustomerId(c.id); setView('CUSTOMER_DETAIL'); setActiveCustomerTab('FINANCE'); }}>
               <div className="flex gap-4 items-center">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${c.balance > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{c.name[0]}</div>
                 <div><div className="font-bold text-slate-800">{c.name}</div><div className="text-[10px] text-slate-400" dir="ltr">{c.phone}</div></div>
               </div>
               <div className="text-right"><div className={`font-bold ${c.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.abs(c.balance).toLocaleString()} ت</div><span className={`text-[10px] px-3 py-0.5 rounded-full font-bold ${c.balance > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{c.balance > 0 ? 'بدهکار' : c.balance < 0 ? 'بستانکار' : 'تسویه'}</span></div>
             </div>
           ))}
         </div>
         {customers.length === 0 && <div className="p-20 text-center text-slate-300">اطلاعات مالی یافت نشد.</div>}
      </div>
    </div>
  );

  const renderView = () => {
    switch (view) {
      case 'DASHBOARD': return renderDashboard();
      case 'CUSTOMERS': return renderCustomers();
      case 'ACCOUNTING': return renderAccounting();
      case 'CUSTOMER_DETAIL': return renderCustomerDetail();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      <aside className="hidden md:flex w-80 bg-slate-950 text-white flex-col p-8 sticky top-0 h-screen border-l border-white/5">
        <div className="flex items-center gap-4 mb-14 px-2"><div className="bg-indigo-600 p-3 rounded-2xl shadow-2xl shadow-indigo-600/30"><Scissors size={28} /></div><h1 className="text-2xl font-bold tracking-tight text-white">TailorMaster</h1></div>
        <nav className="space-y-3 flex-1">
          {NAVIGATION_ITEMS.map((item) => (
            <button key={item.id} onClick={() => { setView(item.id as AppView); setSelectedCustomerId(null); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all duration-300 group ${view === item.id || (view === 'CUSTOMER_DETAIL' && item.id === 'CUSTOMERS') ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 translate-x-1' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              <div className="transition-colors">{item.icon}</div><span className="font-bold tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-8 border-t border-white/10 flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400"><User size={24} /></div><div><div className="text-white font-bold">استاد خیاط</div><div className="text-[10px] text-slate-500 tracking-widest uppercase">Master Panel</div></div></div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <MobileHeader />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto no-scrollbar">
          <div className="hidden md:flex justify-between items-center mb-10">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-2">{selectedCustomerId ? <div className="flex items-center gap-4"><button onClick={() => setView('CUSTOMERS')} className="p-3 bg-white border border-slate-100 rounded-3xl text-slate-400 hover:text-indigo-600 shadow-sm"><ChevronRight size={28} /></button>{selectedCustomer?.name}</div> : NAVIGATION_ITEMS.find(n => n.id === view)?.label}</h2>
              {!selectedCustomerId && <p className="text-slate-400 text-lg">خوش آمدید، امروز چه برنامه‌ای دارید؟</p>}
            </div>
            {!selectedCustomerId && <button onClick={() => setShowHistorySheet(true)} className="p-4 bg-white border border-slate-100 rounded-3xl text-slate-500 hover:text-indigo-600 shadow-sm transition-all"><History size={24} /></button>}
          </div>
          <div className="max-w-6xl mx-auto">{renderView()}</div>
        </main>
        <MobileBottomNav />
      </div>

      {showCustomerForm && <CustomerForm onSave={handleAddCustomer} onClose={() => setShowCustomerForm(false)} initialData={selectedCustomer || undefined} />}
      {showOrderForm && <OrderForm />}
      {showTransactionForm && <TransactionForm />}
      {showHistorySheet && <HistorySheet />}
    </div>
  );
};

export default App;
