
export interface PatientVitals {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  spO2: string;
  weight: string;
  height: string;
  respiratoryRate?: string; 
  bloodSugar?: string; 
  bmi?: string;
  bsa?: string;
}

export interface PatientData {
  id?: string;
  displayId?: string; 
  name: string;
  age: string;
  gender: 'male' | 'female';
  phoneNumber?: string;
  chiefComplaint: string;
  history: string;
  allergies?: string;
  vitals: PatientVitals;
  image?: File | null;
  labReport?: File | null;
}

export interface PatientRecord extends PatientData {
  id: string;
  visitDate: number;
  status: 'waiting' | 'diagnosed' | 'completed';
  diagnosis?: DualDiagnosis;
  consensus?: string;
  imageBlob?: Blob;
  labReportBlob?: Blob;
  prescriptions?: PrescriptionRecord[];
}

export interface PrescriptionItem {
  drug: string;
  dosage: string;
  instruction: string;
}

export interface PrescriptionRecord {
  id: string;
  date: number;
  items: PrescriptionItem[];
  notes?: string;
  manualDiagnosis?: string;
  manualVitals?: PatientVitals;
  manualChiefComplaint?: string;
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  items: PrescriptionItem[];
}

export interface Drug {
  id: string;
  name: string; 
  category?: string;
  isCustom: boolean;
  createdAt: number;
}

export interface DrugUsage {
  drugName: string;
  count: number;
  lastUsed: number;
  commonInstructions: string[]; 
  lastDosage?: string;
  lastInstruction?: string;
}

export interface LayoutElement {
  id: string;
  type: 'text' | 'list' | 'container';
  label: string;
  x: number; 
  y: number; 
  width: number; 
  height?: number; 
  fontSize: number; 
  rotation: number; 
  visible: boolean;
  align?: 'right' | 'center' | 'left';
}

export interface PrescriptionSettings {
  topPadding: number; 
  fontFamily: string;
  fontSize: number;
  paperSize: 'A4' | 'A5';
  backgroundImage?: string; 
  printBackground: boolean; 
  elements: LayoutElement[]; 
  customDosages?: string[]; 
  customInstructions?: string[]; 
  autoBackupEnabled?: boolean; 
}

export interface DoctorProfile {
  name: string;
  specialty: string;
  medicalCouncilNumber: string;
  phone: string;
  address: string;
  logo?: string;
  digitalSignature?: string;
}

export interface DoctorDiagnosis {
  diagnosis: string;
  reasoning: string;
  treatmentPlan: string[];
  lifestyle: string[];
  warnings: string[];
  confidence?: string; 
}

export interface DualDiagnosis {
  modern: DoctorDiagnosis;
  traditional: DoctorDiagnosis;
  consensus?: string;
}

export interface LabAnalysis {
  sampleType: string;
  visualFindings: string;
  suspectedOrganism: string;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
  confidence?: string;
  nextSteps?: string[];
}

export interface RadiologyAnalysis {
  modality: string;
  region: string;
  findings: string[];
  impression: string;
  severity: 'normal' | 'abnormal' | 'critical';
  anatomicalLocation?: string;
  confidence?: string;
  nextSteps?: string[];
}

export interface PhysicalExamAnalysis {
  examType: 'skin' | 'tongue' | 'face';
  findings: string[];
  diagnosis: string;
  severity: 'low' | 'medium' | 'high';
  traditionalAnalysis?: string;
  recommendations: string[];
  confidence?: string;
  nextSteps?: string[];
}

export interface CardiologyAnalysis {
  type: 'ecg' | 'sound' | 'risk';
  findings: string[];
  impression: string;
  severity: 'normal' | 'abnormal' | 'critical';
  confidence?: string;
  metrics?: { 
    rate?: string; 
    rhythm?: string; 
    intervals?: string;
    prInterval?: string;
    qrsComplex?: string;
    qtInterval?: string;
  };
  differentialDiagnosis?: string[];
  recommendations: string[];
}

export interface NeurologyAnalysis {
  type: string;
  findings: string[];
  diagnosis: string;
  severity: 'normal' | 'abnormal' | 'critical';
  confidenceScore?: string;
  clinicalCorrelations?: string[];
  recommendations: string[];
}

export interface PsychologyAnalysis {
  type?: string;
  findings: string[];
  interpretation?: string;
  modernAnalysis?: string;
  traditionalAnalysis?: string;
  severity: 'normal' | 'concern' | 'critical';
  recommendations: string[];
  confidence?: string;
}

