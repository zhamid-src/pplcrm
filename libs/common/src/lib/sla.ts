export function calculateWorkingTimeMs(
  startDate: Date,
  endDate: Date,
  workingDays: number[],
  workingHoursStart: string,
  workingHoursEnd: string,
): number {
  if (startDate.getTime() >= endDate.getTime()) {
    return 0;
  }

  // Parse start hour/minute
  const [startHour, startMin] = workingHoursStart.split(':').map(Number);
  // Parse end hour/minute
  const [endHour, endMin] = workingHoursEnd.split(':').map(Number);

  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin) || workingDays.length === 0) {
    // Return standard elapsed time as fallback if settings are malformed
    return endDate.getTime() - startDate.getTime();
  }

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const endLimit = new Date(endDate);
  endLimit.setHours(23, 59, 59, 999);

  let totalMs = 0;

  while (current.getTime() <= endLimit.getTime()) {
    const dayOfWeek = current.getDay();

    if (workingDays.includes(dayOfWeek)) {
      const workStart = new Date(current);
      workStart.setHours(startHour, startMin, 0, 0);

      const workEnd = new Date(current);
      workEnd.setHours(endHour, endMin, 0, 0);

      const actualStart = Math.max(startDate.getTime(), workStart.getTime());
      const actualEnd = Math.min(endDate.getTime(), workEnd.getTime());

      const overlap = actualEnd - actualStart;
      if (overlap > 0) {
        totalMs += overlap;
      }
    }

    // Step to the next day
    current.setDate(current.getDate() + 1);
  }

  return totalMs;
}
