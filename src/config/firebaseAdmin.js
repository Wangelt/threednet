const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let cachedAuth;

// Lazy init: a blank/missing FIREBASE_* env var must not crash the whole API
// at require-time (this module is pulled in eagerly via authController.js).
// Only /auth/firebase-phone actually needs it, so failures surface there.
function getFirebaseAuth() {
  if (cachedAuth) return cachedAuth;
  const firebaseApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
  cachedAuth = getAuth(firebaseApp);
  return cachedAuth;
}

module.exports = getFirebaseAuth;
