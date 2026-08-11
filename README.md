# Mock OIDC Provider

A generic, configurable OpenID Connect (OIDC) Identity Provider for testing and development purposes. This application allows you to quickly set up a mock OIDC server with custom identities and claims.

## Features

- **Easy Setup**: Simple web-based installer for initial configuration
- **Configurable Identities**: Define custom user identities with any claims you need
- **Full OIDC Support**: Implements standard OIDC endpoints and flows
- **Docker Ready**: Containerized application for easy deployment
- **HTTP Basic Auth**: Optional authentication protection for the admin interface
- **Custom Branding**: Configure logo, title, and accent color
- **Base Path Support**: Run under a custom URL path

## Quick Start

### Local Development

1. **Install dependencies**

    ```bash
    npm install
    ```

2. **Configure OAuth client credentials**

    Copy the environment template and configure your OAuth client settings:

    ```bash
    cp .env.template .env
    # Edit .env and set MOCK_CLIENT_ID, MOCK_CLIENT_SECRET, and MOCK_REDIRECT_URI
    ```

3. **Build the application**

    ```bash
    npm run build
    ```

4. **Start the server**

    ```bash
    npm start
    ```

5. **Access the installer**

    Open your browser to `http://localhost:3000` and complete the setup wizard.

## Configuration

### Environment Variables

| Variable             | Description                              | Default                                    | Required |
| -------------------- | ---------------------------------------- | ------------------------------------------ | -------- |
| `PORT`               | Server port                              | `3000`                                     | No       |
| `WEB_USER`           | HTTP Basic Auth username                 | -                                          | No       |
| `WEB_PASS`           | HTTP Basic Auth password                 | -                                          | No       |
| `BASE_PATHNAME`      | Base path for all routes (e.g., `/oidc`) | ``                                         | No       |
| `BASE_URL`           | Full base URL for OIDC issuer            | `http://localhost:${PORT}${BASE_PATHNAME}` | No       |
| `MOCK_CLIENT_ID`     | OAuth client ID (overrides settings.json) | -                                          | Yes*     |
| `MOCK_CLIENT_SECRET` | OAuth client secret (overrides settings.json) | -                                     | Yes*     |
| `MOCK_REDIRECT_URI`  | OAuth redirect URI (overrides settings.json) | -                                      | Yes*     |

\* Required unless provided in `settings.json` file

### OAuth Client Configuration

The OIDC provider requires OAuth client credentials to validate authorization requests. You can configure these using either environment variables (recommended) or a `settings.json` file.

**Priority order:**
1. Environment variables (highest priority)
2. `settings.json` file (fallback)

#### Using Environment Variables (Recommended)

Environment variables are the recommended approach for production deployments as they keep sensitive credentials out of version control.

```bash
export MOCK_CLIENT_ID="your-client-id"
export MOCK_CLIENT_SECRET="your-client-secret"
export MOCK_REDIRECT_URI="http://localhost:4200/api/auth/callback"
```

#### Using settings.json File

Alternatively, you can create a `data/settings.json` file (a template is provided at `data/settings.template.json`):

```json
{
  "client": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "redirectUri": "http://localhost:4200/api/auth/callback"
  },
  "edgeCases": {
    "invalidRedirectUri": false,
    "invalidScope": false,
    "invalidClient": false,
    "expiredToken": false,
    "missingClaims": false
  }
}
```

**Security Warning:** If using `settings.json` to store secrets, add it to `.gitignore` to prevent committing sensitive data.

### Docker Compose Example

```yaml
version: '3.8'

services:
    mock-oidc-provider:
        build: .
        ports:
            - '3000:3000'
        environment:
            PORT: 3000
            WEB_USER: admin
            WEB_PASS: secretpassword
            BASE_PATHNAME: /oidc
            BASE_URL: https://identity.example.com/oidc
            # OAuth client configuration
            MOCK_CLIENT_ID: "careportal-client"
            MOCK_CLIENT_SECRET: "${MOCK_CLIENT_SECRET}"  # Use from .env or 1Password
            MOCK_REDIRECT_URI: "http://localhost:4200/api/auth/callback"
        volumes:
            - ./data:/app/data
        restart: unless-stopped
```

### Using 1Password CLI

For local development with 1Password:

**Option 1: .env template with injection**
```bash
# Copy the template and add 1Password references
cp .env.template .env

# Edit .env and replace values with 1Password references:
# MOCK_CLIENT_SECRET=op://Dev/mock-identity/clientSecret

# Inject secrets and start
op inject -i .env -o .env.local
docker-compose --env-file .env.local up -d
```

**Option 2: Direct op run**
```bash
# Run docker-compose with 1Password secret injection
op run --env-file=.env.template -- docker-compose up -d
```

## Data Configuration

All configuration files are stored in the `data` directory and mounted as a Docker volume.

