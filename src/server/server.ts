import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { basicAuthMiddleware } from './auth.js';
import { OIDCProvider } from './oidc.js';
import * as storage from './storage.js';
import { DataFile, ConfigFile } from './types.js';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_PATHNAME = process.env.BASE_PATHNAME || '';

// Remove trailing slash from base pathname
const basePathname = BASE_PATHNAME.replace(/\/$/, '');

// Create OIDC provider instance
const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}${basePathname}`;
const oidcProvider = new OIDCProvider(baseUrl);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Serve static files (React app) - exclude index.html to handle it separately
app.use(`${basePathname}/`, express.static(path.join(__dirname, 'public'), { index: false }));

// Serve logo
app.get(`${basePathname}/api/logo`, (req, res) => {
  const logoPath = storage.getLogoPath();
  res.sendFile(logoPath);
});

// Check installation status
app.get(`${basePathname}/api/status`, (req, res) => {
  res.json({
    installed: storage.isInstalled(),
    basePathname
  });
});

// Get configuration (requires installation)
app.get(`${basePathname}/api/config`, basicAuthMiddleware, (req, res) => {
  const config = storage.loadConfig();
  if (!config) {
    return res.status(404).json({ error: 'Configuration not found' });
  }
  res.json(config);
});

// Get identities (requires installation)
app.get(`${basePathname}/api/identities`, basicAuthMiddleware, (req, res) => {
  const data = storage.loadData();
  if (!data) {
    return res.status(404).json({ error: 'Data not found' });
  }
  res.json(data.identities);
});

// Installation endpoint
app.post(`${basePathname}/api/install`, upload.fields([
  { name: 'identitiesFile', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), (req, res) => {
  try {
    // Check if already installed
    if (storage.isInstalled()) {
      return res.status(400).json({ error: 'Already installed' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { title, accentColor, identitiesJson } = req.body;

    // Validate required fields
    if (!title || !accentColor) {
      return res.status(400).json({ error: 'Title and accent color are required' });
    }

    // Parse identities data
    let identitiesData: DataFile;

    if (files.identitiesFile && files.identitiesFile[0]) {
      // From uploaded file
      try {
        identitiesData = JSON.parse(files.identitiesFile[0].buffer.toString('utf-8'));
      } catch (error) {
        return res.status(400).json({ error: 'Invalid identities JSON file' });
      }
    } else if (identitiesJson) {
      // From JSON string
      try {
        identitiesData = JSON.parse(identitiesJson);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid identities JSON' });
      }
    } else {
      return res.status(400).json({ error: 'Identities data is required' });
    }

    // Validate identities structure
    if (!identitiesData.identities || !Array.isArray(identitiesData.identities)) {
      return res.status(400).json({ error: 'Invalid identities structure. Must have "identities" array' });
    }

    for (const identity of identitiesData.identities) {
      if (!identity.name || !identity.description || !identity.claims) {
        return res.status(400).json({
          error: 'Each identity must have name, description, and claims'
        });
      }
    }

    // Save data and config
    storage.saveData(identitiesData);
    storage.saveConfig({ title, accentColor });

    // Save logo if provided
    if (files.logo && files.logo[0]) {
      storage.saveLogo(files.logo[0].buffer);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Installation error:', error);
    res.status(500).json({ error: 'Installation failed' });
  }
});

// Update configuration (requires installation and auth)
app.post(`${basePathname}/api/config`, basicAuthMiddleware, (req, res) => {
  if (!storage.isInstalled()) {
    return res.status(400).json({ error: 'Not installed' });
  }

  const { title, accentColor } = req.body;
  if (!title || !accentColor) {
    return res.status(400).json({ error: 'Title and accent color are required' });
  }

  storage.saveConfig({ title, accentColor });
  res.json({ success: true });
});

// Update identities (requires installation and auth)
app.post(`${basePathname}/api/identities`, basicAuthMiddleware, (req, res) => {
  if (!storage.isInstalled()) {
    return res.status(400).json({ error: 'Not installed' });
  }

  const { identities } = req.body;
  if (!identities || !Array.isArray(identities)) {
    return res.status(400).json({ error: 'Invalid identities array' });
  }

  for (const identity of identities) {
    if (!identity.name || !identity.description || !identity.claims) {
      return res.status(400).json({
        error: 'Each identity must have name, description, and claims'
      });
    }
  }

  storage.saveData({ identities });
  res.json({ success: true });
});

// Get settings (requires installation and auth)
app.get(`${basePathname}/api/settings`, basicAuthMiddleware, (req, res) => {
  if (!storage.isInstalled()) {
    return res.status(400).json({ error: 'Not installed' });
  }

  const settings = storage.loadSettings();
  res.json(settings);
});

// Update settings (requires installation and auth)
app.post(`${basePathname}/api/settings`, basicAuthMiddleware, (req, res) => {
  if (!storage.isInstalled()) {
    return res.status(400).json({ error: 'Not installed' });
  }

  const { client, edgeCases } = req.body;

  if (!client || !edgeCases) {
    return res.status(400).json({ error: 'Client config and edge cases are required' });
  }

  storage.saveSettings({ client, edgeCases });
  res.json({ success: true });
});

// OIDC Discovery endpoint
app.get(`${basePathname}/.well-known/openid-configuration`, (req, res) => {
  res.json(oidcProvider.getDiscoveryDocument());
});

// JWKS endpoint
app.get(`${basePathname}/.well-known/jwks.json`, (req, res) => {
  res.json(oidcProvider.getJWKS());
});

// Authorization endpoint
app.get(`${basePathname}/authorize`, (req, res) => {
  if (!storage.isInstalled()) {
    return res.status(503).send('Provider not configured');
  }

  const {
    client_id,
    redirect_uri,
    response_type,
    scope,
    state
  } = req.query as Record<string, string>;

  // Load edge case settings
  const settings = storage.loadSettings();

  // Validate basic parameters
  if (!client_id || !redirect_uri || response_type !== 'code') {
    return res.status(400).send('Invalid request: missing or invalid parameters');
  }

  // Edge case: Invalid Redirect URI - ALWAYS reject when enabled
  if (settings.edgeCases.invalidRedirectUri) {
    return res.status(400).send(`<!DOCTYPE html>
