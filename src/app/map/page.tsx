'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Character from '@/components/Character'
import Image from 'next/image'

interface Trip {
  trip_id: string
  title: string
  country: string
  city: string
  start_date: string
  end_date: string
  created_at: string
}

const COUNTRY_EMOJIS: Record<string, string> = {
  '일본': '🇯🇵', '한국': '🇰🇷', '태국': '🇹🇭', '프랑스': '🇫🇷',
  '영국': '🇬🇧', '미국': '🇺🇸', '이탈리아': '🇮🇹', '스페인': '🇪🇸',
  '독일': '🇩🇪', '중국': '🇨🇳', '베트남': '🇻🇳', '대만': '🇹🇼',
  '호주': '🇦🇺', '캐나다': '🇨🇦', '기타': '🌍',
}

const STAGE_COLORS = [
  { bg: '#FF6B9D', border: '#CC2277', shadow: '#99004D' },
  { bg: '#FFB800', border: '#CC8800', shadow: '#995500' },
  { bg: '#4ECDC4', border: '#2A9D8F', shadow: '#1A6B63' },
  { bg: '#A78BFA', border: '#7C3AED', shadow: '#5B21B6' },
  { bg: '#F97316', border: '#C2410C', shadow: '#9A3412' },
  { bg: '#06B6D4', border: '#0891B2', shadow: '#0E7490' },
]

// Zigzag positions for stages
const STAGE_POSITIONS = [
  { x: 50, side: 'center' },
  { x: 75, side: 'right' },
  { x: 25, side: 'left' },
  { x: 70, side: 'right' },
  { x: 30, side: 'left' },
  { x: 65, side: 'right' },
  { x: 20, side: 'left' },
  { x: 60, side: 'right' },
]

