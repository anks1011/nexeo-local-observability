const { interpolatePostgresQuery } = require('./packages/log-parser/dist/index.js');
const query = `INSERT INTO "settings" ("entity_type", "entity_id") VALUES ($1, CAST($2 AS uuid))`;
const params = [ `["organization", "a0000000-0000-0000-0000-000000000010"]` ];
console.log(interpolatePostgresQuery(query, params));
