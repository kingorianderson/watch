export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'google' | 'facebook' | 'email' | 'guest';
  joinedAt: number;
}

