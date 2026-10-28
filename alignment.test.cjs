const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const dependencyRequire=process.env.WORKBENCH_NODE_MODULES?createRequire(path.join(process.env.WORKBENCH_NODE_MODULES,'package.json')):require;
let playwrightPath;
try { playwrightPath=dependencyRequire.resolve('playwright'); } catch (error) {
 if(error.code!=='MODULE_NOT_FOUND')throw error;
 playwrightPath=createRequire(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json')).resolve('playwright');
}
const {chromium}=require(playwrightPath);
test('Today stays left, selection changes background without bold, same-size translucent date aligns right',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage();
  await page.setContent('<style>button{display:flex;justify-content:center;width:100%}.ctz-today-sidebar{width:240px}.ctz-today-sidebar__icon{width:16px;height:16px}</style><div class="ctz-today-sidebar"><button class="ctz-today-sidebar__row"><span class="ctz-today-sidebar__icon"></span><span class="ctz-today-sidebar__label">Today</span></button></div>');
  const offset=()=>page.evaluate(()=>{const row=document.querySelector('button').getBoundingClientRect(),icon=document.querySelector('button span').getBoundingClientRect();return icon.left-row.left;});
  assert.ok(await offset()>50,'bad sample must really be centered');
  await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'styles.css'),'utf8')});
  await page.locator('button').evaluate(el=>{const date=document.createElement('span');date.className='ctz-today-sidebar__date';date.textContent='2026-10-23 Fri';el.append(date);});
  for(const dark of [false,true]){
   await page.evaluate(dark=>{document.body.style.background=dark?'#222':'#fff';document.body.style.setProperty('--text-normal',dark?'#eee':'#222');document.body.style.setProperty('--text-muted',dark?'#aaa':'#777');document.body.style.setProperty('--nav-item-background-active',dark?'#111':'#ddd');},dark);
   for(const width of [240,160,320]){
    await page.locator('.ctz-today-sidebar').evaluate((el,width)=>el.style.width=width+'px',width);
    assert.ok(Math.abs(await offset()-8)<1,'icon should align at left padding');
    const style=()=>page.locator('button').evaluate(el=>({weight:getComputedStyle(el).fontWeight,background:getComputedStyle(el).backgroundColor}));
    const normal=await style();await page.locator('button').evaluate(el=>el.setAttribute('aria-current','page'));const selected=await style();assert.equal(selected.weight,normal.weight,'current Today must not become bold');assert.notEqual(selected.background,normal.background,'selected background should be visible');assert.ok(Math.abs(await offset()-8)<1);await page.locator('button').evaluate(el=>el.removeAttribute('aria-current'));assert.deepEqual(await style(),normal);
    const metrics=await page.locator('button').evaluate(el=>{const date=el.querySelector('.ctz-today-sidebar__date'),label=el.querySelector('.ctz-today-sidebar__label'),ds=getComputedStyle(date),ls=getComputedStyle(label);return {overflow:el.scrollWidth>el.clientWidth,dateColor:ds.color,textColor:ls.color,dateSize:ds.fontSize,textSize:ls.fontSize,opacity:Number(ds.opacity),rightGap:el.getBoundingClientRect().right-date.getBoundingClientRect().right};});assert.equal(metrics.overflow,false);assert.equal(metrics.dateColor,metrics.textColor);assert.equal(metrics.dateSize,metrics.textSize);assert.equal(metrics.opacity,0.5);assert.ok(Math.abs(metrics.rightGap-8)<1,'date must sit against right padding');
   }
  }
  await page.locator('.ctz-today-sidebar__date').evaluate(el=>el.textContent='很长的自定义日期显示内容'.repeat(20));assert.ok(await page.locator('button').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.locator('.ctz-today-sidebar__date').evaluate(el=>el.hidden=true);assert.equal(await page.locator('.ctz-today-sidebar__date').isVisible(),false);
  await page.locator('button').evaluate(el=>{const custom=el.cloneNode(true);custom.classList.add('ctz-today-sidebar__custom-row');const label=custom.querySelector('.ctz-today-sidebar__label');label.classList.add('ctz-today-sidebar__custom-label');label.textContent='很长的自定义文件标题'.repeat(20);const subtitle=custom.querySelector('.ctz-today-sidebar__date');subtitle.hidden=false;subtitle.textContent='很长的自定义副标题'.repeat(20);el.after(custom);});
  for(const width of [160,240,320]){await page.locator('.ctz-today-sidebar').evaluate((el,width)=>el.style.width=width+'px',width);const custom=page.locator('.ctz-today-sidebar__custom-row');assert.ok(await custom.evaluate(el=>el.scrollWidth<=el.clientWidth));const geometry=await custom.evaluate(el=>{const date=el.querySelector('.ctz-today-sidebar__date'),label=el.querySelector('.ctz-today-sidebar__label');return {dateSize:getComputedStyle(date).fontSize,labelSize:getComputedStyle(label).fontSize,opacity:getComputedStyle(date).opacity,right:el.getBoundingClientRect().right-date.getBoundingClientRect().right};});assert.equal(geometry.dateSize,geometry.labelSize);assert.equal(geometry.opacity,'0.5');assert.ok(Math.abs(geometry.right-8)<1);}

 }finally{await browser.close();}
});
test('hover and selection follow theme navigation colors, including equal tokens',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage();await page.setContent('<div class="ctz-today-sidebar" style="width:240px"><button class="ctz-today-sidebar__row">Today</button><button class="ctz-today-sidebar__row ctz-today-sidebar__custom-row">Custom</button></div>');await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'styles.css'),'utf8')});
  for(const dark of [false,true]){
   await page.evaluate(dark=>{document.body.style.setProperty('--text-normal',dark?'#eee':'#222');document.body.style.setProperty('--nav-item-background-hover','#888');document.body.style.setProperty('--nav-item-background-active','#888');document.body.style.background=dark?'#222':'#fff';},dark);
   for(let index=0;index<2;index++){
    const row=page.locator('button').nth(index),bg=()=>row.evaluate(el=>getComputedStyle(el).backgroundColor);await page.mouse.move(500,500);const normal=await bg();await row.hover();const hover=await bg();assert.equal(hover,'rgb(136, 136, 136)');await page.mouse.move(500,500);await row.evaluate(el=>el.setAttribute('aria-current','page'));const selected=await bg();assert.equal(selected,hover,'equal theme tokens must remain equal');await row.hover();assert.equal(await bg(),selected,'hover must not erase selection');await row.evaluate(el=>el.removeAttribute('aria-current'));assert.equal(await bg(),hover);await row.evaluate(el=>el.disabled=true);assert.equal(await bg(),normal);await row.evaluate(el=>el.disabled=false);
   }
  }
 }finally{await browser.close();}
});
test('navigation row geometry and active state respond to theme density, radius and colors',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  for(const dpr of [1,2]){
   const page=await browser.newPage({deviceScaleFactor:dpr});
   await page.setContent('<style>button{height:48px;min-height:40px}</style><div style="width:100px;height:20px" id="ruler"></div><div class="ctz-today-sidebar" style="width:240px"><button class="ctz-today-sidebar__row">Today</button><button class="ctz-today-sidebar__row ctz-today-sidebar__custom-row">Custom</button></div>');
   assert.equal(await page.locator('#ruler').evaluate(el=>el.getBoundingClientRect().width),100);
   await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'styles.css'),'utf8')});
   for(const theme of [{size:14,line:1.4,pad:3,radius:9,bg:'rgb(20, 40, 60)',fg:'rgb(230, 240, 250)'},{size:16,line:1.5,pad:6,radius:2,bg:'rgb(220, 210, 200)',fg:'rgb(30, 40, 50)'}]){
    await page.evaluate(t=>{for(const [key,value] of Object.entries({'--nav-item-size':t.size+'px','--line-height-tight':t.line,'--nav-item-padding':t.pad+'px 10px','--nav-item-radius':t.radius+'px','--nav-item-background-active':t.bg,'--nav-item-color-active':t.fg,'--nav-item-weight-active':'600'}))document.body.style.setProperty(key,value);},theme);
    for(const row of await page.locator('button').all()){
     await row.evaluate(el=>el.setAttribute('aria-current','page'));
     const metrics=await row.evaluate(el=>{const s=getComputedStyle(el);return{height:el.getBoundingClientRect().height,radius:parseFloat(s.borderRadius),bg:s.backgroundColor,fg:s.color,weight:s.fontWeight};});
     assert.ok(Math.abs(metrics.height-(theme.size*theme.line+2*theme.pad))<0.1,'height must follow navigation font, line height and padding');
     assert.equal(metrics.radius,theme.radius);assert.equal(metrics.bg,theme.bg);assert.equal(metrics.fg,theme.fg);assert.equal(metrics.weight,'600');
     await row.hover();assert.equal(await row.evaluate(el=>getComputedStyle(el).backgroundColor),theme.bg);
    }
   }
   await page.close();
  }
 }finally{await browser.close();}
});

