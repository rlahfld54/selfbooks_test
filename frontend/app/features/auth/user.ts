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

export interface AuthOrganization {
  id: string
  name: string
  business_registration_number: string | null
  representative_name: string | null
  representative_phone: string | null
  address: string | null
  email?: string | null
  phone?: string | null
  corporate_registration_number?: string | null
  business_type?: string | null
  business_item?: string | null
}

export interface OfficeMembership {
  id: string
  office_id: string
  user_id: string
  role: 'OWNER' | 'ADMIN' | 'STAFF'
  status: 'ACTIVE' | 'INACTIVE'
  department_name: string | null
  job_title: string | null
  joined_at: string | null
  created_at: string
  updated_at: string
}

export interface AuthUser {
  organization?: AuthOrganization
  membership?: OfficeMembership
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
