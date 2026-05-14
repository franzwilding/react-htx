import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn's canonical class-merge helper: combine conditional class lists with
 * `clsx`, then collapse Tailwind conflicts with `tailwind-merge`. All of our
 * UI primitives accept a `className` prop and pass it through `cn` so callers
 * can override anything from outside.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
