export interface Assignment {
  id: number;
  title: string;
  url: string;
}

export interface VideoData {
  id: number;
  title: string;
  description: string;
  url: string;
  duration: string;
  category: string;
  watched: boolean;
}

export interface User {
  _id: string;
  username: string;
  password?: string; // In a real app, this would be hashed
  plainPassword?: string; // Plain text password for admin viewing
  role: 'admin' | 'student';
  progress?: number[]; // Array of video IDs watched
  starred?: number[]; // Array of starred video IDs
  notes?: Record<number, string>; // Map video ID to note content
  checkIns?: string[]; // Array of ISO date strings for daily logins
}

export type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
};

export type Theme = 'dark' | 'light';
