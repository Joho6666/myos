"use client";

import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Goal, Project } from "@/lib/data/models";
import { projectCategories, projectTemplates } from "./project-templates";

type ProjectQuickCreateProps = {
  goals: Goal[];
  saving: boolean;
  onCreate: (input: Pick<Project, "name" | "category" | "nextAction"> & { goalId?: string }) => Promise<Project | undefined>;
};

function splitProjectInput(value: string) {
  const separators = [" / ", " ｜ ", " | ", " - "];
  const separator = separators.find((item) => value.includes(item));

  if (!separator) {
    return { name: value.trim(), nextAction: "" };
  }

  const [name, ...rest] = value.split(separator);
  return { name: name.trim(), nextAction: rest.join(separator).trim() };
}

export function ProjectQuickCreate({ goals, saving, onCreate }: ProjectQuickCreateProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState(projectTemplates[0].category);
  const [nextAction, setNextAction] = useState(projectTemplates[0].nextAction);
  const [goalId, setGoalId] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const selectedTemplate = useMemo(() => projectTemplates.find((template) => template.category === category), [category]);
  const featuredTemplates = projectTemplates.filter((template) => template.featured);

  async function submit() {
    const parsed = splitProjectInput(draft);
    const name = parsed.name;
    const resolvedNextAction = parsed.nextAction || nextAction.trim() || "明确下一步行动";

    if (!name) {
      return;
    }

    try {
      const created = await onCreate({ name, category, nextAction: resolvedNextAction, goalId: goalId || undefined });
      setDraft("");
      setNextAction(selectedTemplate?.nextAction || "明确下一步行动");
      if (created) router.push(`/app/projects/${created.id}`);
    } catch {
      // Parent page renders the real backend error and the draft remains for retry.
    }
  }

  return (
    <section className="project-create panel" aria-labelledby="project-create-heading">
      <div className="project-create-main">
        <div>
          <h2 id="project-create-heading">快速新建项目</h2>
          <p>选模板，写项目名，创建后直接进入项目执行台。</p>
        </div>
        <div className="project-template-row" aria-label="项目模板">
          {featuredTemplates.map((template) => (
            <button
              className={template.category === category ? "template-chip template-card active" : "template-chip template-card"}
              key={template.id}
              type="button"
              onClick={() => {
                setCategory(template.category);
                setNextAction(template.nextAction);
              }}
              title={template.hint}
            >
              <strong>{template.label}</strong>
              <span>{template.hint}</span>
            </button>
          ))}
        </div>
        <div className="template-summary"><Sparkles size={14} aria-hidden />使用「{selectedTemplate?.label || "自定义"}」模板：{selectedTemplate?.nextAction || "创建后补充下一步。"}</div>
        <div className="quick-create-row">
          <input
            aria-label="项目名称"
            autoComplete="off"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="项目名，回车创建。也可写：循迹小车优化 / 整理 PID 调参"
          />
          <button className="primary-button" disabled={saving || !draft.trim()} type="button" onClick={() => void submit()}>
            <Plus size={16} aria-hidden />
            {saving ? "创建中" : "创建并进入"}
          </button>
        </div>
        <button className="advanced-toggle" type="button" onClick={() => setAdvancedOpen((open) => !open)}>
          <ChevronDown size={16} aria-hidden />
          {advancedOpen ? "收起模板与选项" : "更多模板与选项"}
        </button>
      </div>

      {advancedOpen ? (
        <div className="project-create-advanced">
          <label>
            类型
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {projectCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            下一步
            <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="下一步行动" />
          </label>
          <label>
            关联目标
            <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
              <option value="">不关联目标</option>
              {goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}
            </select>
          </label>
        </div>
      ) : null}
    </section>
  );
}
