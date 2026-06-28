'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

interface Trip {
  trip_id: string
  title: string
  country: string
  city: string
  start_date: string
  end_date: string
}

interface Comment {
  comment_id: string
  uid: string
  name: string
  avatar: string
  text: string
  created_at: string
}

interface Schedule {
  schedule_id: string
  trip_id: string
  uid: string
  day: string
  time: string
  place: string
  memo: string
  created_at: string
  sort_order: number | null
}

// 이동경로 섹션 컴포넌트
function RouteSection({ from, to, routeKey }: { from: string; to: string; routeKey: string }) {
  const [distInfo, setDistInfo] = useState<{
    distance: string; duration: string;
    fromCoords?: { lat: number; lng: number };
    toCoords?: { lat: number; lng: number };
  } | null>(null)
  const [distLoading, setDistLoading] = useState(true)

  useEffect(() => {
    setDistLoading(true)
    setDistInfo(null)
    fetch(`/api/distance?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`)
      .then(r => r.json())
      .then(d => { if (d.distance) setDistInfo(d) })
      .finally(() => setDistLoading(false))
  }, [from, to])

  // 네이버 지도 URL 모드 코드
  // web URL: car / walk / transit
  // nmap:// 딥링크: car / walk / public
  const modes = [
    { key: 'walk',   nmapKey: 'walk',   webKey: 'walk',    icon: '🚶', label: '도보' },
    { key: 'public', nmapKey: 'public', webKey: 'transit', icon: '🚌', label: '대중교통' },
    { key: 'car',    nmapKey: 'car',    webKey: 'car',     icon: '🚗', label: '자동차' },
  ] as const

  function openNaver(nmapKey: string, webKey: string) {
    const sn = encodeURIComponent(from)
    const dn = encodeURIComponent(to)
    const fc = distInfo?.fromCoords
    const tc = distInfo?.toCoords

    // 네이버 지도 /p/ 포맷: 좌표,이름 형태
    const startSeg = fc ? `${fc.lng},${fc.lat},${sn},${sn}` : '-'
    const endSeg   = tc ? `${tc.lng},${tc.lat},${dn},${dn}` : '-'
    const webUrl = `https://map.naver.com/p/directions/${startSeg}/${endSeg}/-/${webKey}`

    const isMobile = /android|iphone|ipad/i.test(navigator.userAgent)
    if (isMobile) {
      const appUrl = fc && tc
        ? `nmap://route/${nmapKey}?slat=${fc.lat}&slng=${fc.lng}&sname=${sn}&dlat=${tc.lat}&dlng=${tc.lng}&dname=${dn}&appname=com.travelquest.app`
        : `nmap://route/${nmapKey}?sname=${sn}&dname=${dn}&appname=com.travelquest.app`
      window.location.href = appUrl
      setTimeout(() => { window.open(webUrl, '_blank') }, 600)
    } else {
      window.open(webUrl, '_blank')
    }
  }

  return (
    <div style={{ margin: '0 0 0 22px', padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 2, height: 10, background: '#e0e0e0', borderRadius: 2, flexShrink: 0 }} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
          background: 'rgba(3,199,90,0.06)',
          border: '1px solid rgba(3,199,90,0.2)',
          borderRadius: 20, padding: '4px 10px',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#03C75A', marginRight: 2 }}>🗺️ 네이버지도</span>

          {distLoading ? (
            <span style={{ fontSize: 10, color: '#aaa', padding: '2px 4px' }}>...</span>
          ) : distInfo ? (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: 'rgba(3,199,90,0.1)', color: '#03C75A',
              borderRadius: 10, padding: '2px 7px',
            }}>
              📍 {distInfo.distance} · 🚗 {distInfo.duration}
            </span>
          ) : null}

          {modes.map(m => (
            <button
              key={m.key}
              onClick={() => openNaver(m.nmapKey, m.webKey)}
              style={{
                border: 'none', borderRadius: 12, padding: '3px 8px',
                cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: 'rgba(3,199,90,0.12)', color: '#03C75A',
                transition: 'all 0.15s',
              }}
              title={`${m.label}으로 길찾기`}
            >
              {m.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SchedulePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const tripId = params.tripId as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState('1')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // 드래그 순서용 로컬 상태
  const [localOrder, setLocalOrder] = useState<string[]>([])
  const localOrderRef = useRef<string[]>([])   // stale closure 방지용 ref
  const dragIdx = useRef<number | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  // 터치 드래그용
  const touchDragIdx = useRef<number | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [mapQuery, setMapQuery] = useState('')
  const mapDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const dayTabsRef = useRef<HTMLDivElement | null>(null)

  const [form, setForm] = useState({ day: '1', time: '', place: '', memo: '' })
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated') fetchData()
  }, [status])

  useEffect(() => {
    const el = dayTabsRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [loading])

  async function fetchData() {
    try {
      const [tripsRes, schRes] = await Promise.all([
        fetch('/api/trips'),
        fetch(`/api/schedules?trip_id=${tripId}`)
      ])
      const trips = await tripsRes.json()
      const trip = Array.isArray(trips) ? trips.find((t: Trip) => t.trip_id === tripId) : null
      setTrip(trip || null)
      const sch = await schRes.json()
      setSchedules(Array.isArray(sch) ? sch : [])
      // 댓글 로드
      const cRes = await fetch(`/api/comments?trip_id=${tripId}`)
      const cData = await cRes.json()
      setComments(Array.isArray(cData) ? cData : [])
    } finally {
      setLoading(false)
    }
  }

  async function postComment() {
    if (!newComment.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, text: newComment }),
      })
      const c = await res.json()
      setComments(prev => [...prev, c])
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

  async function reorderSchedule() {
    const orderedIds = localOrderRef.current
    // rawDaySchedules는 schedules state 기반 — stale 안 됨
    const allDaySchedules = schedules.filter(s => s.day === selectedDay)
    const ordered = orderedIds
      .map(id => allDaySchedules.find(s => s.schedule_id === id))
      .filter(Boolean) as Schedule[]
    if (ordered.length === 0) return
    // sort_order를 1, 2, 3... 으로 저장
    await Promise.all(
      ordered.map((s, i) =>
        fetch('/api/schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...s, sort_order: i + 1 }),
        })
      )
    )
    await fetchData()
  }

  function getDays(): string[] {
    if (!trip?.start_date || !trip?.end_date) return ['1', '2', '3']
    const start = new Date(trip.start_date + 'T00:00:00')
    const end = new Date(trip.end_date + 'T00:00:00')
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return Array.from({ length: Math.max(diff, 1) }, (_, i) => String(i + 1))
  }

  function getDayDate(dayNum: string): string {
    if (!trip?.start_date) return ''
    const start = new Date(trip.start_date + 'T00:00:00')
    start.setDate(start.getDate() + Number(dayNum) - 1)
    return `${start.getMonth() + 1}/${start.getDate()}`
  }

  const rawDaySchedules = schedules
    .filter(s => s.day === selectedDay)
    .sort((a, b) => {
      // sort_order가 있으면 우선 사용
      const aHas = a.sort_order !== null && a.sort_order !== undefined
      const bHas = b.sort_order !== null && b.sort_order !== undefined
      if (aHas && bHas) return (a.sort_order as number) - (b.sort_order as number)
      if (aHas) return -1
      if (bHas) return 1
      // 없으면 time 기준
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })

  // localOrder로 표시 순서 결정 (드래그 즉시 반영)
  useEffect(() => {
    const ids = rawDaySchedules.map(s => s.schedule_id)
    localOrderRef.current = ids
    setLocalOrder(ids)
  }, [selectedDay, schedules])

  const daySchedules = localOrder.length > 0
    ? localOrder.map(id => rawDaySchedules.find(s => s.schedule_id === id)).filter(Boolean) as typeof rawDaySchedules
    : rawDaySchedules

  function applyLocalReorder(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    const newOrder = [...localOrderRef.current]  // ref에서 읽어 항상 최신값 사용
    const [moved] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)
    localOrderRef.current = newOrder             // ref 즉시 업데이트
    setLocalOrder(newOrder)                      // 렌더링용 state 업데이트
  }

  function handleTouchStart(idx: number) {
    touchDragIdx.current = idx
    setDraggingIdx(idx)
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const cardEl = el?.closest('[data-drag-idx]')
    if (!cardEl) return
    const overIdx = parseInt(cardEl.getAttribute('data-drag-idx') || '-1')
    if (overIdx < 0 || overIdx === touchDragIdx.current) return
    setDragOverIdx(overIdx)
    if (touchDragIdx.current !== null) {
      applyLocalReorder(touchDragIdx.current, overIdx)
      touchDragIdx.current = overIdx
    }
  }

  function handleTouchEnd() {
    if (touchDragIdx.current !== null) {
      reorderSchedule()  // localOrderRef.current를 직접 읽음
    }
    touchDragIdx.current = null
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  function handlePlaceInput(val: string, isEdit = false) {
    if (isEdit) {
      setEditTarget(prev => prev ? { ...prev, place: val } : prev)
    } else {
      setForm(prev => ({ ...prev, place: val }))
    }
    if (mapDebounceRef.current) clearTimeout(mapDebounceRef.current)
    mapDebounceRef.current = setTimeout(() => {
      if (val.trim().length > 2) setMapQuery(val.trim())
      else setMapQuery('')
    }, 800)
  }

  function openAdd() {
    setForm({ day: selectedDay, time: '', place: '', memo: '' })
    setMapQuery('')
    setShowAddModal(true)
  }

  function openEdit(s: Schedule) {
    setEditTarget(s)
    setMapQuery(s.place || '')
    setShowEditModal(true)
  }

  async function handleAdd() {
    if (!form.place) return
    setSaving(true)
    try {
      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, ...form }),
      })
      setShowAddModal(false)
      setMapQuery('')
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!editTarget) return
    setSaving(true)
    try {
      await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget),
      })
      setShowEditModal(false)
      setMapQuery('')
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(schedule_id: string) {
    setDeleting(schedule_id)
    try {
      await fetch('/api/schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id }),
      })
      await fetchData()
    } finally {
      setDeleting(null)
    }
  }

  function MapPreview({ query }: { query: string }) {
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [mapLoading, setMapLoading] = useState(false)

    useEffect(() => {
      if (!query || query.length < 2) { setCoords(null); return }
      setMapLoading(true)
      fetch(`/api/geocode?place=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(d => { if (d.lat) setCoords(d) })
        .finally(() => setMapLoading(false))
    }, [query])

    if (!query) return null

    const naverUrl = coords
      ? `https://map.naver.com/v5/directions/-/${coords.lng},${coords.lat},${encodeURIComponent(query)}/-/car`
      : `https://map.naver.com/v5/search/${encodeURIComponent(query)}`

    const osmSrc = coords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01},${coords.lat - 0.01},${coords.lng + 0.01},${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lng}`
      : null

    return (
      <div style={{ marginTop: 12, borderRadius: 16, overflow: 'hidden', border: '1.5px solid rgba(3,199,90,0.25)' }}>
        <div style={{ padding: '8px 12px', background: 'rgba(3,199,90,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>📍 {query}</span>
          <a href={naverUrl} target="_blank" rel="noopener noreferrer"
            style={{ background: '#03C75A', color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
            네이버지도
          </a>
        </div>
        {mapLoading && (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9ff', fontSize: 13, color: '#aaa' }}>지도 로딩 중...</div>
        )}
        {!mapLoading && osmSrc && (
          <iframe
            src={osmSrc}
            width="100%" height="180"
            style={{ display: 'block', border: 'none' }}
            loading="lazy"
          />
        )}
        {!mapLoading && !osmSrc && (
          <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9ff', fontSize: 12, color: '#aaa' }}>장소를 찾을 수 없어요</div>
        )}
      </div>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9ff' }}>
        <div className="text-5xl animate-bounce">✈️</div>
      </div>
    )
  }

  const days = getDays()

  return (
    <div className="min-h-screen" style={{ background: '#f8f9ff' }}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ background: 'white', boxShadow: '0 1px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/map')} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px' }}>←</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {trip?.title || '여행 일정'}
              </h1>
              {trip && (
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  {trip.country} · {trip.city} · {trip.start_date} ~ {trip.end_date}
                </div>
              )}
            </div>
            <button onClick={() => router.push(`/pdf/${tripId}`)} style={{
              background: 'rgba(255,107,157,0.1)', border: 'none', borderRadius: '12px',
              padding: '6px 12px', fontSize: 12, color: '#FF6B9D', fontWeight: 700, cursor: 'pointer'
            }}>PDF</button>
          </div>
        </div>

        {/* Day tabs */}
        <div ref={dayTabsRef} style={{ overflowX: 'auto', display: 'flex', gap: 8, padding: '0 16px 12px', scrollbarWidth: 'none' }}>
          {days.map(day => (
            <button key={day} onClick={() => setSelectedDay(day)} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 16,
              border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: selectedDay === day ? 'linear-gradient(135deg, #FF6B9D, #FF5BAE)' : '#f0f0f4',
              color: selectedDay === day ? 'white' : '#666',
              boxShadow: selectedDay === day ? '0 2px 8px rgba(255,107,157,0.35)' : 'none',
              transition: 'all 0.2s',
            }}>
              <div>Day {day}</div>
              <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>{getDayDate(day)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule list */}
      <div style={{ padding: '16px' }}>
        {daySchedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📍</div>
            <p style={{ color: '#aaa', fontWeight: 600 }}>Day {selectedDay} 일정이 없어요</p>
            <p style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>아래 + 버튼으로 추가해보세요</p>
          </div>
        ) : (
          daySchedules.map((s, idx) => {
            const next = daySchedules[idx + 1]
            const isDragOver = dragOverIdx === idx
            const isDragging = draggingIdx === idx

            return (
              <div key={s.schedule_id}>
                {/* 장소 카드 */}
                <div
                  ref={el => { cardRefs.current[idx] = el }}
                  data-drag-idx={idx}
                  draggable
                  onDragStart={e => {
                    dragIdx.current = idx
                    setDraggingIdx(idx)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={e => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragIdx.current !== null && dragIdx.current !== idx) {
                      setDragOverIdx(idx)
                      applyLocalReorder(dragIdx.current, idx)  // ref 동기 업데이트
                      dragIdx.current = idx
                    }
                  }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverIdx(null)
                    setDraggingIdx(null)
                    dragIdx.current = null
                    reorderSchedule()  // localOrderRef.current를 직접 읽음
                  }}
                  onDragEnd={() => {
                    dragIdx.current = null
                    setDraggingIdx(null)
                    setDragOverIdx(null)
                  }}
                  onTouchStart={() => handleTouchStart(idx)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    background: 'white', borderRadius: 20, padding: '14px 16px',
                    boxShadow: isDragOver ? '0 4px 20px rgba(255,107,157,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    border: isDragOver ? '2px dashed #FF6B9D' : '2px solid transparent',
                    transition: 'box-shadow 0.15s, border 0.15s',
                    opacity: isDragging ? 0.4 : 1,
                    cursor: 'default',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                >
                  {/* 드래그 핸들 (6점) */}
                  <div
                    style={{
                      flexShrink: 0, cursor: 'grab', display: 'flex', flexDirection: 'column',
                      gap: 3, padding: '4px 2px', alignSelf: 'center',
                    }}
                  >
                    {[0, 1].map(row => (
                      <div key={row} style={{ display: 'flex', gap: 3 }}>
                        {[0, 1, 2].map(col => (
                          <div key={col} style={{ width: 4, height: 4, borderRadius: '50%', background: '#bbb' }} />
                        ))}
                      </div>
                    ))}
                  </div>

                  <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 40 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#FF6B9D' }}>{s.time || '--:--'}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{s.place}</div>
                    {s.memo && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.memo}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={() => openEdit(s)} style={{
                      background: 'rgba(255,107,157,0.1)', border: 'none', borderRadius: 10,
                      padding: '6px 8px', cursor: 'pointer', fontSize: 14,
                    }}>✏️</button>
                    <button onClick={() => handleDelete(s.schedule_id)} disabled={deleting === s.schedule_id} style={{
                      background: 'rgba(255,59,48,0.1)', border: 'none', borderRadius: 10,
                      padding: '6px 8px', cursor: 'pointer', fontSize: 14,
                    }}>🗑️</button>
                  </div>
                </div>

                {/* 이동수단 선택 + iframe 펼침 */}
                {next && (
                  <RouteSection from={s.place} to={next.place} routeKey={`${s.schedule_id}-${next.schedule_id}`} />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 댓글 섹션 */}
      <div style={{ padding: '0 16px 100px' }}>
        <button onClick={() => setShowComments(v => !v)}
          style={{ width: '100%', padding: '12px', background: 'white', border: 'none', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showComments ? 12 : 0 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e' }}>💬 친구 댓글 {comments.length > 0 ? `(${comments.length})` : ''}</span>
          <span style={{ fontSize: 12, color: '#aaa' }}>{showComments ? '▲ 접기' : '▼ 펼치기'}</span>
        </button>
        {showComments && (
          <>
            {comments.map(c => (
              <div key={c.comment_id} style={{ background: 'white', borderRadius: 16, padding: '12px 14px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {c.avatar
                    ? <img src={c.avatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#FF6B9D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>{c.name[0]}</div>
                  }
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>{c.created_at.slice(0, 10)}</span>
                  {session?.user?.email === c.uid && (
                    <button onClick={() => deleteComment(c.comment_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ddd' }}>🗑️</button>
                  )}
                </div>
                <p style={{ fontSize: 13, color: '#444', margin: 0, lineHeight: 1.5 }}>{c.text}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <p style={{ textAlign: 'center', color: '#ccc', fontSize: 13, padding: '16px 0' }}>아직 댓글이 없어요</p>
            )}
            <div style={{ background: 'white', borderRadius: 16, padding: 12, marginTop: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', gap: 8 }}>
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="댓글 남기기..." onKeyDown={e => e.key === 'Enter' && postComment()}
                style={{ flex: 1, border: '2px solid #f0f0f0', borderRadius: 12, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
              <button onClick={postComment} disabled={posting || !newComment.trim()}
                style={{ padding: '8px 14px', background: posting ? '#ccc' : 'linear-gradient(135deg,#FF6B9D,#FF5BAE)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                {posting ? '...' : '등록'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add FAB */}
      <button onClick={openAdd} className="fixed z-50" style={{
        bottom: 90, right: 24, width: 60, height: 60, borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF6B9D, #FF5BAE)', border: 'none',
        boxShadow: '0 4px 0 #CC2277, 0 8px 24px rgba(255,107,157,0.5)',
        color: 'white', fontSize: 28, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>+</button>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false); setMapQuery('') } }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 100px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>📍 일정 추가</h2>
              <button onClick={() => { setShowAddModal(false); setMapQuery('') }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa' }}>✕</button>
            </div>

            {/* Day & Time */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>Day</label>
                <select value={form.day} onChange={e => setForm(p => ({ ...p, day: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #f0f0f0', borderRadius: 14, fontSize: 14, outline: 'none', background: 'white' }}>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>시간</label>
                <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #f0f0f0', borderRadius: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Place */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>장소 *</label>
              <input type="text" placeholder="예) 도쿄타워, 시부야 스크램블" value={form.place}
                onChange={e => handlePlaceInput(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #f0f0f0', borderRadius: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              {/* Google Maps Preview */}
              <MapPreview query={mapQuery} />
            </div>

            {/* Memo */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>메모</label>
              <textarea placeholder="예) 예약 필요, 영업시간 10-18시" value={form.memo}
                onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #f0f0f0', borderRadius: 14, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            <button onClick={handleAdd} disabled={saving || !form.place} style={{
              width: '100%', padding: 16,
              background: saving || !form.place ? '#ccc' : 'linear-gradient(135deg, #FF6B9D, #FF5BAE)',
              border: 'none', borderRadius: 16, color: 'white', fontWeight: 800, fontSize: 16,
              cursor: saving || !form.place ? 'not-allowed' : 'pointer',
            }}>
              {saving ? '추가 중...' : '📍 추가하기'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowEditModal(false); setMapQuery('') } }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 100px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>✏️ 일정 수정</h2>
              <button onClick={() => { setShowEditModal(false); setMapQuery('') }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>Day</label>
                <select value={editTarget.day} onChange={e => setEditTarget(p => p ? { ...p, day: e.target.value } : p)}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #f0f0f0', borderRadius: 14, fontSize: 14, outline: 'none', background: 'white' }}>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>시간</label>
                <input type="time" value={editTarget.time}
                  onChange={e => setEditTarget(p => p ? { ...p, time: e.target.value } : p)}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #f0f0f0', borderRadius: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>장소 *</label>
              <input type="text" value={editTarget.place}
                onChange={e => handlePlaceInput(e.target.value, true)}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #f0f0f0', borderRadius: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              <MapPreview query={mapQuery} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>메모</label>
              <textarea value={editTarget.memo}
                onChange={e => setEditTarget(p => p ? { ...p, memo: e.target.value } : p)} rows={3}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #f0f0f0', borderRadius: 14, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            <button onClick={handleEdit} disabled={saving} style={{
              width: '100%', padding: 16,
              background: saving ? '#ccc' : 'linear-gradient(135deg, #FF6B9D, #FF5BAE)',
              border: 'none', borderRadius: 16, color: 'white', fontWeight: 800, fontSize: 16,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? '저장 중...' : '✅ 저장하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
