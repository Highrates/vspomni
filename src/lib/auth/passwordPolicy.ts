/** Зеркало Nest `api/src/auth/password-policy.ts` — ранняя проверка до отправки OTP. */
export const PASSWORD_MIN_LENGTH = 8

const LETTER_RE = /[A-Za-zА-Яа-яЁё]/
const DIGIT_RE = /\d/

export function firstPasswordError(password: string): string | null {
  if (!password) return 'Введите пароль'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Пароль должен содержать не менее ${PASSWORD_MIN_LENGTH} символов`
  }
  if (!LETTER_RE.test(password)) return 'Пароль должен содержать хотя бы одну букву'
  if (!DIGIT_RE.test(password)) return 'Пароль должен содержать хотя бы одну цифру'
  return null
}
