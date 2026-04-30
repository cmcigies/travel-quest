'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'

interface Trip {
  trip_id: string
  title: string
  country: string
  city: string
  start_date: string
  end_date: string
  share_token: string
}
interface Schedule {
  schedule_id: string
  day: string
  time: string
  place: string
  memo: string
}
interface Comment {
  comment_id: string
  uid: string
  name: string
  avatar: string
  text: string
  created_at: string
}

function ShareRouteSection({ from, to }: { from: string; to: string }) {
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const modes = [
    { key: 'walking', icon: '🚶', label: '도보', dirflg: 'w', travelmode: 'walking' },
    { key: 'transit', icon: '🚌', label: '대중교통', dirflg: 'r', travelmode: 'transit' },
    { key: 'driving', icon: '🚗', label: '자동차', dirflg: 'd', travelmode: 'driving' },
  ]
  function getMapSrc(m: typeof modes[0]) {
    const o = encodeURIComponent(from), d = encodeURIComponent(to)
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (apiKey) return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${o}&destination=${d}&mode=${m.travelmode}&language=ko`
    return `https://maps.google.com/maps?saddr=${o}&daddr=${d}&dirflg=${m.dirflg}&output=embed&hl=ko`
  }
  return (
    <div style={{ margin: '0 0 0 22px', padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 2, height: 10, background: '#e0e0e0', borderRadius: 2, flexShrink: 0 }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(66,133,244,0.06)', border: '1px solid rgba(66,133,244,0.15)', borderRadius: 20, padding: '4px 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4285F4', marginRight: 2 }}>🗺️ 이동</span>
          {modes.map(m => (
            <button key={m.key} onClick={() => setActiveMode(activeMode === m.key ? null : m.key)}
              style={{ border: 'none', borderRadius: 12, padding: '3px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: activeMode === m.key ? '#4285F4' : 'rgba(66,133,244,0.1)', color: activeMode === m.key ? 'white' : '#4285F4', transition: 'all 0.15s' }}
              title={m.label}>{m.icon}</button>
          ))}
        </div>
      </div>
      {activeMode && (
        <div style={{ marginTop: 8, marginLeft: 12, borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(66,133,244,0.15)', boxShadow: '0 2px 12px rgba(66,133,244,0.1)' }}>
          <div style={{ padding: '8px 12px', background: 'rgba(66,133,244,0.06)', fontSize: 11, color: '#4285F4', fontWeight: 700 }}>
            {modes.find(m => m.key === activeMode)?.icon} {modes.find(m => m.key === activeMode)?.label} · {from} → {to}
          </div>
          <iframe src={getMapSrc(modes.find(m => m.key === activeMode)!)} width="100%" height="220" style={{ display: 'block', border: 'none' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      )}
    </div>
  )
}

export default function SharePage() {
  const params = useParams()
  const token = params.token as string
  const { data: session } = useSession()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState('1')
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { fetchData() }, [token])

  async function fetchData() {
    try {
      const res = await fetch(`/api/share?token=${token}`)
      if (!res.ok) { setNotFound(true); return }
      const data = await res.json()
      setTrip(data.trip)
      setSchedules(data.schedules)
      if (data.trip) fetchComments(data.trip.trip_id)
    } finally {
      setLoading(false)
    }
  }

  async function fetchComments(trip_id: string) {
    const res = await fetch(`/api/comments?trip_id=${trip_id}`)
    const data = await res.json()
    setComments(Array.isArray(data) ? data : [])
  }

  async function postComment() {
    if (!newComment.trim() || !trip) return
    setPosting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: trip.trip_id, text: newComment }),
      })
      const comment = await res.json()
      setComments(prev => [...prev, comment])
      setNewComment('')
    } finally {
      setPosting(false)
    }
  }

  async function deleteComment(comment_id: string) {
    await fetch('/api/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id }),
    })
    setComments(prev => prev.filter(c => c.comment_id !== comment_id))
  }

  function getDays(): string[] {
    if (!trip?.start_date || !trip?.end_date) return ['1']
    const start = new Date(trip.start_date + 'T00:00:00')
    const end = new Date(trip.end_date + 'T00:00:00')
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return Array.from({ length: Math.max(diff, 1) }, (_, i) => String(i + 1))
  }

  function getDayDate(dayNum: string) {
    if (!trip?.start_date) return ''
    const d = new Date(trip.start_date + 'T00:00:00')
    d.setDate(d.getDate() + Number(dayNum) - 1)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const daySchedules = schedules
    .filter(s => s.day === selectedDay)
    .sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9ff' }}>
      <div style={{ fontSize: 48 }}>✈️</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f9ff' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
      <p style={{ fontWeight: 800, fontSize: 18, color: '#1a1a2e' }}>링크를 찾을 수 없어요</p>
      <p style={{ color: '#aaa', marginTop: 8 }}>공유가 취소됐거나 잘못된 링크예요</p>
    </div>
  )

  const days = getDays()

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF5BAE)', padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = '/map'}
            style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 12, padding: '6px 12px', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            ← 뒤로
          </button>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>🔗 공유된 여행 일정</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0 }}>{trip?.title}</h1>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>
          {trip?.country} · {trip?.city} · {trip?.start_date} ~ {trip?.end_date}
        </div>
      </div>

      {/* Day tabs */}
      <div style={{ background: 'white', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto', display: 'flex', gap: 8, padding: '12px 16px', scrollbarWidth: 'none' }}>
          {days.map(day => (
            <button key={day} onClick={() => setSelectedDay(day)} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: selectedDay === day ? 'linear-gradient(135deg, #FF6B9D, #FF5BAE)' : '#f0f0f4',
              color: selectedDay === day ? 'white' : '#666',
              transition: 'all 0.2s',
            }}>
              <div>Day {day}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>{getDayDate(day)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div style={{ padding: 16 }}>
        {daySchedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa', fontWeight: 600 }}>
            Day {selectedDay} 일정이 없어요
          </div>
        ) : daySchedules.map((s, idx) => {
          const next = daySchedules[idx + 1]
          return (
            <div key={s.schedule_id}>
              <div style={{ background: 'white', borderRadius: 20, padding: '14px 16px', marginBottom: next ? 0 : 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#FF6B9D', minWidth: 44 }}>{s.time || '--:--'}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{s.place}</div>
                  {s.memo && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.memo}</div>}
                </div>
              </div>
              {next && <ShareRouteSection from={s.place} to={next.place} />}
            </div>
          )
        })}
      </div>

      {/* 댓글 섹션 */}
      <div style={{ padding: '0 16px 40px' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 12 }}>
          💬 댓글 {comments.length > 0 ? `(${comments.length})` : ''}
        </h2>

        {/* 댓글 입력 */}
        {session ? (
          <div style={{ background: 'white', borderRadius: 18, padding: 14, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <img src={session.user?.image || ''} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="댓글을 남겨보세요..."
                rows={2}
                style={{ flex: 1, border: '2px solid #f0f0f0', borderRadius: 12, padding: '8px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <button onClick={postComment} disabled={posting || !newComment.trim()}
              style={{ marginTop: 10, width: '100%', padding: '10px', background: posting || !newComment.trim() ? '#ccc' : 'linear-gradient(135deg, #FF6B9D, #FF5BAE)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {posting ? '등록 중...' : '댓글 등록'}
            </button>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 18, padding: 16, marginBottom: 16, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>댓글을 작성하려면 로그인이 필요해요</p>
            <button onClick={() => signIn('google')}
              style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF5BAE)', border: 'none', borderRadius: 12, padding: '10px 24px', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
              구글로 로그인
            </button>
          </div>
        )}

        {/* 댓글 목록 */}
        {comments.map(c => (
          <div key={c.comment_id} style={{ background: 'white', borderRadius: 18, padding: '12px 14px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {c.avatar
                ? <img src={c.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FF6B9D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>{c.name[0]}</div>
              }
              <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
              <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>{c.created_at.slice(0, 10)}</span>
              {session?.user?.email === c.uid && (
                <button onClick={() => deleteComment(c.comment_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ccc' }}>🗑️</button>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#444', margin: 0, lineHeight: 1.5 }}>{c.text}</p>
          </div>
        ))}

        {comments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#ccc', fontSize: 13 }}>
            첫 번째 댓글을 남겨보세요 ✨
          </div>
        )}
      </div>
    </div>
  )
}
