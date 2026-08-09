"use client";

import { useMemo } from "react";
import { buildWeeklyReview } from "@/features/life/calculations";
import { useMyOSData } from "@/lib/data/store";

export default function WeeklyReviewPage() {
  const { data, saveWeeklyReview } = useMyOSData();
  const summary = useMemo(() => buildWeeklyReview(data), [data]);

  return (
    <>
      <div className="page-header">
        <div><h1>每周复盘</h1><p>摘要来自任务、目标、习惯和每日记录。AI 未配置时只显示规则计算结果。</p></div>
        <button className="primary-button" type="button" onClick={() => saveWeeklyReview(summary)}>保存本周复盘</button>
      </div>
      <div className="panel-grid">
        <section className="panel"><div className="panel-header"><h2>任务摘要</h2></div><div className="table-list"><div className="row"><span>完成任务</span><strong>{summary.completedTaskIds.length}</strong></div><div className="row"><span>未完成任务</span><strong>{summary.unfinishedTaskIds.length}</strong></div></div></section>
        <section className="panel"><div className="panel-header"><h2>目标进度</h2></div><div style={{ padding: 14, whiteSpace: "pre-wrap" }}>{summary.goalProgress || "暂无目标进度"}</div></section>
        <section className="panel"><div className="panel-header"><h2>习惯与学习</h2></div><div className="table-list"><div className="row"><span>习惯完成率</span><strong>{summary.habitCompletionRate}%</strong></div><div className="row"><span>学习时间</span><strong>{summary.studyMinutes} 分钟</strong></div></div></section>
        <section className="panel"><div className="panel-header"><h2>状态趋势</h2></div><div className="table-list"><div className="row"><span>睡眠</span><strong>{summary.sleepTrend}</strong></div><div className="row"><span>情绪</span><strong>{summary.moodTrend}</strong></div><div className="row"><span>支出</span><strong>{summary.spendingSummaryPlaceholder}</strong></div></div></section>
      </div>
    </>
  );
}
