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

interface Schedule {
  schedule_id: string
  trip_id: string
  uid: string
  day: string
  time: string
  place: string
  memo: string
  created_at: string
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
  const [mapQuery, setMapQuery] = useState('')
  const mapDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const [form, setForm] = useState({ day: '1', time: '', place: '', memo: '' })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated') fetchData()
  }, [status])

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
    } finally {
      setLoading(false)
    }
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

  const daySchedules = schedules
    .filter(s => s.day === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time))

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
    if (!query) return null
    const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=ko`
    return (
      <div style={{ marginTop: 12, borderRadius: 16, overflow: 'hidden', border: '2px solid #f0f0f0' }}>
        <div style={{ padding: '8px 12px', background: '#f8f8f8', fontSize: 11, color: '#888', fontWeight: 600 }}>
          📍 {query}
        </div>
        <iframe
          src={src}
          width="100%"
          height="200"
          style={{ display: 'block', border: 'none' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
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
        <div style={{ overflowX: 'auto', display: 'flex', gap: 8, padding: '0 16px 12px', scrollbarWidth: 'none' }}>
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
          daySchedules.map((s, idx) => (
            <div key={s.schedule_id} style={{
              background: 'white', borderRadius: 20, padding: '14px 16px',
              marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#FF6B9D' }}>{s.time || '--:--'}</div>
                {idx < daySchedules.length - 1 && (
                  <div style={{ width: 2, height: 30, background: '#f0f0f0', margin: '4px auto 0' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{s.place}</div>
                {s.memo && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.memo}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
          ))
        )}
      </div>

      {/* Add FAB */}
      <button onClick={openAdd} className="fixed z-50" style={{
        bottom: 30, right: 24, width: 60, height: 60, borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF6B9D, #FF5BAE)', border: 'none',
        boxShadow: '0 4px 0 #CC2277, 0 8px 24px rgba(255,107,157,0.5)',
        color: 'white', fontSize: 28, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>+</button>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false); setMapQuery('') } }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
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
          <div style={{ width: '100%', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
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
