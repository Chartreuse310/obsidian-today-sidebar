# Changelog

## 0.25.2 — 2026-10-28

- Fix package builds when the system temporary directory and output directory are on different filesystems, including CI environments that return EXDEV for renames.

## 0.25.1 — 2026-10-28

- Rename the template creation action to Create file.
- Give the folder and file name areas a 1:2 width ratio in the creation dialog.
- Default new template buttons to the built-in circle plus icon, preserving saved icon choices.

## 0.25.0 — 2026-10-28

- Add template buttons that copy a selected Markdown file into a new note, with reusable presets and an optional default folder.
- Choose an existing folder with suggestions on the left and enter a file name on the right, followed by a fixed `.md` suffix.
- Prevent overwrites and duplicate submissions, and retain input when creation fails. Copy template content without evaluating variables.

## 0.24.0 — 2026-10-27

- Let today's daily note choose its subtitle between the displayed date and the unfinished task count, and use the progress ring in place of its icon.
- Keep the saved date format while the daily note shows a task count, so switching back to the date restores it.
- Resolve the daily-note target at render time, so the count and the ring follow the current date and the current file.

## 0.23.3 — 2026-10-26

- Replace clip-path with rectangular clipping for visually hidden navigation and drag labels, preserving accessible names and avoiding the css-clip-path compatibility warning.
- Requires Obsidian 1.8.7 or later. All 136 automated tests passed.
- Add a manually triggered GitHub Actions release workflow with provenance attestations and download verification for all five assets.


## 0.23.2 — 2026-10-26

Initial public release. Requires Obsidian 1.8.7 or later. Licensed under GPL-3.0-only.

- Open today's existing daily note using configurable folder and date formats.
- Add vault file shortcuts and reuse existing main-editor tabs.
- Use text, file names, or frontmatter properties for titles and subtitles, including short titles.
- Show unfinished task counts and progress rings with optional Tasks status support.
- Organize items with ordering, visibility controls, separators, and reusable presets.
- Use built-in icons or the optional Custom Icons integration.
- Follow Obsidian's interface language in Simplified Chinese or English.
- Remove the navigation hover tooltip while preserving its localized accessible name.

Desktop and mobile acceptance was completed during 0.23.1 preparation. The 0.23.2 navigation-tooltip fix has additional automated regression coverage; all 136 automated tests passed. Screenshots retain their actual 0.23.1 capture version.

Download the installation ZIP or individual files from the [0.23.2 release](https://github.com/Chartreuse310/obsidian-today-sidebar/releases/tag/0.23.2). This release has not yet been listed in the Obsidian Community directory.
