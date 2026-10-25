const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {harness}=require('./test-host.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const firstControls=view=>view.customRows.values().next().value;
const fileButtons=settings=>settings.buttons.filter(button=>button.type==='file');
const showFileTab=t=>{const tab=t.tabs[0];tab.selectedId=fileButtons(tab.plugin.settings)[0]?.id;tab.display();return tab;};
const editorSetting=(tab,name)=>tab.editorEl.settings.find(setting=>setting.name===name);
const iconPicker=tab=>editorSetting(tab,'按钮图标').controlEl.children[0];

const tasksConfig={statusSettings:{coreStatuses:[{symbol:' ',type:'TODO'},{symbol:'x',type:'DONE'}],customStatuses:[{symbol:'/',type:'IN_PROGRESS'},{symbol:'-',type:'CANCELLED'},{symbol:'?',type:'ON_HOLD'},{symbol:'~',type:'NON_TASK'}]}};
const taskItems=symbols=>symbols.map(task=>({task}));
async function taskFixture({config=tasksConfig,buttons=[{id:'a',type:'file',customPath:'a.md',customSubtitle:'原副标题',subtitleMode:'tasks'}]}={}) {
 const t=harness();if(config)t.adapterFiles.set('.obsidian/plugins/obsidian-tasks-plugin/data.json',JSON.stringify(config));
 const file=new t.TFile('a.md');t.files.set(file.path,file);t.metadata.set(file.path,{listItems:taskItems([' ','/','x','-','?','~','!'])});
 const plugin=new t.Plugin();plugin.saved={buttons};await plugin.onload();const tab=t.tabs[0];tab.display();
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});await plugin.taskCounter.reloadStatuses();return{...t,plugin,tab,view,file};
}
test('task status types count TODO, IN_PROGRESS and ON_HOLD while excluding other and unknown symbols',()=>{
 const {h}=harness(),types=h.taskStatusTypes(tasksConfig);
 assert.equal(h.countUnfinishedTasks(taskItems([' ','/','?','x','X','-','~','!',undefined]),types),3);
 assert.equal(h.countUnfinishedTasks([],types),0);assert.throws(()=>h.taskStatusTypes({}),/Tasks/);assert.throws(()=>h.taskStatusTypes({statusSettings:{coreStatuses:[{symbol:'/',type:'UNKNOWN'}],customStatuses:[]}}),/Tasks/);
 assert.equal(h.countUnfinishedTasks(taskItems([' ','/','x','X']),h.taskStatusTypes(null)),1);
 const changed=structuredClone(tasksConfig);changed.statusSettings.customStatuses[0].type='DONE';assert.equal(h.countUnfinishedTasks(taskItems(['/']),h.taskStatusTypes(changed)),0);
});
test('task mode migration defaults to text and preserves old subtitles and new per-file modes',()=>{
 const {h}=harness(),settings=h.loadSettings({buttons:[{id:'a',type:'file',customSubtitle:'旧文本'},{id:'b',type:'file',subtitleMode:'tasks'},{id:'t',type:'today',subtitleMode:'tasks'}]});
 assert.equal(settings.buttons[0].subtitleMode,'text');assert.equal(settings.buttons[0].customSubtitle,'旧文本');assert.equal(settings.buttons[1].subtitleMode,'tasks');assert.notEqual(settings.buttons[2].subtitleMode,'tasks');
 assert.equal(h.loadSettings(settings).buttons[1].subtitleMode,'tasks');
});
test('File subtitle modes hide both subtitle and editor while retaining text across reload',async()=>{
 const {plugin,tab,view,h,metadataReads}=await taskFixture();
 assert.equal(editorSetting(tab,'副标题').settingEl.hidden,true,'task mode must not show the text editor');
 assert.equal(editorSetting(tab,'副标题显示').dropdown.options.none,'不显示');
 await editorSetting(tab,'副标题显示').dropdown.change('none');
 assert.equal(editorSetting(tab,'副标题').settingEl.hidden,true);assert.equal(view.customRows.get('a').subtitle.hidden,true);assert.equal(tab.listRows.get('a').children[2].hidden,true);
 assert.equal(h.loadSettings(plugin.saved).buttons[0].subtitleMode,'none');assert.equal(plugin.saved.buttons[0].customSubtitle,'原副标题');
 metadataReads.length=0;view.updateActive();assert.equal(metadataReads.length,0,'hidden subtitles must not count tasks');
 await editorSetting(tab,'副标题显示').dropdown.change('text');assert.equal(editorSetting(tab,'副标题').settingEl.hidden,false);assert.equal(editorSetting(tab,'副标题').text.value,'原副标题');assert.equal(view.customRows.get('a').subtitle.textContent,'原副标题');
 await editorSetting(tab,'副标题显示').dropdown.change('tasks');assert.equal(editorSetting(tab,'副标题').settingEl.hidden,true);assert.equal(view.customRows.get('a').subtitle.textContent,'3');
});
test('task numbers update in sidebar and settings, mode changes restore the stored text',async()=>{
 const {plugin,tab,view,metadata,emit,file}=await taskFixture();
 assert.equal(view.customRows.get('a').subtitle.textContent,'3');assert.equal(tab.listRows.get('a').children[2].textContent,'3');
 metadata.set(file.path,{listItems:taskItems(['x','/','x','-','?','~'])});emit('changed',file);assert.equal(view.customRows.get('a').subtitle.textContent,'2');
 await editorSetting(tab,'副标题显示').dropdown.change('text');assert.equal(view.customRows.get('a').subtitle.textContent,'原副标题');
 assert.equal(plugin.saved.buttons[0].subtitleMode,'text');await editorSetting(tab,'副标题显示').dropdown.change('tasks');assert.equal(view.customRows.get('a').subtitle.textContent,'2');
 assert.equal(plugin.saved.buttons[0].customSubtitle,'原副标题');
});
test('missing Tasks settings fall back to standard states and metadata readiness is not reported as zero',async()=>{
 const {plugin,view,metadata,emit,file}=await taskFixture({config:null});
 assert.equal(view.customRows.get('a').subtitle.textContent,'1');metadata.delete(file.path);emit('changed',file);assert.equal(view.customRows.get('a').subtitle.textContent,'…');
 metadata.set(file.path,{});emit('changed',file);assert.equal(view.customRows.get('a').subtitle.textContent,'0');
 emit('modify',file);assert.equal(view.customRows.get('a').subtitle.textContent,'…');emit('changed',file);assert.equal(view.customRows.get('a').subtitle.textContent,'0');
 plugin.unload();assert.equal(plugin.disposed,true);
});
test('unavailable targets and non-Markdown files show a dash rather than stale task numbers',async()=>{
 const {plugin,tab,view,files,file,emit,metadata,TFile}=await taskFixture();
 files.delete(file.path);emit('delete',file);assert.equal(view.customRows.get('a').subtitle.textContent,'—');
 files.set(file.path,file);metadata.set(file.path,{listItems:taskItems([' '])});emit('create',file);assert.equal(view.customRows.get('a').subtitle.textContent,'1');
 const pdf=new TFile('a.pdf');files.set(pdf.path,pdf);await editorSetting(tab,'文件地址').text.change(pdf.path);assert.equal(view.customRows.get('a').subtitle.textContent,'—');assert.equal(plugin.settings.buttons[0].subtitleMode,'tasks');
});
test('multiple buttons share the same target result and unrelated file changes do not scan targets',async()=>{
 const buttons=['a','b'].map(id=>({id,type:'file',customPath:'a.md',subtitleMode:'tasks'}));
 const {plugin,view,metadataReads,emit,TFile}=await taskFixture({buttons});metadataReads.length=0;
 view.updateActive();assert.equal(metadataReads.length,1);assert.equal(view.customRows.get('a').subtitle.textContent,view.customRows.get('b').subtitle.textContent);
 metadataReads.length=0;emit('changed',new TFile('unrelated.md'));assert.equal(metadataReads.length,0);
 plugin.unload();
});
test('Tasks status configuration is refreshed using the current config directory and recovers after invalid data',async()=>{
 const {plugin,view,adapterFiles,app,intervals}=await taskFixture();
 const configPath='.obsidian/plugins/obsidian-tasks-plugin/data.json';adapterFiles.set(configPath,'bad json');await plugin.taskCounter.reloadStatuses();assert.equal(view.customRows.get('a').subtitle.textContent,'—');
 app.vault.configDir='custom-config';const changed=structuredClone(tasksConfig);changed.statusSettings.customStatuses[0].type='DONE';adapterFiles.set('custom-config/plugins/obsidian-tasks-plugin/data.json',JSON.stringify(changed));
 await plugin.taskCounter.reloadStatuses();assert.equal(view.customRows.get('a').subtitle.textContent,'2');
 adapterFiles.set('custom-config/plugins/obsidian-tasks-plugin/data.json',JSON.stringify(tasksConfig));for(const refresh of intervals.values())refresh();await plugin.taskCounter.pending;assert.equal(view.customRows.get('a').subtitle.textContent,'3');
});
test('a delayed status read cannot restore old target data or update after plugin unload',async()=>{
 const {plugin,tab,view,app,TFile,files,metadata}=await taskFixture();
 let release;app.vault.adapter.read=()=>new Promise(resolve=>{release=resolve;});const pending=plugin.taskCounter.reloadStatuses();await tick();
 const second=new TFile('b.md');files.set(second.path,second);metadata.set(second.path,{listItems:taskItems([' '])});await editorSetting(tab,'文件地址').text.change('b.md');
 release(JSON.stringify(tasksConfig));await pending;assert.equal(view.customRows.get('a').subtitle.textContent,'1');
 const again=plugin.taskCounter.reloadStatuses();await tick();plugin.unload();const before=view.customRows.get('a').subtitle.textContent;release(JSON.stringify({statusSettings:{coreStatuses:[],customStatuses:[]}}));await again;assert.equal(view.customRows.get('a').subtitle.textContent,before);
});
test('task stats report unfinished, done and total across status types',()=>{
 const {h}=harness(),types=h.taskStatusTypes(tasksConfig);
 assert.deepEqual(JSON.parse(JSON.stringify(h.countTaskStats(taskItems([' ','/','x','-','?','~','!']),types))),{unfinished:3,done:1,total:4});
 assert.deepEqual(JSON.parse(JSON.stringify(h.countTaskStats(taskItems([' ','x','X']),h.taskStatusTypes(null)))),{unfinished:1,done:2,total:3});
 assert.deepEqual(JSON.parse(JSON.stringify(h.countTaskStats([],types))),{unfinished:0,done:0,total:0});
 assert.deepEqual(JSON.parse(JSON.stringify(h.countTaskStats(taskItems(['x','x','x','x','-','-']),types))),{unfinished:0,done:4,total:4});
 assert.deepEqual(JSON.parse(JSON.stringify(h.countTaskStats(taskItems(['-','-']),types))),{unfinished:0,done:0,total:0});
 assert.equal(h.progressLabel(2,5),'完成度 40%（已完成 2 / 5）');
});
test('icon mode migration defaults to icon and preserves saved pie choices',()=>{
 const {h}=harness(),settings=h.loadSettings({buttons:[{id:'a',type:'file',customIcon:'star'},{id:'b',type:'file',iconMode:'tasks'},{id:'c',type:'file',iconMode:'weird'},{id:'t',type:'today',iconMode:'tasks'},{id:'s',type:'separator',iconMode:'tasks'}]});
 assert.equal(settings.buttons[0].iconMode,'icon');assert.equal(settings.buttons[1].iconMode,'tasks');assert.equal(settings.buttons[2].iconMode,'icon');
 assert.notEqual(settings.buttons[3].iconMode,'tasks');assert.equal(settings.buttons[4].iconMode,undefined);
 assert.equal(h.loadSettings(settings).buttons[1].iconMode,'tasks');
});
test('progress pies replace File icons in sidebar and settings, follow task changes and restore the saved icon',async()=>{
 const {plugin,tab,view,metadata,emit,file}=await taskFixture({buttons:[{id:'a',type:'file',customPath:'a.md',customSubtitle:'原副标题',customIcon:'star',iconMode:'tasks'}]});
 const icon=view.customRows.get('a').icon;
 assert.equal(icon.attrs['data-pie'],'true');assert.equal(icon.attrs.role,'img');assert.equal(icon.attrs['aria-hidden'],undefined);
 assert.equal(icon.attrs['aria-label'],'完成度 25%（已完成 1 / 4）');assert.equal(icon.title,'完成度 25%（已完成 1 / 4）');
 assert.equal(icon.children[0].tag,'svg');
 const [track,value]=icon.children[0].children;
 assert.equal(track.attrs['data-part'],'track');assert.equal(track.attrs['stroke-dasharray'],undefined,'the full ring must not use dashes');
 assert.equal(value.attrs['data-part'],'value');assert.equal(value.attrs['stroke-dasharray'],'25 100');assert.equal(value.attrs.transform,'translate(16 0) scale(-1 1) rotate(-90 8 8)');
 assert.equal(icon.attrs['data-complete'],undefined);
 const preview=tab.listRows.get('a').children[0];
 assert.equal(preview.attrs['data-pie'],'true');assert.equal(preview.attrs['aria-label'],'完成度 25%（已完成 1 / 4）');
 assert.equal(view.customRows.get('a').subtitle.textContent,'原副标题','pie mode keeps the plain subtitle');
 metadata.set(file.path,{listItems:taskItems(['x','x','x','x','-','-'])});emit('changed',file);
 assert.equal(icon.attrs['aria-label'],'完成度 100%（已完成 4 / 4）');assert.equal(icon.attrs['data-complete'],'true');
 assert.equal(icon.children[0].children.length,2);assert.equal(icon.children[0].children[1].tag,'path');assert.equal(icon.children[0].children[1].attrs['data-part'],'check');
 await editorSetting(tab,'图标显示').dropdown.change('icon');
 assert.equal(icon.attrs['data-pie'],undefined);assert.equal(icon.attrs.role,undefined);assert.equal(icon.icon,'star');
 assert.equal(plugin.saved.buttons[0].iconMode,'icon');assert.equal(plugin.saved.buttons[0].customIcon,'star');
});
test('progress pies fall back to the saved icon for empty, pending, broken or missing data',async()=>{
 const {plugin,tab,view,metadata,emit,file,adapterFiles}=await taskFixture({buttons:[{id:'a',type:'file',customPath:'a.md',customIcon:'star',iconMode:'tasks'}]});
 const icon=view.customRows.get('a').icon;
 metadata.set(file.path,{});emit('changed',file);
 assert.equal(icon.attrs['data-pie'],undefined);assert.equal(icon.icon,'star','a file without tasks keeps the icon');
 metadata.set(file.path,{listItems:taskItems(['-','-'])});emit('changed',file);
 assert.equal(icon.attrs['data-pie'],undefined);assert.equal(icon.icon,'star','cancelled-only files have no denominator and keep the icon');
 metadata.set(file.path,{listItems:taskItems([' '])});emit('changed',file);
 assert.equal(icon.attrs['aria-label'],'完成度 0%（已完成 0 / 1）');
 emit('modify',file);assert.equal(icon.icon,'star','pending rescans keep the icon');
 emit('changed',file);assert.equal(icon.attrs['aria-label'],'完成度 0%（已完成 0 / 1）');
 adapterFiles.set('.obsidian/plugins/obsidian-tasks-plugin/data.json','bad json');await plugin.taskCounter.reloadStatuses();
 assert.equal(icon.icon,'star','broken status configuration keeps the icon');
 emit('delete',file);assert.equal(icon.icon,'star','missing targets keep the icon');
});
test('icon-only progress buttons still scan targets while hidden subtitles do not',async()=>{
 const {plugin,view,metadataReads}=await taskFixture({buttons:[{id:'a',type:'file',customPath:'a.md',subtitleMode:'none',iconMode:'tasks'}]});
 assert.equal(view.customRows.get('a').subtitle.hidden,true);
 assert.equal(view.customRows.get('a').icon.attrs['data-pie'],'true');
 metadataReads.length=0;view.updateActive();assert.equal(metadataReads.length,1,'pie buttons must keep task statistics active');
});
test('icon mode editor shows the icon settings only for normal icons and keeps the saved value',async()=>{
 const {plugin,tab}=await taskFixture({buttons:[{id:'a',type:'file',customPath:'a.md',customIcon:'star',iconMode:'tasks'}]});
 const dropdown=editorSetting(tab,'图标显示').dropdown;
 assert.deepEqual(JSON.parse(JSON.stringify(dropdown.options)),{icon:'普通图标',tasks:'完成度饼图'});
 assert.equal(editorSetting(tab,'按钮图标').settingEl.hidden,true,'pie mode must hide the icon editor');
 await dropdown.change('icon');
 assert.equal(editorSetting(tab,'按钮图标').settingEl.hidden,false);
 assert.equal(editorSetting(tab,'按钮图标').text.inputEl.value,'star');
 await dropdown.change('tasks');
 assert.equal(editorSetting(tab,'按钮图标').settingEl.hidden,true);
 assert.equal(plugin.saved.buttons[0].iconMode,'tasks');assert.equal(plugin.saved.buttons[0].customIcon,'star');
});
test('title and subtitle sources migrate with defaults and preserve saved choices',()=>{
 const {h}=harness(),settings=h.loadSettings({buttons:[
  {id:'a',type:'file'},
  {id:'b',type:'file',titleMode:'filename',subtitleMode:'frontmatter',titleProperty:'t',subtitleProperty:'s'},
  {id:'c',type:'file',titleMode:'weird',subtitleMode:'weird',titleProperty:42,subtitleProperty:[]},
  {id:'t',type:'today',titleMode:'filename',subtitleMode:'filename'},
 ]});
 assert.equal(settings.buttons[0].titleMode,'text');assert.equal(settings.buttons[0].titleProperty,'');assert.equal(settings.buttons[0].subtitleProperty,'');
 assert.equal(settings.buttons[1].titleMode,'filename');assert.equal(settings.buttons[1].subtitleMode,'frontmatter');assert.equal(settings.buttons[1].titleProperty,'t');assert.equal(settings.buttons[1].subtitleProperty,'s');
 assert.equal(settings.buttons[2].titleMode,'text');assert.equal(settings.buttons[2].subtitleMode,'text');assert.equal(settings.buttons[2].titleProperty,'');assert.equal(settings.buttons[2].subtitleProperty,'');
 assert.notEqual(settings.buttons[3].titleMode,'filename');assert.notEqual(settings.buttons[3].subtitleMode,'filename');
 assert.equal(h.loadSettings(settings).buttons[1].subtitleProperty,'s');
});
test('frontmatter values stringify scalars and arrays while complex values fall back',()=>{
 const {h}=harness(),cache={frontmatter:{title:'  我的日记 ',day:3,done:true,tags:['日常',' 计划 ',null,''],empty:'   ',obj:{a:1},none:null}};
 assert.equal(h.frontmatterValue(cache,'title'),'我的日记');assert.equal(h.frontmatterValue(cache,' title '),'我的日记');
 assert.equal(h.frontmatterValue(cache,'day'),'3');assert.equal(h.frontmatterValue(cache,'done'),'true');
 assert.equal(h.frontmatterValue(cache,'tags'),'日常, 计划');
 assert.equal(h.frontmatterValue(cache,'empty'),null);assert.equal(h.frontmatterValue(cache,'obj'),null);assert.equal(h.frontmatterValue(cache,'none'),null);assert.equal(h.frontmatterValue(cache,'missing'),null);
 assert.equal(h.frontmatterValue(cache,''),null);assert.equal(h.frontmatterValue(null,'title'),null);
});
async function displayFixture(buttons,frontmatter) {
 const t=harness();
 t.adapterFiles.set('.obsidian/plugins/obsidian-tasks-plugin/data.json',JSON.stringify(tasksConfig));
 const file=new t.TFile('notes/a.md');t.files.set(file.path,file);
 t.metadata.set(file.path,frontmatter);
 const plugin=new t.Plugin();plugin.saved={buttons};await plugin.onload();
 const tab=t.tabs[0];tab.display();
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});
 await plugin.taskCounter.reloadStatuses();
 return {...t,plugin,tab,view,file};
}
test('filename and frontmatter sources drive titles and subtitles with fallbacks',async()=>{
 const {plugin,tab,view,metadata,emit,file,TFile,files}=await displayFixture([
  {id:'f',type:'file',customPath:'notes/a.md',customTitle:'旧标题',customSubtitle:'旧副标题',titleMode:'frontmatter',titleProperty:'title',subtitleMode:'frontmatter',subtitleProperty:'summary'},
  {id:'n',type:'file',customPath:'notes/a.md',titleMode:'filename',subtitleMode:'filename'},
 ],{frontmatter:{title:'我的日记',summary:'第 3 天'}});
 assert.equal(view.customRows.get('f').label.textContent,'我的日记');assert.equal(view.customRows.get('f').subtitle.textContent,'第 3 天');
 assert.equal(tab.listRows.get('f').children[1].textContent,'我的日记');assert.equal(tab.listRows.get('f').children[2].textContent,'第 3 天');
 assert.equal(view.customRows.get('n').label.textContent,'a');assert.equal(view.customRows.get('n').subtitle.textContent,'a');
 metadata.set(file.path,{frontmatter:{title:'改名后'}});emit('changed',file);
 assert.equal(view.customRows.get('f').label.textContent,'改名后','frontmatter edits refresh entries without task counting');
 assert.equal(view.customRows.get('f').subtitle.hidden,true,'missing properties hide the subtitle');
 emit('changed',new TFile('unrelated.md'));
 assert.equal(view.customRows.get('f').label.textContent,'改名后','unrelated files do not disturb entries');
 const renamed=new TFile('notes/b.md');
 files.delete(file.path);files.set(renamed.path,renamed);metadata.delete(file.path);metadata.set(renamed.path,{frontmatter:{title:'新文件',summary:'s'}});
 emit('rename',renamed,file.path);
 assert.equal(view.customRows.get('f').label.textContent,'旧标题','renamed targets fall back to the stored title');
 assert.equal(view.customRows.get('n').label.textContent,'a','filename source keeps the configured basename');
 const pdf=new TFile('docs/x.pdf');files.set(pdf.path,pdf);
 plugin.settings.buttons[1].customPath='docs/x.pdf';await plugin.saveSettings();
 assert.equal(view.customRows.get('n').label.textContent,'x.pdf');assert.equal(view.customRows.get('n').subtitle.textContent,'x.pdf','non-Markdown names show with their extension');
 plugin.settings.buttons[1].customPath='missing.md';await plugin.saveSettings();
 assert.equal(view.customRows.get('n').label.textContent,'missing');assert.equal(view.customRows.get('n').subtitle.textContent,'missing');
});
test('source dropdowns reveal the matching editors and keep saved values',async()=>{
 const {plugin,tab,metadata,file,emit}=await taskFixture({buttons:[{id:'a',type:'file',customPath:'a.md',customTitle:'旧标题',customSubtitle:'旧副标题'}]});
 metadata.set(file.path,{frontmatter:{name:'名称',summary:'摘要'}});emit('changed',file);
 const source=editorSetting(tab,'主标题来源').dropdown;
 assert.deepEqual(JSON.parse(JSON.stringify(source.options)),{text:'普通文本',filename:'文件名',frontmatter:'文件属性'});
 assert.equal(editorSetting(tab,'主标题').settingEl.hidden,false);
 assert.equal(editorSetting(tab,'标题属性名').settingEl.hidden,true);
 await source.change('filename');
 assert.equal(editorSetting(tab,'主标题').settingEl.hidden,true);assert.equal(editorSetting(tab,'标题属性名').settingEl.hidden,true);
 await source.change('frontmatter');
 assert.equal(editorSetting(tab,'标题属性名').settingEl.hidden,false);
 await editorSetting(tab,'标题属性名').dropdown.change('name');
 assert.equal(plugin.saved.buttons[0].titleProperty,'name');
 await source.change('text');
 assert.equal(editorSetting(tab,'主标题').settingEl.hidden,false);assert.equal(editorSetting(tab,'主标题').text.inputEl.value,'旧标题');
 assert.equal(plugin.saved.buttons[0].customTitle,'旧标题');
 const modes=editorSetting(tab,'副标题显示').dropdown;
 assert.deepEqual(JSON.parse(JSON.stringify(modes.options)),{none:'不显示',text:'普通文本',tasks:'未完成任务数',filename:'文件名',frontmatter:'文件属性'});
 await modes.change('frontmatter');
 assert.equal(editorSetting(tab,'副标题').settingEl.hidden,true);assert.equal(editorSetting(tab,'副标题属性名').settingEl.hidden,false);
 await editorSetting(tab,'副标题属性名').dropdown.change('summary');
 assert.equal(plugin.saved.buttons[0].subtitleProperty,'summary');assert.equal(plugin.saved.buttons[0].customSubtitle,'旧副标题','mode switches keep the stored text');
 await modes.change('filename');
 assert.equal(editorSetting(tab,'副标题属性名').settingEl.hidden,true);
});
test('property dropdowns contain target keys and preview live values',async()=>{
 const {plugin,tab,view,propertyInfos,metadata,emit,file,files,TFile}=await displayFixture([
  {id:'a',type:'file',customPath:'notes/a.md',customTitle:'旧标题',customSubtitle:'旧副标题',titleMode:'frontmatter',titleProperty:'',subtitleMode:'frontmatter',subtitleProperty:''},
 ],{frontmatter:{title:'我的日记',summary:'第 3 天'},listItems:taskItems([' ',' ','x'])});
 propertyInfos.set('tags',{name:'tags',type:'tags',count:5});propertyInfos.set('date',{name:'date',type:'date',count:2});
 const titleDropdown=editorSetting(tab,'标题属性名').dropdown,subtitleDropdown=editorSetting(tab,'副标题属性名').dropdown;
 assert.deepEqual(Object.keys(titleDropdown.options),['','summary','title']);
 assert.equal(tab.editorEl.children.some(child=>child.tag==='p'),false,'no target preview row');
 await titleDropdown.change('title');
 assert.equal(plugin.saved.buttons[0].titleProperty,'title');
 assert.equal(view.customRows.get('a').label.textContent,'我的日记');
 assert.equal(editorSetting(tab,'标题属性名').controlEl.children.at(-1).textContent,'我的日记');
 assert.equal(tab.editorEl.children[1],editorSetting(tab,'类型').settingEl);
 assert.equal(tab.editorEl.children[2],editorSetting(tab,'文件地址').settingEl);
 await subtitleDropdown.change('summary');
 assert.equal(plugin.saved.buttons[0].subtitleProperty,'summary');
 assert.equal(editorSetting(tab,'副标题属性名').controlEl.children.at(-1).textContent,'第 3 天');
 metadata.set(file.path,{frontmatter:{title:'更新标题',summary:0},listItems:taskItems([' ',' ','x'])});emit('changed',file);
 assert.equal(editorSetting(tab,'标题属性名').controlEl.children.at(-1).textContent,'更新标题');
 assert.equal(editorSetting(tab,'副标题属性名').controlEl.children.at(-1).textContent,'0');
 files.set('other.md',new TFile('other.md'));metadata.set('other.md',{frontmatter:{other:true}});
 await editorSetting(tab,'文件地址').text.change('other.md');
 assert.deepEqual(Object.keys(titleDropdown.options),['','other']);
 assert.equal(editorSetting(tab,'标题属性名').controlEl.children.at(-1).textContent,'（空或缺失）');
 await editorSetting(tab,'文件地址').text.change(file.path);
 await editorSetting(tab,'副标题属性名').dropdown.change('');
 assert.equal(view.customRows.get('a').subtitle.hidden,true);
 await editorSetting(tab,'主标题来源').dropdown.change('filename');
 await editorSetting(tab,'副标题显示').dropdown.change('tasks');
 await tick();
});
test('property dropdowns work without the vault index and clear for unreadable targets',async()=>{
 const {app,plugin,tab}=await displayFixture([{id:'a',type:'file',customPath:'notes/a.md'}],{frontmatter:{summary:'s'}});
 const getAll=app.metadataCache.getAllPropertyInfos;
 app.metadataCache.getAllPropertyInfos=undefined;
 assert.deepEqual(Object.keys(editorSetting(tab,'标题属性名').dropdown.options),['','summary']);
 app.metadataCache.getAllPropertyInfos=getAll;
 plugin.settings.buttons[0].customPath='../bad';await plugin.saveSettings();
 assert.deepEqual(Object.keys(editorSetting(tab,'标题属性名').dropdown.options),['']);
});
async function addEntry(t,tab,title='File') {
 await tab.addButton.click();return t.menus.at(-1).items.find(item=>item.title===(title==='File'?'文件':title)).click();
}
test('separator settings retain styles and ids while invalid styles fall back to solid',()=>{
 const {h}=harness(),settings=h.loadSettings({buttons:[{id:'s',type:'separator',separatorStyle:'dashed',hidden:true},{id:'s',type:'separator',separatorStyle:'space'},{type:'separator',separatorStyle:'invalid'}]});
 assert.equal(settings.buttons.length,3);assert.equal(settings.buttons[0].separatorStyle,'dashed');assert.equal(settings.buttons[0].hidden,true);
 assert.equal(settings.buttons[1].separatorStyle,'space');assert.notEqual(settings.buttons[1].id,'s');assert.equal(settings.buttons[2].separatorStyle,'solid');
 assert.deepEqual(JSON.parse(JSON.stringify(h.loadSettings(settings))),JSON.parse(JSON.stringify(settings)));
});
test('sidebar separators render all styles in order without file actions or selected state',async()=>{
 const t=harness(),plugin=new t.Plugin();plugin.saved={buttons:[{id:'a',type:'file',customPath:'a.md'},...['solid','dashed','space'].map(separatorStyle=>({id:separatorStyle,type:'separator',separatorStyle}))]};await plugin.onload();
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();
 assert.equal(view.nav.children.length,4);
 for(const [index,style] of ['solid','dashed','space'].entries()){
  const row=view.nav.children[index+1];assert.equal(row.tag,'div');assert.equal(row.attrs['data-style'],style);assert.equal(row.click,undefined);assert.equal(row.attrs.tabindex,undefined);assert.equal(row.attrs['aria-current'],undefined);
 }
 assert.equal(t.opened.length,0);await view.onClose();assert.equal(view.separatorRows.size,0);
});
test('add menu and separator editor support style, hide, move, reload and delete without changing neighbors',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const tab=t.tabs[0];tab.display();
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});
 const before=JSON.stringify(plugin.settings.buttons);await addEntry(t,tab,'分隔条目');
 const separator=plugin.settings.buttons.at(-1),id=separator.id;assert.equal(separator.type,'separator');assert.equal(separator.separatorStyle,'solid');
 assert.deepEqual(tab.editorEl.settings.map(setting=>setting.name),['类型','分隔样式']);assert.equal(tab.suggesters.length,0);
 await editorSetting(tab,'分隔样式').dropdown.change('dashed');assert.equal(view.separatorRows.get(id).attrs['data-style'],'dashed');
 await tab.visibilityButtons.get(id).click();assert.equal(view.separatorRows.get(id).hidden,true);
 await tab.moveUpButton.click();assert.equal(plugin.settings.buttons[1].id,id);assert.equal(view.nav.children[1],view.separatorRows.get(id));
 assert.equal(t.h.loadSettings(plugin.saved).buttons[1].separatorStyle,'dashed');
 await tab.visibilityButtons.get(id).click();assert.equal(view.separatorRows.get(id).hidden,false);
 await tab.deleteButton.click();assert.equal(JSON.stringify(plugin.settings.buttons),before);assert.equal(view.separatorRows.has(id),false);
});
test('separator-only and empty layouts survive deletion and reload',async()=>{
 const t=harness(),plugin=new t.Plugin();plugin.saved={buttons:[{id:'s',type:'separator',separatorStyle:'space'}]};await plugin.onload();const tab=t.tabs[0];tab.display();
 assert.equal(tab.selectedId,'s');await tab.deleteButton.click();assert.equal(plugin.settings.buttons.length,0);assert.equal(t.h.loadSettings(plugin.saved).buttons.length,0);
});
function dragFixture() {
 const t=harness(),plugin=new t.Plugin();plugin.saved={buttons:[{id:'t',type:'today'},{id:'a',type:'file',customTitle:'A',hidden:true},{id:'b',type:'file'}]};
 return plugin.onload().then(()=>{const tab=t.tabs[0];tab.selectedId='a';tab.display();const list=tab.dragHandles.get('t').parent.parent;
  list.getBoundingClientRect=()=>({left:0,right:280,top:0,bottom:120});list.scrollTop=0;
  const body=new t.Element('body');list.ownerDocument={body,defaultView:{getComputedStyle:()=>({font:'13px sans-serif',getPropertyValue:()=>''})},addEventListener(type,fn){this[type]=fn;},removeEventListener(type,fn){if(this[type]===fn)delete this[type];}};
  for(const [index,entry] of [...tab.entryRows.values()].entries())entry.getBoundingClientRect=()=>({left:0,right:280,width:280,top:index*32,bottom:(index+1)*32,height:32});
  tab.setupDragging(list);
  return{t,plugin,tab,list,event:(x,y)=>({pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){}})};
 });
}
for(const [releaseX,releaseY] of [[-33,95],[10,40]]) {
 test('pointer release commits the displayed preview rather than unrendered coordinates '+releaseX+','+releaseY,async()=>{
  const {plugin,tab,event}=await dragFixture(),handle=tab.dragHandles.get('t');
  handle.pointerdown(event(10,16));handle.pointermove(event(-24,95));
  assert.equal(tab.entryRows.get('b').attrs['data-drop'],'after');
  await handle.pointerup(event(releaseX,releaseY));
  assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),['a','b','t']);
 });
}
test('left-side pointer drift remains valid while the floating row overlaps the list',async()=>{
 const {plugin,tab,event}=await dragFixture(),handle=tab.dragHandles.get('t');
 handle.pointerdown(event(10,16));handle.pointermove(event(-80,95));
 assert.equal(tab.entryRows.get('b').attrs['data-drop'],'after','the floating row still overlaps the list even though the grip is left of it');
 await handle.pointerup(event(-80,95));assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),['a','b','t']);
});
test('manager list has no tooltip attribute and keeps a landmark name',async()=>{
 const {tab}=await dragFixture(),list=tab.dragHandles.get('t').parent.parent;
 assert.equal(list.attrs['aria-label'],undefined);assert.equal(list.attrs.title,undefined);
 assert.ok(list.attrs['aria-labelledby']);
});
for(const [id,start,expected] of [['t',16,['a','t','b']],['b',80,['t','b','a']]])for(const offset of [-1,0,1]) {
 test('dragging '+id+' to the adjacent grip center offset '+offset+' commits the preview',async()=>{
  const {plugin,tab,event}=await dragFixture(),handle=tab.dragHandles.get(id);
  handle.pointerdown(event(10,start));handle.pointermove(event(10,48+offset));
  assert.notEqual(tab.entryRows.get('a').style.transform,undefined,'entering the adjacent grip area must preview a move');
  await handle.pointerup(event(10,48+offset));
  assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),expected);
 });
}
test('drag handle has an accessible name without tooltip attributes',async()=>{
 const {tab}=await dragFixture(),handle=tab.dragHandles.get('t');
 assert.equal(handle.attrs.title,undefined);assert.equal(handle.attrs['aria-label'],undefined);
 assert.ok(handle.children.some(child=>child.textContent==='拖动 今日日记'));
});
for(const [id,start,cross,gap,expected] of [
 ['t',16,55,40,['a','t','b']],
 ['b',80,40,56,['t','b','a']]
]) {
 test('dropping '+id+' in the previewed gap keeps the displaced position',async()=>{
  const {plugin,tab,event}=await dragFixture(),handle=tab.dragHandles.get(id);
  handle.pointerdown(event(10,start));handle.pointermove(event(10,cross));
  assert.notEqual(tab.entryRows.get('a').style.transform,undefined);
  handle.pointermove(event(10,gap));
  assert.notEqual(tab.entryRows.get('a').style.transform,undefined,'entering the opened gap must not undo the preview');
  await handle.pointerup(event(10,gap));
  assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),expected);
 });
}
test('preview can reverse again after crossing the displaced neighbor',async()=>{
 const {plugin,tab,event}=await dragFixture(),handle=tab.dragHandles.get('t');
 handle.pointerdown(event(10,16));handle.pointermove(event(10,55));handle.pointermove(event(10,40));
 handle.pointermove(event(10,10));assert.equal(tab.entryRows.get('a').style.transform,undefined);
 await handle.pointerup(event(10,10));
 assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),['t','a','b']);
});
test('drag floats under the pointer and pushes neighbors before committing data',async()=>{
 const {plugin,tab,list,event}=await dragFixture(),handle=tab.dragHandles.get('t');
 handle.pointerdown(event(10,16));handle.pointermove(event(20,95));
 const ghost=list.ownerDocument.body.children[0];assert.ok(ghost,'a floating preview must be created');assert.equal(ghost.style.transform,'translate3d(10px, 79px, 0)');
 assert.equal(tab.entryRows.get('a').style.transform,'translateY(-32px)');assert.equal(tab.entryRows.get('b').style.transform,'translateY(-32px)');
 assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),['t','a','b']);
 await handle.pointerup(event(20,95));assert.equal(ghost.parent,null);assert.equal(tab.entryRows.get('a').style.transform,undefined);
 assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),['a','b','t']);
});
test('upward drag pushes neighbors down and cancelling restores the original scene',async()=>{
 const {plugin,tab,list,event}=await dragFixture(),handle=tab.dragHandles.get('b');
 handle.pointerdown(event(10,80));handle.pointermove(event(10,5));
 assert.equal(tab.entryRows.get('t').style.transform,'translateY(32px)');assert.equal(tab.entryRows.get('a').style.transform,'translateY(32px)');
 handle.pointercancel(event(10,5));assert.equal(list.ownerDocument.body.children.length,0);assert.equal(tab.entryRows.get('t').style.transform,undefined);
 assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),['t','a','b']);
});
test('dragging a handle shows an insertion marker and commits order without selecting the dragged row',async()=>{
 const {t,plugin,tab,event}=await dragFixture(),handle=tab.dragHandles.get('t');
 handle.pointerdown(event(10,16));handle.pointermove(event(10,95));assert.equal(tab.entryRows.get('b').attrs['data-drop'],'after');
 await handle.pointerup(event(10,95));assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),['a','b','t']);assert.equal(tab.selectedId,'a');
 assert.equal(plugin.settings.buttons[0].hidden,true);assert.deepEqual(Array.from(t.h.loadSettings(plugin.saved).buttons,button=>button.id),['a','b','t']);
});
for(const x of [-1,-24,300]) {
 test('drag tolerates a small horizontal drift at x='+x,async()=>{
  const {plugin,tab,list,event}=await dragFixture(),handle=tab.dragHandles.get('t');
  handle.pointerdown(event(10,16));handle.pointermove(event(x,95));assert.equal(list.attrs['data-dragging'],'true');
  assert.equal(tab.entryRows.get('b').attrs['data-drop'],'after','near-edge dragging must retain a valid drop position');
  await handle.pointerup(event(x,95));assert.deepEqual(Array.from(plugin.settings.buttons,button=>button.id),['a','b','t']);
 });
}
test('cancelled, stationary and outside drops do not save or change order',async()=>{
 const {plugin,tab,list,event}=await dragFixture(),handle=tab.dragHandles.get('t'),before=JSON.stringify(plugin.settings);
 let writes=0;plugin.saveData=async()=>{writes++;};
 handle.pointerdown(event(10,16));await handle.pointerup(event(10,16));
 handle.pointerdown(event(10,16));handle.pointermove(event(10,95));handle.pointercancel(event(10,95));
 handle.pointerdown(event(10,16));handle.pointermove(event(400,95));await handle.pointerup(event(400,95));
 assert.equal(writes,0);assert.equal(JSON.stringify(plugin.settings),before);assert.equal(list.attrs['data-dragging'],undefined);
 handle.pointerdown(event(10,16));handle.pointermove(event(10,95));tab.hide();assert.equal(list.attrs['data-dragging'],undefined);
});
test('saved order is preserved even when Today is between File entries',()=>{
 const {h}=harness(),settings=h.loadSettings({buttons:[{id:'a',type:'file'},{id:'t',type:'today'},{id:'b',type:'file'}]});
 assert.deepEqual(Array.from(settings.buttons,item=>item.id),['a','t','b']);
});
test('moving selected entries updates list and sidebar, preserves hidden values and survives reload',async()=>{
 const t=harness(),plugin=new t.Plugin();plugin.saved={buttons:[{id:'t',type:'today'},{id:'a',type:'file',customTitle:'A',customPath:'a.md',hidden:true},{id:'b',type:'file',customPath:'b.md'}]};await plugin.onload();
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});
 const tab=t.tabs[0];tab.selectedId='a';tab.display();const a=view.customRows.get('a').row,b=view.customRows.get('b').row,today=view.row;
 await tab.moveUpButton.click();assert.equal(tab.selectedId,'a');assert.equal(tab.moveUpButton.disabled,true);
 assert.deepEqual(Array.from(tab.listRows.keys()),['a','t','b']);assert.deepEqual(view.nav.children,[a,today,b]);assert.equal(a.hidden,true);
 const loaded=t.h.loadSettings(JSON.parse(JSON.stringify(plugin.saved)));assert.deepEqual(Array.from(loaded.buttons,item=>item.id),['a','t','b']);assert.equal(loaded.buttons[0].customTitle,'A');
 await tab.moveDownButton.click();await tab.moveDownButton.click();assert.equal(tab.moveDownButton.disabled,true);
 assert.deepEqual(view.nav.children,[today,b,a]);assert.equal(tab.selectedId,'a');
 const before=JSON.stringify(plugin.settings);await tab.moveDownButton.click();assert.equal(JSON.stringify(plugin.settings),before);
 tab.listRows.get('t').click();await tab.moveDownButton.click();assert.deepEqual(view.nav.children,[b,today,a]);assert.equal(tab.deleteButton,null,'Today remains protected after moving');
});
for(const type of ['today','file']) {
 test(type+' visibility toggles independently, persists and keeps the editor selection',async()=>{
  const t=harness(),plugin=new t.Plugin();await plugin.onload();const button=plugin.settings.buttons.find(item=>item.type===type);
  const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});const tab=t.tabs[0];tab.display();
  const selected=tab.selectedId,eye=tab.visibilityButtons.get(button.id);
  assert.equal(eye.icon,'eye');await eye.click();
  assert.equal(button.hidden,true);assert.equal(tab.selectedId,selected);assert.equal(eye.icon,'eye-closed');
  assert.equal(tab.listRows.get(button.id).attrs['data-hidden'],'true');assert.equal(tab.listRows.get(button.id).disabled,false);
  assert.equal((type==='today'?view.row:view.customRows.get(button.id).row).hidden,true);
  const next=t.h.loadSettings(JSON.parse(JSON.stringify(plugin.saved)));assert.equal(next.buttons.find(item=>item.id===button.id).hidden,true);
  await eye.click();assert.equal(button.hidden,false);assert.equal(eye.icon,'eye');assert.equal((type==='today'?view.row:view.customRows.get(button.id).row).hidden,false);
 });
}
test('restoring a hidden File preserves its original position and legacy buttons default visible',async()=>{
 const t=harness(),plugin=new t.Plugin();plugin.saved={customButtons:[{id:'first',customPath:'one.md'},{id:'second',customPath:'two.md'}]};await plugin.onload();
 assert.ok(plugin.settings.buttons.every(button=>button.hidden===false));
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});const tab=t.tabs[0];tab.display();
 const before=[...view.nav.children];await tab.visibilityButtons.get('first').click();await tab.visibilityButtons.get('first').click();assert.deepEqual(view.nav.children,before);
});
test('deleting a File removes only that entry from settings and the live sidebar',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const [today,file]=plugin.settings.buttons;
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});
 const tab=showFileTab(t);assert.equal(tab.containerEl.children[0].textContent,'边栏管理');
 assert.equal(tab.editorEl.children.at(-1).children[1],tab.deleteButton);assert.ok(tab.deleteButton.cls.includes('mod-warning'));assert.equal(tab.deleteButton.textContent,'删除');
 const suggesters=[...tab.suggesters];await tab.deleteButton.click();
 assert.equal(plugin.settings.buttons.length,1);assert.equal(plugin.settings.buttons[0].id,today.id);assert.equal(view.customRows.has(file.id),false);assert.equal(view.nav.children.length,1);
 assert.ok(suggesters.every(suggest=>suggest.closed));assert.equal(tab.selectedId,today.id);
 const next=new t.Plugin();next.saved=plugin.saved;await next.onload();assert.equal(fileButtons(next.settings).length,0);
});
test('Today has no delete action and remains manageable through visibility',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const today=plugin.settings.buttons[0];
 const tab=t.tabs[0];tab.display();assert.equal(tab.deleteButton,null);assert.equal(tab.addButton.textContent,'添加');
 await tab.visibilityButtons.get(today.id).click();assert.equal(today.hidden,true);assert.equal(tab.deleteButton,null);
 tab.listRows.get(today.id).click();assert.equal(tab.deleteButton,null);assert.equal(plugin.saved.buttons.some(button=>button.id===today.id),true);
 await tab.visibilityButtons.get(today.id).click();assert.equal(today.hidden,false);
});
test('deleting the last entry leaves a persistent empty state and rejects stale picker saves',async()=>{
 const t=harness(),api=providerFixture(t),plugin=new t.Plugin();plugin.saved={buttons:[{id:'only',type:'file',customPath:'only.md'}]};await plugin.onload();
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});const tab=t.tabs[0];tab.display();
 iconPicker(tab).click();const pick=api.picker.onPick;await tab.deleteButton.click();pick({id:'star'});await tick();
 assert.equal(plugin.settings.buttons.length,0);assert.equal(plugin.saved.buttons.length,0);assert.equal(view.nav.children.length,0);assert.equal(tab.deleteButton,null);
 assert.equal(t.h.loadSettings(JSON.parse(JSON.stringify(plugin.saved))).buttons.length,0);
 await addEntry(t,tab);assert.equal(plugin.settings.buttons.length,1);assert.equal(plugin.settings.buttons[0].type,'file');assert.equal(view.nav.children.length,1);
});
test('icon preview is the accessible picker button with no separate text button',async()=>{
 const t=harness(),api=providerFixture(t),plugin=new t.Plugin();await plugin.onload();const tab=t.tabs[0];tab.display();
 const preview=iconPicker(tab);assert.equal(preview.tag,'button');assert.equal(preview.attrs.type,'button');assert.equal(preview.attrs['aria-label'],'选择图标');
 assert.equal(editorSetting(tab,'按钮图标').button,undefined);
 preview.click();assert.equal(api.picker.sourceEl,preview);api.picker.onPick({id:'star'});await tick();
 assert.equal(preview.icon,'star');assert.equal(plugin.saved.buttons[0].customIcon,'star');
});

