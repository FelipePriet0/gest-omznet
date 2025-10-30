import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}
