import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD', notation: "standard" | "compact" = "standard") {
  const isWholeNumber = amount % 1 === 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: isWholeNumber && notation !== 'compact' ? 0 : 2,
    maximumFractionDigits: isWholeNumber && notation !== 'compact' ? 0 : 2,
    notation: notation,
  }).format(amount);
}
