import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const project = new URL('../', import.meta.url);
const output = new URL('dist/', project);

// Only browser assets go into the hosted site. Tests, local playtest records,
// server code, and repository files stay outside the deployment artifact.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('index.html', project), new URL('index.html', output));
await cp(new URL('src/', project), new URL('src/', output), { recursive: true });
await writeFile(new URL('.nojekyll', output), '');
console.log('Static site ready in dist/');
