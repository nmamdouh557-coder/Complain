import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedComplaint {
  customerPhone?: string;
  customerName?: string;
  brand?: string;
  branch?: string;
  platform?: string;
  orderId?: string;
  dateTime?: string;
  complaintSource?: string;
  title?: string;
  caseType?: string;
  item?: string;
  notes?: string;
}

export const geminiService = {
  extractComplaintDetails: async (text: string): Promise<ExtractedComplaint | null> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract complaint details from the following text. 
        
        IMPORTANT: If the user provides information as a list of values without explicit labels (e.g., just saying a phone number, then a name, then a brand), you MUST map them to fields based on this sequential order:
        1. customerPhone (Phone Number)
        2. customerName (Full Name)
        3. brand
        4. branch
        5. platform
        6. orderId
        7. dateTime
        8. status
        9. complaintSource
        10. title
        11. caseType
        12. item
        13. notes

        Text:
        ${text}
        
        Current Date/Time (for reference): ${new Date().toLocaleString()}
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              customerPhone: { type: Type.STRING, description: "Customer phone number" },
              customerName: { type: Type.STRING, description: "Customer full name" },
              brand: { type: Type.STRING, description: "Brand name (e.g. Yelo, etc.)" },
              branch: { type: Type.STRING, description: "Branch name" },
              platform: { type: Type.STRING, description: "Ordering platform (e.g. Deliveroo, Talabat, etc.)" },
              orderId: { type: Type.STRING, description: "Order ID or Reference number" },
              dateTime: { type: Type.STRING, description: "Incident date and time in ISO format if possible" },
              complaintSource: { type: Type.STRING, description: "Source of complaint (e.g. Call, WhatsApp, etc.)" },
              title: { type: Type.STRING, description: "General category of the complaint" },
              caseType: { type: Type.STRING, description: "Specific case type" },
              item: { type: Type.STRING, description: "Item or product mentioned" },
              notes: { type: Type.STRING, description: "Detailed notes about the complaint" },
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text.trim());
      }
      return null;
    } catch (error) {
      console.error("Gemini extraction error:", error);
      return null;
    }
  },

  processVoiceComplaint: async (base64Audio: string, mimeType: string): Promise<ExtractedComplaint | null> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: `Listen to this voice recording of a customer complaint and extract the details. 
            
            IMPORTANT: If the user lists values or mentions items sequentially without explicit labels (e.g., says a phone number, then a name, then a brand), you MUST map them based on the standard form order:
            1. customerPhone (Phone Number)
            2. customerName (Full Name)
            3. brand
            4. branch
            5. platform
            6. orderId
            7. dateTime
            8. status
            9. complaintSource
            10. title
            11. caseType
            12. item
            13. notes

            Current Date/Time (for reference): ${new Date().toLocaleString()}
            `
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              customerPhone: { type: Type.STRING, description: "Customer phone number" },
              customerName: { type: Type.STRING, description: "Customer full name" },
              brand: { type: Type.STRING, description: "Brand name" },
              branch: { type: Type.STRING, description: "Branch name" },
              platform: { type: Type.STRING, description: "Ordering platform" },
              orderId: { type: Type.STRING, description: "Order ID" },
              dateTime: { type: Type.STRING, description: "Incident date and time" },
              complaintSource: { type: Type.STRING, description: "Source of complaint" },
              title: { type: Type.STRING, description: "General category" },
              caseType: { type: Type.STRING, description: "Specific case type" },
              item: { type: Type.STRING, description: "Item mentioned" },
              notes: { type: Type.STRING, description: "Detailed notes" },
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text.trim());
      }
      return null;
    } catch (error) {
      console.error("Gemini voice processing error:", error);
      return null;
    }
  },

  improveText: async (text: string): Promise<string | null> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Act as a professional customer service quality assurance specialist. 
        Your task is to fix grammar, spelling, and improve the professional tone of the following customer complaint internal notes. 
        Keep the meaning the same but make it professional, clear, and objective. 
        If the text is in Arabic, correct its grammar and style. If in English, fix its grammar and spelling.
        
        Text to improve:
        "${text}"
        
        Return ONLY the improved text, nothing else. No introductions or explanations.`,
      });

      return response.text?.trim() || null;
    } catch (error) {
      console.error("Gemini text improvement error:", error);
      return null;
    }
  },

  translateText: async (text: string, targetLang: 'English' | 'Arabic'): Promise<string | null> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Act as a professional translator. 
        Translate the following text to ${targetLang}. 
        Maintain the professional tone and ensure the meaning is preserved perfectly.
        
        Text to translate:
        "${text}"
        
        Return ONLY the translated text, nothing else.`,
      });

      return response.text?.trim() || null;
    } catch (error) {
      console.error("Gemini translation error:", error);
      return null;
    }
  }
};
