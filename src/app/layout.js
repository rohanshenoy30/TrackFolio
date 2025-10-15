import './globals.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

export const metadata = {
  title: 'Trackfolio',
  description: 'Stock Portfolio Tracker',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: '#0a0a0a',
          color: '#d9fdd3',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        <GoogleOAuthProvider clientId="686381839587-ieh2jmnt0eabh1jbnhpd8grcok95dk2s.apps.googleusercontent.com">
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}
