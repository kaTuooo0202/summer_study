import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { Tooltip } from 'react-tooltip';

// Firebaseのインポート
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- Firebaseの初期設定 ---
// Canvas環境から提供されるグローバル変数を安全に取得します。
// ESLintエラー(no-undef)を回避するため、グローバルスコープである`window`オブジェクトからアクセスします。
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
const firebaseConfig = {
  apiKey: "AIzaSyBwK4FsovgOkK0Hc1yN2G4BqDG3Pv21nGs",
  authDomain: "integrationcalendar-fdf55.firebaseapp.com",
  projectId: "integrationcalendar-fdf55",
  storageBucket: "integrationcalendar-fdf55.firebasestorage.app",
  messagingSenderId: "1075773261388",
  appId: "1:1075773261388:web:5900aa7deac1bb9c0d56e9",
  measurementId: "G-FQLXL0W1H4"
};
const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;

// Firebaseアプリを初期化します。設定オブジェクトが空でない場合のみ実行します。
let app, db, auth;
if (Object.keys(firebaseConfig).length > 0) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebaseの初期化に失敗しました:", error);
  }
}

// メインのReactコンポーネント
const App = () => {
  // 日ごとのカウントを保存するstate
  const [counts, setCounts] = useState({});
  // FirebaseのユーザーIDを保存するstate
  const [userId, setUserId] = useState(null);
  // 認証処理が完了したかを管理するstate
  const [isAuthReady, setIsAuthReady] = useState(false);

  // 今日の日付 ('YYYY-MM-DD'形式)
  const today = dayjs().format('YYYY-MM-DD');

  // --- Firebase認証処理 ---
  useEffect(() => {
    // authが初期化されていない場合は処理を中断
    if (!auth) {
      console.warn("Firebase Authが初期化されていません。");
      // 認証が利用できなくてもUIは表示するため、isAuthReadyをtrueにする
      setIsAuthReady(true);
      return;
    }

    // 認証状態の変更を監視するリスナーを登録
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ユーザーが既にログインしている場合
        setUserId(user.uid);
        setIsAuthReady(true);
        console.log("ユーザーはログイン済みです:", user.uid);
      } else {
        // ユーザーがログインしていない場合、サインインを試みる
        try {
          if (initialAuthToken) {
            // Canvas環境から提供されたトークンでサインイン
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("カスタムトークンでサインインしました。");
          } else {
            // トークンがない場合（ローカル開発など）は匿名認証
            await signInAnonymously(auth);
            console.log("匿名認証でサインインしました。");
          }
          // onAuthStateChangedが再度発火し、上記のif (user)ブロックが実行されるのを待つ
        } catch (error) {
          console.error("サインインに失敗しました:", error);
          setIsAuthReady(true); // エラーが発生してもUIのブロックを解除
        }
      }
    });

    // コンポーネントがアンマウントされる時にリスナーを解除
    return () => unsubscribe();
  }, []); // このeffectはコンポーネントの初回マウント時に一度だけ実行

  // --- Firestoreデータ購読処理 ---
  useEffect(() => {
    // dbが未初期化、またはユーザー認証が未完了の場合は処理を中断
    if (!db || !userId || !isAuthReady) {
      return;
    }

    // 購読するドキュメントの参照を作成
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/integrationCounts`, 'dailyCounts');
    console.log(`Firestoreドキュメントの購読を開始します: ${userDocRef.path}`);

    // ドキュメントの変更をリアルタイムで監視するリスナーを設定
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        // ドキュメントが存在すれば、そのデータをstateにセット
        setCounts(docSnap.data());
        console.log("Firestoreからデータを読み込みました:", docSnap.data());
      } else {
        // ドキュメントが存在しなければ、stateを空に初期化
        setCounts({});
        console.log("Firestoreにデータが見つかりません。");
      }
    }, (error) => {
      console.error("Firestoreからのデータ取得に失敗しました:", error);
    });

    // コンポーネントがアンマウントされる時にリスナーを解除
    return () => unsubscribe();
  }, [userId, isAuthReady]); // userIdまたはisAuthReadyが変更された時に再実行

  // --- 「積分できた！」ボタンのクリック処理 ---
  const handleAddIntegration = useCallback(async () => {
    // dbが未初期化、またはユーザー認証が未完了の場合は処理を中断
    if (!db || !userId) {
      // alertはCanvas環境で表示されないため、console.errorを使用します
      console.error("データベースに接続できません。認証状態を確認してください。");
      return;
    }

    // 更新するドキュメントの参照を作成
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/integrationCounts`, 'dailyCounts');
    // 今日の日付のカウントを1増やす
    const newCount = (counts[today] || 0) + 1;

    try {
      // Firestoreのドキュメントを更新（merge: trueで他の日付のデータを保持）
      await setDoc(userDocRef, { [today]: newCount }, { merge: true });
      console.log(`今日のカウントを更新しました: ${newCount}`);
    } catch (error) {
      console.error("Firestoreの更新に失敗しました:", error);
    }
  }, [userId, counts, today]);

  // --- ヒートマップの描画ロジック ---

  // カウントに応じてCSSクラスを返す関数
  const getClassForValue = (count) => {
    if (count === 0) return 'color-empty';
    if (count <= 20) return 'color-scale-1';
    if (count <= 40) return 'color-scale-2';
    if (count <= 60) return 'color-scale-3';
    if (count <= 80) return 'color-scale-4';
    if (count <= 100) return 'color-scale-5';
    return 'color-over sparkle'; // 100問超えはキラキラ
  };

  // カスタムヒートマップを描画するコンポーネント
  const CustomHeatmap = React.memo(() => {
    const startDate = dayjs().subtract(180, 'day'); // 約6ヶ月前から表示
    const endDate = dayjs().add(180, 'day');      // 約6ヶ月後まで表示
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

    // 月ラベルを生成
    const monthLabels = weeks
      .map((week, i) => {
        const firstDayOfMonth = week.find(day => day.date() === 1);
        if (firstDayOfMonth) {
          return {
            x: i * 16,
            label: firstDayOfMonth.format('M月'),
          };
        }
        return null;
      })
      .filter(Boolean);


    return (
      <div className="overflow-x-auto p-2">
        <svg width={weeks.length * 16} height={140}>
          {/* 月ラベル */}
          <g transform="translate(0, 15)">
            {monthLabels.map(({ x, label }) => (
              <text key={label} x={x} y={0} className="text-xs fill-gray-500">{label}</text>
            ))}
          </g>
          {/* 曜日ラベルとヒートマップセル */}
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
                    <rect
                      key={dateStr}
                      y={dayIndex * 16}
                      width={12}
                      height={12}
                      rx={2}
                      ry={2}
                      className={classNames}
                      data-tooltip-id="heatmap-tooltip"
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

  return (
    <div className="p-4 max-w-5xl mx-auto font-sans bg-gray-50 min-h-screen">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800">積分チャレンジカレンダー</h2>
        <p className="text-sm text-gray-600 mt-2 mb-4">
          ユーザーID: <span className="font-mono text-xs bg-gray-200 p-1 rounded break-all">{userId || '認証中...'}</span>
        </p>
      </div>

      <div className="my-6 flex flex-col items-center">
        <button
          onClick={handleAddIntegration}
          className="text-3xl px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={!isAuthReady || !userId}
        >
          積分できた！
        </button>
        <p className="text-center text-xl font-semibold text-gray-700 mt-4">
          合計：<span className="text-orange-600 text-2xl">{totalCount}</span> / 5000 問
        </p>
      </div>

      <div className="mt-8 bg-white p-4 rounded-lg shadow-xl">
        <CustomHeatmap />
        <Tooltip id="heatmap-tooltip" />
      </div>

      <style>{`
        body { background-color: #f9fafb; }
        .color-empty { fill: #ebedf0; }
        .color-scale-1 { fill: #9be9a8; }
        .color-scale-2 { fill: #40c463; }
        .color-scale-3 { fill: #30a14e; }
        .color-scale-4 { fill: #216e39; }
        .color-scale-5 { fill: #1a4a2a; }
        .color-over { fill: #ffd700; }
        .today { stroke: #e53e3e; stroke-width: 2; }
        .summer { stroke: #3182ce; stroke-dasharray: 2 2; stroke-width: 1.5; }

        @keyframes sparkle-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 4px #ffd700; }
          50% { transform: scale(1.1); box-shadow: 0 0 12px #ffd700; }
        }
        .sparkle {
          animation: sparkle-pulse 1.5s infinite ease-in-out;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
};
console.log(firebaseConfig);
export default App;
