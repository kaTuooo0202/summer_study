import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { Tooltip } from 'react-tooltip';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';

const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

const IntegrationCalendar = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({});
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const today = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    if (!user) {
      setCounts({});
      return;
    }
    const userId = user.uid;
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/integrationCounts`, 'dailyCounts');
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      setCounts(docSnap.exists() ? docSnap.data() : {});
    }, (error) => {
      console.error("Firestoreからのデータ取得に失敗しました:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (Object.keys(counts).length > 0) {
      const todayCount = counts[today] || 0;
      if (todayCount === 0) {
        setIsNewRecord(false);
        return;
      }
      const maxCount = Math.max(...Object.values(counts).filter(v => typeof v === 'number'));
      setIsNewRecord(todayCount >= maxCount);
    } else {
      setIsNewRecord(false);
    }
  }, [counts, today]);

  const handleAddIntegration = useCallback(async () => {
    if (!user) return;

    const userId = user.uid;
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/integrationCounts`, 'dailyCounts');
    const newCount = (counts[today] || 0) + 1;

    try {
      await setDoc(userDocRef, { ...counts, [today]: newCount });
    } catch (error) {
      console.error("Firestoreの更新に失敗しました:", error);
    }
  }, [user, counts, today]);
  
  const handleMouseDown = () => { setIsPressed(true); setIsBouncing(false); };
  const handleMouseUp = () => { setIsPressed(false); setIsBouncing(true); };
  const handleMouseLeave = () => { setIsPressed(false); setIsBouncing(false); };
  const handleAnimationEnd = () => setIsBouncing(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (user && event.code === 'Space' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        setIsPressed(true);
        setIsBouncing(true);
        handleAddIntegration();
        setTimeout(() => { setIsPressed(false); }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [user, handleAddIntegration]);

  const getClassForValue = (count) => {
    if (count === 0) return 'color-empty';
    if (count < 20) return 'color-scale-1';
    if (count < 40) return 'color-scale-2';
    if (count < 60) return 'color-scale-3';
    if (count < 80) return 'color-scale-4';
    if (count < 100) return 'color-scale-5';
    return 'color-over glow';
  };

  const CustomHeatmap = React.memo(() => {
    const todayDayjs = dayjs();
    const startDate = todayDayjs.subtract(180, 'day').startOf('week');
    const endDate = todayDayjs.add(180, 'day').endOf('week');
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    const allDays = [];
    let currentDay = startDate;

    while (currentDay.isBefore(endDate) || currentDay.isSame(endDate, 'day')) {
      allDays.push(currentDay);
      currentDay = currentDay.add(1, 'day');
    }
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }

    const monthLabels = weeks.map((week, i) => {
        const firstDayOfMonth = week.find(day => day.date() === 1);
        return firstDayOfMonth ? { x: i * 16, label: firstDayOfMonth.format('M月') } : null;
    }).filter(Boolean);

    return (
      <div className="overflow-x-auto p-2">
        <svg width={weeks.length * 16} height={140}>
          <g transform="translate(0, 15)">
            {monthLabels.map(({ x, label }) => ( <text key={label} x={x} y={0} className="text-xs fill-gray-500">{label}</text> ))}
          </g>
          <g transform="translate(0, 30)">
            {weekDays.map((day, i) => ( <text key={day} x={-15} y={i * 16 + 12} className="text-xs fill-gray-500" textAnchor="middle">{day}</text> ))}
            {weeks.map((week, weekIndex) => (
              <g key={weekIndex} transform={`translate(${weekIndex * 16}, 0)`}>
                {week.map((day) => {
                  const dateStr = day.format('YYYY-MM-DD');
                  const count = counts[dateStr] || 0;
                  let classNames = getClassForValue(count);
                  if (dateStr === today) classNames += ' today';
                  if (day.isAfter('2025-07-17') && day.isBefore('2025-09-11')) classNames += ' summer';
                  if (day.isAfter(dayjs(), 'day')) classNames += ' opacity-50';

                  return (
                    <rect key={dateStr} y={day.day() * 16} width={12} height={12} rx={2} ry={2}
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

  const totalCount = Object.values(counts).reduce((sum, c) => sum + (typeof c === 'number' ? c : 0), 0);
  const goal = 5000;
  const progressPercentage = Math.min((totalCount / goal) * 100, 100);
  const daysToSummerEnd = Math.max(0, dayjs('2025-09-11').diff(dayjs(), 'day'));
  const daysToMidterm = Math.max(0, dayjs('2025-10-21').diff(dayjs(), 'day'));

  return (
    // ★変更点: ヘッダー部分はApp.jsに移動したので削除
    <>
      <div className="my-8 flex flex-col items-center">
        <button
          onClick={handleAddIntegration}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onAnimationEnd={handleAnimationEnd}
          className={`w-full sm:w-auto text-xl sm:text-2xl md:text-3xl px-8 py-4 md:px-16 md:py-8 whitespace-nowrap bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold rounded-full shadow-xl shadow-poyon-glow hover:shadow-2xl hover:scale-103 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-orange-300 ${isPressed ? 'animate-press-animation active:brightness-90 shadow-poyon-pressed' : ''} ${isBouncing ? 'animate-poyon-animation' : ''}`}
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
            <div className="flex items-baseline">
              <p className="text-sm text-gray-500">今日解いた問題数</p>
              {isNewRecord && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full animate-pulse">
                  新記録！
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-800 ">
              {counts[today] || 0}
              <span className="text-base font-medium text-gray-600 ">問</span>
            </p>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-semibold text-green-600">進捗</span>
            <span className="text-sm font-mono text-gray-500">{totalCount.toLocaleString()} / {goal.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      <div className="mt-8 bg-white p-4 rounded-lg shadow-xl overflow-x-auto">
        <div className="w-fit mx-auto">
          <CustomHeatmap />
        </div>
        <Tooltip id="heatmap-tooltip" />
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 flex items-center space-x-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="bg-yellow-400 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <div>
            <p className="text-yellow-600 font-semibold">二学期開始まで</p>
            <p className="text-4xl font-bold text-yellow-800">{daysToSummerEnd}<span className="text-xl ml-1">日</span></p>
          </div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 flex items-center space-x-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="bg-blue-400 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m-5.247-8.995l10.494 0M12 6.253L5.253 12 12 17.747 18.747 12 12 6.253z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 19h16" /></svg>
          </div>
          <div>
            <p className="text-blue-600 font-semibold">中間試験開始まで</p>
            <p className="text-4xl font-bold text-blue-800">{daysToMidterm}<span className="text-xl ml-1">日</span></p>
          </div>
        </div>
      </div>
      
    </>
  );
};

export default IntegrationCalendar;
