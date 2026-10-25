export function dashboardPathForRole(role) {
  if (role === 'OFFICER') return '/officer/dashboard';
  if (role === 'ADMIN') return '/admin/dashboard';
  return '/citizen/dashboard';
}
