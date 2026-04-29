'use client'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Character from '@/components/Character'
import Image from 'next/image'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/map')
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">✈️</div>
          <p className="text-white font-bold text-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-8 px-4 relative overflow-hidden">
      {/* Clouds decoration */}
      <div className="absolute top-12 left-4 opacity-80">
        <Cloud size="large" />
      </div>
      <div className="absolute top-20 right-2 opacity-60">
        <Cloud size="small" />
      </div>
      <div className="absolute top-8 right-16 opacity-70">
        <Cloud size="medium" />
      </div>

      {/* Stars */}
      <div className="star" style={{ top: '15%', left: '10%', animationDelay: '0s' }}>⭐</div>
      <div className="star" style={{ top: '25%', right: '12%', animationDelay: '0.7s' }}>✨</div>
      <div className="star" style={{ top: '10%', right: '30%', animationDelay: '1.4s' }}>⭐</div>

      {/* Top area */}
      <div className="w-full text-center mt-8">
        <div className="cloud-panel inline-block px-6 py-3 mb-4">
          <h1 className="text-2xl font-black text-gray-700" style={{ letterSpacing: '-0.5px' }}>
            🗺️ Travel Quest
          </h1>
          <p className="text-sm text-gray-500 mt-1">나만의 여행 스테이지</p>
        </div>
      </div>

      {/* Character center */}
      <div className="flex flex-col items-center gap-6 flex-1 justify-center">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ background: 'radial-gradient(circle, #FFD700, transparent)', transform: 'scale(1.5)' }} />
          <Character size={150} expression="happy" />
        </div>

        {/* Speech bubble */}
        <div className="relative cloud-panel px-5 py-3 text-center">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0" style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '12px solid white',
          }} />
          <p className="text-gray-700 font-bold text-sm">안녕! 같이 여행 떠나볼까? 🌏</p>
        </div>
      </div>

      {/* Login / Start button */}
      <div className="w-full max-w-xs flex flex-col gap-3 mb-8">
        {!session ? (
          <>
            <button
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-3 bg-white rounded-2xl py-4 px-6 font-bold text-gray-700 shadow-lg border-2 border-gray-100 active:scale-95 transition-transform"
              style={{ boxShadow: '0 6px 0 #ddd, 0 8px 20px rgba(0,0,0,0.1)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 시작하기
            </button>
            <p className="text-center text-xs text-white opacity-80" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              로그인하고 나만의 여행 스테이지를 만들어보세요!
            </p>
          </>
        ) : (
          <button onClick={() => router.push('/map')} className="btn-game w-full text-center">
            🗺️ 여행 시작!
          </button>
        )}
      </div>

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-16 rounded-t-3xl" style={{ background: 'linear-gradient(180deg, #7BC67E, #5A9E5D)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: '#5A9E5D' }} />

      {/* Flowers */}
      <div className="absolute bottom-10 left-8 text-2xl">🌸</div>
      <div className="absolute bottom-12 left-20 text-xl">🌼</div>
      <div className="absolute bottom-10 right-8 text-2xl">🌺</div>
      <div className="absolute bottom-12 right-20 text-xl">🌻</div>
    </div>
  )
}

function Cloud({ size }: { size: 'small' | 'medium' | 'large' }) {
  const sizes = { small: 60, medium: 90, large: 120 }
  const s = sizes[size]
  return (
    <svg width={s} height={s * 0.6} viewBox="0 0 120 72">
      <ellipse cx="60" cy="50" rx="55" ry="22" fill="white" opacity="0.9" />
      <ellipse cx="40" cy="38" rx="28" ry="22" fill="white" opacity="0.9" />
      <ellipse cx="75" cy="35" rx="24" ry="20" fill="white" opacity="0.9" />
    </svg>
  )
}
