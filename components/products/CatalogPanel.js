'use client';

/**
 * Compliance catalogues — *"il me manque quoi, exactement ?"*
 *
 * A catalogue (`becpg/entity/catalog/node/…`) is beCPG's own definition of what
 * a complete product sheet is for a given audience: quality, regulatory, RSE…
 * Each one carries a completion score, the list of fields it is missing, the
 * fields whose value collides with another entity, and a colour chosen by the
 * client. The portal renders exactly that — it computes no score of its own.
 *
 * Two places use this panel, which is why it is self-contained and takes only
 * `{ catalogs, onFieldClick }`:
 *
 *   - `/products/[id]`, as the "Conformité" section, read-only;
 *   - the wizard's "Étape n+1 · Conformité" (spec §4.4), where `onFieldClick`
 *     jumps to the step holding the missing field — which is what makes the
 *     list actionable rather than a report.
 *
 * Colour is never the only signal: a catalogue's colour is a *client* label, so
 * completion is always also written as a number and a bar, and an incomplete
 * catalogue also carries an icon and a word.
 */

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useMessages } from '@/lib/messages';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Gauge, GaugeBar, toneForValue } from '@/components/ui/Gauge';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';

const LABELS = {
    fr: {
        title: 'Conformité',
        overall: 'Complétude',
        complete: 'Complet',
        incomplete: 'Incomplet',
        missing: 'Champs manquants',
        missingCount: '{count} champ(s) manquant(s)',
        duplicates: 'Valeurs déjà utilisées',
        duplicateOn: 'Déjà utilisé par',
        protectedFields: '{count} champ(s) verrouillé(s) par le client',
        none: 'Aucun catalogue applicable',
        noneHint:
            'Aucun catalogue de conformité n’est configuré pour ce produit. Il n’y a donc pas de contrôle de complétude à passer.',
        allComplete: 'Tous les catalogues sont complets',
        allCompleteHint: 'Rien ne bloque la validation de ce produit côté données.',
        missingHint:
            'Complétez les champs ci-dessous pour atteindre 100 % : ce sont eux qui bloquent la validation.',
        goToField: 'Aller au champ',
        notScored: 'Non évalué',
        updated: 'Mis à jour',
    },
    en: {
        title: 'Compliance',
        overall: 'Completion',
        complete: 'Complete',
        incomplete: 'Incomplete',
        missing: 'Missing fields',
        missingCount: '{count} missing field(s)',
        duplicates: 'Values already in use',
        duplicateOn: 'Already used by',
        protectedFields: '{count} field(s) locked by the customer',
        none: 'No applicable catalogue',
        noneHint:
            'No compliance catalogue is configured for this product, so there is no completeness check to pass.',
        allComplete: 'Every catalogue is complete',
        allCompleteHint: 'Nothing blocks the validation of this product on the data side.',
        missingHint:
            'Fill in the fields below to reach 100 % — they are the ones holding the validation back.',
        goToField: 'Go to the field',
        notScored: 'Not scored',
        updated: 'Updated',
    },
};

function labelsFor(lang) {
    return LABELS[lang] || LABELS.fr;
}

function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/**
 * React key of a catalogue row.
 *
 * Not `catalog.id`: `/entities/{id}/catalogs` returns one row **per report
 * locale**, all sharing the catalogue id and differing by `locale` and by the
 * fields they report missing — two real rows, one id. Keying on the id alone is
 * what produced `Encountered two children with the same key, 'incoRawMaterials'`.
 * `(id, locale)` is unique by construction: the adapter de-duplicates on exactly
 * that pair (`dedupeCatalogs` in lib/adapters/entities.js), so no index
 * fallback is needed and none is used — an index key here would silently
 * survive a real duplicate instead of the adapter dropping it.
 *
 * @param {Object} catalog
 * @returns {string}
 */
function rowKey(catalog) {
    return `${catalog.id || catalog.label || ''}::${catalog.locale || ''}`;
}

/**
 * The label a missing field is shown with. beCPG sends the dictionary label; the
 * qname is the fallback so a field is never rendered as an empty chip.
 *
 * @param {Object} field `{ field, label, locale }`
 * @returns {string}
 */
function fieldLabel(field) {
    if (!field) {
        return '—';
    }
    const base = field.label || field.field || '—';
    return field.locale ? `${base} (${String(field.locale).toUpperCase()})` : base;
}

/**
 * A missing field. Becomes a button — the way to the field — as soon as the
 * caller knows how to navigate there.
 */
