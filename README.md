# AI Cockpit Backend

Selamat datang di repositori backend untuk **AI Cockpit**, sebuah asisten cerdas yang dirancang untuk menganalisis jurnal dan dokumen akademik. Layanan ini memungkinkan pengguna untuk mengunggah dokumen, mendapatkan analisis komprehensif yang didukung oleh AI, dan mengajukan pertanyaan lanjutan dalam sebuah sesi chat interaktif.

## ✨ Fitur Utama

- **Analisis Dokumen Cerdas**: Mendukung unggahan file format **PDF** dan **DOCX** untuk dianalisis secara mendalam.
- **Ekstraksi Berbasis AI**: Menggunakan model Generative AI (Google Gemini) untuk mengekstrak informasi kunci seperti judul, penulis, rangkuman, metodologi, poin-poin penting, dan kata kunci.
- **Sesi Tanya Jawab Interaktif**: Setelah analisis, pengguna dapat memulai percakapan dengan AI untuk bertanya lebih detail mengenai isi dokumen.
- **Sistem Autentikasi Ganda**:
  - **Pengguna Terdaftar**: Menggunakan Firebase Authentication untuk pengguna yang login.
  - **Pengguna Tamu (Guest)**: Mendukung akses anonim dengan `x-device-id` unik, dengan batasan penggunaan.
- **Manajemen Riwayat Percakapan**: Menyimpan dan mengelola riwayat analisis dan percakapan untuk setiap pengguna secara aman di Firestore.
- **Validasi Sumber Dokumen**: Sistem secara cerdas dapat mendeteksi dan menolak dokumen yang merupakan hasil analisis sebelumnya untuk menjaga kualitas data.
- **Penanganan Error yang Baik**: Memberikan pesan error yang jelas dan ramah pengguna, baik untuk kesalahan input dari klien maupun masalah di sisi server.

## 🚀 Teknologi yang Digunakan

- **Framework**: Node.js, Express.js
- **Database**: Google Firestore (untuk menyimpan data pengguna dan riwayat chat)
- **Autentikasi**: Firebase Authentication
- **Layanan AI**: Google Gemini API
- **Pemrosesan File**:
  - `pdf.js-extract` untuk ekstraksi teks dari PDF.
  - `mammoth` untuk ekstraksi teks dari DOCX.

## 📂 Struktur Proyek

```
src
├── config/
│   └── firebase.js      # Konfigurasi dan inisialisasi Firebase Admin SDK
├── controllers/
│   ├── analysisController.js    # Logika untuk menangani permintaan analisis dokumen
│   ├── continueChatController.js # Logika untuk melanjutkan sesi chat
│   └── historyController.js     # Logika untuk mengelola riwayat chat (get, delete)
├── middleware/
│   └── authMiddleware.js  # Middleware untuk verifikasi token dan otorisasi
├── routes/
│   ├── analysisRoutes.js  # Rute untuk endpoint analisis
│   └── historyRoutes.js   # Rute untuk endpoint chat dan riwayat
├── services/
│   └── geminiService.js   # Layanan untuk berinteraksi dengan Google Gemini API
└── index.js               # Entry point aplikasi Express
```

## 📖 Dokumentasi API

**Base URL**: `https://ai-cockpit-backend.vercel.app`

---

### Autentikasi

Semua endpoint memerlukan autentikasi.

- **Pengguna Terdaftar**: Kirim header `Authorization: Bearer [FIREBASE_ID_TOKEN]`.
- **Pengguna Tamu**: Kirim header `x-device-id: [UNIQUE_DEVICE_ID]`. Batas penggunaan adalah **3 kali** permintaan.

### 1. Analisis Dokumen

- **Endpoint**: `POST /api/analyze`
- **Deskripsi**: Mengunggah dokumen (PDF/DOCX) untuk memulai sesi analisis dan chat baru.
- **Request Body**: `multipart/form-data` dengan field `document` yang berisi file.
- **Respons Sukses (200)**:
  ```json
  {
    "status": "success",
    "chatId": "...",
    "analysis": {
      "title": "...",
      "authors": ["..."],
      "summary": "...",
      "keyPoints": ["..."],
      // ... field lainnya
    }
  }
  ```

### 2. Lanjutkan Percakapan

- **Endpoint**: `POST /api/chat/continue/:chatId`
- **Deskripsi**: Mengirim pertanyaan lanjutan dalam sesi chat yang sudah ada.
- **Request Body**: JSON
  ```json
  {
    "userQuestion": "Bisa jelaskan lebih detail tentang metodologinya?"
  }
  ```
- **Respons Sukses (200)**:
  ```json
  {
    "status": "success",
    "answer": "Tentu, metodologi yang digunakan adalah...",
    "chatId": "..."
  }
  ```

### 3. Riwayat Percakapan

- `GET /api/chats`
  - **Deskripsi**: Mengambil daftar semua riwayat percakapan pengguna.

- `GET /api/chats/:chatId`
  - **Deskripsi**: Mengambil detail pesan dari satu percakapan spesifik, termasuk data analisis awalnya.

- `DELETE /api/chats/:chatId`
  - **Deskripsi**: Menghapus satu percakapan spesifik.

- `DELETE /api/chats`
  - **Deskripsi**: Menghapus **semua** riwayat percakapan milik pengguna.

## ⚙️ Instalasi dan Menjalankan Proyek

1.  **Clone repositori ini:**
    ```bash
    git clone [URL_REPO_ANDA]
    cd ai-cockpit-backend
    ```
2.  **Install dependensi:**
    ```bash
    npm install
    ```
3.  **Konfigurasi Environment Variables:**
    Buat file `.env` di root proyek dan isi dengan kredensial yang dibutuhkan, terutama untuk Firebase dan Gemini API.
    ```
    # Contoh
    GOOGLE_API_KEY=...
    FIREBASE_SERVICE_ACCOUNT=...
    ```
4.  **Jalankan server:**
    ```bash
    npm start
    ```