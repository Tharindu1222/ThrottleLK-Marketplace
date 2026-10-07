import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function specs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? specs(path)
      : /\.spec\.tsx?$/.test(entry.name)
        ? [path]
        : [];
  });
}
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', ...specs('src')],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
