import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analysisRoutes from './src/routes/analysisRoutes.js';
import chatRoutes from './src/routes/historyRoutes.js'; // Mengganti nama variabel agar lebih jelas

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
    res.send('Server AI Cockpit v2 (Arsitektur Profesional) berjalan!');
});


app.use('/api', analysisRoutes);
app.use('/api', chatRoutes); 
app.listen(port, () => {
    console.log(`Server arsitektur baru siap di http://localhost:${port}`);
});

export default app;