import admin from 'firebase-admin';

const initializeFirebase = async () => {
  // Hanya inisialisasi jika belum ada aplikasi yang berjalan
  if (!admin.apps.length) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Lingkungan produksi (Vercel)
        console.log('[Firebase] Initializing from environment variable...');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Lingkungan lokal (menggunakan file)
        console.log('[Firebase] Initializing from local service account file...');
        const { default: serviceAccount } = await import('./serviceAccountKey.json', {
          with: { type: 'json' }
        });
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
    } catch (error) {
      console.error('Firebase Admin SDK initialization failed:', error);
      // Melempar error agar aplikasi gagal startup jika Firebase tidak bisa diinisialisasi
      throw new Error('Could not initialize Firebase Admin SDK.');
    }
  }
  return admin;
};

// Inisialisasi Firebase dan ekspor instance yang sudah siap
await initializeFirebase();
export default admin;