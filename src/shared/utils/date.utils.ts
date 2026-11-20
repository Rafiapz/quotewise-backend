/**
 * Date utilities for QuoteWise.
 */

/**
 * Calculates lead time delivery date from days or date string.
 */
export function calculateLeadTimeDate(leadTime: number | string): Date {
  const parsed = Number(leadTime);
  if (
    !isNaN(parsed) &&
    parsed > 0 &&
    !String(leadTime).includes("-") &&
    !String(leadTime).includes("/")
  ) {
    const d = new Date();
    d.setDate(d.getDate() + parsed);
    return d;
  }
  return new Date(leadTime);
}

/**
 * Calculates the integer number of lead time days between createdAt and leadTime.
 */
export function calculateLeadTimeDays(
  leadTime: Date | string,
  createdAt: Date | string = new Date()
): number {
  const diffMs = new Date(leadTime).getTime() - new Date(createdAt).getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}
