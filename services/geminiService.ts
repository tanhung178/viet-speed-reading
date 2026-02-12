
import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Fix: Always use process.env.API_KEY directly for initialization as per guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  async generateQuiz(text: string): Promise<QuizQuestion[]> {
    const prompt = `Dựa trên văn bản sau đây, hãy tạo ra 3 câu hỏi trắc nghiệm tiếng Việt để kiểm tra mức độ hiểu bài. Mỗi câu hỏi có 4 lựa chọn.
    Văn bản: "${text}"`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Mảng gồm 4 lựa chọn"
                },
                correctAnswer: { 
                  type: Type.INTEGER,
                  description: "Chỉ số index của câu trả lời đúng (0-3)"
                }
              },
              required: ["question", "options", "correctAnswer"]
            }
          }
        }
      });

      // Fix: response.text is a property (getter), not a method; safely handle undefined
      const jsonStr = response.text?.trim();
      return jsonStr ? JSON.parse(jsonStr) : [];
    } catch (error) {
      console.error("Error generating quiz:", error);
      return [];
    }
  }

  async summarizeText(text: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy tóm tắt văn bản sau đây một cách ngắn gọn súc tích trong 2 câu: ${text}`,
    });
    // Fix: Access .text property directly as per guidelines
    return response.text || "Không thể tóm tắt văn bản này.";
  }
}

export const geminiService = new GeminiService();
