'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

interface Trip {
  trip_id: string
  title: string
  country: string
  city: string
  start_date: string
  end_date: string
}

const STORAGE_KEY = 'travel_quest_profile_img'

export default function MapPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [charPos, setCharPos] = useState(0)
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [newTrip, setNewTrip] = useState({ title: '', country: '', city: '', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)
  const [profileImg, setProfileImg] = useState<string | null>(null)
  const [showImgMenu, setShowImgMenu] = useState(false)
  const charRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setProfileImg(saved)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated') fetchTrips()
  }, [status])

  async function fetchTrips() {
    try {
      const res = await fetch('/api/trips')
      const data = await res.json()
      setTrips(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  function handleStageClick(tripId: string, idx: number) {
    if (selectedTrip === tripId) {
      router.push(`/schedule/${tripId}`)
    } else {
      setSelectedTrip(tripId)
      setCharPos(idx)
      setDeleteConfirm(null)
    }
  }

  async function handleDelete(tripId: string) {
    setDeleting(true)
    try {
      await fetch('/api/trips', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId }),
      })
      setTrips(prev => prev.filter(t => t.trip_id !== tripId))
      setSelectedTrip(null)
      setDeleteConfirm(null)
      if (charPos >= trips.length - 1) setCharPos(Math.max(0, trips.length - 2))
    } finally {
      setDeleting(false)
    }
  }

  async function addTrip() {
    if (!newTrip.title || !newTrip.country || !newTrip.city) return
    setSaving(true)
    try {
      await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrip),
      })
      setShowAddModal(false)
      setNewTrip({ title: '', country: '', city: '', start_date: '', end_date: '' })
      fetchTrips()
    } finally {
      setSaving(false)
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setProfileImg(result)
      localStorage.setItem(STORAGE_KEY, result)
      setShowImgMenu(false)
    }
    reader.readAsDataURL(file)
  }

  function resetToGoogle() {
    setProfileImg(null)
    localStorage.removeItem(STORAGE_KEY)
    setShowImgMenu(false)
  }

  const currentImg = profileImg || session?.user?.image || null

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #B0E2FF 100%)' }}>
        <div className="text-5xl animate-bounce">✈️</div>
      </div>
    )
  }

  const userName = session?.user?.name?.split(' ')[0] || '여행자'

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #B0E2FF 60%, #E8F4FD 100%)' }}>
      {/* Clouds */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-70" style={{
            background: 'white',
            width: `${60 + i * 20}px`, height: `${30 + i * 10}px`,
            top: `${10 + i * 15}%`, left: `${i * 20}%`,
            animation: `float ${3 + i}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-2">
        <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: '20px', padding: '12px 16px' }}>
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/')} className="text-2xl">🏠</button>
            <h1 className="text-base font-black text-gray-800">
              {userName}의 여행 <span className="text-lg">🗺️</span>
            </h1>
            <button onClick={() => signOut({ callbackUrl: '/' })} style={{ background: 'rgba(255,107,107,0.1)', border: 'none', borderRadius: '12px', padding: '6px 12px', fontSize: '12px', color: '#FF6B6B', fontWeight: 700 }}>
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Stage Map */}
      <div className="px-6 py-4 relative">
        {trips.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-gray-500 font-bold text-lg">아직 여행이 없어요!</p>
            <p className="text-gray-400 text-sm mt-2">아래 + 버튼으로 첫 여행을 추가해보세요</p>
          </div>
        ) : (
          <div className="relative">
            {trips.map((trip, idx) => {
              const isLeft = idx % 2 === 0
              const isSelected = selectedTrip === trip.trip_id
              const isConfirmDelete = deleteConfirm === trip.trip_id

              return (
                <div key={trip.trip_id} className="flex items-center mb-8 relative" style={{ flexDirection: isLeft ? 'row' : 'row-reverse' }}>
                  {/* Character on selected stage */}
                  {charPos === idx && (
                    <div ref={charRef} className="absolute z-20 transition-all duration-700"
                      style={{ [isLeft ? 'left' : 'right']: '55%', top: '-50px' }}>
                      {/* 이미지 변경 버튼 포함 캐릭터 */}
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          onClick={() => setShowImgMenu(v => !v)}
                          style={{
                            width: 60, height: 60,
                            background: 'linear-gradient(135deg, #FFB6C1, #FF69B4)',
                            borderRadius: '50%',
                            border: '3px solid white',
                            boxShadow: '0 4px 12px rgba(255,105,180,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '28px', padding: 0, cursor: 'pointer', overflow: 'hidden',
                            animation: 'bounce 1s ease-in-out infinite',
                          }}>
                          {currentImg
                            ? <img src={currentImg} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            : '🐻'}
                        </button>
                        {/* 카메라 아이콘 */}
                        <div style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 20, height: 20, borderRadius: '50%',
                          background: '#FF6B9D', border: '2px solid white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, cursor: 'pointer',
                        }}
                          onClick={() => setShowImgMenu(v => !v)}
                        >📷</div>

                        {/* 이미지 변경 메뉴 */}
                        {showImgMenu && (
                          <div style={{
                            position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
                            background: 'white', borderRadius: '16px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            padding: '8px', zIndex: 100, width: 160,
                            border: '1px solid rgba(0,0,0,0.06)',
                          }}>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              style={{ width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                              🖼️ 사진 변경
                            </button>
                            {profileImg && (
                              <button
                                onClick={resetToGoogle}
                                style={{ width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: 'none', fontSize: 13, fontWeight: 600, color: '#888', cursor: 'pointer', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}
                              >
                                🔄 구글 사진으로
                              </button>
                            )}
                            <button
                              onClick={() => setShowImgMenu(false)}
                              style={{ width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: 'none', fontSize: 13, color: '#aaa', cursor: 'pointer', borderRadius: '10px' }}
                            >
                              ✕ 닫기
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stage Node */}
                  <button
                    onClick={() => handleStageClick(trip.trip_id, idx)}
                    style={{
                      width: 70, height: 70, borderRadius: '50%', border: 'none',
                      background: isSelected
                        ? 'linear-gradient(135deg, #FF6B9D, #FF5BAE)'
                        : 'linear-gradient(135deg, #FFD700, #FFA500)',
                      boxShadow: isSelected
                        ? '0 4px 0 #CC2277, 0 6px 20px rgba(255,107,157,0.4)'
                        : '0 4px 0 #CC8800, 0 6px 16px rgba(255,165,0,0.3)',
                      color: 'white', fontWeight: 900, fontSize: 18,
                      cursor: 'pointer', flexShrink: 0, position: 'relative',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {idx + 1}
                    {/* 배지 — 왼쪽 아래 */}
                    <div style={{
                      position: 'absolute', bottom: -4, left: -4,
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#FF3B5C', color: 'white',
                      fontSize: 11, fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid white',
                    }}>{idx + 1}</div>
                  </button>

                  {/* Connector line */}
                  {idx < trips.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      [isLeft ? 'left' : 'right']: 35,
                      bottom: -32, width: 3, height: 32,
                      borderLeft: '3px dashed rgba(255,165,0,0.5)',
                    }} />
                  )}

                  {/* Trip Info Card */}
                  <div style={{
                    flex: 1, margin: isLeft ? '0 0 0 16px' : '0 16px 0 0',
                    background: isSelected ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '18px',
                    padding: '12px 14px',
                    boxShadow: isSelected
                      ? '0 4px 20px rgba(255,107,157,0.25), 0 0 0 2px rgba(255,107,157,0.3)'
                      : '0 2px 12px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }} onClick={() => handleStageClick(trip.trip_id, idx)}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {trip.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                          {trip.country} · {trip.city}
                        </div>
                        {trip.start_date && (
                          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                            {trip.start_date} ~ {trip.end_date}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirm(isConfirmDelete ? null : trip.trip_id)
                          }}
                          style={{
                            background: 'rgba(255,59,48,0.1)',
                            border: 'none', borderRadius: '10px',
                            padding: '6px 8px', cursor: 'pointer',
                            fontSize: 16, marginLeft: 8, flexShrink: 0,
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {isConfirmDelete && (
                      <div style={{
                        marginTop: 10, padding: '10px', borderRadius: '12px',
                        background: 'rgba(255,59,48,0.06)',
                        border: '1px solid rgba(255,59,48,0.2)',
                      }}>
                        <p style={{ fontSize: 12, color: '#FF3B30', fontWeight: 700, marginBottom: 8 }}>
                          ⚠️ 이 여행을 삭제할까요?<br />
                          <span style={{ fontWeight: 400, color: '#888' }}>스케쥴 데이터도 모두 삭제됩니다</span>
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(trip.trip_id) }}
                            disabled={deleting}
                            style={{
                              flex: 1, padding: '8px', borderRadius: '10px',
                              background: '#FF3B30', color: 'white',
                              border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            {deleting ? '삭제 중...' : '삭제'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }}
                            style={{
                              flex: 1, padding: '8px', borderRadius: '10px',
                              background: 'rgba(0,0,0,0.06)', color: '#666',
                              border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}

                    {isSelected && !isConfirmDelete && (
                      <div style={{ marginTop: 8, fontSize: 11, color: '#FF6B9D', fontWeight: 700, textAlign: 'center' }}>
                        한 번 더 탭하면 스케쥴로 이동 ✨
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      {/* Add Trip FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed z-50"
        style={{
          bottom: 30, right: 24,
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6B9D, #FF5BAE)',
          border: 'none', boxShadow: '0 4px 0 #CC2277, 0 8px 24px rgba(255,107,157,0.5)',
          color: 'white', fontSize: 28, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        +
      </button>

      {/* Add Trip Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false) }}>
          <div style={{
            width: '100%', background: 'white',
            borderRadius: '24px 24px 0 0', padding: '24px 20px 40px',
          }}>
            <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginBottom: 20 }}>🗺️ 새 여행 추가</h2>

            {[
              { label: '여행 이름 *', key: 'title', placeholder: '예) 나고야 연말 가족여행' },
              { label: '나라 *', key: 'country', placeholder: '예) 일본' },
              { label: '도시 *', key: 'city', placeholder: '예) 나고야' },
              { label: '시작일', key: 'start_date', placeholder: '', type: 'date' },
              { label: '종료일', key: 'end_date', placeholder: '', type: 'date' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>{label}</label>
                <input
                  type={type || 'text'}
                  placeholder={placeholder}
                  value={newTrip[key as keyof typeof newTrip]}
                  onChange={(e) => setNewTrip(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{
                    width: '100%', padding: '12px 14px',
                    border: '2px solid #f0f0f0', borderRadius: '14px',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            <button
              onClick={addTrip}
              disabled={saving || !newTrip.title || !newTrip.country || !newTrip.city}
              style={{
                width: '100%', padding: '16px',
                background: saving ? '#ccc' : 'linear-gradient(135deg, #FF6B9D, #FF5BAE)',
                border: 'none', borderRadius: '16px',
                color: 'white', fontWeight: 800, fontSize: 16, cursor: saving ? 'not-allowed' : 'pointer',
                marginTop: 4,
              }}
            >
              {saving ? '추가 중...' : '🗺️ 스테이지 생성!'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float { from { transform: translateY(0); } to { transform: translateY(-8px); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
    </div>
  )
}
