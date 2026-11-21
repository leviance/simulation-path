export function LabHeading({
  label,
  title,
  description,
  titleId,
  badge,
}: {
  label: string;
  title: string;
  description: string;
  titleId?: string;
  badge?: string;
}) {
  return (
    <header className="lab-heading">
      <div>
        <span>{label}</span>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
      </div>
      {badge && <b>{badge}</b>}
    </header>
  );
}
