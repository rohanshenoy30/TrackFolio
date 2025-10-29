'use client'

import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement} from 'chart.js'
import './main.css'
import { Bar } from 'react-chartjs-2'
import {onSuccess, onError} from './login'
import { useRef } from 'react';
import { Line } from 'react-chartjs-2';

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement)


function PnlSeriesChart({ pnlData }) {
  if (!pnlData || pnlData.length === 0) {
    return <div>No PnL data to display</div>;
  }
  
  const firstSeries = pnlData[0].pnl_series;
  const dataPoints = firstSeries.map(p => p.pnl);  // <-- numbers
const labels     = firstSeries.map(p => p.date); // <-- date strings
  
  console.log('Chart points:', dataPoints); // should be numbers
  console.log('Labels:', labels); // should match the points length

  const data = {
    labels,
    datasets: [{
      label: `PnL for ${pnlData[0].ticker}`,
      data: dataPoints,
      fill: false,
      borderColor: '#4caf50',
      borderWidth: 2,
      tension: 0.1,
    }]
  };

  const options = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Day' } },
      y: { beginAtZero: false }
    }
  };
  
  return (
    <div style={{ width: '100%', height: 400 }}>
      <Line data={data} options={{ ...options, maintainAspectRatio: false }} />
    </div>
  );  
}


