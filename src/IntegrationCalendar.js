import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { Tooltip } from 'react-tooltip';

// Firebaseのインポート（Google認証とログアウト機能を追加）
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase'; // <-- ここが変更点！

// --- Firebaseの初期設定 (デモ用) ---
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';


// メインのReactコンポーネント
const App = () => {
  // 日ごとのカウントを保存するstate
  const [counts, setCounts] = useState({});
  // Firebaseのユーザー情報を保存するstate
  const [user, setUser] = useState(null);
  // 認証処理が完了したかを管理するstate
  const [isAuthReady, setIsAuthReady] = useState(false);
  // ボタンアニメーションを管理するstate
  // 今日の日付 ('YYYY-MM-DD'形式)
  const today = dayjs().format('YYYY-MM-DD');

  // --- Firebase認証処理 (Googleログイン対応) ---
  useEffect(() => {
    // 認証状態の変更を監視するリスナーを登録
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // ユーザー情報をセット
      setIsAuthReady(true); // 認証チェック完了
      if (currentUser) {
        console.log("ログイン中:", currentUser.displayName);
      } else {
        console.log("ログアウト状態");
      }
    });
    // コンポーネントがアンマウントされる時にリスナーを解除
    return () => unsubscribe();
  }, []);

  // --- Firestoreデータ購読処理 ---
  useEffect(() => {
    // ユーザー認証が未完了の場合は処理を中断
    if (!user || !isAuthReady) {
      setCounts({}); // ログアウトしたらカウントをリセット
      return;
    }

    const userId = user.uid;
    // 購読するドキュメントの参照を作成
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/integrationCounts`, 'dailyCounts');
    console.log(`Firestoreドキュメントの購読を開始します: ${userDocRef.path}`);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setCounts(docSnap.data());
      } else {
        setCounts({});
      }
    }, (error) => {
      console.error("Firestoreからのデータ取得に失敗しました:", error);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // --- Googleログイン処理 ---
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Googleログインに失敗しました:", error);
    }
  };

  // --- ログアウト処理 ---
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);
    }
  };

  const [isPressed, setIsPressed] = useState(false); // ボタンが押されているか
  const [isBouncing, setIsBouncing] = useState(false); // ボタンがバウンス中か


  // --- 「積分できた！」ボタンのクリック処理 (アニメーション追加) ---
  const handleAddIntegration = useCallback(async () => {
    if (!user) {
      console.error("データベースに接続できません。認証状態を確認してください。");
      return;
    }


    const userId = user.uid;
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/integrationCounts`, 'dailyCounts');
    const newCount = (counts[today] || 0) + 1;

    try {
      await setDoc(userDocRef, { [today]: newCount }, { merge: true });
      console.log(`今日のカウントを更新しました: ${newCount}`);
    } catch (error) {
      console.error("Firestoreの更新に失敗しました:", error);
    }
    
  }, [user, counts, today]);
  const handleMouseDown = () => {
    setIsPressed(true); // isPressedをtrueにする
    setIsBouncing(false); // 押されている間はバウンスをオフにする
  };

  // マウスのボタンが離された（マウスアップ）時
  const handleMouseUp = () => {
    setIsPressed(false); // isPressedをfalseに戻す（押されてない状態）
    setIsBouncing(true); // isBouncingをtrueにしてバウンスアニメーションを開始する
  };

  // マウスカーソルがボタンから離れた時
  const handleMouseLeave = () => {
    setIsPressed(false); // 押された状態をリセット
    setIsBouncing(false); // バウンス状態もリセット
  };

  // アニメーションが終了した時（ポヨンアニメーションが完了した時）
  const handleAnimationEnd = () => {
    setIsBouncing(false); // バウンス状態をfalseに戻して、次回に備える
  };

    // ---【変更点】スペースキーでの操作 ---
  // スペースキーが押されたらボタンのクリック処理を呼び出す
  useEffect(() => {
    const handleKeyDown = (event) => {
      // ユーザーがログインしていて、入力フォームなど以外でスペースキーが押された場合
      if (user && event.code === 'Space' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();

        // アニメーション開始
        setIsPressed(true);
        setIsBouncing(true);

        // カウント更新処理
        handleAddIntegration();

        // 押された状態を少し保ってから戻す（マウスクリックのように）
        setTimeout(() => {
          setIsPressed(false);
        }, 100); // タイミングはマウスの離しと揃えると自然
      }

    };

    window.addEventListener('keydown', handleKeyDown);

    // コンポーネントのアンマウント時にイベントリスナーを削除
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, handleAddIntegration]); // 依存配列にuserとhandleAddIntegrationを追加

  // --- ヒートマップの描画ロジック ---
  const getClassForValue = (count) => {
    if (count === 0) return 'color-empty';
    if (count <= 20) return 'color-scale-1';
    if (count <= 40) return 'color-scale-2';
    if (count <= 60) return 'color-scale-3';
    if (count <= 80) return 'color-scale-4';
    if (count <= 100) return 'color-scale-5';
    return 'color-over glow';
  };

  const CustomHeatmap = React.memo(() => {
    const startDate = dayjs().subtract(180, 'day');
    const endDate = dayjs().add(180, 'day');
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    const weeks = [];
    let currentDay = startDate.startOf('week');

    while (currentDay.isBefore(endDate)) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(currentDay.add(i, 'day'));
      }
      weeks.push(week);
      currentDay = currentDay.add(7, 'day');
    }

    const monthLabels = weeks
      .map((week, i) => {
        const firstDayOfMonth = week.find(day => day.date() === 1);
        if (firstDayOfMonth) {
          return { x: i * 16, label: firstDayOfMonth.format('M月') };
        }
        return null;
      })
      .filter(Boolean);

    return (
      <div className="overflow-x-auto p-2">
        <svg width={weeks.length * 16} height={140}>
          <g transform="translate(0, 15)">
            {monthLabels.map(({ x, label }) => (
              <text key={label} x={x} y={0} className="text-xs fill-gray-500">{label}</text>
            ))}
          </g>
          <g transform="translate(0, 30)">
            {weekDays.map((day, i) => (
              <text key={day} x={-15} y={i * 16 + 12} className="text-xs fill-gray-500" textAnchor="middle">{day}</text>
            ))}
            {weeks.map((week, weekIndex) => (
              <g key={weekIndex} transform={`translate(${weekIndex * 16}, 0)`}>
                {week.map((day, dayIndex) => {
                  const dateStr = day.format('YYYY-MM-DD');
                  const count = counts[dateStr] || 0;
                  const isFuture = day.isAfter(dayjs(), 'day');
                  const inSummerBreak = day.isAfter('2025-07-17') && day.isBefore('2025-09-11');
                  let classNames = getClassForValue(count);
                  if (dateStr === today) classNames += ' today';
                  if (inSummerBreak) classNames += ' summer';
                  if (isFuture) classNames += ' opacity-50';

                  return (
                    <rect key={dateStr} y={dayIndex * 16} width={12} height={12} rx={2} ry={2}
                      className={classNames} data-tooltip-id="heatmap-tooltip"
                      data-tooltip-content={`${dateStr}: ${count}問`}
                    />
                  );
                })}
              </g>
            ))}
          </g>
        </svg>
      </div>
    );
  });

  // 合計カウントを計算
  const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const goal = 5000;
  const progressPercentage = Math.min((totalCount / goal) * 100, 100);

  // --- レンダリング ---
  
  // 認証状態をチェック中
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl font-semibold text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // 未ログイン時の表示
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">積分チャレンジカレンダー</h1>
        <p className="text-gray-600 mb-8">毎日の頑張りを記録しよう！</p>
        <button
          onClick={handleGoogleSignIn}
          className="flex items-center justify-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-6 h-6" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          <span className="text-base font-semibold text-gray-700">Googleでログイン</span>
        </button>
      </div>
    );
  }

  // ログイン後の表示
  return (
    <div className="p-4 max-w-5xl mx-auto font-sans bg-gray-50 min-h-screen">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full" />
          <span className="text-gray-700 font-semibold">{user.displayName}</span>
        </div>
        <button 
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-red-600 hover:underline transition-colors"
        >
          ログアウト
        </button>
      </header>

      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800">積分チャレンジカレンダー</h2>
      </div>

      <div className="my-8 flex flex-col items-center">
        <button
      onClick={handleAddIntegration}
      onMouseDown={handleMouseDown} // マウスが押された時にこの関数が呼ばれる
      onMouseUp={handleMouseUp}     // マウスが離された時にこの関数が呼ばれる
      onMouseLeave={handleMouseLeave} // マウスが離れた時にこの関数が呼ばれる
      onAnimationEnd={handleAnimationEnd} // アニメーション終了時にこの関数が呼ばれる
      className={`
        text-3xl px-40 py-10 bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold
        rounded-full // ここを 'rounded-full' に戻します
        shadow-xl    // 外側の影はそのまま
        shadow-poyon-glow // 通常時の内側の光沢
        hover:shadow-2xl hover:scale-103 transition-all duration-300 ease-out
        focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
        ${isPressed ? 'animate-press-animation active:brightness-90 shadow-poyon-pressed' : ''}
        ${isBouncing ? 'animate-poyon-animation' : ''}
      `}
    >
      積分できた！
    </button>
      </div>
      <div className="flex-auto my-8 max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-2a3 3 0 00-3-3H9a3 3 0 00-3 3v2m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path d="M15 12c-2.333 2.333-2.333 2.333-7 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
              </div>
              <div className='pr-6'>
                  <p className="text-sm text-gray-500">合計学習量</p>
                  <p className="text-3xl font-bold text-gray-800">
                      {totalCount.toLocaleString()}
                      <span className="text-base font-medium text-gray-600 ml-1">問</span>
                  </p>
              </div>
              <div className="border-l-4 border-orange-100 pl-10">
                <p className="text-sm text-gray-500">今日解いた問題数</p>
                  <p className="text-3xl font-bold text-gray-800 ">
                      {counts[today]}
                      <span className="text-base font-medium text-gray-600 ">問</span>
                  </p>
              </div>
          </div>
          <div className="mt-5">
              <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-semibold text-green-600">進捗</span>
                  <span className="text-sm font-mono text-gray-500">{totalCount} / {goal}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                  ></div>
              </div>
          </div>
      </div>

      <div className="mt-8 bg-white p-4 rounded-lg shadow-xl">
        <CustomHeatmap />
        <Tooltip id="heatmap-tooltip" />
      </div>

      <style>{`
        body { background-color: #f9fafb; }
        .color-empty { fill: #ebedf0; }
        .color-scale-1 { fill: #c6e48b; }
        .color-scale-2 { fill: #7bc96f; }
        .color-scale-3 { fill: #239a3b; }
        .color-scale-4 { fill: #196127; }
        .color-scale-5 { fill: #103a18; }
        .color-over { fill: #ffc107; }
        .today { stroke: #d73a49; stroke-width: 2; }
        .summer { stroke: #0366d6; stroke-dasharray: 2 2; stroke-width: 1.5; }

        @keyframes glow-effect {
          0%, 100% { filter: drop-shadow(0 0 2px #fde047); stroke: rgba(255, 255, 255, 0.7); }
          50% { filter: drop-shadow(0 0 6px #fde047); stroke: rgba(255, 255, 255, 1); }
        }
        .glow {
          stroke: white;
          stroke-width: 0.5px;
          animation: glow-effect 2s infinite ease-in-out;
        }

        /* --- ボタンの「ポヨン！」アニメーション --- */
        @keyframes poyon-effect {
          0% { transform: scale(1); }
          40% { transform: scale(0.95); }
          60% { transform: scale(1.1); }
          80% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .poyon-animation {
          animation: poyon-effect 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};
export default App;