test('manager list matches the sidebar and editor fields belong to four sections',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();plugin.settings.displayFormat='[今天]';
 const [today,file]=plugin.settings.buttons;file.customTitle='Inbox';file.customSubtitle='收集';file.customPath='inbox.md';file.customIcon='star';
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();
 const tab=t.tabs[0];tab.display();
 for(const [button,actual] of [[today,view.row],[file,view.customRows.get(file.id).row]]){
  const preview=tab.listRows.get(button.id);
  assert.equal(preview.cls,actual.cls);assert.equal(preview.children.length,actual.children.length);
  assert.equal(preview.children[0].icon,actual.children[0].icon);
  assert.equal(preview.children[1].textContent,actual.children[1].textContent);
  assert.equal(preview.children[2].textContent,actual.children[2].textContent);
 }
 assert.deepEqual(tab.editorEl.children.filter(child=>child.tag==='h3').map(child=>child.textContent),['基础','主标题','副标题','图标']);
 const sections = () => {
  const result={};let current;
  for(const child of tab.editorEl.children){
   if(child.tag==='h3'){current=child.textContent;result[current]=[];}
   const setting=tab.editorEl.settings.find(item=>item.settingEl===child);
   if(setting && setting.name!=='保存为预设')result[current].push(setting.name);
  }
  return result;
 };
 assert.deepEqual(sections(),{'基础':['类型','日记文件夹','文件名日期格式'],'主标题':['主标题'],'副标题':['副标题'],'图标':['按钮图标']});
 await editorSetting(tab,'副标题').text.change('');assert.equal(tab.listRows.get(today.id).children[2].hidden,true);
 tab.listRows.get(file.id).click();
 assert.deepEqual(sections(),{'基础':['类型','文件地址'],'主标题':['主标题来源','主标题','标题属性名','使用简称','简称'],'副标题':['副标题显示','副标题','副标题属性名'],'图标':['图标显示','按钮图标']});
 await editorSetting(tab,'副标题').text.change('新副标题');assert.equal(tab.listRows.get(file.id).children[2].textContent,'新副标题');
 file.customPath='';await plugin.saveSettings();tab.refreshListControls();
 assert.equal(tab.listRows.get(file.id).disabled,false,'unconfigured entries must remain selectable for editing');
});
test('unified button list migrates Today and File without losing existing values or ids',()=>{
 const {h}=harness();
 const settings=h.loadSettings({folder:'journal',displayFormat:'MM/DD',customButtons:[{id:'old',type:'button',customTitle:'Inbox',customPath:'inbox.md',customIcon:'star'}]});
 assert.deepEqual(Array.from(settings.buttons,button=>button.type),['today','file']);
 assert.equal(settings.buttons[1].id,'old');assert.equal(settings.buttons[1].customTitle,'Inbox');assert.equal(settings.folder,'journal');assert.equal(settings.displayFormat,'MM/DD');
 const next=h.loadSettings(JSON.parse(JSON.stringify(settings)));assert.deepEqual(Array.from(next.buttons,button=>button.id),Array.from(settings.buttons,button=>button.id));
});
test('manager selects one typed button and edits Today title and icon independently',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const tab=t.tabs[0];tab.display();
 const [today,file]=plugin.settings.buttons;assert.equal(tab.listRows.size,2);assert.equal(tab.selectedId,today.id);
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});
 await editorSetting(tab,'主标题').text.change('今日');await editorSetting(tab,'按钮图标').text.change('star');
 assert.equal(view.todayLabel.textContent,'今日');assert.equal(view.todayIcon.icon,'star');assert.equal(file.customTitle,'');
 tab.listRows.get(file.id).click();assert.equal(tab.selectedId,file.id);assert.equal(editorSetting(tab,'主标题').text.inputEl.value,'');
 await editorSetting(tab,'主标题').text.change('Inbox');assert.equal(today.customTitle,'今日');
 tab.listRows.get(today.id).click();assert.equal(editorSetting(tab,'主标题').text.inputEl.value,'今日');
 assert.equal(tab.listRows.get(today.id).attrs['aria-pressed'],'true');assert.equal(tab.listRows.get(file.id).attrs['aria-pressed'],'false');
});
test('late icon picker callback cannot overwrite the newly selected editor',async()=>{
 const t=harness(),api=providerFixture(t),plugin=new t.Plugin();await plugin.onload();const tab=t.tabs[0];tab.display();
 const [today,file]=plugin.settings.buttons;
 iconPicker(tab).click();const pick=api.picker.onPick;
 tab.listRows.get(file.id).click();await editorSetting(tab,'按钮图标').text.change('book-open');
 pick({id:'star'});await tick();
 assert.equal(today.customIcon,'star');assert.equal(file.customIcon,'book-open');assert.equal(editorSetting(tab,'按钮图标').text.inputEl.value,'book-open');
});
test('Today editor retains date rules while File subtitle and address remain literal',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const tab=t.tabs[0];tab.display();
 const [today,file]=plugin.settings.buttons;
 await editorSetting(tab,'副标题').text.change('MM/DD');await editorSetting(tab,'日记文件夹').text.change('daily');
 await editorSetting(tab,'文件名日期格式').text.change('YYYY/MM/DD');
 assert.equal(editorSetting(tab,'文件地址'),undefined);
 const oldSuggesters=[...tab.suggesters];tab.listRows.get(file.id).click();assert.ok(oldSuggesters.every(item=>item.closed));
 await editorSetting(tab,'副标题').text.change('YYYY-MM-DD');await editorSetting(tab,'文件地址').text.change('notes/inbox.md');
 assert.equal(file.customSubtitle,'YYYY-MM-DD');assert.equal(plugin.settings.displayFormat,'MM/DD');assert.equal(plugin.settings.folder,'daily');
 assert.equal(editorSetting(tab,'日记文件夹'),undefined);
 const next=new t.Plugin();next.saved=plugin.saved;await next.onload();
 assert.equal(next.settings.buttons[0].id,today.id);assert.equal(next.settings.buttons[1].customPath,'notes/inbox.md');assert.equal(next.settings.dateFormat,'YYYY/MM/DD');
});

