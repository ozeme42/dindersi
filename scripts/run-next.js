const fs = require('fs');

// Resolve junction if cwd is a symlink or junction across drive letters (e.g. C: junction to D:).
// Next.js internal path resolution uses path.relative(process.cwd(), realPath), which returns
// an absolute path when crossing Windows drive letters, causing malformed paths
// like 'C:\...\D:\...\routes-manifest.json' and ENOENT 500 errors.
try {
  const realCwd = fs.realpathSync(process.cwd());
  if (process.cwd() !== realCwd) {
    process.chdir(realCwd);
    process.env.PWD = realCwd;
  }
} catch (e) {
  // Ignore error if realpath fails
}

require('next/dist/bin/next');
