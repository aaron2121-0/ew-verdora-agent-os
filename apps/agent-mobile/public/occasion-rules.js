// Native port of verdora-content d33f8b6; scene geometry and choreography preserved.
const KUCHING_TIMEZONE = "Asia/Kuching";
const ISO_DATE_RX = /^(\d{4})-(\d{2})-(\d{2})$/;
function getKuchingTodayIso(now = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KUCHING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
function parseIsoDayNumber(iso) {
  const match = ISO_DATE_RX.exec(iso.trim());
  if (!match) {
    throw new Error(`Invalid ISO date string: ${iso}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return Math.floor(Date.UTC(year, month - 1, day) / 864e5);
}
function dayNumberToIso(dayNum) {
  const d = new Date(dayNum * 864e5);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysIso(iso, deltaDays) {
  return dayNumberToIso(parseIsoDayNumber(iso) + deltaDays);
}
function diffDaysIso(fromIso, toIso) {
  return parseIsoDayNumber(toIso) - parseIsoDayNumber(fromIso);
}
function getDisplayDate(occasion) {
  if (occasion.date_status === "not_found") {
    return null;
  }
  return occasion.date_start ?? occasion.estimated_date ?? null;
}
function getPromotionWindow(occasion) {
  const displayDate = getDisplayDate(occasion);
  if (!displayDate) {
    return null;
  }
  const promoStart = addDaysIso(displayDate, -occasion.order_lead_days);
  const promoEnd = occasion.date_end && occasion.date_end >= displayDate ? occasion.date_end : displayDate;
  return {
    promoStart,
    promoEnd,
    displayDate
  };
}
function canLockStockOrPurchase(occasion) {
  if (occasion.date_status === "confirmed") {
    return { allowed: true, reasonKey: "lockAllowed" };
  }
  if (occasion.date_status === "pattern") {
    return { allowed: false, reasonKey: "lockBlockedPattern" };
  }
  return { allowed: false, reasonKey: "lockBlockedNotFound" };
}
function getUrgentOccasions(occasions, todayKuchingIso, limit = 3) {
  const todayNum = parseIsoDayNumber(todayKuchingIso);
  const matches = [];
  for (const occasion of occasions) {
    if (occasion.flower_demand !== "high") continue;
    const win = getPromotionWindow(occasion);
    if (!win) continue;
    const startNum = parseIsoDayNumber(win.promoStart);
    const endNum = parseIsoDayNumber(win.promoEnd);
    if (todayNum >= startNum && todayNum <= endNum) {
      const daysUntil = parseIsoDayNumber(win.displayDate) - todayNum;
      matches.push({
        occasion,
        displayDate: win.displayDate,
        promoStart: win.promoStart,
        daysUntil
      });
    }
  }
  matches.sort((a, b) => {
    const dayCmp = a.daysUntil - b.daysUntil;
    if (dayCmp !== 0) return dayCmp;
    if (a.occasion.date_status !== b.occasion.date_status) {
      return a.occasion.date_status === "confirmed" ? -1 : 1;
    }
    return a.occasion.name_en.localeCompare(b.occasion.name_en);
  });
  return matches.slice(0, limit);
}
function getPendingConfirmationOccasions(occasions) {
  return occasions.filter((o) => o.date_status === "not_found" || getDisplayDate(o) === null);
}
function isDateInPromotionWindow(occasion, dayIso) {
  const win = getPromotionWindow(occasion);
  if (!win) return false;
  return dayIso >= win.promoStart && dayIso <= win.promoEnd;
}
function isOccasionOnDay(occasion, dayIso) {
  const display = getDisplayDate(occasion);
  if (!display) return false;
  const end = occasion.date_end && occasion.date_end >= display ? occasion.date_end : display;
  return dayIso >= display && dayIso <= end;
}
function getUpcoming30DaysRecommendations(occasions, todayKuchingIso, limit = 3) {
  const horizonEnd = addDaysIso(todayKuchingIso, 30);
  const demandRank = { high: 3, medium: 2, low: 1 };
  return occasions.filter((o) => {
    const win = getPromotionWindow(o);
    if (!win) return false;
    return win.displayDate >= todayKuchingIso && win.promoStart <= horizonEnd;
  }).sort((a, b) => {
    const dDiff = demandRank[b.flower_demand] - demandRank[a.flower_demand];
    if (dDiff !== 0) return dDiff;
    const da = getDisplayDate(a) ?? "9999-12-31";
    const db = getDisplayDate(b) ?? "9999-12-31";
    return da.localeCompare(db);
  }).slice(0, limit);
}
function getMonthGridDays(year, monthIndexZeroBased) {
  const firstDay = new Date(Date.UTC(year, monthIndexZeroBased, 1));
  const startWeekday = firstDay.getUTCDay();
  const startNum = Math.floor(firstDay.getTime() / 864e5) - startWeekday;
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const iso = dayNumberToIso(startNum + i);
    const cellMonth = Number(iso.slice(5, 7)) - 1;
    cells.push({ iso, inMonth: cellMonth === monthIndexZeroBased });
  }
  return cells;
}
function getCountdownUrgency(daysUntil) {
  if (daysUntil <= 0) return { milestone: "same_day", intensity: 5 };
  if (daysUntil <= 3) return { milestone: "d3", intensity: 4 };
  if (daysUntil <= 7) return { milestone: "d7", intensity: 3 };
  if (daysUntil <= 14) return { milestone: "d14", intensity: 2 };
  if (daysUntil <= 30) return { milestone: "d30", intensity: 1 };
  return { milestone: null, intensity: 1 };
}
function getUpcoming30DayAlerts(occasions, todayKuchingIso) {
  const horizonEnd = addDaysIso(todayKuchingIso, 30);
  const todayNum = parseIsoDayNumber(todayKuchingIso);
  const items = [];
  for (const occasion of occasions) {
    const win = getPromotionWindow(occasion);
    if (!win) continue;
    if (win.promoStart <= horizonEnd && win.promoEnd >= todayKuchingIso) {
      const daysUntil = parseIsoDayNumber(win.displayDate) - todayNum;
      const inPromoToday = todayKuchingIso >= win.promoStart && todayKuchingIso <= win.promoEnd;
      const urgency = getCountdownUrgency(daysUntil);
      items.push({
        occasion,
        displayDate: win.displayDate,
        promoStart: win.promoStart,
        promoEnd: win.promoEnd,
        daysUntil,
        inPromoToday,
        milestone: urgency.milestone,
        intensity: urgency.intensity
      });
    }
  }
  const demandWeight = { high: 3, medium: 2, low: 1 };
  items.sort((a, b) => {
    if (a.inPromoToday !== b.inPromoToday) return a.inPromoToday ? -1 : 1;
    const dayCmp = a.daysUntil - b.daysUntil;
    if (dayCmp !== 0) return dayCmp;
    const demCmp = demandWeight[b.occasion.flower_demand] - demandWeight[a.occasion.flower_demand];
    if (demCmp !== 0) return demCmp;
    return a.occasion.name_en.localeCompare(b.occasion.name_en);
  });
  return items;
}
function getDailyAlertStorageKey(todayKuchingIso) {
  return `verdora_occasion_alerts_${todayKuchingIso}`;
}
function filterUnnotifiedToday(alerts, notifiedIds) {
  return alerts.filter((a) => !notifiedIds.has(a.occasion.id));
}
function splitAlertBatch(alerts, maxPlay = 3) {
  const safeMax = Math.max(0, maxPlay);
  return {
    activeBatch: alerts.slice(0, safeMax),
    overflowCount: Math.max(0, alerts.length - safeMax)
  };
}
export {
  KUCHING_TIMEZONE,
  addDaysIso,
  canLockStockOrPurchase,
  diffDaysIso,
  filterUnnotifiedToday,
  getCountdownUrgency,
  getDailyAlertStorageKey,
  getDisplayDate,
  getKuchingTodayIso,
  getMonthGridDays,
  getPendingConfirmationOccasions,
  getPromotionWindow,
  getUpcoming30DayAlerts,
  getUpcoming30DaysRecommendations,
  getUrgentOccasions,
  isDateInPromotionWindow,
  isOccasionOnDay,
  splitAlertBatch
};
