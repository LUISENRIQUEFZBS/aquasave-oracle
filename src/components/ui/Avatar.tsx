function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  image,
  size = 32,
}: {
  name: string;
  image?: string | null;
  size?: number;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external
      // Google-hosted URL (googleusercontent.com); next/image would need
      // that domain allowlisted in next.config.ts, and a plain <img> is
      // the simpler choice for a small avatar with no layout-shift risk.
      <img
        src={image}
        alt={name}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-primary font-medium text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden={!!name}
    >
      {getInitials(name)}
    </div>
  );
}