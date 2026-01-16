
import { Customer, Order, Transaction } from '../types';

const STORAGE_KEYS = {
  CUSTOMERS: 'tailor_customers',
  ORDERS: 'tailor_orders',
  TRANSACTIONS: 'tailor_transactions',
};

export const StorageService = {
  getCustomers: (): Customer[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  },
  saveCustomers: (customers: Customer[]) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },
  
  getOrders: (): Order[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
  },
  saveOrders: (orders: Order[]) => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },
  
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },
  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }
};
