'use client';

/**
 * **Le corps d'une suggestion, rendu selon ce que becpg-ai a réellement envoyé.**
 *
 * `Suggestion.description` n'est pas de la prose : chaque plugin y met la forme
 * qui lui convient, et le client officiel de becpg-ai
 * (`becpg-ai/src/main/frontend/components/Suggestions.js`) les distingue une à
 * une. Le portail les aplatissait toutes en une phrase — 4 ko d'analyse
 * réglementaire réduits à un paragraphe tronqué, un tableau de nutriments rendu
 * en `nom : valeur · nom : valeur` — ce qui donnait ces fiches illisibles.
 *
 * | Type / famille | Contenu de `description` | Rendu |
 * |---|---|---|
 * | `DocumentReview`, `RegulatoryToxSummary` | HTML (gabarits FreeMarker de becpg-ai) | texte enrichi |
 * | famille `DocumentExtraction` | JSON `[{name, value, confidence}]` | tableau nom / valeur |
 * | `I18n` | `clé : valeur ; clé : valeur` | une ligne par langue |
 * | `SpellCheck` | JSON `[{value, state, order}]` | phrase, corrections mises en évidence |
 * | `CreationPlan` | — (les entités sont dans `plan`) | liste des créations |
 * | `Image` | — (base64 dans `suggestedChanges`) | vignette |
 * | tout le reste | texte, parfois du HTML | texte |
 *
 * **Le HTML n'est jamais injecté tel quel.** becpg-ai est un service interne,
 * mais il rend ce qu'un modèle a écrit à partir d'un document que le fournisseur
 * a lui-même déposé : c'est une entrée non maîtrisée jusqu'au bout de la chaîne.
 * `RichText` en extrait les paragraphes et les puces, sans `dangerouslySetInnerHTML`.
 */

import { RichText } from '@/components/ui/RichText';
import { Icon } from '@/components/ui/Button';

/** Types dont la description est du HTML produit par un gabarit de becpg-ai. */
const HTML_TYPES = new Set(['DocumentReview', 'RegulatoryToxSummary']);

/**
 * Types dont le corps mérite plus que la largeur du panneau : une analyse
 * rédigée, pas trois valeurs. Le panneau leur propose « Agrandir ».
 */
export const WIDE_TYPES = new Set(['DocumentReview', 'RegulatoryToxSummary', 'RecipeImprovement']);

/**
 * Cette suggestion peut-elle être **appliquée** ?
 *
 * Toutes ne le peuvent pas, et c'est normal : becpg-ai renvoie sous le même
 * enveloppe des propositions de valeurs — un nutriment lu dans une fiche — et
 * des **analyses** : l'examen d'un certificat, une synthèse réglementaire, une
 * suggestion d'amélioration de recette. Les secondes n'ont rien à écrire ; elles
 * se lisent.
 *
 * `applySuggestion` côté beCPG prend un `RemoteEntity` à fusionner, ou un `plan`
 * d'entités à créer. Sans l'un ni l'autre, le bouton « Appliquer » postait
 * `{ suggestedChanges: null }` : rien ne se passait, et la carte passait quand
 * même à « appliqué ». Un bouton qui ne fait rien est pire qu'un bouton absent —
 * il fait croire que la valeur est posée.
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
    // `changes` est la mise à plat de `suggestedChanges` : non vide, il y a
    // quelque chose à écrire ; vide, l'enveloppe l'était aussi.
    return Array.isArray(suggestion.changes) && suggestion.changes.length > 0;
}

/**
 * Le corps rend-il déjà, à lui seul, ce que la suggestion propose ?
 *
 * Quand c'est le cas, la carte n'affiche PAS en plus la liste brute des
 * changements : les deux disaient la même chose, l'une en clair — « Sel :
 * 0.008 g » — l'autre en qnames — « bcpg:nutList · nutListValue : 0.008 ».
 * Dans une colonne étroite, la répétition chassait le reste hors de l'écran.
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
 * Le corps est-il de ceux qu'on ne peut pas lire dans une colonne étroite ?
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
    // Un HTML non déclaré : le même besoin de place, sans le type pour le dire.
    return raw.trim().startsWith('<') && raw.includes('>');
}

/** Une valeur lisible, quelle que soit la forme que le plugin lui a donnée. */
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
 * Le tableau d'une extraction de document : ce que l'IA a lu, champ par champ.
 *
 * @param {Object[]} rows
 */
function ExtractionRows({ rows }) {
    return (
        <ul className="mt-1.5 flex flex-col gap-0.5">
            {rows.map((row, index) => (
                <li
                    key={`${row.name}-${index}`}
                    className="flex flex-wrap items-baseline gap-x-2 rounded-lg bg-[var(--becpg-grey)]/40 px-2 py-1 text-sm"
                >
                    <span className="min-w-0 flex-1 truncate text-[var(--becpg-dark-grey)]">
                        {plain(row.name)}
                    </span>
                    <span className="font-medium text-[var(--becpg-blue)]">{plain(row.value)}</span>
                </li>
            ))}
        </ul>
    );
}

/**
 * Une ligne par langue, pour une proposition de traduction.
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
 * La phrase corrigée, les mots repris mis en évidence.
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
 * Les entités qu'un plan propose de créer, dans l'ordre.
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
 * Le corps d'une suggestion.
 *
 * @param {Object} props
 * @param {Object} props.suggestion la suggestion normalisée
 * @param {boolean} [props.compact] rendu dans le panneau étroit : on borne les listes
 * @param {string} [props.className]
 */
export function SuggestionBody({ suggestion, compact = false, className = '' }) {
    const raw = String(suggestion.rawDescription || '');
    const trimmed = raw.trim();

    // Une image : becpg-ai la range en base64 dans les changements proposés.
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

    // Les charges utiles JSON, dans l'ordre où becpg-ai les distingue.
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
                const shown = compact ? named.slice(0, 6) : named;
                return (
                    <div className={className}>
                        <ExtractionRows
                            rows={shown.map((row) => ({
                                name: row.name ?? row.label ?? '',
                                value: row.value ?? row.val ?? '',
                            }))}
                        />
                        {shown.length < named.length ? (
                            <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">
                                {`+ ${named.length - shown.length}`}
                            </p>
                        ) : null}
                    </div>
                );
            }
        }
    }

    if (suggestion.type === 'I18n') {
        return <div className={className}><I18nRows description={raw} /></div>;
    }

    // Du HTML — déclaré par le type, ou reconnu à sa forme.
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