test('legacy button migrates once into a list while explicit empty lists remain empty',()=>{
 const {h}=harness();const legacy={customTitle:'Inbox',customSubtitle:'收集',customPath:'notes/inbox.md',customIcon:'star'};
 const settings=h.loadSettings(legacy);assert.equal(fileButtons(settings).length,1);
 const first=fileButtons(settings)[0];assert.ok(first.id);assert.equal(first.type,'file');
 for(const [key,value] of Object.entries(legacy))assert.equal(first[key],value);
 const reloaded=h.loadSettings(JSON.parse(JSON.stringify(settings)));
 assert.deepEqual(JSON.parse(JSON.stringify(fileButtons(reloaded))),JSON.parse(JSON.stringify(fileButtons(settings))));
 assert.equal(fileButtons(h.loadSettings({...legacy,customButtons:[]})).length,0);
 const repaired=h.loadSettings({customButtons:[{id:'same',customPath:'a.md'},{id:'same',customPath:'b.md'}]});
 assert.notEqual(fileButtons(repaired)[0].id,fileButtons(repaired)[1].id);
});
test('adding and editing independent buttons survives reload and opens each target',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});
 const tab=showFileTab(t);
 await addEntry(t,tab);
 assert.equal(fileButtons(plugin.settings).length,2);assert.equal(view.customRows.size,2);
 const first=fileButtons(plugin.settings)[0],second=fileButtons(plugin.settings)[1];assert.notEqual(first.id,second.id);
 t.files.set('one.md',new t.TFile('one.md'));t.files.set('two.png',new t.TFile('two.png'));
 tab.listRows.get(first.id).click();
 await editorSetting(tab,'主标题').text.change('One');await editorSetting(tab,'文件地址').text.change('one');
 tab.listRows.get(second.id).click();
 await editorSetting(tab,'主标题').text.change('Two');await editorSetting(tab,'副标题').text.change('图片');
 await editorSetting(tab,'文件地址').text.change('two.png');await editorSetting(tab,'按钮图标').text.change('star');
 assert.equal(first.customTitle,'One');assert.equal(second.customTitle,'Two');assert.equal(first.customIcon,'file');assert.equal(second.customIcon,'star');
 assert.equal(view.customRows.get(first.id).label.textContent,'One');assert.equal(view.customRows.get(second.id).subtitle.textContent,'图片');
 view.customRows.get(first.id).row.click();await tick();view.customRows.get(second.id).row.click();await tick();assert.deepEqual(t.opened,['one.md','two.png']);
 const next=new t.Plugin();next.saved=plugin.saved;await next.onload();assert.equal(fileButtons(next.settings).length,2);
 assert.equal(fileButtons(next.settings)[0].id,first.id);assert.equal(fileButtons(next.settings)[1].customPath,'two.png');
});
test('queued list saves preserve nested snapshots during rapid edits',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const writes=[];
 plugin.saveData=async data=>{writes.push(data);};
 const first=fileButtons(plugin.settings)[0];first.customTitle='old';const older=plugin.saveSettings();
 first.customTitle='new';const newer=plugin.saveSettings();await Promise.all([older,newer]);
 assert.equal(fileButtons(writes[0])[0].customTitle,'old');assert.equal(fileButtons(writes[1])[0].customTitle,'new');
});
test('multiple button suggestions and icon pickers update only their own entries',async()=>{
 const t=harness(),api=providerFixture(t),plugin=new t.Plugin();await plugin.onload();
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});
 const tab=showFileTab(t);const previous=[...tab.suggesters];await addEntry(t,tab);
 assert.ok(previous.every(suggest=>suggest.closed));assert.equal(tab.suggesters.length,2);
 const [first,second]=fileButtons(plugin.settings);
 const file=new t.TFile('second.md');t.files.set(file.path,file);
 await tab.suggesters[0].selectSuggestion(file.path);await tab.suggesters[1].selectSuggestion('star');
 assert.equal(first.customPath,'');assert.equal(first.customIcon,'file');assert.equal(second.customPath,file.path);assert.equal(second.customIcon,'star');
 iconPicker(tab).click();api.picker.onPick({id:'CI-extra'});await tick();
 assert.equal(fileButtons(plugin.saved)[0].customIcon,'file');assert.equal(fileButtons(plugin.saved)[1].customIcon,'CI-extra');
 assert.equal(view.customRows.get(first.id).icon.icon,'file');assert.equal(view.customRows.get(second.id).icon.icon,'CI-extra');
 assert.equal(editorSetting(tab,'按钮图标').text.inputEl.value,'CI-extra');
 t.app.workspace.activeLeaf={view:new t.FileView(file)};t.emit('active-leaf-change');
 assert.equal(view.customRows.get(second.id).row.attrs['aria-current'],'page');assert.equal(view.customRows.get(first.id).row.attrs['aria-current'],undefined);
 t.providers.clear();t.emit('custom-icons:changed');assert.equal(view.customRows.get(second.id).icon.icon,'file');assert.equal(second.customIcon,'CI-extra');
 tab.hide();assert.equal(tab.suggesters.length,0);
});
test('an invalid button does not interrupt other rows and empty lists render only Today',async()=>{
 const t=harness(),plugin=new t.Plugin();plugin.saved={customButtons:[{id:'bad',customPath:'../bad'},{id:'good',customPath:'good.md'}]};await plugin.onload();
 const file=new t.TFile('good.md');t.files.set(file.path,file);
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();
 assert.equal(view.customRows.get('bad').row.disabled,true);assert.equal(view.customRows.get('good').row.disabled,false);
 view.customRows.get('good').row.click();await tick();assert.deepEqual(t.opened,[file.path]);
 const empty=new t.Plugin();empty.saved={customPath:'legacy.md',customButtons:[]};await empty.onload();
 const emptyView=t.factories.get(t.h.VIEW_TYPE)({});await emptyView.onOpen();assert.equal(emptyView.customRows.size,0);assert.equal(emptyView.nav.children.length,1);
});
test('host Moment formats local dates, literal Chinese, nested paths and leap day',()=>{
 const {h}=harness();const date=new Date(2028,1,29,0,5);
 assert.equal(h.dailyPath(h.DEFAULTS,date),'00-journal/2028-02-29.md');
 assert.equal(h.dailyPath({folder:'日记/',dateFormat:'YYYY/MM/[日记-]DD'},date),'日记/2028/02/日记-29.md');
 assert.equal(h.dailyPath({folder:'',dateFormat:'YYYY-MM-DD[.md]'},date),'2028-02-29.md');
});
test('invalid settings and formatted path traversal are rejected; defaults survive missing data',()=>{
 const {h}=harness();assert.equal(h.loadSettings(null).folder,'00-journal');assert.equal(h.loadSettings({folder:4,dateFormat:null}).dateFormat,'YYYY-MM-DD');
 for(const folder of ['../private','/absolute','a//b','a/../b','C:\\notes','bad\u0000folder'])assert.throws(()=>h.dailyPath({folder,dateFormat:'YYYY-MM-DD'}),folder);
 for(const dateFormat of ['','[../escape]','[bad:name]'])assert.throws(()=>h.dailyPath({folder:'journal',dateFormat}),dateFormat);
 assert.equal(h.dailyPath({folder:'journal',dateFormat:'YYYY-MM-DD'},new Date(2026,9,23)),'journal/2026-10-23.md');
});
test('plugin registers sidebar/settings/command and reuses one leaf under concurrent requests',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();assert.equal(t.factories.size,1);assert.equal(t.tabs.length,1);assert.equal(t.commands.length,1);assert.equal(t.created,0);
 t.ready();await Promise.all([plugin.ensureSidebar(true),plugin.ensureSidebar(false)]);assert.equal(t.created,1);assert.equal(t.leaves[0].state.active,false);assert.equal(t.reveals,1);await plugin.ensureSidebar(false);assert.equal(t.created,1);
});
test('view has Today and one custom button; Today still opens the journal',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();let clicks=0;plugin.openToday=async()=>{clicks++;};const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();const nav=view.contentEl.children[0],row=nav.children[0];assert.equal(nav.tag,'nav');assert.equal(nav.children.length,2);assert.equal(row.tag,'button');assert.equal(row.attrs.type,'button');assert.equal(row.children[1].textContent,'今日日记');row.click();assert.equal(clicks,1);await view.onClose();assert.equal(view.contentEl.children.length,0);
});
test('Today opens the existing exact file in the main area; missing files are not created',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const target=t.h.dailyPath(plugin.settings);t.files.set(target,new t.TFile(target));await plugin.openToday();assert.deepEqual(t.opened,[target]);t.files.delete(target);await plugin.openToday();assert.equal(t.opened.length,1);assert.ok(t.notices.at(-1).includes(target));
});
for(const action of ['openToday','openCustom']) {
 test(action+' switches tabs without invoking the flashing reveal operation',async()=>{
  const t=harness(),plugin=new t.Plugin();await plugin.onload();fileButtons(plugin.settings)[0].customPath='note.md';
  const path=action==='openToday'?t.h.dailyPath(plugin.settings):fileButtons(plugin.settings)[0].customPath,file=new t.TFile(path);t.files.set(path,file);
  const target={view:new t.FileView(file)};t.mainLeaves.push(target);
  await plugin[action]();
  assert.equal(t.app.workspace.activeLeaf,target);assert.deepEqual(t.opened,[]);
  assert.equal(t.reveals,0,'switching an existing tab must not request the host highlight animation');
 });
 test(action+' reuses the first matching main tab without replacing pinned tabs',async()=>{
  const t=harness(),plugin=new t.Plugin();await plugin.onload();fileButtons(plugin.settings)[0].customPath='pictures/a.png';
  const path=action==='openToday'?t.h.dailyPath(plugin.settings):fileButtons(plugin.settings)[0].customPath,file=new t.TFile(path);t.files.set(path,file);
  const other={view:new t.FileView(new t.TFile('other.md')),pinned:true};
  const target={view:new t.FileView(file),pinned:true},duplicate={view:new t.FileView(file)};
  t.mainLeaves.push(other,target,duplicate);t.app.workspace.activeLeaf=other;t.app.workspace.mostRecentLeaf=other;
  const sidebar={},view=t.factories.get(t.h.VIEW_TYPE)(sidebar);sidebar.view=view;sidebar.type=t.h.VIEW_TYPE;t.leaves.push(sidebar);await view.onOpen();
  t.app.workspace.activeLeaf=sidebar;t.emit('active-leaf-change');
  const row=action==='openToday'?view.row:firstControls(view).row;row.click();await tick();
  assert.deepEqual(t.opened,[]);assert.equal(t.activatedLeaves[0],target);assert.equal(t.app.workspace.activeLeaf,target);
  assert.equal(row.attrs['aria-current'],'page');assert.equal(other.view.file.path,'other.md');assert.equal(other.pinned,true);assert.equal(target.pinned,true);assert.equal(t.mainLeaves.length,3);
  await plugin[action]();assert.equal(t.activatedLeaves.length,1,'focused target remains a no-op');
  t.app.workspace.activeLeaf=other;await plugin[action]();assert.equal(t.activatedLeaves[1],target,'duplicate choice remains stable');
 });
 test(action+' ignores sidebar-only targets and non-file main views',async()=>{
  const t=harness(),plugin=new t.Plugin();await plugin.onload();fileButtons(plugin.settings)[0].customPath='note.md';
  const path=action==='openToday'?t.h.dailyPath(plugin.settings):fileButtons(plugin.settings)[0].customPath,file=new t.TFile(path);t.files.set(path,file);
  t.leaves.push({view:new t.FileView(file)});
  t.mainLeaves.push({view:{file},getViewState:()=>({state:{file:path}})});
  await plugin[action]();assert.deepEqual(t.opened,[path]);assert.equal(t.reveals,0);
 });
 test(action+' loads a matching deferred tab before verifying and reusing it',async()=>{
  const t=harness(),plugin=new t.Plugin();await plugin.onload();fileButtons(plugin.settings)[0].customPath='note.md';
  const path=action==='openToday'?t.h.dailyPath(plugin.settings):fileButtons(plugin.settings)[0].customPath,file=new t.TFile(path);t.files.set(path,file);
  let loads=0;
  const unrelated={isDeferred:true,getViewState:()=>({state:{file:'other.md'}}),loadIfDeferred:async()=>{throw Error('must not load unrelated tabs');}};
  const nonfile={isDeferred:true,view:{},getViewState:()=>({state:{file:path}}),async loadIfDeferred(){this.isDeferred=false;}};
  const target={isDeferred:true,view:{},getViewState:()=>({state:{file:path}}),async loadIfDeferred(){loads++;this.view=new t.FileView(file);this.isDeferred=false;}};
  t.mainLeaves.push(unrelated,nonfile,target);await plugin[action]();
  assert.equal(loads,1);assert.deepEqual(t.opened,[]);assert.equal(t.activatedLeaves[0],target);assert.equal(t.app.workspace.activeLeaf,target);
 });
 test(action+' serializes deferred tab switches and recovers after activation failure',async()=>{
  const t=harness(),plugin=new t.Plugin();await plugin.onload();fileButtons(plugin.settings)[0].customPath='note.md';
  const path=action==='openToday'?t.h.dailyPath(plugin.settings):fileButtons(plugin.settings)[0].customPath,file=new t.TFile(path);t.files.set(path,file);
  let count=0,release;
  const target={view:{},isDeferred:true,getViewState:()=>({state:{file:path}}),async loadIfDeferred(){count++;await new Promise(resolve=>{release=resolve;});this.view=new t.FileView(file);this.isDeferred=false;}};
  t.mainLeaves.push(target);
  const first=plugin[action]();await tick();await plugin[action]();assert.equal(count,1);release();await first;assert.equal(plugin.opening,false);
  t.app.workspace.activeLeaf=null;t.app.workspace.setActiveLeaf=()=>{throw Error('activation failure');};
  await plugin[action]();assert.ok(t.notices.at(-1).includes('activation failure'));assert.equal(plugin.opening,false);assert.deepEqual(t.opened,[]);
 });
 test(action+' preserves selection and skips the target after sidebar focus',async()=>{
  const t=harness(),plugin=new t.Plugin();await plugin.onload();
  fileButtons(plugin.settings)[0].customPath='pictures/a.png';
  const target=action==='openToday'?t.h.dailyPath(plugin.settings):fileButtons(plugin.settings)[0].customPath;
  const file=new t.TFile(target);t.files.set(target,file);
  const editorLeaf={view:new t.FileView(file)};
  t.app.workspace.activeLeaf=editorLeaf;t.app.workspace.mostRecentLeaf=editorLeaf;
  const sidebarLeaf={},view=t.factories.get(t.h.VIEW_TYPE)(sidebarLeaf);sidebarLeaf.view=view;await view.onOpen();
  sidebarLeaf.type=t.h.VIEW_TYPE;t.leaves.push(sidebarLeaf);
  const row=action==='openToday'?view.row:firstControls(view).row;
  assert.equal(row.attrs['aria-current'],'page');
  // The host's pointerdown capture/focusin handler activates the sidebar before click.
  t.app.workspace.activeLeaf=sidebarLeaf;t.emit('active-leaf-change');
  assert.equal(row.attrs['aria-current'],'page','sidebar focus must preserve target selection');
  t.emit('file-open');for(const refresh of t.intervals.values())refresh();
  assert.equal(row.attrs['aria-current'],'page','file events and timer must preserve selection');
  const getLeaf=t.app.workspace.getLeaf;let created=0;
  t.app.workspace.getLeaf=mode=>{created++;return getLeaf(mode);};
  row.click();await tick();row.click();await tick();
  assert.equal(row.attrs['aria-current'],'page');
  assert.equal(created,0);assert.deepEqual(t.opened,[]);assert.deepEqual(t.notices,[]);
  assert.equal(plugin.opening,false);
  // A different main file must open the target, even while the sidebar has focus.
  t.app.workspace.mostRecentLeaf={view:new t.FileView(new t.TFile('other.md'))};
  t.emit('active-leaf-change');assert.equal(row.attrs['aria-current'],undefined);
  row.click();await tick();assert.equal(created,1);assert.deepEqual(t.opened,[target]);
  // An empty/canvas main view must not borrow a previously opened target file.
  t.app.workspace.mostRecentLeaf={view:{file}};
  t.emit('file-open');assert.equal(row.attrs['aria-current'],undefined);
  row.click();await tick();assert.equal(created,2);
  t.app.workspace.mostRecentLeaf=null;
  row.click();await tick();assert.equal(created,3);
 });
 test(action+' does not create a tab for the focused target and releases the click guard',async()=>{
  const t=harness(),plugin=new t.Plugin();await plugin.onload();
  fileButtons(plugin.settings)[0].customPath='inbox';
  const target=action==='openToday'?t.h.dailyPath(plugin.settings):'inbox.md';
  t.files.set(target,new t.TFile(target));
  t.app.workspace.activeLeaf={view:new t.FileView(new t.TFile(target))};
  const getLeaf=t.app.workspace.getLeaf;let created=0;
  t.app.workspace.getLeaf=mode=>{created++;return getLeaf(mode);};
  await plugin[action]();await plugin[action]();
  assert.equal(created,0);assert.deepEqual(t.opened,[]);assert.deepEqual(t.notices,[]);assert.equal(plugin.opening,false);
  t.files.delete(target);await plugin[action]();
  assert.equal(created,0);assert.ok(t.notices.at(-1).includes(action==='openToday'?target:fileButtons(plugin.settings)[0].customPath),'missing target still reports an error');
  t.files.set(target,new t.TFile(target));t.app.workspace.activeLeaf=null;
  await plugin[action]();assert.equal(created,1);assert.deepEqual(t.opened,[target]);
 });
 test(action+' still opens a new tab for another file, an empty view or a non-file view',async()=>{
  const t=harness(),plugin=new t.Plugin();await plugin.onload();
  fileButtons(plugin.settings)[0].customPath='pictures/a.png';
  const target=action==='openToday'?t.h.dailyPath(plugin.settings):fileButtons(plugin.settings)[0].customPath;
  const file=new t.TFile(target);t.files.set(target,file);
  const views=[new t.FileView(new t.TFile('other.md')),new t.FileView(null),{file},null];
  for(const view of views){t.app.workspace.activeLeaf=view?{view}:null;await plugin[action]();}
  assert.deepEqual(t.opened,views.map(()=>target));assert.deepEqual(t.notices,[]);
 });
}
test('Today recomputes local date across midnight without changing settings',async()=>{
 let now=new Date(2026,9,23,23,59).valueOf();
 class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}}
 const t=harness({DateClass:Clock}),plugin=new t.Plugin();await plugin.onload();for(const day of ['2026-10-23','2026-10-24']){const path='00-journal/'+day+'.md';t.files.set(path,new t.TFile(path));}
 await plugin.openToday();now=new Date(2026,9,24,0,1).valueOf();await plugin.openToday();assert.deepEqual(t.opened,['00-journal/2026-10-23.md','00-journal/2026-10-24.md']);
});
test('settings fields persist independently, show path preview and reload',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const tab=t.tabs[0];tab.display();assert.equal(tab.editorEl.settings.length,6);await editorSetting(tab,'日记文件夹').text.change('notes');await editorSetting(tab,'文件名日期格式').text.change('YYYY/MM/DD');assert.equal(plugin.saved.folder,'notes');assert.equal(plugin.saved.dateFormat,'YYYY/MM/DD');const next=new t.Plugin();next.saved=plugin.saved;await next.onload();assert.equal(next.settings.folder,'notes');assert.equal(next.settings.dateFormat,'YYYY/MM/DD');
});
test('serialized saves retain the newest edit and recover after a rejected save',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();let writes=[];plugin.saveData=async data=>{writes.push(data.folder);if(writes.length===1)throw Error('disk error');plugin.saved=data;};plugin.settings.folder='a';const first=plugin.saveSettings();plugin.settings.folder='b';const second=plugin.saveSettings();await assert.rejects(first,/disk error/);await second;assert.deepEqual(writes,['a','b']);assert.equal(plugin.saved.folder,'b');
});
test('missing sidebar and file-open errors report actionable notices',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();t.app.workspace.getLeftLeaf=()=>null;await assert.rejects(plugin.ensureSidebar(false),/左侧栏/);const target=t.h.dailyPath(plugin.settings);t.files.set(target,new t.TFile(target));t.app.workspace.getLeaf=()=>({openFile:async()=>{throw Error('test open failure');}});await plugin.openToday();assert.ok(t.notices.at(-1).includes('test open failure'));assert.equal(plugin.opening,false);
});
test('rapid Today clicks open once, and unloading prevents later layout-ready side effects',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const target=t.h.dailyPath(plugin.settings);t.files.set(target,new t.TFile(target));let release,count=0;t.app.workspace.getLeaf=()=>({openFile:async()=>{count++;await new Promise(resolve=>{release=resolve;});}});const opening=plugin.openToday();await tick();await plugin.openToday();assert.equal(count,1);release();await opening;plugin.onunload();t.ready();await tick();assert.equal(t.created,0);
});
test('installable package metadata and all runtime files exist',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json')));assert.equal(manifest.id,'ctz-today-sidebar');assert.match(manifest.version,/^\d+\.\d+\.\d+$/);for(const file of ['main.js','styles.css'])assert.ok(fs.statSync(path.join(__dirname,file)).size>0);assert.equal(typeof harness().Plugin,'function');
});
test('Today tracks focused file rather than the most recent note',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const target=t.h.dailyPath(plugin.settings),today=new t.TFile(target);t.app.workspace.activeLeaf={view:new t.FileView(today)};const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});const row=view.row;assert.equal(row.attrs['aria-current'],'page');
 t.app.workspace.activeLeaf={view:new t.FileView(new t.TFile('other.md'))};t.emit('active-leaf-change');assert.equal(row.attrs['aria-current'],undefined);
 t.app.workspace.activeLeaf={view:new t.FileView(today)};t.emit('file-open');assert.equal(row.attrs['aria-current'],'page');
 t.app.workspace.activeLeaf={view:{file:today}};t.emit('active-leaf-change');assert.equal(row.attrs['aria-current'],undefined,'non-FileView must not borrow last file');
 t.app.workspace.activeLeaf=null;t.emit('active-leaf-change');assert.equal(row.attrs['aria-current'],undefined);
 await view.onClose();t.emit('file-open');assert.equal(view.row,null);
});
test('selection updates for custom settings and invalid formats without a focus change',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const target=t.h.dailyPath(plugin.settings);t.app.workspace.activeLeaf={view:new t.FileView(new t.TFile(target))};const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});assert.equal(view.row.attrs['aria-current'],'page');
 plugin.settings.folder='custom';plugin.settings.dateFormat='YYYY/MM/DD';await plugin.saveSettings();assert.equal(view.row.attrs['aria-current'],undefined);t.app.workspace.activeLeaf.view.file=new t.TFile(t.h.dailyPath(plugin.settings));t.emit('file-open');assert.equal(view.row.attrs['aria-current'],'page');
 plugin.settings.dateFormat='';await plugin.saveSettings();assert.equal(view.row.attrs['aria-current'],undefined);assert.equal(t.notices.length,0);
});
test('selection expires after midnight and plugin unload removes listeners and timer',async()=>{
 let now=new Date(2026,9,23,23,59).valueOf();class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}}
 const t=harness({DateClass:Clock}),plugin=new t.Plugin();await plugin.onload();t.app.workspace.activeLeaf={view:new t.FileView(new t.TFile('00-journal/2026-10-23.md'))};const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});assert.equal(view.row.attrs['aria-current'],'page');assert.equal(view.dateLabel.textContent,'2026-10-23 Fri');now=new Date(2026,9,24,0,1).valueOf();for(const fn of t.intervals.values())fn();assert.equal(view.row.attrs['aria-current'],undefined);assert.equal(view.dateLabel.textContent,'2026-10-24 Sat');assert.equal(t.listeners.size,9);assert.equal(t.intervals.size,1);plugin.unload();assert.equal(t.listeners.size,0);assert.equal(t.intervals.size,0);
});
test('display format migrates independently and never changes the journal path',()=>{
 const {h}=harness(),date=new Date(2026,9,23,12);const settings=h.loadSettings({folder:'journal',dateFormat:'YYYY/MM/DD'});assert.equal(settings.displayFormat,'YYYY-MM-DD ddd');assert.equal(h.displayDate(settings,date),'2026-10-23 Fri');settings.displayFormat='M月D日';assert.equal(h.displayDate(settings,date),'10月23日');assert.equal(h.dailyPath(settings,date),'journal/2026/10/23.md');settings.displayFormat='[<今天>] MM/DD';assert.equal(h.displayDate(settings,date),'<今天> 10/23');settings.displayFormat='';assert.equal(h.displayDate(settings,date),'');assert.equal(h.loadSettings({displayFormat:''}).displayFormat,'');
});
test('display settings save, update the sidebar immediately, hide and reload',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});assert.match(view.dateLabel.textContent,/^\d{4}-\d{2}-\d{2} [A-Z][a-z]{2}$/);const tab=t.tabs[0];tab.display();await editorSetting(tab,'副标题').text.change('[自定义日期]');assert.equal(view.dateLabel.textContent,'自定义日期');assert.equal(plugin.saved.displayFormat,'[自定义日期]');await editorSetting(tab,'副标题').text.change('');assert.equal(view.dateLabel.hidden,true);const next=new t.Plugin();next.saved=plugin.saved;await next.onload();assert.equal(next.settings.displayFormat,'');
});
test('display weekday is English without changing global locale, filenames or saved formats',()=>{
 const t=harness(),date=new Date(2026,9,23,12);t.moment.locale('zh-cn');const original=t.moment.locale();const settings=t.h.loadSettings({dateFormat:'YYYY-MM-DD ddd',displayFormat:'YYYY-MM-DD ddd'});const filename=t.h.dailyPath(settings,date);assert.equal(t.h.displayDate(settings,date),'2026-10-23 Fri');assert.equal(t.moment.locale(),original);assert.equal(t.h.dailyPath(settings,date),filename);assert.equal(t.h.loadSettings({displayFormat:'MM/DD'}).displayFormat,'MM/DD');settings.displayFormat='dddd';assert.equal(t.h.displayDate(settings,date),'Friday');
});
test('custom button defaults, filename fallback, literal labels and exact-path priority',()=>{
 const t=harness(),settings=fileButtons(t.h.loadSettings(null))[0];assert.equal(settings.customPath,'');assert.equal(settings.customTitle,'');assert.equal(settings.customSubtitle,'');assert.equal(t.h.customInfo(settings,t.app.vault).title,'自定义');
 t.files.set('folder/笔记.md',new t.TFile('folder/笔记.md'));settings.customPath='folder/笔记';let info=t.h.customInfo(settings,t.app.vault);assert.equal(info.file.path,'folder/笔记.md');assert.equal(info.title,'笔记');assert.equal(info.subtitle,'');settings.customTitle='入口';settings.customSubtitle='YYYY <b>文字</b>';info=t.h.customInfo(settings,t.app.vault);assert.equal(info.title,'入口');assert.equal(info.subtitle,'YYYY <b>文字</b>');t.files.set('folder/笔记',new t.TFile('folder/笔记'));assert.equal(t.h.customInfo(settings,t.app.vault).file.path,'folder/笔记');
});
test('custom settings save, reload and immediately update row labels and focused state',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});assert.equal(firstControls(view).row.disabled,true);assert.equal(firstControls(view).subtitle.hidden,true);const file=new t.TFile('12-task/inbox.md');t.files.set(file.path,file);const tab=showFileTab(t);await editorSetting(tab,'文件地址').text.change(file.path);assert.equal(firstControls(view).row.disabled,false);assert.equal(firstControls(view).label.textContent,'inbox');t.app.workspace.activeLeaf={view:new t.FileView(file)};t.emit('active-leaf-change');assert.equal(firstControls(view).row.attrs['aria-current'],'page');assert.equal(view.row.attrs['aria-current'],undefined);await editorSetting(tab,'主标题').text.change('Inbox');await editorSetting(tab,'副标题').text.change('收集');assert.equal(firstControls(view).label.textContent,'Inbox');assert.equal(firstControls(view).subtitle.textContent,'收集');assert.equal(firstControls(view).subtitle.hidden,false);const next=new t.Plugin();next.saved=plugin.saved;await next.onload();assert.equal(fileButtons(next.settings)[0].customTitle,'Inbox');assert.equal(fileButtons(next.settings)[0].customSubtitle,'收集');assert.equal(fileButtons(next.settings)[0].customPath,file.path);t.app.workspace.activeLeaf=null;t.emit('active-leaf-change');assert.equal(firstControls(view).row.attrs['aria-current'],undefined);
});
test('custom action opens the configured file, including non-Markdown files',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();fileButtons(plugin.settings)[0].customPath='pictures/a.png';const file=new t.TFile(fileButtons(plugin.settings)[0].customPath);t.files.set(file.path,file);const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();firstControls(view).row.click();await tick();assert.deepEqual(t.opened,[file.path]);fileButtons(plugin.settings)[0].customPath='note';t.files.set('note.md',new t.TFile('note.md'));await plugin.openCustom();assert.deepEqual(t.opened,[file.path,'note.md']);
});
test('custom missing, invalid and blank targets report errors without writing or opening',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();await plugin.openCustom();assert.ok(t.notices.at(-1).includes('文件地址'));fileButtons(plugin.settings)[0].customPath='missing.md';await plugin.openCustom();assert.ok(t.notices.at(-1).includes('missing.md'));fileButtons(plugin.settings)[0].customPath='../outside.md';await plugin.openCustom();assert.ok(t.notices.at(-1).includes('相对路径'));const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();assert.equal(firstControls(view).row.disabled,true);assert.equal(t.opened.length,0);assert.equal(plugin.opening,false);
});
test('custom open failure and rapid repeated actions leave the opening guard usable',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();fileButtons(plugin.settings)[0].customPath='note.md';t.files.set('note.md',new t.TFile('note.md'));t.app.workspace.getLeaf=()=>({openFile:async()=>{throw Error('custom failure');}});await plugin.openCustom();assert.ok(t.notices.at(-1).includes('custom failure'));assert.equal(plugin.opening,false);let count=0,release;t.app.workspace.getLeaf=()=>({openFile:async()=>{count++;await new Promise(resolve=>{release=resolve;});}});const first=plugin.openCustom();await plugin.openCustom();assert.equal(count,1);release();await first;assert.equal(plugin.opening,false);
});
test('file suggestions match existing full paths, rank names and include current non-Markdown files',()=>{
 const t=harness(),input=new t.Element('input');for(const path of ['folder/inbox.md','12-task/inbox.md','pictures/map.png','folder/Other.md'])t.files.set(path,new t.TFile(path));const suggest=new t.h.OptionSuggest(t.app,input,()=>t.app.vault.getFiles().map(f=>f.path),()=>{});assert.equal(suggest.getSuggestions('INBOX').length,2);assert.equal(suggest.getSuggestions('12-task inbox')[0],'12-task/inbox.md');assert.equal(suggest.getSuggestions('MAP')[0],'pictures/map.png');assert.equal(suggest.getSuggestions('not-existing').length,0);t.files.set('new.md',new t.TFile('new.md'));assert.equal(suggest.getSuggestions('new')[0],'new.md');t.files.delete('new.md');assert.equal(suggest.getSuggestions('new').length,0);assert.equal(t.h.matchOptions(Array.from({length:100},(_,i)=>'file'+i),'').length,40);assert.equal(t.h.matchOptions(['inbox-folder/other.md','notes/inbox.md'],'inbox')[0],'notes/inbox.md');
});
test('choosing a suggested file fills full input path, saves and refreshes the custom button',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();t.files.set('12-task/inbox.md',new t.TFile('12-task/inbox.md'));const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});const tab=showFileTab(t);const suggest=tab.suggesters[0];await suggest.selectSuggestion('12-task/inbox.md');assert.equal(editorSetting(tab,'文件地址').text.inputEl.value,'12-task/inbox.md');assert.equal(fileButtons(plugin.settings)[0].customPath,'12-task/inbox.md');assert.equal(fileButtons(plugin.saved)[0].customPath,'12-task/inbox.md');assert.equal(firstControls(view).label.textContent,'inbox');assert.equal(suggest.closed,true);
});
test('icon choice supports preview, immediate update, persistence and invalid-name fallback',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();assert.equal(fileButtons(plugin.settings)[0].customIcon,'file');const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});const tab=showFileTab(t);const suggest=tab.suggesters[1];assert.equal(suggest.getSuggestions('book')[0],'book-open');const candidate=new t.Element();suggest.renderSuggestion('book-open',candidate);assert.equal(candidate.children[0].icon,'book-open');assert.equal(candidate.children[1].textContent,'book-open');await suggest.selectSuggestion('star');assert.equal(firstControls(view).icon.icon,'star');assert.equal(fileButtons(plugin.saved)[0].customIcon,'star');assert.equal(editorSetting(tab,'按钮图标').controlEl.children[0].icon,'star');await editorSetting(tab,'按钮图标').text.change('bad-icon');assert.equal(firstControls(view).icon.icon,'file');assert.equal(editorSetting(tab,'按钮图标').controlEl.children[0].icon,'file');await editorSetting(tab,'按钮图标').text.change('');assert.equal(firstControls(view).icon.icon,'file');assert.equal(fileButtons(t.h.loadSettings({customIcon:42}))[0].customIcon,'file');const next=new t.Plugin();next.saved={...plugin.saved,buttons:plugin.saved.buttons.map(button=>button.type==='file'?{...button,customIcon:'book-open'}:button)};await next.onload();assert.equal(fileButtons(next.settings)[0].customIcon,'book-open');
});
test('settings repaint and hide close previous suggestion popovers',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const tab=showFileTab(t);const first=[...tab.suggesters];assert.equal(first.length,2);tab.display();assert.ok(first.every(s=>s.closed));const second=[...tab.suggesters];tab.hide();assert.ok(second.every(s=>s.closed));assert.equal(tab.suggesters.length,0);
});
function providerFixture(t) {
 const api={version:1,has:id=>id==='CI-extra',renderTo(el,id){if(!this.has(id))return false;el.icon=id;this.rendered=(this.rendered||0)+1;return true;},catalog:()=>[{ids:['file','CI-extra','CI-extra']}],openPicker(options){this.picker=options;}};t.providers.set('custom-sidebar-icons',{api});return api;
}
test('Custom Icons API-only icons join native candidates and render in preview/sidebar',async()=>{
 const t=harness(),api=providerFixture(t),plugin=new t.Plugin();await plugin.onload();fileButtons(plugin.settings)[0].customIcon='CI-extra';const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();assert.equal(firstControls(view).icon.icon,'CI-extra');const tab=showFileTab(t);assert.equal(editorSetting(tab,'按钮图标').controlEl.children[0].icon,'CI-extra');assert.equal(tab.suggesters[1].getSuggestions('CI-extra')[0],'CI-extra');assert.equal(t.h.availableIconIds(t.app).filter(id=>id==='CI-extra').length,1);assert.ok(api.rendered>=2);
});
test('Custom Icons picker saves selection, updates input and supports explicit clear',async()=>{
 const t=harness(),api=providerFixture(t),plugin=new t.Plugin();await plugin.onload();const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});const tab=showFileTab(t);const setting=editorSetting(tab,'按钮图标');iconPicker(tab).click();assert.equal(api.picker.sourceEl,iconPicker(tab));assert.equal(api.picker.include.lucideExtras,true);assert.equal(api.picker.colorEditable,false);api.picker.onPick({id:'CI-extra'});await tick();assert.equal(fileButtons(plugin.saved)[0].customIcon,'CI-extra');assert.equal(setting.text.inputEl.value,'CI-extra');assert.equal(firstControls(view).icon.icon,'CI-extra');api.picker.onPick(null);await tick();assert.equal(fileButtons(plugin.saved)[0].customIcon,'file');assert.equal(firstControls(view).icon.icon,'file');plugin.onunload();api.picker.onPick({id:'CI-extra'});assert.equal(fileButtons(plugin.settings)[0].customIcon,'file');
});
test('provider change, disable and replacement refresh without losing saved custom icon',async()=>{
 const t=harness(),first=providerFixture(t),plugin=new t.Plugin();await plugin.onload();fileButtons(plugin.settings)[0].customIcon='CI-extra';const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();t.leaves.push({type:t.h.VIEW_TYPE,view});const tab=showFileTab(t);assert.equal(firstControls(view).icon.icon,'CI-extra');t.providers.delete('custom-sidebar-icons');t.emit('custom-icons:changed');assert.equal(firstControls(view).icon.icon,'file');assert.equal(editorSetting(tab,'按钮图标').controlEl.children[0].icon,'file');assert.equal(fileButtons(plugin.settings)[0].customIcon,'CI-extra');const before=first.rendered,second=providerFixture(t);t.emit('custom-icons:changed');assert.equal(firstControls(view).icon.icon,'CI-extra');assert.ok(second.rendered>=2);assert.equal(first.rendered,before);
});
test('missing, incompatible or failing provider preserves native fallback and useful notices',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const tab=showFileTab(t);iconPicker(tab).click();assert.ok(t.notices.at(-1).includes('Custom Icons'));const api=providerFixture(t);api.version=2;assert.equal(t.h.customIconsApi(t.app),null);assert.equal(t.h.iconId('star',t.app),'star');api.version=1;api.has=()=>{throw Error('provider gone');};assert.equal(t.h.iconId('CI-extra',t.app),'file');api.catalog=()=>{throw Error('bad catalogue');};assert.ok(t.h.availableIconIds(t.app).includes('star'));api.openPicker=()=>{throw Error('picker failed');};iconPicker(tab).click();assert.ok(t.notices.at(-1).includes('picker failed'));const el=new t.Element();api.renderTo=(el)=>{el.createSpan({text:'partial'});throw Error('render failed');};t.h.drawIcon(t.app,el,'star');assert.equal(el.icon,'star');assert.equal(el.children.length,0);t.app.plugins.getPlugin=()=>{throw Error('lookup failed');};assert.equal(t.h.customIconsApi(t.app),null);
});

