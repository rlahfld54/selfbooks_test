export interface MockUser {
  id: string
  name: string
  email: string
}

export interface MockAccount extends MockUser {
  salt: string
  verifier: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  confirmation: string
  accepted: boolean
}
