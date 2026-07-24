// Understaffing detection: time slots with fewer employees than minStaffPerShift
import { ConflictDetectionStrategy, ConflictResult, RosterCheckContext } from './ConflictDetectionStrategy';

export class UnderstaffingStrategy implements ConflictDetectionStrategy {
  check(context: RosterCheckContext): ConflictResult[] {
    if (context.minStaffPerShift <= 1) return []; // 1 is fine — every shift has at least 1 person

    const conflicts: ConflictResult[] = [];

    // Group shifts by date (day)
    const byDay = new Map<string, typeof context.shifts>();
    for (const shift of context.shifts) {
      const dayKey = shift.startTime.toISOString().slice(0, 10);
      const list = byDay.get(dayKey) ?? [];
      list.push(shift);
      byDay.set(dayKey, list);
    }

    for (const [day, shifts] of byDay) {
      if (shifts.length < context.minStaffPerShift) {
        conflicts.push({
          reason: `Understaffing on ${day}: ${shifts.length} employee(s) assigned, minimum ${context.minStaffPerShift} required.`,
          severity: 'WARNING',
        });
      }
    }
    return conflicts;
  }
}
