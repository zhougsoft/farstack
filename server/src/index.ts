import {
  createAppClient,
  viemConnector,
  type StatusAPIResponse,
} from '@farcaster/auth-client'
import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import jwt, { type VerifyErrors } from 'jsonwebtoken'
import { validateFarcasterSignature } from './lib'

const JWT_SECRET = 'use_an_env_var_for_this'
const PORT = 6969

const farcasterClient = createAppClient({ ethereum: viemConnector() })

const app = express()
app.use(express.json())
app.use(cors())

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader) {
      return res.status(403).json({ error: 'missing authorization header' })
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(403).json({
        error:
          "invalid authorization header; expected format: 'Authorization: Bearer [TOKEN]'",
      })
    }

    const token = authHeader && authHeader.split(' ')[1] // Authorization: Bearer [TOKEN]
    if (!token) {
      return res.status(403).json({ error: 'missing authorization token' })
    }

    jwt.verify(token, JWT_SECRET, (error: VerifyErrors, payload: Request) => {
      if (error) {
        return res.status(403).json({ error: 'token is invalid or expired' })
      }

      // ~~ add any req'd user validation here ~~
      if (!payload.user) {
        return res.status(401).json({ error: 'invalid user' })
      }

      // attach user payload to the request & proceed on
      req.user = payload.user
      next()
    })
  } catch (error) {
    console.error('auth middleware error:', error)
    return res.status(500).json({ error: 'internal server error' })
  }
}

app.post('/auth', async (req, res) => {
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

app.get('/me', authenticateToken, (req, res) => {
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
})

app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`)
})
