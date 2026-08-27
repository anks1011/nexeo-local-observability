import { normalizeSql, normalizeElasticsearch } from '../src/query-normalizer';

describe('query-normalizer', () => {
  describe('normalizeSql', () => {
    it('normalizes positional parameters to $N', () => {
      const q1 = 'SELECT * FROM users WHERE id = $1';
      const q2 = 'SELECT * FROM users WHERE id = $2';
      expect(normalizeSql(q1)).toBe('SELECT * FROM users WHERE id = ?');
      expect(normalizeSql(q2)).toBe('SELECT * FROM users WHERE id = ?');
    });

    it('normalizes string literals to $V', () => {
      const q1 = "SELECT * FROM users WHERE name = 'Alice'";
      const q2 = "SELECT * FROM users WHERE name = 'Bob'";
      expect(normalizeSql(q1)).toBe("SELECT * FROM users WHERE name = '?'");
      expect(normalizeSql(q2)).toBe("SELECT * FROM users WHERE name = '?'");
    });

    it('normalizes numeric literals to $V', () => {
      const q1 = 'SELECT * FROM users LIMIT 1 OFFSET 0';
      const q2 = 'SELECT * FROM users LIMIT 10 OFFSET 20';
      expect(normalizeSql(q1)).toBe('SELECT * FROM users LIMIT ? OFFSET ?');
      expect(normalizeSql(q2)).toBe('SELECT * FROM users LIMIT ? OFFSET ?');
    });

    it('normalizes IN lists', () => {
      const q1 = 'SELECT * FROM users WHERE id IN (1, 2, 3)';
      const q2 = 'SELECT * FROM users WHERE id IN (4, 5)';
      expect(normalizeSql(q1)).toBe('SELECT * FROM users WHERE id IN (?)');
      expect(normalizeSql(q2)).toBe('SELECT * FROM users WHERE id IN (?)');
    });

    it('normalizes ANY arrays', () => {
      const q1 = 'SELECT * FROM users WHERE id = ANY(ARRAY[1,2])';
      expect(normalizeSql(q1)).toBe('SELECT * FROM users WHERE id = ANY(?)');
    });

    it('handles the complex example from user', () => {
      const q1 = 'SELECT "all_account_access" FROM "internal_users" WHERE ("id" = CAST($1 AS uuid)) LIMIT $2';
      expect(normalizeSql(q1)).toBe('SELECT "all_account_access" FROM "internal_users" WHERE ("id" = CAST(? AS uuid)) LIMIT ?');
    });
  });

  describe('normalizeElasticsearch', () => {
    it('normalizes basic shapes', () => {
      const req = {
        method: 'POST',
        path: '/my_index/_search',
        body: {
          query: {
            term: {
              status: 'active'
            }
          },
          size: 10
        }
      };
      const expected = 'ES: POST /my_index/_search {"query":{"term":{"status":"?"}},"size":"?"}';
      expect(normalizeElasticsearch(req)).toBe(expected);
    });

    it('normalizes document IDs in path', () => {
      const req = {
        method: 'GET',
        path: '/my_index/_doc/a1b2c3d4e5f6g7h8i9j0k1l2',
      };
      const expected = 'ES: GET /my_index/_doc/$ID ';
      expect(normalizeElasticsearch(req)).toBe(expected);
    });
  });
});
