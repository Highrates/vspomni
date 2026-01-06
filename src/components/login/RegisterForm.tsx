'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import PhoneInput from '@/components/ui/PhoneInput'

type TPropss = {
  onVerify: (email: string) => void
  onLogin: () => void
}

const RegisterForm = ({ onVerify, onLogin }: TPropss) => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [checked, setChecked] = useState<boolean>(false)

  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (checked && email.length > 5 && password.length > 3) {
      try {
        const { signUpService } = await import('@/graphql/queries/auth.service')
        const result = await signUpService(
          email,
          password,
          firstName,
          lastName,
          phone,
        )

        // Параллельно дергаем кастомный REST-эндпоинт Saleor для отправки кода подтверждения
        if (result?.requiresConfirmation) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? ''
            await fetch(
              `${baseUrl}/auth/request-email-code/`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, firstName, phone }),
              },
            )
            toast.success('Регистрация прошла успешно! Введите код из письма.')
          } catch (err) {
            console.error('send-registration-email error:', err)
            // не ломаем регистрацию, если письмо не ушло
            toast.error('Не удалось отправить код подтверждения. Попробуйте позже.')
          }

          // Сохраняем телефон в localStorage для использования при подтверждении
          if (phone) {
            localStorage.setItem('registration_phone', phone)
          }
          
          onVerify(email)
        } else {
          toast.success('Регистрация прошла успешно!')
          router.push('/login')
        }
      } catch (error: any) {
        console.error('Signup error:', error)
        // Переводим сообщения об ошибках на русский
        let errorMessage = error.message || 'Ошибка регистрации'
        if (errorMessage.includes('too short')) {
          errorMessage = 'Пароль слишком короткий. Он должен содержать не менее 8 символов.'
        } else if (errorMessage.includes('SignUp failed:')) {
          errorMessage = errorMessage.replace('SignUp failed:', 'Ошибка регистрации:')
        }
        toast.error(errorMessage)
      }
    }
  }

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-4 text-gray-600 hover:text-black transition-colors"
      >
        <img src="/arrow-left-logo.svg" alt="arrow-left" className="w-5 h-5" />
        <span className="font-medium text-[16px]">вернуться назад</span>
      </button>
      <div className="text-start">
        <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
        <h2 className="text-2xl font-semibold mb-2">Регистрация</h2>
        <p className="text-gray-500">
          Уже есть аккаунт?{' '}
          <button
            onClick={onLogin}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Войти
          </button>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Имя</label>
            <input
              type="text"
              placeholder="Имя"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Фамилия</label>
            <input
              type="text"
              placeholder="Фамилия"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            type="email"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
          />
        </div>
        <div>
          <PhoneInput
            value={phone}
            onChange={(value) => setPhone(value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Пароль</label>
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="terms"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-5 h-5 accent-blue-500 cursor-pointer"
          />
          <label
            htmlFor="terms"
            className="text-sm text-gray-600 leading-relaxed"
          >
            Нажимая на кнопку «Далее», я согласился с условиями{' '}
            <a
              href="#"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Публичной оферты
            </a>{' '}
            и выражаю своё согласие на обработку моих персональных данных в
            соответствии с{' '}
            <a
              href="#"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Политикой конфиденциальности
            </a>
          </label>
        </div>

        <button
          type="submit"
          disabled={!checked}
          className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Далее
        </button>
      </form>
    </div>
  )
}

export default RegisterForm
