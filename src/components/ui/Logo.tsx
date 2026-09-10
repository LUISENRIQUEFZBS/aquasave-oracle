export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Aquasave"
    >
      <defs>
        <clipPath id="dropClip">
          <path d="M50 8 C50 8 22 46 22 66 C22 85 34.5 96 50 96 C65.5 96 78 85 78 66 C78 46 50 8 50 8 Z" />
        </clipPath>
      </defs>
      <path
        d="M50 8 C50 8 22 46 22 66 C22 85 34.5 96 50 96 C65.5 96 78 85 78 66 C78 46 50 8 50 8 Z"
        fill="#dcedf0"
      />
      <g clipPath="url(#dropClip)">
        <rect x="22" y="48" width="18.7" height="48" fill="#3fc1d0" />
        <rect x="40.7" y="64" width="18.6" height="32" fill="#157a8a" />
        <rect x="59.3" y="80" width="18.7" height="16" fill="#0f5c68" />
      </g>
      <path
        d="M50 8 C50 8 22 46 22 66 C22 85 34.5 96 50 96 C65.5 96 78 85 78 66 C78 46 50 8 50 8 Z"
        fill="none"
        stroke="#0f5c68"
        strokeWidth="3"
      />
    </svg>
  );
}

export function Logo({
  markSize = 40,
  wordmarkSize = "text-xl",
  subtitle,
  variant = "light",
}: {
  markSize?: number;
  wordmarkSize?: string;
  subtitle?: string;
  variant?: "light" | "dark";
}) {
  return (
    <div className="flex items-center gap-1.5">
      <LogoMark size={markSize} />
      <div>
        {variant === "dark" ? (
          <p className={`font-bold leading-none tracking-tight text-white ${wordmarkSize}`}>
            Aquasave
          </p>
        ) : (
          <p className={`font-bold leading-none tracking-tight ${wordmarkSize}`}>
            <span style={{ color: "#0f5c68" }}>Aqua</span>
            <span style={{ color: "#157a8a" }}>save</span>
          </p>
        )}
        {subtitle && (
          <p
            className={`mt-1 text-sm ${variant === "dark" ? "text-white/60" : "text-text-muted"}`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}