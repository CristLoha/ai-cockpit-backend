import express from 'express';
import cors from 'cors';
import chatRoutes from './src/routes/chatRoutes.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server AI Cockpit v2 (Arsitektur Profesional) berjalan!');
});


app.use('/api', chatRoutes);

app.listen(port, () => {
    console.log(`Server arsitektur baru siap di http://localhost:${port}`);
});