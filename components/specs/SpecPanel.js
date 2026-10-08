'use client';

/**
 * The applicable *cahiers des charges* (`bcpg:productSpecification`).
 *
 * Read-only, always: a specification is the customer's contract text, and the
 * portal exposes no write path on it (spec §4.5 F9). What it must do instead is
 * make it **reachable at the moment it is needed** — which is why the same
 * component serves two very different surfaces:
 *
 *   - `/specs`, the full list, `variant="list"` — searchable, downloadable;
 *   - the wizard's permanent side panel, "Étape 0 · Contexte" (spec §4.4),
 *     `variant="panel"` — narrow, collapsed to the essentials, so the supplier
 *     can check what is being asked of him without leaving his form.
 *
 * Files stream through the portal proxy (`/api/v1/becpg/api/node/content/…`):
 * the Alfresco ticket never reaches the browser (AGENTS.md rule 5), and the
 * link is a plain same-origin `<a download>` — no blob round trip, so a 40 MB
 * PDF costs no memory.
 */

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { apiUrl } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { Button, Icon } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Field';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/specs/SpecPanel#LABELS', {
    fr: {
        title: 'Cahiers des charges',
        subtitle: 'Documents de référence applicables à vos produits',
        consult: 'Consulter',
        open: 'Ouvrir',
        download: 'Télécharger',
        appliesTo: 'S’applique à',
        andOthers: 'et {count} autre(s)',
        updated: 'Mis à jour le {date}',
        search: 'Rechercher un cahier des charges',
        none: 'Aucun cahier des charges',
        noneHint:
            'Aucun cahier des charges n’est associé à ce périmètre. Le client vous en communiquera un s’il en applique un.',
        noResult: 'Aucun cahier des charges ne correspond à cette recherche',
        count: '{count} document(s)',
        readFirst: 'À lire avant de saisir',
        unreadable: '{count} cahier(s) des charges appliqué(s) à vos produits ne sont pas accessibles avec votre compte. Demandez l’accès à votre client.',
    },
    en: {
        title: 'Specifications',
        subtitle: 'Reference documents applicable to your products',
        consult: 'View',
        open: 'Open',
        download: 'Download',
        appliesTo: 'Applies to',
        andOthers: 'and {count} more',
        updated: 'Updated on {date}',
        search: 'Search a specification',
        none: 'No specification',
        noneHint:
            'No specification is attached to this scope. The customer will share one if any applies.',
        noResult: 'No specification matches this search',
        count: '{count} document(s)',
        readFirst: 'Read before filling in',
        unreadable: '{count} specification(s) apply to your products but your account cannot open them. Ask your customer for access.',
    },
});

function labelsFor(lang) {
    return pickLabels(LABELS, lang);
}

function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/**
 * Resolves a spec's content URL through the portal (adds the `/t/<tenant>`
 * prefix when the portal is served under a tenant path).
 *
 * @param {Object} specification
 * @returns {string|null}
 */
function contentHref(specification) {
    return specification && specification.downloadUrl ? apiUrl(specification.downloadUrl) : null;
}

/**
 * One specification.
 *
 * @param {Object} props
 * @param {Object} props.specification
 * @param {'list'|'panel'} props.variant
 * @param {number} [props.index]
 */
function SpecRow({ specification, variant, index = 0 }) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);
    const reduceMotion = useReducedMotion();
    const href = contentHref(specification);
    const panel = variant === 'panel';

    const appliesTo = specification.appliesTo || [];
    const title = specification.title || specification.name || '—';

    return (
        <motion.li
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(index, 10) * 0.04 }}
            /*
             * In a panel this row is ALREADY inside a card, itself inside a
             * collapsible section: a border here made three nested boxes for one
             * specification. Embedded, it is a plain row on a hairline; standing
             * on its own page it keeps its card.
             */
            className={
                panel
                    ? 'border-b border-[var(--becpg-grey)] py-2.5 first:pt-0 last:border-b-0 last:pb-0'
                    : 'rounded-xl border border-[var(--becpg-grey)] bg-white p-3 sm:p-4'
            }
        >
            <div className="flex items-start gap-2.5">
                {/* The section header already carries this glyph, once, for the
                    whole list — repeating it per row is a plate that names
                    nothing. */}
                {panel ? null : (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]">
                        <Icon name="menu_book" size={18} />
                    </span>
                )}

                <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium leading-snug">{title}</p>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {specification.code ? (
                            <span className="pill pill-info pill-no-dot pill-sm">
                                <Icon name="tag" size={12} />
                                <span className="tabular-nums">{specification.code}</span>
                            </span>
                        ) : null}
                        {specification.state ? (
                            <StatusPill status={specification.state} size="sm" />
                        ) : null}
                        {specification.modified ? (
                            <span className="text-xs text-[var(--becpg-dark-grey)]">
                                {fill(labels.updated, { date: formatDate(specification.modified, lang) })}
                            </span>
                        ) : null}
                    </div>

                    {!panel && specification.description ? (
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--becpg-dark-grey)]">
                            {specification.description}
                        </p>
                    ) : null}

                    {appliesTo.length > 0 ? (
                        <p className="mt-1.5 text-xs text-[var(--becpg-dark-grey)]">
                            <span className="font-medium">{labels.appliesTo} : </span>
                            {appliesTo
                                .slice(0, 3)
                                .map((entity) => entity.name || entity.code || entity.nodeRef)
                                .join(', ')}
                            {appliesTo.length > 3
                                ? ` — ${fill(labels.andOthers, { count: appliesTo.length - 3 })}`
                                : ''}
                        </p>
                    ) : null}

                    {/* One wrapping row, not two stacked ones: on the 320px
                        context panel, three actions on three lines were taller
                        than the specification they act on. */}
                    <div className="mt-2 flex flex-wrap gap-2">
                        {/*
                         * The cahier des charges as an *entity*: its properties and
                         * the documents deposited under its `SupplierDocuments`.
                         * A specification is a `bcpg:entityV2`, so the ordinary
                         * entity sheet reads it — and, having no assigned task on
                         * it, the supplier gets it read-only from the server's own
                         * security check rather than from a flag set here.
                         *
                         * This is the consultation half of the feature; the file
                         * download beside it only exists when the node carries
                         * content, which a specification need not.
                         */}
                        {specification.uuid ? (
                            <Button
                                variant="outline"
                                size="sm"
                                icon="menu_book"
                                href={`/products/${specification.uuid}`}
                            >
                                {labels.consult}
                            </Button>
                        ) : null}
                        {href ? (
                            <Button
                                variant="outline"
                                size="sm"
                                icon="open_in_new"
                                href={href}
                                external
                            >
                                {labels.open}
                            </Button>
                        ) : null}
                        {/* A real `download` anchor: same-origin, the cookie
                            authenticates it, nothing is buffered client-side. */}
                        {href ? (
                            <a
                                href={href}
                                download
                                className="inline-flex min-h-[32px] touch-target items-center justify-center gap-1.5 rounded-md border border-transparent bg-[var(--becpg-grey)] px-2.5 py-1.5 text-xs font-medium text-[var(--becpg-blue)] transition-colors hover:bg-[var(--becpg-blue-lighter)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2"
                            >
                                <Icon name="download" size={16} />
                                <span>{labels.download}</span>
                            </a>
                        ) : null}
                    </div>
                </div>
            </div>
        </motion.li>
    );
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.specifications rows of `GET /api/v1/entities/{id}/specs`,
 *        optionally enriched with `appliesTo: [{nodeRef, name, code}]` by the caller
 * @param {'list'|'panel'} [props.variant='list']
 * @param {boolean} [props.loading]
 * @param {Error} [props.error]
 * @param {Function} [props.onRetry]
 * @param {React.ReactNode} [props.title] panel heading; `null` hides it
 * @param {React.ReactNode} [props.subtitle]
 * @param {boolean} [props.searchable] renders the search box (defaults to `variant === 'list'`)
 * @param {React.ReactNode} [props.emptyMessage]
 * @param {number} [props.unreadable=0] specifications the account may not open —
 *        the API counts them rather than dropping them silently
 * @param {React.ReactNode} [props.footer]
 */
