import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analysisRoutes from './src/routes/analysisRoutes.js';
import chatRoutes from './src/routes/historyRoutes.js';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
    console.log(`--- REQUEST DITERIMA DI INDEX.JS: ${req.method} ${req.path} ---`);
    next();
});

app.use(express.json());

app.get('/', (req, res) => {
    const documentationHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Cockpit API Documentation</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 800px;
                margin: auto;
                background: #fff;
                padding: 25px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1, h2 {
                color: #2c3e50;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 10px;
            }
            .endpoint {
                background: #ecf0f1;
                border-left: 5px solid #3498db;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .method {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 4px;
                color: #fff;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 0.9em;
            }
            .post { background-color: #27ae60; }
            .get { background-color: #2980b9; }
            .delete { background-color: #c0392b; }
            code {
                font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
                background: #e0e0e0;
                padding: 3px 6px;
                border-radius: 4px;
                font-size: 0.95em;
            }
            p { margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>AI Cockpit API Documentation</h1>
            <p>Selamat datang di dokumentasi API untuk <strong>AI Cockpit v2</strong>. Semua endpoint memerlukan autentikasi, baik melalui Bearer Token (untuk user login) atau header <code>x-device-id</code> (untuk guest).</p>

            <div class="endpoint">
                <h2><span class="method post">POST</span> /api/analyze</h2>
                <p>Mengunggah dan menganalisis dokumen (PDF/DOCX). Endpoint ini akan memulai sesi chat baru.</p>
                <p><strong>Body:</strong> <code>multipart/form-data</code> dengan field <code>document</code> berisi file.</p>
            </div>

            <div class="endpoint">
                <h2><span class="method post">POST</span> /api/chat/continue/:chatId</h2>
                <p>Mengirimkan pertanyaan lanjutan dalam sebuah sesi chat yang sudah ada.</p>
                <p><strong>URL Params:</strong> <code>chatId</code> (ID dari sesi chat).</p>
                <p><strong>Body:</strong> JSON <code>{ "userQuestion": "Isi pertanyaan Anda di sini" }</code></p>
            </div>

            <div class="endpoint">
                <h2><span class="method get">GET</span> /api/chats</h2>
                <p>Mengambil daftar semua riwayat percakapan (chat history) milik pengguna.</p>
            </div>

            <div class="endpoint">
                <h2><span class="method get">GET</span> /api/chats/:chatId</h2>
                <p>Mengambil detail pesan dari satu percakapan spesifik.</p>
                <p><strong>URL Params:</strong> <code>chatId</code> (ID dari sesi chat).</p>
            </div>

            <div class="endpoint">
                <h2><span class="method delete">DELETE</span> /api/chats/:chatId</h2>
                <p>Menghapus satu percakapan spesifik dari riwayat.</p>
                <p><strong>URL Params:</strong> <code>chatId</code> (ID dari sesi chat).</p>
            </div>

            <div class="endpoint">
                <h2><span class="method delete">DELETE</span> /api/chats</h2>
                <p>Menghapus <strong>semua</strong> riwayat percakapan milik pengguna.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(documentationHtml);
});


app.use('/api', analysisRoutes);
app.use('/api', chatRoutes);
app.listen(port, () => {
    console.log(`Server arsitektur baru siap di http://localhost:${port}`);
});

export default app;