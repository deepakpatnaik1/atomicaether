export interface User {
  id: string
  email: string
  name: string
  githubId: string
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  userId: string
  content: string
  createdAt: Date
}

export interface Persona {
  id: string
  userId: string
  name: string
  description: string
  config: Record<string, any>
  createdAt: Date
  updatedAt: Date
}