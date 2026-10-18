import { Suspense } from 'react'
import ProfileIndex from './_components'

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-black/40">
          Загрузка профиля...
        </div>
      }
    >
      <ProfileIndex />
    </Suspense>
  )
}
