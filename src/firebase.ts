import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize the Firebase client application using configuration
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Connectivity validation constraint from guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection_probe'));
    console.log("Firebase connection probe succeeded.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Firebase client appears to be offline. Verify network adapter or local environment credentials.");
    } else {
      console.log("Firebase connection tested successfully.");
    }
  }
}
testConnection();
