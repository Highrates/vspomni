import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMeInfo } from '@/graphql/queries/auth.service'
import { formatPhoneInputValue } from '@/lib/ruPhone'
import { User } from '@/types/user'
import { useAuthStore } from '@/stores/useAuth'

interface AuthState {
  user: User
  setUser: (user: User) => void
  clearUser: () => void
  fetchUser: () => void
}

const emptyUser = (): User => ({
  userId: '0',
  name: '',
  familyName: '',
  email: '',
  phone: '',
})

function phoneFromMetadata(
  metadata?: Array<{ key: string; value: string }> | null,
): string {
  if (!metadata?.length) return ''
  return metadata.find((m) => m.key === 'phone')?.value?.trim() || ''
}

export const useUserStore = create<AuthState>()(
  persist(
    (set) => ({
      user: emptyUser(),
      setUser: (user: User) => {
        set({ user })
      },
      clearUser: () => {
        set({ user: emptyUser() })
      },
      fetchUser: async () => {
        try {
          const meInfo = await getMeInfo()
          if (!meInfo) {
            const authEmail = useAuthStore.getState().email || ''
            set((state) => ({
              user: {
                userId: '0',
                name: state.user.name || '',
                familyName: state.user.familyName || '',
                email: authEmail || state.user.email || '',
                phone: state.user.phone || '',
              },
            }))
            return
          }

          const defaultAddress =
            meInfo.addresses?.find(
              (addr) =>
                addr.isDefaultShippingAddress || addr.isDefaultBillingAddress,
            ) || meInfo.addresses?.[0]

          const phoneFromAddress = defaultAddress?.phone?.trim() || ''
          const phoneFromMeta = phoneFromMetadata(meInfo.metadata)

          set((state) => {
            const sameIdentity =
              Boolean(state.user.userId) &&
              state.user.userId !== '0' &&
              state.user.userId === meInfo.id &&
              (!state.user.email ||
                state.user.email.toLowerCase() ===
                  (meInfo.email || '').toLowerCase())

            // Бэкенд (metadata / адрес) важнее persist — иначе после
            // перерегистрации остаётся телефон прошлого пользователя.
            const backendPhone = phoneFromMeta || phoneFromAddress || ''
            const rawPhone = backendPhone || (sameIdentity ? state.user.phone : '') || ''
            const finalPhone = rawPhone ? formatPhoneInputValue(rawPhone) : ''

            const nameFromAddr = defaultAddress?.firstName?.trim() || ''
            const familyFromAddr = defaultAddress?.lastName?.trim() || ''

            return {
              user: {
                userId: meInfo.id || '0',
                name:
                  meInfo.firstName?.trim() ||
                  nameFromAddr ||
                  (sameIdentity ? state.user.name : '') ||
                  '',
                familyName:
                  meInfo.lastName?.trim() ||
                  familyFromAddr ||
                  (sameIdentity ? state.user.familyName : '') ||
                  '',
                email: meInfo.email || '',
                phone: finalPhone,
              },
            }
          })
        } catch (error) {
          console.error('Failed to fetch user:', error)
        }
      },
    }),
    {
      name: 'user-storage',
    },
  ),
)
