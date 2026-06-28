import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const place = searchParams.get('place')
  if (!place) return NextResponse.json({ error: 'place required' }, { status: 400 })

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'travel-quest-app/1.0' } })
    const data = await res.json()
    if (!data?.[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
