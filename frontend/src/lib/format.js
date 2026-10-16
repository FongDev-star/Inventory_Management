export const money = (n) => "$" + Number(n || 0).toFixed(2);

export const PAYMENT_METHODS = {
  cash: "Cash",
  card: "Card",
  bank: "Bank transfer",
  other: "Other",
};