import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analysisRoutes from './src/routes/analysisRoutes.js';
import historyRoutes from './src/routes/historyRoutes.js';

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
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server AI Cockpit v2 (Arsitektur Profesional) berjalan!');
});


app.use('/api', analysisRoutes);
app.use('/api', historyRoutes);

app.listen(port, () => {
    console.log(`Server arsitektur baru siap di http://localhost:${port}`);
});

export default app;