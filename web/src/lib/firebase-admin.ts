import 'server-only';
import * as admin from 'firebase-admin';

function getServiceAccount() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) return null;

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

export const auth = admin.auth();

export async function verifyIdToken(token: string) {
  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return null;
  }
}
