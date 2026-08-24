const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });

module.exports = getAuth(firebaseApp);
