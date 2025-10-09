import express from 'express';
import cors from 'cors';
import analysisRoutes from './src/routes/analysisRoutes.js';
import historyRoutes from './src/routes/historyRoutes.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server AI Cockpit v2 (Arsitektur Profesional) berjalan!');
});


app.use('/api', analysisRoutes);
app.use('/api', historyRoutes);

app.listen(port, () => {
    console.log(`Server arsitektur baru siap di http://localhost:${port}`);
});