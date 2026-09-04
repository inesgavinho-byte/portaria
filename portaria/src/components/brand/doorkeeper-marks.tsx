import Image from "next/image";

type WordmarkProps = {
  tone?: "green" | "charcoal" | "light";
  className?: string;
  priority?: boolean;
};

/**
 * Marcas extraídas do manual original. Mantêm o desenho e as proporções
 * aprovadas; não são uma reconstrução tipográfica do logótipo.
 */
export function DoorKeeperWordmark({
  tone = "green",
  className = "",
  priority = false,
}: WordmarkProps) {
  const green = tone === "green";
  const light = tone === "light";
  return (
    <Image
      src={
        green
          ? "/brand/doorkeeper-wordmark-green.png"
          : light
            ? "/brand/doorkeeper-wordmark-light.png"
            : "/brand/doorkeeper-wordmark-charcoal.png"
      }
      alt="The DoorKeeper"
      width={green ? 220 : 480}
      height={green ? 140 : 300}
      priority={priority}
      className={className}
    />
  );
}

export function DoorKeeperMonogram({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/doorkeeper-monogram.png"
      alt="The DoorKeeper"
      width={360}
      height={360}
      priority={priority}
      className={className}
    />
  );
}
