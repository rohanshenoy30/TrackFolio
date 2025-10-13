import './globals.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

export const metadata = {
  title: 'Trackfolio',
  description: 'Stock and Portfolio tracking',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId="686381839587-ieh2jmnt0eabh1jbnhpd8grcok95dk2s.apps.googleusercontent.com">
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}
