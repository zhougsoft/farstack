import {
  createAppClient,
  viemConnector,
  type StatusAPIResponse,
} from '@farcaster/auth-client'
import cors from 'cors'
import dotenv from 'dotenv'
import express, { type Request, type Response } from 'express'
import { createServer } from 'http'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { validateFarcasterSignature } from './lib'
import {
  authenticateTokenExpress,
  authenticateTokenSocketIO,
} from './middleware'
import type { AuthenticatedRequest, AuthenticatedSocket } from './types'

dotenv.config()
const { PORT, JWT_SECRET } = process.env
if (!PORT) throw new Error('missing PORT in .env file')
if (!JWT_SECRET) throw new Error('missing JWT_SECRET in .env file')

const farcasterClient = createAppClient({ ethereum: viemConnector() })

const app = express()
app.use(express.json())
app.use(cors())

const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*', // allow all origins for now, but should be more restrictive in production
    methods: ['GET', 'POST'],
  },
})

io.use((socket: AuthenticatedSocket, next) => {
  if (socket.handshake !== undefined) {
    authenticateTokenSocketIO(socket, next)
  } else {
    next()
  }
})

io.on('connection', (socket: AuthenticatedSocket) => {
  console.log(`fid #${socket.user.fid} connected`)

  socket.on('bing', data => {
    console.log('bing', data)
    socket.emit('bong', { data: `ping recieved from fid #${socket.user.fid}` })
  })
})

app.post('/auth', async (req: Request, res: Response) => {
  try {
    if (!req.headers.origin) {
      return res.status(400).json({ error: 'missing header: origin' })
    }

    const { host } = new URL(req.headers.origin)
    const statusAPIResponse = req.body as StatusAPIResponse
    const signatureIsValid = await validateFarcasterSignature(
      farcasterClient,
      host,
      statusAPIResponse
    )

    if (!signatureIsValid) {
      return res.status(401).json({ error: 'invalid signature' })
    }

    const payload = { user: statusAPIResponse }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })
    res.json({ token })
  } catch (error) {
    console.error('/auth error:', error)
    return res.status(500).json({ error: 'internal server error' })
  }
})

app.get(
  '/me',
  authenticateTokenExpress,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        const msg =
          'missing `req.user` after auth middleware; this should not happen'
        console.error(msg)
        return res.status(500).json({ error: 'internal server error' })
      }

      res.json(req.user)
    } catch (error) {
      console.error('/me error:', error)
      return res.status(500).json({ error: 'internal server error' })
    }
  }
)

server.listen(PORT, () => {
  console.log(`\nserver listening on port ${PORT}`)
})
