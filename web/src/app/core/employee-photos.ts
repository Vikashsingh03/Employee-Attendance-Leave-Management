
export const EMPLOYEE_PHOTO_MAP: Record<string, string> = {
  EMP001: 'assets/employees/emp001.jpg',
  EMP002: 'assets/employees/emp002.jpg',
  EMP003: 'assets/employees/emp003.jpg',
  EMP004: 'assets/employees/emp004.jpg',
  EMP005: 'assets/employees/emp005.jpg',
  EMP006: 'assets/employees/emp006.jpg',
  EMP007: 'assets/employees/emp007.jpg',
  EMP008: 'assets/employees/emp008.jpg',
  EMP009: 'assets/employees/emp009.jpg',
  EMP010: 'assets/employees/emp010.jpg',
  EMP011: 'assets/employees/emp011.jpg',
  EMP012: 'assets/employees/emp012.jpg',
  EMP013: 'assets/employees/emp013.jpg',
  EMP014: 'assets/employees/emp014.jpg',
  EMP015: 'assets/employees/emp015.jpg',
  EMP016: 'assets/employees/emp016.jpg',
  EMP017: 'assets/employees/emp017.jpg',
  EMP018: 'assets/employees/emp018.jpg',
  EMP019: 'assets/employees/emp019.jpg',
  EMP020: 'assets/employees/emp020.jpg',
  EMP021: 'assets/employees/emp021.jpg',
  EMP022: 'assets/employees/emp022.jpg',
  EMP023: 'assets/employees/emp023.jpg',
  EMP024: 'assets/employees/emp024.jpg',
};

export function photoFor(employeeCode: string | null | undefined): string | null {
  if (!employeeCode) return null;
  return EMPLOYEE_PHOTO_MAP[employeeCode.trim().toUpperCase()] ?? null;
}

export function initialsFor(fullName: string): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}
