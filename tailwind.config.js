// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/components/IntegrationCalendar.{js,jsx,ts,tsx}",
    "./src/components/TodoList.{js,jsx,ts,tsx}",
    "./src/App.{js,jsx,ts,tsx}" 
  ],
  theme: {
    extend: {
      boxShadow: {
        // 通常時の内側の光沢（上からの光をよりぱっきりと、下からの影も調整）
        'poyon-glow': 'inset 0px 6px 10px rgba(255, 255, 255, 0.8), inset 0px -4px 8px rgba(0, 0, 0, 0.15)',
        // 押し込んだ時の内側の光沢（より平らで暗め、ぱっきり感を維持）
        'poyon-pressed': 'inset 0px 2px 10px rgba(0, 0, 0, 1), inset 0px -2px 4px rgba(255, 255, 255, 0.05)',
      },
       keyframes: {
        'press-animation': {
          '0%': { transform: 'scale(1)', boxShadow: '0 10px 15px rgba(0, 0, 0, 0.3)' },
          '100%': { transform: 'scale(0.8)' }, // より大きく沈むように 'scale(0.9)' に変更
        },
        'poyon-animation': {
          '0%': { transform: 'scale(0.8)' }, // 押された状態から開始
          '20%': { transform: 'scale(1.08)' }, // より大きく膨らむように 'scale(1.08)' に変更
          '40%': { transform: 'scale(0.95)' }, // バウンスを少なくするため、戻りを 'scale(0.99)' に変更
          '60%': { transform: 'scale(1.05)' }, // もう一度少しだけ膨らむが小さく
          '80%': { transform: 'scale(1.00)' }, // ほぼ元のサイズに
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'press-animation': 'press-animation 0.1s ease-out forwards', // 早く沈むように '0.1s' に変更
        'poyon-animation': 'poyon-animation 0.6s ease-out', // 全体のバウンス時間を '0.4s' に短縮
      },
    },
  },
  plugins: [],
}