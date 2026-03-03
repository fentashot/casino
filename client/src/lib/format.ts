/* ============================================================================
   Shared Formatting Utilities
   Used across multiple components to eliminate duplication.
   ============================================================================ */

/**
 * Format a number as Polish currency (PLN) with "zł" suffix.
 * No decimal places by default.
 */
export function formatCurrency(value: number): string {
  return (
    value.toLocaleString("pl-PL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " zł"
  );
}

/**
 * Format a number as Polish currency with 2 decimal places.
 * Used in the sidebar balance display.
 */
export function formatBalance(value: number): string {
  return value.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a large number in compact form (e.g. 1000 → "1k", 1500 → "1.5k").
 * Used for chip values and compact balance displays.
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(value);
}

/**
 * Format a profit/loss value with a leading +/- sign.
 */
export function formatProfit(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return prefix + formatCurrency(value);
}
