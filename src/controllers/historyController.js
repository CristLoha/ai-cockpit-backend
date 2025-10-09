import admin from '../config/firebase.js';
const db = admin.firestore();
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';



export const getChatHistory = async (req, res) => {
    try {
        const userId = req.user.uid;
        console.log(`[History] Mengambil riwayat untuk userId: ${userId}`);

        const chatsSnapshot = await db.collection('users').doc(userId).collection('chats').orderBy('createdAt', 'desc').get();

        console.log(`[History] Ditemukan ${chatsSnapshot.size} dokumen.`);

        if (chatsSnapshot.empty) {
            console.log('[History] Tidak ada riwayat, mengembalikan array kosong.');
            return res.json([]);

        }
        const history = chatsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Jika createdAt tidak ada, gunakan tanggal sekarang sebagai fallback
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            };
        });
        console.log('[History] Berhasil memetakan data riwayat. Mengirim respons...');
        res.json(history);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ message: 'Gagal mengambil riwayat percakapan.' });
    }
};

export const getChatMessages = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { chatId } = req.params;

        // 1. Ambil data dari "SAMPUL BUKU" (dokumen chat induk)
        const chatDocRef = db.collection('users').doc(userId).collection('chats').doc(chatId);
        const chatDoc = await chatDocRef.get();

        if (!chatDoc.exists) {
            return res.status(404).json({ message: "Chat tidak ditemukan." });
        }
        // Ini adalah data analisis lengkap: { title, summary, authors, dll }
        const analysisData = chatDoc.data();
        // PENTING: Ubah timestamp di data analisis, tambahkan pengecekan jika tidak ada
        if (analysisData.createdAt && analysisData.createdAt.toDate) {
            analysisData.createdAt = analysisData.createdAt.toDate().toISOString();
        }

        // 2. Ambil data dari "HALAMAN-HALAMAN BUKU" (sub-koleksi messages)
        const messagesSnapshot = await chatDocRef.collection('messages').orderBy('timestamp', 'asc').get();

        const messages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // PENTING: Ubah Firestore Timestamp menjadi ISO string, tambahkan pengecekan
                timestamp: data.timestamp && data.timestamp.toDate
                    ? data.timestamp.toDate().toISOString()
                    : new Date().toISOString(),
            };
        });

        // 3. GABUNGKAN KEDUANYA dalam satu respons JSON
        res.json({
            analysis: analysisData, // Kirim data analisis lengkap
            messages: messages      // Kirim daftar pesan Q&A
        });

    } catch (error) {
        console.error("Error mengambil pesan chat:", error);
        res.status(500).json({ message: "Gagal mengambil pesan chat." });
    }
};

