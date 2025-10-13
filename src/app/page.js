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
        backgroundColor: '#0a0a0a', // dark black background
        flexDirection: 'column',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        textAlign: 'center',
        padding: '2rem',
        color: '#a8d5ba', // soft green text
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0f5132, #003d1a)', // subtle green gradient card
          padding: '3rem 4rem',
          borderRadius: '15px',
          boxShadow: '0 8px 25px rgba(0, 64, 21, 0.6)',
          maxWidth: '420px',
          width: '100%',
        }}
      >
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.25rem', color: '#4caf50' }}>
          Welcome to Trackfolio
        </h1>
        <p style={{ fontSize: '1.15rem', marginBottom: '2rem', color: '#c8facc' }}>
          Track your stocks and portfolio seamlessly
        </p>
        {!user ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin onSuccess={onSuccess} onError={onError} />
          </div>
        ) : (
          <div
            style={{
              marginTop: 20,
              color: '#d9fdd3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',  // centers profile picture and text
            }}
          >
            <img
              src={user.picture}
              alt="Profile Picture"
              style={{
                borderRadius: '50%',
                width: '90px',
                height: '90px',
                border: '3px solid #4caf50',
                marginBottom: '1rem',
              }}
            />
            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>{user.name}</h2>
            <p style={{ fontSize: '1rem', marginBottom: '1rem', opacity: 0.85 }}>{user.email}</p>
            <button
              onClick={() => setUser(null)}
              style={{
                marginTop: 10,
                padding: '10px 25px',
                backgroundColor: '#4caf50',
                border: 'none',
                borderRadius: 25,
                color: 'black',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
              }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#388e3c')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = '#4caf50')}
            >
              Logout
            </button>
          </div>
        )}
      </div>
      <footer style={{ marginTop: '3rem', fontSize: '0.9rem', opacity: 0.5 }}>
        &copy; 2025 Trackfolio &mdash; Your Portfolio Companion
      </footer>
    </main>
  )
}