async function savePreset(tab,name) {
 const sourceId=tab.selectedId;await tab.savePresetButton.click();
 const preset=tab.plugin.settings.presets.at(-1);assert.equal(tab.selectedPresetId,preset.id);assert.equal(editorSetting(tab,'预设名称').text.value,preset.name);
 if(name)await editorSetting(tab,'预设名称').text.change(name);
 tab.listRows.get(sourceId).click();
}
test('presets save snapshots, edit separately, add independent entries and survive reload',async()=>{
 const {plugin,tab,files,menus,metadata,emit,file}=await displayFixture([{id:'a',type:'file',customPath:'notes/a.md',customTitle:'收集',subtitleMode:'frontmatter',subtitleProperty:'summary',iconMode:'tasks'}],{frontmatter:{summary:'内容'}});
 await savePreset(tab,'收集预设');
 const preset=plugin.settings.presets[0];assert.equal(preset.name,'收集预设');assert.notEqual(preset.button.id,'a');assert.equal(tab.presetRows.size,1);
 assert.notEqual(preset.button,plugin.settings.buttons[0]);
 tab.presetRows.get(preset.id).click();assert.equal(editorSetting(tab,'预设名称').text.value,'收集预设');assert.equal(tab.moveUpButton.disabled,true);
 await editorSetting(tab,'主标题').text.change('预设标题');assert.equal(plugin.settings.buttons[0].customTitle,'收集');
 metadata.set(file.path,{frontmatter:{summary:'更新值'}});emit('changed',file);assert.equal(editorSetting(tab,'副标题属性名').controlEl.children.at(-1).textContent,'更新值');
 await editorSetting(tab,'预设名称').text.change('新版预设');assert.equal(tab.presetRows.get(preset.id).children[1].textContent,'新版预设');
 await tab.addButton.click();const menu=menus.at(-1);assert.equal(menu.items[2].separator,true);assert.equal(menu.items[3].title,'新版预设');await menu.items[3].click();
 const added=plugin.settings.buttons.at(-1);assert.notEqual(added.id,preset.button.id);assert.equal(added.customTitle,'预设标题');assert.equal(added.subtitleProperty,'summary');assert.equal(added.iconMode,'tasks');
 await editorSetting(tab,'主标题').text.change('独立条目');assert.equal(preset.button.customTitle,'预设标题');
 const next=new plugin.constructor();next.saved=plugin.saved;await next.onload();assert.equal(next.settings.presets[0].button.customTitle,'预设标题');assert.equal(next.settings.buttons.at(-1).customTitle,'独立条目');
 tab.presetRows.get(preset.id).click();await tab.deleteButton.click();assert.equal(plugin.settings.presets.length,0);assert.equal(plugin.settings.buttons.length,2);assert.equal(files.has('notes/a.md'),true);
});
test('Today cannot save new presets but existing Today presets remain compatible and singleton',async()=>{
 const t=harness(),plugin=new t.Plugin();plugin.saved={presets:[{id:'today-preset',name:'日记模板',button:{type:'today'},folder:'daily'}]};await plugin.onload();const tab=t.tabs[0];tab.display();
 assert.equal(tab.savePresetButton,null);await editorSetting(tab,'日记文件夹').text.change('daily');const preset=plugin.settings.presets[0];
 tab.presetRows.get(preset.id).click();await editorSetting(tab,'日记文件夹').text.change('preset-daily');await editorSetting(tab,'副标题').text.change('MM/DD');
 assert.equal(plugin.settings.folder,'daily');assert.equal(preset.folder,'preset-daily');
 await tab.addButton.click();const item=t.menus.at(-1).items.find(item=>item.title==='日记模板');assert.equal(item.disabled,true);await item.click();assert.equal(plugin.settings.buttons.filter(button=>button.type==='today').length,1);
 plugin.settings.buttons=plugin.settings.buttons.filter(button=>button.type!=='today');await plugin.saveSettings();tab.display();await tab.addButton.click();await t.menus.at(-1).items.find(item=>item.title==='日记模板').click();
 assert.equal(plugin.settings.buttons.filter(button=>button.type==='today').length,1);assert.equal(plugin.settings.folder,'preset-daily');assert.equal(plugin.settings.displayFormat,'MM/DD');assert.equal(plugin.settings.buttons[0].type,'today');
});
test('separator presets retain style, automatically name copies, and do not create entries on save',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();const tab=t.tabs[0];tab.display();await addEntry(t,tab,'分隔条目');
 await editorSetting(tab,'分隔样式').dropdown.change('dashed');const count=plugin.settings.buttons.length;
 await savePreset(tab);await savePreset(tab);assert.deepEqual(Array.from(plugin.settings.presets,item=>item.name),['虚线','虚线（2）']);assert.equal(plugin.settings.buttons.length,count);
 const preset=plugin.settings.presets[0];tab.presetRows.get(preset.id).click();await editorSetting(tab,'分隔样式').dropdown.change('space');assert.equal(plugin.settings.buttons.at(-1).separatorStyle,'dashed');
 await tab.addButton.click();await t.menus.at(-1).items.find(item=>item.title==='虚线').click();assert.equal(plugin.settings.buttons.at(-1).separatorStyle,'space');
 const data=plugin.saved;const normalized=t.h.loadSettings(data);assert.deepEqual(JSON.parse(JSON.stringify(t.h.loadSettings(normalized))),JSON.parse(JSON.stringify(normalized)));
});
test('preset migration handles missing or invalid data and allocates distinct ids',()=>{
 const {h}=harness();assert.equal(h.loadSettings({}).presets.length,0);
 const settings=h.loadSettings({buttons:[{id:'same',type:'file'}],presets:[null,{name:''},{name:'bad',button:{type:'unknown'}},{id:'same',name:'有效',button:{id:'same',type:'file',subtitleMode:'bad'}}]});
 assert.equal(settings.presets.length,1);const preset=settings.presets[0];assert.equal(new Set([settings.buttons[0].id,preset.id,preset.button.id]).size,3);assert.equal(preset.button.subtitleMode,'text');
});

