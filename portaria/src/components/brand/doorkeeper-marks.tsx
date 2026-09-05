type BrandTone = "green" | "charcoal" | "light" | "turquoise" | "terracotta";

type BrandMarkProps = {
  tone?: BrandTone;
  className?: string;
  priority?: boolean;
};

const TONE_CLASS: Record<BrandTone, string> = {
  green: "text-doorkeeperTurquoise",
  charcoal: "text-white",
  light: "text-ink",
  turquoise: "text-doorkeeperTurquoise",
  terracotta: "text-doorkeeperTerracotta",
};

function BrandMask({
  src,
  label,
  tone,
  className,
  priority,
}: BrandMarkProps & { src: string; label: string }) {
  const mask = `url(${src})`;

  return (
    <span
      role="img"
      aria-label={label}
      data-priority={priority || undefined}
      className={`inline-block shrink-0 bg-current ${TONE_CLASS[tone ?? "light"]} ${className ?? ""}`}
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

/**
 * Marca oficial vetorizada a partir do original aprovado. O SVG é usado como
 * máscara para manter a mesma geometria em qualquer escala e em todas as cores.
 */
export function DoorKeeperWordmark({
  tone = "light",
  className = "",
  priority = false,
}: BrandMarkProps) {
  return (
    <BrandMask
      src="/brand/doorkeeper-wordmark.svg"
      label="The DoorKeeper"
      tone={tone}
      priority={priority}
      className={className}
    />
  );
}

export function DoorKeeperMonogram({
  tone = "light",
  className = "",
  priority = false,
}: BrandMarkProps) {
  return (
    <BrandMask
      src="/brand/doorkeeper-monogram.svg"
      label="The DoorKeeper"
      tone={tone}
      priority={priority}
      className={className}
    />
  );
}
