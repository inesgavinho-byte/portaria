import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes Tailwind, resolvendo conflitos.
 * Uso: cn("p-4", condicao && "p-6") → resultado: "p-6"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
