import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, setToken, getToken } from '../api/client';
import type { User } from '../api/types';

interface AuthResult {
  token: string;
  user: User;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const ready = ref(false);

  async function loadMe() {
    if (!getToken()) {
      ready.value = true;
      return;
    }
    try {
      user.value = await api.get<User>('/auth/me');
    } catch {
      setToken(null);
      user.value = null;
    } finally {
      ready.value = true;
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post<AuthResult>('/auth/login', { email, password });
    setToken(res.token);
    user.value = res.user;
  }

  async function register(email: string, name: string, password: string) {
    const res = await api.post<AuthResult>('/auth/register', {
      email,
      name,
      password,
    });
    setToken(res.token);
    user.value = res.user;
  }

  function logout() {
    setToken(null);
    user.value = null;
  }

  return { user, ready, loadMe, login, register, logout };
});
