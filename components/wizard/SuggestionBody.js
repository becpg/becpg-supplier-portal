'use client';

/**
 * The body of a suggestion, rendered according to what becpg-ai actually sent.
 *
 * `Suggestion.description` is not prose: each plugin puts in it the shape that
 * suits it, and becpg-ai's own client
 * (`becpg-ai/src/main/frontend/components/Suggestions.js`) tells them apart one
 * by one. The portal flattened them all into a sentence — 4 kB of regulatory
 * analysis reduced to a truncated paragraph, a nutrient table rendered as
 * `name : value · name : value` — which is what made those cards unreadable.
 *
 * | Type / family | `description` content | Rendering |
 * |---|---|---|
 * | `DocumentReview`, `RegulatoryToxSummary` | HTML (becpg-ai FreeMarker templates) | rich text |
 * | family `DocumentExtraction` | JSON `[{name, value, confidence}]` | name / value table |
 * | `I18n` | `key : value ; key : value` | one row per language |
 * | `SpellCheck` | JSON `[{value, state, order}]` | sentence, corrections highlighted |
 * | `CreationPlan` | — (entities live in `plan`) | list of creations |
 * | `Image` | — (base64 in `suggestedChanges`) | thumbnail |
 * | everything else | text, sometimes HTML | text |
 *
 * The HTML is never injected as is. becpg-ai is an internal service, but it
 * returns what a model wrote out of a document the supplier uploaded himself:
 * it is untrusted input all the way down the chain.
 * `RichText` extracts its paragraphs and bullets, without `dangerouslySetInnerHTML`.
 */

import { useState } from 'react';
import { RichText } from '@/components/ui/RichText';
import { StatusPill } from '@/components/ui/StatusPill';
import { Icon } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';

/** How many extracted rows a narrow panel shows before it offers the rest. */
const COMPACT_ROWS = 6;

/** Types whose description is HTML produced by a becpg-ai template. */
const HTML_TYPES = new Set(['DocumentReview', 'RegulatoryToxSummary']);

/**
 * Types whose body deserves more than the panel width: a written analysis, not
 * three values. The panel offers them « Agrandir ».
 */
export const WIDE_TYPES = new Set(['DocumentReview', 'RegulatoryToxSummary', 'RecipeImprovement']);

/**
 * Can this suggestion be applied?
 *
 * Not all of them can, and that is expected: becpg-ai returns under the same
 * envelope value proposals — a nutrient read off a sheet — and analyses: the
 * review of a certificate, a regulatory summary, a recipe improvement
 * suggestion. The latter have nothing to write; they are meant to be read.
 *
 * `applySuggestion` on the beCPG side takes a `RemoteEntity` to merge, or a
 * `plan` of entities to create. With neither, the « Appliquer » button posted
 * `{ suggestedChanges: null }`: nothing happened, and the card still switched
 * to "applied". A button that does nothing is worse than a missing button —
 * it makes the user believe the value is set.
 *
 * @param {Object} suggestion
 * @returns {boolean}
 */
export function isApplicableSuggestion(suggestion) {
    if (!suggestion) {
        return false;
    }
    if (Array.isArray(suggestion.plan) && suggestion.plan.length > 0) {
        return true;
    }
    // `changes` is the flattening of `suggestedChanges`: non-empty, there is
    // something to write; empty, the envelope was empty too.
    return Array.isArray(suggestion.changes) && suggestion.changes.length > 0;
}

/**
 * Does the body already render, on its own, what the suggestion proposes?
 *
 * When it does, the card does NOT also display the raw list of changes: both
 * said the same thing, one in plain words — « Sel : 0.008 g » — the other in
 * qnames — « bcpg:nutList · nutListValue : 0.008 ».
 * In a narrow column, the repetition pushed the rest off screen.
 *
 * @param {Object} suggestion
 * @returns {boolean}
 */
