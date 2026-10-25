import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

export async function buildPackage({projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),outDir=path.join(projectRoot,'dist')}={}) {
  const manifest=JSON.parse(await fs.readFile(path.join(projectRoot,'manifest.json'),'utf8'));
  const metadata=JSON.parse(await fs.readFile(path.join(projectRoot,'package.json'),'utf8'));
  if(manifest.id!=='ctz-today-sidebar'||manifest.version!==metadata.version)throw Error('Plugin identity or package version mismatch');
  const files=['main.js','manifest.json','styles.css','LICENSE'];
  for(const file of files)if(!(await fs.stat(path.join(projectRoot,file))).size)throw Error('Empty package file: '+file);
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'ctz-today-package-'));
  try{
    const folder=path.join(temp,manifest.id);await fs.mkdir(folder);
    for(const file of files)await fs.copyFile(path.join(projectRoot,file),path.join(folder,file));
    const zip=path.join(temp,'bundle.zip');
    execFileSync('zip',['-q','-X',zip,...files.map(file=>manifest.id+'/'+file)],{cwd:temp});
    await fs.mkdir(outDir,{recursive:true});const output=path.join(outDir,manifest.id+'.zip');
    await fs.rename(zip,output);return output;
  }finally{await fs.rm(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await buildPackage());
