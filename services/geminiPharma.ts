
import { GoogleGenAI, Type } from "@google/genai";
import { PharmaInventoryItem } from "../types";

/**
 * PHARMA AI CORE v2.1
 * Specialized for Prescription-to-Inventory Mapping.
 */

async function callPharmaProxy(payload: { model: string; contents: any[]; config?: any }): Promise<any> {
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pharma AI Proxy Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (data && data.candidates && !data.text) {
      data.text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || "";
    }
    return data;
  } catch (error) {
    console.error("Pharma AI Call Failed:", error);
    throw error;
  }
}

const fileToPart = async (file: File | Blob) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve({ inlineData: { data: base64String, mimeType: file.type || 'image/jpeg' } });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * analyzeAndMatchPrescription
 * OCR extracts drug names and prepares them for the dial picker.
 */
export const analyzeAndMatchPrescription = async (image: File, inventory: PharmaInventoryItem[], language: string = 'fa') => {
  const imgPart = await fileToPart(image);
  
  // Provide only unique generic names to the model to reduce token usage and focus on identification
  const uniqueGenerics = Array.from(new Set(inventory.map(i => i.generic_name)));

  const prompt = `
    Act as an expert Pharmaceutical Identification Officer.
    
    TASK:
    1. Scan the prescription image and identify ALL drug items (Name, Form, Strength).
    2. For each identified drug, find the most accurate MATCH from this list of generic names we have in stock:
       ${uniqueGenerics.join(', ')}
    
    3. Return a list of identified items.
    
    RETURN RAW JSON ONLY (No Markdown):
    {
      "quotation": [
        {
          "originalText": "Transcription from image",
          "matchedGeneric": "One of the provided Generic Names",
          "selectedBrand": "Suggest the best brand for this generic from common knowledge",
          "qty": "Quantity like N=20",
          "unitPrice": 0,
          "totalPrice": 0
        }
      ]
    }
  `;

  const response = await callPharmaProxy({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [imgPart, { text: prompt }] }],
    config: { 
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json"
    }
  });

  try {
    const text = response.text || "";
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    console.error("Quotation AI Parse Error", e);
    return null;
  }
};
