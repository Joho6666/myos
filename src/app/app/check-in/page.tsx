"use client";

import { useState } from "react";
import { useMyOSData } from "@/lib/data/store";

export default function CheckInPage() {
  const { data, saveDailyCheckin } = useMyOSData();
  const current = data.dailyCheckins.find((item) => item.date === "today");
  const [energy, setEnergy] = useState(current?.energy || 3);
  const [mood, setMood] = useState(current?.mood || 3);
  const [stress, setStress] = useState(current?.stress || 2);
  const [sleepHours, setSleepHours] = useState(current?.sleepHours || 0);
  const [studyMinutes, setStudyMinutes] = useState(current?.studyMinutes || 0);
  const [workMinutes, setWorkMinutes] = useState(current?.workMinutes || 0);
  const [note, setNote] = useState(current?.note || "");

  return (
    <>
      <div className="page-header">
        <div>
          <h1>每日记录</h1>
          <p>本功能仅用于个人记录和趋势观察，不提供医疗诊断。</p>
        </div>
      </div>
      <form className="panel" onSubmit={(event) => {
        event.preventDefault();
        saveDailyCheckin({ date: "today", energy, mood, stress, sleepHours, studyMinutes, workMinutes, note });
      }}>
        <div className="panel-header"><h2>今天的状态</h2><button className="primary-button" type="submit">保存</button></div>
        <div style={{ padding: 14, display: "grid", gap: 12 }}>
          <label>睡眠时长<input className="search-input" type="number" min={0} step={0.5} value={sleepHours} onChange={(event) => setSleepHours(Number(event.target.value))} /></label>
          <label>精力 1-5<input className="search-input" type="number" min={1} max={5} value={energy} onChange={(event) => setEnergy(Number(event.target.value))} /></label>
          <label>情绪 1-5<input className="search-input" type="number" min={1} max={5} value={mood} onChange={(event) => setMood(Number(event.target.value))} /></label>
          <label>压力 1-5<input className="search-input" type="number" min={1} max={5} value={stress} onChange={(event) => setStress(Number(event.target.value))} /></label>
          <label>学习时长<input className="search-input" type="number" min={0} value={studyMinutes} onChange={(event) => setStudyMinutes(Number(event.target.value))} /></label>
          <label>工作时长<input className="search-input" type="number" min={0} value={workMinutes} onChange={(event) => setWorkMinutes(Number(event.target.value))} /></label>
          <label>简短备注<textarea className="search-input" value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </div>
      </form>
    </>
  );
}
