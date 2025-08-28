export type Role = 'admin' | 'solicitor' | 'staff' | 'client';

export const canSee = (allowed: Role[], role?: Role) => {
  if (!role) return false;
  return allowed.includes(role);
}
