import { useState } from 'react';
import { api } from '../api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  last_login_at?: string;
}

interface UserListProps {
  users: User[];
  onUpdateUser: () => void;
  currentEmail: string;
}

const UserList = ({ users, onUpdateUser, currentEmail }: UserListProps) => {
  const [loading, setLoading] = useState<{ [key: number]: boolean }>({});
  const [error, setError] = useState<{ [key: number]: string }>({});

  const handleRoleChange = async (userId: number, newRole: 'admin' | 'user') => {
    setLoading(prev => ({ ...prev, [userId]: true }));
    setError(prev => ({ ...prev, [userId]: '' }));

    try {
      const response = await api.users.update(userId.toString(), { role: newRole });
      if (response.success) {
        onUpdateUser();
      } else {
        setError(prev => ({ ...prev, [userId]: response.error || 'Failed to update user' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, [userId]: 'Failed to update user' }));
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const isCurrentUser = (user: User) => user.email === currentEmail;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Display Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {isCurrentUser(user) ? (
                    <span className="text-gray-400">Cannot change own role</span>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRoleChange(user.id, 'admin')}
                        disabled={loading[user.id] || user.role === 'admin'}
                        className={`px-3 py-1 text-xs rounded ${
                          user.role === 'admin'
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        Make Admin
                      </button>
                      <button
                        onClick={() => handleRoleChange(user.id, 'user')}
                        disabled={loading[user.id] || user.role === 'user'}
                        className={`px-3 py-1 text-xs rounded ${
                          user.role === 'user'
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        Make Editor
                      </button>
                    </div>
                  )}
                  {error[user.id] && (
                    <p className="text-xs text-red-600 mt-1">{error[user.id]}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList;