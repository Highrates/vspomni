import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { signUpService, getToken, verifyToken } from '@/graphql/queries/auth.service'

interface AuthState {
  isAuthenticated: boolean
  email: string | null

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  signUp: (email: string, password: string) => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      email: null,
      
      checkAuth: async () => {
        const token = localStorage.getItem('token')
        if (!token || token === 'null' || token === 'undefined') {
          set({ isAuthenticated: false, email: null })
          return
        }

        try {
          await verifyToken(token)
          // Token is valid, keep authenticated state
          // Email will be fetched from user store
          set({ isAuthenticated: true })
        } catch (error) {
          // Token invalid or expired
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          set({ isAuthenticated: false, email: null })
        }
      },
      login: async (email, password) => {
        try {
          const result = await getToken(email, password)

          localStorage.setItem('token', result.token)
          localStorage.setItem('refreshToken', result.refreshToken || '')

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
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')

        set({ isAuthenticated: false, email: null })
      },
      signUp: async (email, password) => {
        // В текущей схеме регистрация всегда через подтверждение email,
        // поэтому просто дергаем signUpService и НЕ логиним пользователя сразу.
        await signUpService(email, password)
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
)
