/** Compose the model-derived reference sheet. Requires sharp (no site dependency). */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const sharp=require('sharp');
const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'references');
const blob=fs.readFileSync(path.join(root,'model/repokun.glb'));
const digest=createHash('sha256').update(blob).digest('hex');
const hash=digest.slice(0,12);
if(fs.readFileSync(path.join(out,'model-views/model-source.sha256'),'utf8').trim()!==digest)
  throw new Error('Model changed: regenerate reference views before composing the sheet');
for(const name of ['front','three-quarter','left-profile','back','wave','hop']){
  const file=path.join(out,'model-views',name+'.png');
  const meta=await sharp(file).metadata();
  if(meta.width!==2000||meta.height!==1334||!meta.hasAlpha) throw new Error('Bad reference view: '+name);
  for(const edge of [
    {left:0,top:0,width:2000,height:1},{left:0,top:1333,width:2000,height:1},
    {left:0,top:0,width:1,height:1334},{left:1999,top:0,width:1,height:1334},
  ]){
    const {data,info}=await sharp(file).extract(edge).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let i=3;i<data.length;i+=info.channels)
      if(data[i]!==0) throw new Error('Clipped silhouette: '+name);
  }
}
const gltf=JSON.parse(blob.subarray(20,20+blob.readUInt32LE(12)).toString());
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const palette=[['warm ivory','IVORY'],['charcoal','CHARCOAL'],['vermilion','RED'],['peach cheeks','CHEEKS'],['tongue','TONGUE']].map(([name,label])=>{
  const m=gltf.materials.find(m=>m.name===`RepoKun • ${name}`);
  const hex=m.pbrMetallicRoughness.baseColorFactor.slice(0,3).map(c=>Math.round(255*(c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055)).toString(16).padStart(2,'0')).join('').toUpperCase();
  return {label,hex};
});
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1334" viewBox="0 0 2000 1334"><defs><style>text{font-family:Arial,sans-serif;fill:#3E3028}.muted{fill:#7D7065}.small{font-size:19px;letter-spacing:1px}.label{font-weight:700;font-size:23px;letter-spacing:1.8px}</style></defs><rect width="2000" height="1334" fill="#FAF5ED"/>`;
const text=(x,y,value,size=24,weight=400,cls='')=>svg+=`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" class="${cls}">${escape(value)}</text>`;
const line=(x,y,w)=>svg+=`<path d="M${x} ${y}h${w}" stroke="#DDCBB8" stroke-width="2"/>`;
function image(name,x,y,w){
  const png=fs.readFileSync(path.join(out,'model-views',name+'.png'));
  svg+=`<image x="${x}" y="${y}" width="${w}" height="${w*1334/2000}" href="data:image/png;base64,${png.toString('base64')}"/>`;
}
text(64,88,'RepoKun',66,700);
text(394,84,'CHARACTER REFERENCE',26,700);
text(64,130,'A model-derived guide for consistent scenes, articles and animation.',25,400,'muted');
text(1590,72,'RETRO PORTING TOOLKIT',21,700);
text(1590,107,'3D ASSET • 09 SEP 2026',19,400,'muted');
line(64,157,1872);
text(64,196,'01 / TURNAROUND',23,700);
text(1100,196,'Orthographic views · identical scale · neutral pose',22,400,'muted');
for(const [i,name,label,detail] of [
  [0,'front','FRONT','D-pad left · buttons right'],
  [1,'three-quarter','THREE-QUARTER','Shell depth + facial relief'],
  [2,'left-profile','LEFT PROFILE',"Character’s own left side"],
  [3,'back','BACK','Plain shell · no extra face'],
]){
  const x=64+i*472;
  svg+=`<rect x="${x}" y="222" width="456" height="410" rx="20" fill="#F0E5D6"/>`;
  image(name,x-72,218,600);
  line(x+24,568,408);
  text(x+24,596,label,22,700);
  text(x+24,619,detail,18,400,'muted');
}
text(64,699,'02 / POSE LANGUAGE',23,700);
text(1056,699,'03 / IDENTITY + MATERIALS',23,700);
for(const [i,name,label,detail] of [
  [0,'front','REST','Neutral rig'],[1,'wave','WAVE','Wave · frame 30'],[2,'hop','HOP','Hop · frame 18'],
]){
  const x=64+i*312;
  svg+=`<rect x="${x}" y="726" width="296" height="360" rx="20" fill="#F0E5D6"/>`;
  image(name,x-67,747,430);
  line(x+20,1025,256);
  text(x+20,1051,label,22,700);
  text(x+20,1076,detail,18,400,'muted');
}
text(1056,757,'One shell. Two arms. Two feet.',27,700);
text(1056,800,'Broad limb roots enter the body; only the tips round off.',23);
text(1056,839,'D-pad: viewer’s LEFT. Red buttons: viewer’s RIGHT.',23);
text(1056,878,'Preserve the smile, cheeks and diagonal button layout.',23);
text(1056,930,'BASE COLORS / sRGB',20,700);
text(1056,959,'Read from the GLB. Lighting changes their rendered appearance.',20,400,'muted');
palette.forEach(({label,hex},i)=>{
  const x=1056+i*176;
  svg+=`<rect x="${x}" y="982" width="150" height="48" rx="12" fill="#${hex}" stroke="#D9C6B2"/>`;
  text(x,1056,label,17,700);
  text(x,1082,'#'+hex,19,400,'muted');
});
line(64,1123,1872);
text(64,1170,'USE THE MODEL, NOT A RE-DRAW',23,700);
text(64,1207,'Import model/repokun.blend or model/repokun.glb unchanged.',23);
text(64,1244,'Pose the existing rig; build props and environments around it.',23);
text(1056,1170,'ORIENTATION + OUTPUT',23,700);
text(1056,1207,'Front −Y · up +Z · floor Z = 0 · height 3.22 units',23);
text(1056,1244,'Bone .L = character’s left. Article renders: 2000 × 1334.',23);
text(64,1300,'Source: actual mesh + supplied animation clips. No AI-invented viewpoints.',19,400,'muted');
text(1390,1300,'MODEL SHA-256 / '+hash,18,400,'muted');
svg+='</svg>';
fs.writeFileSync(path.join(out,'repokun-reference-sheet.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(out,'repokun-reference-sheet.png'));
const result=await sharp(path.join(out,'repokun-reference-sheet.png')).metadata();
if(result.width!==2000||result.height!==1334) throw new Error('Unexpected reference-sheet size');
console.log(`Reference sheet: ${result.width} × ${result.height}; model ${hash}`);
