'use client'

import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Pie } from 'react-chartjs-2'
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
Chart.register(ArcElement, Tooltip, Legend)

export default function LoginPage() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [portfolios, setPortfolios] = useState([
    { id: 1, name: 'My First Portfolio', stocks: [] }
  ])
  const [activePortfolioId, setActivePortfolioId] = useState(1)

  // Form state
  const [ticker, setTicker] = useState('')
  const [buy, setBuy] = useState('')
  const [sell, setSell] = useState('')
  const [qty, setQty] = useState('')
  const [calcResult, setCalcResult] = useState(null)

  const onSuccess = async (credentialResponse) => {
    if (credentialResponse.credential) {
      const mod = await import('jwt-decode')
      const jwtDecode = mod.jwtDecode || mod.default
      if (!jwtDecode || typeof jwtDecode !== 'function') {
        throw new Error('jwt-decode decode function not found in module')
      }
      const decoded = jwtDecode(credentialResponse.credential)
      setUser(decoded)
    }
  }

  const onError = () => alert('Login Failed')

  const handleCreatePortfolio = () => {
    const name = prompt("Enter portfolio name:")
    if (!name) return
    const id = portfolios.length ? Math.max(...portfolios.map(p=>p.id)) + 1 : 1
    setPortfolios([...portfolios, { id, name, stocks: [] }])
    setActivePortfolioId(id)
    setSidebarOpen(false)
  }

  // Add stock to current portfolio 
  const handleCalculate = () => {
    if (!ticker || !buy || !sell || !qty) return setCalcResult('Fill all fields!')
    const profitLoss = ((sell - buy) * qty)
    setCalcResult(`Return: ₹${profitLoss.toLocaleString()} (${profitLoss >= 0 ? 'Profit' : 'Loss'})`)
    setPortfolios(portfolios.map(p =>
      p.id === activePortfolioId
        ? { ...p, stocks: [...p.stocks, { ticker: ticker.toUpperCase(), buy: +buy, sell: +sell, qty: +qty, pl: profitLoss }] }
        : p))
    // optionally clear form:
    setTicker(''); setBuy(''); setSell(''); setQty('')
  }

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || { stocks: [] }
  const totalPL = activePortfolio.stocks.reduce((a, s) => a + s.pl, 0)

  // Chart data
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
          {/* -------------- SIDEBAR --------------- */}
          <div>
            {/* Hamburger (menu lines) */}
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
            {/* Sidebar itself */}
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
          {/* -------------- MAIN DASHBOARD PANEL --------------- */}
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
                    <div style={{display: 'flex', gap: 12}}>
                      <input
                        type="text"
                        placeholder="Ticker (e.g. TCS)"
                        value={ticker}
                        onChange={e => setTicker(e.target.value)}
                        style={{
                          width: 110,
                          padding: '10px', borderRadius: '6px',
                          border: '1px solid #4caf50',
                          backgroundColor: '#0c1a0f', color: '#c8facc', outline: 'none', fontSize: '1.08rem'
                        }}
                      />
                      <input type="number" placeholder="Buy" value={buy}
                        onChange={e => setBuy(e.target.value)}
                        style={{
                          width: 70, padding: '10px', borderRadius: '6px',
                          border: '1px solid #4caf50',
                          backgroundColor: '#0c1a0f', color: '#c8facc', outline: 'none', fontSize: '1.08rem'
                        }}/>
                      <input type="number" placeholder="Sell" value={sell}
                        onChange={e => setSell(e.target.value)}
                        style={{
                          width: 70, padding: '10px', borderRadius: '6px',
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
                      <button onClick={handleCalculate} style={{
                        padding: '10px 14px', backgroundColor: '#4caf50',
                        color: 'black', borderRadius: '6px', border: 'none',
                        fontWeight: 700, fontSize: '1.08rem', cursor: 'pointer'
                      }}>Add</button>
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
                          <th>P/L (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activePortfolio.stocks.map((s, i) =>
                          <tr key={s.ticker + i} style={{background: i%2 ? '#0c1a0f' : 'none'}}>
                            <td>{s.ticker}</td>
                            <td>{s.qty}</td>
                            <td style={{color: s.pl>=0 ? '#61fd86' : '#ff1744'}}>{s.pl}</td>
                          </tr>
                        )}
                        <tr style={{fontWeight: 600, color: '#4caf50'}}>
                          <td>Total</td>
                          <td>{activePortfolio.stocks.reduce((a,s)=>a+s.qty,0)}</td>
                          <td>{totalPL}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Pie Chart */}
                <div>
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
                </div>
                {/* Filler column for more charts/extensions */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2rem'
                }}>
                  {/* Add more chart panels here later if needed */}
                </div>
              </div>
            </div>
            {/* Footer */}
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
