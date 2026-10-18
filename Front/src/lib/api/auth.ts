import api from "../axios";
import { User } from '@/types/user'

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

export interface LoginResponse {
    token: string;
    refreshToken: string;
    csrfToken: string;
    user: User;
}

export interface SignupResponse {
    success: boolean;
    requiresConfirmation: boolean;
    message: string;
}

export const authApi = {
    login: (data: LoginRequest) => api.post<LoginResponse>("/auth/login", data),
    signup: (data: SignupRequest) => api.post<SignupResponse>("/auth/signup", data),
    me: () => api.get<User>("/auth/me"),
}