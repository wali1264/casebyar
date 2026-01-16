
import React from 'react';
import { 
  Users, 
  CreditCard, 
  LayoutDashboard, 
  Scissors
} from 'lucide-react';

export const MEASUREMENT_LABELS: Record<string, string> = {
  height: 'قد',
  weight: 'وزن',
  neck: 'دور گردن',
  shoulder: 'سرشانه',
  chest: 'دور سینه',
  waist: 'دور کمر',
  hip: 'دور باسن',
  sleeveLength: 'قد آستین',
  armhole: 'حلقه آستین',
  wrist: 'دور مچ',
  backWidth: 'کارور پشت',
  frontLength: 'بالاتنه جلو',
  backLength: 'بالاتنه پشت',
  inseam: 'قد داخل پا',
  outseam: 'قد شلوار (از کمر)',
  thigh: 'دور ران',
  ankle: 'دور دمپا',
};

export const NAVIGATION_ITEMS = [
  { id: 'DASHBOARD', label: 'داشبورد', icon: <LayoutDashboard size={20} /> },
  { id: 'CUSTOMERS', label: 'مشتریان', icon: <Users size={20} /> },
  { id: 'ACCOUNTING', label: 'حسابداری', icon: <CreditCard size={20} /> },
];

export const STATUS_COLORS: Record<string, string> = {
  'در انتظار': 'bg-gray-100 text-gray-700',
  'در حال دوخت': 'bg-blue-100 text-blue-700',
  'آماده تحویل': 'bg-yellow-100 text-yellow-700',
  'تحویل داده شده': 'bg-green-100 text-green-700',
};
