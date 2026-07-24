// Double-booking detection: employee assigned two overlapping shifts in the same roster
import { ConflictDetectionStrategy, ConflictResult, RosterCheckContext } from './ConflictDetectionStrategy';

export class DoubleBookingStrategy implements ConflictDetectionStrategy {
  check(context: RosterCheckContext): ConflictResult[] {
    const conflicts: ConflictResult[] = [];
    const byEmployee = new Map<string, typeof context.shifts>();

    for (const shift of context.shifts) {
      const list = byEmployee.get(shift.employeeId) ?? [];
      list.push(shift);
      byEmployee.set(shift.employeeId, list);
    }

    for (const [employeeId, shifts] of byEmployee) {
      for (let i = 0; i < shifts.length; i++) {
        for (let j = i + 1; j < shifts.length; j++) {
          const a = shifts[i];
          const b = shifts[j];
          // Overlap: a starts before b ends AND a ends after b starts
          if (a.startTime < b.endTime && a.endTime > b.startTime) {
            conflicts.push({
              shiftId: a.id,
              employeeId,
              reason: `Double-booking: employee has overlapping shifts on ${a.startTime.toDateString()}.`,
              severity: 'BLOCKING',
            });
          }
        }
      }
    }
    return conflicts;
  }
}
