import { rmSync } from 'node:fs';

for (const path of ['frontend/dist', 'backend/server.js', 'backend/server.bundle.mjs']) {
  rmSync(path, { recursive: true, force: true });
}
