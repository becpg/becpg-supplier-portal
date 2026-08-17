/**
 * Regenerates THIRD-PARTY-LICENSES.md from the installed dependency tree.
 *
 * The LGPL requires the licences of what we redistribute to travel with the
 * distribution, and the Docker image ships node_modules. Run `npm ci` first:
 * the file describes what is installed, not what package.json asks for.
 *
 * Usage: npm run licenses
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NODE_MODULES = join(ROOT, 'node_modules');
const OUTPUT = join(ROOT, 'THIRD-PARTY-LICENSES.md');
const UNKNOWN_LICENSE = 'UNKNOWN';

/**
 * Every package directory under node_modules, scoped packages included.
 *
 * @returns {string[]} absolute paths, one per installed package
 */
function packageDirectories() {
    const directories = [];
    for (const entry of readdirSync(NODE_MODULES)) {
        if (entry.startsWith('.')) {
            continue;
        }
        const path = join(NODE_MODULES, entry);
        if (!statSync(path).isDirectory()) {
            continue;
        }
        if (entry.startsWith('@')) {
            directories.push(...readdirSync(path).map((scoped) => join(path, scoped)));
        } else {
            directories.push(path);
        }
    }
    return directories;
}

/**
 * The SPDX expression declared by a package, whichever of the two historical
 * shapes it uses.
 *
 * @param {object} manifest parsed package.json
 * @returns {string} an SPDX expression, or UNKNOWN when the package declares none
 */
function licenseOf(manifest) {
    if (typeof manifest.license === 'string') {
        return manifest.license;
    }
    if (manifest.license?.type) {
        return manifest.license.type;
    }
    if (Array.isArray(manifest.licenses)) {
        return manifest.licenses.map((entry) => entry.type ?? entry).join(' OR ');
    }
    return UNKNOWN_LICENSE;
}

/**
 * @param {object} manifest parsed package.json
 * @returns {string} the project URL, or an empty string
 */
function homepageOf(manifest) {
    if (manifest.homepage) {
        return manifest.homepage;
    }
    const url = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
    return url ? url.replace(/^git\+/, '').replace(/\.git$/, '') : '';
}

/**
 * @returns {{name: string, version: string, license: string, homepage: string}[]}
 *          one entry per installed package, sorted by license then name
 */
function collect() {
    const entries = [];
    for (const directory of packageDirectories()) {
        let manifest;
        try {
            manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
        } catch {
            continue;
        }
        if (!manifest.name || !manifest.version) {
            continue;
        }
        entries.push({
            name: manifest.name,
            version: manifest.version,
            license: licenseOf(manifest),
            homepage: homepageOf(manifest)
        });
    }
    return entries.sort((a, b) => a.license.localeCompare(b.license) || a.name.localeCompare(b.name));
}

function render(entries) {
    const byLicense = new Map();
    for (const entry of entries) {
        byLicense.set(entry.license, (byLicense.get(entry.license) ?? 0) + 1);
    }
    const summary = [...byLicense.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([license, count]) => `| ${license} | ${count} |`)
        .join('\n');
    const lines = entries
        .map((entry) => `     (${entry.license}) ${entry.name}:${entry.version}${entry.homepage ? ` - ${entry.homepage}` : ''}`)
        .join('\n');

    return `# Third-Party Open Source Licenses

The beCPG Supplier Portal is distributed under the LGPL-3.0-or-later (see LICENSE). It
redistributes the npm packages listed below, each under its own license.

Regenerate with \`npm ci && npm run licenses\`.

| License | Packages |
|---|---|
${summary}

\`\`\`text

${lines}

\`\`\`

The archived V1 portal under \`legacy/\` derives from the Alfresco ADF application template,
Copyright (c) 2017 Denys Vuika, distributed under the MIT License. It is kept for reference
only, is never built and is never imported by the portal.
`;
}

const entries = collect();
writeFileSync(OUTPUT, render(entries), 'utf8');
console.log(`Wrote ${OUTPUT} — ${entries.length} packages`);
