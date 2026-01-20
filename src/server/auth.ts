import { Request, Response, NextFunction } from 'express';

const WEB_USER = process.env.WEB_USER;
const WEB_PASS = process.env.WEB_PASS;

export function basicAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // If no credentials are configured, allow access
  if (!WEB_USER || !WEB_PASS) {
    return next();
  }

  // Get authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Mock OIDC Provider"');
    res.status(401).send('Authentication required');
    return;
  }

  // Decode credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  // Validate credentials
  if (username === WEB_USER && password === WEB_PASS) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Mock OIDC Provider"');
  res.status(401).send('Invalid credentials');
}
