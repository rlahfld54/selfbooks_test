export interface UserProfile {
  id: string
  login_id: string | null
  name: string
  email: string
  phone: string | null
  status: string
  email_verified_at: string | null
  last_login_at: string | null
  password_changed_at: string | null
  failed_login_count: number
  locked_until: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  user_code: string | null
  mobile_phone: string | null
}

export interface AuthUser {
  id: string
  name: string
  email: string
  officeId: string
  role: string
  userCode?: string | null
  loginId?: string | null
  phone?: string | null
  departmentName?: string | null
  jobTitle?: string | null
  joinedAt?: string | null
  profile?: UserProfile
}
