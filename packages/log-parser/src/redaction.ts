export const REDACTED = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'password',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'apiKey',
  'api_key',
  'secret',
  'privateKey',
  'session',
  'token_hash'
]);

export function redactObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }

  const redactedObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      redactedObj[key] = REDACTED;
    } else {
      redactedObj[key] = redactObject(value);
    }
  }

  return redactedObj;
}
