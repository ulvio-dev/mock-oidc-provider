import { useEffect, useState } from 'react';
import InstallerPage from './pages/InstallerPage';
import DashboardPage from './pages/DashboardPage';
import AuthorizePage from './pages/AuthorizePage';
import { createUrl } from './utils';

interface Status {
  installed: boolean;
  basePathname: string;
}

function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(createUrl('/api/status'))
      .then(res => res.json())
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch status:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load application status</p>
        </div>
      </div>
    );
  }

  // Check if this is an authorization request
  const params = new URLSearchParams(window.location.search);
  const authId = params.get('auth');

  if (status.installed && authId) {
    return <AuthorizePage authId={authId} />;
  }

  if (status.installed) {
    return <DashboardPage />;
  }

  return <InstallerPage onInstalled={() => setStatus({ ...status, installed: true })} />;
}

export default App;
