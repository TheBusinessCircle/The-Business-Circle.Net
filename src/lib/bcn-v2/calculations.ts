/** GBP arithmetic: round monetary outputs to pence; do not round intermediate margins. */
export function money(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > 1e10)
    throw new Error(
      "Calculated amount is too large. Use smaller planning figures.",
    );
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function nonNegative(...values: number[]) {
  if (
    values.some((value) => !Number.isFinite(value) || value < 0 || value > 1e9)
  )
    throw new Error("Enter finite values from 0 to 1,000,000,000.");
}
export function jobPrice(input: {
  hours: number;
  hourlyCost: number;
  materials: number;
  expenses: number;
  overhead: number;
  margin: number;
  vat: number;
}) {
  const { hours, hourlyCost, materials, expenses, overhead, margin, vat } =
    input;
  nonNegative(hours, hourlyCost, materials, expenses, overhead, margin, vat);
  if (margin >= 100 || vat > 100)
    throw new Error("Margin must be below 100%; VAT must be at most 100%.");
  const cost = money(hours * hourlyCost + materials + expenses + overhead);
  const net = money(cost / (1 - margin / 100));
  const tax = money((net * vat) / 100);
  return { cost, net, profit: money(net - cost), tax, total: money(net + tax) };
}
export function breakEven(input: {
  fixed: number;
  price: number;
  variable: number;
  units: number;
}) {
  nonNegative(input.fixed, input.price, input.variable, input.units);
  const contribution = input.price - input.variable;
  const unitsToBreakEven =
    contribution > 0 ? Math.ceil(input.fixed / contribution) : null;
  return {
    contribution: money(contribution),
    unitsToBreakEven,
    revenueToBreakEven:
      unitsToBreakEven === null ? null : money(unitsToBreakEven * input.price),
    revenue: money(input.units * input.price),
    profit: money(input.units * contribution - input.fixed),
  };
}
export function compareCosts(
  a: { monthly: number; setup: number; exit: number },
  b: { monthly: number; setup: number; exit: number },
  months: number,
) {
  nonNegative(a.monthly, a.setup, a.exit, b.monthly, b.setup, b.exit, months);
  if (!Number.isInteger(months) || months < 1 || months > 120)
    throw new Error("Choose 1 to 120 whole months.");
  const costA = money(a.monthly * months + a.setup + a.exit);
  const costB = money(b.monthly * months + b.setup + b.exit);
  return { costA, costB, difference: money(costA - costB) };
}
export type QuoteLine = {
  description: string;
  quantity: number;
  rate: number;
  vat: number;
};
export function quoteTotals(lines: QuoteLine[], registered: boolean) {
  if (lines.length < 1 || lines.length > 50)
    throw new Error("Use 1 to 50 quote items.");
  let net = 0,
    tax = 0;
  const rows = lines.map((line) => {
    nonNegative(line.quantity, line.rate, line.vat);
    if (line.vat > 100) throw new Error("VAT must be at most 100%.");
    const amount = money(line.quantity * line.rate);
    const vatAmount = registered ? money((amount * line.vat) / 100) : 0;
    net += amount;
    tax += vatAmount;
    return { ...line, amount, vatAmount };
  });
  return { rows, net: money(net), tax: money(tax), total: money(net + tax) };
}
