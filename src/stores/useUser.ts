import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMeInfo } from '@/graphql/queries/auth.service'
import { formatPhoneInputValue } from '@/lib/ruPhone'
import { User } from '@/types/user'
import { useAuthStore } from '@/stores/useAuth'

interface AuthState {
  user: User
  setUser: (user: User) => void
  fetchUser: () => void
}

export const useUserStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        userId: "0",
        name: '',
        familyName: '',
        email: '',
        phone: '',
      },
      setUser: (user: User) => {
        set({
          user: user,
        })
      },
      fetchUser: async () => {
        try {
          const meInfo = await getMeInfo()
          if (!meInfo) {
            // fallback: используем email из auth‑store, чтобы в ЛК хотя бы отображался email
            const authEmail = useAuthStore.getState().email || ''
            set((state) => ({
              user: {
                // сохраняем уже введённый пользователем телефон, если он есть
                userId: '0',
                name: state.user.name || '',
                familyName: state.user.familyName || '',
                email: authEmail || state.user.email || '',
                phone: state.user.phone || '',
              },
            }))
            return
          }

          const defaultAddress = meInfo.addresses?.find(
            addr => addr.isDefaultShippingAddress || addr.isDefaultBillingAddress,
          ) || meInfo.addresses?.[0]

          const phoneFromAddress = defaultAddress?.phone || ''

          set(state => {
            // локально сохранённый телефон (то, что ввёл пользователь и мы уже положили в store)
            const localPhone = state.user.phone || ''
            // если бэкенд вернул телефон и локально он ещё пустой → берём бэкенд
            // если локально уже что‑то есть → НЕ затираем его старым значением с бэка
            const rawPhone = localPhone || phoneFromAddress || ''
            const finalPhone = rawPhone ? formatPhoneInputValue(rawPhone) : ''

            const nameFromAddr = defaultAddress?.firstName?.trim() || ''
            const familyFromAddr = defaultAddress?.lastName?.trim() || ''

            return {
              user: {
                userId: meInfo.id || '0',
                // Профиль → адрес доставки → уже введённое локально
                name:
                  meInfo.firstName?.trim() ||
                  nameFromAddr ||
                  state.user.name ||
                  '',
                familyName:
                  meInfo.lastName?.trim() ||
                  familyFromAddr ||
                  state.user.familyName ||
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
