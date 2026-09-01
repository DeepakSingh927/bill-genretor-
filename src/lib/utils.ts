import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BillItem } from "@/types/bill";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getItemAmount(item: BillItem): number {
  const qty = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate) || 0;
  if (!qty || !rate) return 0;
  
  if (item.unit === "gm") {
    return (qty / 1000) * rate;
  }
  return qty * rate;
}
