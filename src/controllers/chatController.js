import { generateAiResponse } from '../services/geminiService.js';
import { PDFExtract } from 'pdf.js-extract';
import { createRequire } from 'node:module';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';

const require = createRequire(import.meta.url);
const mammoth = require('mammoth');

export const handleChatRequest = async (req, res) => {

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah. Harap sertakan file di field `documents`.' });
    }

    const tempFilePaths = [];

    try {
        const { userQuestion } = req.body;
        if (!userQuestion) {
            return res.status(400).json({ message: 'Pertanyaan (`userQuestion`) dibutuhkan.' });
        }

        let combinedDocumentText = '';
        await fs.mkdir('temp_uploads', { recursive: true });


        for (const file of req.files) {
            const tempFilePath = path.join('temp_uploads', Date.now() + '-' + file.originalname);
            tempFilePaths.push(tempFilePath);
            await fs.writeFile(tempFilePath, file.buffer);

            let documentText = '';

            if (file.mimetype === 'application/pdf') {
                const pdfExtract = new PDFExtract();
                const data = await pdfExtract.extract(tempFilePath, {});
                documentText = data.pages.map(page => page.content.map(item => item.str).join(' ')).join('\n\n');
            } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const { value } = await mammoth.extractRawText({ path: tempFilePath });
                documentText = value;
            } else {
                console.log(`Format file ${file.originalname} tidak didukung dan dilewati.`);
                continue;
            }


            const classificationPrompt = `
            Analisis teks awal dari dokumen berikut dan klasifikasikan jenisnya.
            Cari petunjuk struktural: 'Jurnal' memiliki nama jurnal, volume, DOI. 'Skripsi' atau 'Tesis' memiliki frasa 'skripsi', 'tesis', atau nama universitas di halaman judul. 'Buku' memiliki ISBN.
            Teks Dokumen: """${documentText.substring(0, 4000)}"""
            Klasifikasikan sebagai: 'Jurnal', 'Skripsi', 'Buku', atau 'Lainnya'. Jawab HANYA dengan satu kata.`;

            const classificationResult = await generateAiResponse(classificationPrompt);
            const classification = classificationResult.trim();
            console.log(`AI Classification for ${file.originalname}: ${classification}`);


            if (classification !== 'Jurnal') {
                console.log(`File ${file.originalname} dideteksi sebagai ${classification} dan dilewati.`);
                continue;
            }


            combinedDocumentText += `\n\n--- DOKUMEN: ${file.originalname} ---\n\n${documentText}\n\n`;
        }


        if (!combinedDocumentText.trim()) {
            return res.status(400).json({ message: 'Tidak ada Jurnal/Paper yang valid terdeteksi dari file yang diunggah. Coba file lain.' });
        }


        const masterPrompt = `
**Peran dan Tujuan:**
Anda adalah asisten riset AI yang sangat ahli. Tugas Anda adalah menjawab pertanyaan pengguna secara akurat berdasarkan gabungan teks dari beberapa jurnal yang disediakan.

**Instruksi Penting:**
1.  **Fokus pada Sumber:** Jawab pertanyaan HANYA berdasarkan informasi yang ada di dalam "Teks Dokumen untuk Dianalisis" di bawah ini.
2.  **Sebutkan Sumber:** Jika memungkinkan dan relevan, sebutkan dari jurnal mana (nama file) informasi tersebut berasal.
3.  **Jika Tidak Ada:** Jika jawaban tidak dapat ditemukan, nyatakan dengan jelas bahwa "Informasi tidak tersedia dalam dokumen yang diberikan."

**--- Teks Dokumen untuk Dianalisis ---**
"""${combinedDocumentText}"""

**--- Pertanyaan Pengguna ---**
"${userQuestion}"`;

        const aiTextResponse = await generateAiResponse(masterPrompt);
        res.json({ status: 'success', answer: aiTextResponse });

    } catch (error) {
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'Salah satu file melebihi batas maksimal 5 MB.' });
            }
            if (error.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({ message: 'Terlalu banyak file. Maksimal 5 file.' });
            }
        }
        console.error("Controller Error:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Terjadi kesalahan internal.' });
    } finally {

        for (const filePath of tempFilePaths) {
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                if (cleanupError.code !== 'ENOENT') {
                    console.error(`Gagal menghapus file sementara: ${filePath}`, cleanupError);
                }
            }
        }
    }
};