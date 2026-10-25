const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const hash=data=>createHash('sha256').update(data).digest('hex');
test('standalone package has three runtime files and the license matching current source',async()=>{
 const metadata=JSON.parse(await fs.readFile(path.join(__dirname,'package.json'),'utf8'));
 const manifest=JSON.parse(await fs.readFile(path.join(__dirname,'manifest.json'),'utf8'));
 const versions=JSON.parse(await fs.readFile(path.join(__dirname,'versions.json'),'utf8'));
 assert.equal(metadata.version,manifest.version);
 assert.equal(versions[manifest.version],manifest.minAppVersion);
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'today-package-test-'));
 try{
  const {buildPackage}=await import('./scripts/package.mjs');const output=await buildPackage({outDir:temp});
  const cliOutput=execFileSync(process.execPath,[path.join(__dirname,'scripts/package.mjs')],{cwd:temp,encoding:'utf8'}).trim();assert.equal(cliOutput,path.join(__dirname,'dist','ctz-today-sidebar.zip'));
  const entries=execFileSync('unzip',['-Z1',output],{encoding:'utf8'}).trim().split('\n');assert.equal(entries.length,4);
  for(const file of ['main.js','manifest.json','styles.css','LICENSE']){assert.ok(entries.includes('ctz-today-sidebar/'+file));assert.equal(hash(execFileSync('unzip',['-p',output,'ctz-today-sidebar/'+file])),hash(await fs.readFile(path.join(__dirname,file))));}
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('version hook synchronizes metadata, preserves history and rejects incompatible rewrites',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'today-version-test-'));
 try{
  const script=path.join(__dirname,'scripts/version-bump.mjs');
  await fs.writeFile(path.join(temp,'manifest.json'),JSON.stringify({id:'ctz-today-sidebar',version:'0.6.1',minAppVersion:'1.7.2'}));
  await fs.writeFile(path.join(temp,'versions.json'),JSON.stringify({'0.6.1':'1.7.2','0.5.0':'1.6.0'}));
  const run=version=>execFileSync(process.execPath,[script],{cwd:temp,env:{...process.env,npm_package_version:version},stdio:'pipe'});
  run('0.7.0');
  assert.equal(JSON.parse(await fs.readFile(path.join(temp,'manifest.json'),'utf8')).version,'0.7.0');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(temp,'versions.json'),'utf8')),{'0.6.1':'1.7.2','0.5.0':'1.6.0','0.7.0':'1.7.2'});
  const before=await fs.readFile(path.join(temp,'manifest.json'),'utf8');
  assert.throws(()=>run('0.7.1-beta.1'),/X.Y.Z/);
  assert.throws(()=>run('0.5.0'),/must not be overwritten/);
  assert.equal(await fs.readFile(path.join(temp,'manifest.json'),'utf8'),before);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('package rejects mismatched versions and missing runtime or license files before publishing',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'today-package-bad-'));
 try{
  const {buildPackage}=await import('./scripts/package.mjs');
  for(const file of ['package.json','manifest.json','main.js','styles.css','LICENSE'])await fs.copyFile(path.join(__dirname,file),path.join(temp,file));
  const metadata=JSON.parse(await fs.readFile(path.join(temp,'package.json'),'utf8'));metadata.version='0.0.0';await fs.writeFile(path.join(temp,'package.json'),JSON.stringify(metadata));await assert.rejects(buildPackage({projectRoot:temp}),/version mismatch/);
  const manifest=JSON.parse(await fs.readFile(path.join(temp,'manifest.json'),'utf8'));metadata.version=manifest.version;await fs.writeFile(path.join(temp,'package.json'),JSON.stringify(metadata));await fs.unlink(path.join(temp,'LICENSE'));await assert.rejects(buildPackage({projectRoot:temp}),/ENOENT/);await fs.copyFile(path.join(__dirname,'LICENSE'),path.join(temp,'LICENSE'));await fs.unlink(path.join(temp,'styles.css'));await assert.rejects(buildPackage({projectRoot:temp}),/ENOENT/);await assert.rejects(fs.access(path.join(temp,'dist','ctz-today-sidebar.zip')));
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