test('preset rows match sidebar content with grips and no eyes; saving uses the resolved main title',async()=>{
 const {plugin,tab,metadata,file,emit}=await displayFixture([{id:'a',type:'file',customPath:'notes/a.md',customTitle:'旧标题',titleMode:'frontmatter',titleProperty:'title',customSubtitle:'副标题',customIcon:'star'}],{frontmatter:{title:'当前主标题'}});
 assert.equal(tab.savePresetButton.parent,tab.deleteButton.parent);
 await tab.savePresetButton.click();const first=plugin.settings.presets[0];assert.equal(first.name,'当前主标题');
 const row=tab.presetRows.get(first.id),entry=tab.presetEntryRows.get(first.id);
 assert.equal(entry.children.length,2);assert.equal(entry.children[0],tab.presetDragHandles.get(first.id));
 assert.equal(row.children[0].icon,'star');assert.equal(row.children[1].textContent,'当前主标题');assert.equal(row.children[2].textContent,'副标题');
 tab.listRows.get('a').click();metadata.set(file.path,{frontmatter:{title:'另一个标题'}});emit('changed',file);await tab.savePresetButton.click();
 const before=plugin.settings.buttons.map(button=>button.id);await tab.reorder(first.id,1,'presets');assert.equal(plugin.settings.presets[1].id,first.id);assert.deepEqual(plugin.settings.buttons.map(button=>button.id),before);
 assert.deepEqual(plugin.saved.presets.map(item=>item.name),['另一个标题','当前主标题']);
 await tab.addButton.click();
});

