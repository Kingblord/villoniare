import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount)
}

export function formatTokenAmount(amount: number): string {
  if (amount === 0) return "0"
  if (amount < 0.000001) return amount.toExponential(2)
  if (amount < 1) return amount.toFixed(6)
  if (amount < 1000) return amount.toFixed(4)
  return amount.toLocaleString()
}

export function truncateAddress(address: string | undefined | null): string {
  if (!address || typeof address !== "string" || address.length < 10) {
    return "0x0000...0000"
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
