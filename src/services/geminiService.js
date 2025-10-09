import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIFetchError } from '@google/generative-ai';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const generateAiResponse = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            return text;
        } catch (error) {
            attempt++;

            if (error instanceof GoogleGenerativeAIFetchError && error.status === 503 && attempt < maxRetries) {
                const delayTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                console.warn(`[Gemini Service] Model overload (503). Mencoba lagi dalam ${Math.round(delayTime / 1000)} detik... (Percobaan ${attempt}/${maxRetries})`);
                await delay(delayTime);
            } else {

                console.error(`Error di geminiService setelah ${attempt} percobaan:`, error);
                const errorMessage = error.message || "Gagal berkomunikasi dengan AI.";
                throw new Error(errorMessage);
            }
        }
    }

    throw new Error(`Gagal berkomunikasi dengan AI setelah ${maxRetries} percobaan.`);
};