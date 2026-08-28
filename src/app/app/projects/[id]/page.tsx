"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { ProjectAgentWorkspace } from "@/features/projects/project-agent-workspace";
import { ProjectDeliveryView } from "@/features/projects/project-delivery-view";
import { useMyOSData } from "@/lib/data/store";
import { useCreationCenter } from "@/features/creation/creation-context";

export default function ProjectDetailPage() {
  const { openCreation } = useCreationCenter();
  const params = useParams<{ id: string }>();
  const { data } = useMyOSData();
  const project = data.projects.find((item) => item.id === params.id);

  if (!project) {
    return (
      <div className="panel">
        <div className="empty-state">项目不存在。<Link href="/app/projects">返回项目中心</Link></div>
      </div>
    );
  }

  const tasks = data.tasks.filter((task) => task.project === project.name);
  const files = data.files.filter((file) => file.project === project.name);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          <p>{project.category} / {project.path}</p>
        </div>
        <div className="project-detail-actions"><button className="primary-button" type="button" onClick={(event) => openCreation({ type: "task", trigger: event.currentTarget })}><Plus size={16} aria-hidden />新建任务</button><span className={`badge ${project.status}`}>{project.status}</span></div>
      </div>
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header"><h2>项目概览</h2></div>
          <div className="table-list">
            <div className="row"><span>下一步行动</span><strong>{project.nextAction}</strong></div>
            <div className="row"><span>最近更新</span><strong>{project.updatedAt}</strong></div>
            <div className="row"><span>收藏</span><strong>{project.favorite ? "是" : "否"}</strong></div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2>关联任务</h2></div>
          <div className="table-list">
            {tasks.length ? tasks.map((task) => <div className="row" key={task.id}><span>{task.title}</span><span className={`badge ${task.priority}`}>{task.priority}</span></div>) : <div className="empty-state">暂无任务</div>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2>关联文件</h2></div>
          <div className="table-list">
            {files.length ? files.map((file) => <div className="row" key={file.id}><span>{file.name}</span><span className="badge">{file.kind}</span></div>) : <div className="empty-state">暂无文件</div>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2>开发信息</h2></div>
          <div className="table-list">
            <div className="row"><span>启动命令</span><code>pnpm dev</code></div>
            <div className="row"><span>构建命令</span><code>pnpm build</code></div>
            <div className="row"><span>测试命令</span><code>pnpm test</code></div>
          </div>
        </section>
      </div>
      <ProjectDeliveryView project={project} data={data} />
      <ProjectAgentWorkspace project={project} data={data} />
    </>
  );
}
