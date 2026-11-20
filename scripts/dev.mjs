import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2).filter(arg => arg !== '--strictPort');
const nextArgs = args.map(arg => arg === '--host' ? '--hostname' : arg);
const hasHost = nextArgs.some(arg => arg === '--hostname' || arg.startsWith('--hostname=') || arg === '-H');
if (!hasHost) nextArgs.push('--hostname', '127.0.0.1');

const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const server = spawn(process.execPath, [next, 'dev', ...nextArgs], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', code => { process.exitCode = code ?? 1; });
