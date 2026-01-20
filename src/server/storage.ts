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

export function loadSettings(): SettingsFile {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      // Return defaults
      return {
        client: {
          clientId: '',
          clientSecret: '',
          redirectUri: ''
        },
        edgeCases: {
          invalidRedirectUri: false,
          invalidScope: false,
          invalidClient: false,
          expiredToken: false,
          missingClaims: false
        }
      };
    }
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading settings.json:', error);
    return {
      client: {
        clientId: '',
        clientSecret: '',
        redirectUri: ''
      },
      edgeCases: {
        invalidRedirectUri: false,
        invalidScope: false,
        invalidClient: false,
        expiredToken: false,
        missingClaims: false
      }
    };
  }
}

export function saveSettings(settings: SettingsFile): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}
