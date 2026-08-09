"use client";

import { Download, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import type { MyOSData } from "@/lib/data/models";
import { useMyOSData } from "@/lib/data/store";

type FileStatus = {
  backendMode: "local-file" | "supabase";
  storageMode: "local-disk" | "supabase-storage";
  bucket: string | null;
  maxUploadMb: number;
  backupIncludesBinaries: boolean;
  message: string;
};

export default function FilesPage() {
  const { data } = useMyOSData();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("PDF");
  const [project, setProject] = useState("");
  const [size, setSize] = useState("");
  const [uploadProject, setUploadProject] = useState("");
  const [uploading, setUploading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [status, setStatus] = useState<FileStatus | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshFileStatus() {
    const response = await fetch("/api/files/status", { cache: "no-store" });
    const body = await response.json().catch(() => null) as FileStatus | { error?: string } | null;
    if (!response.ok) {
      setError((body as { error?: string } | null)?.error || "读取文件存储状态失败。");
      return;
    }
    setStatus(body as FileStatus);
  }

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");
    setError("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("project", uploadProject || "未关联");

    try {
      const response = await fetch("/api/files/upload", { method: "POST", body: formData });
      const body = await response.json().catch(() => null) as { data?: MyOSData; error?: string } | null;
      if (!response.ok || !body?.data) throw new Error(body?.error || "上传失败。");
      window.dispatchEvent(new CustomEvent("myos:data-changed", { detail: body.data }));
      form.reset();
      setUploadProject("");
      setMessage(`${file.name} 已上传并登记。`);
      void refreshFileStatus();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传失败。");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    void refreshFileStatus();
  }, []);

  async function deleteFile(id: string, filename: string) {
    if (!window.confirm(`确定删除「${filename}」吗？`)) return;
    setDeleting(id);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/files/delete/${id}`, { method: "DELETE" });
      const body = await response.json().catch(() => null) as { data?: MyOSData; error?: string } | null;
      if (!response.ok || !body?.data) throw new Error(body?.error || "删除失败。");
      window.dispatchEvent(new CustomEvent("myos:data-changed", { detail: body.data }));
      setMessage(`${filename} 已删除。`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败。");
    } finally {
      setDeleting("");
    }
  }

  async function registerFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setRegistering(true);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "addFileRecord",
        payload: {
          name,
          kind,
          project: project || "未关联",
          size: size || "未知"
        }
      });
      publishMyOSData(next);
      setName("");
      setSize("");
      setMessage(`${name} 已登记。`);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "登记文件失败。");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>文件中心</h1>
          <p>上传、登记和下载你的资料；未接 Supabase Storage 时使用本地私有文件目录。</p>
        </div>
      </div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <section className="panel file-status-panel">
        <div className="panel-header">
          <h2>存储状态</h2>
          <span className={`badge ${status?.storageMode === "supabase-storage" ? "success" : "warning"}`}>
            {status?.storageMode === "supabase-storage" ? "Supabase Storage" : "本地文件"}
          </span>
        </div>
        <div className="metric-strip">
          <div className="metric-item"><span>后端模式</span><strong>{status?.backendMode || "读取中"}</strong></div>
          <div className="metric-item"><span>上传上限</span><strong>{status ? `${status.maxUploadMb} MB` : "读取中"}</strong></div>
          <div className="metric-item"><span>Bucket</span><strong>{status?.bucket || "本地目录"}</strong></div>
          <div className="metric-item"><span>备份文件</span><strong>{status?.backupIncludesBinaries ? "含原文件" : "仅记录"}</strong></div>
        </div>
        <p className="row-subtitle" style={{ padding: "0 14px 14px", whiteSpace: "normal" }}>
          {status?.message || "正在读取文件存储状态。"} JSON 备份只保存文件记录，不会打包原始二进制文件。
        </p>
      </section>
      <form className="form-inline" onSubmit={uploadFile}>
        <input name="file" type="file" required />
        <select value={uploadProject} onChange={(event) => setUploadProject(event.target.value)}>
          <option value="">不关联项目</option>
          {data.projects.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}
        </select>
        <button className="primary-button" type="submit" disabled={uploading}>
          <Upload size={16} aria-hidden />{uploading ? "上传中" : "上传文件"}
        </button>
      </form>
      <form className="form-inline" onSubmit={registerFile}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="文件名，例如 课程报告要求.pdf" required />
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option>PDF</option><option>Word</option><option>PPT</option><option>Excel</option><option>图片</option><option>代码</option><option>ZIP</option><option>其他</option>
        </select>
        <select value={project} onChange={(event) => setProject(event.target.value)}>
          <option value="">不关联项目</option>
          {data.projects.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}
        </select>
        <input value={size} onChange={(event) => setSize(event.target.value)} placeholder="大小，例如 1.2 MB" />
        <button className="primary-button" type="submit" disabled={registering}>
          <Plus size={16} aria-hidden />{registering ? "登记中" : "登记文件"}
        </button>
      </form>
      <section className="panel">
        <table className="content-table">
          <thead><tr><th>文件名</th><th>类型</th><th>关联项目/分类</th><th>大小</th><th>更新</th><th>操作</th></tr></thead>
          <tbody>{data.files.map((file) => (
            <tr key={file.id}>
              <td>{file.name}</td>
              <td>{file.kind}</td>
              <td>{file.project}</td>
              <td>{file.size}</td>
              <td>{file.updatedAt}</td>
              <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {file.sourceUrl ? <a className="text-button" href={file.sourceUrl}><Download size={15} aria-hidden />下载</a> : <span className="badge">仅登记</span>}
                  <button className="icon-button" type="button" aria-label={`删除 ${file.name}`} disabled={deleting === file.id} onClick={() => deleteFile(file.id, file.name)}>
                    <Trash2 size={15} aria-hidden />
                  </button>
                </span>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
