// Print minimal environment info during build to help Vercel debugging
const fs = require('fs');
const os = require('os');
console.log('--- vercel-build-info ---');
console.log('cwd:', process.cwd());
console.log('node:', process.version);
try { console.log('npm:', require('child_process').execSync('npm --version').toString().trim()); } catch (e) {}
console.log('env NODE_ENV=', process.env.NODE_ENV);
console.log('env NPM_CONFIG_PRODUCTION=', process.env.NPM_CONFIG_PRODUCTION);
console.log('ls frontend files:');
try { console.log(fs.readdirSync('.').join(', ')); } catch (e) {}
console.log('--- end vercel-build-info ---');
