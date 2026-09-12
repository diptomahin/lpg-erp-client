import test from "node:test";
import assert from "node:assert/strict";
import { rowsOf } from "../src/utils/formatters.js";

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
