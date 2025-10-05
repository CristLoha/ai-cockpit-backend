import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Trik untuk mendapatkan __dirname di ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Buat path yang benar ke file service account
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

// Baca file secara manual dan parse menjadi objek JSON
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Inisialisasi Firebase Admin dengan objek yang sudah di-parse
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export default admin;