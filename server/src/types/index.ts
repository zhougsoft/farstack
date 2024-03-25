import type { Request } from 'express'
import type { Socket } from 'socket.io'

export type User = Record<any, any>

export interface AuthenticatedRequest extends Request {
  user: User
}

export interface AuthenticatedSocket extends Socket {
  user: User
}
