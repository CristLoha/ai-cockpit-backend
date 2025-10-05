import { GoogleGenerativeAI } from '@google/generative-ai';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


export const generateAiResponse = async (prompt) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error("Error di geminiService (paket @google/genai):", error);
        const errorMessage = error.message || "Gagal berkomunikasi dengan AI.";
        throw new Error(errorMessage);
    }
};