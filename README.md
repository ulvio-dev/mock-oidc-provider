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

2. **Build the application**

    ```bash
    npm run build
    ```

3. **Start the server**

    ```bash
    npm start
    ```

4. **Access the installer**

    Open your browser to `http://localhost:3000` and complete the setup wizard.

## Configuration

### Environment Variables

| Variable        | Description                              | Default                                    | Required |
| --------------- | ---------------------------------------- | ------------------------------------------ | -------- |
| `PORT`          | Server port                              | `3000`                                     | No       |
| `WEB_USER`      | HTTP Basic Auth username                 | -                                          | No       |
| `WEB_PASS`      | HTTP Basic Auth password                 | -                                          | No       |
| `BASE_PATHNAME` | Base path for all routes (e.g., `/oidc`) | ``                                         | No       |
| `BASE_URL`      | Full base URL for OIDC issuer            | `http://localhost:${PORT}${BASE_PATHNAME}` | No       |

### Docker Compose Example

```yaml
version: '3.8'

services:
    mock-oidc-provider:
        build: .
        ports:
            - '3000:3000'
        environment:
            WEB_USER: admin
            WEB_PASS: secretpassword
            BASE_PATHNAME: /oidc
            BASE_URL: https://identity.example.com/oidc
        volumes:
            - ./data:/app/data
        restart: unless-stopped
```

## Data Configuration

### Identities File Format

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
- `data/config.json`: Application configuration
- `data/logo.png`: Custom logo (if uploaded)
- `data/logo-ulvio-revert.png`: Default logo (bundled with app)

When running in Docker, mount the `./data` directory to persist configuration across container restarts.

## Security Notes

⚠️ **This is a mock provider intended for development and testing only!**

- Does not implement real authentication or authorization
- Uses in-memory key generation (keys change on restart)
- No client validation beyond basic checks
- Not suitable for production use

For production environments, use a proper OIDC provider like:

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
