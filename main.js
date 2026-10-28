/*
 * Today Sidebar — Copyright (c) 2026 Chartreuse310
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 3 only,
 * as published by the Free Software Foundation.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
'use strict';
const {Plugin, View, ItemView, PluginSettingTab, Setting, Notice, Modal, TFile, TFolder, FileView, moment, normalizePath, setIcon, getIcon, getIconIds, AbstractInputSuggest, Menu, getLanguage} = require('obsidian');
// Interface copy follows Obsidian; user data is never passed through this table.
const COPY = Object.freeze({
  "从模板新建": ["从模板新建", "New from template"],
  "模板 · 复制指定文件创建新笔记": ["模板 · 复制指定文件创建新笔记", "Template · Create a note from a file"],
  "模板文件": ["模板文件", "Template file"],
  "默认文件夹": ["默认文件夹", "Default folder"],
  "文件夹": ["文件夹", "Folder"],
  "库根目录": ["库根目录", "Vault root"],
  "创建": ["创建", "Create"],
  "取消": ["取消", "Cancel"],
  "模板必须是已有的 Markdown 文件。": ["模板必须是已有的 Markdown 文件。", "The template must be an existing Markdown file."],
  "请选择已有文件夹，留空表示库根目录。": ["请选择已有文件夹，留空表示库根目录。", "Choose an existing folder. Leave empty for the vault root."],
  "文件名不能包含文件夹路径。": ["文件名不能包含文件夹路径。", "The file name must not contain a folder path."],
  "文件已存在：{path}": ["文件已存在：{path}", "File already exists: {path}"],
  "无法创建文件：{error}": ["无法创建文件：{error}", "Could not create the file: {error}"],
  "文件已创建，但无法打开：{error}": ["文件已创建，但无法打开：{error}", "File created, but could not open it: {error}"],
  "选择文件夹并输入文件名，模板内容将原样复制。": ["选择文件夹并输入文件名，模板内容将原样复制。", "Choose a folder and file name. The template content will be copied as is."],

  " 无任务显示 0，无法统计显示 —，等待缓存显示 …。": [" 无任务显示 0，无法统计显示 —，等待缓存显示 …。", " Show 0 when there are no tasks, — when unavailable, and … while waiting for metadata."],
  "File · 打开指定文件": ["文件 · 打开指定文件", "File · Open a specific file"],
  "File 类型": ["文件", "File"],
  "Tasks 状态配置包含不支持的定义": ["Tasks 插件的状态配置包含不支持的定义", "Tasks status settings contain an unsupported definition"],
  "Today · 打开当天日记": ["今日日记 · 打开当天日记", "Today · Open today's daily note"],
  "Today 类型": ["今日日记", "Today"],
  "chooseIconHint": ["选择图标：{name}", "Choose icon: {name}"],
  "dragItem": ["拖动 {title}", "Drag {title}"],
  "frontmatter 属性": ["文件属性", "Frontmatter property"],
  "hideItem": ["隐藏 {title}", "Hide {title}"],
  "invalidPath": ["{label}必须是库内相对路径，不能包含空目录、上级目录或文件名禁用字符。", "{label} must be relative to the vault and must not contain empty path segments, parent-directory references, or invalid filename characters."],
  "presetDuplicate": ["{name}（{number}）", "{name} ({number})"],
  "progress": ["完成度 {percent}%（已完成 {done} / {total}）", "Completion: {percent}% ({done}/{total} done)"],
  "separatorHint": ["{style}分隔条目", "{style} separator"],
  "showItem": ["显示 {title}", "Show {title}"],
  "unfinishedHint": ["未完成任务数：{count} · {description}", "Unfinished tasks: {count} · {description}"],
  "上移": ["上移", "Move up"],
  "上移所选项": ["上移所选项", "Move selected item up"],
  "下移": ["下移", "Move down"],
  "下移所选项": ["下移所选项", "Move selected item down"],
  "不显示": ["不显示", "None"],
  "不显示副标题，原有文本会保留。": ["不显示副标题，原有文本会保留。", "Hide the subtitle and keep the saved text."],
  "主标题": ["主标题", "Title"],
  "主标题来源": ["主标题来源", "Title source"],
  "仅删除边栏入口，不删除目标文件": ["仅删除边栏入口，不删除目标文件", "Remove this sidebar item without deleting the target file"],
  "任务统计不可用：{error}": ["任务统计不可用：{error}", "Task statistics unavailable: {error}"],
  "使用当前库 Tasks 状态：待办、进行中、挂起计入未完成，完成、取消和非任务不计入。": ["使用当前库 Tasks 插件的任务状态：待办、进行中、挂起计入未完成，完成、取消和非任务不计入。", "Using this vault's Tasks statuses: Todo, In Progress, and On Hold count as unfinished; Done, Cancelled, and Non-Task do not."],
  "使用简称": ["使用简称", "Use short title"],
  "保存为预设": ["保存为预设", "Save as preset"],
  "保存预设失败：{error}": ["保存预设失败：{error}", "Could not save the preset: {error}"],
  "分隔条目": ["分隔条目", "Separator"],
  "分隔条目 · 仅用于视觉分组": ["分隔条目 · 仅用于视觉分组", "Separator · Visual grouping only"],
  "分隔样式": ["分隔样式", "Separator style"],
  "删除": ["删除", "Delete"],
  "删除按钮保存失败：{error}": ["删除按钮保存失败：{error}", "Could not save the item deletion: {error}"],
  "删除此分隔条目": ["删除此分隔条目", "Delete this separator"],
  "删除预设": ["删除预设", "Delete preset"],
  "删除预设失败：{error}": ["删除预设失败：{error}", "Could not delete the preset: {error}"],
  "副标题": ["副标题", "Subtitle"],
  "副标题属性名": ["副标题属性名", "Subtitle property"],
  "副标题显示": ["副标题显示", "Subtitle display"],
  "日期": ["日期", "Date"],
  "显示按日期格式生成的日期；可改为当天日记的未完成任务数。": ["显示按日期格式生成的日期；可改为当天日记的未完成任务数。", "Show the date generated from the date format, or switch to the unfinished task count of today's note."],
  "隐藏副标题，日期格式会保留。": ["隐藏副标题，日期格式会保留。", "Hide the subtitle and keep the date format."],
  "单线": ["单线", "Solid line"],
  "可改为目标 Markdown 文件的未完成任务数；使用当前库 Tasks 状态配置，未配置时使用标准任务状态。": ["可改为目标笔记的未完成任务数；使用当前库 Tasks 插件的状态配置，未配置时使用标准任务状态。", "Optionally display the unfinished task count for the target Markdown file. Use this vault's Tasks status settings, or standard task statuses when none are configured."],
  "图标": ["图标", "Icon"],
  "图标显示": ["图标显示", "Icon display"],
  "地址的文件名部分，使用 Moment 格式，例如 YYYY-MM-DD、YYYY/MM/DD；无需填写 .md。": ["地址的文件名部分，使用日期格式，例如 YYYY-MM-DD、YYYY/MM/DD；无需填写 .md。", "The file name part of the path. Use a date format, such as YYYY-MM-DD or YYYY/MM/DD, without .md."],
  "地址的文件夹部分，使用库内相对路径；留空表示库根目录。": ["地址的文件夹部分，使用库内相对路径；留空表示库根目录。", "The folder part of the path, relative to the vault. Leave empty to use the vault root."],
  "基础": ["基础", "General"],
  "完成度饼图": ["完成度饼图", "Progress ring"],
  "完成度饼图按已完成任务占未完成与已完成任务总数的比例绘制环形，取消任务不计入；无任务或无法统计时回退普通图标，关闭后恢复保存的图标。": ["完成度饼图按已完成任务占未完成与已完成任务总数的比例绘制环形，取消任务不计入；无任务或无法统计时回退普通图标，关闭后恢复保存的图标。", "Show completed tasks as a proportion of unfinished and completed tasks. Exclude cancelled tasks. Use the saved icon when there are no tasks or statistics are unavailable, and restore it when the progress ring is disabled."],
  "左侧栏暂不可用，请稍后使用显示侧栏命令。": ["左侧栏暂不可用，请稍后使用“显示边栏”命令。", "The left sidebar is unavailable. Try the Show sidebar command again later."],
  "当天日记不存在：{path}": ["当天日记不存在：{path}", "Today's daily note does not exist: {path}"],
  "按钮图标": ["按钮图标", "Button icon"],
  "搜索库内文件或输入相对路径；省略扩展名时尝试补 .md。": ["搜索库内文件或输入相对路径；省略扩展名时尝试补 .md。", "Search vault files or enter a relative path. Try .md if the extension is omitted."],
  "文件不存在：{path}": ["文件不存在：{path}", "File does not exist: {path}"],
  "文件名": ["文件名", "File name"],
  "文件名日期格式": ["文件名日期格式", "Filename date format"],
  "文件地址": ["文件地址", "File path"],
  "文件导航": ["文件导航", "File navigation"],
  "新预设": ["新预设", "New preset"],
  "无法创建 Today 侧栏：{error}": ["无法创建边栏：{error}", "Could not create the sidebar: {error}"],
  "无法打开今日日记：{error}": ["无法打开今日日记：{error}", "Could not open today's daily note: {error}"],
  "无法打开侧栏：{error}": ["无法打开侧栏：{error}", "Could not open the sidebar: {error}"],
  "无法打开图标选择器：{error}": ["无法打开图标选择器：{error}", "Could not open the icon picker: {error}"],
  "无法打开自定义文件：{error}": ["无法打开自定义文件：{error}", "Could not open the target file: {error}"],
  "无法识别 Tasks 状态配置": ["无法识别 Tasks 插件的状态配置", "Unrecognized Tasks status settings"],
  "日期显示格式，例如 YYYY-MM-DD ddd；留空隐藏，不改变文件地址。": ["日期显示格式，例如 YYYY-MM-DD ddd；留空隐藏，不改变文件地址。", "Date display format, for example YYYY-MM-DD ddd. Leave empty to hide the subtitle. This does not change the file path."],
  "日期格式产生的文件名": ["日期格式产生的文件名", "Generated daily-note filename"],
  "日记文件夹": ["日记文件夹", "Daily notes folder"],
  "显示 Today 侧栏": ["显示边栏", "Show sidebar"],
  "显示指定 frontmatter 属性的值；属性缺失或为空时隐藏。": ["显示指定文件属性的值；属性缺失或为空时隐藏。", "Display the selected frontmatter property. Hide the subtitle if it is missing or empty."],
  "显示状态保存失败：{error}": ["显示状态保存失败：{error}", "Could not save visibility: {error}"],
  "显示目标文件名（不含 .md）。": ["显示目标文件名（不含 .md）。", "Display the target file name without .md."],
  "普通图标": ["普通图标", "Custom icon"],
  "普通文本": ["普通文本", "Plain text"],
  "普通文本留空时使用目标文件名；frontmatter 属性缺失或为空时同样回退。": ["普通文本留空时使用目标文件名；文件属性缺失或为空时同样回退。", "Use the target file name when plain text is empty. Missing or empty frontmatter properties use the same fallback."],
  "普通文本，留空隐藏；选择其他模式时保留此文本，切回后恢复。": ["普通文本，留空隐藏；选择其他模式时保留此文本，切回后恢复。", "Plain text. Leave empty to hide it. Other modes keep this text so it can be restored later."],
  "暂无属性": ["暂无属性", "No properties"],
  "暂无条目，请先添加。": ["暂无条目，请先添加。", "No items yet. Add an item to get started."],
  "暂无预设": ["暂无预设", "No presets yet"],
  "未完成任务数": ["未完成任务数", "Unfinished tasks"],
  "未找到 Tasks 配置，使用标准任务状态；仅未勾选任务计入未完成。": ["未找到 Tasks 插件配置，使用标准任务状态；仅未勾选任务计入未完成。", "Tasks settings not found. Using standard task statuses; only unchecked tasks count as unfinished."],
  "标题属性名": ["标题属性名", "Title property"],
  "正在读取任务状态配置": ["正在读取任务状态配置", "Loading task status settings"],
  "添加": ["添加", "Add"],
  "添加 Today": ["添加今日日记", "Add Today"],
  "用简称显示主标题，保留原属性内容。": ["用简称显示主标题，保留原属性内容。", "Display a short title without changing the original property."],
  "留空时使用目标文件名。": ["留空时使用目标文件名。", "Leave empty to use the target file name."],
  "留空显示 Today。": ["留空显示今日日记。", "Leave empty to display Today."],
  "空白占位": ["空白占位", "Spacer"],
  "简称": ["简称", "Short title"],
  "简称仍会被截断": ["简称仍会被截断", "The short title will still be truncated"],
  "类型": ["类型", "Type"],
  "自定义": ["自定义", "Custom"],
  "虚线": ["虚线", "Dashed line"],
  "设置保存失败：{error}": ["设置保存失败：{error}", "Could not save settings: {error}"],
  "请先启用支持接口版本1的 Custom Icons；也可直接输入内置图标名称。": ["请启用兼容的 Custom Icons 插件，也可直接输入内置图标名称。", "Enable a compatible Custom Icons plugin, or enter a built-in icon name."],
  "请先在插件设置中填写文件地址": ["请先在插件设置中填写文件地址", "Enter a file path in the plugin settings first"],
  "请先在插件设置中填写自定义按钮的文件地址。": ["请先在插件设置中填写自定义按钮的文件地址。", "Enter a file path for this item in the plugin settings first."],
  "请填写日期格式，例如 YYYY-MM-DD。": ["请填写日期格式，例如 YYYY-MM-DD。", "Enter a date format, such as YYYY-MM-DD."],
  "输入搜索，或使用 Custom Icons 选择图标。": ["输入搜索，或使用 Custom Icons 插件选择图标。", "Type to search, or choose an icon with Custom Icons."],
  "边栏管理": ["边栏管理", "Sidebar management"],
  "选择图标": ["选择图标", "Choose icon"],
  "选择属性": ["选择属性", "Select a property"],
  "选择目标文件的 frontmatter 属性；缺失或为空时隐藏副标题。": ["选择目标文件的属性；缺失或为空时隐藏副标题。", "Select a frontmatter property from the target file. Hide the subtitle if it is missing or empty."],
  "选择目标文件的 frontmatter 属性；缺失时回退文件名或普通文本。": ["选择目标文件的属性；缺失时回退文件名或普通文本。", "Select a frontmatter property from the target file. If missing, use the file name or plain text."],
  "顺序保存失败：{error}": ["顺序保存失败：{error}", "Could not save the order: {error}"],
  "预设": ["预设", "Presets"],
  "预设名称": ["预设名称", "Preset name"],
  "（空或缺失）": ["（空或缺失）", "(Empty or missing)"]
});
function uiLanguage() {
  try { return /^zh(?:[-_]|$)/i.test(typeof getLanguage === 'function' ? getLanguage() : '') ? 'zh' : 'en'; }
  catch { return 'en'; }
}
function t(key, values = {}) {
  const entry = COPY[key];
  const message = entry ? entry[uiLanguage() === 'zh' ? 0 : 1] : key;
  return message.replace(/\{(\w+)\}/g, (token, name) => Object.hasOwn(values, name) ? String(values[name]) : token);
}
const VIEW_TYPE = 'ctz-today-sidebar-view';
const DEFAULTS = Object.freeze({folder: '00-journal', dateFormat: 'YYYY-MM-DD', displayFormat: 'YYYY-MM-DD ddd', customTitle: '', customSubtitle: '', customPath: '', customIcon: 'file'});
const SEPARATOR_STYLES = Object.freeze({get solid() { return t('单线'); }, get dashed() { return t('虚线'); }, get space() { return t('空白占位'); }});
const BUTTON_FIELDS = ['customTitle', 'customSubtitle', 'customPath', 'customIcon'];

function newButtonId() {
  return 'button-' + Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('');
}

function loadButton(data, usedIds = new Set(), type = 'file') {
  let id = typeof data?.id === 'string' && data.id ? data.id : newButtonId();
  while (usedIds.has(id)) id = newButtonId();
  usedIds.add(id);
  if (type === 'separator') return {id, type, hidden: data?.hidden === true, separatorStyle: Object.hasOwn(SEPARATOR_STYLES, data?.separatorStyle) ? data.separatorStyle : 'solid'};
  const defaults = type === 'today' ? {...DEFAULTS, customTitle: '', customIcon: 'calendar-days'} : DEFAULTS;
  // Today has no file to name and no property to read: its subtitle is the date, the task count or nothing.
  const subtitleModes = type === 'template' ? ['none', 'text'] : type === 'file' ? ['none', 'text', 'tasks', 'filename', 'frontmatter'] : ['none', 'text', 'tasks'];
  return {id, type, ...(type === 'template' ? {targetFolder: typeof data?.targetFolder === 'string' ? data.targetFolder : ''} : {}), hidden: data?.hidden === true, subtitleMode: subtitleModes.includes(data?.subtitleMode) ? data.subtitleMode : 'text', iconMode: (type === 'template' ? ['icon'] : ['icon', 'tasks']).includes(data?.iconMode) ? data.iconMode : 'icon', ...(type === 'file' ? {titleShorteningEnabled: data?.titleShorteningEnabled === true, titleShortName: typeof data?.titleShortName === 'string' ? data.titleShortName : '', titleMode: ['filename', 'frontmatter'].includes(data?.titleMode) ? data.titleMode : 'text', titleProperty: typeof data?.titleProperty === 'string' ? data.titleProperty : '', subtitleProperty: typeof data?.subtitleProperty === 'string' ? data.subtitleProperty : ''} : {}), ...Object.fromEntries(BUTTON_FIELDS.map(key => [key, typeof data?.[key] === 'string' ? data[key] : defaults[key]]))};
}

function loadSettings(data) {
  const usedIds = new Set();
  const source = Array.isArray(data?.buttons) ? data.buttons : Array.isArray(data?.customButtons) ? data.customButtons : [data || {}];
  const buttons = Array.isArray(data?.buttons) ? [] : [loadButton(null, usedIds, 'today')];
  for (const item of source) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    if (item.type === 'today') {
      if (!buttons.some(button => button.type === 'today')) buttons.push(loadButton(item, usedIds, 'today'));
    } else if (item.type === 'separator') buttons.push(loadButton(item, usedIds, 'separator'));
    else if (item.type === 'template') buttons.push(loadButton(item, usedIds, 'template'));
    else if (!item.type || item.type === 'button' || item.type === 'file') buttons.push(loadButton(item, usedIds));
  }
  return {
    folder: typeof data?.folder === 'string' ? data.folder : DEFAULTS.folder,
    dateFormat: typeof data?.dateFormat === 'string' ? data.dateFormat : DEFAULTS.dateFormat,
    displayFormat: typeof data?.displayFormat === 'string' ? data.displayFormat : DEFAULTS.displayFormat,
    buttons,
    presets: (Array.isArray(data?.presets) ? data.presets : []).filter(preset => preset && typeof preset.name === 'string' && preset.name.trim() && ['file', 'today', 'separator', 'template'].includes(preset.button?.type)).map(preset => ({
      id: loadButton({id: preset.id}, usedIds).id,
      name: preset.name.trim(),
      button: loadButton(preset.button, usedIds, preset.button.type),
      ...Object.fromEntries(['folder', 'dateFormat', 'displayFormat'].map(key => [key, typeof preset[key] === 'string' ? preset[key] : DEFAULTS[key]])),
    })),
  };
}
function validateRelativePath(path, label, allowEmpty = false) {
  if (!path && allowEmpty) return;
  if (!path || /^[\\/]/.test(path) || /[\x00-\x1f\x7f:*?"<>|\\]/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..')) {
    throw new Error(t('invalidPath', {label}));
  }
}
function dailyPath(settings, date = new Date()) {
  const folder = settings.folder.trim().replace(/\/+$/, '');
  validateRelativePath(folder, t("日记文件夹"), true);
  const format = settings.dateFormat.trim();
  if (!format) throw new Error(t("请填写日期格式，例如 YYYY-MM-DD。"));
  // Obsidian supplies Moment; use local calendar time, rather than UTC ISO dates.
  const filename = moment(date).format(format);
  validateRelativePath(filename, t("日期格式产生的文件名"));
  const note = /\.md$/i.test(filename) ? filename : filename + '.md';
  return normalizePath(folder ? folder + '/' + note : note);
}

function displayDate(settings, date = new Date()) {
  const format = (settings.displayFormat ?? DEFAULTS.displayFormat).trim();
  return format ? moment(date).locale('en').format(format) : '';
}

function customInfo(settings, vault) {
  const path = settings.customPath.trim();
  if (path) validateRelativePath(path, t("文件地址"));
  const candidate = path ? vault.getAbstractFileByPath(normalizePath(path)) : null;
  const fallback = path && !candidate ? vault.getAbstractFileByPath(normalizePath(path + '.md')) : null;
  const file = candidate instanceof TFile ? candidate : fallback instanceof TFile ? fallback : null;
  const filename = fileBaseName(file?.path || path);
  return {path, file, title: settings.customTitle.trim() || filename || t("自定义"), subtitle: settings.customSubtitle.trim()};
}
// Today's target moves with the calendar, so it is resolved at render time rather than from storage.
function dailyInfo(plugin, settings, date = new Date()) {
  const path = dailyPath(settings, date);
  const candidate = plugin.app.vault.getAbstractFileByPath(path);
  return {path, file: candidate instanceof TFile ? candidate : null};
}
// One resolver for sidebar targets: File buttons use a saved path, Today uses its folder and date format.
function entryInfo(plugin, button, daily = plugin.settings, date = new Date()) {
  return button.type === 'today' ? dailyInfo(plugin, daily, date) : customInfo(button, plugin.app.vault);
}
// A saved path may omit .md, so both spellings can name the same target.
function pathVariants(path) {
  const value = normalizePath(path || '');
  if (!value) return [];
  return /\.md$/i.test(value) ? [value] : [value, value + '.md'];
}
function fileBaseName(path) {
  return (path || '').split('/').pop().replace(/\.md$/i, '');
}
// Frontmatter values render as text: scalars stringify, arrays join, anything else falls back.
function frontmatterValue(cache, property) {
  const key = (property || '').trim();
  if (!key) return null;
  const value = cache?.frontmatter?.[key];
  if (Array.isArray(value)) {
    const items = value.filter(item => item != null && String(item).trim() !== '').map(item => String(item).trim());
    return items.length ? items.join(', ') : null;
  }
  if (value == null || typeof value === 'object') return null;
  const text = String(value).trim();
  return text || null;
}

// Interpret raw checkbox symbols using Tasks' configured semantic types.
function taskStatusTypes(data) {
  const types = new Map([[' ', 'TODO'], ['x', 'DONE'], ['X', 'DONE']]);
  if (data === null) return types;
  const settings = data?.statusSettings;
  if (!Array.isArray(settings?.coreStatuses) || !Array.isArray(settings?.customStatuses)) throw new Error(t("无法识别 Tasks 状态配置"));
  for (const status of [...settings.coreStatuses, ...settings.customStatuses]) {
    if (typeof status?.symbol !== 'string' || status.symbol.length !== 1 || !['TODO', 'IN_PROGRESS', 'ON_HOLD', 'DONE', 'CANCELLED', 'NON_TASK'].includes(status.type)) throw new Error(t("Tasks 状态配置包含不支持的定义"));
    types.set(status.symbol, status.type);
  }
  return types;
}
const UNFINISHED_TYPES = ['TODO', 'IN_PROGRESS', 'ON_HOLD'];
function countTaskStats(items, types) {
  const stats = {unfinished: 0, done: 0, total: 0};
  for (const item of items) {
    const type = types.get(item.task);
    if (UNFINISHED_TYPES.includes(type)) stats.unfinished++, stats.total++;
    else if (type === 'DONE') stats.done++, stats.total++;
  }
  return stats;
}
function countUnfinishedTasks(items, types) {
  return countTaskStats(items, types).unfinished;
}

class TaskCounter {
  constructor(plugin) {
    this.plugin = plugin;
    this.types = taskStatusTypes(null);
    this.ready = false;
    this.error = null;
    this.description = t("正在读取任务状态配置");
    this.counts = new Map();
    this.dirty = new Set();
    this.beginRender();
  }
  // Every rendered entry that needs task data, paired with the daily settings that place it.
  entries() {
    const list = this.plugin.settings.buttons.map(button => ({button, daily: this.plugin.settings}));
    if (this.plugin.settingsTab?.refreshListControls) for (const preset of this.plugin.settings.presets) list.push({button: preset.button, daily: preset});
    return list.filter(({button}) => button.type !== 'separator' && (button.subtitleMode === 'tasks' || button.iconMode === 'tasks'));
  }
  beginRender() { this.reads = new Map(); }
  isTargetPath(path) {
    if (this.counts.has(path)) return true;
    const target = normalizePath(path);
    for (const entry of this.entries()) {
      try { if (pathVariants(entryInfo(this.plugin, entry.button, entry.daily).path).includes(target)) return true; }
      catch { /* Invalid targets have no path. */ }
    }
    return false;
  }
  prune() {
    const paths = new Set();
    for (const entry of this.entries()) {
      try { const file = entryInfo(this.plugin, entry.button, entry.daily).file; if (file) paths.add(file.path); } catch { /* Invalid targets are unavailable. */ }
    }
    for (const path of this.counts.keys()) if (!paths.has(path)) this.counts.delete(path);
    for (const path of this.dirty) if (!paths.has(path)) this.dirty.delete(path);
  }
  invalidate(file, pending = false) {
    if (!file || !this.isTargetPath(file.path)) return;
    this.counts.delete(file.path);
    if (pending) this.dirty.add(file.path); else this.dirty.delete(file.path);
    this.plugin.refreshTodayStates();
  }
  taskStats(file) {
    if (!(file instanceof TFile) || file.extension.toLowerCase() !== 'md' || this.error) return null;
    if (!this.ready || this.dirty.has(file.path)) return undefined;
    if (!this.reads.has(file.path)) this.reads.set(file.path, this.plugin.app.metadataCache.getFileCache(file));
    const cache = this.reads.get(file.path);
    if (!cache) return undefined;
    const previous = this.counts.get(file.path);
    if (previous?.file === file && previous.cache === cache) return previous.value;
    // Obsidian supplies parsed list items: code examples are not scanned as text.
    const value = countTaskStats(cache.listItems || [], this.types);
    this.counts.set(file.path, {file, cache, value});
    return value;
  }
  subtitle(file) {
    const stats = this.taskStats(file);
    if (stats === null) return '—';
    if (!stats) return '…';
    return String(stats.unfinished);
  }
  progress(file) {
    const stats = this.taskStats(file);
    // Total 0 is not 100% done: a pie needs at least one task to replace the icon.
    return stats?.total ? {done: stats.done, total: stats.total} : null;
  }
  reloadStatuses() {
    if (this.plugin.disposed || !this.entries().length) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = (async () => {
      let types, description, error = null;
      try {
        const {vault} = this.plugin.app;
        const path = normalizePath(vault.configDir + '/plugins/obsidian-tasks-plugin/data.json');
        const exists = await vault.adapter.exists(path);
        types = taskStatusTypes(exists ? JSON.parse(await vault.adapter.read(path)) : null);
        description = exists ? t("使用当前库 Tasks 状态：待办、进行中、挂起计入未完成，完成、取消和非任务不计入。") : t("未找到 Tasks 配置，使用标准任务状态；仅未勾选任务计入未完成。");
      } catch (cause) {
        error = cause.message;
        description = t("任务统计不可用：{error}", {error: error});
      }
      if (this.plugin.disposed) return;
      const signature = JSON.stringify([types ? [...types] : null, description]);
      if (signature === this.signature) return;
      this.signature = signature;
      this.types = types || taskStatusTypes(null);
      this.error = error;
      this.description = description;
      this.ready = true;
      this.counts.clear();
      this.plugin.refreshTodayStates();
    })().finally(() => { this.pending = null; });
    return this.pending;
  }
}