export function SpecPanel({
    specifications,
    unreadable = 0,
    variant = 'list',
    loading = false,
    error = null,
    onRetry,
    title,
    subtitle,
    searchable,
    emptyMessage,
    footer,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);
    const [query, setQuery] = useState('');

    const panel = variant === 'panel';
    const withSearch = searchable === undefined ? !panel : searchable;

    const list = useMemo(() => {
        const entries = Array.isArray(specifications) ? specifications : [];
        const term = query.trim().toLowerCase();
        const filtered = term
            ? entries.filter((entry) =>
                  [entry.title, entry.name, entry.code, entry.description]
                      .filter(Boolean)
                      .some((value) => String(value).toLowerCase().includes(term)),
              )
            : entries;
        return [...filtered].sort((a, b) =>
            String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')),
        );
    }, [specifications, query]);

    const heading =
        title === null ? null : (
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h2 className={panel ? 'text-sm font-medium' : 'text-base font-medium sm:text-lg'}>
                        {title || labels.title}
                    </h2>
                    <p className="text-xs text-[var(--becpg-dark-grey)]">
                        {subtitle === undefined ? (panel ? labels.readFirst : labels.subtitle) : subtitle}
                    </p>
                </div>
                {!loading && !error && (specifications || []).length > 0 ? (
                    <span className="pill pill-neutral pill-no-dot pill-sm shrink-0">
                        {fill(labels.count, { count: (specifications || []).length })}
                    </span>
                ) : null}
            </div>
        );

    let body;
    if (error) {
        body = <ErrorState error={error} onRetry={onRetry} compact={panel} />;
    }
    else if (loading) {
        body = <SkeletonList rows={panel ? 2 : 4} />;
    }
    else if (list.length === 0) {
        /*
         * "None" and "none you may read" are two different answers, and the
         * second one is what a supplier actually hits: the association names a
         * specification whose own ACL refuses the account, so the list came back
         * empty and the screen blamed the customer for applying nothing.
         */
        body = (
            <EmptyState
                variant={query ? 'search' : 'empty'}
                icon="menu_book"
                title={query ? labels.noResult : labels.none}
                message={query
                    ? undefined
                    : (unreadable > 0
                        ? fill(labels.unreadable, { count: unreadable })
                        : emptyMessage || labels.noneHint)}
                compact={panel}
            />
        );
    }
    else {
        body = (
            <ul className={`flex list-none flex-col p-0 ${panel ? '' : 'gap-2'}`}>
                {list.map((specification, index) => (
                    <SpecRow
                        key={specification.nodeRef || specification.uuid || index}
                        specification={specification}
                        variant={variant}
                        index={index}
                    />
                ))}
            </ul>
        );
    }

    const content = (
        <>
            {heading}
            {withSearch && !loading && !error && (specifications || []).length > 3 ? (
                <div className="mb-3">
                    <SearchInput value={query} onChange={setQuery} placeholder={labels.search} />
                </div>
            ) : null}
            {body}
            {footer ? <div className="mt-3">{footer}</div> : null}
        </>
    );

    /*
     * `panel` is the EMBEDDED shape — today the wizard's context panel, which is
     * already a card. It used to wrap itself in one more, so a specification sat
     * three boxes deep: context card, section, spec card, spec row. It carries no
     * surface of its own any more.
     */
    return <div className={className}>{content}</div>;
}
