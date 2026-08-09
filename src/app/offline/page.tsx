export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section className="panel" style={{ maxWidth: 520 }}>
        <div className="panel-header">
          <h1 style={{ margin: 0, fontSize: 22 }}>离线模式</h1>
        </div>
        <div style={{ padding: 16, color: "hsl(var(--muted))", lineHeight: 1.7 }}>
          当前网络不可用。MyOS 后续会支持更多离线草稿能力；当前可以先记录想法，恢复网络后再同步。
        </div>
      </section>
    </main>
  );
}
