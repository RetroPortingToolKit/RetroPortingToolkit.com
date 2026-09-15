import { afterEach, describe, it, expect, vi } from 'vitest';
import { importSubmissionImages, repositoryReadme } from './submissionMedia';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1cAAAAASUVORK5CYII=', 'base64');
const url = 'https://raw.githubusercontent.com/a/b/main/screen.png';
afterEach(()=>{vi.unstubAllGlobals();});
describe('media importing',()=>{
  it('prefers explicit banner artwork and keeps copied bytes independent of source URLs',async()=>{
    const fetcher=vi.fn(async (_url: string, _init: RequestInit)=>new Response(png));vi.stubGlobal('fetch',fetcher);
    const assets=await importSubmissionImages([{url,alt:'Screenshot'},{url:url+'?banner',alt:'Banner'}],[{url:url+'?readme',alt:'Readme banner'}]);
    expect(assets.map(a=>a.alt)).toEqual(['Banner','Screenshot','Readme banner']);expect(assets[0].content).toBe(png.toString('base64'));
    expect(fetcher.mock.calls[0][1]).toMatchObject({redirect:'error',headers:{accept:'*/*'}});
  });
  it('skips SVG, over-limit bodies, unavailable files, and forbidden hosts',async()=>{
    vi.stubGlobal('fetch',vi.fn(async (u:string)=>u.endsWith('large')?new Response(png,{headers:{'content-length':'5000000'}}):u.endsWith('bad')?new Response('<svg/>'):new Response('',{status:404})));
    expect(await importSubmissionImages(['large','bad','missing'].map(x=>({url:url+'?'+x,alt:x})),[{url:'https://127.0.0.1/private',alt:'x'}])).toEqual([]);
  });
  it('handles GitHub base64 README and GitLab nested README paths without credentials',async()=>{
    const fetcher=vi.fn(async(u:string)=>u.includes('api.github')?Response.json({encoding:'base64',path:'docs/README.md',content:Buffer.from('![Screen](shot.png)').toString('base64')}):new Response('![Banner](../banner.png)'));
    vi.stubGlobal('fetch',fetcher);
    expect((await repositoryReadme('https://github.com/a/b','main'))[0].url).toBe('https://raw.githubusercontent.com/a/b/main/docs/shot.png');
    expect((await repositoryReadme('https://gitlab.com/a/group/b','main','docs/README.md'))[0].url).toBe('https://gitlab.com/a/group/b/-/raw/main/banner.png');
    expect(fetcher.mock.calls[1][0]).toContain('docs%2FREADME.md/raw?ref=main');
  });
  it('bounds the number of imported images and tolerates missing README',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(png)));
    expect(await importSubmissionImages(Array.from({length:8},(_,i)=>({url:url+'?'+i,alt:'screen'})),[])).toHaveLength(4);
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:404})));
    expect(await repositoryReadme('https://github.com/a/b','main')).toEqual([]);
  });
});
