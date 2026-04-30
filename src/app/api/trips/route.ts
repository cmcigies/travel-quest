import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSheets } from '@/lib/sheets'

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json([], { status: 401 })

  try {
    const sheets = await getSheets()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'trips!A2:H',
    })
    const rows = res.data.values || []
    const trips = rows
      .filter(r => r[1] === session.user!.email)
      .map(r => ({
        trip_id: r[0],
        uid: r[1],
        title: r[2],
        country: r[3],
        city: r[4],
        start_date: r[5],
        end_date: r[6],
        created_at: r[7],
      }))
    return NextResponse.json(trips)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const trip_id = `trip_${Date.now()}`
  const created_at = new Date().toISOString()

  try {
    const sheets = await getSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'trips!A:H',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          trip_id,
          session.user.email,
          body.title || '',
          body.country || '',
          body.city || '',
          body.start_date || '',
          body.end_date || '',
          created_at,
        ]],
      },
    })
    return NextResponse.json({ trip_id })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { trip_id } = body

  if (!trip_id) return NextResponse.json({ error: 'trip_id required' }, { status: 400 })

  try {
    const sheets = await getSheets()

    // 1. trips 시트에서 해당 행 삭제
    const tripsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'trips!A2:H',
    })
    const rows = tripsRes.data.values || []
    const rowIdx = rows.findIndex(r => r[0] === trip_id && r[1] === session.user!.email)

    if (rowIdx === -1) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

    // 행 삭제 (빈 값으로 덮어쓰기 방식 — batchUpdate로 deleteRows)
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
    const tripsSheet = sheetMeta.data.sheets?.find(s => s.properties?.title === 'trips')
    const sheetId = tripsSheet?.properties?.sheetId ?? 0

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIdx + 1, // +1 for header row
              endIndex: rowIdx + 2,
            },
          },
        }],
      },
    })

    // 2. schedules 시트에서 해당 trip_id 행들도 삭제
    const schRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'schedules!A2:H',
    })
    const schRows = schRes.data.values || []
    const schSheet = sheetMeta.data.sheets?.find(s => s.properties?.title === 'schedules')
    const schSheetId = schSheet?.properties?.sheetId ?? 1

    // 삭제할 행 인덱스 (역순으로 삭제해야 인덱스 밀림 방지)
    const toDelete = schRows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r[1] === trip_id)
      .map(({ i }) => i)
      .reverse()

    for (const idx of toDelete) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: schSheetId,
                dimension: 'ROWS',
                startIndex: idx + 1,
                endIndex: idx + 2,
              },
            },
          }],
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE trip error:', e)
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}
