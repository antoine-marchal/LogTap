import { validateToken } from '../services/token.js';
import { ErrorCodes, createErrorResponse } from '../utils/errors.js';

export function createAuthMiddleware(config) {
  return function authMiddleware(req, res, next) {
    const token = req.query.token || req.headers['x-api-token'] || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json(
        createErrorResponse('Missing authentication token', ErrorCodes.MISSING_TOKEN)
      );
    }

    if (!validateToken(token, config)) {
      return res.status(401).json(
        createErrorResponse('Invalid authentication token', ErrorCodes.INVALID_TOKEN)
      );
    }

    req.authenticatedToken = token;
    next();
  };
}

export function optionalAuth(config) {
  return function optionalAuthMiddleware(req, res, next) {
    const token = req.query.token || req.headers['x-api-token'] || req.headers.authorization?.replace('Bearer ', '');

    if (token && validateToken(token, config)) {
      req.authenticatedToken = token;
      req.isAuthenticated = true;
    } else {
      req.isAuthenticated = false;
    }

    next();
  };
}

export default { createAuthMiddleware, optionalAuth };
