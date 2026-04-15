// backend/utils/openapi.js - OpenAPI specification loader
const fs = require('fs');
const path = require('path');

let openApiSpec = null;

function getOpenApiSpec() {
  if (!openApiSpec) {
    try {
      // eslint-disable-next-line import/no-extraneous-dependencies -- runtime dep in backend/package.json
      const yaml = require('js-yaml');
      const yamlFile = path.join(__dirname, '../docs/openapi.yaml');
      const fileContents = fs.readFileSync(yamlFile, 'utf8');
      openApiSpec = yaml.load(fileContents, { schema: yaml.JSON_SCHEMA });
    } catch (err) {
      console.warn('⚠️ OpenAPI spec not loaded:', err.message);
      openApiSpec = {
        openapi: '3.0.0',
        info: { title: 'PVA Bazaar API', version: '8.0.0' },
        paths: {},
      };
    }
  }
  return openApiSpec;
}

module.exports = { getOpenApiSpec };
