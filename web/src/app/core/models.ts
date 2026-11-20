
export interface User {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  role: string;
  departmentId: number;
  departmentName: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface StatusCount { status: string; count: number; }
export interface DepartmentAttendance { department: string; present: number; total: number; }
export interface RecentLeaveRequest {
  id: number; employeeName: string; leaveType: string;
  startDate: string; endDate: string; status: string;
}
export interface HolidayItem { name: string; date: string; }

export interface AdminDashboard {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  leavesApprovedThisMonth: number;
  leavesByStatus: StatusCount[];
  attendanceByDepartment: DepartmentAttendance[];
  recentLeaveRequests: RecentLeaveRequest[];
  upcomingHolidays: HolidayItem[];
}

export interface LeaveBalanceItem {
  leaveType: string; total: number; used: number; remaining: number;
}

export interface EmployeeDashboard {
  myLeaveBalances: LeaveBalanceItem[];
  myPendingRequests: number;
  myAttendanceThisMonth: { present: number; absent: number; leave: number };
  upcomingHolidays: HolidayItem[];
}

export interface Department {
  id: number; name: string; description?: string; employeeCount?: number;
}

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  departmentId: number;
  departmentName: string;
  dateOfJoining: string;
  isActive: boolean;
  salary?: number;
  role?: string;
  photoPath?: string;
  photoUrl?: string;
  leaveBalances?: LeaveBalance[];
}

export interface PagedResult<T> {
  items: T[]; total: number; page: number; pageSize: number;
}

export interface LeaveType {
  id: number; name: string; daysAllowedPerYear: number; description?: string; isPaid?: boolean;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  reviewComments?: string;
  reviewedByName?: string;
  reviewedOn?: string;
  appliedOn?: string;
}

export interface LeaveBalance {
  id: number; employeeId: number; employeeName?: string; leaveTypeId: number; leaveTypeName: string;
  year: number; totalDays: number; usedDays: number; remainingDays: number;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
}

export interface Holiday {
  id: number; name: string; date: string; description?: string;
}

export interface TodayAttendance {
  date: string;
  record: AttendanceRecord | null;
}
