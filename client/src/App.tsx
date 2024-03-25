import {
  AuthKitProvider,
  SignInButton,
  type AuthClientError,
  type StatusAPIResponse,
} from '@farcaster/auth-kit'
import '@farcaster/auth-kit/styles.css'
import Cookies from 'js-cookie'
import { jwtDecode, type JwtPayload } from 'jwt-decode'
import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const SERVER_URL = 'http://localhost:6969'

interface AuthJwtPayload extends JwtPayload {
  user: StatusAPIResponse
}

const App = () => {
  const [token, setToken] = useState<string | null>(null)
  const [activeUser, setActiveUser] = useState<StatusAPIResponse | null>(null)
  const [hasSocketConnection, setHasSocketConnection] = useState<boolean>(false)

  const socketRef = useRef<Socket | null>(null)

  const onSocketConnection = (socket: Socket) => {
    socket.on('disconnect', () => {
      socketRef.current = null
      setHasSocketConnection(false)
      console.log('disconnected from socket.io server')
    })

    socket.on('bong', data => console.log('bong', data))

    socketRef.current = socket
    setHasSocketConnection(true)
    console.log('connected to socket.io server!')
  }

  const connectSocket = (token: string) => {
    console.log('connecting to socket.io server...')

    const socket = io(SERVER_URL, { auth: { token } })

    if (!socket) {
      console.error('failed to connect to socket.io server')
      alert('failed to connect to socket.io server')
      return
    }

    socket.on('error', error => console.error('socket.io error:', error))
    socket.on('connect', () => onSocketConnection(socket))
  }

  // check for existing cookie with auth token on page load
  useEffect(() => {
    if (token) return

    const tokenCookie = Cookies.get('token')
    if (!tokenCookie) return

    setToken(tokenCookie)
  }, [])

  // parse user from auth token & set as active user
  useEffect(() => {
    if (!token || activeUser) return

    const payload: AuthJwtPayload = jwtDecode(token)
    if (!payload || !payload.user) return

    setActiveUser(payload.user)
  }, [token])

  // connect to socket.io server if authenticated user exists that is not already connected
  useEffect(() => {
    if (!activeUser || !token || socketRef.current) return
    connectSocket(token)

    return () => {
      socketRef.current?.disconnect()
    }
  }, [activeUser])

  const onSignIn = async (statusAPIResponse: StatusAPIResponse) => {
    if (!statusAPIResponse) {
      console.warn('missing statusAPIResponse from Farcaster')
      return
    }

    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: window.location.origin,
      },
      body: JSON.stringify(statusAPIResponse),
    }

    const data = await fetch(`${SERVER_URL}/auth`, opts).then(res => res.json())

    if (!data.token) {
      console.warn('authentication unsuccessful:', data)
      alert('server authentication failed; check console for details')
      return
    }

    const payload: AuthJwtPayload = jwtDecode(data.token)
    if (!payload || !payload.exp) {
      console.warn('invalid json web token payload')
      return
    }

    const nowInSeconds = Math.floor(Date.now() / 1000)
    const expiresInDays = (payload.exp - nowInSeconds) / (60 * 60 * 24)
    Cookies.set('token', data.token, { expires: expiresInDays })

    setToken(data.token)
    setActiveUser(payload.user)
    console.log('authentication success', payload)
  }

  const onSignInError = (error: AuthClientError | undefined) => {
    console.error('authentication error', error)
    alert('farcaster authentication failed; check console for details')
  }

  const onSignOut = () => {
    Cookies.remove('token')
    window.location.reload()
  }

  const onFetchMeClick = async () => {
    if (!token) {
      console.warn('missing auth token')
      return
    }

    const opts = {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }

    const result = await fetch(`${SERVER_URL}/me`, opts)
      .then(res => res.json())
      .catch(console.error)

    console.log('/me', result)
  }

  const onEmitMsgClick = () => {
    if (!socketRef.current) return
    socketRef.current.emit('bing', { data: 'hello from client' })
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
              <button onClick={onFetchMeClick}>
                fetch <strong>/me</strong>
              </button>
              <br />
              {hasSocketConnection && (
                <button onClick={onEmitMsgClick}>emit socket message</button>
              )}
              <br />
              <small>
                <em>* check console for output *</em>
              </small>
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
