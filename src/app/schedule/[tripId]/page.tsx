'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Schedule {
  schedule_id: string
  trip_id: string
  day: string
  time: string
  place: string
  memo: string
}

interface Trip {
  trip_id: string
  title: string
  country: string
  city: string
  start_date: string
  end_date: string
}

export default function SchedulePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const tripId = params.tripId as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState<Schedule | null>(null)
  const [activeDay, setActiveDay] = useState('1')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated') fetchData()
  }, [status])

  async function fetchData() {
    try {
      const [tripsRes, schRes] = await Promise.all([
        fetch('/api/trips'),
        fetch(`/api/schedules?trip_id=${tripId}`),
      ])
      const trips = await tripsRes.json()
      const schs = await schRes.json()
      const found = trips.find((t: Trip) => t.trip_id === tripId)
      setTrip(found || null)
      setSchedules(Array.isArray(schs) ? schs : [])
    } finally {
      setLoading(false)
    }
  }

  // Calculate days
  function getDays(): string[] {
    if (!trip?.start_date || !trip?.end_date) return ['1', '2', '3']
    const start = new Date(trip.start_date)
    const end = new Date(trip.end_date)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return Array.from({ length: Math.max(diff, 1) }, (_, i) => String(i + 1))
  }

  function getDateForDay(day: string): string {
    if (!trip?.start_date) return `Day ${day}`
    const date = new Date(trip.start_date)
    date.setDate(date.getDate() + parseInt(day) - 1)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const days = getDays()
  const daySchedules = schedules
    .filter(s => s.day === activeDay)
    .sort((a, b) => a.time.localeCompare(b.time))

  async function deleteSchedule(id: string) {
    if (!confirm('삭제할까요?')) return
    await fetch('/api/schedules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_id: id }),
    })
    fetchData()
  }

  async function downloadPDF() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text(`Travel Quest - ${trip?.title || ''}`, 20, 25)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`${trip?.country} · ${trip?.city}`, 20, 35)
    doc.text(`${trip?.start_date} ~ ${trip?.end_date}`, 20, 42)

    let y = 55
    for (const day of days) {
      const daySchs = schedules.filter(s => s.day === day).sort((a, b) => a.time.localeCompare(b.time))
      if (daySchs.length === 0) continue

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(`Day ${day} (${getDateForDay(day)})`, 20, y)
      y += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      for (const sch of daySchs) {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(`${sch.time || '--:--'}  ${sch.place}`, 25, y)
        y += 6
        if (sch.memo) {
          doc.setFontSize(9)
          doc.setTextColor(100, 100, 100)
          doc.text(`  → ${sch.memo}`, 30, y)
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(11)
          y += 5
        }
      }
      y += 6
    }

    doc.save(`${trip?.title || 'travel'}-schedule.pdf`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">✈️</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-2">
        <div className="cloud-panel px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => router.push('/map')} className="text-2xl">← </button>
            <div className="text-center flex-1">
              <h1 className="text-lg font-black text-gray-800">{trip?.title || '여행 스케쥴'}</h1>
              <p className="text-xs text-gray-500">{trip?.country} · {trip?.city} · {trip?.start_date} ~ {trip?.end_date}</p>
            </div>
            <button onClick={downloadPDF} className="text-2xl" title="PDF 다운로드">📄</button>
          </div>
        </div>
      </div>

      {/* Day tabs */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
                activeDay === day
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-500 border-2 border-gray-200'
              }`}
              style={activeDay === day ? {
                background: 'linear-gradient(135deg, #FF6B9D, #FF5BAE)',
                boxShadow: '0 4px 0 #CC2277',
              } : {}}
            >
              Day {day}
              <span className="block text-xs opacity-80">{getDateForDay(day)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule list */}
      <div className="px-4">
        {daySchedules.length === 0 ? (
          <div className="cloud-panel p-8 text-center">
            <div className="text-4xl mb-3">🗒️</div>
            <p className="text-gray-500 font-bold">아직 일정이 없어요</p>
            <p className="text-gray-400 text-sm mt-1">아래 + 버튼으로 추가해보세요!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {daySchedules.map((sch, idx) => (
              <div key={sch.schedule_id} className="cloud-panel p-4 flex items-start gap-4">
                {/* Time line */}
                <div className="flex flex-col items-center min-w-[48px]">
                  <div className="text-xs font-black text-pink-500">{sch.time || '--:--'}</div>
                  {idx < daySchedules.length - 1 && (
                    <div className="w-0.5 h-8 mt-1" style={{ background: 'linear-gradient(180deg, #FF6B9D, transparent)' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800">{sch.place}</p>
                  {sch.memo && <p className="text-sm text-gray-500 mt-1">{sch.memo}</p>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setEditItem(sch)} className="text-lg">✏️</button>
                  <button onClick={() => deleteSchedule(sch.schedule_id)} className="text-lg">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl z-40 btn-pink"
        style={{ boxShadow: '0 6px 0 #CC2277, 0 8px 20px rgba(255,107,157,0.5)' }}
      >
        ➕
      </button>

      {/* Modals */}
      {showAddModal && (
        <ScheduleModal
          tripId={tripId}
          defaultDay={activeDay}
          onClose={() => setShowAddModal(false)}
          onSave={() => { setShowAddModal(false); fetchData() }}
        />
      )}
      {editItem && (
        <ScheduleModal
          tripId={tripId}
          defaultDay={activeDay}
          editData={editItem}
          onClose={() => setEditItem(null)}
          onSave={() => { setEditItem(null); fetchData() }}
        />
      )}
    </div>
  )
}

function ScheduleModal({
  tripId, defaultDay, editData, onClose, onSave,
}: {
  tripId: string
  defaultDay: string
  editData?: Schedule | null
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    day: editData?.day || defaultDay,
    time: editData?.time || '',
    place: editData?.place || '',
    memo: editData?.memo || '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!form.place) return alert('장소를 입력해주세요!')
    setLoading(true)
    try {
      if (editData) {
        await fetch('/api/schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule_id: editData.schedule_id, ...form }),
        })
      } else {
        await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_id: tripId, ...form }),
        })
      }
      onSave()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-gray-800">
            {editData ? '✏️ 일정 수정' : '📍 일정 추가'}
          </h2>
          <button onClick={onClose} className="text-2xl text-gray-400">✕</button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">Day</label>
              <input
                type="number"
                min="1"
                value={form.day}
                onChange={e => setForm(p => ({ ...p, day: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:border-pink-300"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">시간</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:border-pink-300"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-600 mb-1 block">장소 *</label>
            <input
              type="text"
              placeholder="예) 도쿄타워, 시부야 스크램블"
              value={form.place}
              onChange={e => setForm(p => ({ ...p, place: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:border-pink-300"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-600 mb-1 block">메모</label>
            <textarea
              placeholder="예) 예약 필요, 영업시간 10-18시"
              value={form.memo}
              onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
              rows={3}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:border-pink-300 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-pink w-full text-center text-lg py-4 mt-2 rounded-2xl"
          >
            {loading ? '저장 중...' : editData ? '✅ 수정하기' : '📍 추가하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
