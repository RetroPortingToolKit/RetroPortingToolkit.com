// Never let integration tests invoke the real, logged-in Codex CLI.
import fs from 'node:fs';
let prompt='';process.stdin.on('data',d=>prompt+=d);process.stdin.on('end',()=>{
  if(!prompt.includes('[[weekly-codex]]')) {console.error('command not found: fake codex unavailable');process.exit(127);}
  const args=process.argv.slice(2);
  if(!args.includes('--ignore-user-config') || !args.includes('features.shell_tool=false') || !prompt.includes('Only approved developers can request website edits')) process.exit(2);
  fs.writeFileSync(args[args.indexOf('--output-last-message')+1], 'Anyone can ask questions or submit a repository. Only approved developers can edit the website.');
});