function MissingField({ field, onFieldClick, catalog, label }) {
    const content = (
        <>
            <Icon name="error_outline" size={13} />
            <span className="min-w-0 break-words text-left">{fieldLabel(field)}</span>
            {onFieldClick ? <Icon name="arrow_forward" size={13} className="opacity-60" /> : null}
        </>
    );

    const classes = [
        'inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs',
        'bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
        onFieldClick
            ? 'cursor-pointer hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]'
            : '',
    ]
        .filter(Boolean)
        .join(' ');

    if (!onFieldClick) {
        return <span className={classes}>{content}</span>;
    }
    return (
        <button
            type="button"
            className={classes}
            title={label}
            onClick={() => onFieldClick(field, catalog)}
        >
            {content}
        </button>
    );
}

/**
 * One catalogue.
 *
 * @param {Object} props
 * @param {Object} props.catalog normalised catalogue from `/entities/{id}/catalogs`
 * @param {Function} [props.onFieldClick] `(field, catalog) => void`
 * @param {boolean} [props.compact] side-panel rendering
 * @param {number} [props.index] stagger position
 */
function CatalogCard({ catalog, onFieldClick, compact = false, index = 0 }) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);
    const reduceMotion = useReducedMotion();

    const missing = catalog.missingFields || [];
    const nonUnique = catalog.nonUniqueFields || [];
    const protectedCount = (catalog.protectedFields || []).length;
    const scored = typeof catalog.score === 'number' && !Number.isNaN(catalog.score);
    // The client's colour drives the rail; the tone (and therefore the bar) stays
    // derived from the score, so the meaning survives an exotic palette.
    const rail = catalog.color || (scored ? null : 'var(--becpg-dark-grey)');

    return (
        <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.05, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-xl border border-[var(--becpg-grey)] bg-white"
        >
            <span
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ background: rail || `var(--status-${toneForValue(catalog.score || 0)})` }}
                aria-hidden="true"
            />
            <div className={`pl-4 ${compact ? 'p-3' : 'p-4'}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="break-words text-sm font-medium">{catalog.label || catalog.id}</h3>
                        {catalog.locale ? (
                            <p className="text-xs text-[var(--becpg-dark-grey)]">
                                {String(catalog.locale).toUpperCase()}
                            </p>
                        ) : null}
                    </div>
                    <span
                        className={`pill pill-no-dot pill-sm ${
                            catalog.isComplete ? 'pill-ok' : 'pill-warn'
                        }`}
                    >
                        <Icon name={catalog.isComplete ? 'check_circle' : 'pending'} size={12} />
                        <span>{catalog.isComplete ? labels.complete : labels.incomplete}</span>
                    </span>
                </div>

                <GaugeBar
                    value={scored ? catalog.score : null}
                    showValue
                    size="md"
                    className="mt-3"
                    delay={0.1 + Math.min(index, 8) * 0.05}
                    label={scored ? undefined : labels.notScored}
                    ariaLabel={`${catalog.label || catalog.id} — ${labels.overall}`}
                />

                {missing.length > 0 ? (
                    <div className="mt-3">
                        <p className="mb-1.5 text-xs font-medium text-[var(--becpg-blue)]">
                            {fill(labels.missingCount, { count: missing.length })}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {missing.map((field, position) => (
                                <MissingField
                                    key={`${field.field || 'field'}-${field.locale || ''}-${position}`}
                                    field={field}
                                    catalog={catalog}
                                    onFieldClick={onFieldClick}
                                    label={labels.goToField}
                                />
                            ))}
                        </div>
                    </div>
                ) : null}

                {nonUnique.length > 0 ? (
                    <div className="mt-3">
                        <p className="mb-1.5 text-xs font-medium text-[var(--becpg-blue)]">
                            {labels.duplicates}
                        </p>
                        <ul className="flex list-none flex-col gap-1 p-0">
                            {nonUnique.map((field, position) => (
                                <li
                                    key={`${field.field || 'dup'}-${position}`}
                                    className="rounded-lg bg-[var(--status-warn-bg)] px-2 py-1.5 text-xs text-[var(--status-warn)]"
                                >
                                    <span className="font-medium">{fieldLabel(field)}</span>
                                    {field.value ? <span> : « {field.value} »</span> : null}
                                    {Array.isArray(field.entities) && field.entities.length > 0 ? (
                                        <span className="block text-[var(--becpg-dark-grey)]">
                                            {labels.duplicateOn}{' '}
                                            {field.entities
                                                .map((entity) =>
                                                    typeof entity === 'string'
                                                        ? entity
                                                        : entity.name || entity.label || entity.nodeRef,
                                                )
                                                .filter(Boolean)
                                                .join(', ')}
                                        </span>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {protectedCount > 0 ? (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--becpg-dark-grey)]">
                        <Icon name="lock_outline" size={13} />
                        {fill(labels.protectedFields, { count: protectedCount })}
                    </p>
                ) : null}
            </div>
        </motion.section>
    );
}

/**
 * The panel.
 *
 * @param {Object} props
 * @param {Array<Object>} props.catalogs catalogues from `GET /api/v1/entities/{id}/catalogs`
 * @param {number|null} [props.score] the overall score of the payload; recomputed when absent
 * @param {Function} [props.onFieldClick] `(field, catalog) => void` — makes missing fields clickable
 * @param {boolean} [props.loading]
 * @param {Error} [props.error]
 * @param {Function} [props.onRetry]
 * @param {boolean} [props.compact] side-panel rendering (wizard)
 * @param {boolean} [props.showOverall=true] renders the headline dial
 * @param {React.ReactNode} [props.title]
 */
export function CatalogPanel({
    catalogs,
    score,
    onFieldClick,
    loading = false,
    error = null,
    onRetry,
    compact = false,
    showOverall = true,
    title,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);

    const list = useMemo(() => {
        const entries = Array.isArray(catalogs) ? catalogs : [];
        // Incomplete first, then by ascending score: the work is at the top.
        return [...entries].sort((a, b) => {
            if (Boolean(a.isComplete) !== Boolean(b.isComplete)) {
                return a.isComplete ? 1 : -1;
            }
            const scoreA = typeof a.score === 'number' ? a.score : 101;
            const scoreB = typeof b.score === 'number' ? b.score : 101;
            return scoreA - scoreB;
        });
    }, [catalogs]);

    const overall = useMemo(() => {
        if (score !== undefined && score !== null) {
            return score;
        }
        const scored = list.filter((catalog) => typeof catalog.score === 'number');
        if (scored.length === 0) {
            return null;
        }
        return Math.round(scored.reduce((sum, catalog) => sum + catalog.score, 0) / scored.length);
    }, [list, score]);

    const missingTotal = useMemo(
        () => list.reduce((sum, catalog) => sum + (catalog.missingFields || []).length, 0),
        [list],
    );

    if (error) {
        return <ErrorState error={error} onRetry={onRetry} compact={compact} />;
    }
    if (loading) {
        return (
            <div className={`flex flex-col gap-3 ${className}`}>
                <SkeletonCard lines={3} />
                <SkeletonCard lines={3} />
            </div>
        );
    }
    if (list.length === 0) {
        return (
            <EmptyState
                variant="empty"
                icon="fact_check"
                title={labels.none}
                message={labels.noneHint}
                compact={compact}
                className={className}
            />
        );
    }

    const allComplete = list.every((catalog) => catalog.isComplete);

    return (
        <div className={`flex flex-col gap-3 sm:gap-4 ${className}`}>
            {showOverall ? (
                <Card padding={compact ? 'sm' : 'md'}>
                    <div className="flex flex-wrap items-center gap-4">
                        <Gauge
                            value={overall}
                            size={compact ? 84 : 104}
                            thickness={compact ? 8 : 10}
                            label={title || labels.overall}
                        />
                        <div className="min-w-0 flex-1">
                            {allComplete ? (
                                <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--status-ok)]">
                                    <Icon name="verified" size={18} />
                                    {labels.allComplete}
                                </p>
                            ) : (
                                <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--status-warn)]">
                                    <Icon name="pending_actions" size={18} />
                                    {fill(labels.missingCount, { count: missingTotal })}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">
                                {allComplete ? labels.allCompleteHint : labels.missingHint}
                            </p>
                            <ul className="mt-2 flex list-none flex-wrap gap-1.5 p-0">
                                {list.map((catalog) => (
                                    <li
                                        key={rowKey(catalog)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--becpg-grey)]/60 px-2 py-1 text-xs"
                                        title={catalog.label || catalog.id}
                                    >
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{
                                                background:
                                                    catalog.color ||
                                                    `var(--status-${toneForValue(catalog.score || 0)})`,
                                            }}
                                            aria-hidden="true"
                                        />
                                        <span className="max-w-[10rem] truncate">
                                            {catalog.label || catalog.id}
                                        </span>
                                        <span className="tabular-nums font-medium">
                                            {typeof catalog.score === 'number'
                                                ? `${Math.round(catalog.score)}%`
                                                : '—'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            ) : null}

            {list.map((catalog, index) => (
                <CatalogCard
                    key={rowKey(catalog)}
                    catalog={catalog}
                    onFieldClick={onFieldClick}
                    compact={compact}
                    index={index}
                />
            ))}
        </div>
    );
}
