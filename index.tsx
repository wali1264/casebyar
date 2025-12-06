
import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  Beaker, 
  Microscope, 
  Activity, 
  Menu, 
  X, 
  MessageSquare, 
  Send, 
  Plus, 
  Info,
  AlertCircle,
  FlaskConical,
  Settings,
  ChevronLeft,
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Power,
  RefreshCw,
  Volume2,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Save,
  Trash2,
  User,
  History,
  Check,
  ChevronRight,
  Download,
  Thermometer,
  Heart,
  Wind,
  Stethoscope,
  Pill,
  Syringe,
  FilePlus,
  Languages,
  Brain,
  Wifi,
  WifiOff,
  Scale,
  Eye,
  EyeOff,
  Zap,
  Printer,
  Calculator,
  Grid,
  Scissors,
  Circle,
  Layers
} from 'lucide-react';

// --- TYPES & INTERFACES ---

type Tab = 'media-prep' | 'live-lab' | 'analysis' | 'settings' | 'resources';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface AnalysisResult {
  id: string;
  timestamp: number;
  organism_suspicion: string;
  confidence: string;
  growth_stage: string;
  colony_morphology: string;
  antibiotic_results: {
    name: string;
    zone_size_mm: number;
    interpretation: 'Sensitive' | 'Resistant' | 'Intermediate';
  }[];
  recommendation: string;
  imageUrl?: string;
}

interface UserProfile {
  name: string;
  labName: string;
  role: string;
}

interface VitalsData {
  temp: { value: number; enabled: boolean };
  hr: { value: number; enabled: boolean };
  bp: { sys: number; dia: number; enabled: boolean };
  spo2: { value: number; enabled: boolean };
  weight: { value: number; enabled: boolean };
}

interface ClinicalDiagnosisResult {
  diagnosis: string;
  reasoning: string;
  prescription_suggestion: string;
  media_recommendation: {
    standard: { name: string; description: string };
    emergency: { name: string; recipe: string };
  };
}

// --- AUDIO UTILS ---

const AUDIO_INPUT_SAMPLE_RATE = 16000;
const AUDIO_OUTPUT_SAMPLE_RATE = 24000;

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

// --- AI SERVICE WITH MULTI-KEY LOAD BALANCING ---

class LabAIService {
  private modelName = 'gemini-2.5-flash';
  private apiKeys: string[] = [];
  private currentKeyIndex = 0;

  constructor() {
    this.harvestKeys();
  }

  /**
   * Automatically discovers keys starting from VITE_GOOGLE_GENAI_TOKEN_1 up to infinity.
   */
  private harvestKeys() {
    let index = 1;
    while (true) {
      // Look for VITE_GOOGLE_GENAI_TOKEN_n
      const keyName = `VITE_GOOGLE_GENAI_TOKEN_${index}`;
      let key: string | undefined;

      // 1. Try import.meta.env (Vite Standard)
      try {
        // @ts-ignore
        key = import.meta.env[keyName];
      } catch (e) {}

      // 2. Fallback to process.env
      if (!key) {
        try {
           key = process.env[keyName];
        } catch (e) {}
      }

      if (key) {
        this.apiKeys.push(key);
        index++;
      } else {
        // Stop when we hit a missing number
        break;
      }
    }

    // Fallback: If no numbered keys found, try standard API_KEY or VITE_GOOGLE_GENAI_TOKEN
    if (this.apiKeys.length === 0) {
      // @ts-ignore
      const singleKey = process.env.API_KEY || import.meta.env?.VITE_GOOGLE_GENAI_TOKEN || process.env.VITE_GOOGLE_GENAI_TOKEN;
      if (singleKey) {
        this.apiKeys.push(singleKey);
      } else {
        console.warn("No API Keys found! Please set VITE_GOOGLE_GENAI_TOKEN_1, VITE_GOOGLE_GENAI_TOKEN_2, etc.");
      }
    }

    console.log(`LabAIService initialized with ${this.apiKeys.length} keys.`);
  }

  /**
   * Returns a client using the next key in rotation.
   * Useful for Live API connections which need a single stable client.
   */
  getLiveClient(): GoogleGenAI {
    const key = this.getNextKey();
    if (!key) throw new Error("No API Keys available");
    return new GoogleGenAI({ apiKey: key });
  }

  private getNextKey(): string {
    if (this.apiKeys.length === 0) return '';
    const key = this.apiKeys[this.currentKeyIndex];
    // Round-robin rotation
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  /**
   * Executes an AI operation with automatic failover.
   * If a key fails with 429/403, it switches to the next key and retries.
   */
  private async executeWithRetry<T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
    if (this.apiKeys.length === 0) throw new Error("API Key configuration missing");

    let attempts = 0;
    // Try at most 2 full cycles of keys to avoid infinite loops
    const maxAttempts = this.apiKeys.length * 2; 

    while (attempts < maxAttempts) {
      const currentKey = this.getNextKey();
      
      try {
        const ai = new GoogleGenAI({ apiKey: currentKey });
        return await operation(ai);
      } catch (error: any) {
        console.warn(`Request failed with key ending in ...${currentKey.slice(-4)}:`, error.message);

        // Check for specific errors that warrant a retry (Quota or Permission)
        const isQuotaError = error.message?.includes('429') || error.status === 429;
        const isAuthError = error.message?.includes('403') || error.status === 403; // Key might be invalid/blocked

        if (isQuotaError || isAuthError) {
          console.log("Switching to next key due to quota/auth limit...");
          attempts++;
          continue; // Retry loop with next key
        }
        
        // For other errors (e.g., 400 Bad Request), throw immediately
        throw error;
      }
    }
    throw new Error("All API keys exhausted or service unavailable.");
  }

