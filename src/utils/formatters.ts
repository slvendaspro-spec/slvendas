/**
 * Formats a number to Mozambican Meticais (MZN)
 * Example: 12450 -> "12.450,00 MZN"
 */
export function formatMZN(amount: number): string {
  const formatted = new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} MZN`;
}

/**
 * Returns date and time formatted in Africa/Maputo timezone
 */
export function getMaputoTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-MZ', {
    timeZone: 'Africa/Maputo',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Generates an audit-ready receipt number
 */
export function generateReceiptNumber(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  return `SLV-${year}-${rand}`;
}
