"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useMyOSData } from "@/lib/data/store";
import type { PrivacyLevel } from "@/lib/data/models";

export default function LifeAreasPage() {
  const { data, addLifeArea, updateLifeAreaStatus } = useMyOSData();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("normal");

  return (
    <>
      <div className="page-header">
        <div>
          <h1>人生领域</h1>
          <p>领域用于承载目标、习惯和复盘。有关联数据时应暂停或归档，不直接硬删除。</p>
        </div>
      </div>
      <form className="form-inline" onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        addLifeArea({ name, description, icon: "circle", privacyLevel });
        setName("");
        setDescription("");
      }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="领域名称" required />
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明" />
        <select value={privacyLevel} onChange={(event) => setPrivacyLevel(event.target.value as PrivacyLevel)}>
          <option value="normal">normal</option>
          <option value="sensitive">sensitive</option>
          <option value="vault">vault</option>
        </select>
        <button className="primary-button" type="submit"><Plus size={16} aria-hidden />新建领域</button>
      </form>
      <section className="panel">
        <table className="content-table">
          <thead><tr><th>顺序</th><th>领域</th><th>说明</th><th>隐私</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>{data.lifeAreas.sort((a, b) => a.displayOrder - b.displayOrder).map((area) => <tr key={area.id}><td>{area.displayOrder}</td><td>{area.name}</td><td>{area.description}</td><td>{area.privacyLevel}</td><td><span className="badge">{area.status}</span></td><td><button className="text-button" type="button" onClick={() => updateLifeAreaStatus(area.id, area.status === "active" ? "paused" : "active")}>{area.status === "active" ? "暂停" : "恢复"}</button></td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
