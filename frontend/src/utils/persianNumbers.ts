/**
 * Formats digits and strings (Keeps numbers in standard English digits)
 */
export function toPersianDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  return input.toString();
}

/**
 * Converts Persian numbers in a string to English digits (for API calls)
 */
export function toEnglishDigits(input: string | undefined | null): string {
  if (!input) return '';
  const persianToLatinDigitsMap: Record<string, string> = {
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
  };
  return input.replace(/[۰-۹]/g, (w) => persianToLatinDigitsMap[w] || w);
}

/**
 * Formats a currency amount with standard English comma-separated digits and Toman unit
 * Example: 15000000 -> 15,000,000 تومان
 */
export function formatPersianPrice(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '0 تومان';
  const num = Math.round(Number(amount));
  const formatted = num.toLocaleString('en-US');
  return `${formatted} تومان`;
}

/**
 * Formats timestamp into clean English 24-hour time (e.g. 14:35)
 */
export function formatPersianTime(isoString?: string): string {
  if (!isoString) {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      const now = new Date();
      return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}
