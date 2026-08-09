"use client";

import { useState } from "react";
import { useMyOSData } from "@/lib/data/store";

export default function DailyReviewPage() {
  const { data, saveDailyReview } = useMyOSData();
  const current = data.dailyReviews.find((item) => item.date === "today");
  const [completed, setCompleted] = useState(current?.completed || "");
  const [problems, setProblems] = useState(current?.problems || "");
  const [state, setState] = useState(current?.state || "");
  const [tomorrowFocus, setTomorrowFocus] = useState(current?.tomorrowFocus || "");

  return (
    <>
      <div className="page-header"><div><h1>每日复盘</h1><p>四个问题，保存真实记录；AI 未配置时不生成模拟结论。</p></div></div>
      <form className="panel" onSubmit={(event) => {
        event.preventDefault();
        saveDailyReview({ date: "today", completed, problems, state, tomorrowFocus });
      }}>
        <div className="panel-header"><h2>今天</h2><button className="primary-button" type="submit">保存复盘</button></div>
        <div style={{ padding: 14, display: "grid", gap: 12 }}>
          <label>今天完成了什么？<textarea className="search-input" value={completed} onChange={(event) => setCompleted(event.target.value)} /></label>
          <label>今天遇到了什么问题？<textarea className="search-input" value={problems} onChange={(event) => setProblems(event.target.value)} /></label>
          <label>今天的状态怎么样？<textarea className="search-input" value={state} onChange={(event) => setState(event.target.value)} /></label>
          <label>明天最重要的事情是什么？<textarea className="search-input" value={tomorrowFocus} onChange={(event) => setTomorrowFocus(event.target.value)} /></label>
        </div>
      </form>
    </>
  );
}
