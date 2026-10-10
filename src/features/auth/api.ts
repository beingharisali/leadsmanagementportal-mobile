import { apiClient } from "@/lib/api-client";
import type { User } from "@/features/users/types";

export interface SignInResult {
  user: User;
  token: string;
}

export interface SignUpPayload {
  companyName: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export const authApi = {
  me: () => apiClient.get<User>("/auth/me"),
  login: (payload: { email: string; password: string }) => apiClient.post<SignInResult>("/auth/login", payload),
  signup: (payload: SignUpPayload) => apiClient.post<SignInResult>("/auth/signup", payload),
  /** Whether the public demo is on (shows the Try as Admin / Agent buttons). */
  demoStatus: () => apiClient.get<{ enabled: boolean }>("/demo"),
  demoSignIn: (role: "admin" | "agent") => apiClient.post<SignInResult>("/demo/sign-in", { role }),
  /** `idle_timeout`: the app signed out on its own after the company's inactivity limit */
  logout: (reason: "logout" | "idle_timeout" = "logout") =>
    apiClient.post<null>("/auth/logout", { reason }, { timeoutMs: 10_000, asSelf: true }),
  forgotPassword: (payload: { email: string }) => apiClient.post<null>("/auth/forgot-password", payload),
};
