import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readSheet, appendRow, updateRow, deleteRow } from '@/lib/sheets'

// GET /api/friends — 내 친구 목록 + 친구들의 공개 trips
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = session.user.email
  const rows = await readSheet('friends!A2:E')

  // 내가 추가한 친구 (status: accepted or pending)
  const friends = rows
    .filter(r => r[0] === uid)
    .map(r => ({
      friend_email: r[1],
      friend_name: r[2] || '',
      status: r[3] || 'pending',
      created_at: r[4] || '',
    }))

  // 친구들의 공개 trips 조회
  const tripRows = await readSheet('trips!A2:J')
  const friendEmails = friends.filter(f => f.status === 'accepted').map(f => f.friend_email)

  const friendTrips = tripRows
    .filter(r => friendEmails.includes(r[1]) && r[9] === 'true')
    .map(r => ({
      trip_id: r[0],
      owner_email: r[1],
      title: r[2],
      country: r[3],
      city: r[4],
      start_date: r[5],
      end_date: r[6],
      share_token: r[8],
    }))

  return NextResponse.json({ friends, friendTrips })
}

// POST /api/friends — 친구 추가 요청
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { friend_email } = await req.json()
  const uid = session.user.email

  if (friend_email === uid) return NextResponse.json({ error: '자기 자신은 추가할 수 없어요' }, { status: 400 })

  // 중복 확인
  const rows = await readSheet('friends!A2:E')
  const exists = rows.find(r => r[0] === uid && r[1] === friend_email)
  if (exists) return NextResponse.json({ error: '이미 추가된 친구예요' }, { status: 400 })

  // 상대방이 나를 이미 추가했으면 바로 accepted
  const mutual = rows.find(r => r[0] === friend_email && r[1] === uid)
  const status = mutual ? 'accepted' : 'pending'

  await appendRow('friends!A:E', [uid, friend_email, '', status, new Date().toISOString()])

  // 상호 수락 처리
  if (mutual) {
    const mutualIdx = rows.findIndex(r => r[0] === friend_email && r[1] === uid)
    const updated = [...rows[mutualIdx]]
    updated[3] = 'accepted'
    await updateRow(`friends!A${mutualIdx + 2}:E${mutualIdx + 2}`, updated)
  }

  return NextResponse.json({ success: true, status })
}

// DELETE /api/friends — 친구 삭제
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { friend_email } = await req.json()
  const uid = session.user.email

  const rows = await readSheet('friends!A2:E')
  const rowIndex = rows.findIndex(r => r[0] === uid && r[1] === friend_email)
  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteRow('friends', rowIndex)
  return NextResponse.json({ success: true })
}
