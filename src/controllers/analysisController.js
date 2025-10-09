import admin from '../config/firebase.js';
import { generateAiResponse } from '../services/geminiService.js';
import { PDFExtract } from 'pdf.js-extract';

const db = admin.firestore();
import mammoth from 'mammoth';
const GUEST_USAGE_LIMIT = 5;

export const handleAnalysisRequest = async (req, res) => {
    console.log('[Analysis] Menerima permintaan analisis baru...');

    if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const userId = req.user.uid;
    const isGuest = req.user.isGuest;

    console.log(`[Analysis] UserID: ${userId}, isGuest: ${isGuest}`);

    if (isGuest) {
        const usageDocRef = db.collection('guestUsage').doc(userId);
        const usageDoc = await usageDocRef.get();

        if (!usageDoc.exists) {

            await usageDocRef.set({ count: 1, firstRequestAt: new Date() });
        } else {
            const newCount = (usageDoc.data().count || 0) + 1;
            if (newCount > GUEST_USAGE_LIMIT) {
                return res.status(429).send({ message: 'Batas penggunaan tamu tercapai. Silakan Sign In untuk melanjutkan.' });
            }
            await usageDocRef.update({ count: newCount });
        }
    }

    try {

        const file = req.file;
        console.log(`[Analysis] Memproses file: ${file.originalname} (${file.mimetype})`);

        let documentText = '';
        if (file.mimetype === 'application/pdf') {
            const pdfExtract = new PDFExtract();

            const data = await pdfExtract.extractBuffer(file.buffer, {});
            console.log('[Analysis] Ekstraksi teks dari PDF selesai.');
            documentText = data.pages.map(page => page.content.map(item => item.str).join(' ')).join('\n\n');
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {

            const { value } = await mammoth.extractRawText({ buffer: file.buffer });
            console.log('[Analysis] Ekstraksi teks dari DOCX selesai.');
            documentText = value;
        } else {
            console.error(`[Analysis] Format file tidak didukung: ${file.mimetype}`);
            return res.status(400).json({ message: 'Format file tidak didukung. Harap unggah PDF atau DOCX.' });
        }

        if (!documentText.trim()) {
            console.error('[Analysis] Teks dari dokumen kosong setelah ekstraksi.');
            return res.status(500).json({ message: 'Gagal mengekstrak teks dari dokumen. File mungkin kosong atau rusak.' });
        }
        console.log(`[Analysis] Teks berhasil diekstrak, panjang: ${documentText.length}. Mengirim ke AI...`);


        const analysisPrompt = `
        Analisis dokumen akademik berikut secara komprehensif. Berdasarkan teks, ekstrak informasi berikut dan berikan jawaban dalam format JSON yang valid dan HANYA JSON.
        Pastikan semua nilai (value) dalam JSON adalah string atau array of strings.

        JSON harus memiliki kunci berikut:
        - "title" (string): Judul utama dari paper. Jika tidak ditemukan, isi dengan "Judul Tidak Ditemukan".
        - "authors" (array of strings): Daftar nama-nama penulis. Jika tidak ditemukan, isi dengan array kosong [].
        - "publication" (string): Nama jurnal atau tempat publikasi, termasuk volume dan tahun jika ada. Jika tidak ada, isi string kosong.
        - "summary" (string): Rangkuman abstrak (abstractive summary) dari seluruh paper dalam 3-5 kalimat yang koheren. Jika tidak ada, isi string kosong "".
        - "keyPoints" (array of strings): 3 sampai 5 poin paling penting atau temuan utama dari paper. Jika tidak ada, isi array kosong [].
        - "methodology" (string): Penjelasan singkat tentang metodologi penelitian yang digunakan. Jika tidak ada, isi string kosong "".
        - "keywords" (array of strings): Ekstrak kata kunci dari abstrak atau bagian pendahuluan. Jika tidak ada, isi array kosong [].
        - "references" (array of strings): Ekstrak 5-10 referensi utama dari daftar pustaka. Format setiap string sebagai "Penulis (Tahun) Judul". Jika tidak ada, isi array kosong [].

        Teks Dokumen: """${documentText}"""
        `;

        const aiJsonResponse = await generateAiResponse(analysisPrompt);
        console.log('[Analysis] Menerima respons dari AI.');


        let analysisResult;
        try {

            const cleanedJsonString = aiJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            if (!cleanedJsonString) {
                throw new Error("Respons AI kosong setelah dibersihkan.");
            }
            analysisResult = JSON.parse(cleanedJsonString);
        } catch (parseError) {

            console.error("Gagal mem-parsing JSON dari AI:", parseError, "Respons mentah:", aiJsonResponse);

            return res.status(500).json({ status: 'error', message: 'Gagal memproses hasil analisis dari AI. Coba lagi dengan dokumen yang berbeda.' });
        }

        console.log('[Analysis] Berhasil mem-parsing JSON dari AI. Menyimpan ke Firestore...');
        const createdAtTimestamp = new Date();

        const docRef = await db.collection('users').doc(userId).collection('chats').add({
            ...analysisResult,
            originalFileName: file.originalname,
            createdAt: createdAtTimestamp,
        });

        console.log(`[Analysis] Berhasil menyimpan ke Firestore dengan chatId: ${docRef.id}. Mengirim respons ke frontend...`);


        const responseData = { ...analysisResult, createdAt: createdAtTimestamp.toISOString() };

        res.json({
            status: 'success',
            chatId: docRef.id,
            analysis: responseData
        });

    } catch (error) {
        console.error("Analysis Controller Error:", error);
        res.status(500).json({ status: 'error', message: 'Gagal menganalisis dokumen. Respons dari AI mungkin tidak valid.' });
    }
};
