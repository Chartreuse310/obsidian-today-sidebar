'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

function hostMoment() {
  if (process.env.TODAY_TEST_MOMENT) return require(path.resolve(process.env.TODAY_TEST_MOMENT));
  try { return require('moment'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
  const archive = fs.readFileSync('/Applications/Obsidian.app/Contents/Resources/obsidian.asar');
  const headerSize = archive.readUInt32LE(4), jsonSize = archive.readUInt32LE(12);
  const tree = JSON.parse(archive.subarray(16,16+jsonSize));
  const entry = tree.files.lib.files['moment.min.js'];
  const offset = 8 + headerSize + Number(entry.offset);
  const source = archive.subarray(offset,offset+entry.size);
  if (crypto.createHash('sha256').update(source).digest('hex') !== entry.integrity.hash) throw Error('Host Moment integrity mismatch');
  const module = {exports: {}};
  vm.runInNewContext(source.toString('utf8'), {module,exports:module.exports,require}, {filename:'obsidian-host-moment.js'});
  return module.exports;
}
class Element {
  constructor(tag='div',opts={}) {this.tag=tag;this.children=[];this.textContent=opts.text||'';this.attrs=opts.attr||{};this.cls=opts.cls;this.style={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};}
  createEl(tag,opts) {const el=new Element(tag,opts);el.parent=this;this.children.push(el);return el;}
  remove() {if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
  insertBefore(el,ref) {el.remove();el.parent=this;const index=ref?this.children.indexOf(ref):this.children.length;this.children.splice(index,0,el);}
  appendChild(el) {this.insertBefore(el,null);return el;}
  cloneNode(deep=false) {const el=new Element(this.tag,{cls:this.cls,text:this.textContent,attr:{...this.attrs}});el.hidden=this.hidden;el.icon=this.icon;if(deep)for(const child of this.children)el.appendChild(child.cloneNode(true));return el;}
  prepend(el) {el.remove();el.parent=this;this.children.unshift(el);}
  createSpan(opts) {return this.createEl('span',opts);}
  createDiv(opts) {return this.createEl('div',opts);}
  createSvg(tag,opts) {return this.createEl(tag,opts);}
  addEventListener(type,fn) {this[type]=fn;}
  getBoundingClientRect() {return {left:0,right:280,top:0,bottom:32,width:280,height:32};}
  focus() {this.focused=true;}
  addClass(cls) {this.cls=cls;}
  setAttribute(key,value) {this.attrs[key]=value;}
  removeAttribute(key) {delete this.attrs[key];}
  empty() {this.children=[];if(this.settings)this.settings=[];}
}
function harness({DateClass=Date,language='zh'}={}) {
  const notices=[],commands=[],tabs=[],factories=new Map(),leaves=[],listeners=new Set(),intervals=new Map(),suggestions=[],icons=['circle-plus','file','star','book-open','calendar-days','eye','eye-closed','eye-off'];let intervalId=0;
  class Plugin {
    constructor(){this.app=app;this.saved=null;}
    async loadData(){return this.saved;}
    async saveData(data){this.saved=structuredClone(data);}
    registerView(type,factory){factories.set(type,factory);}
    addSettingTab(tab){tabs.push(tab);}
    addCommand(command){commands.push(command);}
    registerEvent(ref){(this.events??=[]).push(ref);}
    registerInterval(id){(this.intervals??=[]).push(id);}
    unload(){this.onunload();for(const ref of this.events||[])listeners.delete(ref);for(const id of this.intervals||[])intervals.delete(id);}
  }
  class View {
    constructor(leaf){this.leaf=leaf;this.contentEl=new Element();}
    registerDomEvent(el,type,fn){el[type]=fn;}
  }
  const modals=[];
  class Modal {
    constructor(app){this.app=app;this.contentEl=new Element();modals.push(this);}
    setTitle(value){this.title=value;}
    open(){this.onOpen();}
    close(){this.onClose();}
  }
  class ItemView extends View {}
  class FileView extends View {constructor(file){super({});this.file=file;}}
  class PluginSettingTab {constructor(app){this.app=app;this.containerEl=new Element();}}
  class AbstractInputSuggest {
    constructor(app,input){this.app=app;this.input=input;this.closed=false;suggestions.push(this);}
    setValue(value){this.input.value=value;}
    close(){this.closed=true;}
  }
  const menus=[];
  class Menu {
    constructor(){this.items=[];menus.push(this);}
    addItem(fn){const item={setTitle(value){this.title=value;return this;},setIcon(){return this;},setDisabled(value){this.disabled=value;return this;},onClick(fn){this.click=fn;return this;}};fn(item);this.items.push(item);return this;}
    addSeparator(){this.items.push({separator:true});return this;}
    showAtPosition(position){this.position=position;}
  }
  class Setting {
    constructor(container){this.container=container;this.settingEl=container.createDiv({cls:'setting-item'});this.controlEl=this.settingEl.createDiv();(container.settings??=[]).push(this);}
    setName(name){this.name=name;return this;}
    setDesc(desc){this.desc=desc;return this;}
    addButton(fn){this.button={buttonEl:new Element('button'),setButtonText(text){this.text=text;return this;},onClick(fn){this.click=fn;return this;}};fn(this.button);return this;}
    addToggle(fn){this.toggle={setValue(value){this.value=value;return this;},onChange(fn){this.change=fn;return this;}};fn(this.toggle);return this;}
    addDropdown(fn){this.dropdown={selectEl:new Element('select'),addOptions(options){this.options=options;return this;},setValue(value){this.value=value;return this;},onChange(fn){this.change=fn;return this;}};fn(this.dropdown);return this;}
    addText(fn){this.text={inputEl:new Element('input'),setPlaceholder(){return this;},setValue(value){this.value=value;this.inputEl.value=value;return this;},onChange(fn){this.change=value=>{this.inputEl.value=value;this.value=value;return fn(value);};return this;}};fn(this.text);return this;}
  }
  class TFile {constructor(path){this.path=path;this.extension=path.split('.').pop();}}
  class TFolder {constructor(path){this.path=path;}}
  const contents=new Map();
  const files=new Map(),mainLeaves=[],revealedLeaves=[],activatedLeaves=[];let layoutReady,created=0,reveals=0,opened=[];
  const providers=new Map(),metadata=new Map(),adapterFiles=new Map(),metadataReads=[],propertyInfos=new Map();
  const on=(name,fn)=>{const ref={name,fn};listeners.add(ref);return ref;};
  const app={plugins:{getPlugin:id=>providers.get(id)},metadataCache:{getFileCache(file){metadataReads.push(file.path);return metadata.get(file.path)??null;},getAllPropertyInfos(){return Object.fromEntries(propertyInfos);},on},vault:{configDir:'.obsidian',adapter:{async exists(path){return adapterFiles.has(path);},async read(path){return adapterFiles.get(path);}},on,getAllFolders:()=>[...files.values()].filter(file=>file instanceof TFolder),async read(file){return contents.get(file.path)||'';},async create(path,content){if(files.has(path))throw Error('Already exists');const file=new TFile(path);files.set(path,file);contents.set(path,content);return file;},getAbstractFileByPath:path=>files.get(path),getFiles:()=>[...files.values()].filter(file=>file instanceof TFile)},workspace:{
    activeLeaf:null,
    getActiveViewOfType(Type){const view=this.activeLeaf?.view;return view instanceof Type?view:null;},
    mostRecentLeaf:null,
    getMostRecentLeaf(){return this.mostRecentLeaf;},
    iterateRootLeaves(fn){for(const leaf of mainLeaves)if(fn(leaf))break;},
    on(name,fn){const ref={name,fn};listeners.add(ref);return ref;},
    getLeavesOfType:type=>leaves.filter(l=>l.type===type),
    getLeftLeaf(split){if(split!==false)throw Error('Expected sidebar tab');created++;const leaf={async setViewState(state){this.type=state.type;this.state=state;leaves.push(this);}};return leaf;},
    async revealLeaf(leaf){reveals++;revealedLeaves.push(leaf);},
    setActiveLeaf(leaf){activatedLeaves.push(leaf);this.activeLeaf=leaf;this.mostRecentLeaf=leaf;for(const ref of [...listeners])if(ref.name==='active-leaf-change'||ref.name==='file-open')ref.fn();},
    getLeaf(mode){if(mode!=='tab')throw Error('Expected main tab');return {async openFile(file){opened.push(file.path);}};},
    onLayoutReady(fn){layoutReady=fn;},
  }};
  const module={exports:{}};
  const obsidian={getLanguage:()=>language,Plugin,View,ItemView,PluginSettingTab,Setting,Menu,Modal,TFile,TFolder,FileView,AbstractInputSuggest,getIcon:id=>icons.includes(id)?{}:null,getIconIds:()=>[...icons],Notice:class{constructor(text){notices.push(text);}},moment:hostMoment(),normalizePath:p=>p.replace(/\/+/g,'/'),setIcon(el,name){el.icon=name;if(name==='grip-vertical')el.createSvg('svg').createSvg('circle',{attr:{cx:'9',cy:'5',r:'1'}});}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'main.js'),'utf8'),{module,exports:module.exports,require:name=>{if(name!=='obsidian')throw Error(name);return obsidian;},Date:DateClass,crypto:crypto.webcrypto,console,window:{requestAnimationFrame(){return 1;},cancelAnimationFrame(){},setInterval(fn){const id=++intervalId;intervals.set(id,fn);return id;}}},{filename:'main.js'});
  return {modals,contents,TFolder,menus,Plugin:module.exports,h:module.exports.testing,moment:obsidian.moment,app,files,TFile,FileView,providers,metadata,adapterFiles,metadataReads,propertyInfos,listeners,intervals,suggestions,icons,Element,emit:(name,...args)=>{for(const ref of [...listeners])if(ref.name===name)ref.fn(...args);},notices,commands,tabs,factories,leaves,mainLeaves,revealedLeaves,activatedLeaves,get created(){return created;},get reveals(){return reveals;},get opened(){return opened;},ready:()=>layoutReady()};
}
module.exports={harness,hostMoment};
