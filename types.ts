
export enum OrderStatus {
  PENDING = 'در انتظار',
  PROCESSING = 'در حال دوخت',
  READY = 'آماده تحویل',
  COMPLETED = 'تحویل داده شده'
}

export interface Measurements {
  height?: number;
  weight?: number;
  neck?: number;
  shoulder?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  sleeveLength?: number;
  armhole?: number;
  wrist?: number;
  backWidth?: number;
  frontLength?: number;
  backLength?: number;
  inseam?: number;
  outseam?: number;
  thigh?: number;
  ankle?: number;
  [key: string]: number | undefined;
}

export interface Transaction {
  id: string;
  customerId: string;
  amount: number; // Positive for debt, negative for payment
  date: string;
  description: string;
}

export interface Order {
  id: string;
  customerId: string;
  description: string;
  status: OrderStatus;
  dateCreated: string;
  dueDate?: string;
  totalPrice?: number;
  deposit?: number;
  photo?: string; // base64
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  measurements: Measurements;
  balance: number; // Sum of transactions
  photo?: string; // base64
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AppView = 'DASHBOARD' | 'CUSTOMERS' | 'ACCOUNTING' | 'AI_ASSISTANT' | 'CUSTOMER_DETAIL';
