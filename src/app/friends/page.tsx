'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Friend {
  friend_email: string
  friend_name: string
  status: string
}
interface FriendTrip {
  trip_id: string
  owner_email: string
  title: string
  country: string
  city: string
  start_date: string
  end_date: string
  share_token: string
}

export default function FriendsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [friends, setFriends] = useState<Friend[]>([])
  const [friendTrips, setFriendTrips] = useState<FriendTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [addMsg, setAddMsg] = useState('')
  const [tab, setTab] = useState<'friends' | 'trips'>('friends')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated') fetchData()
  }, [status])

  async function fetchData() {
    try {
      const res = await fetch('/api/friends')
      const data = await res.json()
      setFriends(data.friends || [])
      setFriendTrips(data.friendTrips || [])
    } finally {
      setLoading(false)
    }
  }

  async function addFriend() {
    if (!emailInput.trim()) return
    setAdding(true)
    setAddMsg('')
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_email: emailInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setAddMsg(data.error || '오류가 발생했어요'); return }
      setAddMsg(data.status === 'accepted' ? '✅ 친구가 됐어요!' : '📨 친구 요청을 보냈어요!')
      setEmailInput('')
      fetchData()
    } finally {
      setAdding(false)
    }
  }

  async function deleteFriend(email: string) {
    await fetch('/api/friends', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friend_email: email }),
    })
    fetchData()
  }

  if (status === 'loading' || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9ff' }}>
      <div style={{ fontSize: 48 }}>✈️</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff' }}>
      {/* Header */}
      <div style={{ background: 'white', boxShadow: '0 1px 12px rgba(0,0,0,0.08)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/map')} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#1a1a2e' }}>👫 친구</h1>
        </div>
      </div>

      {/* 친구 추가 */}
      <div style={{ padding: 16 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#666', marginBottom: 10 }}>📧 구글 이메일로 친구 추가</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              placeholder="friend@gmail.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFriend()}
              style={{ flex: 1, padding: '10px 14px', border: '2px solid #f0f0f0', borderRadius: 14, fontSize: 13, outline: 'none' }}
            />
            <button onClick={addFriend} disabled={adding || !emailInput.trim()}
              style={{ padding: '10px 16px', background: adding ? '#ccc' : 'linear-gradient(135deg, #FF6B9D, #FF5BAE)', border: 'none', borderRadius: 14, color: 'white', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              {adding ? '...' : '추가'}
            </button>
          </div>
          {addMsg && <p style={{ fontSize: 12, color: addMsg.startsWith('✅') || addMsg.startsWith('📨') ? '#4CAF50' : '#FF3B30', marginTop: 8, fontWeight: 600 }}>{addMsg}</p>}
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['friends', 'trips'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: tab === t ? 'linear-gradient(135deg, #FF6B9D, #FF5BAE)' : '#f0f0f4',
              color: tab === t ? 'white' : '#666',
            }}>
              {t === 'friends' ? `👥 친구 (${friends.length})` : `🗺️ 친구 여행 (${friendTrips.length})`}
            </button>
          ))}
        </div>

        {/* 친구 목록 */}
        {tab === 'friends' && (
          friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👫</div>
              <p style={{ color: '#aaa', fontWeight: 600 }}>아직 친구가 없어요</p>
              <p style={{ color: '#ccc', fontSize: 13 }}>이메일로 친구를 추가해보세요!</p>
            </div>
          ) : friends.map(f => (
            <div key={f.friend_email} style={{ background: 'white', borderRadius: 18, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B9D, #FF5BAE)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 16 }}>
                {f.friend_email[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.friend_email}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  <span style={{ background: f.status === 'accepted' ? 'rgba(76,175,80,0.1)' : 'rgba(255,152,0,0.1)', color: f.status === 'accepted' ? '#4CAF50' : '#FF9800', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
                    {f.status === 'accepted' ? '✓ 친구' : '⏳ 대기중'}
                  </span>
                </div>
              </div>
              <button onClick={() => deleteFriend(f.friend_email)}
                style={{ background: 'rgba(255,59,48,0.08)', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontSize: 13, color: '#FF3B30', fontWeight: 700 }}>
                삭제
              </button>
            </div>
          ))
        )}

        {/* 친구 여행 목록 */}
        {tab === 'trips' && (
          friendTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
              <p style={{ color: '#aaa', fontWeight: 600 }}>공개된 친구 여행이 없어요</p>
              <p style={{ color: '#ccc', fontSize: 13 }}>친구가 여행을 공유하면 여기에 나타나요</p>
            </div>
          ) : friendTrips.map(t => (
            <div key={t.trip_id}
              onClick={() => router.push(`/share/${t.share_token}`)}
              style={{ background: 'white', borderRadius: 18, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #87CEEB, #4FC3F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✈️</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{t.country} · {t.city}</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{t.start_date} ~ {t.end_date}</div>
              </div>
              <div style={{ fontSize: 12, color: '#ccc' }}>›</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
