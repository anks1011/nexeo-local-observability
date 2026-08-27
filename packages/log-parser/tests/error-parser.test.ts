import { parseLogError } from '../src/error-parser';

describe('parseLogError', () => {
  it('handles structured Prisma error', () => {
    const json = {
      error: {
        type: 'PrismaQueryError',
        operation: '$queryRaw',
        code: '42P01',
        message: 'relation "listing_saved_view" does not exist'
      }
    };
    const result = parseLogError(json);
    expect(result.error).toEqual(json.error);
  });

  it('handles generic structured error', () => {
    const json = {
      error: {
        type: 'Error',
        message: 'Something went wrong'
      }
    };
    const result = parseLogError(json);
    expect(result.error).toEqual(json.error);
  });

  it('handles structured error with stack', () => {
    const json = {
      error: {
        type: 'Error',
        message: 'Something went wrong',
        stack: 'Error: Something went wrong\n    at func (/app/index.js:10:5)'
      }
    };
    const result = parseLogError(json);
    expect(result.error).toEqual(json.error);
  });

  it('handles legacy raw Prisma error format and extracts code 42P01', () => {
    const json = {
      message: 'Invalid `prisma.$queryRaw()` invocation:\nRaw query failed. Code: `42P01`. Message: `relation "listing_saved_view" does not exist`'
    };
    const result = parseLogError(json);
    
    expect(result.message).toBe('Database query execution failed');
    expect(result.error).toEqual({
      type: 'PrismaQueryError',
      operation: '$queryRaw',
      code: '42P01',
      message: 'relation "listing_saved_view" does not exist',
      stack: undefined,
    });
  });

  it('handles generic legacy error with stack trace', () => {
    const json = {
      message: 'TypeError: Something is undefined\n    at Object.<anonymous> (/app/index.js:5:10)'
    };
    const result = parseLogError(json);
    
    expect(result.message).toBeUndefined();
    expect(result.error).toEqual({
      type: 'TypeError',
      operation: undefined,
      code: undefined,
      message: 'Something is undefined',
      stack: 'TypeError: Something is undefined\n    at Object.<anonymous> (/app/index.js:5:10)'
    });
  });

  it('handles generic legacy error without stack trace', () => {
    const json = {
      message: 'Just a normal text error'
    };
    const result = parseLogError(json);
    
    expect(result.message).toBeUndefined();
    expect(result.error).toEqual({
      type: 'Error',
      operation: undefined,
      code: undefined,
      message: 'Just a normal text error',
      stack: undefined
    });
  });

  it('handles missing/unknown error payload gracefully', () => {
    expect(parseLogError(null)).toEqual({});
    expect(parseLogError(undefined)).toEqual({});
    expect(parseLogError({})).toEqual({});
  });
});
