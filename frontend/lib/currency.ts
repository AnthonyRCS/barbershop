export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: "PEN", name: "Sol peruano",             symbol: "S/.",  locale: "es-PE" },
  { code: "USD", name: "Dólar americano",          symbol: "$",    locale: "en-US" },
  { code: "EUR", name: "Euro",                     symbol: "€",    locale: "es-ES" },
  { code: "MXN", name: "Peso mexicano",            symbol: "$",    locale: "es-MX" },
  { code: "COP", name: "Peso colombiano",          symbol: "$",    locale: "es-CO" },
  { code: "CLP", name: "Peso chileno",             symbol: "$",    locale: "es-CL" },
  { code: "ARS", name: "Peso argentino",           symbol: "$",    locale: "es-AR" },
  { code: "BRL", name: "Real brasileño",           symbol: "R$",   locale: "pt-BR" },
  { code: "BOB", name: "Boliviano",                symbol: "Bs.",  locale: "es-BO" },
  { code: "PYG", name: "Guaraní paraguayo",        symbol: "₲",    locale: "es-PY" },
  { code: "UYU", name: "Peso uruguayo",            symbol: "$U",   locale: "es-UY" },
  { code: "VES", name: "Bolívar venezolano",       symbol: "Bs.S", locale: "es-VE" },
  { code: "DOP", name: "Peso dominicano",          symbol: "RD$",  locale: "es-DO" },
  { code: "GTQ", name: "Quetzal guatemalteco",     symbol: "Q",    locale: "es-GT" },
  { code: "HNL", name: "Lempira hondureño",        symbol: "L",    locale: "es-HN" },
  { code: "NIO", name: "Córdoba nicaragüense",     symbol: "C$",   locale: "es-NI" },
  { code: "CRC", name: "Colón costarricense",      symbol: "₡",    locale: "es-CR" },
  { code: "PAB", name: "Balboa panameño",          symbol: "B/.",  locale: "es-PA" },
  { code: "GBP", name: "Libra esterlina",          symbol: "£",    locale: "en-GB" },
  { code: "CAD", name: "Dólar canadiense",         symbol: "CA$",  locale: "en-CA" },
];

export function getCurrencyMeta(code: string): CurrencyMeta {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) ??
    SUPPORTED_CURRENCIES.find((c) => c.code === "PEN")!
  );
}

/**
 * Formats a numeric value using the given ISO 4217 currency code.
 * Falls back to PEN if the code is not found or formatting fails.
 */
export function formatCurrency(value: string | number, currencyCode = "PEN"): string {
  const meta = getCurrencyMeta(currencyCode);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      minimumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${meta.symbol} ${Number(value).toFixed(2)}`;
  }
}
