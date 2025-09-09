// Shim module: some pages reference /src/pages/artifact.js while the implementation
// lives in artifact-admin.js. Import the admin script so the module path resolves.
import './artifact-admin.js';

export default {};
