export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: 'Admin' | 'Staff';
  isActive: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: AuthUser;
}

export interface UserAdminDto {
  id: number;
  username: string;
  displayName: string;
  role: 'Admin' | 'Staff';
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  displayName: string;
  password: string;
  role: 'Admin' | 'Staff';
  isActive: boolean;
}

export interface UpdateUserRequest {
  username: string;
  displayName: string;
  role: 'Admin' | 'Staff';
  isActive: boolean;
}
