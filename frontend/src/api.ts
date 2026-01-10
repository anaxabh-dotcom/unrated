// Use environment variable or fallback to localhost for development
const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export const api = {
  // Login
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  },

  // Get all users (admin)
  getUsers: async () => {
    const response = await fetch(`${API_URL}/users`);
    return response.json();
  },

  // Create user (admin)
  createUser: async (username: string, password: string, role: 'admin' | 'student') => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });
    return response.json();
  },

  // Delete user (admin)
  deleteUser: async (id: string) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // Update progress
  updateProgress: async (userId: string, videoId: number) => {
    const response = await fetch(`${API_URL}/users/${userId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId })
    });
    return response.json();
  },

  // Toggle starred
  toggleStarred: async (userId: string, videoId: number) => {
    const response = await fetch(`${API_URL}/users/${userId}/starred`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId })
    });
    return response.json();
  },

  // Save note
  saveNote: async (userId: string, videoId: number, content: string) => {
    const response = await fetch(`${API_URL}/users/${userId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, content })
    });
    return response.json();
  }
};
