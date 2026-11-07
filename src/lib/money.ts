/** Format minor units (pence/cents) for display in the visitor's locale. */
export function formatMoney(amountMinor: number, currency = "GBP", locale = "en-GB") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}
