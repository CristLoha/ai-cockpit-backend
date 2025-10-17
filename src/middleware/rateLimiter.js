
import rateLimit from 'express-rate-limit';

// Menerapkan middleware untuk pembatasan tingkat permintaan (rate limiting) pada endpoint API.
// Konfigurasi ini bertujuan untuk mencegah penyalahgunaan (abuse) dan memastikan ketersediaan layanan
// dengan membatasi jumlah permintaan yang dapat dibuat oleh satu klien dalam rentang waktu tertentu.
export const apiLimiter = rateLimit({
    // Menentukan jendela waktu (time window) dalam milidetik.
    // Permintaan dari klien yang sama akan dihitung dalam periode ini.
    // 60 * 1000 ms = 1 menit.
    windowMs: 60 * 1000,

    // Menentukan jumlah maksimum permintaan yang diizinkan dari satu klien selama `windowMs`.
    // Setelah batas ini terlampaui, permintaan selanjutnya akan ditolak.
    max: 10,

    // Mengaktifkan header standar `RateLimit-*` (sesuai draf IETF).
    // Header ini memberikan informasi kepada klien tentang status rate limit mereka.
    standardHeaders: true,

    // Menonaktifkan header lama `X-RateLimit-*` untuk menjaga kepatuhan terhadap standar modern.
    legacyHeaders: false,

    // Mendefinisikan fungsi untuk menghasilkan kunci unik bagi setiap klien.
    // Kunci ini digunakan untuk melacak jumlah permintaan.
    // Prioritasnya adalah: ID pengguna terotentikasi, ID perangkat tamu, atau alamat IP sebagai fallback.
    keyGenerator: (req, _res) => {
        return req.user?.uid || req.headers['x-device-id'] || req.ip;
    },

    // Mendefinisikan handler yang akan dieksekusi ketika seorang klien melebihi batas permintaan.
    // Handler ini mengirimkan respons dengan status 429 (Too Many Requests) dan pesan error yang jelas.
    // Parameter _req dan _next disertakan untuk menjaga urutan yang benar, meskipun tidak digunakan.
    handler: (_req, res, _next, options) => {
        res.status(options.statusCode).json({
            status: 'error',
            message: 'Terlalu banyak permintaan, coba lagi setelah beberapa saat.'
        });
    },
});

// Menerapkan middleware rate limiting yang lebih longgar khusus untuk endpoint analisis dokumen.
// Endpoint ini lebih berat dan lebih jarang dipanggil, sehingga memerlukan batas yang lebih tinggi.
export const analysisLimiter = rateLimit({
    // Menentukan jendela waktu 15 menit.
    windowMs: 15 * 60 * 1000,

    // Mengizinkan 15 permintaan analisis dalam periode 15 menit.
    // Ini memberikan ruang yang cukup untuk pengguna melakukan beberapa analisis tanpa terblokir.
    max: 15,

    // Menggunakan header standar untuk konsistensi.
    standardHeaders: true,
    legacyHeaders: false,

    // Menggunakan generator kunci yang sama untuk mengidentifikasi klien.
    keyGenerator: (req, _res) => {
        return req.user?.uid || req.headers['x-device-id'] || req.ip;
    },

    // Menggunakan handler yang sama untuk respons saat batas terlampaui.
    handler: (_req, res, _next, options) => {
        res.status(options.statusCode).json({
            status: 'error',
            message: 'Terlalu banyak permintaan analisis dokumen. Mohon coba lagi setelah beberapa saat.'
        });
    },
});
