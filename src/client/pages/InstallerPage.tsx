import { useState } from 'react';

interface InstallerPageProps {
  onInstalled: () => void;
}

type Step = 'welcome' | 'branding' | 'identities' | 'review' | 'installing';

interface Identity {
  name: string;
  description: string;
  claims: string[];
}

function InstallerPage({ onInstalled }: InstallerPageProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [title, setTitle] = useState('Mock OIDC Provider');
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [identitiesJson, setIdentitiesJson] = useState('');
  const [identitiesFile, setIdentitiesFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [parsedIdentities, setParsedIdentities] = useState<Identity[]>([]);

  const steps: { id: Step; title: string; description: string }[] = [
    { id: 'welcome', title: 'Welcome', description: 'Get started' },
    { id: 'branding', title: 'Branding', description: 'Customize appearance' },
    { id: 'identities', title: 'Identities', description: 'Configure users' },
    { id: 'review', title: 'Review', description: 'Confirm settings' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const validateIdentities = (data: string): boolean => {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.identities || !Array.isArray(parsed.identities)) {
        setError('Invalid format: must have "identities" array');
        return false;
      }
      for (const identity of parsed.identities) {
        if (!identity.name || !identity.description || !identity.claims) {
          setError('Each identity must have name, description, and claims');
          return false;
        }
        if (!Array.isArray(identity.claims)) {
          setError('Claims must be an array of strings like ["key=value", ...]');
          return false;
        }
        for (const claim of identity.claims) {
          if (typeof claim !== 'string' || !claim.includes('=')) {
            setError('Each claim must be a string in format "key=value"');
            return false;
          }
        }
      }
      setParsedIdentities(parsed.identities);
      setError('');
      return true;
    } catch (err) {
      setError('Invalid JSON format');
      return false;
    }
  };

  const handleIdentitiesFileChange = async (file: File | null) => {
    setIdentitiesFile(file);
    if (file) {
      const text = await file.text();
      setIdentitiesJson(text);
      validateIdentities(text);
    }
  };

  const handleIdentitiesJsonChange = (text: string) => {
    setIdentitiesJson(text);
    setIdentitiesFile(null);
    if (text.trim()) {
      validateIdentities(text);
    } else {
      setParsedIdentities([]);
      setError('');
    }
  };

  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case 'welcome':
        return true;
      case 'branding':
        return title.trim() !== '' && accentColor !== '';
      case 'identities':
        return parsedIdentities.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    } else if (currentStep === 'review') {
      handleInstall();
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleInstall = async () => {
    setCurrentStep('installing');
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('accentColor', accentColor);

      if (identitiesFile) {
        formData.append('identitiesFile', identitiesFile);
      } else if (identitiesJson) {
        formData.append('identitiesJson', identitiesJson);
      }

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch('/api/install', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Installation failed');
      }

      // Success - wait a moment for effect
      setTimeout(() => {
        onInstalled();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
      setCurrentStep('review');
    }
  };

  const exampleJson = `{
  "identities": [
    {
      "name": "john.doe",
      "description": "John Doe - Developer",
      "claims": [
        "email=john.doe@example.com",
        "given_name=John",
        "family_name=Doe",
        "role=developer"
      ]
    },
    {
      "name": "jane.smith",
      "description": "Jane Smith - Admin",
      "claims": [
        "email=jane.smith@example.com",
        "given_name=Jane",
        "family_name=Smith",
        "role=admin"
      ]
    }
  ]
}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Step Indicator */}
        {currentStep !== 'installing' && (
          <div className="mb-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                        index < currentStepIndex
                          ? 'bg-green-500 text-white'
                          : index === currentStepIndex
                          ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {index < currentStepIndex ? '✓' : index + 1}
                    </div>
                    <div className="mt-2 text-center">
                      <div
                        className={`font-semibold text-sm ${
                          index === currentStepIndex ? 'text-blue-600' : 'text-gray-600'
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-4 rounded transition-all duration-300 ${
                        index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      style={{ maxWidth: '100px', marginTop: '-40px' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-h-[calc(100vh-180px)] flex flex-col">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="p-8 overflow-y-auto">
              <div className="text-center max-w-2xl mx-auto">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center mb-4">
                    <svg
                      className="w-12 h-12 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome to Mock OIDC Provider
                  </h1>
                  <p className="text-lg text-gray-600 mb-6">
                    Let's set up your development identity provider in just a few steps
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <div className="text-2xl mb-1">🎨</div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">Custom Branding</h3>
                    <p className="text-xs text-gray-600">Personalize with your logo and colors</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <div className="text-2xl mb-1">👥</div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">Test Identities</h3>
                    <p className="text-xs text-gray-600">Configure mock users with custom claims</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl mb-1">🚀</div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">OIDC Ready</h3>
                    <p className="text-xs text-gray-600">Full OAuth2/OIDC implementation</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This is a development tool. Do not use in production environments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Branding Step */}
          {currentStep === 'branding' && (
            <div className="p-8 overflow-y-auto">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Customize Your Brand</h2>
                <p className="text-gray-600 mb-6">
                  Make this identity provider your own with custom branding
                </p>

                <div className="space-y-6">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Logo (Optional)
                    </label>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                          ) : (
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                          Upload a PNG or JPG (max 5MB). A default logo will be used if none is provided.
                        </p>
                        {logoFile && (
                          <button
                            type="button"
                            onClick={() => handleLogoChange(null)}
                            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                      Application Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="My OIDC Provider"
                      required
                    />
                  </div>

                  {/* Accent Color */}
                  <div>
                    <label htmlFor="accentColor" className="block text-sm font-semibold text-gray-700 mb-2">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        id="accentColor"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-10 w-16 rounded-lg cursor-pointer border-2 border-gray-200"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        placeholder="#3B82F6"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      This color will be used for buttons and accents throughout the interface
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-4">Preview</p>
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain" />
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                        )}
                        <h3 className="text-xl font-bold text-gray-900">{title || 'Mock OIDC Provider'}</h3>
                      </div>
                      <button
                        type="button"
                        style={{ backgroundColor: accentColor }}
                        className="px-6 py-2 text-white rounded-lg font-semibold"
                      >
                        Example Button
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Identities Step */}
          {currentStep === 'identities' && (
            <div className="p-8 overflow-y-auto">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Identities</h2>
                <p className="text-gray-600 mb-6">
                  Define the mock users that will be available for authentication
                </p>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Upload Option */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-blue-900 mb-2">
                          Upload JSON File
                        </label>
                        <input
                          type="file"
                          accept="application/json"
                          onChange={(e) => handleIdentitiesFileChange(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                        />
                        {identitiesFile && (
                          <p className="mt-2 text-sm text-green-700 font-medium">
                            ✓ {identitiesFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-4 text-sm font-semibold text-gray-500">OR</span>
                    </div>
                  </div>

                  {/* Paste JSON Option */}
                  <div>
                    <label htmlFor="identitiesJson" className="block text-sm font-semibold text-gray-700 mb-3">
                      Paste JSON
                    </label>
                    <textarea
                      id="identitiesJson"
                      value={identitiesJson}
                      onChange={(e) => handleIdentitiesJsonChange(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm h-48 resize-none"
                      placeholder={exampleJson}
                    />
                  </div>

                  {/* Example */}
                  <details className="bg-gray-50 rounded-lg border-2 border-gray-200">
                    <summary className="cursor-pointer p-4 font-semibold text-gray-700 hover:text-blue-600 transition-colors">
                      📖 View Example JSON Format
                    </summary>
                    <div className="px-4 pb-4">
                      <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
{exampleJson}
                      </pre>
                    </div>
                  </details>

                  {/* Parsed Identities Preview */}
                  {parsedIdentities.length > 0 && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                      <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Successfully parsed {parsedIdentities.length} identit{parsedIdentities.length === 1 ? 'y' : 'ies'}
                      </h3>
                      <div className="space-y-2">
                        {parsedIdentities.map((identity, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900">{identity.name}</p>
                              <p className="text-sm text-gray-600">{identity.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {identity.claims.length} claim{identity.claims.length === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="p-8 overflow-y-auto">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Configuration</h2>
                <p className="text-gray-600 mb-6">
                  Please review your settings before completing the installation
                </p>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Branding Summary */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">🎨</span>
                      Branding
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="h-16 w-16 object-contain border-2 border-gray-200 rounded-lg p-2" />
                        ) : (
                          <div className="h-16 w-16 bg-gray-100 border-2 border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                            Default
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">Logo</p>
                          <p className="font-medium text-gray-900">{logoFile ? logoFile.name : 'Using default logo'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Title</p>
                          <p className="font-medium text-gray-900">{title}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Accent Color</p>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border-2 border-gray-200" style={{ backgroundColor: accentColor }}></div>
                            <p className="font-medium text-gray-900 font-mono text-sm">{accentColor}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Identities Summary */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">👥</span>
                      Identities ({parsedIdentities.length})
                    </h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {parsedIdentities.map((identity, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{identity.name}</p>
                              <p className="text-sm text-gray-600 mb-2">{identity.description}</p>
                              <details className="text-xs">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                                  View {identity.claims.length} claim{identity.claims.length === 1 ? '' : 's'}
                                </summary>
                                <div className="mt-2 p-2 bg-gray-900 text-green-400 rounded text-xs">
                                  {identity.claims.map((claim, i) => (
                                    <div key={i}>{claim}</div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ready to Install */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Ready to Install</h3>
                        <p className="text-sm text-blue-700">
                          Click "Complete Installation" to finish the setup. Your OIDC provider will be ready to use immediately.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Installing Step */}
          {currentStep === 'installing' && (
            <div className="p-8">
              <div className="max-w-md mx-auto text-center">
                <div className="mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center animate-pulse">
                    <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Installing...</h2>
                <p className="text-gray-600 mb-8">
                  Setting up your Mock OIDC Provider. This will only take a moment.
                </p>
                <div className="space-y-3 text-left bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center gap-3 text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Saving configuration...</span>
                  </div>
                  <div className="flex items-center gap-3 text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Creating identities...</span>
                  </div>
                  <div className="flex items-center gap-3 text-blue-600">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Initializing OIDC endpoints...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          {currentStep !== 'installing' && (
            <div className="border-t-2 border-gray-100 px-8 py-4 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="text-sm text-gray-500">
                Step {currentStepIndex + 1} of {steps.length}
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedToNextStep()}
                style={canProceedToNextStep() ? { backgroundColor: accentColor } : {}}
                className="px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {currentStep === 'review' ? (
                  <>
                    Complete Installation
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Next
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstallerPage;
