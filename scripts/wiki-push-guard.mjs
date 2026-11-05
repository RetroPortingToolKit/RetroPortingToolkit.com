// Per-task pre-push check. Installed only in a temporary directory, with any
// existing pre-push hook chained by the bridge. No repository hook is replaced.
import { execFileSync } from 'node:child_process';
import { wikiBridge } from './wiki-bridge.mjs';
try {
  const token = execFileSync('security', ['find-generic-password', '-s', 'retroportingtoolkit-discord-bot', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const access = await wikiBridge(token, process.argv[2], 'status');
  if (!access.publish) throw new Error('Publishing access revoked.');
} catch {
  console.error('Push denied: website contribution access could not be verified or has been disabled.');
  process.exitCode = 1;
}
