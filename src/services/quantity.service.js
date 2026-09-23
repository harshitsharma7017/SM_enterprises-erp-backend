/**
 * Quantity handling for UOM-based materials (DECIMAL(18,6) columns).
 *
 * Comparisons use integer micro-units so sums of fractional metres never
 * drift through floating-point error. Quantities are capped well inside
 * Number.MAX_SAFE_INTEGER once scaled.
 */
const SCALE = 1e6;
export const MAX_QUANTITY = 999999999;

export const quantity = {
  /**
   * Returns an error message, or null when `value` is a positive number with
   * no more decimals than the unit allows.
   */
  validate: (value, decimalPlaces, label = 'Quantity') => {
    if (value === undefined || value === null || String(value).trim() === '') return `${label} is required`;
    const text = String(value).trim();
    if (!/^\d+(\.\d+)?$/.test(text)) return `${label} must be a positive number`;
    const n = Number(text);
    if (!(n > 0)) return `${label} must be greater than zero`;
    if (n > MAX_QUANTITY) return `${label} cannot exceed ${MAX_QUANTITY}`;
    const decimals = (text.split('.')[1] || '').replace(/0+$/, '').length;
    const allowed = Number(decimalPlaces) || 0;
    if (decimals > allowed) {
      return allowed === 0
        ? `${label} must be a whole number for this unit`
        : `${label} allows at most ${allowed} decimal place(s) for this unit`;
    }
    return null;
  },

  toMicro: (value) => Math.round(Number(value || 0) * SCALE),

  fromMicro: (micro) => micro / SCALE,
};
