export function Panel({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel" aria-labelledby={`${title}-heading`}>
      <div className="panel-header">
        <h2 id={`${title}-heading`}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Row({
  title,
  subtitle,
  meta
}: {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="row">
      <div>
        <div className="row-title">{title}</div>
        {subtitle ? <div className="row-subtitle">{subtitle}</div> : null}
      </div>
      {meta}
    </div>
  );
}
