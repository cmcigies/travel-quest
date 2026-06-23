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

  // A2:I — sort_order(I열) 포함
  const rows = await readSheet('schedules!A2:I')

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
      sort_order: row[8] !== undefined && row[8] !== '' ? Number(row[8]) : null,
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

  // 현재 day의 마지막 sort_order + 1
  const rows = await readSheet('schedules!A2:I')
  const dayRows = rows.filter(r => r[2] === uid && r[1] === trip_id && r[3] === day)
  const maxOrder = dayRows.reduce((max, r) => {
    const n = r[8] !== undefined && r[8] !== '' ? Number(r[8]) : 0
    return Math.max(max, n)
  }, 0)

  await appendRow('schedules!A:I', [
    schedule_id, trip_id, uid, day, time, place, memo || '',
    new Date().toISOString(), String(maxOrder + 1),
  ])

  return NextResponse.json({ schedule_id, trip_id, day, time, place, memo, sort_order: maxOrder + 1 })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { schedule_id, day, time, place, memo, sort_order } = body
  const uid = session.user.email!

  const rows = await readSheet('schedules!A2:I')
  const rowIndex = rows.findIndex(row => row[0] === schedule_id && row[2] === uid)

  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = rows[rowIndex]
  const newSortOrder = sort_order !== undefined ? String(sort_order) : (existing[8] || '')

  await updateRow(`schedules!A${rowIndex + 2}:I${rowIndex + 2}`, [
    schedule_id, existing[1], uid, day, time, place, memo || '',
    existing[7] || '', newSortOrder,
  ])

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { schedule_id } = await req.json()
  const uid = session.user.email!

  const rows = await readSheet('schedules!A2:I')
  const rowIndex = rows.findIndex(row => row[0] === schedule_id && row[2] === uid)

  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteRow('schedules', rowIndex)

  return NextResponse.json({ success: true })
}
