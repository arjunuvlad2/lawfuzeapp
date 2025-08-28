// Simple user types for UI display only
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

// Mock data for development
export const MOCK_USER: User = {
  id: '1',
  email: 'demo@kt.com',
  name: 'Demo User',
  avatar: '/media/avatars/300-2.png'
};
