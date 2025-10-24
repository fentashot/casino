import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const rRed = '#FF013C'
export const rBlack = '#293136'
export const rGreen = '#16a34a'
