// Rule Engine Service — runs all conflict detection strategies against a roster
import { ConflictDetectionStrategy, ConflictResult, RosterCheckContext } from '../rules/ConflictDetectionStrategy';
import { DoubleBookingStrategy } from '../rules/DoubleBookingStrategy';
import { MaxWeeklyHoursStrategy } from '../rules/MaxWeeklyHoursStrategy';
import { UnderstaffingStrategy } from '../rules/UnderstaffingStrategy';

class RuleEngineService {
  private strategies: ConflictDetectionStrategy[];

  constructor() {
    // Register all strategies here — add new rules by adding to this list
    this.strategies = [
      new DoubleBookingStrategy(),
      new MaxWeeklyHoursStrategy(),
      new UnderstaffingStrategy(),
    ];
  }

  runAll(context: RosterCheckContext): ConflictResult[] {
    return this.strategies.flatMap((strategy) => strategy.check(context));
  }

  hasBlockingConflicts(conflicts: ConflictResult[]): boolean {
    return conflicts.some((c) => c.severity === 'BLOCKING');
  }
}

// Singleton — services import this instance
export const ruleEngine = new RuleEngineService();
