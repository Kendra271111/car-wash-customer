import 'express'

declare module 'express' {
  interface Request {
    file?: {
      filename: string
      [key: string]: any
    }
  }
}
