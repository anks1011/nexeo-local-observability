"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLogError = parseLogError;
function parseLogError(json) {
    if (!json || typeof json !== 'object') {
        return {};
    }
    // 1. Already structured `error` object
    if (json.error && typeof json.error === 'object') {
        return {
            error: {
                type: json.error.type || 'Error',
                operation: json.error.operation,
                code: json.error.code,
                message: json.error.message || json.message || 'Unknown error',
                stack: json.error.stack,
            }
        };
    }
    // 2. Legacy/Raw error formats in `message`
    if (typeof json.message === 'string') {
        const msg = json.message;
        let type = 'Error';
        let operation;
        let code;
        let errorMessage = msg;
        let stack;
        let overrideTopLevelMessage;
        // Prisma error format
        const invocationMatch = msg.match(/Invalid `?prisma\.([a-zA-Z0-9_$]+)\(\)`? invocation/i);
        if (invocationMatch) {
            operation = invocationMatch[1];
            type = 'PrismaQueryError';
            overrideTopLevelMessage = 'Database query execution failed';
            const codeMatch = msg.match(/Code:\s*`([^`]+)`/i);
            if (codeMatch) {
                code = codeMatch[1];
            }
            const messageMatch = msg.match(/Message:\s*`([^`]+)`/i);
            if (messageMatch) {
                errorMessage = messageMatch[1];
            }
        }
        else {
            // Generic Error with stack trace
            if (msg.includes('    at ')) {
                stack = msg;
                errorMessage = msg.split('\n')[0];
                // Attempt to extract Type from "TypeError: xxx"
                const typeMatch = errorMessage.match(/^([a-zA-Z0-9_]+Error):\s*(.*)/);
                if (typeMatch) {
                    type = typeMatch[1];
                    errorMessage = typeMatch[2];
                }
            }
        }
        return {
            error: {
                type,
                operation,
                code,
                message: errorMessage,
                stack,
            },
            message: overrideTopLevelMessage
        };
    }
    return {};
}
