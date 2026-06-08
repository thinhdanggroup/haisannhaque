import { Fish, Shell, Waves } from "lucide-react";

type StorefrontPlaceholderImageProps = {
  label: string;
  variant?: "hero" | "banner" | "product" | "content";
  className?: string;
  positionClassName?: "relative" | "absolute";
};

type Tone = {
  background: string;
  icon: string;
  accent: string;
};

const tones: Tone[] = [
  {
    background: "bg-gradient-to-br from-teal-100 via-cyan-50 to-orange-50",
    icon: "text-teal-700/35",
    accent: "bg-orange-300/45",
  },
  {
    background: "bg-gradient-to-br from-sky-100 via-teal-50 to-white",
    icon: "text-sky-700/35",
    accent: "bg-teal-300/45",
  },
  {
    background: "bg-gradient-to-br from-orange-100 via-amber-50 to-teal-50",
    icon: "text-orange-700/35",
    accent: "bg-teal-300/40",
  },
  {
    background: "bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-50",
    icon: "text-emerald-700/35",
    accent: "bg-orange-300/40",
  },
];

export function isTextPlaceholderImage(imageUrl: string | null | undefined): boolean {
  return Boolean(imageUrl?.includes("placehold.co"));
}

function getTone(label: string): Tone {
  const score = Array.from(label).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return tones[score % tones.length];
}

export function StorefrontPlaceholderImage({
  label,
  variant = "product",
  className = "",
  positionClassName = "relative",
}: StorefrontPlaceholderImageProps) {
  const tone = getTone(label);
  const iconSize = variant === "product" ? "h-14 w-14" : "h-24 w-24 md:h-32 md:w-32";
  const iconClassName = `${iconSize} relative ${tone.icon}`;
  const iconIndex =
    Array.from(label).reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    ) % 3;

  return (
    <div
      data-testid="storefront-generated-placeholder"
      aria-hidden="true"
      className={`${positionClassName} flex h-full w-full items-center justify-center overflow-hidden ${tone.background} ${className}`}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/70 blur-sm md:h-36 md:w-36" />
      <div
        className={`absolute -bottom-10 -left-10 h-32 w-32 rounded-full ${tone.accent} blur-sm md:h-44 md:w-44`}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[repeating-linear-gradient(135deg,rgba(15,118,110,0.16)_0_1px,transparent_1px_10px)]" />
      {iconIndex === 0 ? (
        <Fish className={iconClassName} strokeWidth={1.5} />
      ) : iconIndex === 1 ? (
        <Waves className={iconClassName} strokeWidth={1.5} />
      ) : (
        <Shell className={iconClassName} strokeWidth={1.5} />
      )}
    </div>
  );
}
