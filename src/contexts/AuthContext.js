import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase'; // firebase.jsからインポート

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          const token = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;
          if (token) {
            await signInWithCustomToken(auth, token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("認証エラー:", error);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const value = { user, isAuthReady };

  return (
    <AuthContext.Provider value={value}>
      {isAuthReady ? children : <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="text-xl font-semibold text-gray-500">読み込み中...</div></div>}
    </AuthContext.Provider>
  );
};
