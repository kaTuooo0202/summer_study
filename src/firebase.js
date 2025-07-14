// src/firebase.js

// Firebase SDK の各モジュールをインポート
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- 1. Firebase の設定オブジェクト ---
// 環境変数から安全に値を取得します
const firebaseConfig = {
  apiKey: "AIzaSyBwK4FsovgOkK0Hc1yN2G4BqDG3Pv21nGs",
  authDomain: "integrationcalendar-fdf55.firebaseapp.com",
  projectId: "integrationcalendar-fdf55",
  storageBucket: "integrationcalendar-fdf55.firebasestorage.app",
  messagingSenderId: "1075773261388",
  appId: "1:1075773261388:web:5900aa7deac1bb9c0d56e9",
  measurementId: "G-FQLXL0W1H4"
  // measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID, // 必要であれば
};

// --- 2. Firebase アプリの初期化 ---
// アプリが既に初期化されているかを確認し、されていなければ初期化します。
// これにより、ホットリロードなどで複数回初期化されるのを防ぎます。
let app;
if (!getApps().length) { // getApps() は初期化済みのFirebaseアプリの配列を返す
  // アプリが初期化されていない場合
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebaseアプリの初期化に失敗しました:", error);
    // 初期化に失敗した場合の適切なエラーハンドリング
    app = null; // エラー時はnullを設定するなど
  }
} else {
  // アプリが既に初期化されている場合、既存のインスタンスを取得
  app = getApp();
}

// --- 3. 認証 (Auth) とデータベース (Firestore) のインスタンスを取得 ---
let auth = null;
let db = null;

if (app) { // アプリが正常に初期化された場合のみ、AuthとFirestoreを取得
  try {
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebaseサービスの取得に失敗しました (Auth/Firestore):", error);
  }
}

// --- 4. 外部ファイルから利用できるようにエクスポート ---
// これらを他のファイルでインポートして利用します
export { app, auth, db };