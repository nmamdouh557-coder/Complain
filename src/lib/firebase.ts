import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
if (!firebaseConfig) {
  console.error("Firebase config is missing!");
}
export const db = getFirestore(app, firebaseConfig?.firestoreDatabaseId);
export const auth = getAuth(app);

export default app;
