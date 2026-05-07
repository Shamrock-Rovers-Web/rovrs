import { useState, useEffect } from 'react';
import { api } from '../api';
import UserList from '../components/UserList';
import SlugBlocklistEditor from '../components/SlugBlocklistEditor';
import ProtectedSlugsEditor from '../components/ProtectedSlugsEditor';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const Settings = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.users.list();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Mobile Tabs */}
      <div className="sm:hidden mb-6">
        <div className="flex space-x-1 border-b border-gray-200">
          <button className="flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 border-green-500 text-green-600">
            Users
          </button>
          <button className="flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 border-transparent text-gray-500 hover:text-gray-700">
            Blocklist
          </button>
          <button className="flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 border-transparent text-gray-500 hover:text-gray-700">
            Protected
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* User Management Section */}
        <section className="block sm:hidden">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <UserList
            users={users}
            onUpdateUser={fetchUsers}
            currentEmail={localStorage.getItem('userEmail') || ''}
          />
        </section>

        <section className="hidden sm:block">
          <h2 className="text-2xl font-semibold mb-4">User Management</h2>
          <UserList
            users={users}
            onUpdateUser={fetchUsers}
            currentEmail={localStorage.getItem('userEmail') || ''}
          />
        </section>

        {/* Slug Blocklist Section */}
        <section className="hidden sm:block">
          <h2 className="text-2xl font-semibold mb-4">Slug Blocklist</h2>
          <SlugBlocklistEditor />
        </section>

        {/* Protected Slugs Section */}
        <section className="hidden sm:block">
          <h2 className="text-2xl font-semibold mb-4">Protected Slugs</h2>
          <ProtectedSlugsEditor />
        </section>
      </div>
    </div>
  );
};

export default Settings;