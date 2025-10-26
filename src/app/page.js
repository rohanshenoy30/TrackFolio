'use client'

import React, { useState, useEffect } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Pie, Line } from 'react-chartjs-2'
import { Chart, ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js'
Chart.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement)

export default function LoginPage() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [portfolios, setPortfolios] = useState([
    { id: 1, name: 'My First Portfolio', stocks: [] }
  ])
  const [activePortfolioId, setActivePortfolioId] = useState(1)
  const [tickerQuery, setTickerQuery] = useState('')
  const [tickerSuggestions, setTickerSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [buy, setBuy] = useState('')
  const [sell, setSell] = useState('')
  const [qty, setQty] = useState('')
  const [calcResult, setCalcResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // --- For Line Chart
  const [historicData, setHistoricData] = useState({}) // {ticker: {labels: [], values: []}}
  const [portfolioHistory, setPortfolioHistory] = useState({labels: [], values: []})

  const onSuccess = async (credentialResponse) => {
    if (credentialResponse.credential) {
      const mod = await import('jwt-decode')
      const jwtDecode = mod.jwtDecode || mod.default
      if (!jwtDecode || typeof jwtDecode !== 'function') {
        throw new Error('jwt-decode decode function not found in module')
      }
      const decoded = jwtDecode(credentialResponse.credential)
      setUser(decoded)
      await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: decoded.email, name: decoded.name })
      })
    }
  }
  const onError = () => alert('Login Failed')

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 1) { setTickerSuggestions([]); return }
    try {
      const url = `/api/yahoo-search?query=${encodeURIComponent(query)}`
      const res = await fetch(url)
      const data = await res.json()
      setTickerSuggestions(
        (data.quotes || []).map(q => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.name || q.symbol
        }))
      )
    } catch (e) {
      setTickerSuggestions([])
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => { fetchSuggestions(tickerQuery); }, 300)
    return () => clearTimeout(handler)
  }, [tickerQuery])

  const handleCreatePortfolio = () => {
    const name = prompt("Enter portfolio name:")
    if (!name) return
    const id = portfolios.length ? Math.max(...portfolios.map(p=>p.id)) + 1 : 1
    setPortfolios([...portfolios, { id, name, stocks: [] }])
    setActivePortfolioId(id)
    setSidebarOpen(false)
  }

  function normalizeDate(input) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
    const m = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2]}-${m[1]}`
    return input
  }

  const handleCalculate = async () => {
    if (!tickerQuery || !buy || !sell || !qty) {
      setCalcResult('Fill all fields!')
      return
    }
    setIsLoading(true)
    setCalcResult('Fetching price data from Yahoo...')
    const buyNorm = normalizeDate(buy)
    const sellNorm = normalizeDate(sell)
    try {
      const url = `/api/yahoo-historical?symbol=${encodeURIComponent(tickerQuery)}&start=${buyNorm}&end=${sellNorm}`
      const res = await fetch(url)
      const data = await res.json()
      const results = data.chart?.result?.[0]
      if (!results) throw new Error('No price data found')
      const prices = results.indicators?.quote?.[0]?.close
      const timestamps = results.timestamp

      function findClosestDateIdx(dateStr) {
        const targetTime = new Date(dateStr).getTime()
        let idx = -1, minDiff = Infinity
        timestamps.forEach((ts, i) => {
          const curTime = ts * 1000
          if (curTime <= targetTime && targetTime - curTime < minDiff) {
            minDiff = targetTime - curTime
            idx = i
          }
        })
        return idx
      }

      const buyIdx = findClosestDateIdx(buyNorm)
      const sellIdx = findClosestDateIdx(sellNorm)
      if (buyIdx === -1 || sellIdx === -1) {
        setCalcResult('No close data for given date(s)!')
        setIsLoading(false)
        return
      }
      const buyPrice = prices[buyIdx]
      const sellPrice = prices[sellIdx]
      const actualBuyDate = new Date(timestamps[buyIdx]*1000).toISOString().slice(0,10)
      const actualSellDate = new Date(timestamps[sellIdx]*1000).toISOString().slice(0,10)
      const profitLoss = ((sellPrice - buyPrice) * qty).toFixed(2)
      setCalcResult(`Bought @₹${buyPrice} on ${actualBuyDate}, Sold @₹${sellPrice} on ${actualSellDate}, P/L = ₹${profitLoss}`)
      setPortfolios(portfolios.map(p =>
        p.id === activePortfolioId
          ? { ...p, stocks: [
              ...p.stocks, 
              { 
                ticker: tickerQuery.toUpperCase(),
                buy: actualBuyDate,
                sell: actualSellDate,
                qty: +qty,
                buyPrice,
                sellPrice,
                pl: +profitLoss
              }
            ]}
          : p
      ))
      setTickerQuery(''); setBuy(''); setSell(''); setQty('')
    } catch (err) {
      setCalcResult('Error or no price data from Yahoo.')
    }
    setIsLoading(false)
  }

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || { stocks: [] }
  const totalPL = activePortfolio.stocks.reduce((a, s) => a + s.pl, 0)

  const chartData = {
    labels: activePortfolio.stocks.map(s => s.ticker),
    datasets: [{
      data: activePortfolio.stocks.map(s => s.pl),
      backgroundColor: [
        '#61fd86', '#32ffc8', '#00b876', '#2196f3', '#fcff32', '#ff6f00', '#ff1744', '#651fff'
      ],
      borderWidth: 2,
      borderColor: '#0a0a0a'
    }]
  }

  // ----------- LINE CHART LOGIC BEGIN -----------
  // Fetch all price histories for all stocks in portfolio, get all unique dates, and combine holdings

  useEffect(() => {
    // Only triggers on portfolio change
    async function fetchPortfolioHistory() {
      if (!activePortfolio.stocks.length) {
        setHistoricData({})
        setPortfolioHistory({labels: [], values: []})
        return
      }
      const allData = {}
      let allDates = new Set()
      // For each stock, fetch historical range between its buy and sell
      for (const stock of activePortfolio.stocks) {
        const url = `/api/yahoo-historical?symbol=${stock.ticker}&start=${stock.buy}&end=${stock.sell}`
        try {
          const res = await fetch(url)
          const data = await res.json()
          const results = data.chart?.result?.[0]
          if (!results) continue
          const closes = results.indicators?.quote?.[0]?.close
          const times = results.timestamp
          // X: ISO date, Y: close * qty of this stock holding
          const stockLabels = times.map(ts => new Date(ts*1000).toISOString().slice(0,10))
          allDates = new Set([...allDates, ...stockLabels])
          allData[stock.ticker] = {
            labels: stockLabels,
            values: closes.map((price) => +(price * stock.qty).toFixed(2))
          }
        } catch {}
      }
      // Build the union of all dates
      const sortedDates = Array.from(allDates).sort()
      // For each day: sum up the value of all holdings
      const portfolioVals = sortedDates.map(date => {
        let val = 0
        for (const stock of activePortfolio.stocks) {
          const hist = allData[stock.ticker]
          if (!hist) continue
          // Find value on this day if present
          const idx = hist.labels.indexOf(date)
          if (idx !== -1) val += hist.values[idx]
        }
        return +val.toFixed(2)
      })
      setHistoricData(allData)
      setPortfolioHistory({labels: sortedDates, values: portfolioVals})
    }
    fetchPortfolioHistory()
    // eslint-disable-next-line
  }, [activePortfolio.stocks])

  const lineChartData = {
    labels: portfolioHistory.labels,
    datasets: [
      ...Object.entries(historicData).map(([ticker, hist], i) => ({
        label: `Stock: ${ticker}`,
        data: hist.values,
        fill: false,
        borderColor: ['#00b876', '#2196f3', '#fcff32', '#ff6f00', '#ff1744', '#651fff', '#32ffc8'][i % 7],
        pointRadius: 0,
        tension: 0.12,
      })),
      {
        label: 'Total Portfolio Value',
        data: portfolioHistory.values,
        fill: false,
        borderColor: '#4caf50',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.1,
      }
    ]
  }
  // ----------- LINE CHART LOGIC END -----------

  return (
    <main
      style={{
        height: '100vh',
        background: 'linear-gradient(180deg, #111, #00210f 95%)',
        color: '#a8d5ba',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        overflow: 'hidden',
        position: 'relative'
      }}>
      {!user ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #0f5132, #003d1a)',
            padding: '3rem 4rem',
            borderRadius: '15px',
            boxShadow: '0 8px 25px rgba(0, 64, 21, 0.6)',
            textAlign: 'center',
            position: 'absolute',
            left: '50%',
            top: '38%',
            transform: 'translate(-50%, -50%)'
          }}>
          <h1 style={{ color: '#4caf50', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            Welcome to Trackfolio
          </h1>
          <p style={{ color: '#c8facc', fontSize: '1.15rem', marginBottom: '2rem' }}>
            Track your portfolio like a pro.
          </p>
          <GoogleLogin onSuccess={onSuccess} onError={onError} />
        </div>
      ) : (
        <div style={{ display: 'flex', height: '100vh' }}>
          {/* Sidebar and Hamburger (unchanged) */}
          <div>
            <div
              style={{
                position: 'absolute',
                top: '25px',
                left: '30px',
                zIndex: 100,
                cursor: 'pointer'
              }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              tabIndex={0}
              aria-label="Open sidebar"
            >
              <div style={{ width: 35, height: 5, background: '#4caf50', borderRadius: 2, marginBottom: 6 }}/>
              <div style={{ width: 25, height: 5, background: '#4caf50', borderRadius: 2, marginBottom: 6 }}/>
              <div style={{ width: 20, height: 5, background: '#4caf50', borderRadius: 2 }}/>
            </div>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: sidebarOpen ? 0 : -260,
                height: '100vh',
                width: 240,
                background: '#081510',
                boxShadow: sidebarOpen ? '4px 0 18px #111c' : 'none',
                zIndex: 99,
                padding: '1.5rem 1rem',
                transition: 'left 0.2s',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ marginTop: 54 }}>
                <div style={{marginBottom: '1.7rem', fontWeight: 600, color: '#7cf29b', fontSize: '1.2rem', letterSpacing: '1.3px'}}>PORTFOLIOS</div>
                <button
                  onClick={handleCreatePortfolio}
                  style={{
                    padding: '9px 0',
                    marginBottom: '1.5rem',
                    border: 'none',
                    background: '#4caf50',
                    color: '#00210f',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >+ Create Portfolio</button>
                <div style={{flex: 1, overflowY: 'auto'}}>
                  {portfolios.map((p) => (
                    <div key={p.id}
                      onClick={() => {
                        setActivePortfolioId(p.id)
                        setSidebarOpen(false)
                      }}
                      style={{
                        padding: '11px 16px',
                        marginBottom: 8,
                        background: p.id === activePortfolioId ? '#c8facc22' : 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: p.id === activePortfolioId ? '#4caf50' : '#c8facc',
                        fontWeight: p.id === activePortfolioId ? 600 : 400,
                        borderLeft: p.id === activePortfolioId ? '4px solid #4caf50' : '4px solid transparent',
                      }}>
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Main Dashboard Panel */}
          <div style={{
            flex: 1,
            marginLeft: sidebarOpen ? 240 : 0,
            transition: 'margin-left 0.2s',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            overflow: 'auto'
          }}>
            {/* Profile pic and logout */}
            <div style={{
              position: 'absolute',
              top: '1.5rem',
              right: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div
                style={{
                  width: 50, height: 50, borderRadius: '50%',
                  border: '2px solid #4caf50',
                  backgroundImage: `url(${user.picture})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                title="Profile"
              />
              <button
                onClick={() => setUser(null)}
                style={{
                  backgroundColor: '#4caf50',
                  border: 'none',
                  color: 'black',
                  borderRadius: '20px',
                  padding: '8px 18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Logout
              </button>
            </div>
            {/* Dashboard content */}
            <div style={{marginTop: '4.8rem', padding: '2.2rem 3rem', width: '100%', flex: 1}}>
              <h1 style={{ color: '#4caf50', fontSize: '2.4rem', marginBottom: '0.4rem' }}>
                {activePortfolio ? activePortfolio.name : 'Portfolio Dashboard'}
              </h1>
              <p style={{ opacity: 0.8 }}>Hello, {user.name.split(' ')[0]} — manage your stocks and simulate trades!</p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1.5fr',
                gap: '2rem',
                marginTop: '2rem',
                alignItems: 'start'
              }}>
                {/* Stock and Calculator Section */}
                <div>
                  <div style={{
                    backgroundColor: '#10291b',
                    padding: '1.4rem',
                    borderRadius: '10px',
                    border: '1px solid #205f38',
                    marginBottom: '2rem'
                  }}>
                    <h2 style={{ color: '#7cf29b' }}>Add Stock Result</h2>
                    <div style={{display: 'flex', gap: 12, alignItems:'flex-start'}}>
                      {/* Ticker Autocomplete */}
                      <div style={{position: 'relative'}}>
                        <input
                          type="text"
                          placeholder="Ticker (Type company name)"
                          value={tickerQuery}
                          onChange={e => { setTickerQuery(e.target.value); setShowSuggestions(true); }}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(()=>setShowSuggestions(false),150)}
                          style={{
                            width: 170,
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid #4caf50',
                            backgroundColor: '#0c1a0f',
                            color: '#c8facc',
                            outline: 'none',
                            fontSize: '1.08rem'
                          }}
                        />
                        {showSuggestions && tickerSuggestions.length > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              zIndex: 10,
                              top: 42,
                              left: 0,
                              right: 0,
                              background: '#1a2b1f',
                              borderRadius: 6,
                              boxShadow: '0 2px 12px #0009',
                              maxHeight: 180,
                              overflowY: 'auto'
                            }}>
                            {tickerSuggestions.map(sug => (
                              <div
                                key={sug.symbol}
                                onMouseDown={() => {
                                  setTickerQuery(sug.symbol)
                                  setShowSuggestions(false)
                                }}
                                style={{
                                  padding: '8px 12px',
                                  color: '#4caf50',
                                  cursor: 'pointer'
                                }}
                              >
                                <span style={{fontWeight: 600}}>{sug.symbol}</span>
                                {" "}
                                <span style={{fontSize: '0.97em', color: '#a8d5ba'}}>{sug.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Buy, Sell (dates), Quantity, Add */}
                      <input type="text" placeholder="Buy (YYYY-MM-DD)" value={buy}
                        onChange={e => setBuy(e.target.value)}
                        style={{
                          width: 180, padding: '10px', borderRadius: '6px',
                          border: '1px solid #4caf50',
                          backgroundColor: '#0c1a0f', color: '#c8facc', outline: 'none', fontSize: '1.08rem'
                        }}/>
                      <input type="text" placeholder="Sell (YYYY-MM-DD)" value={sell}
                        onChange={e => setSell(e.target.value)}
                        style={{
                          width: 180, padding: '10px', borderRadius: '6px',
                          border: '1px solid #4caf50',
                          backgroundColor: '#0c1a0f', color: '#c8facc', outline: 'none', fontSize: '1.08rem'
                        }}/>
                      <input type="number" placeholder="Qty" value={qty}
                        onChange={e => setQty(e.target.value)}
                        style={{
                          width: 70, padding: '10px', borderRadius: '6px',
                          border: '1px solid #4caf50',
                          backgroundColor: '#0c1a0f', color: '#c8facc', outline: 'none', fontSize: '1.08rem'
                        }}/>
                      <button onClick={handleCalculate} disabled={isLoading} style={{
                        padding: '10px 14px', backgroundColor: '#4caf50',
                        color: 'black', borderRadius: '6px', border: 'none',
                        fontWeight: 700, fontSize: '1.08rem', cursor: 'pointer'
                      }}>{isLoading ? "Loading..." : "Add"}</button>
                    </div>
                    <div style={{
                      marginTop: '1.2rem',
                      padding: '0.65rem',
                      borderRadius: '6px',
                      backgroundColor: '#06110a',
                      border: '1px dashed #4caf50',
                      minHeight: 30,
                      color: '#d9fdd3',
                      fontSize: '1.12rem'
                    }}>
                      {calcResult && (<span>{calcResult}</span>)}
                    </div>
                  </div>
                  {/* Holdings Table */}
                  <div style={{
                    backgroundColor: '#10291b',
                    padding: '1rem',
                    borderRadius: '10px',
                    border: '1px solid #205f38',
                  }}>
                    <div style={{fontWeight: 600, color: '#7cf29b', fontSize: '1.12rem', marginBottom: 6}}>Portfolio Holdings</div>
                    <table style={{width: '100%', color: 'inherit', fontSize: '1rem', borderSpacing: 0}}>
                      <thead>
                        <tr style={{color: '#86fac1', textAlign: 'left', fontWeight: 500}}>
                          <th>Ticker</th>
                          <th>Qty</th>
                          <th>Buy Date</th>
                          <th>Sell Date</th>
                          <th>Buy Price</th>
                          <th>Sell Price</th>
                          <th>P/L (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activePortfolio.stocks.map((s, i) =>
                          <tr key={s.ticker + i}>
                            <td>{s.ticker}</td>
                            <td>{s.qty}</td>
                            <td>{s.buy}</td>
                            <td>{s.sell}</td>
                            <td>{s.buyPrice?.toFixed(2)}</td>
                            <td>{s.sellPrice?.toFixed(2)}</td>
                            <td style={{color: s.pl>=0 ? '#61fd86' : '#ff1744'}}>{s.pl}</td>
                          </tr>
                        )}
                        <tr style={{fontWeight: 600, color: '#4caf50'}}>
                          <td>Total</td>
                          <td>{activePortfolio.stocks.reduce((a,s)=>a+s.qty,0)}</td>
                          <td colSpan={4}></td>
                          <td>{totalPL}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Pie & Line Chart column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  {/* PIE CHART */}
                  <div style={{
                    backgroundColor: '#10291b',
                    padding: '1.5rem',
                    borderRadius: '10px',
                    border: '1px solid #205f38',
                    minHeight: 350,
                  }}>
                    <div style={{
                      color: '#7cf29b',
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      marginBottom: 18,
                      textAlign: 'center'
                    }}>
                      Portfolio Breakdown (P/L%)
                    </div>
                    <Pie data={chartData} />
                  </div>
                  {/* LINE CHART */}
                  <div style={{
                    backgroundColor: '#10291b',
                    padding: '1.2rem 1.2rem 1.5rem 1.2rem',
                    borderRadius: '10px',
                    border: '1px solid #205f38',
                    minHeight: 350,
                  }}>
                    <div style={{
                      color: '#7cf29b',
                      fontSize: '1.15rem',
                      fontWeight: 600,
                      marginBottom: 8,
                      textAlign: 'center'
                    }}>
                      Portfolio Value Over Time
                    </div>
                    <Line
                      data={lineChartData}
                      options={{
                        interaction: { mode: 'index', intersect: false },
                        plugins: { legend: { display: true } },
                        scales: {
                          x: { ticks: { color: "#c8facc", maxTicksLimit: 10 } },
                          y: { ticks: { color: "#c8facc" }, beginAtZero: true }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <footer
              style={{
                textAlign: 'center',
                marginTop: '2.5rem',
                opacity: 0.5,
                color: '#a8d5ba',
                marginBottom: '1rem'
              }}
            >
              © 2025 Trackfolio | Real-time portfolio intelligence
            </footer>
          </div>
        </div>
      )}
    </main>
  )
}
