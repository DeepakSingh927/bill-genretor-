import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BillItem, SavedBill } from "@/types/bill";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getItemAmount(item: { quantity?: string; rate?: string; unit?: string }): number {
  const qty = parseFloat(item.quantity || "0") || 0;
  const rate = parseFloat(item.rate || "0") || 0;
  if (!qty || !rate) return 0;
  
  if (item.unit === "gm") {
    return (qty / 1000) * rate;
  }
  return qty * rate;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Converts a numeric amount to words in Indian Numbering System (Lakhs, Crores)
 * e.g. 870 -> "Eight Hundred and Seventy Rupees Only"
 */
export function numberToWordsINR(num: number): string {
  if (!num || isNaN(num) || num === 0) return "Zero Rupees Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 === 0 ? "" : " and " + inWords(n % 100));
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let result = inWords(integerPart) + " Rupees";
  if (decimalPart > 0) {
    result += " and " + inWords(decimalPart) + " Paise";
  }
  return result + " Only";
}

/**
 * Parses date from DD-MM-YYYY, YYYY-MM-DD, or ISO strings into a Date object
 */
export function parseBillDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Check DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Check YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Formats a date into DD-MM-YYYY format
 */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Generates the next sequential unique bill number (e.g. PGH-1001, PGH-1002, etc.)
 * Strictly avoids reusing any number even if bills are archived or deleted.
 */
export function generateNextBillNumber(allBills: SavedBill[], storedMaxSeq: number = 1000): string {
  let highestNum = storedMaxSeq;
  
  allBills.forEach((b) => {
    const match = b.billNumber?.match(/\d+/g);
    if (match) {
      const num = parseInt(match[match.length - 1], 10);
      if (!isNaN(num) && num > highestNum) {
        highestNum = num;
      }
    }
  });

  const nextNum = highestNum + 1;
  return `PGH-${nextNum}`;
}