test('preset previews refresh task counts even when no live sidebar entry uses tasks',async()=>{
 const t=harness(),plugin=new t.Plugin();plugin.saved={buttons:[],presets:[{id:'p',name:'任务模板',button:{type:'file',customPath:'tasks.md',subtitleMode:'tasks',iconMode:'tasks'}}]};
 const file=new t.TFile('tasks.md');t.files.set(file.path,file);t.metadata.set(file.path,{listItems:taskItems([' ','x'])});await plugin.onload();
 const tab=t.tabs[0];tab.display();await plugin.taskCounter.reloadStatuses();
 assert.equal(tab.presetRows.get('p').children[2].textContent,'1');assert.equal(tab.presetRows.get('p').children[0].attrs['data-pie'],'true');
 t.metadata.set(file.path,{listItems:taskItems(['x','x'])});t.emit('changed',file);assert.equal(tab.presetRows.get('p').children[2].textContent,'0');
 tab.hide();assert.equal(plugin.taskCounter.enabledButtons().length,0);
});

test('renaming a preset preserves grip SVG geometry and updates only its accessible label',async()=>{
 const {plugin,tab}=await displayFixture([{id:'a',type:'file',customPath:'notes/a.md',customTitle:'原名'}],{});
 await tab.savePresetButton.click();const preset=plugin.settings.presets[0];tab.presetRows.get(preset.id).click();
 const handle=tab.presetDragHandles.get(preset.id),svg=handle.children[0],label=handle.children[1];
 assert.equal(svg.tag,'svg');assert.equal(svg.children[0].tag,'circle');
 await editorSetting(tab,'预设名称').text.change('新名');
 assert.equal(svg.textContent,'');assert.equal(svg.children[0].tag,'circle');assert.equal(label.textContent,'拖动 新名');
});

