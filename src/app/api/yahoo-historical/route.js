export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const start = searchParams.get('start') // YYYY-MM-DD
  const end = searchParams.get('end')     // YYYY-MM-DD
  if (!symbol || !start || !end) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 })
  }
  const period1 = Math.floor(new Date(start).getTime() / 1000)
  // Add 1 day to end so Yahoo includes that day too
  const endDateObj = new Date(end)
  endDateObj.setDate(endDateObj.getDate() + 1)
  const period2 = Math.floor(endDateObj.getTime() / 1000)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`
  try {
    const resp = await fetch(url)
    const data = await resp.json()
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Yahoo fetch failed' }), { status: 500 })
  }
}
