import { type Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: Record<any, any>
    }
  }
}
