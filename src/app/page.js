'use client'

import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'

export default function LoginPage() {
  const [user, setUser] = useState(null)

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

  const onError = () => {
    alert('Login Failed')
  }

  return (
    <main
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
      }}
    >
      <h1 style={{ color: '#1e40af' }}>Welcome to Trackfolio</h1>
      <p>Track your stocks and portfolio seamlessly</p>
      {!user ? (
        <GoogleLogin onSuccess={onSuccess} onError={onError} />
      ) : (
        <div style={{ marginTop: 20 }}>
          <img
            src={user.picture}
            alt="Profile Picture"
            style={{ borderRadius: '50%', width: 80, height: 80 }}
          />
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <button
            onClick={() => setUser(null)}
            style={{
              marginTop: 10,
              padding: '8px 16px',
              backgroundColor: '#1e40af',
              border: 'none',
              borderRadius: 4,
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      )}
    </main>
  )
}
