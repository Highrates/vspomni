import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  signUpService,
  getToken,
  verifyToken,
  revokeSession,
} from '@/api/authApi'
import { setUnauthorizedHandler } from '@/api/authSession'
import { clearAuthStorage } from '@/api/apiClient'

interface AuthState {
  isAuthenticated: boolean
  email: string | null

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  signUp: (email: string, password: string, consentMarketing?: boolean) => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      email: null,
      
      checkAuth: async () => {
        // Миграция: старый localStorage.token → BFF выставит httpOnly cookie на /auth/me
        try {
          const legacy = localStorage.getItem('token')
          if (legacy && legacy !== 'null' && legacy !== 'undefined') {
            const ok = await verifyToken(legacy) // Bearer → BFF ставит cookie
            localStorage.removeItem('token')
            if (ok) {
              set({ isAuthenticated: true })
              return
            }
          }
        } catch {
          try {
            localStorage.removeItem('token')
          } catch {
            /* ignore */
          }
        }

        // Cookie-сессия: GET /auth/me через BFF (без Bearer в JS)
        const valid = await verifyToken()
        if (valid) {
          set({ isAuthenticated: true })
        } else {
          clearAuthStorage()
          set({ isAuthenticated: false, email: null })
        }
      },
      login: async (email, password) => {
        try {
          await getToken(email, password)
          // JWT в httpOnly cookie ставит BFF /api/v1/auth/login

          const prevEmail = get().email
          if (
            !prevEmail ||
            prevEmail.toLowerCase() !== email.trim().toLowerCase()
          ) {
            void import('@/stores/useUser').then(({ useUserStore }) => {
              useUserStore.getState().clearUser()
            })
          }

          set({
            isAuthenticated: true,
            email: email,
          })
        } catch (error) {
          console.error('Login failed:', error)
          throw error
        }
      },
      logout: () => {
        // Серверный revoke (tokenVersion++) — fire-and-forget; локальная сессия чистится сразу
        void revokeSession()
        clearAuthStorage()
        localStorage.removeItem('registration_phone')

        set({ isAuthenticated: false, email: null })

        // Сбрасываем persist профиля, иначе после новой регистрации
        // остаётся телефон/имя предыдущего пользователя
        void import('@/stores/useUser').then(({ useUserStore }) => {
          useUserStore.getState().clearUser()
        })
      },
      signUp: async (email, password, consentMarketing = false) => {
        // Регистрация Nest: register/start (OTP на email) → verify → complete.
        // Пользователя здесь не логиним.
        await signUpService(email, password, consentMarketing)
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
)

// Любой 401 от Nest (apiFetch) → сбрасываем стор (токен уже очищен в apiClient).
if (typeof window !== 'undefined') {
  setUnauthorizedHandler(() => {
    if (useAuthStore.getState().isAuthenticated) {
      useAuthStore.setState({ isAuthenticated: false, email: null })
    }
  })
}
