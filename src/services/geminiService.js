import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIFetchError } from '@google/generative-ai';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const generateAiResponse = async (prompt) => {
    // Mengambil nama model dari environment variable, dengan 'gemini-2.5-flash' sebagai default.
    // Menerapkan fleksibilitas ini memungkinkan penggantian model (misal: ke versi Pro) melalui file .env tanpa mengubah kode.
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            console.log(`[Gemini Service] Mencoba membuat konten dengan model: ${modelName} (Percobaan ${attempt + 1})`);
            const result = await model.generateContent(prompt);
            const response = result.response;

            // Mengekstrak metadata penggunaan token untuk keperluan logging dan analisis biaya.
            const usageMetadata = response.usageMetadata;
            if (usageMetadata) {
                console.log(`[Gemini Service] Penggunaan Token: ${usageMetadata.totalTokenCount} (Prompt: ${usageMetadata.promptTokenCount}, Kandidat: ${usageMetadata.candidatesTokenCount})`);
            }

            // Pengecekan keamanan untuk memastikan response.text() adalah fungsi yang valid
            if (typeof response.text !== 'function') {
                console.error("[Gemini Service] Respons dari AI tidak memiliki fungsi text(). Respons:", JSON.stringify(response));
                throw new Error("Menerima format respons yang tidak valid dari AI.");
            }

            const text = response.text(); // Ini akan mengembalikan string
            return { text, usageMetadata };
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