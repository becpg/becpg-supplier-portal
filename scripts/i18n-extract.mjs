#!/usr/bin/env node
/**
 * The portal's translation source, and what each language still lacks.
 *
 * Every label table is declared inline with `defineLabels('<namespace>', { fr, en })`
 * (see lib/i18n.js), and the chrome strings live in `config/messages.js`. This
 * script reads them all — parsing the source, never running it — and:
 *
 *   npm run i18n:extract              writes the French and English source to
 *                                     `out/i18n-source.json`, the input of a translation pass
 *   npm run i18n:extract -- --check   compares every `config/locales/<lang>.js` with the
 *                                     source and lists what is missing or stale; exits 1
 *                                     when a key is missing, so it can gate a build
 *
 * A namespace or key a language lacks still renders — in English — so a
 * missing translation is a gap to fill, never a broken screen.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from '@babel/parser';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRS = ['app', 'components', 'lib', 'config'];
const LOCALES_DIR = join(ROOT, 'config', 'locales');
const OUTPUT = join(ROOT, 'out', 'i18n-source.json');
const MESSAGES_FILE = 'config/messages.js';
const MESSAGES_NAMESPACE = 'config/messages#messages';
const TRANSLATED_LANGS = ['de', 'es', 'it', 'pt_BR', 'sv_SE', 'fi', 'tr', 'ja_JP', 'zh_CN', 'ar'];

/** Every `.js` file under the source directories, the generated locales aside. */
function sourceFiles(dir) {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            return full === LOCALES_DIR ? [] : sourceFiles(full);
        }
        return name.endsWith('.js') ? [full] : [];
    });
}

/**
 * The value of a literal node: strings, numbers, booleans, objects and arrays
 * of those. Anything computed is reported and skipped — a translation file can
 * only hold data.
 */
function literal(node, where, problems) {
    switch (node.type) {
        case 'StringLiteral':
        case 'NumericLiteral':
        case 'BooleanLiteral':
            return node.value;
        case 'NullLiteral':
            return null;
        case 'TemplateLiteral':
            if (node.expressions.length === 0) {
                return node.quasis.map((quasi) => quasi.value.cooked).join('');
            }
            break;
        case 'ObjectExpression': {
            const result = {};
            for (const property of node.properties) {
                const key = property.key?.name ?? property.key?.value;
                if (property.type !== 'ObjectProperty' || key === undefined) {
                    problems.push(`${where}: unsupported property`);
                    continue;
                }
                const value = literal(property.value, `${where}.${key}`, problems);
                if (value !== undefined) {
                    result[key] = value;
                }
            }
            return result;
        }
        case 'BinaryExpression':
            // A long sentence split over lines: 'first half ' + 'second half'.
            if (node.operator === '+') {
                const left = literal(node.left, where, problems);
                const right = literal(node.right, where, problems);
                if (typeof left === 'string' && typeof right === 'string') {
                    return left + right;
                }
            }
            break;
        case 'ArrayExpression':
            return node.elements.map((element, index) => literal(element, `${where}[${index}]`, problems));
        default:
            break;
    }
    problems.push(`${where}: computed value (${node.type}) left out`);
    return undefined;
}

/** `{ fr, en }` of a table literal. */
function table(node, where, problems) {
    const value = literal(node, where, problems) || {};
    return { fr: value.fr, en: value.en };
}

/** Walks every node of a parsed file. */
function walk(node, visit) {
    if (!node || typeof node.type !== 'string') {
        return;
    }
    visit(node);
    for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) {
            child.forEach((item) => walk(item, visit));
        }
        else if (child && typeof child.type === 'string') {
            walk(child, visit);
        }
    }
}

