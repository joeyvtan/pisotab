/**
 * Peak pricing service.
 * Checks active peak_rules against the current local day/hour
 * and returns the highest applicable multiplier (1.0 = no surcharge).
 */
const { getDb } = require('../db');

/**
 * Returns the highest multiplier from active rules that match
 * the current local day-of-week and hour.
 * If no rule matches, returns 1.0 (no change to duration).
 */
async function getCurrentMultiplier() {
  try {
    const db = getDb();
    const now = new Date();
    const dayOfWeek = now.getDay();   // 0 = Sunday … 6 = Saturday
    const hour = now.getHours();      // 0–23 local time

    const rules = await db.all(
      "SELECT multiplier, days_of_week, start_hour, end_hour FROM peak_rules WHERE is_active = 1",
      []
    );

    let max = 1.0;
    for (const rule of rules) {
      const days = rule.days_of_week.split(',').map(Number);
      if (!days.includes(dayOfWeek)) continue;
      // Support overnight spans like 22–6 (end_hour < start_hour)
      const inRange = rule.start_hour <= rule.end_hour
        ? hour >= rule.start_hour && hour < rule.end_hour
        : hour >= rule.start_hour || hour < rule.end_hour;
      if (inRange && rule.multiplier > max) max = rule.multiplier;
    }
    return max;
  } catch {
    return 1.0;
  }
}

module.exports = { getCurrentMultiplier };
