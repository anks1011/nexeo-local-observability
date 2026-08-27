export interface ParsedError {
    type: string;
    message: string;
    operation?: string;
    code?: string;
    stack?: string;
}
export declare function parseLogError(json: any): {
    error?: ParsedError;
    message?: string;
};
