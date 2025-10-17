import admin from '../config/firebase.js';
import { generateAiResponse } from '../services/geminiService.js';
import { PDFExtract } from 'pdf.js-extract';
import mammoth from 'mammoth';

const db = admin.firestore();

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
            return res.status(422).json({ message: 'Kami tidak dapat menemukan teks di dalam dokumen Anda. Mohon pastikan file tersebut bukan dokumen hasil pindaian (scan), tidak kosong, dan tidak terproteksi.' });
        }
        console.log(`[Analysis] Teks berhasil diekstrak, panjang: ${documentText.length}. Mengirim ke AI...`);


        const analysisPrompt = `
        Tugas Anda adalah menganalisis dokumen akademik. Pertama, tentukan apakah teks berikut adalah sebuah jurnal penelitian primer (dokumen asli) atau hanya sebuah laporan/rangkuman tentang sebuah jurnal.
        Kemudian, ekstrak informasi berikut dan berikan jawaban dalam format JSON yang valid dan HANYA JSON.
        Pastikan semua nilai (value) dalam JSON adalah string atau array of strings.

        JSON harus memiliki kunci berikut:
        - "isPrimarySource" (boolean): Setel ke 'true' jika ini adalah jurnal penelitian asli, dan 'false' jika ini hanyalah laporan, ringkasan, atau hasil analisis dari dokumen lain.
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

        const { text: aiJsonResponse, usageMetadata } = await generateAiResponse(analysisPrompt);
        console.log('[Analysis] Menerima respons dari AI.');


        let analysisResult;
        try {
            // Pastikan aiJsonResponse adalah string sebelum memprosesnya.
            // Terkadang, jika ada masalah dengan respons AI, ini bisa menjadi undefined atau bukan string.
            if (typeof aiJsonResponse !== 'string') {
                console.error("Respons dari AI bukan string, melainkan:", typeof aiJsonResponse, aiJsonResponse);
                throw new Error("Menerima tipe data yang tidak valid dari layanan AI.");
            }

            const cleanedJsonString = aiJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            if (!cleanedJsonString) {
                throw new Error("Respons AI kosong setelah dibersihkan.");
            }
            analysisResult = JSON.parse(cleanedJsonString);
        } catch (parseError) { // Mengganti nama variabel error agar lebih spesifik

            console.error("Gagal mem-parsing JSON dari AI:", parseError, "Respons mentah:", `"${aiJsonResponse}"`);

            return res.status(500).json({ status: 'error', message: 'Gagal memproses hasil analisis dari AI. Coba lagi dengan dokumen yang berbeda.' });
        }
        if (analysisResult.isPrimarySource === false) {
            console.log('[Analysis] Dokumen ditolak karena bukan sumber primer (kemungkinan hasil analisis sebelumnya).');
            return res.status(422).json({ message: 'Dokumen ini tampaknya merupakan hasil analisis, bukan jurnal penelitian asli. Mohon unggah dokumen jurnal yang sebenarnya.' });
        }

        console.log('[Analysis] Berhasil mem-parsing JSON dari AI. Menyimpan ke Firestore...');
        const createdAtTimestamp = new Date();

        const docRef = await db.collection('users').doc(userId).collection('chats').add({
            ...analysisResult,
            originalFileName: file.originalname,
            initialTokenUsage: usageMetadata, // Menyimpan informasi penggunaan token awal
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
        // Memberikan pesan error yang lebih spesifik jika memungkinkan
        const errorMessage = error.message.includes("AI")
            ? error.message
            : 'Terjadi kesalahan internal saat memproses dokumen Anda.';
        res.status(500).json({ status: 'error', message: errorMessage });
    }
};
