# Development

[English overview](../README.md) · [简体中文](../README.zh-CN.md)

## Setup and verification

Use Node.js 20 or later, npm, Google Chrome, and a system `zip` command. Run all commands from the repository root:

```sh
npm ci
npm test
npm run package
```

`main.js` is the maintained source and the plugin entry point; there is no compilation step. `styles.css` and `manifest.json` are the other runtime files. No npm dependencies are bundled into the plugin.

The ZIP is generated in `dist/ctz-today-sidebar.zip` and contains the three runtime files plus LICENSE inside a `ctz-today-sidebar` folder. Packaging does not install, enable, or reload the plugin.

## Tests

- `npm run test:unit` uses a simulated Obsidian API to verify navigation, settings migration, task statistics, optional integrations, and packaging.
- `npm run test:ui` uses Playwright with Google Chrome to verify rendered geometry, theme behavior, and pointer interactions.
- `npm test` runs both groups. Automated checks do not open or control a user's Obsidian workspace and do not replace real-app acceptance testing.

Moment is loaded from the development dependencies. `TODAY_TEST_MOMENT` can point to an alternative CommonJS file; the test harness also supports extracting the bundled version from a local macOS Obsidian installation. `WORKBENCH_NODE_MODULES` can select an alternative Playwright dependency directory. These are test-only options.

## Runtime boundaries

Normal vault file lookup and metadata use public Obsidian APIs. Settings use `Plugin.loadData()` and `Plugin.saveData()`. The plugin does not edit note contents or create missing daily notes.

The optional Custom Icons integration uses a non-public plugin lookup, guarded by contract version 1 and method checks, with built-in icon fallback. Tasks integration reads saved status settings from the current vault configuration directory and never writes them. See the user documentation for the data-access details.

## Versioning and release assets

Keep the plugin id `ctz-today-sidebar` and existing settings compatible. Feature changes use a minor version and compatible fixes a patch version. Documentation-only changes do not change the runtime version.

```sh
npm version patch --no-git-tag-version
npm test
npm run package
```

The version hook synchronizes manifest.json and versions.json. Commit the reviewed changes explicitly. A release tag must match the manifest version exactly, without a `v` prefix. Upload main.js, manifest.json, styles.css, and LICENSE; the installation ZIP can be included as an additional download. Do not overwrite published version assets.

Check the plugin manually on desktop and mobile before publishing. Keep personal vaults, settings, local migration records, and development dependencies out of the public source tree.

## Attested releases

The Release workflow in `.github/workflows/release.yml` runs manually from the GitHub default branch. It checks out the triggering commit, installs locked dependencies and Chrome, runs all tests, and packages the plugin. `scripts/prepare-release.mjs` freezes exactly five assets: main.js, manifest.json, styles.css, LICENSE, and ctz-today-sidebar.zip.

The workflow generates GitHub artifact attestations for all five files using the official pinned `actions/attest` action. It uploads a draft Release, downloads the assets again, compares their bytes, and verifies their attestations against this repository, workflow, and source commit before publishing as Latest. The release tag matches the manifest version and points to the workflow commit. No personal signing key is required.

To release, update versions and the versioned changelog, commit the reviewed public source, then select Actions → Release → Run workflow on the default branch. Existing version tags or Releases (including drafts) block reuse. If verification fails, inspect the retained draft and run logs; the workflow never overwrites published assets. Re-running after a failed draft requires an explicit maintenance decision.

Users can verify downloaded assets with:

```sh
gh attestation verify main.js --repo Chartreuse310/obsidian-today-sidebar
gh attestation verify styles.css --repo Chartreuse310/obsidian-today-sidebar
```

The first workflow release is 0.23.3. Existing 0.23.2 assets are unchanged. Attestations do not modify the runtime files or plugin settings.
