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