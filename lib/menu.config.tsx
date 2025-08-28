import type { Role } from './rbac';

export type MenuItem = {
  title: string;
  path?: string;
  icon?: string;               // lucide icon name
  roles: Role[];
  children?: MenuItem[];
  badge?: { text: string; tone?: 'info'|'warn'|'soon' };
};

export const MENU: MenuItem[] = [
  { title: 'Chat', path: '/app/chat', icon: 'MessageSquare', roles: ['admin','solicitor','staff','client'] },
  { title: 'Matters', path: '/app/matters', icon: 'FolderKanban', roles: ['admin','solicitor','staff','client'] },
  { title: 'Documents', path: '/app/documents', icon: 'FileText', roles: ['admin','solicitor','staff','client'] },
  { title: 'Review Queue', path: '/app/review', icon: 'ClipboardCheck', roles: ['admin','solicitor'] },
  { title: 'Clients', path: '/app/clients', icon: 'Users', roles: ['admin','solicitor','staff','client'] },
  { title: 'Templates', path: '/app/templates', icon: 'Layers', roles: ['admin','solicitor'] },
  { title: 'Playbooks', path: '/app/playbooks', icon: 'ListChecks', roles: ['admin','solicitor','staff'] },
  { title: 'Analytics', path: '/app/analytics/courts', icon: 'BarChart3', roles: ['admin','solicitor'] },
  { title: 'Updates', path: '/app/updates/courts', icon: 'Bell', roles: ['admin','solicitor','staff'] },
  { title: 'Fees', path: '/app/fees', icon: 'PoundSterling', roles: ['admin','solicitor'] },
  { title: 'Usage', path: '/app/usage', icon: 'Activity', roles: ['admin','solicitor'] },
  { title: 'Settings', path: '/app/settings', icon: 'Settings', roles: ['admin','solicitor','staff','client'] },
  // Admin-only
  { title: 'Users & Roles', path: '/app/admin/users', icon: 'Shield', roles: ['admin'] },
  { title: 'Audit', path: '/app/admin/audit', icon: 'ScrollText', roles: ['admin'] },
  { title: 'Org Settings', path: '/app/admin/org', icon: 'Building2', roles: ['admin'] },
];
