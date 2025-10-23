// src/app/api/yahoo-search/route.js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');
  if (!query) {
    return new Response(JSON.stringify({ error: 'No query provided' }), { status: 400 });
  }
  const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(yahooUrl);
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Yahoo fetch failed' }), { status: 500 });
  }
}