export function hasTypedBody(suggestion) {
    if (!suggestion) {
        return false;
    }
    if (suggestion.type === 'Image' || suggestion.type === 'I18n' || suggestion.type === 'SpellCheck') {
        return true;
    }
    if (suggestion.type === 'CreationPlan' && Array.isArray(suggestion.plan) && suggestion.plan.length > 0) {
        return true;
    }
    const trimmed = String(suggestion.rawDescription || '').trim();
    if (trimmed === '') {
        return false;
    }
    if (HTML_TYPES.has(suggestion.type) || (trimmed.startsWith('<') && trimmed.includes('>'))) {
        return true;
    }
    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed)
                && parsed.length > 0
                && parsed.every((row) => row && typeof row === 'object')
                && parsed.some((row) => 'name' in row || 'label' in row);
        }
        catch {
            return false;
        }
    }
    return false;
}

/**
 * Is this one of the bodies that cannot be read in a narrow column?
 *
 * @param {Object} suggestion
 * @returns {boolean}
 */
export function isWideSuggestion(suggestion) {
    if (!suggestion) {
        return false;
    }
    if (WIDE_TYPES.has(suggestion.type)) {
        return true;
    }
    const raw = String(suggestion.rawDescription || '');
    // Undeclared HTML: the same need for room, without the type to say so.
    return raw.trim().startsWith('<') && raw.includes('>');
}

/**
 * A date becpg-ai extracted, printed as a date.
 *
 * The extraction table showed « Valide de 2024-11-05 00:00:00 » — a timestamp,
 * in a panel a supplier reads at a glance.
 *
 * ONLY MIDNIGHT IS CONVERTED, and only the day is printed. becpg-ai sends a
 * validity window as a naked local timestamp at midnight, with no time zone
 * anywhere in the payload; a value carrying a real hour could not be placed
 * without inventing that zone, and printing an hour we cannot situate is worse
 * than printing what was sent. `toDate` anchors a bare day at noon UTC, which is
 * why the day alone is handed to it — the calendar date can then not slip either
 * side of midnight, on the server or in the browser.
 */
const MIDNIGHT_DATE = /^(\d{4}-\d{2}-\d{2})(?:[T ]00:00(?::00(?:\.0+)?)?Z?)?$/;

/**
 * The value of one extracted field, readable.
 *
 * @param {*} value
 * @param {string} lang
 * @returns {string}
 */
function readableValue(value, lang) {
    const text = plain(value);
    const day = MIDNIGHT_DATE.exec(text.trim());
    return day ? formatDate(day[1], lang) : text;
}

