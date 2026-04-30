import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readSheet, appendRow, updateRow, deleteRow } from '@/lib/sheets'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const trip_id = searchParams.get('trip_id')
  const uid = session.user.email!

  // A2:H — 헤더 제외하고 읽기
  const rows = await readSheet('schedules!A2:H')

  const schedules = rows
    .filter(row => row[2] === uid && (!trip_id || row[1] === trip_id))
    .map(row => ({
      schedule_id: row[0],
      trip_id: row[1],
      uid: row[2],
      day: row[3],
      time: row[4],
      place: row[5],
      memo: row[6] || '',
      created_at: row[7] || '',
    }))

  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { trip_id, day, time, place, memo } = body
  const uid = session.user.email!
  const schedule_id = generateId()

  await appendRow('schedules!A:H', [
    schedule_id, trip_id, uid, day, time, place, memo || '',
    new Date().toISOString(),
  ])

  return NextResponse.json({ schedule_id, trip_id, day, time, place, memo })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { schedule_id, day, time, place, memo } = body
  const uid = session.user.email!

  // A2:H — 헤더 제외
  const rows = await readSheet('schedules!A2:H')
  const rowIndex = rows.findIndex(row => row[0] === schedule_id && row[2] === uid)

  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = rows[rowIndex]
  // rowIndex는 0-based, 시트에서는 헤더(1행) + rowIndex+1 = rowIndex+2행
  await updateRow(`schedules!A${rowIndex + 2}:H${rowIndex + 2}`, [
    schedule_id, existing[1], uid, day, time, place, memo || '', existing[7] || '',
  ])

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { schedule_id } = await req.json()
  const uid = session.user.email!

  // A2:H — 헤더 제외
  const rows = await readSheet('schedules!A2:H')
  const rowIndex = rows.findIndex(row => row[0] === schedule_id && row[2] === uid)

  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // deleteRow는 sheetName + rowIndex(0-based, 헤더 제외 기준) 받음
  // sheets.ts의 deleteRow: startIndex = rowIndex + 1 (헤더 보정)
  await deleteRow('schedules', rowIndex)

  return NextResponse.json({ success: true })
}
