import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readSheet, appendRow, deleteRow } from '@/lib/sheets'

// GET /api/permissions?trip_id=xxx — 이 trip에 접근 가능한 친구 목록
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const trip_id = searchParams.get('trip_id')
  if (!trip_id) return NextResponse.json({ error: 'trip_id required' }, { status: 400 })

  const rows = await readSheet('trip_permissions!A2:C')
  const allowed = rows
    .filter(r => r[0] === trip_id)
    .map(r => ({ trip_id: r[0], friend_email: r[1], created_at: r[2] }))

  return NextResponse.json(allowed)
}

// POST /api/permissions — 친구에게 trip 접근 권한 부여
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trip_id, friend_email } = await req.json()
  if (!trip_id || !friend_email) return NextResponse.json({ error: 'trip_id and friend_email required' }, { status: 400 })

  // 소유자 확인
  const trips = await readSheet('trips!A2:J')
  const trip = trips.find(r => r[0] === trip_id && r[1] === session.user!.email)
  if (!trip) return NextResponse.json({ error: 'Trip not found or not yours' }, { status: 404 })

  // 중복 확인
  const rows = await readSheet('trip_permissions!A2:C')
  const exists = rows.find(r => r[0] === trip_id && r[1] === friend_email)
  if (exists) return NextResponse.json({ success: true, message: 'already exists' })

  await appendRow('trip_permissions!A:C', [trip_id, friend_email, new Date().toISOString()])
  return NextResponse.json({ success: true })
}

// DELETE /api/permissions — 친구 접근 권한 제거
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trip_id, friend_email } = await req.json()

  // 소유자 확인
  const trips = await readSheet('trips!A2:J')
  const trip = trips.find(r => r[0] === trip_id && r[1] === session.user!.email)
  if (!trip) return NextResponse.json({ error: 'Trip not found or not yours' }, { status: 404 })

  const rows = await readSheet('trip_permissions!A2:C')
  const rowIndex = rows.findIndex(r => r[0] === trip_id && r[1] === friend_email)
  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteRow('trip_permissions', rowIndex)
  return NextResponse.json({ success: true })
}