/** A readable value, whatever shape the plugin gave it. */
function plain(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

/**
 * The table of a document extraction: what the AI read, field by field.
 *
 * A row may carry `notApplicable` — see {@link ExtractionRow}.
 *
 * @param {Object[]} rows
 */
function ExtractionRows({ rows }) {
    return (
        <ul className="mt-1.5 flex flex-col gap-0.5">
            {rows.map((row, index) => (
                <ExtractionRow key={`${row.name}-${index}`} row={row} />
            ))}
        </ul>
    );
}

/**
 * One extracted field.
 *
 * WHAT `notApplicable` MEANS, AND WHY THE VALUE STAYS ON SCREEN.
 *
 * `{"name":"Halal","value":"certified","notApplicable":true}` — the model read
 * the item in the document and **nothing in beCPG's dictionary matched it**
 * (`AbstractListPromptTransformer.buildDisplayRows`). So the certificate really
 * does say « Halal : certified »; what is missing is the characteristic to
 * write it on.
 *
 * The value therefore stays: dropping the row would hide what the document
 * says, and a supplier comparing the panel with his own certificate would have
 * found the line missing. It is NOT struck through — the value is not wrong,
 * and striking it would say it is. It is muted, and the row says the rest in
 * words through `StatusPill`, so it reads in greyscale and to a screen reader.
 *
 * Nothing here has to guard the « Appliquer » button: becpg-ai already filters
 * these rows out of `suggestedChanges`, so they never reach `changes`.
 *
 * @param {Object} row `{ name, value, notApplicable }`
 */
function ExtractionRow({ row }) {
    const { lang } = useMessages();
    const value = readableValue(row.value, lang);

    return (
        <li
            className={`flex flex-wrap items-baseline gap-x-2 rounded-lg bg-[var(--becpg-grey)]/40 px-2 py-1 text-sm${
                row.notApplicable ? ' opacity-75' : ''
            }`}
        >
            <span className="min-w-0 flex-1 truncate text-[var(--becpg-dark-grey)]">
                {plain(row.name)}
            </span>
            {value ? (
                <span
                    className={row.notApplicable
                        ? 'text-[var(--becpg-dark-grey)]'
                        : 'font-medium text-[var(--becpg-blue)]'}
                >
                    {value}
                </span>
            ) : null}
            {row.notApplicable ? <StatusPill status="notApplicable" size="sm" /> : null}
        </li>
    );
}

/**
 * An extraction, capped in the panel and OPENABLE.
 *
 * The cap said « + 14 » in grey text and stopped there: a nutritional table read
 * off a sheet showed six values out of twenty, and the fourteen others were
 * announced and unreachable. A count is not an affordance — it is now the button
 * that shows them.
 *
 * @param {Object[]} rows
 * @param {boolean} compact
 */
function ExtractionTable({ rows, compact, className = '' }) {
    const { t } = useMessages();
    const [open, setOpen] = useState(false);

    const capped = compact && !open && rows.length > COMPACT_ROWS;
    const shown = capped ? rows.slice(0, COMPACT_ROWS) : rows;
    const hidden = rows.length - COMPACT_ROWS;

    return (
        <div className={className}>
            <ExtractionRows rows={shown} />
            {compact && rows.length > COMPACT_ROWS ? (
                <button
                    type="button"
                    onClick={() => setOpen((current) => !current)}
                    aria-expanded={open}
                    className="mt-1 inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-xs text-[var(--becpg-dark-grey)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                >
                    <Icon name={open ? 'expand_less' : 'expand_more'} size={14} />
                    {open ? t('action.showLess') : t('action.showMore', { count: hidden })}
                </button>
            ) : null}
        </div>
    );
}

/**
 * One row per language, for a translation proposal.
 *
 * @param {string} description
 */
function I18nRows({ description }) {
    const rows = description
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const separator = entry.indexOf(':');
            return separator === -1
                ? { key: '', value: entry }
                : { key: entry.slice(0, separator).trim(), value: entry.slice(separator + 1).trim() };
        });

    return (
        <ul className="mt-1.5 flex flex-col gap-0.5">
            {rows.map((row, index) => (
                <li
                    key={`${row.key}-${index}`}
                    className="flex flex-wrap items-baseline gap-x-2 rounded-lg bg-[var(--becpg-grey)]/40 px-2 py-1 text-sm"
                >
                    {row.key ? (
                        <span className="shrink-0 font-medium uppercase text-[var(--becpg-dark-grey)]">
                            {row.key}
                        </span>
                    ) : null}
                    <span className="min-w-0 flex-1 text-[var(--becpg-blue)]">{row.value}</span>
                </li>
            ))}
        </ul>
    );
}

/**
 * The corrected sentence, with the reworked words highlighted.
 *
 * @param {Object[]} words
 */
function SpellCheckText({ words }) {
    const ordered = [...words].sort((left, right) => (left.order || 0) - (right.order || 0));
    return (
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--becpg-blue)]">
            {ordered.map((word, index) => {
                const state = String(word.state || '').toLowerCase();
                const changed = state && state !== 'unchanged' && state !== 'ok';
                return (
                    <span
                        key={index}
                        className={changed
                            ? 'rounded bg-[var(--becpg-orange)]/15 px-0.5 font-medium text-[var(--becpg-blue)]'
                            : undefined}
                    >
                        {plain(word.value)}
                        {' '}
                    </span>
                );
            })}
        </p>
    );
}