// Only suggest properties present in the selected target file.
function propertyOptions(app, button) {
  try {
    const info = customInfo(button, app.vault);
    const keys = info.file ? Object.keys(app.metadataCache.getFileCache(info.file)?.frontmatter || {}) : [];
    return keys.sort((a, b) => a.localeCompare(b, 'zh-CN', {numeric: true}));
  } catch { return []; }
}
function customIconsApi(app) {
  try {
    // Custom Icons documents this optional, non-public host lookup.
    const api = app?.plugins?.getPlugin?.('custom-sidebar-icons')?.api;
    return api?.version === 1 && ['has', 'renderTo', 'catalog', 'openPicker'].every(key => typeof api[key] === 'function') ? api : null;
  } catch { return null; }
}
function iconId(value, app) {
  const id = value.trim();
  try { if (id && customIconsApi(app)?.has(id)) return id; } catch { /* Fall back to the public registry. */ }
  return id && getIcon(id) ? id : 'file';
}
function drawIcon(app, el, value) {
  const id = iconId(value, app);
  el.empty();
  try { if (customIconsApi(app)?.renderTo(el, id)) return id; } catch { /* Provider may have been disabled. */ }
  const fallback = getIcon(id) ? id : 'file';
  el.empty();
  setIcon(el, fallback);
  return fallback;
}
function availableIconIds(app) {
  let extra = [];
  try { extra = customIconsApi(app)?.catalog({lucideExtras: true}).flatMap(group => group.ids) || []; } catch { /* Native search remains available. */ }
  return [...new Set([...getIconIds(), ...extra].filter(id => typeof id === 'string'))];
}
function progressLabel(done, total) {
  return t('progress', {percent: Math.round(done / total * 100), done, total});
}
// A pie replaces the File icon only with ready data and at least one task;
// missing, pending and empty states keep the configured icon visible.
function drawEntryIcon(plugin, el, button, info) {
  const stats = button.iconMode === 'tasks' ? plugin.taskCounter.progress(info?.file) : null;
  if (!stats) {
    el.removeAttribute('data-pie');
    el.removeAttribute('data-complete');
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
    el.removeAttribute('title');
    el.setAttribute('aria-hidden', 'true');
    drawIcon(plugin.app, el, button.customIcon);
    return null;
  }
  const label = progressLabel(stats.done, stats.total);
  el.empty();
  el.setAttribute('data-pie', 'true');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', label);
  el.removeAttribute('aria-hidden');
  el.title = label;
  const svg = el.createSvg('svg', {attr: {viewBox: '0 0 16 16', width: '16', height: '16', 'aria-hidden': 'true'}});
  // The ring is a plain undashed circle: a full-length dash leaves a sub-pixel seam at the path start.
  svg.createSvg('circle', {attr: {cx: '8', cy: '8', r: '6.5'}}).setAttribute('data-part', 'track');
  const arc = dash => svg.createSvg('circle', {attr: {cx: '8', cy: '8', r: '6.5', pathLength: '100', 'stroke-dasharray': dash}});
  if (stats.done === stats.total) {
    // All done: a muted ring with a centered check reads faster than a closed arc.
    el.setAttribute('data-complete', 'true');
    svg.createSvg('path', {attr: {d: 'M4.8 7.9L7 10.1L11.2 5.9'}}).setAttribute('data-part', 'check');
    return stats;
  }
  el.removeAttribute('data-complete');
  const value = arc(Math.round(stats.done / stats.total * 10000) / 100 + ' 100');
  value.setAttribute('data-part', 'value');
  // Mirroring the rotated start reverses the sweep: the arc fills counterclockwise from 12 o'clock.
  value.setAttribute('transform', 'translate(16 0) scale(-1 1) rotate(-90 8 8)');
  return stats;
}
function matchOptions(values, query, limit = 40) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const needle = query.trim().toLowerCase();
  const starts = value => value.split('/').pop().toLowerCase().startsWith(needle);
  return values.filter(value => words.every(word => value.toLowerCase().includes(word)))
    .sort((a, b) => Number(starts(b)) - Number(starts(a)) || a.localeCompare(b, 'zh-CN', {numeric: true}))
    .slice(0, limit);
}
class OptionSuggest extends AbstractInputSuggest {
  constructor(app, input, values, choose, icons = false) {
    super(app, input);
    this.values = values;
    this.choose = choose;
    this.icons = icons;
    this.limit = 40;
  }
  getSuggestions(query) { return matchOptions(this.values(), query, this.limit); }
  renderSuggestion(value, el) {
    if (this.icons) drawIcon(this.app, el.createSpan({cls: 'ctz-today-sidebar__suggest-icon'}), value);
    el.createSpan({text: value});
  }
  selectSuggestion(value) {
    this.setValue(value);
    this.close();
    return this.choose(value);
  }
}