  async clinicalDiagnosis(
    vitals: VitalsData, 
    history: string, 
    images: string[]
  ): Promise<ClinicalDiagnosisResult | null> {
    return this.executeWithRetry(async (ai) => {
      // Build Vitals String
      let vitalsStr = "Vital Signs: ";
      if (vitals.temp.enabled) vitalsStr += `Temp: ${vitals.temp.value}°C, `;
      if (vitals.hr.enabled) vitalsStr += `Heart Rate: ${vitals.hr.value} bpm, `;
      if (vitals.bp.enabled) vitalsStr += `BP: ${vitals.bp.sys}/${vitals.bp.dia} mmHg, `;
      if (vitals.spo2.enabled) vitalsStr += `SpO2: ${vitals.spo2.value}%, `;
      if (vitals.weight.enabled) vitalsStr += `Weight: ${vitals.weight.value} kg, `;
      
      const promptParts: any[] = [
        { text: `Act as "Dr. Azam", a Chief Medical Officer and Microbiologist. 
        Analyze this patient data to provide a preliminary diagnosis and recommend the BEST culture media.
        
        ${vitalsStr}
        Clinical History: ${history}
        
        Task:
        1. Diagnose the potential infection based on symptoms and vitals.
        2. Suggest empirical treatment (Antibiotics).
        3. Recommend the BEST standard culture media for this pathogen.
        4. Provide an 'Emergency Homemade Media' recipe if standard media is unavailable (using common ingredients like eggs, starch, etc).
        
        Return ONLY valid JSON in this format:
        {
          "diagnosis": "Diagnosis in Persian",
          "reasoning": "Brief explanation in Persian",
          "prescription_suggestion": "Medicine names in Persian/English",
          "media_recommendation": {
            "standard": { "name": "Standard Media Name", "description": "Why this media?" },
            "emergency": { "name": "Homemade Option Name", "recipe": "Brief recipe instructions" }
          }
        }` }
      ];

      for (const img of images) {
        promptParts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
      }

      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: promptParts,
        config: { responseMimeType: 'application/json' }
      });

      return JSON.parse(response.text || '{}') as ClinicalDiagnosisResult;
    }).catch(err => {
      console.error("Diagnosis Final Error:", err);
      alert("خطا در ارتباط با هوش مصنوعی. لطفاً اتصال اینترنت یا کلیدها را بررسی کنید.");
      return null;
    });
  }

  async analyzePlateImage(base64Image: string): Promise<AnalysisResult | null> {
    return this.executeWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          {
            text: `Analyze this microbiology petri dish image carefully. You are an expert microbiologist.
            Identify colonies, morphology, and if antibiotic discs are present, estimate the Zone of Inhibition.
            
            Return the result ONLY as a JSON object with this exact structure:
            {
              "organism_suspicion": "Scientific name (e.g. Staphylococcus aureus)",
              "confidence": "High/Medium/Low",
              "growth_stage": "e.g. Early growth (4-6h) / Mature (24h)",
              "colony_morphology": "Brief description (color, shape, hemolysis)",
              "antibiotic_results": [
                { "name": "Antibiotic Code/Name", "zone_size_mm": number, "interpretation": "Sensitive/Resistant/Intermediate" }
              ],
              "recommendation": "Clinical suggestion in Persian (Farsi)"
            }
            Do not wrap in markdown code blocks. Just return the JSON string.`
          }
        ]
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      return {
        ...parsed,
        id: crypto.randomUUID(),
        timestamp: Date.now()
      } as AnalysisResult;
    }).catch(err => {
      console.error("Analysis Final Error:", err);
      return null;
    });
  }
}

const aiService = new LabAIService();

// --- COMPONENTS ---