test('separator styles match settings previews, follow theme borders and collapse when hidden',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage();
  await page.setContent('<div class="ctz-today-sidebar" id="actual"><div class="ctz-today-sidebar__separator"></div></div><div class="ctz-today-sidebar ctz-today-sidebar__manager-list"><button class="ctz-today-sidebar__row ctz-today-sidebar__separator-preview"><div class="ctz-today-sidebar__separator"></div></button></div>');
  await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'styles.css'),'utf8')});
  for(const color of ['rgb(70, 80, 90)','rgb(200, 210, 220)'])for(const style of ['solid','dashed','space']){
   await page.evaluate(({color,style})=>{document.body.style.setProperty('--background-modifier-border',color);for(const el of document.querySelectorAll('.ctz-today-sidebar__separator'))el.setAttribute('data-style',style);},{color,style});
   const metrics=await page.locator('.ctz-today-sidebar__separator').evaluateAll(elements=>elements.map(el=>{const s=getComputedStyle(el),line=getComputedStyle(el,'::before');return{height:el.getBoundingClientRect().height,line:line.borderTopStyle,color:line.borderTopColor,content:line.content,events:s.pointerEvents};}));
   assert.deepEqual(metrics[0],metrics[1]);assert.ok(metrics[0].height>0);assert.equal(metrics[0].events,'none');
   if(style==='space')assert.equal(metrics[0].content,'none');else{assert.equal(metrics[0].line,style);assert.equal(metrics[0].color,color);}
  }
  await page.locator('#actual > div').evaluate(el=>el.hidden=true);
  assert.equal(await page.locator('#actual > div').isVisible(),false,'hidden separators must not occupy space');
 }finally{await browser.close();}
});

