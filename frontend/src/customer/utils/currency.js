export const BASE_DELIVERY_FEE = 10;

const DEFAULT_CURRENCY_SETTINGS = {
  countryCode: "MY",
  code: "MYR",
  symbol: "RM",
  rate: 1,
};

export const roundMoney = (amount) =>
  Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;

export const formatCurrencyNumber = (amount) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export const normalizeCurrencySettings = (currency) => {
  const rate = Number(currency?.exchange_rate);

  if (!currency?.currency_symbol || Number.isNaN(rate) || rate <= 0) {
    return DEFAULT_CURRENCY_SETTINGS;
  }

  return {
    countryCode: currency.country_code || DEFAULT_CURRENCY_SETTINGS.countryCode,
    code: currency.currency_code || DEFAULT_CURRENCY_SETTINGS.code,
    symbol: currency.currency_symbol,
    rate,
  };
};
