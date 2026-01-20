import { useEffect, useState } from 'react';

interface Config {
  title: string;
  accentColor: string;
}

interface Identity {
  name: string;
  description: string;
  claims: string[];
}

interface ClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface EdgeCases {
  invalidRedirectUri: boolean;
  invalidScope: boolean;
  invalidClient: boolean;
  expiredToken: boolean;
  missingClaims: boolean;
}

interface Settings {
  client: ClientConfig;
  edgeCases: EdgeCases;
}

function DashboardPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then(res => res.json()),
      fetch('/api/identities').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
    ])
      .then(([configData, identitiesData, settingsData]) => {
        setConfig(configData);
        setIdentities(identitiesData);
        setSettings(settingsData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data:', err);
        setLoading(false);
      });
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage('Error saving settings');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
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

  const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
  const accentColor = config?.accentColor || '#3B82F6';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <img src="/api/logo" alt="Logo" className="h-12 w-12 object-contain" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {config?.title || 'Mock OIDC Provider'}
              </h1>
              <p className="text-gray-600">Identity Provider Dashboard</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Configuration */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Client Configuration
              </h2>

              {settings && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={settings.client.clientId}
                      onChange={(e) => setSettings({
                        ...settings,
                        client: { ...settings.client, clientId: e.target.value }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="my-client-id"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Client Secret
                    </label>
                    <input
                      type="text"
                      value={settings.client.clientSecret}
                      onChange={(e) => setSettings({
                        ...settings,
                        client: { ...settings.client, clientSecret: e.target.value }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="my-secret-key"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Redirect URI
                    </label>
                    <input
                      type="text"
                      value={settings.client.redirectUri}
                      onChange={(e) => setSettings({
                        ...settings,
                        client: { ...settings.client, redirectUri: e.target.value }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="http://localhost:3000/callback"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Edge Cases */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Edge Case Testing
              </h2>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  Enable these options to test error handling in your application
                </p>
              </div>

              {settings && (
                <div className="space-y-3">
                  {[
                    { key: 'invalidRedirectUri', label: 'Invalid Redirect URI', desc: 'Returns error instead of redirecting' },
                    { key: 'invalidScope', label: 'Invalid Scope', desc: 'Returns invalid_scope error' },
                    { key: 'invalidClient', label: 'Invalid Client', desc: 'Returns invalid_client error' },
                    { key: 'expiredToken', label: 'Expired Token', desc: 'Issues tokens that expired 1 hour ago' },
                    { key: 'missingClaims', label: 'Missing Claims', desc: 'Omit custom claims from ID token' },
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={settings.edgeCases[key as keyof EdgeCases]}
                        onChange={(e) => setSettings({
                          ...settings,
                          edgeCases: { ...settings.edgeCases, [key]: e.target.checked }
                        })}
                        className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">{label}</div>
                        <div className="text-xs text-gray-600">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                style={{ backgroundColor: accentColor }}
                className="px-6 py-3 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Settings
                  </>
                )}
              </button>
              {saveMessage && (
                <span className={`text-sm font-medium ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Identities</span>
                  <span className="font-bold text-blue-600 text-xl">{identities.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="text-green-600 font-semibold">● Ready</span>
                </div>
              </div>
            </div>

            {/* Identities List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Identities</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {identities.map((identity) => (
                  <div key={identity.name} className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-semibold text-gray-900 text-sm">{identity.name}</div>
                    <div className="text-xs text-gray-600">{identity.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{identity.claims.length} claims</div>
                  </div>
                ))}
              </div>
            </div>

            {/* OIDC Endpoints */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">OIDC Endpoints</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-semibold text-gray-700 mb-1">Discovery</div>
                  <code className="block bg-gray-100 px-2 py-1 rounded break-all">
                    {baseUrl}/.well-known/openid-configuration
                  </code>
                </div>
                <div>
                  <div className="font-semibold text-gray-700 mb-1">Authorization</div>
                  <code className="block bg-gray-100 px-2 py-1 rounded break-all">
                    {baseUrl}/authorize
                  </code>
                </div>
                <div>
                  <div className="font-semibold text-gray-700 mb-1">Token</div>
                  <code className="block bg-gray-100 px-2 py-1 rounded break-all">
                    {baseUrl}/token
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
