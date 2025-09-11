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
  const [streak, setStreak] = useState(0);
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
    const calculateStreak = () => {
      if (!counts || Object.keys(counts).length === 0) {
        return 0;
      }
      
      let currentStreak = 0;
      let checkDate = dayjs();
      
      if ((counts[checkDate.format('YYYY-MM-DD')] || 0) === 0) {
        checkDate = checkDate.subtract(1, 'day');
      }

      // Loop backwards day-by-day to count consecutive days
      while (counts[checkDate.format('YYYY-MM-DD')] > 0) {
        currentStreak++;
        checkDate = checkDate.subtract(1, 'day');
      }
      
      return currentStreak;
    };

    setStreak(calculateStreak());
  }, [counts]);

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
  const daysToLastTest = Math.max(0, dayjs('2025-12-01').diff(dayjs(), 'day'));
  const daysToMidterm = Math.max(0, dayjs('2025-10-21').diff(dayjs(), 'day'));

  return (
   
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

      <div className="flex-auto my-8 max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-around text-center">
          <div>
                    <p className="text-sm text-gray-500">合計学習量</p>
                    <p className="text-3xl font-bold text-gray-800">
                        {totalCount.toLocaleString()}
                        <span className="text-base font-medium text-gray-600 ml-1">問</span>
                    </p>
                </div>

                {/* Today's Count */}
                <div className="border-l border-gray-200 px-6 sm:px-8">
                    <div className="flex items-center justify-center">
                        <p className="text-sm text-gray-500">今日</p>
                        {isNewRecord && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full animate-pulse">
                                新記録!
                            </span>
                        )}
                    </div>
                    <p className="text-3xl font-bold text-gray-800">
                        {counts[today] || 0}
                        <span className="text-base font-medium text-gray-600 ml-1">問</span>
                    </p>
                </div>

              <div className="border-l border-gray-200 pl-6 sm:pl-8">
                    <p className="text-sm text-gray-500">継続</p>
                    <div className="flex items-center justify-center mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-colors duration-500 ${streak > 0 ? 'text-orange-500' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.934L10 3.414 7.877 1.29a1 1 0 00-1.45.385L2.5 8.536a1 1 0 00.385 1.45l6.25 4.375a1 1 0 001.23-.001l6.25-4.375a1 1 0 00.385-1.45l-3.877-6.857z" clipRule="evenodd" />
                        </svg>
                         <p className="text-3xl font-bold text-gray-800 ml-1">
                            {streak}
                            <span className="text-base font-medium text-gray-600 ml-1">日</span>
                        </p>
                    </div>
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
        
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 flex items-center space-x-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="bg-blue-400 p-3 rounded-full">
            <span class="text-3xl">📝</span>
          </div>
          <div>
            <p className="text-blue-600 font-semibold">中間試験開始まで</p>
            <p className="text-4xl font-bold text-blue-800">{daysToMidterm}<span className="text-xl ml-1">日</span></p>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 flex items-center space-x-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="bg-yellow-400 p-3 rounded-full">
            <span class="text-3xl">📅</span>
          </div>
          <div>
            <p className="text-yellow-600 font-semibold">期末試験開始まで</p>
            <p className="text-4xl font-bold text-yellow-800">{daysToLastTest}<span className="text-xl ml-1">日</span></p>
          </div>
        </div>

      </div>
      
    </>
  );
};

export default IntegrationCalendar;