// 1. Layout & Navigation
const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNavItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-2 space-y-1 ${
      active ? 'text-blue-600' : 'text-slate-500'
    }`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

// 2. New Component: Live Voice Assistant (Replaces AIChat)
const LiveVoiceAssistant = ({ initialContext, persona = 'clinical' }: { initialContext: string, persona?: 'clinical' | 'qc' }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Refs for audio handling to persist across renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const initAudioContext = () => {
    // Reuse existing context if running to prevent "limit reached" error
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: AUDIO_OUTPUT_SAMPLE_RATE,
        latencyHint: 'interactive',
      });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const stopAllAudio = () => {
    // Immediately stop all currently playing nodes
    audioQueueRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    audioQueueRef.current = [];
    
    // Reset time cursor to now
    if (audioContextRef.current) {
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  const connect = async () => {
    try {
      setIsConnecting(true);
      const ctx = initAudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_INPUT_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
      
      const historyText = messages.map(m => `${m.role === 'user' ? 'کاربر' : 'مدل'}: ${m.text}`).join('\n');
      const contextPrompt = `
      [CURRENT CONTEXT]
      ${initialContext}

      [CONVERSATION HISTORY]
      ${historyText}
      `;

      let systemInstruction = '';
      if (persona === 'clinical') {
        systemInstruction = `شما "دکتر اعظم" هستید، همکار متخصص میکروبیولوژیست.
          سبک: همکار صمیمی، شوخ‌طبع، رند و سریع.
          هدف: کمک به تشخیص و انتخاب محیط کشت.
          نکته: اگر کاربر حرف زد، بلافاصله ساکت شو.`;
      } else {
        systemInstruction = `شما "متخصص کنترل کیفیت آزمایشگاه" (QC Expert) هستید.
          سبک: دقیق، فنی، هشداردهنده.
          هدف: راهنمایی برای ساخت دیسک آنتی‌بیوتیک و استریلیزاسیون.`;
      }

      // GET FRESH CLIENT FOR LOAD BALANCING
      const aiClient = aiService.getLiveClient();

      const sessionPromise = aiClient.live.connect({
        model: model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `${systemInstruction}\n${contextPrompt}`,
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: persona === 'clinical' ? 'Kore' : 'Fenrir' } }
          }
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsConnected(true);
            
            sessionPromise.then(s => {
              sessionRef.current = s;
            });

            // Use the single persisted AudioContext
            const source = ctx.createMediaStreamSource(stream);
            // Revert buffer size to 4096 for stability
            const processor = ctx.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
              // Safety Guard: Don't process if session is not established or closed
              if (!sessionRef.current) return;

              const inputData = e.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for(let i=0; i<inputData.length; i+=50) sum += Math.abs(inputData[i]);
              setVolume(Math.min(100, (sum / (inputData.length/50)) * 500));

              const pcmData = floatTo16BitPCM(inputData);
              const uint8 = new Uint8Array(pcmData.buffer);
              const base64 = arrayBufferToBase64(uint8.buffer);

              sessionPromise.then(session => {
                // Double check session validity before sending
                if (sessionRef.current === session) {
                  try {
                    session.sendRealtimeInput({
                      media: {
                        mimeType: "audio/pcm;rate=16000",
                        data: base64
                      }
                    });
                  } catch (err) {
                    console.warn("Failed to send audio frame", err);
                  }
                }
              }).catch(() => {});
            };

            source.connect(processor);
            processor.connect(ctx.destination);
            processorRef.current = processor;
            sourceRef.current = source;
          },
          onmessage: (msg) => {
            if (msg.serverContent?.interrupted) {
              stopAllAudio();
              return;
            }

            if (msg.serverContent?.outputTranscription?.text) {
               const text = msg.serverContent.outputTranscription.text;
               setMessages(prev => {
                  const last = prev[prev.length-1];
                  if (last && last.role === 'model' && (Date.now() - last.timestamp.getTime() < 5000)) {
                     return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                  }
                  return [...prev, { role: 'model', text, timestamp: new Date() }];
               });
            }

            if (msg.serverContent?.inputTranscription?.text) {
               const text = msg.serverContent.inputTranscription.text;
               setMessages(prev => {
                  const last = prev[prev.length-1];
                  if (last && last.role === 'user' && (Date.now() - last.timestamp.getTime() < 5000)) {
                     return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                  }
                  return [...prev, { role: 'user', text, timestamp: new Date() }];
               });
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              const audioBytes = base64ToUint8Array(audioData);
              const dataInt16 = new Int16Array(audioBytes.buffer);
              const float32 = new Float32Array(dataInt16.length);
              for (let i = 0; i < dataInt16.length; i++) {
                float32[i] = dataInt16[i] / 32768.0;
              }
              
              const buffer = ctx.createBuffer(1, float32.length, AUDIO_OUTPUT_SAMPLE_RATE);
              buffer.getChannelData(0).set(float32);
              
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              
              const currentTime = ctx.currentTime;
              const startTime = Math.max(currentTime, nextStartTimeRef.current);
              source.start(startTime);
              nextStartTimeRef.current = startTime + buffer.duration;
              
              audioQueueRef.current.push(source);
              source.onended = () => {
                const index = audioQueueRef.current.indexOf(source);
                if (index > -1) audioQueueRef.current.splice(index, 1);
              };
            }
          },
          onclose: () => {
            setIsConnected(false);
            sessionRef.current = null; // Clear session ref immediately
          },
          onerror: (err) => {
            console.error(err);
            setIsConnected(false);
            sessionRef.current = null;
          }
        }
      });

    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    // 0. Clear Session Ref first to stop audio processing loop
    sessionRef.current = null;

    // 1. Stop Media Tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    // 2. Disconnect Audio Nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    // 3. Strictly Close Audio Context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.error(e));
      audioContextRef.current = null;
    }

    stopAllAudio();
    setIsConnected(false);
    setIsConnecting(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, []);

  return (
    <div className="flex flex-col h-[500px] bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden relative">
      {/* Header */}
      <div className="bg-slate-800 p-4 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
          <div>
            <h3 className="font-bold text-sm">{persona === 'clinical' ? 'دکتر اعظم (بالینی)' : 'کارشناس کنترل کیفی (QC)'}</h3>
            <p className="text-[10px] text-slate-400">
              {persona === 'clinical' ? 'حالت: همکار هوشمند و سریع' : 'حالت: مشاور فنی ساخت محلول'}
            </p>
          </div>
        </div>
        {isConnected && (
           <div className="flex items-center gap-1">
             <div className="w-1 bg-green-500 animate-[bounce_1s_infinite]" style={{height: `${Math.max(4, volume/5)}px`}}></div>
             <div className="w-1 bg-green-500 animate-[bounce_1.2s_infinite]" style={{height: `${Math.max(6, volume/3)}px`}}></div>
             <div className="w-1 bg-green-500 animate-[bounce_0.8s_infinite]" style={{height: `${Math.max(4, volume/5)}px`}}></div>
           </div>
        )}
      </div>

      {/* Chat History / Visualizer Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-900 to-slate-800">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
            <Wifi size={48} className="mb-4" />
            <p className="text-center text-sm px-6">
              برای شروع مکالمه {persona === 'clinical' ? 'بالینی' : 'فنی'}، دکمه میکروفون را فشار دهید.
              <br/>
            </p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
              msg.role === 'user' 
              ? 'bg-blue-600 text-white rounded-tr-none' 
              : 'bg-slate-700 text-slate-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Control Bar */}
      <div className="p-6 bg-slate-800 border-t border-slate-700 flex flex-col items-center justify-center relative">
        {isConnecting ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-blue-400 font-bold">در حال برقراری تماس...</span>
          </div>
        ) : (
          <button
            onClick={isConnected ? disconnect : connect}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-2xl ${
              isConnected 
              ? 'bg-red-500 hover:bg-red-600 shadow-red-900/50 animate-pulse' 
              : 'bg-green-500 hover:bg-green-600 shadow-green-900/50'
            }`}
          >
            {isConnected ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
        )}
        
        <p className="mt-4 text-xs font-medium text-slate-400">
          {isConnected ? 'مکالمه فعال است (برای قطع کلیک کنید)' : 'برای شروع مکالمه کلیک کنید'}
        </p>

        {/* Status Badge */}
        <div className="absolute right-4 bottom-4">
           {isConnected ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-slate-600" />}
        </div>
      </div>
    </div>
  );
};

