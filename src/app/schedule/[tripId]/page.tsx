diff --git a/src/app/schedule/[tripId]/page.tsx b/src/app/schedule/[tripId]/page.tsx
index d4b88dd966eca94d236c579953e30fc3c88174e1..4ece074dfc2753722b1190cffacbd6abd2dac76d 100644
--- a/src/app/schedule/[tripId]/page.tsx
+++ b/src/app/schedule/[tripId]/page.tsx
@@ -108,50 +108,53 @@ function RouteSection({ from, to, routeKey }: { from: string; to: string; routeK
             referrerPolicy="no-referrer-when-downgrade"
           />
         </div>
       )}
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
   const [mapQuery, setMapQuery] = useState('')
   const mapDebounceRef = useRef<NodeJS.Timeout | null>(null)
+  const moveHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null)
+  const moveRepeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
+  const moveInFlightRef = useRef(false)
 
   const [form, setForm] = useState({ day: '1', time: '', place: '', memo: '' })
   const [comments, setComments] = useState<Comment[]>([])
   const [newComment, setNewComment] = useState('')
   const [posting, setPosting] = useState(false)
   const [showComments, setShowComments] = useState(false)
 
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
       // 댓글 로드
       const cRes = await fetch(`/api/comments?trip_id=${tripId}`)
@@ -182,50 +185,84 @@ export default function SchedulePage() {
   async function deleteComment(comment_id: string) {
     await fetch('/api/comments', {
       method: 'DELETE',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ comment_id }),
     })
     setComments(prev => prev.filter(c => c.comment_id !== comment_id))
   }
 
   async function moveSchedule(idx: number, dir: 'up' | 'down') {
     const newList = [...daySchedules]
     const target = dir === 'up' ? idx - 1 : idx + 1
     if (target < 0 || target >= newList.length) return
     // 두 항목의 time을 교환
     const tempTime = newList[idx].time
     newList[idx] = { ...newList[idx], time: newList[target].time }
     newList[target] = { ...newList[target], time: tempTime }
     // 두 항목 모두 서버에 업데이트
     await Promise.all([
       fetch('/api/schedules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newList[idx]) }),
       fetch('/api/schedules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newList[target]) }),
     ])
     await fetchData()
   }
 
+
+
+  async function moveScheduleSafe(idx: number, dir: 'up' | 'down') {
+    if (moveInFlightRef.current) return
+    moveInFlightRef.current = true
+    try {
+      await moveSchedule(idx, dir)
+    } finally {
+      moveInFlightRef.current = false
+    }
+  }
+
+  function stopMoveHold() {
+    if (moveHoldTimeoutRef.current) {
+      clearTimeout(moveHoldTimeoutRef.current)
+      moveHoldTimeoutRef.current = null
+    }
+    if (moveRepeatIntervalRef.current) {
+      clearInterval(moveRepeatIntervalRef.current)
+      moveRepeatIntervalRef.current = null
+    }
+  }
+
+  function startMoveHold(idx: number, dir: 'up' | 'down', disabled: boolean) {
+    if (disabled) return
+    stopMoveHold()
+    moveHoldTimeoutRef.current = setTimeout(() => {
+      moveScheduleSafe(idx, dir)
+      moveRepeatIntervalRef.current = setInterval(() => {
+        moveScheduleSafe(idx, dir)
+      }, 250)
+    }, 1000)
+  }
+
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
     .sort((a, b) => {
       // 시간 없으면 맨 뒤
       if (!a.time && !b.time) return 0
       if (!a.time) return 1
       if (!b.time) return -1
       return a.time.localeCompare(b.time)
     })
 
@@ -300,50 +337,56 @@ export default function SchedulePage() {
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
 
+
+
+  useEffect(() => {
+    return () => stopMoveHold()
+  }, [])
+
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
@@ -382,53 +425,67 @@ export default function SchedulePage() {
             <p style={{ color: '#aaa', fontWeight: 600 }}>Day {selectedDay} 일정이 없어요</p>
             <p style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>아래 + 버튼으로 추가해보세요</p>
           </div>
         ) : (
           daySchedules.map((s, idx) => {
             const next = daySchedules[idx + 1]
 
             return (
               <div key={s.schedule_id}>
                 {/* 장소 카드 */}
                 <div style={{
                   background: 'white', borderRadius: 20, padding: '14px 16px',
                   boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                   display: 'flex', alignItems: 'flex-start', gap: 12,
                 }}>
                   <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 44 }}>
                     <div style={{ fontSize: 12, fontWeight: 800, color: '#FF6B9D' }}>{s.time || '--:--'}</div>
                   </div>
                   <div style={{ flex: 1, minWidth: 0 }}>
                     <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{s.place}</div>
                     {s.memo && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.memo}</div>}
                   </div>
                   <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                     {/* 순서 이동 */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
-                      <button onClick={() => moveSchedule(idx, 'up')} disabled={idx === 0}
+                      <button
+                        onClick={() => moveScheduleSafe(idx, 'up')}
+                        onMouseDown={() => startMoveHold(idx, 'up', idx === 0)}
+                        onMouseUp={stopMoveHold}
+                        onMouseLeave={stopMoveHold}
+                        onTouchStart={() => startMoveHold(idx, 'up', idx === 0)}
+                        onTouchEnd={stopMoveHold}
+                        disabled={idx === 0}
                         style={{ background: idx === 0 ? 'rgba(0,0,0,0.04)' : 'rgba(255,107,157,0.1)', border: 'none', borderRadius: 8, width: 26, height: 22, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 10, color: idx === 0 ? '#ccc' : '#FF6B9D', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
-                      <button onClick={() => moveSchedule(idx, 'down')} disabled={idx === daySchedules.length - 1}
+                      <button
+                        onClick={() => moveScheduleSafe(idx, 'down')}
+                        onMouseDown={() => startMoveHold(idx, 'down', idx === daySchedules.length - 1)}
+                        onMouseUp={stopMoveHold}
+                        onMouseLeave={stopMoveHold}
+                        onTouchStart={() => startMoveHold(idx, 'down', idx === daySchedules.length - 1)}
+                        onTouchEnd={stopMoveHold}
+                        disabled={idx === daySchedules.length - 1}
                         style={{ background: idx === daySchedules.length - 1 ? 'rgba(0,0,0,0.04)' : 'rgba(255,107,157,0.1)', border: 'none', borderRadius: 8, width: 26, height: 22, cursor: idx === daySchedules.length - 1 ? 'default' : 'pointer', fontSize: 10, color: idx === daySchedules.length - 1 ? '#ccc' : '#FF6B9D', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
                     </div>
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
