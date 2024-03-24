import type { NextFunction, Request, Response } from 'express'
import jwt, { type VerifyErrors } from 'jsonwebtoken'

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { JWT_SECRET } = process.env
    if (!JWT_SECRET) throw new Error('missing JWT_SECRET in .env file')

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
