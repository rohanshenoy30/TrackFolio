export const onSuccess = async (credentialResponse, setUser, setPortfolios, setActivePortfolioId) => {
    if (credentialResponse.credential) {
      const mod = await import('jwt-decode')
      const jwtDecode = mod.jwtDecode || mod.default
      if (!jwtDecode || typeof jwtDecode !== 'function') {
        throw new Error('jwt-decode decode function not found in module')
      }
      const decoded = jwtDecode(credentialResponse.credential)
      setUser(decoded)
      
      console.log(decoded.email, decoded.name)

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: decoded.email, name: decoded.name })
      })

      const data = await response.json()
      if (Array.isArray(data.portfolios)) {
        setPortfolios(
          data.portfolios.map(p => ({
            id: p.pid,
            name: p.pname,
            stocks: []
          }))
        )
        if (data.portfolios.length) setActivePortfolioId(data.portfolios[0].pid)
      }
    }
}
export const onError = () => alert('Login Failed')