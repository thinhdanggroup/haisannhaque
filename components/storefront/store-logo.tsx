type StoreLogoProps = {
  className?: string;
  /** "dark" = brown text (on light bg), "light" = white/cream text (on dark bg) */
  variant?: "dark" | "light";
  showSubtitle?: boolean;
};

function NomLaIcon() {
  return (
    <svg
      width="52"
      height="56"
      viewBox="0 0 64 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g transform="rotate(-22, 32, 54)">
        {/* Main cone body */}
        <path
          d="M32 6 Q12 38 2 58 Q32 52 62 58 Q52 38 32 6Z"
          fill="#C8A660"
        />

        {/* Inner pattern clipped to hat shape */}
        <clipPath id="nom-la-clip">
          <path d="M32 6 Q12 38 2 58 Q32 52 62 58 Q52 38 32 6Z" />
        </clipPath>
        <g clipPath="url(#nom-la-clip)" stroke="#9A7038" strokeWidth="0.65" fill="none">
          {/* Horizontal arcs — bamboo ring layers */}
          <path d="M22 20 Q32 15 42 20" />
          <path d="M16 31 Q32 25 48 31" />
          <path d="M10 42 Q32 36 54 42" />
          <path d="M6 52 Q32 46 58 52" />
          {/* Radiating ribs from apex */}
          <line x1="32" y1="6" x2="2" y2="58" />
          <line x1="32" y1="6" x2="10" y2="57" />
          <line x1="32" y1="6" x2="19" y2="55" />
          <line x1="32" y1="6" x2="32" y2="53" />
          <line x1="32" y1="6" x2="45" y2="55" />
          <line x1="32" y1="6" x2="54" y2="57" />
          <line x1="32" y1="6" x2="62" y2="58" />
        </g>

        {/* Outer outline */}
        <path
          d="M32 6 Q12 38 2 58 Q32 52 62 58 Q52 38 32 6Z"
          fill="none"
          stroke="#9A7038"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Apex knob */}
        <circle cx="32" cy="6" r="3" fill="#9A7038" />
        <circle cx="32" cy="6" r="1.5" fill="#C8A660" />
      </g>
    </svg>
  );
}

export function StoreLogo({
  className = "",
  variant = "dark",
  showSubtitle = true,
}: StoreLogoProps) {
  const textColor = variant === "dark" ? "#5c3317" : "#ffffff";
  const subtitleColor = variant === "dark" ? "#8b5c2a" : "#f5d9b8";

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <NomLaIcon />
      <div className="flex flex-col leading-none">
        <span
          style={{
            fontFamily: "var(--font-dancing-script), cursive",
            color: textColor,
            fontSize: "1.75rem",
            lineHeight: 1.1,
          }}
        >
          Hải Sản Nhà Quê
        </span>
        {showSubtitle && (
          <span
            style={{
              color: subtitleColor,
              fontSize: "9px",
              fontStyle: "italic",
              letterSpacing: "0.04em",
              textAlign: "center",
              marginTop: "1px",
            }}
          >
            &ldquo;TƯƠI NHƯ Ở SÔNG - RẺ NHƯ Ở CHỢ&rdquo;
          </span>
        )}
      </div>
    </div>
  );
}