export const exportAnalysis = async (req, res) => {
    console.log('[Export] Memulai proses ekspor...');
    try {
        const { chatId } = req.params;
        const { format } = req.query; // 'pdf' or 'docx'
        const userId = req.user.uid;

        console.log(`[Export] Request untuk chatId: ${chatId}, format: ${format}, userId: ${userId}`);

        if (!format || (format !== 'pdf' && format !== 'docx')) {
            console.error('[Export] Error: Format ekspor tidak valid.');
            return res.status(400).json({ message: 'Format ekspor tidak valid. Gunakan "pdf" atau "docx".' });
        }

        // 1. Ambil data analisis dari Firestore
        console.log('[Export] Mengambil data dari Firestore...');
        const chatDocRef = db.collection('users').doc(userId).collection('chats').doc(chatId);
        const chatDoc = await chatDocRef.get();

        if (!chatDoc.exists) {
            return res.status(404).json({ message: "Analisis tidak ditemukan." });
        }
        // Ambil data secara eksplisit untuk menghindari field yang tidak diinginkan seperti timestamp
        console.log('[Export] Berhasil mengambil data analisis dari Firestore.');
        const rawData = chatDoc.data();
        const analysis = {
            title: rawData.title,
            authors: rawData.authors,
            publication: rawData.publication,
            summary: rawData.summary,
            keyPoints: rawData.keyPoints,
            methodology: rawData.methodology,
            keywords: rawData.keywords,
            references: rawData.references,
            originalFileName: rawData.originalFileName
        };

        // Ambil juga riwayat Q&A
        const messagesSnapshot = await chatDocRef.collection('messages').orderBy('timestamp', 'asc').get();
        const messages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return { sender: data.sender, text: data.text };
        });

        console.log(`[Export] Data siap untuk dibuat dokumen. Judul: ${analysis.title}`);
        console.log(`[Export] Ditemukan ${messages.length} pesan Q&A.`);

        const safeTitle = (analysis.title || 'Untitled').replace(/[^a-z0-9]/gi, '_').slice(0, 50);
        const fileName = `${safeTitle}.${format}`;

        // 2. Set header agar browser men-download file
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        console.log(`[Export] Header Content-Disposition di-set untuk file: ${fileName}`);

        // 3. Generate dokumen berdasarkan format
        if (format === 'pdf') {
            console.log('[Export] Memulai pembuatan dokumen PDF...');
            res.setHeader('Content-Type', 'application/pdf');
            const doc = new PDFDocument({ margin: 50 });
            doc.pipe(res);

            // --- Isi Dokumen PDF ---
            doc.fontSize(18).font('Helvetica-Bold').text(analysis.title, { align: 'center' });
            doc.moveDown(2);

            const addSection = (title, content) => {
                if (!content) return; // Jangan tampilkan section jika konten kosong
                doc.fontSize(14).font('Helvetica-Bold').text(title);
                doc.fontSize(12).font('Helvetica').text(content, { align: 'justify' });
                doc.moveDown();
            };

            addSection('Authors', Array.isArray(analysis.authors) ? analysis.authors.join(', ') : '');
            addSection('Publication', analysis.publication || 'N/A');
            addSection('Summary', analysis.summary);
            addSection('Methodology', analysis.methodology);

            doc.fontSize(14).font('Helvetica-Bold').text('Key Points');
            doc.list(Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [], { bulletRadius: 2, textIndent: 10 });
            doc.moveDown();

            doc.fontSize(14).font('Helvetica-Bold').text('Keywords');
            doc.fontSize(12).font('Helvetica').text(Array.isArray(analysis.keywords) ? analysis.keywords.join(', ') : '');
            doc.moveDown();

            // --- DITAMBAHKAN: Bagian Q&A ---
            if (messages.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text('Tanya Jawab (Q&A)');
                messages.forEach(msg => {
                    doc.fontSize(12).font(msg.sender === 'user' ? 'Helvetica-Bold' : 'Helvetica').text(`${msg.sender === 'user' ? 'Anda' : 'AI'}: ${msg.text}`);
                });
                doc.moveDown();
            }

            doc.fontSize(14).font('Helvetica-Bold').text('References');
            doc.list(Array.isArray(analysis.references) ? analysis.references : [], { bulletRadius: 2, textIndent: 10 });

            console.log('[Export] Mengakhiri dokumen PDF...');
            doc.end();

        } else if (format === 'docx') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            console.log('[Export] Memulai pembuatan dokumen DOCX...');

            const createSection = (title, text) => [
                new Paragraph({
                    children: [new TextRun({ text: title, bold: true, size: 28 })]
                }),
                new Paragraph({
                    children: [new TextRun({ text: text || '', size: 24 })]
                }),
                new Paragraph({ text: "" }), // Spasi
            ];

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({
                            text: analysis.title,
                            heading: HeadingLevel.TITLE,
                            alignment: 'center',
                        }),
                        new Paragraph({ text: "" }), // Spasi
                        ...createSection('Authors', Array.isArray(analysis.authors) ? analysis.authors.join(', ') : ''),
                        ...createSection('Publication', analysis.publication || 'N/A'),
                        ...createSection('Summary', analysis.summary),
                        ...createSection('Methodology', analysis.methodology),
                        new Paragraph({ children: [new TextRun({ text: 'Key Points', bold: true, size: 28 })] }),
                        ...(Array.isArray(analysis.keyPoints) ? analysis.keyPoints.map(point => new Paragraph({ text: point, bullet: { level: 0 } })) : []),
                        new Paragraph({ text: "" }), // Spasi
                        ...createSection('Keywords', Array.isArray(analysis.keywords) ? analysis.keywords.join(', ') : ''),
                        new Paragraph({ children: [new TextRun({ text: 'References', bold: true, size: 28 })] }),
                        ...(Array.isArray(analysis.references) ? analysis.references.map(ref => new Paragraph({ text: ref, bullet: { level: 0 } })) : []),
                        new Paragraph({ text: "" }), // Spasi
                        // --- DITAMBAHKAN: Bagian Q&A ---
                        ...(messages.length > 0 ? [
                            new Paragraph({ children: [new TextRun({ text: 'Tanya Jawab (Q&A)', bold: true, size: 28 })] }),
                            ...messages.map(msg => new Paragraph({
                                children: [new TextRun({ text: `${msg.sender === 'user' ? 'Anda' : 'AI'}: `, bold: msg.sender === 'user' }), new TextRun(msg.text)]
                            }))
                        ] : [])
                    ],
                }],
            });

            console.log('[Export] Mengubah DOCX ke buffer...');
            const buffer = await Packer.toBuffer(doc);
            console.log(`[Export] Buffer DOCX berhasil dibuat dengan ukuran: ${buffer.length} bytes. Mengirim respons...`);
            res.send(buffer);
        }

    } catch (error) {
        console.error("Error saat ekspor analisis:", error);
        // Jika header sudah terkirim (artinya proses streaming file sudah dimulai),
        // kita tidak bisa mengirim JSON lagi. Cukup akhiri respons.
        if (!res.headersSent) {
            res.status(500).json({ message: "Gagal mengekspor analisis." });
        } else {
            res.end();
        }
    }
};