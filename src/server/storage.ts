import fs from 'fs';
import path from 'path';
import { DataFile, ConfigFile, SettingsFile } from './types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const LOGO_FILE = path.join(DATA_DIR, 'logo.png');
const DEFAULT_LOGO_FILE = path.join(DATA_DIR, 'logo-ulvio-revert.png');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function isInstalled(): boolean {
  return fs.existsSync(DATA_FILE) && fs.existsSync(CONFIG_FILE);
}

export function loadData(): DataFile | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading data.json:', error);
    return null;
  }
}

export function loadConfig(): ConfigFile | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading config.json:', error);
    return null;
  }
}

export function saveData(data: DataFile): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function saveConfig(config: ConfigFile): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function saveLogo(buffer: Buffer): void {
  fs.writeFileSync(LOGO_FILE, buffer);
}

export function getLogoPath(): string {
  if (fs.existsSync(LOGO_FILE)) {
    return LOGO_FILE;
  }
  return DEFAULT_LOGO_FILE;
}

export function hasLogo(): boolean {
  return fs.existsSync(LOGO_FILE) || fs.existsSync(DEFAULT_LOGO_FILE);
}

/**
 * Redacts sensitive values for logging
 */
function redactSecret(value: string | undefined): string {
  if (!value) return '(empty)';
  if (value.length <= 4) return '***';
  return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
}

/**
 * Loads settings with environment variable override support
 *
 * Priority order:
 * 1. Environment variables (highest priority)
 * 2. settings.json file (fallback)
 * 3. Default values (empty strings)
 *
 * Environment variables:
 * - MOCK_CLIENT_ID: Override client.clientId
 * - MOCK_CLIENT_SECRET: Override client.clientSecret
 * - MOCK_REDIRECT_URI: Override client.redirectUri
 */
export function loadSettings(): SettingsFile {
  let fileSettings: SettingsFile | null = null;

  // Load from file if it exists
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      fileSettings = JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading settings.json:', error);
  }

  // Default edge cases
  const defaultEdgeCases = {
    invalidRedirectUri: false,
    invalidScope: false,
    invalidClient: false,
    expiredToken: false,
    missingClaims: false
  };

  // Merge settings with environment variable overrides
  const clientId = process.env.MOCK_CLIENT_ID || fileSettings?.client?.clientId || '';
  const clientSecret = process.env.MOCK_CLIENT_SECRET || fileSettings?.client?.clientSecret || '';
  const redirectUri = process.env.MOCK_REDIRECT_URI || fileSettings?.client?.redirectUri || '';

  const settings: SettingsFile = {
    client: {
      clientId,
      clientSecret,
      redirectUri
    },
    edgeCases: fileSettings?.edgeCases || defaultEdgeCases
  };

  // Validation: Fail fast if required values are missing
  if (!settings.client.clientSecret) {
    throw new Error(
      'Client secret is required. Set MOCK_CLIENT_SECRET environment variable or provide client.clientSecret in settings.json'
    );
  }

  if (!settings.client.clientId) {
    throw new Error(
      'Client ID is required. Set MOCK_CLIENT_ID environment variable or provide client.clientId in settings.json'
    );
  }

  if (!settings.client.redirectUri) {
    throw new Error(
      'Redirect URI is required. Set MOCK_REDIRECT_URI environment variable or provide client.redirectUri in settings.json'
    );
  }

  // Log configuration source (with secret redaction)
  const usingEnvVars = !!(process.env.MOCK_CLIENT_ID || process.env.MOCK_CLIENT_SECRET || process.env.MOCK_REDIRECT_URI);
  const usingFileConfig = !!fileSettings;

  if (usingEnvVars) {
    console.log('✓ Using environment variable overrides for OAuth client configuration');
    if (process.env.MOCK_CLIENT_ID) {
      console.log(`  - MOCK_CLIENT_ID: ${settings.client.clientId}`);
    }
    if (process.env.MOCK_CLIENT_SECRET) {
      console.log(`  - MOCK_CLIENT_SECRET: ${redactSecret(settings.client.clientSecret)}`);
    }
    if (process.env.MOCK_REDIRECT_URI) {
      console.log(`  - MOCK_REDIRECT_URI: ${settings.client.redirectUri}`);
    }
  }

  if (usingFileConfig && fileSettings?.client?.clientSecret) {
    console.warn('⚠️  Warning: Loading clientSecret from settings.json file');
    console.warn('   For better security, use MOCK_CLIENT_SECRET environment variable instead');
  }

  // Log final configuration (with secret redaction)
  console.log('OAuth Client Configuration:');
  console.log(`  - Client ID: ${settings.client.clientId}`);
  console.log(`  - Client Secret: ${redactSecret(settings.client.clientSecret)}`);
  console.log(`  - Redirect URI: ${settings.client.redirectUri}`);

  return settings;
}

export function saveSettings(settings: SettingsFile): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}
