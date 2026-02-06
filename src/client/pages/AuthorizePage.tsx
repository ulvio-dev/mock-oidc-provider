import { useEffect, useState } from 'react';
import { createUrl } from '../utils';

interface Identity {
  name: string;
  description: string;
  claims: string[];
}

interface Config {
  title: string;
  accentColor: string;
}

interface AuthorizePageProps {
  authId: string;
}

function AuthorizePage({ authId }: AuthorizePageProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(createUrl('/api/config')).then(res => res.json()),
      fetch(createUrl('/api/identities')).then(res => res.json()),
    ])
      .then(([configData, identitiesData]) => {
        setConfig(configData);
        setIdentities(identitiesData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data:', err);
        setError('Failed to load configuration');
        setLoading(false);
      });
  }, []);

  const handleSelectIdentity = async (identityName: string) => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(createUrl('/api/authorize/select'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId, identityName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Authorization failed');
      }

      const data = await response.json();
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization failed');
      setSubmitting(false);
    }
  };

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

  const accentColor = config?.accentColor || '#3B82F6';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <img src={createUrl('/api/logo')} alt="Logo" className="h-12 w-12 object-contain" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {config?.title || 'Mock OIDC Provider'}
                </h1>
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  OAuth 2.0
                </span>
              </div>
              <p className="text-gray-600 text-sm">Authorization request in progress</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-900 text-sm">
              An application is requesting access to your identity. Select which identity you want to use for this session.
            </p>
          </div>
        </div>

        {/* Identities Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Choose your identity</h2>
              <p className="text-gray-600 text-sm mt-1">{identities.length} available</p>
            </div>
            {submitting && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-700 text-sm font-medium">Redirecting...</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {identities.map((identity) => (
              <button
                key={identity.name}
                onClick={() => handleSelectIdentity(identity.name)}
                disabled={submitting}
                className="w-full text-left border-2 border-gray-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: submitting ? '#E5E7EB' : undefined,
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{identity.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{identity.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {identity.claims.slice(0, 5).map((claim, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-md border border-gray-200">
                          {claim}
                        </span>
                      ))}
                      {identity.claims.length > 5 && (
                        <span className="text-xs text-gray-500 px-3 py-1">
                          +{identity.claims.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {identities.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 text-sm">No identities configured</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthorizePage;