test('progress pies paint exact fractions, follow theme and row states, and fall back to icons',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage();
  await page.setContent('<div class="ctz-today-sidebar" style="width:240px"><button class="ctz-today-sidebar__row ctz-today-sidebar__custom-row" id="row"><span class="ctz-today-sidebar__icon" id="icon" aria-hidden="true"></span><span class="ctz-today-sidebar__label">Inbox</span></button></div>');
  await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'styles.css'),'utf8')});
  await page.evaluate(source=>{
   Element.prototype.empty=function(){this.replaceChildren();};
   Element.prototype.createSvg=function(tag,opts={}){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);if(opts.cls)el.setAttribute('class',opts.cls);for(const [key,value] of Object.entries(opts.attr||{}))el.setAttribute(key,String(value));this.append(el);return el;};
   const module={exports:{}};
   new Function('require','module',source)(name=>{
    if(name!=='obsidian')throw Error(name);
    return {Modal:class{},Plugin:class{},ItemView:class{},PluginSettingTab:class{},Setting:class{},Menu:class{},Notice:class{},TFile:class{},FileView:class{},AbstractInputSuggest:class{},getIcon:()=>({}),getIconIds:()=>[],setIcon(el,name){el.textContent=name;},moment:{locale(){return this;},format(){return '';}},normalizePath:value=>value};
   },module);
   window.drawEntryIcon=module.exports.testing.drawEntryIcon;
  },fs.readFileSync(path.join(__dirname,'main.js'),'utf8'));
  const render=(done,total,state={})=>page.evaluate(({done,total,state})=>{
   const row=document.getElementById('row');
   row.disabled=state.disabled===true;
   if(state.selected)row.setAttribute('aria-current','page');else row.removeAttribute('aria-current');
   const icon=document.getElementById('icon'),stats=done===null?null:{done,total};
   window.drawEntryIcon({app:{},taskCounter:{progress:()=>stats}},icon,{type:'file',iconMode:state.iconMode||'tasks',customIcon:'star'},{file:{}});
   const svg=icon.querySelector('svg'),track=icon.querySelector('circle[data-part="track"]'),value=icon.querySelector('circle[data-part="value"]'),check=icon.querySelector('path[data-part="check"]');
   return {label:icon.getAttribute('aria-label'),role:icon.getAttribute('role'),hidden:icon.getAttribute('aria-hidden'),fallback:svg===null,fallbackText:svg===null?icon.textContent:'',
    complete:icon.getAttribute('data-complete'),check:check?.getAttribute('d')||null,checkStroke:check?getComputedStyle(check).stroke:null,
    dash:value?value.getAttribute('stroke-dasharray'):null,trackStroke:track?getComputedStyle(track).stroke:null,valueStroke:value?getComputedStyle(value).stroke:null,
    strokeWidth:track?getComputedStyle(track).strokeWidth:null,size:svg?svg.getBoundingClientRect().width:0,
    rowColor:getComputedStyle(row).color,rowOpacity:getComputedStyle(row).opacity};
  },{done,total,state});
  // Sample the ring at 12/3/6/9 o'clock: hit tests report which circle paints each point.
  const ringHits=()=>page.evaluate(()=>{
   const ring=document.querySelector('#icon circle[data-part="track"]');
   if(!ring)return null;
   const box=ring.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2,r=box.width/2;
   return [0,90,180,270].map(degrees=>{
    const rad=(degrees-90)*Math.PI/180,hit=document.elementFromPoint(cx+r*Math.cos(rad),cy+r*Math.sin(rad));
    return hit?hit.getAttribute('data-part'):null;
   });
  });
  // The long check stroke passes through (9.2, 7.9) in the 16×16 view box.
  const checkHit=()=>page.evaluate(()=>{
   const ring=document.querySelector('#icon circle[data-part="track"]');
   if(!ring)return null;
   const box=ring.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2;
   const hit=document.elementFromPoint(cx+1.2,cy-0.1);
   return hit?hit.getAttribute('data-part'):null;
  });
  // Rasterize at 16× and scan the ring band: the longest transparent run must stay sub-pixel.
  // A serialized SVG loads without page CSS, so computed strokes are stamped onto a clone first.
  const ringSeam=()=>page.evaluate(async()=>{
   const svg=document.querySelector('#icon svg');
   if(!svg)return null;
   const clone=svg.cloneNode(true),stamp=(from,to)=>{const s=getComputedStyle(from);for(const prop of ['stroke','fill','stroke-width','stroke-linecap','stroke-linejoin'])to.setAttribute(prop,s[prop]);};
   clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
   [...svg.children].forEach((child,index)=>stamp(child,clone.children[index]));
   const scale=16,size=16*scale,canvas=document.createElement('canvas');
   canvas.width=size;canvas.height=size;
   const ctx=canvas.getContext('2d'),img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(clone.outerHTML);});
   ctx.drawImage(img,0,0,size,size);
   const cx=8*scale,cy=8*scale,r=6.5*scale;
   let best=0,run=0;
   for(let degree=0;degree<360;degree+=0.25){
    const rad=(degree-90)*Math.PI/180,transparent=ctx.getImageData(Math.round(cx+r*Math.cos(rad)),Math.round(cy+r*Math.sin(rad)),1,1).data[3]<200;
    run=transparent?run+0.25:0;best=Math.max(best,run);
   }
   return best;
  });
  for(const [dark,border,faint] of [[false,'rgb(198, 203, 210)','rgb(153, 153, 153)'],[true,'rgb(70, 76, 84)','rgb(118, 118, 118)']]){
   await page.evaluate(({dark,border,faint})=>{
    document.body.style.background=dark?'#1e1e1e':'#ffffff';
    document.body.style.setProperty('--background-modifier-border',border);
    document.body.style.setProperty('--text-faint',faint);
    document.body.style.setProperty('--nav-item-color',dark?'#aaaaaa':'#777777');
    document.body.style.setProperty('--nav-item-color-active',dark?'#eeeeee':'#222222');
    document.body.style.setProperty('--nav-item-background-active',dark?'#333333':'#dddddd');
   },{dark,border,faint});
   const pie=await render(2,5);
   assert.equal(pie.fallback,false);assert.equal(pie.dash,'40 100');assert.equal(pie.size,16);assert.equal(pie.strokeWidth,'2px');
   assert.equal(pie.label,'Completion: 40% (2/5 done)');assert.equal(pie.role,'img');assert.equal(pie.hidden,null,'the pie label must stay readable');
   assert.equal(pie.complete,null);assert.equal(pie.check,null,'partial pies must not show the completed check');
   assert.equal(pie.trackStroke,border,'the track must follow the theme border color');
   assert.ok(pie.valueStroke===pie.rowColor||pie.valueStroke==='currentColor','the arc must use the row text color');
   assert.deepEqual(await ringHits(),['value','track','track','value'],'40% must paint counterclockwise from 12 o\'clock');
   assert.equal((await render(0,3)).dash,'0 100');
   assert.deepEqual(await ringHits(),['track','track','track','track'],'0% must paint no arc');
   const full=await render(3,3);
   assert.equal(full.dash,null,'100% must not draw a value arc');
   assert.equal(full.complete,'true');assert.equal(full.check,'M4.8 7.9L7 10.1L11.2 5.9');
   assert.equal(full.trackStroke,border,'the completed ring must match the other rings in weight');
   assert.equal(full.checkStroke,faint,'the check remains the muted completion marker');
   assert.deepEqual(await ringHits(),['track','track','track','track'],'100% shows a full muted ring');
   assert.equal(await checkHit(),'check','the completed check must be painted');
   assert.ok(await ringSeam()<=1,'the completed ring must be closed without a seam (a full-length dash leaves ~9° at the path start)');
   const selected=await render(1,5,{selected:true});
   assert.ok(selected.valueStroke===selected.rowColor||selected.valueStroke==='currentColor');
   assert.deepEqual(await ringHits(),['value','track','track','track'],'selection must keep the pie legible');
   const done=await render(5,5,{selected:true});
   assert.equal(done.trackStroke,border);assert.equal(await checkHit(),'check','selection must keep the completed state readable');
   const disabled=await render(1,5,{disabled:true});
   assert.equal(disabled.rowOpacity,'0.5','disabled rows dim the pie with the entry');
   const fallback=await render(null,0);
   assert.equal(fallback.fallback,true);assert.equal(fallback.fallbackText,'star');assert.equal(fallback.role,null);assert.equal(fallback.hidden,'true');
  }
 }finally{await browser.close();}
});

