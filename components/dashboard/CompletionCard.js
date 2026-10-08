'use client';

/**
 * "État de mon dossier" — card 2 of 4: the **completion gauge** (spec §4.3).
 *
 * The percentage is not a portal invention: it is the mean of
 * `bcpg:entityScore`, the score `EntityCatalogFormulationHandler` already
 * computes for every active catalogue of every one of my entities. The card
 * therefore shows *what beCPG already knows*, and breaks it down by catalogue so
 * the supplier can see which one is holding the file back.
 *
 * Catalogue labels come from beCPG, already translated — never from
 * `config/messages.js` (hard rule 4).
 */

import Link from 'next/link';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { tonePalette, toneForValue } from '@/components/ui/Gauge';
import { CatalogMeter } from '@/components/products/CompletionMeter';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LOCAL = defineLabels('components/dashboard/CompletionCard#LOCAL', {
    fr: {
        title: 'Complétude',
        scope: '{scored} produit(s) évalué(s) sur {total}',
        noScore: 'Aucun catalogue évalué',
        noScoreHint: 'La complétude apparaîtra dès qu’un produit aura été formulé.',
        seeProducts: 'Voir mes produits',
        worst: 'Catalogues les plus incomplets',
    },
    en: {
        title: 'Completeness',
        scope: '{scored} of {total} product(s) scored',
        noScore: 'No catalogue scored yet',
        noScoreHint: 'Completeness appears as soon as a product has been formulated.',
        seeProducts: 'See my products',
        worst: 'Least complete catalogues',
    },
});

/** How many catalogue bars fit under the dial without crowding a 360px screen. */
const MAX_CATALOGS = 3;

/**
 * @param {Object} props
 * @param {{score: number|null, entityCount: number, scoredEntityCount: number,
 *          catalogs: Array<{id: string, label: string, score: number}>}|null} props.completion
 * @param {number} [props.index]
 */
export function CompletionCard({ completion, index = 0, className = '' }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);

    const score = completion && typeof completion.score === 'number' ? completion.score : null;
    const catalogs = Array.isArray(completion && completion.catalogs)
        ? completion.catalogs.slice(0, MAX_CATALOGS)
        : [];
    const total = (completion && completion.entityCount) || 0;
    const scored = (completion && completion.scoredEntityCount) || 0;

    return (
        <Card
            title={local.title}
            icon="donut_large"
            index={index}
            className={className}
        >
            <div className="flex items-center gap-4">
                <p
                    className="shrink-0 text-[2rem] font-light leading-none tabular-nums"
                    style={{ color: score === null ? undefined : tonePalette(toneForValue(score)).text }}
                >
                    {score === null ? '—' : Math.round(score)}
                    {score === null ? null : <span className="ms-0.5 text-sm font-medium">%</span>}
                </p>
                <div className="min-w-0 flex-1">
                    {score === null ? (
                        <>
                            <p className="text-sm font-medium">{local.noScore}</p>
                            <p className="mt-0.5 text-xs text-[var(--becpg-dark-grey)]">
                                {local.noScoreHint}
                            </p>
                        </>
                    ) : (
                        <p className="text-xs text-[var(--becpg-dark-grey)]">
                            {local.scope.replace('{scored}', scored).replace('{total}', total)}
                        </p>
                    )}
                    <Link
                        href="/products"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--becpg-blue-light)] hover:underline"
                    >
                        {local.seeProducts}
                        <Icon name="arrow_forward" size={13} />
                    </Link>
                </div>
            </div>

            {catalogs.length > 0 ? (
                <div className="mt-3 border-t border-[var(--becpg-line)] pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                        {local.worst}
                    </p>
                    <div className="flex flex-col gap-2">
                        {/* Keyed on `id || label`, the key the producer de-duplicates
                            on (`toCompletion`): keying on less could collide, on more
                            would split a row already merged. */}
                        {catalogs.map((catalog) => (
                            <CatalogMeter key={catalog.id || catalog.label} catalog={catalog} as="div" />
                        ))}
                    </div>
                </div>
            ) : null}
        </Card>
    );
}
