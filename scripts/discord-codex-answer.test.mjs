import {it,expect} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {codexAnswerArgs,publicAnswerContext} from './discord-codex-answer.mjs';
import {isRunnerUnavailable,runnerCooldownUntil,DEFAULT_RUNNER_COOLDOWN_MS} from './discord-agent-core.mjs';
it('recognizes weekly and session limits, without treating ordinary failures as quota',()=>{
 for(const text of ["You've hit your weekly limit · resets Sep 27 at 9pm (America/Los_Angeles)","You've hit your session limit"]){expect(isRunnerUnavailable(text)).toBe(true);expect(runnerCooldownUntil(text,1000)).toBe(1000+DEFAULT_RUNNER_COOLDOWN_MS);}
 expect(isRunnerUnavailable('Test failed')).toBe(false);
});
it('disables local and connected tools and inherited instructions for Codex answers',()=>{
 const args=codexAnswerArgs('/tmp/answer','/tmp/answer/out','model');
 for(const flag of ['--ignore-user-config','--ignore-rules','features.shell_tool=false','features.multi_agent=false','features.apps=false','features.remote_plugin=false','features.browser_use=false','features.code_mode_host=false','tools.view_image=false','project_doc_max_bytes=0','web_search="disabled"'])expect(args).toContain(flag);
 expect(args[args.indexOf('-C')+1]).toBe('/tmp/answer');
});
it('supplies published content but excludes drafts, operational files, and symlinks',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rpt-public-context-'));
 try{
  for(const [name,fm,body] of [['01_public','title: Public','PUBLIC'],['02_draft','title: Secret\ndraft: true','DRAFT']]){const d=path.join(root,'data/games',name);fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,'index.md'),`---\n${fm}\n---\n${body}`);}
  fs.writeFileSync(path.join(root,'AGENTS.md'),'PRIVATE');fs.symlinkSync(path.join(root,'data/games/02_draft'),path.join(root,'data/games/03_link'));
  const context=publicAnswerContext(root,'Public','https://example.com');expect(context).toContain('PUBLIC');expect(context).toContain('https://example.com/games/public');expect(context).not.toMatch(/DRAFT|PRIVATE|Secret/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
