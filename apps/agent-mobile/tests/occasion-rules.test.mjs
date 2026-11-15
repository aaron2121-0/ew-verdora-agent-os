import test from "node:test";
import assert from "node:assert/strict";
import {
  addDaysIso, diffDaysIso, getKuchingTodayIso, getDisplayDate,
  getPromotionWindow, canLockStockOrPurchase, getPendingConfirmationOccasions,
  getUrgentOccasions, isDateInPromotionWindow, isOccasionOnDay,
  getUpcoming30DaysRecommendations, getMonthGridDays, getCountdownUrgency,
  getUpcoming30DayAlerts, getDailyAlertStorageKey, filterUnnotifiedToday, splitAlertBatch,
} from "../public/occasion-rules.js";

// Test-only records: production occasions always come from the authenticated API.
const occasion = (overrides = {}) => ({
  id: "fixture-occasion", name_en: "School graduation", name_zh: "学校毕业典礼",
  category: "graduation", date_start: "2026-12-06", estimated_date: null,
  date_end: null, date_status: "confirmed", flower_demand: "high",
  order_lead_days: 30, ...overrides,
});

test("Kuching calendar date crosses UTC midnight at 16:00Z", () => {
  assert.equal(getKuchingTodayIso(new Date("2026-12-05T15:59:59Z")), "2026-12-05");
  assert.equal(getKuchingTodayIso(new Date("2026-12-05T16:00:00Z")), "2026-12-06");
  assert.equal(addDaysIso("2026-12-06", -30), "2026-11-06");
  assert.equal(addDaysIso("2028-02-28", 1), "2028-02-29");
  assert.equal(diffDaysIso("2026-12-31", "2027-01-01"), 1);
  assert.throws(() => addDaysIso("12/31/2026", 1), /Invalid ISO date/);
});

test("display dates use start then estimate; not_found stays pending even with stale dates", () => {
  const confirmed = occasion();
  const pattern = occasion({ id: "estimate", date_start: null, estimated_date: "2026-12-12", date_status: "pattern" });
  const unknown = occasion({ id: "unknown", date_status: "not_found" });
  const empty = occasion({ id: "empty", date_start: null });
  assert.equal(getDisplayDate(confirmed), "2026-12-06");
  assert.equal(getDisplayDate(pattern), "2026-12-12");
  assert.equal(getDisplayDate(unknown), null);
  assert.deepEqual(getPendingConfirmationOccasions([confirmed, pattern, unknown, empty]).map(item => item.id), ["unknown", "empty"]);
});

test("promotion includes both boundaries and extends through a multi-day event", () => {
  const item = occasion({ date_start: "2027-02-06", date_end: "2027-02-07" });
  assert.deepEqual(getPromotionWindow(item), { promoStart: "2027-01-07", promoEnd: "2027-02-07", displayDate: "2027-02-06" });
  assert.equal(isDateInPromotionWindow(item, "2027-01-07"), true);
  assert.equal(isDateInPromotionWindow(item, "2027-01-06"), false);
  assert.equal(isDateInPromotionWindow(item, "2027-02-07"), true);
  assert.equal(isDateInPromotionWindow(item, "2027-02-08"), false);
  assert.equal(isOccasionOnDay(item, "2027-02-06"), true);
  assert.equal(isOccasionOnDay(item, "2027-02-07"), true);
  assert.equal(isOccasionOnDay(item, "2027-02-05"), false);
  assert.equal(getPromotionWindow(occasion({ date_status: "not_found" })), null);
});

test("only confirmed dates allow stock lock or formal purchasing", () => {
  assert.deepEqual(canLockStockOrPurchase(occasion()), { allowed: true, reasonKey: "lockAllowed" });
  assert.deepEqual(canLockStockOrPurchase(occasion({ date_status: "pattern" })), { allowed: false, reasonKey: "lockBlockedPattern" });
  assert.deepEqual(canLockStockOrPurchase(occasion({ date_status: "not_found" })), { allowed: false, reasonKey: "lockBlockedNotFound" });
});

