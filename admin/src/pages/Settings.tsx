import { useState, useEffect } from 'react';
import { api } from '../api';
import SlugBlocklistEditor from '../components/SlugBlocklistEditor';
import ProtectedSlugsEditor from '../components/ProtectedSlugsEditor';

const Settings = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-gray-600 mb-8">Manage blocked slugs, protected paths, and system configuration.</p>

      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-2">Authentication</h2>
        <p className="text-gray-600">
          Admin access is managed through <strong>Cloudflare Access</strong>. All users with access to
          admin.rov.rs are authenticated via Cloudflare's zero-trust login — no separate user accounts
          or passwords are needed. To add or remove users, update the Cloudflare Access policy in the
          Cloudflare dashboard.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-2">Slug Blocklist</h2>
          <p className="text-gray-600 mb-4">
            Blocked terms that cannot be used as link slugs. Useful for preventing abuse
            (e.g. blocking <code className="bg-gray-100 px-1 rounded">javascript:</code> URLs).
          </p>
          <SlugBlocklistEditor />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Protected Slugs</h2>
          <p className="text-gray-600 mb-4">
            These slugs are reserved and cannot be created as short links. Core slugs
            like <code className="bg-gray-100 px-1 rounded">tickets</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">shop</code>, and{' '}
            <code className="bg-gray-100 px-1 rounded">health</code> are system paths
            used by the redirect worker and admin API. You can also add custom protected slugs.
          </p>
          <ProtectedSlugsEditor />
        </section>
      </div>
    </div>
  );
};

export default Settings;
