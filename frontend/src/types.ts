export type Role = 'ADMIN' | 'OPERATOR';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export interface DashboardResponse {
  operator: Record<string, unknown>;
  current_machine: Record<string, unknown>;
  current_task: Record<string, unknown>;
  safety_status: Record<string, unknown>;
  machine_health: Record<string, unknown>;
  task_prediction: Record<string, unknown>;
  current_telemetry: Record<string, unknown>;
  ai_insight: Record<string, unknown>;
  training_recommendation: Record<string, unknown>;
  what_if: Record<string, unknown>;
  weather: Record<string, unknown>;
}

export interface TokenPayload {
  accessToken: string;
  user: User;
}
