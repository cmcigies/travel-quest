import { NextRequest, NextResponse } from 'next/server'

async function geocode(place: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`
  const res = await fetch(url, { headers: { 'User-Agent': 'travel-quest-app/1.0' } })
  const data = await res.json()
  if (!data?.[0]) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination required' }, { status: 400 })
  }

  try {
    const [from, to] = await Promise.all([geocode(origin), geocode(destination)])
    if (!from || !to) return NextResponse.json({ error: 'Geocode failed' }, { status: 404 })

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    const osrmRes = await fetch(osrmUrl)
    const osrmData = await osrmRes.json()

    const route = osrmData?.routes?.[0]
    if (!route) return NextResponse.json({ error: 'No route' }, { status: 404 })

    const distanceKm = (route.distance / 1000).toFixed(1)
    const durationMin = Math.round(route.duration / 60)
    const duration = durationMin >= 60
      ? `${Math.floor(durationMin / 60)}시간 ${durationMin % 60}분`
      : `${durationMin}분`

    return NextResponse.json({
      distance: `${distanceKm} km`,
      duration,
      fromCoords: from,
      toCoords: to,
    })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
