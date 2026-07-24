// Max weekly hours detection: employee total shift hours exceeds labor rule maximum
import { ConflictDetectionStrategy, ConflictResult, RosterCheckContext } from './ConflictDetectionStrategy';

export class MaxWeeklyHoursStrategy implements ConflictDetectionStrategy {
  check(context: RosterCheckContext): ConflictResult[] {
    const conflicts: ConflictResult[] = [];
    const hoursByEmployee = new Map<string, number>();

    for (const shift of context.shifts) {
      const hrs = (shift.endTime.getTime() - shift.startTime.getTime()) / 3_600_000;
      hoursByEmployee.set(shift.employeeId, (hoursByEmployee.get(shift.employeeId) ?? 0) + hrs);
    }

    for (const [employeeId, totalHours] of hoursByEmployee) {
      if (totalHours > context.maxWeeklyHours) {
        conflicts.push({
          employeeId,
          reason: `Employee exceeds max weekly hours: ${totalHours.toFixed(1)}h assigned vs. ${context.maxWeeklyHours}h allowed.`,
          severity: 'BLOCKING',
        });
      }
    }
    return conflicts;
  }
}
