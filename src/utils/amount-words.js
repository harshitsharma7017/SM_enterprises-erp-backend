/**
 * Amount in words for documents: "Rupees Seven Hundred Fifty and Twenty Paise
 * Only" (Indian lakh / crore grouping for INR) or "US Dollars Three Hundred
 * Fifty Only" (international grouping for other currencies).
 */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
  'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const belowThousand = (n) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? belowHundred(r) : ''].filter(Boolean).join(' ');
};

const indian = (n) => {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${indian(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(' ');
};

const international = (n) => {
  if (n === 0) return 'Zero';
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
  const parts = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(`${belowThousand(chunk)}${scales[i] ? ` ${scales[i]}` : ''}`);
    n = Math.floor(n / 1000);
    i += 1;
  }
  return parts.join(' ');
};

const CURRENCIES = {
  INR: ['Rupees', 'Paise'], USD: ['US Dollars', 'Cents'], EUR: ['Euros', 'Cents'], GBP: ['Pounds Sterling', 'Pence'],
  AED: ['UAE Dirhams', 'Fils'], AUD: ['Australian Dollars', 'Cents'], CAD: ['Canadian Dollars', 'Cents'], JPY: ['Japanese Yen', 'Sen'],
};

export const amountInWords = (amount, currencyCode = 'INR') => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  const cents = Math.round(Math.abs(Number(amount)) * 100);
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  // An ISO code maps to its words; anything else (e.g. a currency name) is used as written.
  const given = String(currencyCode || 'INR').trim();
  const code = given.toUpperCase();
  const [major, minor] = CURRENCIES[code] || [given, 'Cents'];
  const say = code === 'INR' ? indian : international;
  return `${major} ${say(whole)}${fraction ? ` and ${belowHundred(fraction)} ${minor}` : ''} Only`;
};
