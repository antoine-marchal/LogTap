import { ErrorCodes, createErrorResponse } from '../utils/errors.js';

const RESERVED_PARAMS = ['token'];

const MONGODB_OPERATORS = ['$', '{', '}'];

const MAX_FIELD_LENGTH = 256;
const MAX_VALUE_LENGTH = 4096;
const MAX_FIELDS = 50;

function sanitizeValue(value) {
  if (typeof value !== 'string') {
    return String(value);
  }

  for (const op of MONGODB_OPERATORS) {
    if (value.includes(op)) {
      value = value.replace(new RegExp('\\' + op, 'g'), '');
    }
  }

  return value;
}

function sanitizeKey(key) {
  let sanitized = key.replace(/[.$]/g, '_');

  if (sanitized.startsWith('_') && !['_receivedAt', '_ip', '_userAgent'].includes(sanitized)) {
    sanitized = 'field' + sanitized;
  }

  return sanitized;
}

export function validateLogRequest(req, res, next) {
  const params = { ...req.query };

  delete params.token;

  const fieldCount = Object.keys(params).length;
  if (fieldCount > MAX_FIELDS) {
    return res.status(400).json(
      createErrorResponse(
        `Too many fields. Maximum is ${MAX_FIELDS}, received ${fieldCount}`,
        ErrorCodes.VALIDATION_ERROR
      )
    );
  }

  const sanitizedParams = {};
  const warnings = [];

  for (const [key, value] of Object.entries(params)) {
    if (RESERVED_PARAMS.includes(key.toLowerCase())) {
      continue;
    }

    if (key.length > MAX_FIELD_LENGTH) {
      warnings.push(`Field name "${key.substring(0, 20)}..." truncated`);
      continue;
    }

    const sanitizedKey = sanitizeKey(key);
    let sanitizedValue = value;

    if (typeof value === 'string') {
      if (value.length > MAX_VALUE_LENGTH) {
        sanitizedValue = value.substring(0, MAX_VALUE_LENGTH);
        warnings.push(`Value for "${key}" truncated to ${MAX_VALUE_LENGTH} characters`);
      }
      sanitizedValue = sanitizeValue(sanitizedValue);
    } else if (Array.isArray(value)) {
      sanitizedValue = value.map(v => sanitizeValue(String(v)));
    }

    sanitizedParams[sanitizedKey] = sanitizedValue;
  }

  req.logParams = sanitizedParams;
  req.validationWarnings = warnings;

  next();
}

export function addMetadata(req, res, next) {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';

  req.logMetadata = {
    _receivedAt: new Date(),
    _ip: clientIp,
    _userAgent: req.headers['user-agent'] || null
  };

  next();
}

export default { validateLogRequest, addMetadata };