test('a preset with a cleared target cannot display the old fallback title in frontmatter mode',async()=>{
 const t=await displayFixture([{id:'a',type:'file',customPath:'notes/a.md',customTitle:'任务A',titleMode:'frontmatter',titleProperty:'title'}],{frontmatter:{title:'任务A'}});
 const {plugin,tab,view,files,TFile,metadata}=t;
 await tab.savePresetButton.click();const preset=plugin.settings.presets[0];tab.presetRows.get(preset.id).click();
 await editorSetting(tab,'文件地址').text.change('');
 await addEntry(t,tab,'任务A');const button=plugin.settings.buttons.at(-1);
 assert.equal(button.customPath,'');assert.equal(button.customTitle,'任务A','the ordinary text setting is retained');
 assert.equal(tab.listRows.get(button.id).children[1].textContent,'自定义');
 assert.equal(view.customRows.get(button.id).label.textContent,'自定义');
 assert.equal(editorSetting(tab,'标题属性名').controlEl.children.at(-1).textContent,'（空或缺失）');
 await editorSetting(tab,'主标题来源').dropdown.change('text');assert.equal(view.customRows.get(button.id).label.textContent,'任务A');
 await editorSetting(tab,'主标题来源').dropdown.change('frontmatter');
 files.set('notes/b.md',new TFile('notes/b.md'));metadata.set('notes/b.md',{frontmatter:{title:'任务B'}});
 await editorSetting(tab,'文件地址').text.change('notes/b.md');assert.equal(view.customRows.get(button.id).label.textContent,'任务B');
 assert.equal(view.customRows.get('a').label.textContent,'任务A');assert.equal(preset.button.customPath,'');
 const next=new plugin.constructor();next.saved=plugin.saved;await next.onload();const restored=next.settings.presets[0].button;
 assert.equal(next.fileTitle(restored,t.h.customInfo(restored,t.app.vault)),'自定义');
});

