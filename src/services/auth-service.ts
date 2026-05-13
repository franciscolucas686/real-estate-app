import { apiFetch } from './api-client';
import type { LoginDto, RegisterDto, UserProfile } from '../types/api';

export async function login(payload: LoginDto) {
  return apiFetch<{ user: Pick<UserProfile, 'id' | 'email' | 'name'> }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function register(payload: RegisterDto) {
  return apiFetch<{ user: Pick<UserProfile, 'id' | 'email' | 'name'> }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return apiFetch<UserProfile>('/auth/me');
}

export async function logout() {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
  });
}
