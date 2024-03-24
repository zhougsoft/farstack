import {
  createAppClient,
  viemConnector,
  type StatusAPIResponse,
} from '@farcaster/auth-client'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import { validateFarcasterSignature } from './lib'

const JWT_SECRET = 'use_an_env_var_for_this'
const PORT = 6969

const farcasterClient = createAppClient({ ethereum: viemConnector() })

const app = express()
app.use(express.json())
app.use(cors())

app.post('/auth', async (req, res) => {
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

  if (signatureIsValid) {
    const token = jwt.sign({ user: statusAPIResponse }, JWT_SECRET, {
      expiresIn: '1d',
    })

    res.json({ token })
  } else {
    res.status(401).json({ error: 'invalid signature' })
  }
})

app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`)
})