test('frontmatter abbreviations are opt-in, preserve the source and other modes, and survive presets',async()=>{
 const t=await displayFixture([{id:'a',type:'file',customPath:'notes/a.md',customTitle:'普通标题',titleMode:'frontmatter',titleProperty:'title',titleShorteningEnabled:true,titleShortName:'简称'}],{frontmatter:{title:'很长的属性标题'}});
 const {plugin,tab,view}=t;
 assert.equal(view.customRows.get('a').label.textContent,'简称');assert.equal(view.customRows.get('a').label.title,'很长的属性标题');
 assert.equal(editorSetting(tab,'标题属性名').controlEl.children.at(-1).textContent,'很长的属性标题');
 await editorSetting(tab,'简称').text.change('新简称');assert.equal(view.customRows.get('a').label.textContent,'新简称');
 await editorSetting(tab,'使用简称').toggle.change(false);assert.equal(view.customRows.get('a').label.textContent,'很长的属性标题');
 await editorSetting(tab,'使用简称').toggle.change(true);await editorSetting(tab,'主标题来源').dropdown.change('text');assert.equal(view.customRows.get('a').label.textContent,'普通标题');
 await editorSetting(tab,'主标题来源').dropdown.change('frontmatter');await tab.savePresetButton.click();
 const preset=plugin.settings.presets[0];assert.equal(preset.button.titleShortName,'新简称');assert.equal(preset.button.titleShorteningEnabled,true);
 tab.presetRows.get(preset.id).click();await editorSetting(tab,'文件地址').text.change('');await addEntry(t,tab,preset.name);
 assert.equal(view.customRows.get(plugin.settings.buttons.at(-1).id).label.textContent,'自定义');
 const next=new plugin.constructor();next.saved=plugin.saved;await next.onload();assert.equal(next.settings.buttons[0].titleShortName,'新简称');
 assert.equal(t.h.loadSettings({buttons:[{type:'file'}]}).buttons[0].titleShorteningEnabled,false);
});

test('Chinese and English copy tables have matching placeholders and complete interface translations',()=>{
 const {h}=harness();
 for(const [key,pair] of Object.entries(h.COPY)){
  assert.equal(pair.length,2,key);assert.ok(pair[0].length&&pair[1].length,key);
  assert.equal(/[\p{Script=Han}]/u.test(pair[1]),false,key);
  const placeholders=value=>Array.from(value.matchAll(/\{(\w+)\}/g),match=>match[1]).sort().join(',');
  assert.equal(placeholders(pair[0]),placeholders(pair[1]),key);
 }
 const source=fs.readFileSync(path.join(__dirname,'main.js'),'utf8');
 for(const match of source.matchAll(/\bt\(['"]([^'"\n]+)['"]/g))assert.ok(Object.hasOwn(h.COPY,match[1]),match[1]);
 assert.equal(h.t('frontmatter 属性'),'文件属性');assert.equal(h.t('显示 Today 侧栏'),'显示边栏');
 assert.equal(h.t('无法创建 Today 侧栏：{error}',{error:'原始错误 $& {title}'}),'无法创建边栏：原始错误 $& {title}');
});
test('interface language follows Obsidian and defaults to English for unsupported languages',async()=>{
 for(const language of ['en','fr','',null,'zh','zh-CN','zh_TW']){
  const t=harness({language}),plugin=new t.Plugin();await plugin.onload();const tab=t.tabs[0];tab.display();
  const chinese=typeof language==='string'&&language.startsWith('zh');
  assert.equal(tab.containerEl.children[0].textContent,chinese?'边栏管理':'Sidebar management');
  assert.equal(t.commands[0].name,chinese?'显示边栏':'Show sidebar');
  assert.equal(t.h.progressLabel(4,4),chinese?'完成度 100%（已完成 4 / 4）':'Completion: 100% (4/4 done)');
  tab.listRows.get(fileButtons(plugin.settings)[0].id).click();
  assert.equal(tab.savePresetButton.textContent,chinese?'保存为预设':'Save as preset');
  assert.equal(tab.editorEl.settings.find(item=>item.name===(chinese?'主标题来源':'Title source')).dropdown.options.frontmatter,chinese?'文件属性':'Frontmatter property');
  await tab.addButton.click();assert.equal(t.menus.at(-1).items[0].title,chinese?'文件':'File');
  await t.menus.at(-1).items[1].click();assert.equal(tab.editorEl.settings.find(item=>item.name===(chinese?'分隔样式':'Separator style')).dropdown.options.space,chinese?'空白占位':'Spacer');
  plugin.onunload();
 }
});
test('English UI preserves saved titles, paths, properties, presets and mode identifiers',async()=>{
 const t=harness({language:'en'}),plugin=new t.Plugin();
 plugin.saved={buttons:[{id:'today',type:'today',customTitle:'Today'},{id:'a',type:'file',customPath:'中文路径.md',customTitle:'原始中文标题',customSubtitle:'副标题',titleMode:'frontmatter',titleProperty:'标题'}],presets:[{id:'p',name:'中文预设',button:{type:'file',customPath:'中文路径.md',titleMode:'frontmatter',titleProperty:'标题'}}]};
 const file=new t.TFile('中文路径.md');t.files.set(file.path,file);t.metadata.set(file.path,{frontmatter:{标题:'原始属性值'}});
 await plugin.onload();const tab=t.tabs[0];tab.selectedId='a';tab.display();
 assert.equal(tab.listRows.get('a').children[1].textContent,'原始属性值');assert.equal(tab.listRows.get('today').children[1].textContent,'Today');
 assert.equal(editorSetting(tab,'File path').text.value,'中文路径.md');assert.equal(editorSetting(tab,'Title property').dropdown.value,'标题');
 await tab.savePresetButton.click();assert.equal(plugin.settings.presets.at(-1).name,'原始属性值');
 assert.equal(plugin.saved.buttons[1].titleMode,'frontmatter');assert.equal(plugin.saved.buttons[1].customTitle,'原始中文标题');assert.equal(plugin.saved.presets[0].name,'中文预设');
 assert.equal(t.h.t('presetDuplicate',{name:'中文预设',number:2}),'中文预设 (2)');
 const view=t.factories.get(t.h.VIEW_TYPE)({});await view.onOpen();assert.equal(view.customRows.get('a').label.textContent,'原始属性值');
});

test('localized validation and notices preserve raw error and path details',async()=>{
 const t=harness({language:'en'}),plugin=new t.Plugin();await plugin.onload();
 const button=fileButtons(plugin.settings)[0];await plugin.openCustom(button.id);
 assert.equal(t.notices.at(-1),'Enter a file path for this item in the plugin settings first.');
 button.customPath='中文文件.md';await plugin.openCustom(button.id);assert.equal(t.notices.at(-1),'File does not exist: 中文文件.md');
 assert.throws(()=>t.h.dailyPath({folder:'../bad',dateFormat:'YYYY-MM-DD'}),/Daily notes folder must be relative to the vault/);
 assert.throws(()=>t.h.taskStatusTypes({}),/Unrecognized Tasks status settings/);
 const error='外部错误 $& {name}';assert.equal(t.h.t('设置保存失败：{error}',{error}),'Could not save settings: '+error);
});

test('navigation resolves the public active view without reading deprecated activeLeaf',async()=>{
 const t=harness(),plugin=new t.Plugin();await plugin.onload();
 const file=new t.TFile('note.md'),fileView=new t.FileView(file);
 const sidebar=t.factories.get(t.h.VIEW_TYPE)({});
 let active=null,calls=0;
 t.app.workspace.getActiveViewOfType=Type=>{calls++;return active instanceof Type?active:null;};
 Object.defineProperty(t.app.workspace,'activeLeaf',{get(){throw Error('deprecated activeLeaf must not be read');}});
 assert.equal(plugin.navigationView(),null);
 active=fileView;assert.equal(plugin.navigationView(),fileView);
 active=sidebar;t.app.workspace.mostRecentLeaf={view:fileView};assert.equal(plugin.navigationView(),fileView);
 t.app.workspace.mostRecentLeaf=null;assert.equal(plugin.navigationView(),undefined);
 active=new t.FileView(new t.TFile('other.md'));assert.equal(plugin.navigationView(),active);
 assert.equal(calls,5);
});