test('real pointer capture commits the visible drag preview across left drift and release coordinate changes',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage(),cdp=await page.context().newCDPSession(page);
  for(const kind of ['buttons','presets'])for(const scenario of ['left-overlap','release-x','release-y','outside']){
   await page.setContent('<nav class="ctz-today-sidebar ctz-today-sidebar__manager-list" style="position:absolute;left:120px;top:100px;width:280px;--ctz-visibility-size:28px;--ctz-visibility-gap:8px"></nav>');
   await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'styles.css'),'utf8')});
   await page.evaluate(({source,kind})=>{
    HTMLElement.prototype.createDiv=function(opts){const el=document.createElement('div');el.className=opts.cls;for(const [key,value]of Object.entries(opts.attr||{}))el.setAttribute(key,value);this.append(el);return el;};
    const module={exports:{}};new Function('require','module',source)(()=>({Modal:class{},Plugin:class{},ItemView:class{},PluginSettingTab:class{},AbstractInputSuggest:class{}}),module);
    delete window.savedOrder;
    const list=document.querySelector('nav'),tab=new module.exports.testing.TodaySettings({},{});
    tab.plugin={settings:{buttons:['a','b','c'].map(id=>({id}))}};tab.entryRows=new Map();tab.dragHandles=new Map();
    for(const id of ['a','b','c']){const row=list.createDiv({cls:'ctz-today-sidebar__manager-entry'});row.style.height='32px';row.innerHTML='<button class="ctz-today-sidebar__drag-handle">⋮</button><span>'+id+'</span>';tab.entryRows.set(id,row);tab.dragHandles.set(id,row.firstChild);}
    tab.reorder=async(id,to)=>{const items=tab.plugin.settings.buttons,from=items.findIndex(item=>item.id===id);items.splice(to,0,items.splice(from,1)[0]);for(const item of items)list.append(tab.entryRows.get(item.id));window.savedOrder=items.map(item=>item.id);};
    if(kind==='presets'){list.classList.add('ctz-today-sidebar__preset-list');for(const entry of tab.entryRows.values())entry.classList.add('ctz-today-sidebar__preset-entry');tab.presetDragHandles=tab.dragHandles;}
    tab.setupDragging(list,{kind});window.tab=tab;
   },{source:fs.readFileSync(path.join(__dirname,'main.js'),'utf8'),kind});
   const first=await page.locator('.ctz-today-sidebar__drag-handle').first().boundingBox(),list=await page.locator('nav').boundingBox();
   const start={x:first.x+first.width/2,y:first.y+first.height/2},end={x:scenario==='left-overlap'?list.x-80:start.x,y:start.y+64};
   await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});
   assert.equal(await page.locator('[data-drop]').count(),1,'displacement must have a valid destination');
   if(scenario==='outside'){
    await page.mouse.move(list.x+list.width+120,end.y);assert.equal(await page.locator('[data-drop]').count(),0);await page.mouse.up();
    assert.equal(await page.evaluate(()=>window.savedOrder),undefined);
   }else{
    const release={x:scenario==='release-x'?list.x-40:end.x,y:scenario==='release-y'?start.y:end.y};
    // A release can carry a new position without an intervening rendered move.
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,...release});
    await page.waitForFunction(()=>window.savedOrder);assert.deepEqual(await page.evaluate(()=>window.savedOrder),['b','c','a']);await page.mouse.up();
   }
   assert.equal(await page.locator('.ctz-today-sidebar__drag-ghost').count(),0);
  }
 }finally{await browser.close();}
});

