// Shared TypeScript types and interfaces used across the backend

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

/**
 * Shape attached to req.user by the authenticate middleware after JWT verification.
 */
export interface AuthUser {
  userId: string;
  organizationId: string;
  role: UserRole;
}

/**
 * Conflict detection result item — returned on roster save/publish and swap approval.
 */
export interface ConflictResult {
  shiftId?: string;
  employeeId?: string;
  reason: string;
  severity: 'BLOCKING' | 'WARNING';
}

/**
 * Standard API success envelope shape.
 */
export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Standard API error envelope shape.
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

/**
 * Pagination query parameters (after parsing).
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// Augment Express Request to include typed req.user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
