import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readSheet, appendRow, deleteRow } from '@/lib/sheets'

// GET /api/comments?trip_id=xxx — 댓글 목록 (로그인 불필요, 공개 trip)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const trip_id = searchParams.get('trip_id')
  if (!trip_id) return NextResponse.json({ error: 'trip_id required' }, { status: 400 })

  const rows = await readSheet('comments!A2:G')
  const comments = rows
    .filter(r => r[1] === trip_id)
    .map(r => ({
      comment_id: r[0],
      trip_id: r[1],
      uid: r[2],
      name: r[3] || '익명',
      avatar: r[4] || '',
      text: r[5],
      created_at: r[6],
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  return NextResponse.json(comments)
}

// POST /api/comments — 댓글 작성 (로그인 필요)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trip_id, text } = await req.json()
  if (!trip_id || !text?.trim()) return NextResponse.json({ error: 'trip_id and text required' }, { status: 400 })

  const comment_id = Date.now().toString(36) + Math.random().toString(36).substr(2)
  const uid = session.user.email
  const name = session.user.name || uid
  const avatar = session.user.image || ''

  await appendRow('comments!A:G', [
    comment_id, trip_id, uid, name, avatar, text.trim(), new Date().toISOString()
  ])

  return NextResponse.json({ comment_id, uid, name, avatar, text, created_at: new Date().toISOString() })
}

// DELETE /api/comments — 내 댓글 삭제
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { comment_id } = await req.json()
  const uid = session.user.email

  const rows = await readSheet('comments!A2:G')
  const rowIndex = rows.findIndex(r => r[0] === comment_id && r[2] === uid)
  if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteRow('comments', rowIndex)
  return NextResponse.json({ success: true })
}
