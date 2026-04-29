import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { readSheet, appendRow, deleteRow } from '@/lib/sheets'
import { v4 as uuidv4 } from 'crypto'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await readSheet('trips!A:H')
  const uid = (session.user as any).id || session.user.email
  const trips = rows.slice(1).filter(row => row[1] === uid).map(row => ({
    trip_id: row[0],
    uid: row[1],
    title: row[2],
    country: row[3],
    city: row[4],
    start_date: row[5],
    end_date: row[6],
    created_at: row[7],
  }))

  return NextResponse.json(trips)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, country, city, start_date, end_date } = body
  const uid = (session.user as any).id || session.user.email
  const trip_id = generateId()

  await appendRow('trips!A:H', [
    trip_id, uid, title, country, city, start_date, end_date,
    new Date().toISOString(),
  ])

  return NextResponse.json({ trip_id, title, country, city, start_date, end_date })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trip_id } = await req.json()
  const uid = (session.user as any).id || session.user.email
  const rows = await readSheet('trips!A:H')

  const rowIndex = rows.findIndex(row => row[0] === trip_id && row[1] === uid)
  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteRow('trips', rowIndex)
  return NextResponse.json({ success: true })
}