export interface OphthalmologyAnalysis {
  findings: string[];
  diagnosis: string;
  severity: 'normal' | 'abnormal' | 'critical';
  systemicIndicators?: string[];
  recommendations: string[];
  confidence?: string;
}

export interface PediatricsAnalysis {
  diagnosis: string;
  findings: string[];
  recommendations: string[];
  severity: 'normal' | 'concern' | 'critical';
  confidenceScore?: string;
}

export interface OrthopedicsAnalysis {
  diagnosis: string;
  findings: string[];
  recommendations: string[];
  severity: 'normal' | 'concern' | 'critical';
  angles?: string[];
}

export interface DentistryAnalysis {
  diagnosis: string;
  findings: string[];
  recommendations: string[];
  severity: 'normal' | 'concern' | 'critical';
  toothNumbers?: string[];
}

export interface GynecologyAnalysis {
  diagnosis: string;
  findings: string[];
  recommendations: string[];
  severity: 'normal' | 'concern' | 'critical';
  measurements?: string[];
}

export interface PulmonologyAnalysis {
  type: string;
  findings: string[];
  diagnosis: string;
  severity: 'normal' | 'concern' | 'critical';
  confidence?: string;
  metrics?: string[];
  recommendations: string[];
  nextSteps?: string[];
}

export interface GastroenterologyAnalysis {
  diagnosis: string;
  findings: string[];
  recommendations: string[];
  severity: 'normal' | 'concern' | 'critical';
  mizaj?: string;
  nutrients?: string[];
  organ?: string;
}

export interface UrologyAnalysis {
  diagnosis: string;
  findings: string[];
  recommendations: string[];
  severity: 'normal' | 'concern' | 'critical';
  dipstickValues?: Array<{ parameter: string; value: string; status: string }>;
  stoneDetails?: { size: string; location: string; passability: string };
  kidneyFunction?: { gfr: string; stage: string; mizaj: string };
}

export interface HematologyAnalysis {
  diagnosis: string;
  findings: string[];
  recommendations: string[];
  severity: 'normal' | 'concern' | 'critical';
  cellTypes?: Array<{ name: string; count: string; status: string }>;
  markersTrend?: Array<{ name: string; trend: string; significance: string }>;
}

export interface EmergencyAnalysis {
  type: string;
  findings: string[];
  diagnosis: string;
  severity: 'normal' | 'urgent' | 'critical';
  confidence?: string;
  actions: string[];
  triageLevel?: string;
  antidote?: string;
}

export interface GeneticsAnalysis {
  diagnosis: string;
  findings: string[];
  recommendations: string[];
  severity: 'normal' | 'concern' | 'critical';
  drugCompatibility?: { drug: string; status: string; recommendation: string };
  risks?: Array<{ condition: string; probability: string }>;
}

export enum AppMode {
  GATEWAY = 'gateway',
  DOCTOR = 'doctor',
  PHARMACY = 'pharmacy',
  ADMIN = 'admin',
  LOGISTICS = 'logistics'
}

export interface PharmaCompany {
  id: string;
  name_fa: string;
  name_en: string;
  country?: string;
  quality_rating: number;
}

export interface PharmaInventoryItem {
  id: string;
  generic_name: string;
  brand_name: string;
  company_id: string;
  price_afn: number;
  ai_priority_score: number; 
  stock_quantity: number;
}

export interface PharmaOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: any[];
  total_price: number;
  status: 'pending' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  location?: { lat: number; lng: number };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  INTAKE = 'intake',
  DIAGNOSIS = 'diagnosis',
  LABORATORY = 'laboratory',
  RADIOLOGY = 'radiology',
  PHYSICAL_EXAM = 'physical_exam',
  CARDIOLOGY = 'cardiology',
  NEUROLOGY = 'neurology',
  PSYCHOLOGY = 'psychology',
  OPHTHALMOLOGY = 'ophthalmology',
  PEDIATRICS = 'pediatrics',
  ORTHOPEDICS = 'orthopedics',
  DENTISTRY = 'dentistry',
  GYNECOLOGY = 'gynecology',
  PULMONOLOGY = 'pulmonology',
  GASTROENTEROLOGY = 'gastroenterology',
  UROLOGY = 'urology',
  HEMATOLOGY = 'hematology',
  EMERGENCY = 'emergency',
  GENETICS = 'genetics',
  PRESCRIPTION = 'prescription',
  SETTINGS = 'settings'
}
