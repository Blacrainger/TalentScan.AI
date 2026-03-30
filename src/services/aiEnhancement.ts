import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * AI Enhancement service using Google Gemini.
 */
export class AiEnhancementService {
  /**
   * Extracts key skills from text.
   */
  async extractSkills(text: string): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY) return [];
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract a list of key professional skills from the following text. Return only the skills as a JSON array of strings.\n\nText: ${text.substring(0, 5000)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("AI Skill Extraction Error:", error);
      return [];
    }
  }

  /**
   * Generates a summary of a CV.
   */
  async summarizeCv(text: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) return "AI summary unavailable.";
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a concise 2-3 sentence professional summary of this candidate's CV.\n\nCV Text: ${text.substring(0, 5000)}`,
      });
      
      return response.text || "No summary generated.";
    } catch (error) {
      console.error("AI Summarization Error:", error);
      return "Error generating summary.";
    }
  }

  /**
   * Explains why a CV matches a job description.
   */
  async explainMatch(cvText: string, jdText: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) return "AI explanation unavailable.";
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Explain why this candidate's CV matches the job description. Highlight specific matched skills and experiences. Keep it brief.\n\nCV: ${cvText.substring(0, 3000)}\n\nJob Description: ${jdText.substring(0, 3000)}`,
      });
      
      return response.text || "No explanation generated.";
    } catch (error) {
      console.error("AI Explanation Error:", error);
      return "Error generating explanation.";
    }
  }
}
