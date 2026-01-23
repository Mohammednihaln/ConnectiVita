import * as firebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDZIBOUHGfy9_sNF-M5vG2z5I_ALuzJIc4",
  authDomain: "connectivita-b3787.firebaseapp.com",
  projectId: "connectivita-b3787",
  storageBucket: "connectivita-b3787.firebasestorage.app",
  messagingSenderId: "1064745410494",
  appId: "1:1064745410494:web:e504a7dbaf855dd77823ef",
  measurementId: "G-524H2Y5B8H"
};

const app = firebaseApp.initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();