<html><head><title>Invalid Redirect URI</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(to bottom right,#f9fafb,#e5e7eb);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:white;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1);max-width:500px;width:100%;padding:32px}.header{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #fee2e2}.icon{width:48px;height:48px;background:#fee2e2;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}h1{font-size:20px;color:#1f2937;margin:0;font-weight:700}.code{display:inline-block;background:#fee2e2;color:#dc2626;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;margin-top:4px}p{color:#6b7280;line-height:1.6;margin:20px 0}.details{background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:8px}.details-title{font-weight:600;color:#374151;margin-bottom:8px;font-size:13px}.details-content{font-size:13px;color:#6b7280;word-break:break-all;line-height:1.6}.notice{margin-top:20px;padding:12px;background:#dbeafe;border-radius:8px;font-size:12px;color:#1e40af}</style></head><body><div class="container"><div class="header"><div class="icon">⚠️</div><div><h1>Invalid Redirect URI</h1><span class="code">invalid_request</span></div></div><p>The redirect URI provided in the authorization request is not valid or not registered for this client.</p><div class="details"><div class="details-title">Request Details</div><div class="details-content"><strong>Redirect URI:</strong> ${redirect_uri}<br><strong>Client ID:</strong> ${client_id}</div></div><div class="notice">🧪 This is a simulated edge case error for testing purposes.</div></div></body></html>`);
  }

  // Edge case: Invalid Scope - ALWAYS reject when enabled
  if (settings.edgeCases.invalidScope) {
    return res.status(400).send(`<!DOCTYPE html>
<html><head><title>Invalid Scope</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(to bottom right,#f9fafb,#e5e7eb);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:white;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1);max-width:500px;width:100%;padding:32px}.header{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #fef3c7}.icon{width:48px;height:48px;background:#fef3c7;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}h1{font-size:20px;color:#1f2937;margin:0;font-weight:700}.code{display:inline-block;background:#fef3c7;color:#d97706;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;margin-top:4px}p{color:#6b7280;line-height:1.6;margin:20px 0}.details{background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:8px}.details-title{font-weight:600;color:#374151;margin-bottom:8px;font-size:13px}.details-content{font-size:13px;color:#6b7280;line-height:1.6}.notice{margin-top:20px;padding:12px;background:#dbeafe;border-radius:8px;font-size:12px;color:#1e40af}</style></head><body><div class="container"><div class="header"><div class="icon">🔒</div><div><h1>Invalid Scope</h1><span class="code">invalid_scope</span></div></div><p>The requested scope is invalid, unknown, or malformed. The scope must include "openid" for OIDC authentication.</p><div class="details"><div class="details-title">Request Details</div><div class="details-content"><strong>Requested Scope:</strong> ${scope || '(none)'}<br><strong>Required:</strong> openid</div></div><div class="notice">🧪 This is a simulated edge case error for testing purposes.</div></div></body></html>`);
  }

  // Edge case: Invalid Client - ALWAYS reject when enabled
  if (settings.edgeCases.invalidClient) {
    return res.status(401).send(`<!DOCTYPE html>
<html><head><title>Invalid Client</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(to bottom right,#f9fafb,#e5e7eb);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:white;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1);max-width:500px;width:100%;padding:32px}.header{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid#fee2e2}.icon{width:48px;height:48px;background:#fee2e2;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}h1{font-size:20px;color:#1f2937;margin:0;font-weight:700}.code{display:inline-block;background:#fee2e2;color:#dc2626;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;margin-top:4px}p{color:#6b7280;line-height:1.6;margin:20px 0}.details{background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:8px}.details-title{font-weight:600;color:#374151;margin-bottom:8px;font-size:13px}.details-content{font-size:13px;color:#6b7280;word-break:break-all;line-height:1.6}.notice{margin-top:20px;padding:12px;background:#dbeafe;border-radius:8px;font-size:12px;color:#1e40af}</style></head><body><div class="container"><div class="header"><div class="icon">🚫</div><div><h1>Invalid Client</h1><span class="code">unauthorized_client</span></div></div><p>The client is not authorized to request an authorization code using this method, or the client is not recognized.</p><div class="details"><div class="details-title">Request Details</div><div class="details-content"><strong>Client ID:</strong> ${client_id}</div></div><div class="notice">🧪 This is a simulated edge case error for testing purposes.</div></div></body></html>`);
  }

  // Create authorization request
  const authId = oidcProvider.createAuthorizationRequest({
    client_id,
    redirect_uri,
    response_type,
    scope,
    state
  });

  // Redirect to identity selection page
  res.redirect(`${basePathname}/?auth=${authId}`);
});

