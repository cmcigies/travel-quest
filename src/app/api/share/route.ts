import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readSheet, updateRow } from '@/lib/sheets'

function generateToken() {
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36)
}

// GET /api/share?token=xxx — 공유 링크로 trip 조회 (로그인 불필요)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const rows = await readSheet('trips!A2:J')
  const row = rows.find(r => r[8] === token)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const trip = {
    trip_id: row[0],
    uid: row[1],
    title: row[2],
    country: row[3],
    city: row[4],
    start_date: row[5],
    end_date: row[6],
    share_token: row[8],
    is_public: row[9] === 'true',
  }

  // schedules도 함께 반환
  const schRows = await readSheet('schedules!A2:H')
  const schedules = schRows
    .filter(r => r[1] === row[0])
    .map(r => ({
      schedule_id: r[0],
      trip_id: r[1],
      day: r[3],
      time: r[4],
      place: r[5],
      memo: r[6] || '',
    }))

  return NextResponse.json({ trip, schedules })
}

// POST /api/share — 공유 토큰 생성 (로그인 필요)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trip_id } = await req.json()
  const rows = await readSheet('trips!A2:J')
  const rowIndex = rows.findIndex(r => r[0] === trip_id && r[1] === session.user!.email)
  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = rows[rowIndex]
  const token = existing[8] || generateToken()

  // trips 시트에 share_token(I열), is_public(J열) 업데이트
  const updated = [...existing]
  while (updated.length < 10) updated.push('')
  updated[8] = token
  updated[9] = 'true'

  await updateRow(`trips!A${rowIndex + 2}:J${rowIndex + 2}`, updated)

  return NextResponse.json({ token, share_url: `/share/${token}` })
}

// DELETE /api/share — 공유 비활성화
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trip_id } = await req.json()
  const rows = await readSheet('trips!A2:J')
  const rowIndex = rows.findIndex(r => r[0] === trip_id && r[1] === session.user!.email)
  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = [...rows[rowIndex]]
  while (updated.length < 10) updated.push('')
  updated[9] = 'false'

  await updateRow(`trips!A${rowIndex + 2}:J${rowIndex + 2}`, updated)
  return NextResponse.json({ success: true })
}