> **Note:** The Docker image is built on [Docker Hardened Images](https://docs.docker.com/dhi/) and runs as
> the non-root `node` user (uid/gid 1000). When bind-mounting `./data`, make sure the host directory is
> writable by uid 1000, otherwise the app cannot persist its configuration:
>
> ```bash
> sudo chown -R 1000:1000 ./data
> ```
>
> Named Docker volumes inherit the correct ownership automatically and need no extra step.

### Settings File Format (settings.json)

OAuth client configuration - can be overridden by environment variables:

```json
{
  "client": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "redirectUri": "http://localhost:4200/api/auth/callback"
  },
  "edgeCases": {
    "invalidRedirectUri": false,
    "invalidScope": false,
    "invalidClient": false,
    "expiredToken": false,
    "missingClaims": false
  }
}
```

### Identities File Format (data.json)

The identities file defines the users that can authenticate through this provider:

```json
{
    "identities": [
        {
            "name": "john.doe",
            "description": "John Doe - Developer",
            "claims": [
                "email=john.doe@example.com",
                "given_name=John",
                "family_name=Doe",
                "role=developer",
                "department=Engineering"
            ]
        },
        {
            "name": "jane.smith",
            "description": "Jane Smith - Admin",
            "claims": [
                "email=jane.smith@example.com",
                "given_name=Jane",
                "family_name=Smith",
                "role=admin",
                "department=IT"
            ]
        }
    ]
}
```

**Structure**:

- `identities`: Array of identity objects
    - `name`: Unique identifier for the identity (used as `sub` in tokens)
    - `description`: Human-readable description
    - `claims`: Array of strings in `key=value` format that will be included in the ID token

### Configuration File Format

Automatically created during installation:

```json
{
    "title": "My OIDC Provider",
    "accentColor": "#3B82F6"
}
```

### Logo

- Upload a PNG or JPG logo during installation
- Maximum file size: 5MB
- If no logo is uploaded, the default logo is used
- Logo is served at `/api/logo`

## OIDC Endpoints

Once installed, the following OIDC endpoints are available:

- **Discovery Document**: `GET /.well-known/openid-configuration`
- **Authorization Endpoint**: `GET /authorize`
- **Token Endpoint**: `POST /token`
- **JWKS Endpoint**: `GET /.well-known/jwks.json`

### Example OIDC Client Configuration

```javascript
{
  issuer: 'http://localhost:3000',
  authorization_endpoint: 'http://localhost:3000/authorize',
  token_endpoint: 'http://localhost:3000/token',
  jwks_uri: 'http://localhost:3000/.well-known/jwks.json',
}
```

## Authentication Flow

1. Client initiates authorization by redirecting to `/authorize` with required parameters
2. User is presented with identity selection page
3. Upon selection, an authorization code is generated and returned to the client
4. Client exchanges the code for tokens at `/token` endpoint
5. ID token includes all custom claims defined for the selected identity

## Data Persistence

All configuration is stored in the `data` directory:

- `data/data.json`: Identity definitions
- `data/config.json`: Application configuration (title, accent color)
- `data/settings.json`: OAuth client configuration (optional if using environment variables)
- `data/logo.png`: Custom logo (if uploaded)
- `data/logo-ulvio-revert.png`: Default logo (bundled with app)

When running in Docker, mount the `./data` directory to persist configuration across container restarts.

### Migration Guide: Moving Secrets to Environment Variables

If you're currently using `settings.json` to store the client secret:

1. **Extract the secret from settings.json:**
   ```bash
   # View your current secret
   cat data/settings.json | grep clientSecret
   ```

2. **Store in 1Password or your secrets manager:**
   ```bash
   # Example: Store in 1Password
   op item create --category=password \
     --title="Mock OIDC Client Secret" \
     --vault=Dev \
     clientSecret=<your-secret-here>
   ```

3. **Update docker-compose.yml to use environment variables:**
   ```yaml
   environment:
     MOCK_CLIENT_SECRET: "${MOCK_CLIENT_SECRET}"
   ```

4. **Remove the secret from settings.json:**
   ```json
   {
     "client": {
       "clientId": "careportal-client",
       "redirectUri": "http://localhost:4200/api/auth/callback"
     }
   }
   ```

5. **Add settings.json to .gitignore** (if not already present)

6. **Commit the sanitized settings.json** (or use a settings.template.json instead)

## Security Notes

⚠️ **This is a mock provider intended for development and testing only!**

- Does not implement real authentication or authorization
- Uses in-memory key generation (keys change on restart)
- No client validation beyond basic checks
- Not suitable for production use

### Security Best Practices

**For secrets management:**
- ✅ **Use environment variables** for client secrets (recommended)
- ✅ **Store secrets in a secrets manager** (1Password, AWS Secrets Manager, etc.)
- ✅ **Add settings.json to .gitignore** if it contains secrets
- ❌ **Never commit secrets to version control**
- ⚠️ The application will log a warning if loading secrets from `settings.json`
- ✅ Secrets are **automatically redacted** in application logs

**For production environments**, use a proper OIDC provider like:
- Keycloak
- Auth0
- Okta
- Azure AD
- AWS Cognito

## Development

### Project Structure

```
mock-oidc-provider/
├── src/
│   ├── server/          # Backend TypeScript code
│   │   ├── server.ts    # Main Express server
│   │   ├── oidc.ts      # OIDC provider logic
│   │   ├── auth.ts      # HTTP Basic Auth middleware
│   │   ├── storage.ts   # File storage utilities
│   │   └── types.ts     # TypeScript type definitions
│   └── client/          # Frontend React code
│       ├── App.tsx      # Main React component
│       ├── pages/       # React pages
│       └── index.css    # Tailwind CSS
├── data/                # Configuration storage
├── dist/                # Compiled output
├── Dockerfile           # Docker image definition
└── docker-compose.yml   # Docker Compose configuration
```

### Build Commands

```bash
# Build everything
npm run build

# Build server only
npm run build:server

# Build client only
npm run build:client

# Development mode (build and run)
npm run dev
```
