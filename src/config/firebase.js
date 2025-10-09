import admin from 'firebase-admin';

const initializeFirebase = async () => {
  console.log("==============================================");
  console.log("MEMULAI PROSES DEBUGGING FIREBASE ENV");
  console.log("Apakah FIREBASE_SERVICE_ACCOUNT ada isinya? ->", !!process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log("Tipe datanya apa? ->", typeof process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log("==============================================");
  if (!admin.apps.length) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {

        console.log('[Firebase] Initializing from environment variable...');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {

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

      throw new Error('Could not initialize Firebase Admin SDK.');
    }
  }
  return admin;
};


await initializeFirebase();
export default admin;