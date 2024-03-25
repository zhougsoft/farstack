import type { NextFunction, Response } from 'express'
import jwt, { type VerifyErrors } from 'jsonwebtoken'
import type { ExtendedError } from 'socket.io/dist/namespace'
import type { AuthenticatedRequest, AuthenticatedSocket } from './types'

export const authenticateTokenExpress = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { JWT_SECRET } = process.env

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

    jwt.verify(
      token,
      JWT_SECRET,
      (error: VerifyErrors, payload: AuthenticatedRequest) => {
        if (error) {
          return res.status(403).json({ error: 'token is invalid or expired' })
        }

        if (!payload.user) {
          return res.status(401).json({ error: 'invalid user' })
        }

        // attach user payload to the request & proceed
        req.user = payload.user
        next()
      }
    )
  } catch (error) {
    console.error('auth middleware error:', error)
    return res.status(500).json({ error: 'internal server error' })
  }
}

export const authenticateTokenSocketIO = (
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
) => {
  const { JWT_SECRET } = process.env
  const { token } = socket.handshake.auth
  if (!token) return next(new Error('missing authorization token'))

  jwt.verify(
    token,
    JWT_SECRET,
    (error: VerifyErrors, payload: AuthenticatedRequest) => {
      if (error) {
        return next(new Error('token is invalid or expired'))
      }

      if (!payload.user) {
        return next(new Error('invalid user data'))
      }

      // attach user payload to the socket & proceed
      socket.user = payload.user
      next()
    }
  )
}