function folderOptions(app) {
  return ['/', ...app.vault.getAllFolders().map(folder => folder.path).filter(path => path !== '/')];
}
class TemplateModal extends Modal {
  constructor(plugin, button) {
    super(plugin.app);
    this.plugin = plugin;
    this.button = button;
    this.closed = false;
    this.submitting = false;
  }
  onOpen() {
    this.setTitle(t('从模板新建'));
    this.contentEl.createEl('p', {text: t('选择文件夹并输入文件名，模板内容将原样复制。')});
    const form = this.contentEl.createEl('form');
    const fields = form.createDiv({cls: 'ctz-today-sidebar__create-fields'});
    const folderLabel = fields.createEl('label', {cls: 'ctz-today-sidebar__create-folder'});
    folderLabel.createSpan({text: t('文件夹')});
    this.folderInput = folderLabel.createEl('input', {attr: {type: 'text', 'aria-label': t('文件夹'), placeholder: t('库根目录')}});
    this.folderInput.value = this.button.targetFolder;
    this.suggester = new OptionSuggest(this.app, this.folderInput, () => folderOptions(this.app), value => { this.folderInput.value = value; });
    const nameLabel = fields.createEl('label', {cls: 'ctz-today-sidebar__create-name'});
    nameLabel.createSpan({text: t('文件名')});
    const nameGroup = nameLabel.createSpan({cls: 'ctz-today-sidebar__create-name-input'});
    this.nameInput = nameGroup.createEl('input', {attr: {type: 'text', 'aria-label': t('文件名'), required: '', autocomplete: 'off'}});
    nameGroup.createSpan({text: '.md', cls: 'ctz-today-sidebar__create-extension'});
    this.errorEl = form.createDiv({cls: 'ctz-today-sidebar__create-error', attr: {role: 'alert'}});
    const actions = form.createDiv({cls: 'modal-button-container'});
    const cancel = actions.createEl('button', {text: t('取消'), attr: {type: 'button'}});
    cancel.addEventListener('click', () => this.close());
    this.submitButton = actions.createEl('button', {text: t('创建'), cls: 'mod-cta', attr: {type: 'submit'}});
    form.addEventListener('submit', event => { event.preventDefault(); void this.submit(); });
    this.nameInput.focus();
  }
  async submit() {
    if (this.submitting || this.closed || this.plugin.disposed) return;
    this.submitting = true;
    this.submitButton.disabled = true;
    this.errorEl.textContent = '';
    try {
      const file = await this.plugin.createFromTemplate(this.button.id, this.folderInput.value, this.nameInput.value, () => this.closed);
      if (!file) return;
      this.close();
      try { await this.plugin.openTarget(file); }
      catch (error) { new Notice(t('文件已创建，但无法打开：{error}', {error: error.message})); }
    } catch (error) {
      if (!this.closed) this.errorEl.textContent = t('无法创建文件：{error}', {error: error.message});
    } finally {
      this.submitting = false;
      this.submitButton.disabled = false;
    }
  }
  onClose() {
    this.closed = true;
    this.suggester?.close();
    if (this.plugin.templateModal === this) this.plugin.templateModal = null;
    this.contentEl.empty();
  }
}

