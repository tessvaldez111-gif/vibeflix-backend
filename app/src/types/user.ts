// ===== User Types =====

export interface User {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  email: string | null;
  email_verified: number;
  role: string;
}

export interface AuthResponse extends User {
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  emailCode: string;
  nickname?: string;
}

export interface SendCodeRequest {
  email: string;
}

export interface SendCodeResponse {
  devCode?: string;
}