/** namespace → { fr, en }, plus what could not be read. */
function extract() {
    const catalogue = {};
    const problems = [];
    for (const file of SOURCE_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir)))) {
        const rel = relative(ROOT, file);
        const ast = parse(readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
        walk(ast.program, (node) => {
            if (node.type === 'CallExpression' && node.callee.name === 'defineLabels') {
                const [name, value] = node.arguments;
                if (name?.type !== 'StringLiteral' || value?.type !== 'ObjectExpression') {
                    problems.push(`${rel}: defineLabels without a literal namespace and table`);
                    return;
                }
                catalogue[name.value] = table(value, name.value, problems);
            }
            if (rel === MESSAGES_FILE && node.type === 'VariableDeclarator' && node.id.name === 'messages') {
                catalogue[MESSAGES_NAMESPACE] = table(node.init, MESSAGES_NAMESPACE, problems);
            }
        });
    }
    return { catalogue, problems };
}

/** `{count}`, `{date}`… of a sentence, sorted: a translation must carry the same. */
function placeholders(text) {
    return (String(text).match(/\{\w+\}/g) || []).sort().join(',');
}

/** The string at a dotted path. */
function at(value, path) {
    if (!path) {
        return value;
    }
    return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), value);
}

/** Keys that name things rather than say them: copied, never translated. */
const VERBATIM_KEYS = new Set(['id', 'icon', 'href', 'value', 'tone']);

/**
 * Where a translation's shape departs from the source: an array turned into an
 * object, a sentence into a list, or a verbatim key (`id`, `href`…) rewritten —
 * any of which `pickLabels` would silently paper over with English.
 */
function shapeProblems(source, translated, path = '') {
    if (translated === undefined) {
        return [];
    }
    if (Array.isArray(source) !== Array.isArray(translated) || typeof source !== typeof translated) {
        return [`${path || '(root)'}: shape differs`];
    }
    if (!source || typeof source !== 'object') {
        const key = path.split('.').pop();
        return VERBATIM_KEYS.has(key) && source !== translated ? [`${path}: must stay ${JSON.stringify(source)}`] : [];
    }
    if (Array.isArray(source) && source.length !== translated.length) {
        return [`${path}: ${translated.length} entries instead of ${source.length}`];
    }
    return Object.keys(source).flatMap((key) => shapeProblems(source[key], translated[key], path ? `${path}.${key}` : key));
}

/** Dotted paths of every string leaf. */
function leaves(value, prefix = '') {
    if (typeof value === 'string') {
        return [prefix];
    }
    if (!value || typeof value !== 'object') {
        return [];
    }
    return Object.entries(value).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key));
}

async function check(catalogue) {
    let missingTotal = 0;
    for (const lang of TRANSLATED_LANGS) {
        let dictionary = {};
        try {
            dictionary = (await import(pathToFileURL(join(LOCALES_DIR, `${lang}.js`)).href)).default;
        }
        catch {
            console.log(`${lang}: no config/locales/${lang}.js`);
        }
        let missing = 0;
        let stale = 0;
        for (const [namespace, { en }] of Object.entries(catalogue)) {
            const translated = new Set(leaves(dictionary[namespace]));
            const expected = leaves(en);
            missing += expected.filter((path) => !translated.has(path)).length;
            for (const problem of shapeProblems(en, dictionary[namespace])) {
                missing += 1;
                console.log(`${lang}: ${namespace} ${problem}`);
            }
            for (const path of expected.filter((leaf) => translated.has(leaf))) {
                if (placeholders(at(en, path)) !== placeholders(at(dictionary[namespace], path))) {
                    missing += 1;
                    console.log(`${lang}: ${namespace} ${path}: placeholders differ`);
                }
            }
            const known = new Set(expected);
            stale += [...translated].filter((path) => !known.has(path)).length;
        }
        stale += Object.keys(dictionary).filter((namespace) => !catalogue[namespace]).length;
        missingTotal += missing;
        console.log(`${lang}: ${missing} missing, ${stale} stale`);
    }
    return missingTotal;
}

const { catalogue, problems } = extract();
problems.forEach((problem) => console.warn(`warning: ${problem}`));
console.log(`${Object.keys(catalogue).length} namespaces, ${Object.values(catalogue).reduce((n, t) => n + leaves(t.en).length, 0)} English strings`);

if (process.argv.includes('--check')) {
    process.exit((await check(catalogue)) > 0 ? 1 : 0);
}
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(catalogue, null, 2)}\n`);
console.log(`written ${relative(ROOT, OUTPUT)}`);
