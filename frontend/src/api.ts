// Use environment variable or fallback to localhost for development
const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

// Helper function to get authorization header
const getAuthHeaders = () => {
  const authSession = localStorage.getItem('auth_session');
  if (authSession) {
    const { user } = JSON.parse(authSession);
    if (user && user._id) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user._id}`
      };
    }
  }
  return { 'Content-Type': 'application/json' };
};

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

  // Get all users (admin only - requires authentication)
  getUsers: async () => {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Create user (admin only - requires authentication)
  createUser: async (username: string, password: string, role: 'admin' | 'student') => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, password, role })
    });
    return response.json();
  },

  // Delete user (admin only - requires authentication)
  deleteUser: async (id: string) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Update user password (admin only - requires authentication)
  updateUserPassword: async (id: string, password: string) => {
    const response = await fetch(`${API_URL}/users/${id}/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password })
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
