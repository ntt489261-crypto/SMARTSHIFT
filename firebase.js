
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    getDocs,
    setDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBP-7njNqAMc8d8wKBaHEEPYnZq3xYycok",
  authDomain: "smartshift-c0034.firebaseapp.com",
  projectId: "smartshift-c0034",
  storageBucket: "smartshift-c0034.firebasestorage.app",
  messagingSenderId: "78222310619",
  appId: "1:78222310619:web:2d9cce2b1935bd93b120fe"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    getDocs,
    setDoc,
    query,
    orderBy,
    signInWithEmailAndPassword,
    signOut
};