// 3. Module: Clinical Console (Updated)
const ClinicalConsoleModule = () => {
  // State for Inputs
  const [vitals, setVitals] = useState<VitalsData>({
    temp: { value: 37.0, enabled: true },
    hr: { value: 72, enabled: true },
    bp: { sys: 120, dia: 80, enabled: true },
    spo2: { value: 98, enabled: true },
    weight: { value: 70, enabled: true }
  });
  const [historyText, setHistoryText] = useState('');
  const [historyLang, setHistoryLang] = useState<'fa' | 'en'>('fa');
  const [isListeningHistory, setIsListeningHistory] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  // State for Processing
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<ClinicalDiagnosisResult | null>(null);

  // Vitals Helpers
  const toggleVital = (key: keyof VitalsData) => {
    setVitals(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
  };

  const updateSimpleVital = (key: keyof VitalsData, val: number) => {
    // For simple values (temp, hr, spo2, weight)
    setVitals(prev => ({
      ...prev,
      [key]: { ...prev[key], value: val }
    }));
  };
  
  const updateBP = (type: 'sys' | 'dia', val: number) => {
    setVitals(prev => ({
      ...prev,
      bp: { ...prev.bp, [type]: val }
    }));
  };

  // History Speech Helper
  const toggleHistorySpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('مرورگر پشتیبانی نمی‌کند');
      return;
    }

    if (isListeningHistory) {
      setIsListeningHistory(false);
      return;
    }

    setIsListeningHistory(true);
    const recognition = new SpeechRecognition();
    recognition.lang = historyLang === 'fa' ? 'fa-IR' : 'en-US';
    recognition.continuous = false;
    
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setHistoryText(prev => prev + (prev ? ' ' : '') + text);
      setIsListeningHistory(false);
    };
    recognition.onerror = () => setIsListeningHistory(false);
    recognition.onend = () => setIsListeningHistory(false);
    recognition.start();
  };

  // Image Upload Helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages(prev => [...prev, (reader.result as string).split(',')[1]]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Main Action
  const handleDiagnosis = async () => {
    setIsDiagnosing(true);
    const result = await aiService.clinicalDiagnosis(vitals, historyText, uploadedImages);
    setDiagnosisResult(result);
    setIsDiagnosing(false);
  };

  // Prepare Context for Voice Assistant
  const getContextString = () => {
    let ctx = `Patient Vitals: `;
    if(vitals.temp.enabled) ctx += `Temp ${vitals.temp.value}C, `;
    if(vitals.hr.enabled) ctx += `HR ${vitals.hr.value}, `;
    if(vitals.bp.enabled) ctx += `BP ${vitals.bp.sys}/${vitals.bp.dia}, `;
    
    ctx += `\nClinical History: ${historyText || 'N/A'}`;
    if (diagnosisResult) {
      ctx += `\nPrevious AI Diagnosis: ${diagnosisResult.diagnosis}`;
      ctx += `\nSuggested Media: ${diagnosisResult.media_recommendation.standard.name}`;
    }
    return ctx;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope className="text-blue-600" />
            کنسول تشخیص بالینی و کشت
          </h2>
          <p className="text-slate-500 text-sm mt-1">اتاق فرمان پزشکی برای تشخیص هوشمند و انتخاب محیط کشت</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* CARD 1: VITALS (REDESIGNED) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold border-b border-slate-100 pb-2">
              <Activity size={18} />
              <h3>تنظیم علائم حیاتی بیمار</h3>
              <span className="text-xs font-normal text-slate-400 mr-auto">برای فعال‌سازی تیک بزنید</span>
            </div>
            
            {/* BP Card - Full Width */}
            <div className={`mb-6 p-4 rounded-xl border-2 transition-all ${vitals.bp.enabled ? 'border-blue-100 bg-blue-50/30' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
               <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={vitals.bp.enabled} 
                      onChange={() => toggleVital('bp')}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label className="text-base font-bold text-slate-700 flex items-center gap-2 cursor-pointer" onClick={() => toggleVital('bp')}>
                       فشار خون (BP)
                    </label>
                  </div>
                  <div className="text-2xl font-black text-blue-900 tracking-tight">
                    {vitals.bp.sys} <span className="text-slate-400 text-lg">/</span> {vitals.bp.dia}
                  </div>
               </div>
               
               <div className="grid grid-cols-1 gap-6">
                 {/* Systolic */}
                 <div className="relative pt-1">
                   <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                     <span>SYS (سیستولیک)</span>
                     <span>{vitals.bp.sys}</span>
                   </div>
                   <input 
                    type="range" min="70" max="220" step="1"
                    value={vitals.bp.sys}
                    onChange={(e) => updateBP('sys', parseInt(e.target.value))}
                    disabled={!vitals.bp.enabled}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                   />
                 </div>
                 {/* Diastolic */}
                 <div className="relative pt-1">
                   <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                     <span>DIA (دیاستولیک)</span>
                     <span>{vitals.bp.dia}</span>
                   </div>
                   <input 
                    type="range" min="40" max="130" step="1"
                    value={vitals.bp.dia}
                    onChange={(e) => updateBP('dia', parseInt(e.target.value))}
                    disabled={!vitals.bp.enabled}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                   />
                 </div>
               </div>
            </div>

            {/* Other Vitals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* SpO2 */}
              <div className={`p-4 rounded-xl border border-slate-100 transition-all ${vitals.spo2.enabled ? 'bg-cyan-50/50' : 'bg-slate-50 opacity-60'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={vitals.spo2.enabled} onChange={() => toggleVital('spo2')} className="w-4 h-4 rounded text-cyan-600" />
                    <label className="font-bold text-sm flex items-center gap-1"><Wind size={16} className="text-cyan-600"/> اکسیژن (SPO2)</label>
                  </div>
                  <span className={`font-black text-lg ${vitals.spo2.value < 95 ? 'text-red-500' : 'text-cyan-700'}`}>{vitals.spo2.value}%</span>
                </div>
                <input type="range" min="70" max="100" value={vitals.spo2.value} onChange={(e) => updateSimpleVital('spo2', parseInt(e.target.value))} disabled={!vitals.spo2.enabled} className="w-full h-2 bg-slate-200 rounded-lg accent-cyan-600" />
              </div>

              {/* Heart Rate */}
              <div className={`p-4 rounded-xl border border-slate-100 transition-all ${vitals.hr.enabled ? 'bg-rose-50/50' : 'bg-slate-50 opacity-60'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={vitals.hr.enabled} onChange={() => toggleVital('hr')} className="w-4 h-4 rounded text-rose-600" />
                    <label className="font-bold text-sm flex items-center gap-1"><Heart size={16} className="text-rose-600"/> ضربان (HR)</label>
                  </div>
                  <span className={`font-black text-lg ${vitals.hr.value > 100 ? 'text-rose-600' : 'text-slate-700'}`}>{vitals.hr.value}</span>
                </div>
                <input type="range" min="40" max="200" value={vitals.hr.value} onChange={(e) => updateSimpleVital('hr', parseInt(e.target.value))} disabled={!vitals.hr.enabled} className="w-full h-2 bg-slate-200 rounded-lg accent-rose-500" />
              </div>

              {/* Weight */}
              <div className={`p-4 rounded-xl border border-slate-100 transition-all ${vitals.weight.enabled ? 'bg-indigo-50/50' : 'bg-slate-50 opacity-60'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={vitals.weight.enabled} onChange={() => toggleVital('weight')} className="w-4 h-4 rounded text-indigo-600" />
                    <label className="font-bold text-sm flex items-center gap-1"><Scale size={16} className="text-indigo-600"/> وزن (Weight)</label>
                  </div>
                  <span className="font-black text-lg text-indigo-900">{vitals.weight.value} <span className="text-xs font-medium text-slate-400">kg</span></span>
                </div>
                <input type="range" min="3" max="150" value={vitals.weight.value} onChange={(e) => updateSimpleVital('weight', parseInt(e.target.value))} disabled={!vitals.weight.enabled} className="w-full h-2 bg-slate-200 rounded-lg accent-indigo-600" />
              </div>

              {/* Temperature */}
              <div className={`p-4 rounded-xl border border-slate-100 transition-all ${vitals.temp.enabled ? 'bg-orange-50/50' : 'bg-slate-50 opacity-60'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={vitals.temp.enabled} onChange={() => toggleVital('temp')} className="w-4 h-4 rounded text-orange-600" />
                    <label className="font-bold text-sm flex items-center gap-1"><Thermometer size={16} className="text-orange-600"/> دما (Temp)</label>
                  </div>
                  <span className={`font-black text-lg ${vitals.temp.value > 37.5 ? 'text-orange-600' : 'text-slate-700'}`}>{vitals.temp.value}°c</span>
                </div>
                <input type="range" min="35" max="42" step="0.1" value={vitals.temp.value} onChange={(e) => updateSimpleVital('temp', parseFloat(e.target.value))} disabled={!vitals.temp.enabled} className="w-full h-2 bg-slate-200 rounded-lg accent-orange-500" />
              </div>

            </div>
          </div>

          {/* CARD 2: CLINICAL HISTORY */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <FileText size={18} />
                <h3>شرح حال و علائم بالینی</h3>
              </div>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setHistoryLang(l => l === 'fa' ? 'en' : 'fa')}
                   className="text-xs font-mono bg-slate-100 px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-200"
                 >
                   <Languages size={12} />
                   {historyLang === 'fa' ? 'FA' : 'EN'}
                 </button>
                 <button 
                   onClick={toggleHistorySpeech}
                   className={`p-2 rounded-lg transition-all ${isListeningHistory ? 'bg-red-500 text-white animate-pulse shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                   title="شروع دیکته صوتی"
                 >
                   {isListeningHistory ? <MicOff size={16} /> : <Mic size={16} />}
                 </button>
              </div>
            </div>
            <textarea 
              value={historyText}
              onChange={(e) => setHistoryText(e.target.value)}
              placeholder={historyLang === 'fa' ? "شرح حال بیمار را تایپ کنید یا بگویید (مثلا: تب بالا، گلودرد شدید، مراجعه بعد از سفر...)" : "Dictate patient history..."}
              className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none"
              dir={historyLang === 'fa' ? 'rtl' : 'ltr'}
            />
          </div>

          {/* CARD 3: ATTACHMENTS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 font-bold mb-3 border-b border-slate-100 pb-2">
              <FilePlus size={18} />
              <h3>مدارک پزشکی (نسخه، آزمایش خون، ...)</h3>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              
              <label className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors text-slate-400 hover:text-blue-500">
                <Upload size={24} className="mb-1" />
                <span className="text-[10px] font-bold">آپلود عکس</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          {/* MAIN ACTION BUTTON */}
          <button 
            onClick={handleDiagnosis}
            disabled={isDiagnosing}
            className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] ${
              isDiagnosing 
                ? 'bg-slate-100 text-slate-400 cursor-wait' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            {isDiagnosing ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                در حال مشاوره با دکتر اعظم...
              </>
            ) : (
              <>
                <Brain size={24} />
                تشخیص هوشمند و پیشنهاد محیط کشت
              </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: Results & AI (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* AI RESULT CARD */}
          {diagnosisResult ? (
            <div className="space-y-4 animate-slide-up">
              {/* Diagnosis Header */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-500"></div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">تشخیص دکتر اعظم</h4>
                <h2 className="text-xl font-bold mb-2">{diagnosisResult.diagnosis}</h2>
                <p className="text-sm text-slate-300 leading-relaxed opacity-90">{diagnosisResult.reasoning}</p>
              </div>

              {/* Prescription */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-700 font-bold mb-2">
                  <Pill size={18} className="text-emerald-600" />
                  <h3>پیشنهاد درمانی (Empiric)</h3>
                </div>
                <div className="bg-emerald-50 text-emerald-900 p-3 rounded-xl text-sm font-medium border border-emerald-100">
                  {diagnosisResult.prescription_suggestion}
                </div>
              </div>

              {/* Media Recommendation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm ring-2 ring-blue-100">
                <div className="flex items-center gap-2 text-slate-700 font-bold mb-4">
                  <FlaskConical size={18} className="text-blue-600" />
                  <h3>محیط کشت پیشنهادی</h3>
                </div>

                {/* Standard Option */}
                <div className="mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">گزینه استاندارد (Gold Standard)</span>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <h4 className="font-bold text-blue-800">{diagnosisResult.media_recommendation.standard.name}</h4>
                    <p className="text-xs text-blue-600 mt-1">{diagnosisResult.media_recommendation.standard.description}</p>
                  </div>
                </div>

                {/* Emergency Option */}
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">گزینه اضطراری (Emergency/Handmade)</span>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <h4 className="font-bold text-orange-800">{diagnosisResult.media_recommendation.emergency.name}</h4>
                    <p className="text-xs text-orange-700 mt-1 font-mono leading-relaxed">
                      دستورالعمل: {diagnosisResult.media_recommendation.emergency.recipe}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Placeholder State
            <div className="h-64 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Brain size={48} className="mb-4 opacity-20" />
              <p className="font-medium">منتظر داده‌های بیمار...</p>
              <p className="text-xs mt-2 opacity-70">علائم حیاتی و شرح حال را وارد کنید تا هوش مصنوعی پردازش را آغاز کند.</p>
            </div>
          )}

          {/* Quick Chat for Consultation */}
          <div className="mt-4">
            <LiveVoiceAssistant initialContext={getContextString()} persona="clinical" />
          </div>
        </div>
      </div>
    </div>
  );
};

const LiveLabModule = () => {
  const [active, setActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [volume, setVolume] = useState(0); 
  const [isMotionDetected, setIsMotionDetected] = useState(false); 

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const frameIntervalRef = useRef<number | null>(null);
  const sessionRef = useRef<any>(null);
  
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const lastSendTimeRef = useRef<number>(0);
  const volumeRef = useRef<number>(0); 

  const detectMotion = (ctx: CanvasRenderingContext2D, width: number, height: number): boolean => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let score = 0;
    
    if (prevFrameDataRef.current && prevFrameDataRef.current.length === data.length) {
       for (let i = 0; i < data.length; i += 32) { 
          const diff = Math.abs(data[i] - prevFrameDataRef.current[i]);
          if (diff > 30) score++;
       }
    }
    prevFrameDataRef.current = new Uint8ClampedArray(data);
    const threshold = (data.length / 32) * 0.02; 
    return score > threshold;
  };

  const initAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: AUDIO_OUTPUT_SAMPLE_RATE,
        latencyHint: 'interactive', 
      });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: AUDIO_INPUT_SAMPLE_RATE,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setStatus('error');
      return null;
    }
  };

  const connectToGemini = async () => {
    const ctx = initAudioContext();
    const stream = await startLocalStream();
    if (!stream) return;

    setStatus('connecting');
    setActive(true);

    try {
      const model = 'gemini-2.5-flash-native-audio-preview-09-2025'; 
      
      // GET FRESH CLIENT FOR LOAD BALANCING
      const aiClient = aiService.getLiveClient();

      const sessionPromise = aiClient.live.connect({
        model: model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `شما "دکتر اعظم" هستید، همکار متخصص میکروبیولوژیست.
          1. **شروع فوری:** به محض اتصال، سلام کن و بگو "سلام دکتر! آماده‌ام. چه خبر؟".
          2. **درک محیطی:** اگر چهره دیدی احوالپرسی کن. اگر پلیت دیدی، نظر فنی بده.
          3. **شخصیت:** همکار، شوخ‌طبع، رند و سریع.
          4. **نکته:** کوتاه حرف بزن. اگر کاربر حرف زد، ساکت شو.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            
            sessionPromise.then(s => {
              sessionRef.current = s;
            });

            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              // Safety Guard
              if (!sessionRef.current || !micOn) return; 

              const inputData = e.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for(let i=0; i<inputData.length; i+=100) sum += Math.abs(inputData[i]);
              const v = Math.min(100, (sum / (inputData.length/100)) * 500);
              setVolume(v);
              volumeRef.current = v;

              const pcmData = floatTo16BitPCM(inputData);
              const uint8 = new Uint8Array(pcmData.buffer);
              const base64 = arrayBufferToBase64(uint8.buffer);

              sessionPromise.then(session => {
                if (sessionRef.current === session) {
                  try {
                    session.sendRealtimeInput({
                      media: {
                        mimeType: "audio/pcm;rate=16000",
                        data: base64
                      }
                    });
                  } catch (err) {
                     console.warn("Failed to send video audio frame", err);
                  }
                }
              }).catch(() => {});
            };
            
            source.connect(processor);
            processor.connect(ctx.destination);
            processorRef.current = processor;
            sourceRef.current = source;

            frameIntervalRef.current = window.setInterval(() => {
              if (!sessionRef.current || !cameraOn || !videoRef.current || !canvasRef.current) return;
              
              const video = videoRef.current;
              const canvas = canvasRef.current;
              const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
              
              if (video.readyState === video.HAVE_ENOUGH_DATA && ctx2d) {
                const sendWidth = video.videoWidth / 3;
                const sendHeight = video.videoHeight / 3;
                
                canvas.width = sendWidth;
                canvas.height = sendHeight;
                ctx2d.drawImage(video, 0, 0, sendWidth, sendHeight);
                
                const hasMotion = detectMotion(ctx2d, sendWidth, sendHeight);
                setIsMotionDetected(hasMotion);

                const now = Date.now();
                const timeSinceLast = now - lastSendTimeRef.current;
                const isSpeaking = volumeRef.current > 10; 
                
                let shouldSend = false;

                if ((hasMotion || isSpeaking) && timeSinceLast > 1000) {
                   shouldSend = true;
                } else if (timeSinceLast > 3000) {
                   shouldSend = true;
                }

                if (shouldSend) {
                    const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                    sessionPromise.then(session => {
                      if (sessionRef.current === session) {
                        try {
                          session.sendRealtimeInput({
                            media: {
                              mimeType: "image/jpeg",
                              data: base64Data
                            }
                          });
                          lastSendTimeRef.current = now;
                        } catch (err) {
                           console.warn("Failed to send video frame", err);
                        }
                      }
                    }).catch(() => {});
                }
              }
            }, 200); 
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.interrupted) {
              audioQueueRef.current.forEach(source => {
                try { source.stop(); } catch(e) {}
              });
              audioQueueRef.current = [];
              if (audioContextRef.current) {
                  nextStartTimeRef.current = audioContextRef.current.currentTime;
              }
              return;
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              const audioBytes = base64ToUint8Array(audioData);
              const dataInt16 = new Int16Array(audioBytes.buffer);
              const float32 = new Float32Array(dataInt16.length);
              for (let i = 0; i < dataInt16.length; i++) {
                float32[i] = dataInt16[i] / 32768.0;
              }
              
              const buffer = ctx.createBuffer(1, float32.length, AUDIO_OUTPUT_SAMPLE_RATE);
              buffer.getChannelData(0).set(float32);
              
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              
              const currentTime = ctx.currentTime;
              const startTime = Math.max(currentTime, nextStartTimeRef.current);
              source.start(startTime);
              nextStartTimeRef.current = startTime + buffer.duration;
              
              audioQueueRef.current.push(source);
              source.onended = () => {
                const index = audioQueueRef.current.indexOf(source);
                if (index > -1) audioQueueRef.current.splice(index, 1);
              };
            }
          },
          onclose: () => {
            setStatus('disconnected');
            setActive(false);
            sessionRef.current = null;
          },
          onerror: (err) => {
            console.error("Session error:", err);
            setStatus('error');
            setActive(false);
            sessionRef.current = null;
          }
        }
      });

    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const stopSession = () => {
    // 0. Immediate Session Ref clear
    sessionRef.current = null;
    
    setActive(false);
    setStatus('disconnected');
    
    // 1. Stop Media Tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 2. Disconnect Audio Nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // 3. Strictly Close Audio Context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.error(e));
      audioContextRef.current = null;
    }
    
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }
    
    audioQueueRef.current.forEach(source => source.stop());
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Microscope className="text-blue-600" />
            آزمایشگاه زنده
          </h2>
          <p className="text-slate-500 text-sm mt-1">نظارت هوشمند و دستیار صوتی لحظه‌ای</p>
        </div>
        
        {status === 'connected' && (
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
               <Eye size={14} className={isMotionDetected ? "text-green-600" : "text-yellow-500"} />
               <span className="text-[10px] font-bold text-slate-600">
                 {isMotionDetected ? "ارسال فعال (1 FPS)" : "صرفه‌جویی (0.3 FPS)"}
               </span>
               <div className={`w-2 h-2 rounded-full ${isMotionDetected ? "bg-green-500 animate-pulse" : "bg-yellow-400"}`}></div>
             </div>

             <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full animate-pulse">
               <div className="w-2 h-2 bg-green-600 rounded-full"></div>
               <span className="text-xs font-bold">ارتباط برقرار است</span>
             </div>
          </div>
        )}
      </header>

      <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-xl border border-slate-300 group">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-opacity duration-500 ${cameraOn ? 'opacity-100' : 'opacity-0'}`}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white z-10">
            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6 border border-slate-700">
              <Camera size={40} className="text-slate-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">دوربین غیرفعال است</h3>
            <p className="text-slate-400 text-sm max-w-md text-center px-4 mb-8">
              برای شروع نظارت هوشمند و دریافت مشاوره صوتی، ارتباط با دستیار را برقرار کنید.
            </p>
            <button 
              onClick={connectToGemini}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-blue-900/50 flex items-center gap-2"
            >
              <Power size={20} />
              شروع دستیار هوشمند
            </button>
          </div>
        )}

        {status === 'connecting' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-white font-medium">در حال برقراری ارتباط ایمن...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center z-20">
            <AlertCircle size={48} className="text-red-200 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">خطا در اتصال</h3>
            <p className="text-red-200 text-sm mb-6">دسترسی به دوربین/میکروفون را بررسی کنید</p>
            <button 
              onClick={() => { setStatus('disconnected'); setActive(false); }}
              className="bg-white text-red-900 px-6 py-2 rounded-lg font-bold hover:bg-red-50"
            >
              بازگشت
            </button>
          </div>
        )}

        {active && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-between z-10">
            
            <div className="flex items-center gap-4">
               <div className="flex flex-col">
                 <div className="flex items-center gap-2 mb-1">
                   <div className={`w-2 h-2 rounded-full ${micOn ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                   <span className="text-xs text-slate-300 font-mono">MIC INPUT</span>
                 </div>
                 <div className="flex items-end gap-0.5 h-8">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1.5 rounded-sm transition-all duration-100 ${volume > i * 20 ? 'bg-blue-500' : 'bg-slate-700'}`}
                        style={{ height: volume > i * 20 ? `${Math.max(20, Math.random() * 100)}%` : '20%' }}
                      ></div>
                    ))}
                 </div>
               </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMicOn(!micOn)}
                disabled={status !== 'connected'}
                className={`p-4 rounded-full backdrop-blur-md transition-all ${
                  micOn ? 'bg-slate-800/50 text-white hover:bg-slate-700/50' : 'bg-red-500/80 text-white hover:bg-red-600/80'
                }`}
              >
                {micOn ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              
              <button 
                onClick={() => setCameraOn(!cameraOn)}
                disabled={status !== 'connected'}
                className={`p-4 rounded-full backdrop-blur-md transition-all ${
                  cameraOn ? 'bg-slate-800/50 text-white hover:bg-slate-700/50' : 'bg-red-500/80 text-white hover:bg-red-600/80'
                }`}
              >
                {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>

              <button 
                onClick={stopSession}
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-900/50"
              >
                <Power size={24} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
         <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
           <Zap size={20} />
         </div>
         <div>
           <h4 className="font-bold text-slate-800 text-sm">سیستم هوشمند Adaptive Vision</h4>
           <p className="text-xs text-slate-500 mt-1">
             سیستم به صورت خودکار تشخیص می‌دهد که چه زمانی در حال کار هستید.
             <br/>
             در زمان سکون (عدم حرکت)، ارسال تصویر کاهش می‌یابد تا اینترنت و توکن کمتری مصرف شود (صرفه‌جویی ۸۰٪).
           </p>
         </div>
      </div>
    </div>
  );
};