function createNavigationRow(parent, custom = false) {
  const row = parent.createEl('button', {cls: 'ctz-today-sidebar__row' + (custom ? ' ctz-today-sidebar__custom-row' : ''), attr: {type: 'button'}});
  const icon = row.createSpan({cls: 'ctz-today-sidebar__icon', attr: {'aria-hidden': 'true'}});
  const label = row.createSpan({cls: 'ctz-today-sidebar__label ctz-today-sidebar__custom-label'});
  const subtitle = row.createSpan({cls: 'ctz-today-sidebar__date'});
  return {row, icon, label, subtitle};
}

// Clone the rendered row to measure alternative text with the same space and typography.
function titleOverflows(row, title) {
  const document = row?.ownerDocument;
  const width = row?.getBoundingClientRect().width;
  if (!document?.body || !width || row.hidden) return null;
  const window = document.defaultView;
  const sourceLabel = row.querySelector('.ctz-today-sidebar__label');
  if (!sourceLabel) return null;
  const wrapper = document.body.createDiv({cls: 'ctz-today-sidebar'});
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;';
  wrapper.style.width = width + 'px';
  try {
    const clone = row.cloneNode(true), style = window.getComputedStyle(row);
    clone.removeAttribute('aria-current');
    clone.style.width = '100%';
    clone.style.boxSizing = 'border-box';
    for (const name of ['padding', 'gap', 'font', 'letterSpacing']) clone.style[name] = style[name];
    const label = clone.querySelector('.ctz-today-sidebar__label');
    const labelStyle = window.getComputedStyle(sourceLabel);
    for (const name of ['font', 'letterSpacing', 'maxWidth']) label.style[name] = labelStyle[name];
    label.textContent = title;
    wrapper.appendChild(clone);
    return label.scrollWidth > label.clientWidth;
  } finally { wrapper.remove(); }
}

function updateSeparator(row, style) {
  row.setAttribute('data-style', style);
  row.setAttribute('role', style === 'space' ? 'presentation' : 'separator');
  if (style === 'space') row.setAttribute('aria-hidden', 'true');
  else row.removeAttribute('aria-hidden');
}
function createSeparator(parent, style) {
  const row = parent.createDiv({cls: 'ctz-today-sidebar__separator'});
  updateSeparator(row, style);
  return row;
}
function createSeparatorPreview(parent, style) {
  const row = parent.createEl('button', {cls: 'ctz-today-sidebar__row ctz-today-sidebar__separator-preview', attr: {type: 'button'}});
  const separator = createSeparator(row, style);
  separator.setAttribute('aria-hidden', 'true');
  const label = row.createSpan({cls: 'ctz-today-sidebar__sr-only'});
  return {row, separator, label};
}

class TodayView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return t('Today 类型'); }
  getIcon() { return 'calendar-days'; }
  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass('ctz-today-sidebar');
    const labelId = 'ctz-today-sidebar-nav-' + newButtonId();
    const nav = this.contentEl.createEl('nav', {attr: {'aria-labelledby': labelId}});
    this.contentEl.createSpan({text: t("文件导航"), cls: 'ctz-today-sidebar__sr-only', attr: {id: labelId}});
    this.nav = nav;
    this.customRows = new Map();
    this.separatorRows = new Map();
    this.row = null;
    this.updateActive();
  }
  updateActive() {
    if (!this.nav) return;
    this.plugin.taskCounter.beginRender();
    const view = this.plugin.navigationView();
    const today = this.plugin.settings.buttons.find(button => button.type === 'today');
    if (today) {
      if (!this.row) {
        const controls = createNavigationRow(this.nav);
        this.row = controls.row;
        this.todayIcon = controls.icon;
        this.todayLabel = controls.label;
        this.dateLabel = controls.subtitle;
        this.nav.prepend(this.row);
        this.row.addEventListener('click', () => { void this.plugin.openToday(); });
      }
      this.row.hidden = today.hidden;
      this.todayLabel.textContent = this.todayLabel.title = today.customTitle.trim() || t('Today 类型');
      const now = new Date();
      let todayInfo = null;
      try { todayInfo = entryInfo(this.plugin, today, this.plugin.settings, now); }
      catch { /* Invalid settings have no selected target. */ }
      const date = this.plugin.entrySubtitle(today, todayInfo, this.plugin.settings, now);
      this.dateLabel.textContent = date;
      this.dateLabel.title = today.subtitleMode === 'tasks' ? t('unfinishedHint', {count: date, description: this.plugin.taskCounter.description}) : date;
      this.dateLabel.hidden = !date;
      drawEntryIcon(this.plugin, this.todayIcon, today, todayInfo);
      const active = view instanceof FileView && view.file instanceof TFile && Boolean(todayInfo?.path) && view.file.path === todayInfo.path;
      if (active) this.row.setAttribute('aria-current', 'page');
      else this.row.removeAttribute('aria-current');
    } else if (this.row) {
      this.row.remove();
      this.row = this.todayIcon = this.todayLabel = this.dateLabel = null;
    }
    for (const [id, controls] of this.customRows) {
      if (!this.plugin.settings.buttons.some(button => button.id === id && ['file', 'template'].includes(button.type))) {
        controls.row.remove();
        this.customRows.delete(id);
      }
    }
    for (const button of this.plugin.settings.buttons.filter(item => ['file', 'template'].includes(item.type))) {
      let controls = this.customRows.get(button.id);
      if (!controls) {
        controls = createNavigationRow(this.nav, true);
        this.customRows.set(button.id, controls);
        controls.row.addEventListener('click', () => { if (button.type === 'template') this.plugin.openTemplate(button.id); else void this.plugin.openCustom(button.id); });
      }
      let info;
      try { info = customInfo(button, this.plugin.app.vault); }
      catch (error) { info = {title: button.customTitle.trim() || t("自定义"), subtitle: button.customSubtitle.trim(), path: '', error: error.message}; }
      controls.row.hidden = button.hidden;
      drawEntryIcon(this.plugin, controls.icon, button, info);
      const title = this.plugin.fileTitle(button, info);
      controls.label.textContent = title;
      controls.label.title = this.plugin.fileTitle(button, info, false);
      const subtitle = this.plugin.fileSubtitle(button, info);
      controls.subtitle.textContent = subtitle;
      controls.subtitle.title = button.subtitleMode === 'tasks' ? t('unfinishedHint', {count: subtitle, description: this.plugin.taskCounter.description}) : subtitle;
      controls.subtitle.hidden = !subtitle;
      controls.row.disabled = !info.path;
      controls.row.title = info.error || info.file?.path || info.path || t("请先在插件设置中填写文件地址");
      const customActive = button.type === 'file' && view instanceof FileView && view.file instanceof TFile && info.file && view.file.path === info.file.path;
      if (customActive) controls.row.setAttribute('aria-current', 'page');
      else controls.row.removeAttribute('aria-current');
    }
    for (const [id, row] of this.separatorRows) {
      if (!this.plugin.settings.buttons.some(button => button.id === id && button.type === 'separator')) {
        row.remove();
        this.separatorRows.delete(id);
      }
    }
    for (const button of this.plugin.settings.buttons.filter(item => item.type === 'separator')) {
      let row = this.separatorRows.get(button.id);
      if (!row) {
        row = createSeparator(this.nav, button.separatorStyle);
        this.separatorRows.set(button.id, row);
      }
      updateSeparator(row, button.separatorStyle);
      row.hidden = button.hidden;
    }
    for (const [index, button] of this.plugin.settings.buttons.entries()) {
      const row = button.type === 'today' ? this.row : button.type === 'separator' ? this.separatorRows.get(button.id) : this.customRows.get(button.id)?.row;
      if (row && this.nav.children[index] !== row) this.nav.insertBefore(row, this.nav.children[index] || null);
    }
  }
  async onClose() { this.row = null; this.dateLabel = null; this.todayLabel = null; this.todayIcon = null; this.customRows.clear(); this.separatorRows.clear(); this.nav = null; this.contentEl.empty(); }
}

class TodaySettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; this.suggesters = []; }
  closeSuggesters() { for (const suggest of this.suggesters) suggest.close(); this.suggesters = []; }
  setupDragging(list, {entryRows = this.entryRows, dragHandles = this.dragHandles, kind = 'buttons'} = {}) {
    const entries = [...entryRows.entries()];
    const document = list.ownerDocument;
    let drag = null, frame = null;
    // The grip sits at the row's left edge: use the floating row's overlap,
    // rather than requiring the pointer itself to remain inside the list.
    const withinDropArea = rect => {
      if (!drag?.active) return false;
      const left = drag.left + drag.x - drag.startX;
      return left + drag.width >= rect.left - 32 && left <= rect.right + 32 && drag.y >= rect.top - 16 && drag.y <= rect.bottom + 16;
    };
    const escape = event => { if (event.key === 'Escape' && drag) { event.preventDefault(); clear(); } };
    const clearMarkers = () => { for (const [, entry] of entries) entry.removeAttribute('data-drop'); };
    const resetPositions = () => { for (const [, entry] of entries) entry.style.removeProperty('transform'); };
    const clear = () => {
      const previous = drag;
      drag = null;
      document?.removeEventListener('keydown', escape);
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      clearMarkers();
      list.removeAttribute('data-dragging');
      resetPositions();
      previous?.ghost?.remove();
      previous?.entry.removeAttribute('data-drag-source');
      if (previous?.handle.hasPointerCapture?.(previous.pointerId)) previous.handle.releasePointerCapture(previous.pointerId);
    };
    const updateMarker = () => {
      if (!drag?.active) return;
      clearMarkers();
      drag.ghost.style.transform = 'translate3d(' + (drag.x - drag.startX) + 'px, ' + (drag.y - drag.startY) + 'px, 0)';
      drag.to = null;
      const rect = list.getBoundingClientRect();
      if (!withinDropArea(rect)) { drag.previewTo = drag.from; resetPositions(); return; }
      const scrollTop = list.scrollTop || 0;
      const from = drag.from;
      let to = drag.previewTo;
      const center = drag.originCenter + drag.y - drag.startY;
      const remaining = entries.map((_, index) => index).filter(index => index !== from);
      // Compare against the current preview slots, not the original slots that
      // have just moved away. The opened gap then remains a stable drop target.
      const centerAt = index => {
        const box = drag.boxes[index];
        const shift = to > from && index > from && index <= to ? -drag.height : to < from && index >= to && index < from ? drag.height : 0;
        return (box.top + box.bottom) / 2 - scrollTop + shift;
      };
      // The leading edge crossing a neighbor midpoint is enough to move into
      // its slot; aligning two grip centers must not require extra travel.
      while (to < remaining.length && center + drag.height / 2 > centerAt(remaining[to])) to++;
      while (to > 0 && center - drag.height / 2 < centerAt(remaining[to - 1])) to--;
      drag.previewTo = to;
      for (const [index, [, entry]] of entries.entries()) {
        const shift = to > from && index > from && index <= to ? -drag.height : to < from && index >= to && index < from ? drag.height : 0;
        if (shift) entry.style.transform = 'translateY(' + shift + 'px)';
        else entry.style.removeProperty('transform');
      }
      if (to === from) return;
      drag.to = to;
      const marker = entries[remaining[to] ?? remaining[to - 1]]?.[1];
      marker?.setAttribute('data-drop', to === remaining.length ? 'after' : 'before');
    };
    const scroll = () => {
      if (!drag?.active) return;
      const rect = list.getBoundingClientRect();
      if (withinDropArea(rect)) {
        const delta = drag.y < rect.top + 24 ? -6 : drag.y > rect.bottom - 24 ? 6 : 0;
        if (delta) { list.scrollTop += delta; updateMarker(); }
      }
      frame = window.requestAnimationFrame(scroll);
    };
    const cancelPrevious = this.cancelDrag;
    this.cancelDrag = () => { cancelPrevious?.(); clear(); };
    for (const [id, handle] of dragHandles) {
      handle.addEventListener('pointerdown', event => {
        if (this.plugin.disposed || event.button !== 0 || event.isPrimary === false) return;
        this.cancelDrag?.();
        event.preventDefault();
        drag = {id, handle, entry: entryRows.get(id), pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, active: false, to: null};
        document?.addEventListener('keydown', escape);
        handle.setPointerCapture?.(event.pointerId);
      });
      handle.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        drag.x = event.clientX; drag.y = event.clientY;
        if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 4) {
          drag.active = true;
          const bounds = drag.entry.getBoundingClientRect();
          drag.height = bounds.height;
          drag.left = bounds.left;
          drag.width = bounds.width;
          drag.originCenter = (bounds.top + bounds.bottom) / 2;
          drag.from = entries.findIndex(([id]) => id === drag.id);
          drag.previewTo = drag.from;
          drag.boxes = entries.map(([, entry]) => {
            const box = entry.getBoundingClientRect(), offset = list.scrollTop || 0;
            return {top: box.top + offset, bottom: box.bottom + offset};
          });
          drag.ghost = document.body.createDiv({cls: 'ctz-today-sidebar ctz-today-sidebar__manager-list-pane ctz-today-sidebar__manager-list ctz-today-sidebar__drag-ghost' + (kind === 'presets' ? ' ctz-today-sidebar__preset-list' : ''), attr: {'aria-hidden': 'true', inert: ''}});
          drag.ghost.style.left = bounds.left + 'px';
          drag.ghost.style.top = bounds.top + 'px';
          drag.ghost.style.width = bounds.width + 'px';
          const computed = document.defaultView.getComputedStyle(list);
          drag.ghost.style.font = computed.font;
          for (const name of ['--nav-item-size', '--nav-item-padding', '--nav-item-radius', '--nav-item-weight', '--nav-item-weight-active', '--nav-item-color', '--nav-item-color-active', '--nav-item-background-active', '--line-height-tight', '--ctz-visibility-size', '--ctz-visibility-gap']) {
            const value = computed.getPropertyValue(name);
            if (value) drag.ghost.style.setProperty(name, value);
          }
          drag.ghost.appendChild(drag.entry.cloneNode(true));
          list.setAttribute('data-dragging', 'true');
          drag.entry.setAttribute('data-drag-source', 'true');
          frame = window.requestAnimationFrame(scroll);
        }
        if (drag.active) { event.preventDefault(); updateMarker(); }
      });
      handle.addEventListener('pointerup', async event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        // Commit the same destination that produced the visible displacement.
        // Release coordinates can differ from the last rendered pointer move.
        const {id: movedId, active, to} = drag;
        clear();
        if (active && to !== null) {
          const saving = this.reorder(movedId, to, kind);
          (kind === 'presets' ? this.presetDragHandles : this.dragHandles).get(movedId)?.focus();
          await saving;
        }
      });
      handle.addEventListener('pointercancel', event => { if (drag?.pointerId === event.pointerId) clear(); });
      handle.addEventListener('lostpointercapture', event => { if (drag?.pointerId === event.pointerId) clear(); });
    }
  }
  async reorder(id, to, kind = 'buttons') {
    if (this.plugin.disposed) return;
    const items = kind === 'presets' ? this.plugin.settings.presets : this.plugin.settings.buttons;
    const from = items.findIndex(button => button.id === id);
    if (from < 0 || !Number.isInteger(to) || to < 0 || to >= items.length || from === to) return;
    const [button] = items.splice(from, 1);
    items.splice(to, 0, button);
    const saving = this.plugin.saveSettings();
    this.display();
    try { await saving; }
    catch (error) { new Notice(t("顺序保存失败：{error}", {error: error.message})); }
  }
  renderPresetActions(editor, selected, preset) {
    if (preset) {
      const danger = editor.createDiv({cls: 'ctz-today-sidebar__manager-danger'});
      this.deleteButton = danger.createEl('button', {text: t("删除预设"), cls: 'mod-warning ctz-today-sidebar__delete-button', attr: {type: 'button'}});
      this.deleteButton.addEventListener('click', async () => {
        if (this.plugin.disposed || !this.plugin.settings.presets.includes(preset)) return;
        this.plugin.settings.presets = this.plugin.settings.presets.filter(item => item !== preset);
        this.selectedPresetId = null;
        const saving = this.plugin.saveSettings();
        this.display();
        try { await saving; } catch (error) { new Notice(t("删除预设失败：{error}", {error: error.message})); }
      });
      return;
    }
    if (selected.type === 'today') return;
    const actions = this.renderDelete(editor, selected);
    this.savePresetButton = actions.createEl('button', {text: t("保存为预设"), attr: {type: 'button'}});
    actions.insertBefore(this.savePresetButton, this.deleteButton || null);
    this.savePresetButton.addEventListener('click', async () => {
      if (this.plugin.disposed || !this.plugin.settings.buttons.includes(selected)) return;
      let title = selected.customTitle?.trim();
      try {
        if (selected.type === 'file') title = this.plugin.fileTitle(selected, customInfo(selected, this.app.vault));
      } catch { /* Unavailable targets retain their configured title. */ }
      const base = title || (selected.type === 'today' ? t('Today 类型') : selected.type === 'separator' ? SEPARATOR_STYLES[selected.separatorStyle] : fileBaseName(selected.customPath)) || t("新预设");
      let name = base, suffix = 2;
      while (this.plugin.settings.presets.some(item => item.name === name)) name = t('presetDuplicate', {name: base, number: suffix++});
      const settings = this.plugin.settings;
      const created = {id: newButtonId(), name, button: {...selected, id: newButtonId()}, folder: settings.folder, dateFormat: settings.dateFormat, displayFormat: settings.displayFormat};
      settings.presets.push(created);
      this.selectedPresetId = created.id;
      const saving = this.plugin.saveSettings();
      this.display();
      try { await saving; } catch (error) { new Notice(t("保存预设失败：{error}", {error: error.message})); }
    });
  }
  renderDelete(editor, selected) {
    const danger = editor.createDiv({cls: 'ctz-today-sidebar__manager-danger'});
    this.deleteButton = danger.createEl('button', {text: t("删除"), cls: 'mod-warning ctz-today-sidebar__delete-button', attr: {type: 'button', title: selected.type === 'separator' ? t("删除此分隔条目") : t("仅删除边栏入口，不删除目标文件")}});
    this.deleteButton.addEventListener('click', async () => {
      if (this.plugin.disposed || selected.type === 'today') return;
      const index = this.plugin.settings.buttons.findIndex(button => button.id === selected.id);
      if (index < 0) return;
      this.plugin.settings.buttons = this.plugin.settings.buttons.filter(button => button.id !== selected.id);
      this.selectedId = this.plugin.settings.buttons[Math.min(index, this.plugin.settings.buttons.length - 1)]?.id;
      const saving = this.plugin.saveSettings();
      this.display();
      try { await saving; }
      catch (error) { new Notice(t("删除按钮保存失败：{error}", {error: error.message})); }
    });
    return danger;
  }

  hide() { this.titleResizeObserver?.disconnect(); this.cancelDrag?.(); this.cancelDrag = null; this.closeSuggesters(); this.refreshIconControls = null; this.refreshListControls = null; }
  display() {
    this.titleResizeObserver?.disconnect();
    this.cancelDrag?.();
    this.cancelDrag = null;
    this.closeSuggesters();
    this.taskModeSetting = null;
    void this.plugin.taskCounter.reloadStatuses();
    const {containerEl} = this;
    containerEl.empty();
    containerEl.createEl('h2', {text: t("边栏管理"), attr: {id: 'ctz-today-sidebar-manager-heading'}});
    const buttons = this.plugin.settings.buttons;
    const preset = this.plugin.settings.presets.find(item => item.id === this.selectedPresetId);
    if (!preset) this.selectedPresetId = null;
    const selected = preset?.button || buttons.find(button => button.id === this.selectedId) || buttons[0];
    if (!preset) this.selectedId = selected?.id;
    const dailySettings = preset || this.plugin.settings;
    const selectedExists = () => preset ? this.plugin.settings.presets.includes(preset) : this.plugin.settings.buttons.includes(selected);
    this.deleteButton = null;
    this.savePresetButton = null;
    this.addTodayButton = null;
    const manager = containerEl.createDiv({cls: 'ctz-today-sidebar__manager'});
    const listPane = manager.createDiv({cls: 'ctz-today-sidebar__manager-list-pane'});
    const list = listPane.createEl('nav', {cls: 'ctz-today-sidebar ctz-today-sidebar__manager-list', attr: {'aria-labelledby': 'ctz-today-sidebar-manager-heading'}});
    this.listRows = new Map();
    this.visibilityButtons = new Map();
    this.dragHandles = new Map();
    this.entryRows = new Map();
    const listControls = new Map();
    for (const button of buttons) {
      const entry = list.createDiv({cls: 'ctz-today-sidebar__manager-entry'});
      this.entryRows.set(button.id, entry);
      const handle = entry.createEl('button', {cls: 'clickable-icon ctz-today-sidebar__drag-handle', attr: {type: 'button', tabindex: '-1'}});
      setIcon(handle, 'grip-vertical');
      this.dragHandles.set(button.id, handle);
      const controls = button.type === 'separator' ? createSeparatorPreview(entry, button.separatorStyle) : createNavigationRow(entry, button.type !== 'today');
      const {row} = controls;
      controls.dragLabel = handle.createSpan({cls: 'ctz-today-sidebar__drag-label'});
      row.setAttribute('aria-pressed', String(!preset && button.id === selected.id));
      if (!preset && button.id === selected.id) row.setAttribute('aria-current', 'page');
      row.addEventListener('click', () => {
        this.selectedPresetId = null;
        this.selectedId = button.id;
        this.display();
        this.listRows.get(button.id).focus();
      });
      const visibility = entry.createEl('button', {cls: 'clickable-icon ctz-today-sidebar__visibility', attr: {type: 'button'}});
      controls.visibility = visibility;
      visibility.addEventListener('click', async () => {
        if (this.plugin.disposed || !this.plugin.settings.buttons.some(item => item.id === button.id)) return;
        button.hidden = !button.hidden;
        this.refreshListControls?.();
        try { await this.plugin.saveSettings(); }
        catch (error) { new Notice(t("显示状态保存失败：{error}", {error: error.message})); }
      });
      this.visibilityButtons.set(button.id, visibility);
      this.listRows.set(button.id, row);
      listControls.set(button.id, controls);
    }
    this.setupDragging(list);
    let refreshPropertyValues = () => {};
    let refreshTitleShortening = () => {};
    this.refreshListControls = () => {
      this.plugin.taskCounter.beginRender();
      if (this.taskModeSetting) {
        const todayMode = selected?.type === 'today';
        this.taskModeSetting.setDesc(selected?.subtitleMode === 'none' ? (todayMode ? t("隐藏副标题，日期格式会保留。") : t("不显示副标题，原有文本会保留。")) : selected?.subtitleMode === 'tasks' ? this.plugin.taskCounter.description + t(" 无任务显示 0，无法统计显示 —，等待缓存显示 …。") : selected?.subtitleMode === 'filename' ? t("显示目标文件名（不含 .md）。") : selected?.subtitleMode === 'frontmatter' ? t("显示指定 frontmatter 属性的值；属性缺失或为空时隐藏。") : todayMode ? t("显示按日期格式生成的日期；可改为当天日记的未完成任务数。") : selected?.type === 'template' ? t("普通文本，留空隐藏；选择其他模式时保留此文本，切回后恢复。") : t("可改为目标 Markdown 文件的未完成任务数；使用当前库 Tasks 状态配置，未配置时使用标准任务状态。"));
      }
      for (const button of this.plugin.settings.buttons) {
        const controls = listControls.get(button.id);
        if (!controls) continue;
        let title, unavailable = false;
        if (button.type === 'separator') {
          title = t('separatorHint', {style: SEPARATOR_STYLES[button.separatorStyle]});
          updateSeparator(controls.separator, button.separatorStyle);
          controls.separator.setAttribute('aria-hidden', 'true');
          controls.label.textContent = title;
        } else {
          title = button.customTitle.trim();
          let info = null;
          let subtitle;
          if (button.type === 'today') {
            title ||= t('Today 类型');
            try {
              info = entryInfo(this.plugin, button, this.plugin.settings);
              subtitle = this.plugin.entrySubtitle(button, info, this.plugin.settings);
            } catch { subtitle = button.subtitleMode === 'tasks' ? '—' : ''; }
          } else {
            subtitle = button.subtitleMode === 'none' ? '' : button.customSubtitle.trim();
            try {
              info = customInfo(button, this.app.vault);
              title = this.plugin.fileTitle(button, info);
              subtitle = this.plugin.fileSubtitle(button, info);
              unavailable = !info.path;
            } catch { title ||= t("自定义"); unavailable = true; if (button.subtitleMode === 'tasks') subtitle = '—'; else if (button.subtitleMode !== 'text') subtitle = ''; }
          }
          controls.label.textContent = controls.label.title = title;
          controls.subtitle.textContent = controls.subtitle.title = subtitle;
          controls.subtitle.hidden = !subtitle;
          controls.row.title = title;
          drawEntryIcon(this.plugin, controls.icon, button, info);
        }
        controls.dragLabel.textContent = t('dragItem', {title: title});
        controls.row.disabled = false;
        controls.row.setAttribute('data-unavailable', String(unavailable));
        controls.row.setAttribute('data-hidden', String(button.hidden));
        controls.visibility.setAttribute('aria-label', t('showItem', {title}));
        controls.visibility.setAttribute('aria-pressed', String(!button.hidden));
        controls.visibility.title = t(button.hidden ? 'showItem' : 'hideItem', {title});
        controls.visibility.empty();
        setIcon(controls.visibility, button.hidden ? (getIcon('eye-closed') ? 'eye-closed' : 'eye-off') : 'eye');
      }
      refreshPropertyValues();
    };
    const actions = listPane.createDiv({cls: 'ctz-today-sidebar__manager-actions'});
    const order = actions.createDiv({cls: 'ctz-today-sidebar__manager-order'});
    const move = async delta => {
      if (this.plugin.disposed) return;
      const items = this.plugin.settings.buttons;
      const from = items.findIndex(button => button.id === this.selectedId);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= items.length) return;
      const saving = this.reorder(this.selectedId, to);
      const control = delta < 0 ? this.moveUpButton : this.moveDownButton;
      if (!control.disabled) control.focus();
      else this.listRows.get(this.selectedId)?.focus();
      await saving;
    };
    const selectedIndex = buttons.findIndex(button => button.id === this.selectedId);
    this.moveUpButton = order.createEl('button', {cls: 'clickable-icon', attr: {type: 'button', 'aria-label': t("上移所选项"), title: t("上移")}});
    this.moveUpButton.disabled = Boolean(preset) || selectedIndex <= 0;
    setIcon(this.moveUpButton, 'arrow-up');
    this.moveUpButton.addEventListener('click', () => move(-1));
    this.moveDownButton = order.createEl('button', {cls: 'clickable-icon', attr: {type: 'button', 'aria-label': t("下移所选项"), title: t("下移")}});
    this.moveDownButton.disabled = Boolean(preset) || selectedIndex < 0 || selectedIndex >= buttons.length - 1;
    setIcon(this.moveDownButton, 'arrow-down');
    this.moveDownButton.addEventListener('click', () => move(1));
    const add = async (type, sourcePreset) => {
      if (this.plugin.disposed) return;
      if (type === 'today' && this.plugin.settings.buttons.some(button => button.type === 'today')) return;
      if (sourcePreset && !this.plugin.settings.presets.includes(sourcePreset)) return;
      const button = loadButton(sourcePreset ? {...sourcePreset.button, id: newButtonId()} : {}, new Set(), type);
      if (sourcePreset && type === 'today') for (const key of ['folder', 'dateFormat', 'displayFormat']) this.plugin.settings[key] = sourcePreset[key];
      this.selectedPresetId = null;
      if (type === 'today') this.plugin.settings.buttons.unshift(button);
      else this.plugin.settings.buttons.push(button);
      this.selectedId = button.id;
      const saving = this.plugin.saveSettings();
      this.display();
      try { await saving; }
      catch (error) { new Notice(t("设置保存失败：{error}", {error: error.message})); }
    };
    this.addButton = actions.createEl('button', {text: t("添加"), cls: 'ctz-today-sidebar__manager-add', attr: {type: 'button'}});
    this.addButton.addEventListener('click', () => {
      if (this.plugin.disposed) return;
      const menu = new Menu();
      menu.addItem(item => item.setTitle(t('File 类型')).setIcon('file').onClick(() => add('file')));
      menu.addItem(item => item.setTitle(t('从模板新建')).setIcon('file-plus').onClick(() => add('template')));
      menu.addItem(item => item.setTitle(t("分隔条目")).setIcon('minus').onClick(() => add('separator')));
      if (this.plugin.settings.presets.length) {
        menu.addSeparator();
        for (const item of this.plugin.settings.presets) menu.addItem(option => option.setTitle(item.name).setIcon(item.button.type === 'separator' ? 'minus' : item.button.customIcon || 'file').setDisabled(item.button.type === 'today' && buttons.some(button => button.type === 'today')).onClick(() => add(item.button.type, item)));
      }
      const rect = this.addButton.getBoundingClientRect();
      menu.showAtPosition({x: rect.left, y: rect.bottom});
    });
    if (!buttons.some(button => button.type === 'today')) {
      this.addTodayButton = actions.createEl('button', {text: t("添加 Today"), attr: {type: 'button'}});
      this.addTodayButton.addEventListener('click', () => add('today'));
    }
    const presetPane = listPane.createDiv({cls: 'ctz-today-sidebar__preset-pane'});
    presetPane.createEl('h3', {text: t("预设")});
    const presetList = presetPane.createDiv({cls: 'ctz-today-sidebar ctz-today-sidebar__preset-list'});
    this.presetRows = new Map();
    this.presetEntryRows = new Map();
    this.presetDragHandles = new Map();
    const presetControls = new Map();
    const presetDragLabels = new Map();
    const refreshPresets = () => {
      for (const item of this.plugin.settings.presets) {
        const controls = presetControls.get(item.id);
        if (!controls) continue;
        if (item.button.type === 'separator') {
          updateSeparator(controls.separator, item.button.separatorStyle);
          controls.label.textContent = item.name;
        } else {
          let info, subtitle = item.button.customSubtitle;
          if (item.button.type === 'today') {
            try { info = entryInfo(this.plugin, item.button, item); subtitle = this.plugin.entrySubtitle(item.button, info, item); }
            catch { subtitle = ''; }
          } else if (['file', 'template'].includes(item.button.type)) {
            try { info = customInfo(item.button, this.app.vault); subtitle = this.plugin.fileSubtitle(item.button, info); }
            catch { subtitle = item.button.subtitleMode === 'text' ? item.button.customSubtitle : ''; }
          }
          controls.label.textContent = item.name;
          controls.subtitle.textContent = subtitle;
          controls.subtitle.hidden = !subtitle;
          drawEntryIcon(this.plugin, controls.icon, item.button, info);
        }
      }
    };
    for (const item of this.plugin.settings.presets) {
      const entry = presetList.createDiv({cls: 'ctz-today-sidebar__manager-entry ctz-today-sidebar__preset-entry'});
      this.presetEntryRows.set(item.id, entry);
      const handle = entry.createEl('button', {cls: 'clickable-icon ctz-today-sidebar__drag-handle', attr: {type: 'button', tabindex: '-1'}});
      setIcon(handle, 'grip-vertical');
      presetDragLabels.set(item.id, handle.createSpan({text: t('dragItem', {title: item.name}), cls: 'ctz-today-sidebar__drag-label'}));
      this.presetDragHandles.set(item.id, handle);
      const controls = item.button.type === 'separator' ? createSeparatorPreview(entry, item.button.separatorStyle) : createNavigationRow(entry, item.button.type !== 'today');
      presetControls.set(item.id, controls);
      const row = controls.row;
      row.setAttribute('aria-pressed', String(item === preset));
      if (item === preset) row.setAttribute('aria-current', 'page');
      row.addEventListener('click', () => { this.selectedPresetId = item.id; this.display(); this.presetRows.get(item.id)?.focus(); });
      this.presetRows.set(item.id, row);
    }
    this.setupDragging(presetList, {entryRows: this.presetEntryRows, dragHandles: this.presetDragHandles, kind: 'presets'});
    const refreshEntries = this.refreshListControls;
    this.refreshListControls = () => { refreshEntries(); refreshPresets(); refreshTitleShortening(); };
    refreshPresets();
    void this.plugin.taskCounter.reloadStatuses();
    if (!this.plugin.settings.presets.length) presetPane.createEl('p', {text: t("暂无预设"), cls: 'setting-item-description'});
    const editor = manager.createDiv({cls: 'ctz-today-sidebar__manager-editor'});
    this.editorEl = editor;
    if (!selected) {
      editor.createEl('p', {text: t("暂无条目，请先添加。"), cls: 'setting-item-description'});
      this.refreshIconControls = () => this.refreshListControls?.();
      this.refreshIconControls();
      return;
    }
    const sectionHeading = text => editor.createEl('h3', {text, cls: 'ctz-today-sidebar__section-heading'});
    sectionHeading(t("基础"));
    if (preset) new Setting(editor).setName(t("预设名称")).addText(text => text.setValue(preset.name).onChange(async value => {
      const name = value.trim();
      if (!selectedExists() || this.plugin.disposed || !name || this.plugin.settings.presets.some(item => item !== preset && item.name === name)) return;
      preset.name = name;
      presetDragLabels.get(preset.id).textContent = t('dragItem', {title: name});
      try { await this.plugin.saveSettings(); } catch (error) { new Notice(t("保存预设失败：{error}", {error: error.message})); }
    }));
    if (selected.type === 'separator') {
      new Setting(editor).setName(t("类型")).setDesc(t("分隔条目 · 仅用于视觉分组"));
      new Setting(editor).setName(t("分隔样式")).addDropdown(dropdown => dropdown.addOptions(SEPARATOR_STYLES).setValue(selected.separatorStyle).onChange(async value => {
        if (this.plugin.disposed || !selectedExists() || !Object.hasOwn(SEPARATOR_STYLES, value)) return;
        selected.separatorStyle = value;
        this.refreshListControls?.();
        try { await this.plugin.saveSettings(); }
        catch (error) { new Notice(t("设置保存失败：{error}", {error: error.message})); }
      }));
      this.renderPresetActions(editor, selected, preset);
      this.refreshIconControls = () => this.refreshListControls?.();
      this.refreshIconControls();
      return;
    }
    new Setting(editor).setName(t("类型")).setDesc(selected.type === 'today' ? t("Today · 打开当天日记") : selected.type === 'template' ? t('模板 · 复制指定文件创建新笔记') : t("File · 打开指定文件"));
    const propertyValues = [];
    const updatePropertyValues = () => {
      let info = {};
      try { info = customInfo(selected, this.app.vault); } catch { /* Invalid targets have no property values. */ }
      for (const entry of propertyValues) {
        const {key, element, dropdown} = entry;
        const keys = propertyOptions(this.app, selected);
        const signature = JSON.stringify(keys);
        if (entry.signature !== signature) {
          dropdown.selectEl.empty();
          dropdown.addOptions(Object.fromEntries([['', keys.length ? t("选择属性") : t("暂无属性")], ...keys.map(key => [key, key])]));
          entry.signature = signature;
        }
        dropdown.setValue(keys.includes(selected[key]) ? selected[key] : '');
        element.textContent = frontmatterValue(info.file ? this.app.metadataCache.getFileCache(info.file) : null, selected[key]) ?? t("（空或缺失）");
      }
    };
    refreshPropertyValues = updatePropertyValues;
    let titleSetting, titlePropertySetting, subtitleSetting, subtitlePropertySetting, iconSetting;
    const updateTitleEditor = () => {
      if (titleSetting) titleSetting.settingEl.hidden = selected.type === 'file' && selected.titleMode !== 'text';
      if (titlePropertySetting) titlePropertySetting.settingEl.hidden = !(selected.type === 'file' && selected.titleMode === 'frontmatter');
    };
    const updateSubtitleEditor = () => {
      if (subtitleSetting) subtitleSetting.settingEl.hidden = selected.subtitleMode !== 'text';
      if (subtitlePropertySetting) subtitlePropertySetting.settingEl.hidden = !(selected.type === 'file' && selected.subtitleMode === 'frontmatter');
    };
    const updateIconEditor = () => { if (iconSetting) iconSetting.settingEl.hidden = selected.iconMode === 'tasks'; };
    const update = async (key, value, global = false) => {
      if (this.plugin.disposed || !selectedExists()) return;
      if (global) dailySettings[key] = value;
      else selected[key] = value;
      updateTitleEditor();
      updateSubtitleEditor();
      updateIconEditor();
      updatePropertyValues();
      this.refreshListControls?.();
      try { await this.plugin.saveSettings(); }
      catch (error) { new Notice(t("设置保存失败：{error}", {error: error.message})); }
    };
    const titleHeading = sectionHeading(t("主标题"));
    if (selected.type === 'file') {
      new Setting(editor).setName(t("主标题来源")).setDesc(t("普通文本留空时使用目标文件名；frontmatter 属性缺失或为空时同样回退。"))
        .addDropdown(dropdown => dropdown.addOptions({text: t("普通文本"), filename: t("文件名"), frontmatter: t("frontmatter 属性")}).setValue(selected.titleMode).onChange(value => {
          if (!['text', 'filename', 'frontmatter'].includes(value)) return;
          return update('titleMode', value);
        }));
    }
    titleSetting = new Setting(editor).setName(t("主标题")).setDesc(selected.type === 'today' ? t("留空显示 Today。") : t("留空时使用目标文件名。"))
      .addText(text => text.setValue(selected.customTitle).onChange(value => update('customTitle', value)));
    if (selected.type === 'file') {
      titlePropertySetting = new Setting(editor).setName(t("标题属性名")).setDesc(t("选择目标文件的 frontmatter 属性；缺失时回退文件名或普通文本。"));
      titlePropertySetting.settingEl.addClass('ctz-today-sidebar__property-setting');
      titlePropertySetting.addDropdown(dropdown => {
        dropdown.onChange(value => {
          if (value && !propertyOptions(this.app, selected).includes(value)) return;
          return update('titleProperty', value);
        });
        propertyValues.push({key: 'titleProperty', dropdown, element: titlePropertySetting.controlEl.createSpan({cls: 'ctz-today-sidebar__property-value', attr: {'aria-live': 'polite'}})});
      });
    }
    if (selected.type === 'file') {
      const abbreviation = new Setting(editor).setName(t("使用简称")).setDesc(t("用简称显示主标题，保留原属性内容。"))
        .addToggle(toggle => toggle.setValue(selected.titleShorteningEnabled).onChange(value => update('titleShorteningEnabled', value)));
      const abbreviationText = new Setting(editor).setName(t("简称"))
        .addText(text => text.setValue(selected.titleShortName).onChange(value => update('titleShortName', value)));
      const warning = abbreviationText.controlEl.createSpan({cls: 'ctz-today-sidebar__short-title-warning', attr: {role: 'img', 'aria-label': t("简称仍会被截断"), title: t("简称仍会被截断")}});
      setIcon(warning, 'triangle-alert');
      const candidateRows = () => {
        const rows = [];
        if (!preset) for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
          const row = leaf.view instanceof TodayView ? leaf.view.customRows.get(selected.id)?.row : null;
          if (row) rows.push(row);
        }
        rows.push(preset ? presetControls.get(preset.id)?.row : listControls.get(selected.id)?.row);
        return rows;
      };
      refreshTitleShortening = () => {
        let raw = null;
        try { const info = customInfo(selected, this.app.vault); raw = info.file ? frontmatterValue(this.app.metadataCache.getFileCache(info.file), selected.titleProperty) : null; } catch { /* No target has no property title. */ }
        const measure = text => {
          for (const row of candidateRows()) { const overflow = titleOverflows(row, text); if (overflow !== null) return overflow; }
          return false;
        };
        const active = selected.titleMode === 'frontmatter';
        abbreviation.settingEl.hidden = !active || !(selected.titleShorteningEnabled || (raw && measure(raw)));
        abbreviationText.settingEl.hidden = !active || !selected.titleShorteningEnabled;
        warning.hidden = !active || !selected.titleShorteningEnabled || !raw || !selected.titleShortName.trim() || !measure(selected.titleShortName.trim());
      };
      const ResizeObserver = editor.ownerDocument?.defaultView?.ResizeObserver;
      if (ResizeObserver) {
        this.titleResizeObserver = new ResizeObserver(() => refreshTitleShortening());
        for (const row of candidateRows()) if (row) this.titleResizeObserver.observe(row);
      }
    }
    sectionHeading(t("副标题"));
    // Today reuses the text mode for its date, so the same three choices replace the old fixed date.
    const subtitleModeOptions = selected.type === 'template' ? {none: t('不显示'), text: t('普通文本')} : selected.type === 'today' ? {none: t("不显示"), text: t("日期"), tasks: t("未完成任务数")} : {none: t("不显示"), text: t("普通文本"), tasks: t("未完成任务数"), filename: t("文件名"), frontmatter: t("frontmatter 属性")};
    this.taskModeSetting = new Setting(editor).setName(t("副标题显示")).addDropdown(dropdown => dropdown.addOptions(subtitleModeOptions).setValue(selected.subtitleMode).onChange(value => {
      if (!Object.hasOwn(subtitleModeOptions, value)) return;
      return update('subtitleMode', value);
    }));
    subtitleSetting = new Setting(editor).setName(t("副标题"))
      .setDesc(selected.type === 'today' ? t("日期显示格式，例如 YYYY-MM-DD ddd；留空隐藏，不改变文件地址。") : t("普通文本，留空隐藏；选择其他模式时保留此文本，切回后恢复。"))
      .addText(text => text.setValue(selected.type === 'today' ? dailySettings.displayFormat : selected.customSubtitle)
        .onChange(value => update(selected.type === 'today' ? 'displayFormat' : 'customSubtitle', value, selected.type === 'today')));
    if (selected.type === 'file') {
      subtitlePropertySetting = new Setting(editor).setName(t("副标题属性名")).setDesc(t("选择目标文件的 frontmatter 属性；缺失或为空时隐藏副标题。"));
      subtitlePropertySetting.settingEl.addClass('ctz-today-sidebar__property-setting');
      subtitlePropertySetting.addDropdown(dropdown => {
        dropdown.onChange(value => {
          if (value && !propertyOptions(this.app, selected).includes(value)) return;
          return update('subtitleProperty', value);
        });
        propertyValues.push({key: 'subtitleProperty', dropdown, element: subtitlePropertySetting.controlEl.createSpan({cls: 'ctz-today-sidebar__property-value', attr: {'aria-live': 'polite'}})});
      });
    }
    updateTitleEditor();
    updateSubtitleEditor();
    sectionHeading(t("图标"));
    if (selected.type === 'today') {
      for (const [key, name, description, placeholder] of [
        ['folder', t("日记文件夹"), t("地址的文件夹部分，使用库内相对路径；留空表示库根目录。"), '00-journal'],
        ['dateFormat', t("文件名日期格式"), t("地址的文件名部分，使用 Moment 格式，例如 YYYY-MM-DD、YYYY/MM/DD；无需填写 .md。"), 'YYYY-MM-DD'],
      ]) {
        const pathSetting = new Setting(editor).setName(name).setDesc(description)
          .addText(text => text.setPlaceholder(placeholder).setValue(dailySettings[key]).onChange(value => update(key, value, true)));
        editor.insertBefore(pathSetting.settingEl, titleHeading);
      }
    } else {
      const addressSetting = new Setting(editor).setName(t(selected.type === 'template' ? "模板文件" : "文件地址")).setDesc(t("搜索库内文件或输入相对路径；省略扩展名时尝试补 .md。"));
      addressSetting.settingEl.addClass('ctz-today-sidebar__file-address');
      editor.insertBefore(addressSetting.settingEl, titleHeading);
      addressSetting.addText(text => {
          text.setValue(selected.customPath).onChange(value => update('customPath', value));
          this.suggesters.push(new OptionSuggest(this.app, text.inputEl, () => this.app.vault.getFiles().filter(file => selected.type !== 'template' || file.extension === 'md').map(file => file.path), value => update('customPath', value)));
        });
    }
    if (selected.type === 'template') {
      const folderSetting = new Setting(editor).setName(t('默认文件夹')).setDesc(t('请选择已有文件夹，留空表示库根目录。'));
      editor.insertBefore(folderSetting.settingEl, titleHeading);
      folderSetting.addText(text => {
        text.setValue(selected.targetFolder).setPlaceholder(t('库根目录')).onChange(value => update('targetFolder', value));
        this.suggesters.push(new OptionSuggest(this.app, text.inputEl, () => folderOptions(this.app), value => update('targetFolder', value)));
      });
    }
    if (selected.type !== 'template') new Setting(editor).setName(t("图标显示")).setDesc(t("完成度饼图按已完成任务占未完成与已完成任务总数的比例绘制环形，取消任务不计入；无任务或无法统计时回退普通图标，关闭后恢复保存的图标。"))
      .addDropdown(dropdown => dropdown.addOptions({icon: t("普通图标"), tasks: t("完成度饼图")}).setValue(selected.iconMode).onChange(value => {
        if (!['icon', 'tasks'].includes(value)) return;
        return update('iconMode', value);
      }));
    iconSetting = new Setting(editor).setName(t("按钮图标")).setDesc(t("输入搜索，或使用 Custom Icons 选择图标。"));
    const iconPreview = iconSetting.controlEl.createEl('button', {cls: 'ctz-today-sidebar__icon-preview', attr: {type: 'button', 'aria-label': t("选择图标")}});
    const refreshIcon = value => { const id = drawIcon(this.app, iconPreview, value); iconPreview.title = t('chooseIconHint', {name: id}); };
    let iconInput;
    iconSetting.addText(text => {
      iconInput = text;
      text.setValue(selected.customIcon).onChange(value => { refreshIcon(value); return update('customIcon', value); });
      this.suggesters.push(new OptionSuggest(this.app, text.inputEl, () => availableIconIds(this.app), value => { refreshIcon(value); return update('customIcon', value); }, true));
    });
    iconPreview.addEventListener('click', () => {
      const api = customIconsApi(this.app);
      if (!api) { new Notice(t("请先启用支持接口版本1的 Custom Icons；也可直接输入内置图标名称。")); return; }
      try {
        api.openPicker({value: selected.customIcon, sourceEl: iconPreview, colorEditable: false, include: {lucideExtras: true}, onPick: result => {
          if (this.plugin.disposed) return;
          const value = result?.id || 'file';
          iconInput.setValue(value);
          refreshIcon(value);
          void update('customIcon', value);
        }});
      } catch (error) { new Notice(t("无法打开图标选择器：{error}", {error: error.message})); }
    });
    updateIconEditor();
    this.renderPresetActions(editor, selected, preset);
    this.refreshIconControls = () => { refreshIcon(selected.customIcon); this.refreshListControls?.(); updatePropertyValues(); };
    this.refreshIconControls();
    updatePropertyValues();
  }
}

