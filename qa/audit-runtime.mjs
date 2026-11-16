import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
async function walk(dir='') {
 const entries=await readdir(path.join(root,dir),{withFileTypes:true});
 const files=[];
 for(const e of entries){const file=path.posix.join(dir,e.name);if(['.git','qa','data'].includes(file))continue;if(e.isDirectory())files.push(...await walk(file));else files.push(file);}
 return files;
}
const files=await walk();
const texts=await Promise.all(files.filter(f=>/\.(html|css|js)$/.test(f)&&!f.startsWith('vendor/')).map(async file=>({file,text:await readFile(file,'utf8')})));
const unused=[];
const runtimeTexts=texts.filter(t=>!t.file.startsWith('scripts/build-'));
for(const file of files.filter(f=>/\.(css|js|png|jpe?g|webp|svg)$/.test(f)&&!f.startsWith('vendor/'))){
 if(!runtimeTexts.some(t=>t.file!==file&&t.text.includes(path.posix.basename(file))))unused.push({file,bytes:(await stat(file)).size});
}
console.log(JSON.stringify({unusedCandidates:unused},null,2));