test('title overflow measurement follows rendered row space, theme fonts and subtitle width',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage();
  await page.setContent('<div class="ctz-today-sidebar" id="fixture"><button class="ctz-today-sidebar__row"><span class="ctz-today-sidebar__icon" style="width:16px">*</span><span class="ctz-today-sidebar__label ctz-today-sidebar__custom-label"></span><span class="ctz-today-sidebar__date">12</span></button></div>');
  await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'styles.css'),'utf8')});
  await page.evaluate(source=>{
   HTMLElement.prototype.createDiv=function(opts){const element=document.createElement('div');element.className=opts.cls;this.append(element);return element;};
   const module={exports:{}};new Function('require','module',source)(()=>({Modal:class{},Plugin:class{},ItemView:class{},PluginSettingTab:class{},AbstractInputSuggest:class{}}),module);
   window.measureTitle=module.exports.testing.titleOverflows;
  },fs.readFileSync(path.join(__dirname,'main.js'),'utf8'));
  for(const width of [120,220,380])for(const size of [12,18])for(const subtitle of ['12','较长的副标题'])for(const title of ['短','abcdefghijklm','中文标题'.repeat(15),'👩‍💻'.repeat(12)]){
   const result=await page.evaluate(({width,size,subtitle,title})=>{
    const fixture=document.getElementById('fixture'),row=fixture.firstElementChild,label=row.querySelector('.ctz-today-sidebar__label');
    fixture.style.width=width+'px';fixture.style.setProperty('--nav-item-size',size+'px');row.querySelector('.ctz-today-sidebar__date').textContent=subtitle;
    label.textContent=title;const expected=label.scrollWidth>label.clientWidth;
    label.textContent='简称';const measured=window.measureTitle(row,title);
    return {expected,measured,clean:document.querySelectorAll('body > .ctz-today-sidebar').length===1};
   },{width,size,subtitle,title});
   assert.equal(result.measured,result.expected,JSON.stringify({width,size,subtitle,title}));assert.equal(result.clean,true);
  }
  await page.locator('#fixture').evaluate(el=>el.style.display='none');assert.equal(await page.evaluate(()=>window.measureTitle(document.querySelector('button'),'长标题')),null);
 }finally{await browser.close();}
});

