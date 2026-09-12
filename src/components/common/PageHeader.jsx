export default function PageHeader({ title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
