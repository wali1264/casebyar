
import { supabasePharma } from './supabasePharma';
import { PharmaCompany, PharmaInventoryItem, PharmaOrder } from '../types';

/**
 * PHARMA DATABASE ENGINE v1.2
 * Specialized for Order Processing and Delivery Tracking.
 */

// --- COMPANY MANAGEMENT ---
export const getPharmaCompanies = async (): Promise<PharmaCompany[]> => {
  const { data, error } = await supabasePharma
    .from('pharma_companies')
    .select('*')
    .order('quality_rating', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const savePharmaCompany = async (company: Partial<PharmaCompany>) => {
  const { data, error } = await supabasePharma
    .from('pharma_companies')
    .upsert(company)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const deletePharmaCompany = async (id: string) => {
  const { error } = await supabasePharma
    .from('pharma_companies')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- INVENTORY MANAGEMENT ---
export const getPharmaInventory = async (): Promise<PharmaInventoryItem[]> => {
  const { data, error } = await supabasePharma
    .from('pharma_inventory')
    .select('*')
    .order('generic_name', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const saveInventoryItem = async (item: Partial<PharmaInventoryItem>) => {
  const { data, error } = await supabasePharma
    .from('pharma_inventory')
    .upsert(item)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const deleteInventoryItem = async (id: string) => {
  const { error } = await supabasePharma
    .from('pharma_inventory')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- ORDER MANAGEMENT ---
export const createPharmaOrder = async (order: Partial<PharmaOrder>) => {
  const { data, error } = await supabasePharma
    .from('pharma_orders')
    .insert([order])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const getPharmaOrders = async (): Promise<PharmaOrder[]> => {
  const { data, error } = await supabasePharma
    .from('pharma_orders')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const updateOrderStatus = async (id: string, status: PharmaOrder['status']) => {
  const { data, error } = await supabasePharma
    .from('pharma_orders')
    .update({ status })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
};

// --- PHARMA SPECIFIC BACKUP ---
export const exportPharmaData = async () => {
  const companies = await getPharmaCompanies();
  const inventory = await getPharmaInventory();
  return JSON.stringify({ companies, inventory, timestamp: Date.now() });
};