export default function LoginPage() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [portfolios, setPortfolios] = useState([{ id: 1, name: 'My First Portfolio', stocks: [] }])
  const [activePortfolioId, setActivePortfolioId] = useState(1)
  const [holdings, setHoldings] = useState([]);
  const [stocksChanged, setStocksChanged] = useState(false);

  // Ticker suggestion/autocomplete
  const [tickerQuery, setTickerQuery] = useState('')
  const [tickerSuggestions, setTickerSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  // Calculations/UI state
  const [buy, setBuy] = useState('')
  const [sell, setSell] = useState('')
  const [qty, setQty] = useState('')

  // Use the proxy route!
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
  
  React.useEffect(() => {
    const handler = setTimeout(() => { fetchSuggestions(tickerQuery); }, 300)
    return () => clearTimeout(handler)
  }, [tickerQuery])
  
  const handleSuccess = (credentialResponse) => {
    onSuccess(credentialResponse, setUser, setPortfolios, setActivePortfolioId);
  };
  const handleCreatePortfolio = async () => {
    createPortfolio(setPortfolios, setActivePortfolioId, setSidebarOpen)
  };

  const handleCalculate = async() => {
    if (!tickerQuery || !buy || !sell || !qty) return
    const profitLoss = ((sell - buy) * qty)
    console.log("Added Stock")
    await fetch('/api/add_stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: tickerQuery.toUpperCase(),
        buy_date: buy,
        sell_date: sell,
        quantity: Number(qty),
        portfolio_id: activePortfolioId,
        uid : user?.name
      })
    })
    setStocksChanged(prev => !prev);
    
    setPortfolios(portfolios.map(p =>
      p.id === activePortfolioId
        ? { ...p, stocks: [...p.stocks, { ticker: tickerQuery.toUpperCase(), buy: +buy, sell: +sell, qty: +qty, pl: profitLoss }] }
        : p))
    // clear form
    setTickerQuery(''); setBuy(''); setSell(''); setQty('')
  }

  React.useEffect(() => {
    if (activePortfolioId) {
      fetch(`/api/portfolio_stocks?pid=${activePortfolioId}&uid=${user?.name}`)
        .then(res => res.json())
        .then(data => { setHoldings(Array.isArray(data) ? data : []); })
        .catch(() => setHoldings([]));
    } else {
      setHoldings([]);
    }
  }, [activePortfolioId, stocksChanged, user]);


  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || { stocks: [] }

  const barChartData = {
    labels: holdings.map(s => s.ticker),
    datasets: [{
      label: 'Profit/Loss (₹)',
      data: holdings.map(s => s.pl),
      backgroundColor: holdings.map(s => s.pl >= 0 ? '#61fd86' : '#ff1744'),  // green/red
      borderWidth: 1,
    }]
  };

  const barChartOptions = {
    indexAxis: 'y',   // horizontal bars
    responsive: true,
    scales: {
      x: {
        beginAtZero: true
      }
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Profit and Loss per Stock'
      }
    }
  };

  const createPortfolio = async (setPortfolios, setActivePortfolioId, setSidebarOpen) => {
    const name = prompt("Enter portfolio name:");
    if (!name) return;

    try {
      const response = await fetch('/api/create_portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pname: name, uid: user?.name })  // include user info if needed
      });

      if (!response.ok) {
        throw new Error('Failed to create portfolio');
      }

      const data = await response.json();

      if (data.pid && data.pname) {
        // Update local portfolios state to include newly created portfolio
        setPortfolios(prev => [...prev, { id: data.pid, name: data.pname, stocks: [] }]);
        setActivePortfolioId(data.pid);
        setSidebarOpen(false);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (e) {
      alert(`Error creating portfolio: ${e.message}`);
    }
  };

  const removeStock = async ({ ticker, uid, portfolio_id }) => {
    try {
      const response = await fetch('/api/remove_stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, uid, portfolio_id }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove stock');
      }

      // After successful removal, trigger refetch by toggling a state or using existing dependencies
      setStocksChanged(prev => !prev); // assuming you use this to trigger data fetch
    } catch (error) {
      alert(`Error removing stock: ${error.message}`);
    }
  };


  const fetchTimeoutRef = useRef(null);
  const [pnlSeries, setPnlSeries] = useState(null);
  React.useEffect(() => {
    if (holdings.length === 0 || !activePortfolioId || !user) return;

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      // Your fetch code here
      fetch('/api/portfolio_pnl_series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stocks: holdings.map(stock => ({
            ticker: stock.ticker,
            buy_date: stock.buy_date,
            sell_date: stock.sell_date,
            quantity: stock.qty,
          }))
        }),
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch portfolio pnl');
          return res.json();
        })
        .then(data => {
          console.log('Portfolio PnL series:', data);
          setPnlSeries(data)

          // Update your pnl state here if needed
        })
        .catch(e => {
          if (e.name !== 'AbortError') {
            console.error(e);
          }
        });
    }, 200); // delay in ms, adjust as you like

    return () => clearTimeout(fetchTimeoutRef.current);

  }, [holdings, activePortfolioId, user]);

  return (
    <main className="main-back">
      {!user ? (
        <div className='login-card'>
          <h1 style={{ color: '#4caf50', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            Welcome to Trackfolio
          </h1>
          <p style={{ color: '#c8facc', fontSize: '1.15rem', marginBottom: '2rem' }}>
            Track your portfolio like a pro.
          </p>
          <GoogleLogin onSuccess={handleSuccess} onError={onError} />
        </div>
      ) : (
        <div style={{ display: 'flex', height: '100vh' }}>
          {/* -------------- SIDEBAR --------------- */}
          <div>
            {/* Hamburger (menu lines) */}
            <div className='Ham-symbol' onClick={() => setSidebarOpen(!sidebarOpen)} tabIndex={0} aria-label="Open sidebar">
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
              <button className='create-portfolio-button' onClick={handleCreatePortfolio}>+ Create Portfolio</button>
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
              <button className='logout'
                onClick={() => setUser(null)} >
                Logout
              </button>
            </div>
            {/* Dashboard content */}
            <div style={{marginTop: '4.8rem', padding: '2.2rem 3rem', width: '100%', flex: 1}}>
              <h1 style={{ color: '#4caf50', fontSize: '2.4rem', marginBottom: '0.4rem' }}>
                {activePortfolio ? activePortfolio.name : 'Portfolio Dashboard'}
              </h1>
              <p style={{ opacity: 0.8 }}>Hello, {user.name.split(' ')[0]} — manage your stocks and simulate trades!</p>
              <div className='breakdown'>
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
                          className='ticker-input'
                        />
                        {showSuggestions && tickerSuggestions.length > 0 && (
                          <div className='suggest'>
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
                      {/* Buy, Sell, Quantity, Add */}
                      <input className='card-inp' type="date" placeholder="Buy" value={buy} onChange={e => setBuy(e.target.value)}/>
                      <input type="date" placeholder="Sell" value={sell} onChange={e => setSell(e.target.value)} className='card-inp'/>
                      <input type="number" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} className='card-inp'/>
                      <button onClick={handleCalculate} style={{
                        padding: '10px 14px', backgroundColor: '#4caf50',
                        color: 'black', borderRadius: '6px', border: 'none',
                        fontWeight: 700, fontSize: '1.08rem', cursor: 'pointer'
                      }}>Add</button>
                    </div>
                  </div>
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
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((s, i) =>
                          <tr key={s.ticker + i} style={{background: i%2 ? '#0c1a0f' : 'none'}}>
                            <td>{s.ticker}</td>
                            <td>{s.qty}</td>
                            <td style={{color: s.pl>=0 ? '#61fd86' : '#ff1744'}}>{s.pl}</td>
                            <td>
                              <button
                                onClick={() => removeStock({ ticker: s.ticker, uid: user.name, portfolio_id: activePortfolioId })}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ff1744',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '1.2rem',
                                }}
                                aria-label={`Remove ${s.ticker}`}
                                title="Remove stock"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        )}
                        <tr style={{fontWeight: 600, color: '#4caf50'}}>
                          <td>Total</td>
                          <td>{holdings.reduce((a,s)=>a+s.qty,0)}</td>
                          <td>{holdings.reduce((a,s)=>a+s.pl,0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
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
                    <div style={{
                      backgroundColor: '#10291b',
                      padding: '1.5rem',
                      borderRadius: '10px',
                      border: '1px solid #205f38',
                      minHeight: 350,
                      marginTop: '1.5rem'
                    }}>
                      <Bar data={barChartData} options={barChartOptions} />
                      {pnlSeries && <PnlSeriesChart pnlData={pnlSeries} />}
                    </div>
                  </div>
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
