import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US').format(number)
}

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

export const calculateProfitMargin = (sellingPrice, costPrice) => {
  if (!sellingPrice || !costPrice) return 0
  return ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(2)
}

export const calculateProfit = (sellingPrice, costPrice, quantity = 1) => {
  if (!sellingPrice || !costPrice) return 0
  return (sellingPrice - costPrice) * quantity
}