class TodaySidebarPlugin extends Plugin {
  async onload() {
    this.settings = loadSettings(await this.loadData());
    this.disposed = false;
    this.taskCounter = new TaskCounter(this);
    this.registerView(VIEW_TYPE, leaf => new TodayView(leaf, this));
    this.settingsTab = new TodaySettings(this.app, this);
    this.addSettingTab(this.settingsTab);
    for (const event of ['active-leaf-change', 'file-open']) {
      this.registerEvent(this.app.workspace.on(event, () => this.refreshTodayStates()));
    }
    this.registerEvent(this.app.workspace.on('custom-icons:changed', () => {
      this.refreshTodayStates();
      this.settingsTab?.refreshIconControls?.();
    }));
    this.registerEvent(this.app.metadataCache.on('changed', file => {
      this.taskCounter.invalidate(file);
      if (this.usesFileDisplay(file?.path)) this.refreshTodayStates();
    }));
    this.registerEvent(this.app.metadataCache.on('resolved', () => {
      if (!this.taskCounter.entries().length) return;
      this.taskCounter.counts.clear();
      this.taskCounter.dirty.clear();
      this.refreshTodayStates();
    }));
    this.registerEvent(this.app.vault.on('modify', file => this.taskCounter.invalidate(file, true)));
    for (const event of ['create', 'delete', 'rename']) {
      this.registerEvent(this.app.vault.on(event, (file, oldPath) => {
        if (!this.taskCounter.isTargetPath(file.path) && !this.taskCounter.isTargetPath(oldPath) && !this.usesFileDisplay(file.path) && !this.usesFileDisplay(oldPath)) return;
        this.taskCounter.counts.clear();
        this.refreshTodayStates();
      }));
    }
    // Refresh after local midnight even when focus stays in the same note.
    this.registerInterval(window.setInterval(() => { this.refreshTodayStates(); void this.taskCounter.reloadStatuses(); }, 30000));
    this.addCommand({id: 'show-sidebar', name: t("显示 Today 侧栏"), callback: () => {
      void this.ensureSidebar(true).catch(error => new Notice(t("无法打开侧栏：{error}", {error: error.message})));
    }});
    this.app.workspace.onLayoutReady(() => {
      if (!this.disposed) void this.ensureSidebar(false).catch(error => new Notice(t("无法创建 Today 侧栏：{error}", {error: error.message})));
    });
    await this.taskCounter.reloadStatuses();
  }
  fileTitle(button, info, abbreviated = true) {
    if (button.titleMode === 'filename') return fileBaseName(info?.file?.path || info?.path) || info.title;
    if (button.titleMode === 'frontmatter' && !info?.path) return t("自定义");
    if (button.titleMode === 'frontmatter') {
      const value = frontmatterValue(info?.file ? this.app.metadataCache.getFileCache(info.file) : null, button.titleProperty);
      return value ? (abbreviated && button.titleShorteningEnabled && button.titleShortName.trim() ? button.titleShortName.trim() : value) : info.title;
    }
    return info.title;
  }
  fileSubtitle(button, info) {
    if (button.subtitleMode === 'none') return '';
    if (button.subtitleMode === 'tasks') return this.taskCounter.subtitle(info.file);
    if (button.subtitleMode === 'filename') return fileBaseName(info?.file?.path || info?.path);
    if (button.subtitleMode === 'frontmatter') return frontmatterValue(info?.file ? this.app.metadataCache.getFileCache(info.file) : null, button.subtitleProperty) ?? '';
    return info.subtitle;
  }
  // Today reuses the text mode for its date format, so it never falls through to a saved subtitle.
  entrySubtitle(button, info, daily = this.settings, date = new Date()) {
    if (button.type !== 'today') return this.fileSubtitle(button, info);
    if (button.subtitleMode === 'none') return '';
    if (button.subtitleMode === 'tasks') return this.taskCounter.subtitle(info?.file);
    return displayDate(daily, date);
  }
  // Filename and frontmatter displays depend on the live file, not only on saved settings.
  usesFileDisplay(path) {
    if (typeof path !== 'string' || !path) return false;
    const presets = this.settingsTab?.refreshListControls ? this.settings.presets.map(item => item.button) : [];
    return [...this.settings.buttons, ...presets].some(button => {
      if (button.type !== 'file') return false;
      if (!['filename', 'frontmatter'].includes(button.titleMode) && !['filename', 'frontmatter'].includes(button.subtitleMode)) return false;
      const value = button.customPath.trim();
      return Boolean(value) && (path === normalizePath(value) || path === normalizePath(value + '.md'));
    });
  }
  refreshTodayStates() {
    if (this.disposed) return;
    this.taskCounter.prune();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof TodayView) leaf.view.updateActive();
    }
    this.settingsTab?.refreshListControls?.();
  }
  async saveSettings() {
    if (!this.taskCounter.ready) void this.taskCounter.reloadStatuses();
    this.refreshTodayStates();
    // Serialize writes so rapid typing cannot leave an older value on disk.
    const data = {...this.settings, buttons: this.settings.buttons.map(button => ({...button})), presets: this.settings.presets.map(preset => ({...preset, button: {...preset.button}}))};
    this.saveQueue = (this.saveQueue || Promise.resolve()).catch(() => {}).then(() => this.saveData(data));
    await this.saveQueue;
  }
  async ensureSidebar(reveal) {
    if (this.disposed) return;
    if (!this.sidebarPromise) {
      this.sidebarPromise = (async () => {
        let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
        if (!leaf) {
          // false means a new tab in the existing left-side tab group.
          leaf = this.app.workspace.getLeftLeaf(false);
          if (!leaf) throw new Error(t("左侧栏暂不可用，请稍后使用显示侧栏命令。"));
          await leaf.setViewState({type: VIEW_TYPE, active: false});
        }
        return leaf;
      })();
    }
    let leaf;
    try { leaf = await this.sidebarPromise; }
    finally { this.sidebarPromise = null; }
    if (reveal && !this.disposed) await this.app.workspace.revealLeaf(leaf);
  }
  navigationView() {
    const workspace = this.app.workspace;
    const view = workspace.getActiveViewOfType(View);
    // The host activates this sidebar on pointerdown/focusin, before button click.
    return view instanceof TodayView ? workspace.getMostRecentLeaf()?.view : view;
  }
  async openTarget(file) {
    const workspace = this.app.workspace;
    const matches = view => view instanceof FileView && view.file instanceof TFile && view.file.path === file.path;
    if (matches(this.navigationView())) return;
    const candidates = [];
    workspace.iterateRootLeaves(leaf => {
      if (leaf.isDeferred ? leaf.getViewState().state?.file === file.path : matches(leaf.view)) candidates.push(leaf);
    });
    // Workspace order is stable; prefer its first matching tab when duplicates exist.
    for (const leaf of candidates) {
      if (leaf.isDeferred) await leaf.loadIfDeferred();
      if (this.disposed) return;
      if (!matches(leaf.view)) continue;
      // Direct activation selects the tab without revealLeaf's header flash.
      if (!this.disposed) workspace.setActiveLeaf(leaf, {focus: true});
      return;
    }
    // A new main-area tab keeps the sidebar and existing pinned notes intact.
    if (!this.disposed) await workspace.getLeaf('tab').openFile(file, {active: true});
  }
  async openToday() {
    if (this.opening || this.disposed) return;
    this.opening = true;
    try {
      const path = dailyPath(this.settings);
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || file.extension !== 'md') {
        new Notice(t("当天日记不存在：{path}", {path: path}));
        return;
      }
      await this.openTarget(file);
    } catch (error) { new Notice(t("无法打开今日日记：{error}", {error: error.message})); }
    finally { this.opening = false; }
  }
  openTemplate(id) {
    if (this.disposed || this.templateModal) return;
    const button = this.settings.buttons.find(item => item.id === id && item.type === 'template');
    if (!button) return;
    this.templateModal = new TemplateModal(this, button);
    this.templateModal.open();
  }
  async createFromTemplate(id, folderValue, nameValue, cancelled = () => false) {
    if (this.disposed || cancelled()) return null;
    const button = this.settings.buttons.find(item => item.id === id && item.type === 'template');
    const source = button ? customInfo(button, this.app.vault).file : null;
    if (!(source instanceof TFile) || source.extension !== 'md') throw new Error(t('模板必须是已有的 Markdown 文件。'));
    const folder = folderValue.trim() === '/' ? '' : folderValue.trim();
    validateRelativePath(folder, t('文件夹'), true);
    if (folder && !(this.app.vault.getAbstractFileByPath(folder) instanceof TFolder)) throw new Error(t('请选择已有文件夹，留空表示库根目录。'));
    const name = nameValue.trim().replace(/\.md$/i, '');
    validateRelativePath(name, t('文件名'));
    if (name.includes('/')) throw new Error(t('文件名不能包含文件夹路径。'));
    const path = normalizePath((folder ? folder + '/' : '') + name + '.md');
    if (this.app.vault.getAbstractFileByPath(path)) throw new Error(t('文件已存在：{path}', {path}));
    const content = await this.app.vault.read(source);
    if (this.disposed || cancelled()) return null;
    // Vault.create refuses existing paths, including files created while read was pending.
    return this.app.vault.create(path, content);
  }
  async openCustom(id = this.settings.buttons.find(button => button.type === 'file')?.id) {
    if (this.opening || this.disposed) return;
    this.opening = true;
    try {
      const button = this.settings.buttons.find(item => item.id === id && item.type === 'file');
      if (!button) return;
      const info = customInfo(button, this.app.vault);
      if (!info.path) { new Notice(t("请先在插件设置中填写自定义按钮的文件地址。")); return; }
      if (!info.file) { new Notice(t("文件不存在：{path}", {path: info.path})); return; }
      await this.openTarget(info.file);
    } catch (error) { new Notice(t("无法打开自定义文件：{error}", {error: error.message})); }
    finally { this.opening = false; }
  }
  onunload() { this.disposed = true; this.templateModal?.close(); this.settingsTab?.hide(); }
}
module.exports = TodaySidebarPlugin;
module.exports.testing = {TemplateModal, folderOptions, COPY, t, uiLanguage,titleOverflows,taskStatusTypes, countUnfinishedTasks, countTaskStats, progressLabel, drawEntryIcon, frontmatterValue, fileBaseName, propertyOptions, dailyPath, displayDate, customInfo, customIconsApi, iconId, drawIcon, availableIconIds, matchOptions, OptionSuggest, loadSettings, VIEW_TYPE, DEFAULTS, TodayView, TodaySettings};
