import test from "node:test";
import assert from "node:assert/strict";
import { rowsOf, findMetricValue } from "../src/utils/formatters.js";

test("returns array rows from paginated list responses", () => {
  assert.deepEqual(rowsOf({ rows: [{ id: 1 }, { id: 2 }] }), [
    { id: 1 },
    { id: 2 },
  ]);
});

test("returns a batches array from inventory responses", () => {
  assert.deepEqual(rowsOf({ batches: [{ id: 1 }, { id: 2 }] }), [
    { id: 1 },
    { id: 2 },
  ]);
});

test("returns direct arrays unchanged", () => {
  assert.deepEqual(rowsOf([{ id: 1 }, { id: 2 }]), [{ id: 1 }, { id: 2 }]);
});

test("finds metric values using monthly backend field names", () => {
  const summary = {
    customerPayments: 125000,
    supplierPayments: 35000,
    customerOutstanding: 440000,
    supplierOutstanding: 54000,
    closingLpgStock: 1240,
    totalSalesRevenue: 820000,
  };

  assert.equal(
    findMetricValue(summary, ["customerPayments", "totalCustomerPayments"]),
    125000,
  );
  assert.equal(
    findMetricValue(summary, ["supplierPayments", "totalSupplierPayments"]),
    35000,
  );
  assert.equal(
    findMetricValue(summary, ["customerOutstanding", "customerDue"]),
    440000,
  );
  assert.equal(
    findMetricValue(summary, ["supplierOutstanding", "supplierPayable"]),
    54000,
  );
  assert.equal(
    findMetricValue(summary, ["closingLpgStock", "currentLpgStock"]),
    1240,
  );
  assert.equal(
    findMetricValue(summary, ["totalSalesRevenue", "totalSales"]),
    820000,
  );
});
