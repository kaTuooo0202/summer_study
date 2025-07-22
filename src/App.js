import React from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// 必要なものをインポート
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { auth } from './firebase';
import IntegrationCalendar from './components/IntegrationCalendar';
import TodoList from './components/TodoList';

// ログイン後のメイン画面
const MainDashboard = () => {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto font-sans bg-gray-50 min-h-screen">
      <header className="flex items-center justify-between mb-4 pb-4 border-b-4 border-gray-200">
        <div className="flex items-center gap-3">
          <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full" />
          <span className="text-gray-700 font-semibold">{user.displayName}</span>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800">積分チャレンジ</h2>
        </div>
        <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-red-600 hover:underline transition-colors">
          ログアウト
        </button>
      </header>
      
      <IntegrationCalendar />
      <TodoList />

    </div>
  );
}

// ログイン画面
const LoginScreen = () => {
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Googleログインに失敗しました:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">積分チャレンジカレンダー</h1>
      <p className="text-gray-600 mb-8">毎日の頑張りを記録し、タスクを管理しよう！</p>
      <button
        onClick={handleGoogleSignIn}
        className="flex items-center justify-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
        <span className="text-base font-semibold text-gray-700">Googleでログイン</span>
      </button>
    </div>
  );
};


// 認証状態に応じて表示を切り替えるコンポーネント
const AppContent = () => {
    const { user } = useAuth();
    
    // Googleアカウントでログインしていればメイン画面、そうでなければログイン画面
    return user && !user.isAnonymous ? <MainDashboard /> : <LoginScreen />;
}


// アプリケーションのルート
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