/**
 * The entities a plan proposes to create, in order.
 *
 * @param {Object[]} plan
 */
function PlanRows({ plan }) {
    return (
        <ul className="mt-1.5 flex flex-col gap-0.5">
            {plan.map((entry, index) => {
                const name = entry?.name || entry?.attributes?.['cm:name'] || `#${index + 1}`;
                return (
                    <li
                        key={index}
                        className="flex items-baseline gap-2 rounded-lg bg-[var(--becpg-grey)]/40 px-2 py-1 text-sm"
                    >
                        <Icon name="add_circle_outline" size={14} className="shrink-0 text-[var(--becpg-dark-grey)]" />
                        <span className="min-w-0 flex-1 truncate font-medium text-[var(--becpg-blue)]">{name}</span>
                        {entry?.type ? (
                            <span className="shrink-0 text-xs text-[var(--becpg-dark-grey)]">{entry.type}</span>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * The body of a suggestion.
 *
 * @param {Object} props
 * @param {Object} props.suggestion the normalised suggestion
 * @param {boolean} [props.compact] rendered in the narrow panel: lists are capped
 * @param {string} [props.className]
 */
export function SuggestionBody({ suggestion, compact = false, className = '' }) {
    const raw = String(suggestion.rawDescription || '');
    const trimmed = raw.trim();

    // An image: becpg-ai stores it as base64 inside the proposed changes.
    if (suggestion.type === 'Image' && suggestion.suggestedChanges) {
        const content = suggestion.suggestedChanges?.attributes?.['cm:contains']?.[0]
            ?.attributes?.['cm:contains']?.[0]?.content;
        if (content) {
            return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={`data:image/png;base64,${content}`}
                    alt={suggestion.title || ''}
                    className={`mt-1.5 h-28 w-28 rounded-lg object-cover ${className}`}
                />
            );
        }
    }

    if (suggestion.type === 'CreationPlan' && Array.isArray(suggestion.plan) && suggestion.plan.length > 0) {
        return <div className={className}><PlanRows plan={suggestion.plan} /></div>;
    }

    if (trimmed === '') {
        return null;
    }

    // The JSON payloads, in the order becpg-ai tells them apart.
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        let parsed = null;
        try {
            parsed = JSON.parse(trimmed);
        }
        catch {
            parsed = null;
        }
        const rows = Array.isArray(parsed) ? parsed : null;
        if (rows && rows.length > 0 && rows.every((row) => row && typeof row === 'object')) {
            if (suggestion.type === 'SpellCheck' && 'state' in rows[0]) {
                return <div className={className}><SpellCheckText words={rows} /></div>;
            }
            const named = rows.filter((row) => 'name' in row || 'label' in row);
            if (named.length > 0) {
                return (
                    <ExtractionTable
                        rows={named.map((row) => ({
                            name: row.name ?? row.label ?? '',
                            value: row.value ?? row.val ?? '',
                            notApplicable: row.notApplicable === true,
                        }))}
                        compact={compact}
                        className={className}
                    />
                );
            }
        }
    }

    if (suggestion.type === 'I18n') {
        return <div className={className}><I18nRows description={raw} /></div>;
    }

    // HTML — declared by the type, or recognised by its shape.
    if (HTML_TYPES.has(suggestion.type) || (trimmed.startsWith('<') && trimmed.includes('>'))) {
        return (
            <RichText
                value={raw}
                className={`mt-1.5 flex flex-col gap-1.5 text-sm leading-relaxed text-[var(--becpg-dark-grey)] ${
                    compact ? 'line-clamp-6' : ''
                } ${className}`}
            />
        );
    }

    return (
        <p className={`mt-1.5 text-sm leading-relaxed text-[var(--becpg-dark-grey)] ${
            compact ? 'line-clamp-4' : ''
        } ${className}`}
        >
            {suggestion.description || raw}
        </p>
    );
}