export default function MapPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [charPosition, setCharPosition] = useState(0)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated') fetchTrips()
  }, [status, router])

  async function fetchTrips() {
    try {
      const res = await fetch('/api/trips')
      const data = await res.json()
      setTrips(Array.isArray(data) ? data : [])
    } catch (e) {
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  function handleStageClick(tripId: string, index: number) {
    if (selectedTrip === tripId) {
      router.push(`/schedule/${tripId}`)
    } else {
      setSelectedTrip(tripId)
      setCharPosition(index)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4" style={{ animation: 'spin 1s linear infinite' }}>🗺️</div>
          <p className="text-white font-bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>여행지 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-2">
        <div className="cloud-panel px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-2xl">🏠</button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">
              {session?.user?.name?.split(' ')[0]}의 여행
            </span>
            {session?.user?.image && (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border-2 border-pink-300" />
            )}
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="text-2xl">⚙️</button>
        </div>

        {showMenu && (
          <div className="absolute right-4 top-16 cloud-panel p-2 z-50">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="block w-full text-left px-4 py-2 text-sm text-red-500 font-bold rounded-xl hover:bg-red-50"
            >
              🚪 로그아웃
            </button>
          </div>
        )}
      </div>

      {/* Map content */}
      <div className="px-4 pt-4 relative" style={{ minHeight: '70vh' }}>
        {/* Background decorations */}
        <div className="absolute top-10 left-6 text-3xl opacity-40">☁️</div>
        <div className="absolute top-20 right-8 text-2xl opacity-30">☁️</div>
        <div className="absolute top-40 left-12 text-xl opacity-25">☁️</div>

        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <Character size={120} expression="thinking" />
            <div className="cloud-panel px-6 py-5 text-center">
              <p className="text-gray-600 font-bold text-lg mb-1">아직 여행이 없어요!</p>
              <p className="text-gray-400 text-sm">첫 번째 여행 스테이지를 만들어보세요 ✨</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Character on map */}
            <div
              className="absolute z-20 transition-all duration-700"
              style={{
                left: `${STAGE_POSITIONS[charPosition % STAGE_POSITIONS.length].x}%`,
                top: `${charPosition * 120 + 20}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <Character size={70} expression={selectedTrip ? 'excited' : 'happy'} />
            </div>

            {/* Stages */}
            {trips.map((trip, index) => {
              const pos = STAGE_POSITIONS[index % STAGE_POSITIONS.length]
              const color = STAGE_COLORS[index % STAGE_COLORS.length]
              const emoji = COUNTRY_EMOJIS[trip.country] || '🌍'
              const isSelected = selectedTrip === trip.trip_id

              return (
                <div key={trip.trip_id} style={{ height: '140px', position: 'relative' }}>
                  {/* Path to next stage */}
                  {index < trips.length - 1 && (
                    <div className="absolute" style={{
                      left: '50%',
                      top: '80px',
                      width: '4px',
                      height: '80px',
                      background: 'repeating-linear-gradient(180deg, #D4A96A 0px, #D4A96A 10px, transparent 10px, transparent 20px)',
                      borderRadius: '2px',
                      transform: 'translateX(-50%)',
                      opacity: 0.7,
                    }} />
                  )}

                  {/* Stage node */}
                  <div
                    className="absolute"
                    style={{
                      left: `${pos.x}%`,
                      top: '10px',
                      transform: 'translateX(-50%)',
                    }}
                    onClick={() => handleStageClick(trip.trip_id, index)}
                  >
                    {/* Pulse ring when selected */}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-full animate-ping" style={{
                        background: color.bg,
                        opacity: 0.3,
                        transform: 'scale(1.5)',
                      }} />
                    )}

                    <div
                      className="stage-node"
                      style={{
                        background: `linear-gradient(135deg, ${color.bg}, ${color.border})`,
                        borderColor: 'white',
                        boxShadow: `0 6px 0 ${color.shadow}, 0 8px 20px rgba(0,0,0,0.2)`,
                        width: isSelected ? '80px' : '72px',
                        height: isSelected ? '80px' : '72px',
                        transition: 'all 0.3s',
                      }}
                    >
                      <span style={{ fontSize: isSelected ? '2.2rem' : '1.8rem' }}>{emoji}</span>
                    </div>

                    {/* Stage number */}
                    <div
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                      style={{ background: color.border, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                    >
                      {index + 1}
                    </div>

                    {/* Info bubble */}
                    <div
                      className="absolute cloud-panel px-3 py-2 text-center"
                      style={{
                        [pos.side === 'right' ? 'right' : 'left']: '85px',
                        top: '10px',
                        minWidth: '110px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <p className="text-xs font-black text-gray-700 truncate" style={{ maxWidth: '100px' }}>{trip.title}</p>
                      <p className="text-xs text-gray-400">{trip.country} · {trip.city}</p>
                      {isSelected && (
                        <p className="text-xs text-pink-500 font-bold mt-1">탭해서 열기 👆</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* End flag */}
            <div className="flex justify-center mt-4 mb-8">
              <div className="text-4xl animate-bounce">🏁</div>
            </div>
          </div>
        )}
      </div>

      {/* AdSense placeholder */}
      <div className="mx-4 my-4 cloud-panel p-3 text-center" style={{ minHeight: '60px' }}>
        <p className="text-xs text-gray-400">광고 영역</p>
        {/* <ins className="adsbygoogle" style={{display:'block'}} data-ad-client="ca-pub-XXXXX" data-ad-slot="XXXXX" /> */}
      </div>

      {/* FAB - Add trip */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl z-40 btn-pink"
        style={{ boxShadow: '0 6px 0 #CC2277, 0 8px 20px rgba(255,107,157,0.5)' }}
      >
        ➕
      </button>

      {/* Add Trip Modal */}
      {showAddModal && (
        <AddTripModal
          onClose={() => setShowAddModal(false)}
          onAdd={() => { setShowAddModal(false); fetchTrips() }}
        />
      )}
    </div>
  )
}

function AddTripModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [form, setForm] = useState({
    title: '', country: '', city: '', start_date: '', end_date: '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!form.title || !form.country || !form.city) return alert('필수 항목을 입력해주세요!')
    setLoading(true)
    try {
      await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      onAdd()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-gray-800">✈️ 새 여행 추가</h2>
          <button onClick={onClose} className="text-2xl text-gray-400">✕</button>
        </div>

        <div className="flex flex-col gap-4">
          {[
            { label: '여행 이름 *', key: 'title', placeholder: '예) 도쿄 벚꽃 여행' },
            { label: '나라 *', key: 'country', placeholder: '예) 일본' },
            { label: '도시 *', key: 'city', placeholder: '예) 도쿄' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-sm font-bold text-gray-600 mb-1 block">{label}</label>
              <input
                type="text"
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:border-pink-300"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">출발일</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-2xl px-3 py-3 text-gray-700 focus:outline-none focus:border-pink-300"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">귀국일</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-2xl px-3 py-3 text-gray-700 focus:outline-none focus:border-pink-300"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-pink w-full text-center text-lg py-4 mt-2 rounded-2xl"
          >
            {loading ? '추가 중...' : '🗺️ 스테이지 생성!'}
          </button>
        </div>
      </div>
    </div>
  )
}
