export type Maybe<T> = T | undefined

export type Class<T> = Function & {
  new (...args: any[]): T
}

export interface WithType {
  type: string
}

export const ID = () => Math.random().toString(36).slice(2)
