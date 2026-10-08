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
import { Gauge, GaugeBar, toneForValue } from '@/components/ui/Gauge';
import { useMessages } from '@/lib/messages';
import { STATE_CARD_CLASS, STATE_RAIL } from '@/components/dashboard/ApprovalCard';
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

    // Same thresholds the dial itself uses, so the rail and the arc can never
    // disagree about how the file is doing.
    const tone = score === null ? 'neutral' : toneForValue(score);

    return (
        <Card
            title={local.title}
            icon="donut_large"
            index={index}
            className={`${STATE_CARD_CLASS} ${className}`.trim()}
            style={{ borderLeftColor: STATE_RAIL[tone] || STATE_RAIL.neutral }}
        >
            <div className="flex items-center gap-4">
                <Gauge
                    value={score}
                    size={92}
                    thickness={9}
                    delay={0.15}
                    ariaLabel={local.title}
                    className="shrink-0"
                />
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
                <div className="mt-3 border-t border-[var(--becpg-grey)] pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                        {local.worst}
                    </p>
                    <div className="flex flex-col gap-2">
                        {/* One bar per catalogue. The key is `id || label`, not `id`
                            alone, because that is exactly the key the producer
                            de-duplicates on (`toCompletion` in lib/adapters/entities.js
                            passes `(catalog) => catalog.id || catalog.label || ''` to
                            `dedupeCatalogs`). `bcpg:entityScore` may carry a catalogue
                            with a label and no id — `normalizeCatalog` defends against
                            exactly that — and two such rows both keyed on `catalog.id`
                            would both be `null`: the duplicate-key defect again, in the
                            one place it was left. Keying on less than the de-duplication
                            key is what makes a collision possible; keying on more would
                            split a row the producer already merged. No index fallback,
                            for the reason given in CatalogPanel.rowKey. */}
                        {catalogs.map((catalog, position) => (
                            <GaugeBar
                                key={catalog.id || catalog.label}
                                value={catalog.score}
                                label={catalog.label}
                                size="sm"
                                delay={0.2 + position * 0.08}
                            />
                        ))}
                    </div>
                </div>
            ) : null}
        </Card>
    );
}
