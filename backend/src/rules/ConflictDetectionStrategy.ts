// Conflict Detection Strategy interface + context types
export interface ConflictResult {
  shiftId?: string;
  employeeId?: string;
  reason: string;
  severity: 'BLOCKING' | 'WARNING';
}

export interface RosterShift {
  id: string;
  employeeId: string;
  startTime: Date;
  endTime: Date;
  positionLabel: string;
}

export interface RosterCheckContext {
  organizationId: string;
  teamId: string;
  weekStart: Date;
  shifts: RosterShift[];
  maxWeeklyHours: number;
  minStaffPerShift: number;
}

export interface ConflictDetectionStrategy {
  check(context: RosterCheckContext): ConflictResult[];
}
