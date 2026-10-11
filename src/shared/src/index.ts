export interface HealthResponse {
  status: "ok" | "degraded";
  service: "family-tree-api";
  timestamp: string;
  authenticated: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  hasPassword: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface MeResponse extends AuthUser {
  memberships: unknown[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
