// Main API module
export const api = {
  // Users API
  users: {
    list: async () => {
      const response = await fetch('/api/users', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    update: async (id: string, data: { role: 'admin' | 'user' }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    }
  },
  // Settings API
  settings: {
    get: async (key: string) => {
      const response = await fetch(`/api/settings/${key}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    update: async (key: string, value: string) => {
      const response = await fetch(`/api/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });
      return response.json();
    }
  }
};