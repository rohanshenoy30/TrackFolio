export const createPortfolio = async (setPortfolios, setActivePortfolioId, setSidebarOpen) => {
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

export function PortfolioHoldings({holdings}){
  return(
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
          {holdings.map((s, i) =>
            <tr key={s.ticker + i} style={{background: i%2 ? '#0c1a0f' : 'none'}}>
              <td>{s.ticker}</td>
              <td>{s.qty}</td>
              <td style={{color: s.pl>=0 ? '#61fd86' : '#ff1744'}}>{s.pl}</td>
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
  )
}