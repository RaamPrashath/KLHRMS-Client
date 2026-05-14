import { authClient } from '@/lib/auth-client';

export default async function DebugGooglePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-4 text-2xl font-bold">Google Account Debug</h1>
      <DebugClient />
    </div>
  );
}

function DebugClient() {
  'use client';
  
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const sessionResult = await authClient.getSession();
        setSession(sessionResult.data);
        
        const accountsResult = await authClient.listAccounts();
        if (accountsResult.data) {
          setAccounts(Array.isArray(accountsResult.data) ? accountsResult.data : []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Current Session</h2>
        <pre className="rounded-lg bg-gray-100 p-4 text-sm">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold">Linked Accounts</h2>
        {accounts.length === 0 ? (
          <p>No accounts linked</p>
        ) : (
          <div className="space-y-4">
            {accounts.map((account: any, index: number) => (
              <div key={index} className="rounded-lg border p-4">
                <p><strong>Provider:</strong> {account.providerId}</p>
                <p><strong>Account ID:</strong> {account.accountId}</p>
                <p><strong>Scopes:</strong> {Array.isArray(account.scopes) ? account.scopes.join(', ') : 'None'}</p>
                <pre className="mt-2 rounded bg-gray-100 p-2 text-xs">
                  {JSON.stringify(account, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
