// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBwK4FsovgOkK0Hc1yN2G4BqDG3Pv21nGs",
  authDomain: "integrationcalendar-fdf55.firebaseapp.com",
  projectId: "integrationcalendar-fdf55",
  storageBucket: "integrationcalendar-fdf55.firebasestorage.app",
  messagingSenderId: "1075773261388",
  appId: "1:1075773261388:web:5900aa7deac1bb9c0d56e9",
  measurementId: "G-FQLXL0W1H4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getAnalytics(app);


export { db };