test('template modal renders folder left, filename right and an uneditable extension at narrow widths',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage();await page.setContent('<style>body{margin:0;padding:20px}.modal{width:100%;box-sizing:border-box}input{height:32px}label{font:14px sans-serif}</style><div class="modal"></div>');
  await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'styles.css'),'utf8')});
  await page.evaluate(source=>{
   function decorate(el){el.createEl=function(tag,opts={}){const child=decorate(document.createElement(tag));child.className=opts.cls||'';child.textContent=opts.text||'';for(const [key,value] of Object.entries(opts.attr||{}))child.setAttribute(key,value);this.append(child);return child;};el.createDiv=opts=>el.createEl('div',opts);el.createSpan=opts=>el.createEl('span',opts);return el;}
   class Modal{constructor(app){this.app=app;this.contentEl=decorate(document.querySelector('.modal'));}setTitle(){}close(){}}
   const module={exports:{}};new Function('require','module',source)(()=>({Modal,Plugin:class{},ItemView:class{},PluginSettingTab:class{},AbstractInputSuggest:class{},getLanguage:()=> 'zh'}),module);
   const plugin={app:{vault:{getAllFolders:()=>[]}}};new module.exports.testing.TemplateModal(plugin,{targetFolder:'Notes'}).onOpen();
  },fs.readFileSync(path.join(__dirname,'main.js'),'utf8'));
  for(const width of [360,600]){
   await page.setViewportSize({width,height:400});
   const geometry=await page.evaluate(()=>{
    const folder=document.querySelector('input[aria-label="文件夹"]'),name=document.querySelector('input[aria-label="文件名"]'),extension=document.querySelector('.ctz-today-sidebar__create-extension');const f=folder.getBoundingClientRect(),n=name.getBoundingClientRect(),e=extension.getBoundingClientRect();
    return {folderLeft:f.left,folderRight:f.right,nameLeft:n.left,nameRight:n.right,extensionLeft:e.left,extensionRight:e.right,topDelta:f.top-n.top,extensionTag:extension.tagName,extensionText:extension.textContent,editable:extension.isContentEditable,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(geometry.folderRight<geometry.nameLeft);assert.ok(Math.abs(geometry.topDelta)<1);assert.ok(geometry.nameRight<=geometry.extensionLeft);assert.ok(geometry.extensionRight<=width-20);assert.equal(geometry.extensionTag,'SPAN');assert.equal(geometry.extensionText,'.md');assert.equal(geometry.editable,false);assert.equal(geometry.overflow,false);
  }
 }finally{await browser.close();}
});
