export interface OfficeInfo { name: string; registration: string; representative: string; phone: string; address: string; email: string }
export interface Staff { id: string; name: string; role: '관리자' | '직원'; status: '활성' | '초대 대기' }
export interface Client { id: string; name: string; type: '개인사업자' | '법인사업자'; status: '정상' }
export interface BusinessSettings { year: number; startMonth: number; endMonth: number; dateFormat: string; amountFormat: string; landing: string; notifications: boolean }
export interface OnboardingData { office: OfficeInfo; staff: Staff[]; settings: BusinessSettings; clients: Client[]; completed: boolean; step: number }
