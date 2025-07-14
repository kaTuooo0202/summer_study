// Reactアプリの書き換え済みバージョン
// ユーザーが指定した修正点:
// - 積分できたボタンを最上部に大きく表示
// - 宿題のステップ追加フォームを各宿題の下に表示

import React, { useState } from "react";
import "./index.css";
import IntegrationCalendar from './IntegrationCalendar';


function App() {
  
  const [homeworkList, setHomeworkList] = useState([
    {
      id: 1,
      title: "ポスター課題",
      steps: ["写真選定", "構図", "下書き", "清書"],
    },
    {
      id: 2,
      title: "読書感想文",
      steps: ["本を読む", "メモを取る", "下書き", "清書"],
    },
  ]);

  const [progress, setProgress] = useState({});
  const [newHomeworkTitle, setNewHomeworkTitle] = useState("");
  const [stepInputs, setStepInputs] = useState({});

  const handleStepDone = (hwId, stepIndex) => {
    const prev = progress[hwId] || [];
    const updated = [...prev];
    updated[stepIndex] = true;
    setProgress({ ...progress, [hwId]: updated });
  };

  const getProgressRate = (hwId, totalSteps) => {
    const stepsDone = (progress[hwId] || []).filter(Boolean).length;
    return Math.round((stepsDone / totalSteps) * 100);
  };

  const handleAddHomework = () => {
    if (!newHomeworkTitle.trim()) return;
    const newHw = {
      id: Date.now(),
      title: newHomeworkTitle,
      steps: [],
    };
    setHomeworkList([...homeworkList, newHw]);
    setNewHomeworkTitle("");
  };

  const handleAddStep = (hwId) => {
    const stepText = stepInputs[hwId]?.trim();
    if (!stepText) return;
    setHomeworkList((prev) =>
      prev.map((hw) =>
        hw.id === hwId ? { ...hw, steps: [...hw.steps, stepText] } : hw
      )
    );
    setStepInputs({ ...stepInputs, [hwId]: "" });
  };

  return (
    <div className="app-container">
      <h1>🌞 夏休み勉強アプリ</h1>

      
      <div className="App">
      {/* 他のコンポーネントがあるならその下などに配置 */}
      <IntegrationCalendar />
    </div>

      <section>
        <h2>宿題進捗</h2>

        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="新しい宿題を追加"
            value={newHomeworkTitle}
            onChange={(e) => setNewHomeworkTitle(e.target.value)}
          />
          <button onClick={handleAddHomework}>追加</button>
        </div>

        {homeworkList.map((hw) => (
          <div className="card" key={hw.id}>
            <h3>{hw.title}</h3>
            <p>進捗：{getProgressRate(hw.id, hw.steps.length)}%</p>
            {hw.steps.map((step, index) => (
              <div className="step-row" key={index}>
                <span
                  className={
                    progress[hw.id] && progress[hw.id][index] ? "done" : ""
                  }
                >
                  {step}
                </span>
                <button
                  onClick={() => handleStepDone(hw.id, index)}
                  disabled={progress[hw.id]?.[index]}
                >
                  できた！
                </button>
              </div>
            ))}

            <div style={{ marginTop: "10px" }}>
              <input
                type="text"
                placeholder="新しいステップ"
                value={stepInputs[hw.id] || ""}
                onChange={(e) =>
                  setStepInputs({ ...stepInputs, [hw.id]: e.target.value })
                }
              />
              <button onClick={() => handleAddStep(hw.id)}>ステップ追加</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default App;
