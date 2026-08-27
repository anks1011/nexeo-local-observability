"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDACTED = void 0;
exports.redactObject = redactObject;
exports.REDACTED = '[REDACTED]';
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
function redactObject(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(redactObject);
    }
    const redactedObj = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
            redactedObj[key] = exports.REDACTED;
        }
        else {
            redactedObj[key] = redactObject(value);
        }
    }
    return redactedObj;
}