// Authorization callback (identity selection)
app.post(`${basePathname}/api/authorize/select`, (req, res) => {
  if (!storage.isInstalled()) {
    return res.status(503).json({ error: 'Provider not configured' });
  }

  const { authId, identityName } = req.body;
  if (!authId || !identityName) {
    return res.status(400).json({ error: 'Missing authId or identityName' });
  }

  const authRequest = oidcProvider.getAuthorizationRequest(authId);
  if (!authRequest) {
    return res.status(400).json({ error: 'Invalid or expired authorization request' });
  }

  // Verify identity exists
  const data = storage.loadData();
  const identity = data?.identities.find(i => i.name === identityName);
  if (!identity) {
    return res.status(400).json({ error: 'Identity not found' });
  }

  // Generate authorization code
  const code = oidcProvider.createAuthorizationCode(authId, identityName);

  // Build redirect URL
  const separator = authRequest.redirect_uri.includes('?') ? '&' : '?';
  const redirectUrl = `${authRequest.redirect_uri}${separator}code=${code}${
    authRequest.state ? `&state=${authRequest.state}` : ''
  }`;

  res.json({ redirectUrl });
});

// Token endpoint
app.post(`${basePathname}/token`, (req, res) => {
  if (!storage.isInstalled()) {
    return res.status(503).json({
      error: 'service_unavailable',
      error_description: 'Provider not configured'
    });
  }

  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    client_secret
  } = req.body;

  // Load edge case settings
  const settings = storage.loadSettings();

  // Validate grant type
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only authorization_code grant type is supported'
    });
  }

  // Edge case: Invalid Client - ALWAYS reject when enabled (token endpoint also checks this)
  if (settings.edgeCases.invalidClient) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Client authentication failed. This is a simulated edge case error.'
    });
  }

  // Validate authorization code
  const authCode = oidcProvider.validateAuthorizationCode(code, redirect_uri);
  if (!authCode) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code'
    });
  }

  // Load identity
  const data = storage.loadData();
  const identity = data?.identities.find(i => i.name === authCode.identityName);
  if (!identity) {
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Identity not found'
    });
  }

  // Generate tokens with edge case settings
  const tokens = oidcProvider.generateTokens(identity, client_id, {
    expiredToken: settings.edgeCases.expiredToken,
    missingClaims: settings.edgeCases.missingClaims
  });
  res.json(tokens);
});

// Serve index.html with base pathname injected
const serveIndexHtml = (req: express.Request, res: express.Response) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf-8');

  // Replace placeholder with actual base pathname (use string literal for JS)
  html = html.replace(/window\.__BASE_PATHNAME__ = '__BASE_PATHNAME__';/g,
    `window.__BASE_PATHNAME__ = '${basePathname || ''}';`);

  // If we have a base pathname, rewrite all asset paths to include it
  if (basePathname) {
    // Rewrite script src attributes
    html = html.replace(/src="\/([^"]+)"/g, `src="${basePathname}/$1"`);
    // Rewrite link href attributes for stylesheets
    html = html.replace(/href="\/([^"]+\.css)"/g, `href="${basePathname}/$1"`);
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};

// Serve index.html for the root and any SPA routes (simple fallback for unmatched routes)
app.get(basePathname || '/', serveIndexHtml);

app.listen(PORT, () => {
  console.log(`\n🚀 Mock OIDC Provider`);
  console.log(`📍 Server running at: http://localhost:${PORT}${basePathname}`);
  console.log(`🔍 Discovery: http://localhost:${PORT}${basePathname}/.well-known/openid-configuration`);
  console.log(`📦 Installation status: ${storage.isInstalled() ? 'Configured' : 'Needs setup'}\n`);
});
