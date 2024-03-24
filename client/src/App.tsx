import '@farcaster/auth-kit/styles.css'
import {
  type AuthClientError,
  type StatusAPIResponse,
  AuthKitProvider,
  SignInButton,
} from '@farcaster/auth-kit'
import Cookies from 'js-cookie'
import { type JwtPayload, jwtDecode } from 'jwt-decode'
import { useEffect, useState } from 'react'

const SERVER_URL = 'http://localhost:6969'

interface AuthJwtPayload extends JwtPayload {
  user: StatusAPIResponse
}

const App = () => {
  const [activeUser, setActiveUser] = useState<StatusAPIResponse | null>(null)

  useEffect(() => {
    const token = Cookies.get('token')
    if (!token) return

    const payload: AuthJwtPayload = jwtDecode(token)
    setActiveUser(payload.user)
  }, [])

  const onSignIn = (statusAPIResponse: StatusAPIResponse) => {
    if (!statusAPIResponse) {
      console.warn('missing statusAPIResponse from Farcaster')
      return
    }

    fetch(`${SERVER_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: window.location.origin,
      },
      body: JSON.stringify(statusAPIResponse),
    })
      .then(res => res.json())
      .then((data: any) => {
        if (data.token) {
          const payload: AuthJwtPayload = jwtDecode(data.token)
          if (!payload || !payload.exp) {
            console.warn('invalid json web token payload')
            return
          }

          const nowInSeconds = Math.floor(Date.now() / 1000)
          const expiresInDays = (payload.exp - nowInSeconds) / (60 * 60 * 24)
          Cookies.set('token', data.token, { expires: expiresInDays })
          setActiveUser(payload.user)

          console.log('authentication success')
        } else {
          console.warn('authentication unsuccessful:', data)
          alert('server authentication failed; check console for details')
        }
      })
  }

  const onSignInError = (error: AuthClientError | undefined) => {
    console.error('authentication error', error)
    alert('farcaster authentication failed; check console for details')
  }

  const onSignOut = () => {
    Cookies.remove('token')
    setActiveUser(null)
    console.log('signed out')
  }

  return (
    <AuthKitProvider>
      <main style={{ fontFamily: 'monospace' }}>
        <div style={{ position: 'fixed', top: '1rem', right: '1rem' }}>
          {!!activeUser ? (
            <button onClick={onSignOut}>sign out</button>
          ) : (
            <SignInButton onSuccess={onSignIn} onError={onSignInError} />
          )}
        </div>
        <div style={{ paddingTop: '33vh', textAlign: 'center' }}>
          <h1 style={{ letterSpacing: '-0.04em' }}>
            🟪 <em>farstack</em> 🟪
          </h1>
          {!!activeUser ? (
            <div>
              <h3>welcome, {activeUser.displayName}</h3>
              <p>
                your fid is: <strong>{activeUser.fid}</strong>
              </p>
            </div>
          ) : (
            <p>
              sign in with <em>farcaster</em> by clicking the{' '}
              <strong>"Sign in"</strong> button, then scanning the QR code popup
            </p>
          )}
        </div>
      </main>
    </AuthKitProvider>
  )
}

export default App
