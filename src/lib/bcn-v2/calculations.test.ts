import { describe, expect, it } from "vitest";
import { jobPrice, breakEven, compareCosts, quoteTotals } from "./calculations";
const job = {
  hours: 8,
  hourlyCost: 25,
  materials: 100,
  expenses: 50,
  overhead: 50,
  margin: 25,
  vat: 20,
};
describe("free business calculations", () => {
  it("prices £400 costs at a 25% margin rather than a markup", () =>
    expect(jobPrice(job)).toEqual({
      cost: 400,
      net: 533.33,
      profit: 133.33,
      tax: 106.67,
      total: 640,
    }));
  it("can calculate with no VAT and no profit", () =>
    expect(jobPrice({ ...job, margin: 0, vat: 0 }).total).toBe(400));
  it.each([100, 101, Infinity, NaN, -1])(
    "rejects invalid margin %s",
    (margin) => expect(() => jobPrice({ ...job, margin })).toThrow(),
  );
  it.each([-1, NaN, Infinity])("rejects invalid job costs %s", (materials) =>
    expect(() => jobPrice({ ...job, materials })).toThrow(),
  );
  it("finds break-even and operating profit in the same period", () =>
    expect(
      breakEven({ fixed: 1500, price: 150, variable: 50, units: 20 }),
    ).toEqual({
      contribution: 100,
      unitsToBreakEven: 15,
      revenueToBreakEven: 2250,
      revenue: 3000,
      profit: 500,
    }));
  it("rounds the required number of jobs up", () =>
    expect(
      breakEven({ fixed: 1501, price: 150, variable: 50, units: 20 })
        .unitsToBreakEven,
    ).toBe(16));
  it.each([50, 49])(
    "does not invent a break-even point with price %s and £50 variable cost",
    (price) =>
      expect(
        breakEven({ fixed: 1500, price, variable: 50, units: 20 })
          .unitsToBreakEven,
      ).toBeNull(),
  );
  it("handles zero fixed cost with positive contribution", () =>
    expect(
      breakEven({ fixed: 0, price: 50, variable: 10, units: 0 })
        .unitsToBreakEven,
    ).toBe(0));
  it("includes setup and exit costs over the same period", () =>
    expect(
      compareCosts(
        { monthly: 30, setup: 0, exit: 0 },
        { monthly: 25, setup: 100, exit: 0 },
        12,
      ),
    ).toEqual({ costA: 360, costB: 400, difference: -40 }));
  it.each([0, -1, 1.5, 121, NaN])(
    "rejects invalid comparison months %s",
    (months) =>
      expect(() =>
        compareCosts(
          { monthly: 1, setup: 0, exit: 0 },
          { monthly: 1, setup: 0, exit: 0 },
          months,
        ),
      ).toThrow(),
  );
  it("calculates mixed VAT per line and a total", () =>
    expect(
      quoteTotals(
        [
          { description: "Service", quantity: 2, rate: 100, vat: 20 },
          { description: "Reduced", quantity: 1, rate: 40, vat: 5 },
        ],
        true,
      ).total,
    ).toBe(282));
  it("never charges VAT for an unregistered supplier", () =>
    expect(
      quoteTotals(
        [{ description: "Service", quantity: 2, rate: 100, vat: 20 }],
        false,
      ).total,
    ).toBe(200));
  it("rounds fractional line amounts before summing", () =>
    expect(
      quoteTotals(
        [
          { description: "A", quantity: 3, rate: 0.335, vat: 20 },
          { description: "B", quantity: 1, rate: 0.01, vat: 0 },
        ],
        true,
      ),
    ).toMatchObject({ net: 1.02, tax: 0.2, total: 1.22 }));
  it("rejects an empty quote and negative quantities", () => {
    expect(() => quoteTotals([], false)).toThrow();
    expect(() =>
      quoteTotals(
        [{ description: "A", quantity: -1, rate: 10, vat: 20 }],
        true,
      ),
    ).toThrow();
  });
});
