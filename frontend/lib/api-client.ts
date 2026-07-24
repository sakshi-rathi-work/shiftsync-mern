// API client — thin fetch wrapper for calling the Express backend.
// Automatically attaches Bearer token, handles 401 → refresh → retry once.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// In-memory access token store (not localStorage — avoids XSS exposure for the token itself;
// the refresh token lives in an HttpOnly cookie managed by the browser).
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ─── Core fetch wrapper ────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends HttpOnly refresh cookie
  });

  // Handle 401 — try to refresh token once then retry
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, options, false); // retry once
    } else {
      // Refresh failed — clear token and redirect to login
      accessToken = null;
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    // Parse and throw structured error
    let body: { error?: { code: string; message: string; details?: unknown[] } };
    try {
      body = await res.json();
    } catch {
      body = { error: { code: 'UNKNOWN', message: `HTTP ${res.status}` } };
    }
    const err = new ApiError(
      res.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? 'An error occurred.',
      body.error?.details
    );
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Token refresh ─────────────────────────────────────────────────────────

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { data: { accessToken: string } };
    accessToken = data.data.accessToken;
    return true;
  } catch {
    return false;
  }
}

// ─── ApiError class ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGetText(path: string): Promise<string> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) {
    let msg = 'Failed to fetch content.';
    try {
      const body = await res.json();
      msg = body.error?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.text();
}

export const apiClient = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),

  getText: (path: string) => apiGetText(path),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export default apiClient;