test("urgent rows require high demand, active promo; nearest then confirmed date wins", () => {
  const items = [
    occasion({ id: "late", date_start: "2026-12-25" }),
    occasion({ id: "pattern", date_status: "pattern" }),
    occasion({ id: "confirmed" }),
    occasion({ id: "low", flower_demand: "low" }),
    occasion({ id: "unknown", date_status: "not_found" }),
    occasion({ id: "outside", date_start: "2027-02-01" }),
  ];
  const rows = getUrgentOccasions(items, "2026-12-05");
  assert.deepEqual(rows.map(row => row.occasion.id), ["confirmed", "pattern", "late"]);
  assert.deepEqual(rows.map(row => row.daysUntil), [1, 1, 20]);
  assert.equal(getUrgentOccasions(items, "2026-12-05", 1).length, 1);
});

test("30-day recommendations include long-lead promotions, ranked by demand then date", () => {
  const items = [
    occasion({ id: "medium", flower_demand: "medium" }),
    occasion({ id: "later", date_start: "2027-01-20", order_lead_days: 30 }),
    occasion({ id: "nearest" }),
    occasion({ id: "past", date_start: "2026-11-01" }),
    occasion({ id: "far", date_start: "2027-02-20", order_lead_days: 14 }),
  ];
  assert.deepEqual(getUpcoming30DaysRecommendations(items, "2026-12-01").map(item => item.id), ["nearest", "later", "medium"]);
});

test("month grid supplies 42 Sunday-first cells across year boundaries", () => {
  const grid = getMonthGridDays(2027, 0);
  assert.equal(grid.length, 42);
  assert.equal(grid[0].iso, "2026-12-27");
  assert.equal(grid[0].inMonth, false);
  assert.equal(grid.filter(cell => cell.inMonth).length, 31);
  assert.equal(grid[41].iso, "2027-02-06");
});

test("countdown milestones match same-day, 3, 7, 14, 30-day boundaries", () => {
  for (const [days, milestone, intensity] of [[-2, "same_day", 5], [0, "same_day", 5], [3, "d3", 4], [4, "d7", 3], [7, "d7", 3], [14, "d14", 2], [30, "d30", 1], [31, null, 1]]) {
    assert.deepEqual(getCountdownUrgency(days), { milestone, intensity });
  }
});

test("alerts include active multi-day occasions and future promo starts, excluding expired/unknown dates", () => {
  const items = [
    occasion({ id: "future", date_start: "2027-01-20", order_lead_days: 30 }),
    occasion({ id: "active", date_start: "2026-11-30", date_end: "2026-12-02" }),
    occasion({ id: "expired", date_start: "2026-11-30" }),
    occasion({ id: "unknown", date_status: "not_found" }),
    occasion({ id: "outside", date_start: "2027-03-01" }),
  ];
  const rows = getUpcoming30DayAlerts(items, "2026-12-01");
  assert.deepEqual(rows.map(row => row.occasion.id), ["active", "future"]);
  assert.equal(rows[0].daysUntil, -1);
  assert.equal(rows[0].inPromoToday, true);
  assert.equal(rows[0].milestone, "same_day");
  assert.equal(rows[1].inPromoToday, false);
});

test("daily dedupe and batches preserve overflow without mutating input", () => {
  const rows = getUpcoming30DayAlerts(Array.from({ length: 5 }, (_, id) => occasion({ id: String(id) })), "2026-12-01");
  assert.equal(getDailyAlertStorageKey("2026-12-01"), "verdora_occasion_alerts_2026-12-01");
  const unnotified = filterUnnotifiedToday(rows, new Set(["0"]));
  assert.equal(unnotified.length, 4);
  assert.deepEqual(splitAlertBatch(unnotified), { activeBatch: unnotified.slice(0, 3), overflowCount: 1 });
  assert.deepEqual(splitAlertBatch(unnotified, -2), { activeBatch: [], overflowCount: 4 });
  assert.equal(rows.length, 5);
});
