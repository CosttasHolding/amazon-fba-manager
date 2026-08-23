export type ScheduleTiming = {
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  day_of_week?: number | null;
  day_of_month?: number | null;
};

export function calculateNextRunAt(schedule: ScheduleTiming, now = new Date()): string {
  const [hours, minutes] = schedule.time.split(":").map(Number);
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);

  if (schedule.frequency === "daily") {
    if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
    return candidate.toISOString();
  }

  if (schedule.frequency === "weekly") {
    const targetDay = schedule.day_of_week ?? now.getDay();
    const daysUntilTarget = (targetDay - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + daysUntilTarget);
    if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
    return candidate.toISOString();
  }

  const targetDay = schedule.day_of_month ?? now.getDate();
  let year = now.getFullYear();
  let month = now.getMonth();
  while (true) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(targetDay, lastDay);
    const monthlyCandidate = new Date(year, month, day, hours, minutes, 0, 0);
    if (monthlyCandidate > now) return monthlyCandidate.toISOString();
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
}
