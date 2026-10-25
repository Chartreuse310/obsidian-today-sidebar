import {readFileSync, writeFileSync} from 'node:fs';

// npm version supplies the updated package version and runs this hook at the project root.
const version = process.env.npm_package_version;
const releaseVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
if (!releaseVersion.test(version || '')) throw new Error('Expected an Obsidian version in X.Y.Z format');
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
if (!releaseVersion.test(manifest.minAppVersion)) throw new Error('Invalid minAppVersion');
if (Object.hasOwn(versions, version) && versions[version] !== manifest.minAppVersion) {
  throw new Error('Existing version compatibility must not be overwritten');
}
manifest.version = version;
versions[version] = manifest.minAppVersion;
writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
writeFileSync('versions.json', JSON.stringify(versions, null, 2) + '\n');
