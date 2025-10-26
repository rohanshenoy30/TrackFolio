export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const start = searchParams.get('start') // YYYY-MM-DD
  const end = searchParams.get('end')     // YYYY-MM-DD
  if (!symbol || !start || !end) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 })
  }

  const period1 = Math.floor(new Date(start).getTime() / 1000)
  const endDateObj = new Date(end)
  endDateObj.setDate(endDateObj.getDate() + 1)
  const period2 = Math.floor(endDateObj.getTime() / 1000)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`

  console.log(`[yahoo-historical] Requesting URL: ${url}`)
  try {
    const resp = await fetch(url)
    const data = await resp.json()
    // LOG THE AVAILABLE TRADING DATES
    if (data.chart?.result?.[0]?.timestamp) {
      const tss = data.chart.result[0].timestamp
      const readable = tss.map(ts => new Date(ts * 1000).toISOString().slice(0, 10))
      console.log(`[yahoo-historical] [${symbol}] Trading dates found:`, readable)
    } else {
      console.log(`[yahoo-historical] [${symbol}] No trading dates (timestamp) returned by Yahoo.`)
      // Optionally: log the whole response for debugging
      console.log(data)
    }
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (e) {
    console.error("[yahoo-historical] Fetch failed:", e)
    return new Response(JSON.stringify({ error: 'Yahoo fetch failed' }), { status: 500 })
  }
}
