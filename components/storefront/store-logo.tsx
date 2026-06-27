import Image from "next/image";

type StoreLogoProps = {
  className?: string;
  /** "dark" = normal (on light bg), "light" = on dark bg (slight brightness boost) */
  variant?: "dark" | "light";
  showSubtitle?: boolean;
  src?: string;
};

export function StoreLogo({
  className = "",
  variant = "dark",
  showSubtitle = true,
  src = "/store-logo.png",
}: StoreLogoProps) {
  const isCircle = src === "/store-logo-circle.png";
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Image
        src={src}
        alt="Hải Sản Nhà Quê"
        width={220}
        height={220}
        className={`h-auto object-contain${isCircle ? " w-[120px]" : " w-[160px]"}${variant === "light" ? " brightness-0 invert" : ""}`}
        priority
      />
      {showSubtitle && (
        <span
          style={{
            color: variant === "dark" ? "#8b5c2a" : "#f5d9b8",
            fontSize: "9px",
            fontStyle: "italic",
            letterSpacing: "0.04em",
            marginTop: "1px",
          }}
        >
          &ldquo;TƯƠI NHƯ Ở SÔNG - RẺ NHƯ Ở CHỢ&rdquo;
        </span>
      )}
    </div>
  );
}
