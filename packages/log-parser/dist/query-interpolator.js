"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolatePostgresQuery = interpolatePostgresQuery;
function interpolatePostgresQuery(query, params) {
    if (!query)
        return '';
    if (!params || !Array.isArray(params) || params.length === 0)
        return query;
    let actualParams = params;
    if (actualParams.length === 1 && Array.isArray(actualParams[0])) {
        actualParams = actualParams[0];
    }
    if (actualParams.length === 1 && typeof actualParams[0] === 'string') {
        const maxParamMatch = query.match(/\$(\d+)\b/g);
        let maxParamIndex = 0;
        if (maxParamMatch) {
            maxParamIndex = Math.max(...maxParamMatch.map(m => parseInt(m.substring(1), 10)));
        }
        if (maxParamIndex > 1) {
            const parsed = parseStringifiedArray(actualParams[0]);
            if (parsed && parsed.length >= maxParamIndex) {
                actualParams = parsed;
            }
            else {
                return query;
            }
        }
    }
    return query.replace(/\$(\d+)\b/g, (match, paramIndex) => {
        const index = parseInt(paramIndex, 10) - 1; // PostgreSQL params are 1-indexed
        if (index < 0 || index >= actualParams.length) {
            return match; // Keep $N if parameter is missing
        }
        const value = actualParams[index];
        return formatSqlValue(value);
    });
}
function parseStringifiedArray(str) {
    str = str.trim();
    if (!str.startsWith('[') || !str.endsWith(']'))
        return null;
    try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed))
            return parsed;
    }
    catch (e) {
        // Ignore and fallback
    }
    const inner = str.substring(1, str.length - 1).trim();
    if (!inner)
        return [];
    const res = [];
    let current = '';
    let braces = 0;
    let brackets = 0;
    for (let i = 0; i < inner.length; i++) {
        const char = inner[i];
        if (char === '{')
            braces++;
        else if (char === '}')
            braces--;
        else if (char === '[')
            brackets++;
        else if (char === ']')
            brackets--;
        if (char === ',' && braces === 0 && brackets === 0) {
            res.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    if (current)
        res.push(current.trim());
    return res.map(r => {
        if (r.startsWith('"') && r.endsWith('"')) {
            return r.substring(1, r.length - 1);
        }
        if (r === 'null')
            return null;
        if (r === 'true')
            return true;
        if (r === 'false')
            return false;
        if (!isNaN(Number(r)) && r !== '')
            return Number(r);
        return r;
    });
}
function formatSqlValue(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'string') {
        // If it's a redacted value, keep it as string
        // Escape single quotes by doubling them up
        const escaped = value.replace(/'/g, "''");
        return `'${escaped}'`;
    }
    if (Array.isArray(value) || typeof value === 'object') {
        try {
            // Best-effort JSON representation for arrays and objects
            const jsonStr = JSON.stringify(value);
            const escaped = jsonStr.replace(/'/g, "''");
            return `'${escaped}'`;
        }
        catch (e) {
            return '[UNSUPPORTED VALUE]';
        }
    }
    return '[UNSUPPORTED VALUE]';
}
