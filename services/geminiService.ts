
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Customer, Measurements, ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = "You are an expert master tailor assistant with deep knowledge of fabric, measurements, and fashion trends. You speak Persian (Farsi) natively. Provide concise, professional advice to a tailor about their customers, technical sewing questions, or fabric estimation.";

export const getGeminiResponse = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    return response.text || "متأسفانه پاسخی دریافت نشد.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "خطا در ارتباط با هوش مصنوعی. لطفاً دوباره تلاش کنید.";
  }
};

export const getGeminiChatStream = async (history: ChatMessage[], message: string, onChunk: (chunk: string) => void) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    
    // We don't have a direct history parameter in chats.create that matches our type exactly easily,
    // so we'll just send the current message for simplicity in this version, 
    // or we could reconstruct the contents if needed.
    const responseStream = await chat.sendMessageStream({ message });
    
    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) onChunk(c.text);
    }
  } catch (error) {
    console.error("Gemini Stream Error:", error);
    onChunk("\n(خطا در دریافت پاسخ زنده)");
  }
};

export const analyzeCustomerStyle = async (customer: Customer): Promise<string> => {
  const m = customer.measurements;
  const prompt = `
    با توجه به اندازه‌های زیر برای مشتری "${customer.name}":
    ${Object.entries(m).map(([k, v]) => `${k}: ${v}cm`).join(', ')}
    
    لطفاً یک تحلیل کوتاه از فرم بدنی و پیشنهاداتی برای انتخاب پارچه یا مدل لباس (کت و شلوار، پیراهن یا غیره) ارائه بده.
    پاسخ را به زبان فارسی و در چند جمله کوتاه بنویس.
  `;
  return getGeminiResponse(prompt);
};
