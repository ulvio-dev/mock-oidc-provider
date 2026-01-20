import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthorizationRequest, AuthCode, Identity } from './types.js';

export class OIDCProvider {
  private privateKey: { publicKey: string; privateKey: string };
  private pendingAuthorizations = new Map<string, AuthorizationRequest>();
  private authCodes = new Map<string, AuthCode>();
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.privateKey = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
  }

  getDiscoveryDocument() {
    return {
      issuer: this.baseUrl,
      authorization_endpoint: `${this.baseUrl}/authorize`,
      token_endpoint: `${this.baseUrl}/token`,
      jwks_uri: `${this.baseUrl}/.well-known/jwks.json`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email']
    };
  }

  getJWKS() {
    const jwk = crypto.createPublicKey(this.privateKey.publicKey);
    const keyObject = jwk.export({ format: 'jwk' });

    return {
      keys: [{
        ...keyObject,
        kid: 'mock-key-1',
        alg: 'RS256',
        use: 'sig'
      }]
    };
  }

  createAuthorizationRequest(params: {
    client_id: string;
    redirect_uri: string;
    response_type: string;
    scope?: string;
    state?: string;
  }): string {
    const authId = uuidv4();
    this.pendingAuthorizations.set(authId, {
      ...params,
      createdAt: Date.now()
    });
    return authId;
  }

  getAuthorizationRequest(authId: string): AuthorizationRequest | undefined {
    return this.pendingAuthorizations.get(authId);
  }

  createAuthorizationCode(authId: string, identityName: string): string {
    const authRequest = this.pendingAuthorizations.get(authId);
    if (!authRequest) {
      throw new Error('Authorization request not found');
    }

    const code = uuidv4();
    this.authCodes.set(code, {
      clientId: authRequest.client_id,
      redirectUri: authRequest.redirect_uri,
      identityName,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    this.pendingAuthorizations.delete(authId);
    return code;
  }

  validateAuthorizationCode(code: string, redirectUri: string): AuthCode | null {
    const authCode = this.authCodes.get(code);
    if (!authCode) {
      return null;
    }

    if (authCode.redirectUri !== redirectUri) {
      return null;
    }

    if (Date.now() > authCode.expiresAt) {
      this.authCodes.delete(code);
      return null;
    }

    this.authCodes.delete(code);
    return authCode;
  }

  generateTokens(identity: Identity, clientId: string, options?: {
    expiredToken?: boolean;
    missingClaims?: boolean;
  }): {
    access_token: string;
    token_type: string;
    expires_in: number;
    id_token: string;
  } {
    const now = Math.floor(Date.now() / 1000);
    let expiresIn = 3600; // 1 hour
    let exp = now + expiresIn;

    // Edge case: Expired Token
    if (options?.expiredToken) {
      exp = now - 3600; // Set expiration to 1 hour ago
      expiresIn = -3600; // Negative expires_in to indicate already expired
    }

    // Parse claims array into key-value object
    const customClaims: Record<string, any> = {};

    // Edge case: Missing Claims - skip adding custom claims
    if (!options?.missingClaims) {
      for (const claim of identity.claims) {
        const [key, ...valueParts] = claim.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('='); // Handle values with '=' in them
          customClaims[key.trim()] = value.trim();
        }
      }
    }

    const tokenClaims = {
      sub: identity.name,
      iss: this.baseUrl,
      aud: clientId,
      exp: exp,
      iat: now,
      auth_time: now,
      ...customClaims
    };

    const idToken = jwt.sign(tokenClaims, this.privateKey.privateKey, {
      algorithm: 'RS256',
      keyid: 'mock-key-1'
    });

    const accessToken = jwt.sign({
      sub: identity.name,
      iss: this.baseUrl,
      aud: clientId,
      exp: exp,
      iat: now,
      scope: 'openid profile'
    }, this.privateKey.privateKey, {
      algorithm: 'RS256'
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.abs(expiresIn), // Return positive value for compatibility
      id_token: idToken
    };
  }
}
