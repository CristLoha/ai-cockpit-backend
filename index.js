import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const docPath = path.join(__dirname, 'documentation.html');

    fs.readFile(docPath, 'utf8', (err, html) => {
        if (err) {
            console.error("Error reading documentation file:", err);
            return res.status(500).send('Could not load API documentation.');
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const renderedHtml = html.replace(/{{BASE_URL}}/g, baseUrl);

        res.send(renderedHtml);
    });
});


app.use('/api', analysisRoutes);
app.use('/api', chatRoutes);
app.listen(port, () => {
    console.log(`Server arsitektur baru siap di http://localhost:${port}`);
});

export default app;