"use client";

import { useMyOSData } from "@/lib/data/store";

export default function ActivityPage() {
  const { data } = useMyOSData();
  return (
    <>
      <div className="page-header"><div><h1>活动记录</h1><p>记录核心操作，不保存密钥和不必要的私人正文。</p></div></div>
      <section className="panel"><div className="timeline">{data.activities.map((activity) => <div className="timeline-item" key={activity.id}><strong>{activity.action}</strong><p>{activity.detail} / {activity.time} / {activity.result}</p></div>)}</div></section>
    </>
  );
}
