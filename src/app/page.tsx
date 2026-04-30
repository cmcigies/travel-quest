'use client'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function isWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // 안드로이드 WebView, 카카오, 인스타, 페북 인앱브라우저 등 감지
  return /KAKAOTALK|NAVER|Instagram|FBAV|FB_IAB|Line\/|Twitter|Snapchat|Musical|wv\)|WebView/.test(ua) ||
    (/Android/.test(ua) && /Version\/[\d.]+/.test(ua) && !/Chrome\//.test(ua))
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [webView, setWebView] = useState(false)

  useEffect(() => {
    setWebView(isWebView())
    if (status === 'authenticated') router.push('/map')
  }, [status])

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#87CEEB,#B0E2FF)' }}>
      <div style={{ fontSize: 48 }}>✈️</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#87CEEB 0%,#B0E2FF 60%,#E8F4FD 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>

      {/* 구름 */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', borderRadius: '50%', background: 'white', opacity: 0.7, width: 80 + i * 20, height: 40 + i * 10, top: `${15 + i * 18}%`, left: `${i * 25}%`, animation: `float ${3+i}s ease-in-out infinite alternate` }} />
        ))}
      </div>

      <div style={{ position: 'relative', textAlign: 'center', width: '100%', maxWidth: 360 }}>
        {/* 로고 */}
        <div style={{ fontSize: 72, marginBottom: 8 }}>✈️</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1a1a2e', marginBottom: 4 }}>CiGieS</h1>
        <p style={{ fontSize: 16, color: '#5a6a8a', marginBottom: 40 }}>나만의 여행 스테이지</p>

        {/* WebView 경고 */}
        {webView ? (
          <div style={{ background: 'white', borderRadius: 24, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
              구글 계정으로 로그인하고<br/>나만의 여행을 기록해보세요 🗺️
            </p>
            {/* 카카오톡 안내 */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>외부 브라우저로 열어주세요</p>
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
                카카오톡 인앱 브라우저에서는<br/>Google 로그인이 불가해요
              </p>
            </div>

            {/* 카카오톡 안드로이드: 우측 상단 메뉴 안내 */}
            <div style={{ background: '#FFF9E6', border: '1px solid #FFD700', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#8B6900', marginBottom: 10 }}>📌 카카오톡에서 여는 방법</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>1</div>
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}>화면 <strong>우측 하단 ···</strong> 버튼 탭</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>2</div>
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}><strong>"다른 브라우저로 열기"</strong> 선택</p>
              </div>
            </div>

            {/* 주소 복사 버튼 */}
            <button
              onClick={() => {
                const url = 'https://travel-quest-plum.vercel.app'
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(url).then(() => alert('✅ 주소가 복사됐어요!\n\nChrome 또는 Safari를 열고\n주소창에 붙여넣기 해주세요'))
                } else {
                  alert('주소: ' + url + '\n\nChrome 또는 Safari 주소창에 입력해주세요')
                }
              }}
              style={{ width: '100%', padding: 15, background: 'linear-gradient(135deg,#FF6B9D,#FF5BAE)', border: 'none', borderRadius: 16, color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #CC2277, 0 6px 16px rgba(255,107,157,0.4)' }}>
              📋 주소 복사하기
            </button>
            <p style={{ fontSize: 11, color: '#bbb', marginTop: 10, textAlign: 'center' }}>
              복사 후 Chrome / Safari 주소창에 붙여넣기
            </p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 24, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
              구글 계정으로 로그인하고<br/>나만의 여행을 기록해보세요 🗺️
            </p>
            <button
              onClick={() => signIn('google', { callbackUrl: '/map' })}
              style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg,#FF6B9D,#FF5BAE)', border: 'none', borderRadius: 16, color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 0 #CC2277, 0 6px 16px rgba(255,107,157,0.4)' }}>
              🌏 Google로 시작하기
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float { from { transform: translateY(0); } to { transform: translateY(-8px); } }
      `}</style>
    </div>
  )
}
