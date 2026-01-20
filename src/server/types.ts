export interface Identity {
  name: string;
  description: string;
  claims: string[];
}

export interface DataFile {
  identities: Identity[];
}

export interface ConfigFile {
  title: string;
  accentColor: string;
}

export interface ClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface EdgeCases {
  invalidRedirectUri: boolean;
  invalidScope: boolean;
  invalidClient: boolean;
  expiredToken: boolean;
  missingClaims: boolean;
}

export interface SettingsFile {
  client: ClientConfig;
  edgeCases: EdgeCases;
}

export interface AuthorizationRequest {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope?: string;
  state?: string;
  createdAt: number;
}

export interface AuthCode {
  clientId: string;
  redirectUri: string;
  identityName: string;
  createdAt: number;
  expiresAt: number;
}
