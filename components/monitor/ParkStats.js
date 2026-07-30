'use client';

/**
 * **Cartes d'en-tête du parc fournisseurs** (spec §4.6.1).
 *
 * Every figure below already exists in beCPG and was never restituted: a quality
 * officer had to open project after project in Share to learn them (spec §2.2).
 * `GET /api/v1/monitor/overview` computes them with ~19 db-afts queries whatever
 * the size of the park; this component only *reads* that payload. **Nothing is
 * recomputed here** — a number the screen shows and a number the API returns can
 * never disagree.
 *
 * ## Layout
 *
 * ```
 *  ┌ tiles (order given by the business profile, §4.6.5) ─────────────────┐
 *  │ conformité │ expirants │ NC │ suspendus │ à renouveler │ …           │
 *  └──────────────────────────────────────────────────────────────────────┘
 *  ┌ composition du parc ────────────┬ horizon d'expiration ──────────────┐
 *  │ 4 bars, one per approval status │ 3 nested bars, 30 / 60 / 90 j      │
 *  └─────────────────────────────────┴────────────────────────────────────┘
 * ```
 *
 * ## Data-viz decisions
 *
 * - **The status mix is four bars, not a stacked bar or a donut.** The portal's
 *   status palette (`--status-ok/-warn/-danger`) is a *status* palette: warn and
 *   danger sit 3.9 ΔE apart under deuteranopia, which is fine when each colour
 *   carries an icon and a label of its own, and unreadable when two such
 *   segments touch. Four labelled rows also compare far better than angles do.
 * - **The expiry horizon is an ordinal ramp**, `#e8a33c → #c47000 → #8a4a00`,
 *   one hue, monotone lightness, darkest = most urgent. Validated with the
 *   data-viz palette checker (ordinal mode: lightness monotone, ΔL ≥ 0.06,
 *   light end ≥ 2:1 on the surface — all pass).
 * - The buckets are **cumulative** (`cm:to ∈ [now, now+N]`), so 30 ⊂ 60 ⊂ 90.
 *   They are drawn nested on a shared scale and the caption says so — stacking
 *   them would triple-count the same certificate.
 * - Every bar is direct-labelled and every colour is paired with an icon and a
 *   word: no figure is ever carried by colour alone.
 * - An approximate counter (`exact: false`, i.e. beCPG's
 *   `beCPG.remote.maxResults.limit` clamped the count) is shown with a `≈` and
 *   says so in clear text. A window-scoped breakdown says so too. The screen
 *   never presents a capped number as a park-wide fact.
 */

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Button';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { GaugeBar } from '@/components/ui/Gauge';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';
import { applyProfileOrder, useMonitorProfile } from '@/components/monitor/ProfileSwitcher';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        /*
         * Tile labels are **short on purpose**.
         *
         * `StatCard` renders its label on one line and clips the overflow. In the
         * 4-up row the label box is 140px, and measured in the browser four of the
         * eight used to end in an ellipsis ("CONFORMITÉ DOCUM…", "NC FOURNISSEUR
         * OU…", "FOURNISSEURS AGRÉ…", "DOCUMENTS EXPIRA…") — a dashboard where the
         * caption of the figure is unreadable. The qualifier moved to the `hint`
         * line under the figure, which wraps: "Agréés / sur 251 fournisseurs" says
         * strictly more than a clipped "FOURNISSEURS AGRÉ…" did.
         */
        tiles: {
            approved: 'Agréés',
            toRenew: 'À renouveler',
            suspended: 'Suspendus',
            compliance: 'Conformité doc.',
            expiring30: 'Expirent < 30 j',
            campaigns: 'Campagnes',
            lateTasks: 'Tâches en retard',
            nc: 'NC ouvertes',
        },
        hints: {
            ofPark: 'sur {total} fournisseurs',
            complianceDetail: '{missing} manquants · {expired} expirés · {refused} refusés',
            complianceMandatory: '{compliant} / {total} documents obligatoires',
            expiring: 'documents · {d60} à 60 j, {d90} à 90 j',
            campaigns: 'en cours · {rate} % de réponse, {late} en retard',
            lateTasks: 'échéance dépassée',
            nc: 'dont {blocking} bloquantes',
            inProgress: '{count} en cours de référencement',
            noNotice: 'préavis {days} j',
        },
        park: {
            title: 'Composition du parc',
            subtitle: "Statut d'agrément dérivé, jamais stocké (§5.4.3)",
            empty: 'Aucun fournisseur dans ce périmètre',
            share: '{share} %',
            windowScope:
                'Répartition calculée sur les {scanned} fournisseurs lus (le parc en compte {total}) : affinez les filtres pour une répartition exacte.',
        },
        expiry: {
            title: "Horizon d'expiration",
            subtitle: 'Documents fournis dont la validité se termine',
            cumulative: 'Cumulatif : un document compté à 30 j l’est aussi à 60 et 90 j.',
            bucket: '< {days} j',
            empty: 'Aucun document n’expire dans les 90 jours',
            unit: 'documents',
            seeAll: 'Voir la conformité documentaire',
        },
        approx: 'Compteur approché : beCPG a plafonné le comptage.',
        approxShort: 'approché',
        unsupported:
            'Filtre non disponible sur cette instance : {names}. Aucune propriété beCPG standard ne le porte.',
        assocScope:
            'Filtre {names} appliqué sur la fenêtre lue (Alfresco n’indexe pas les associations).',
        generatedAt: 'Données au {time}',
    },
    en: {
        /* See the note on the French labels: one line, never clipped. */
        tiles: {
            approved: 'Approved',
            toRenew: 'To renew',
            suspended: 'Suspended',
            compliance: 'Doc. compliance',
            expiring30: 'Expiring < 30 d',
            campaigns: 'Campaigns',
            lateTasks: 'Late tasks',
            nc: 'Open NCs',
        },
        hints: {
            ofPark: 'of {total} suppliers',
            complianceDetail: '{missing} missing · {expired} expired · {refused} rejected',
            complianceMandatory: '{compliant} / {total} mandatory documents',
            expiring: 'documents · {d60} at 60 d, {d90} at 90 d',
            campaigns: 'open · {rate} % answered, {late} late',
            lateTasks: 'past due',
            nc: 'including {blocking} blocking',
            inProgress: '{count} being referenced',
            noNotice: '{days} d notice',
        },
        park: {
            title: 'Park composition',
            subtitle: 'Approval status is derived, never stored (§5.4.3)',
            empty: 'No supplier in this perimeter',
            share: '{share} %',
            windowScope:
                'Breakdown computed on the {scanned} suppliers read (the park holds {total}): narrow the filters for an exact breakdown.',
        },
        expiry: {
            title: 'Expiry horizon',
            subtitle: 'Provided documents whose validity ends',
            cumulative: 'Cumulative: a document counted at 30 d is also counted at 60 and 90 d.',
            bucket: '< {days} d',
            empty: 'No document expires within 90 days',
            unit: 'documents',
            seeAll: 'See document compliance',
        },
        approx: 'Approximate counter: beCPG capped the count.',
        approxShort: 'approximate',
        unsupported:
            'Filter not available on this instance: {names}. No standard beCPG property carries it.',
        assocScope: 'Filter {names} applied on the window read (Alfresco does not index associations).',
        generatedAt: 'Data as of {time}',
    },
};

/**
 * Ordinal ramp for the 30 / 60 / 90 day buckets — one hue, monotone lightness,
 * **darkest = most urgent**. Validated in ordinal mode by the data-viz palette
 * checker against the `#fcfcfb` surface (all four checks pass).
 * @readonly
 */
const EXPIRY_RAMP = Object.freeze({ 30: '#8a4a00', 60: '#c47000', 90: '#e8a33c' });

/** Status → the portal's status tone. Icon and word always travel with it. */
const STATUS_TONE = Object.freeze({
    approved: 'ok',
    inProgress: 'info',
    toRenew: 'warn',
    suspended: 'danger',
});

const TONE_COLOR = Object.freeze({
    ok: 'var(--status-ok)',
    info: 'var(--status-info)',
    warn: 'var(--status-warn)',
    danger: 'var(--status-danger)',
});

function interpolate(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        vars[name] === undefined || vars[name] === null ? match : String(vars[name]));
}

function percent(part, total) {
    if (!total) {
        return 0;
    }
    return Math.round((part / total) * 100);
}

/**
 * The tile catalog. A profile (spec §4.6.5) reorders it; it never adds or
 * removes a figure, so the four jobs argue about the same numbers.
 *
 * @param {Object} overview payload of `GET /monitor/overview`
 * @param {Object} local label dictionary
 * @param {string} query current filter query string, propagated to the links
 * @returns {Array<Object>} `{ id, ...StatCard props }`
 */
function buildTiles(overview, local, query) {
    const park = overview.park || {};
    const compliance = overview.compliance || {};
    const expiring = overview.expiring || {};
    const buckets = expiring.buckets || {};
    const campaigns = overview.campaigns || {};
    const nc = overview.nonConformities || {};
    const tasks = overview.tasks || {};
    const suffix = query ? `?${query}` : '';
    const withStatus = (status) => `/monitor/suppliers?${[`status=${status}`, query].filter(Boolean).join('&')}`;

    return [
        {
            id: 'approved',
            label: local.tiles.approved,
            value: park.approved || 0,
            icon: 'verified',
            tone: 'ok',
            hint: interpolate(local.hints.ofPark, { total: park.total || 0 }),
            href: withStatus('approved'),
        },
        {
            id: 'toRenew',
            label: local.tiles.toRenew,
            value: park.toRenew || 0,
            icon: 'update',
            tone: (park.toRenew || 0) > 0 ? 'warn' : 'neutral',
            hint: interpolate(local.hints.inProgress, { count: park.inProgress || 0 }),
            href: withStatus('toRenew'),
        },
        {
            id: 'suspended',
            label: local.tiles.suspended,
            value: park.suspended || 0,
            icon: 'block',
            tone: (park.suspended || 0) > 0 ? 'danger' : 'ok',
            hint: interpolate(local.hints.ofPark, { total: park.total || 0 }),
            href: withStatus('suspended'),
        },
        {
            id: 'compliance',
            label: local.tiles.compliance,
            value: compliance.rate === undefined ? null : compliance.rate,
            unit: '%',
            icon: 'fact_check',
            tone: compliance.rate >= 90 ? 'ok' : compliance.rate >= 70 ? 'warn' : 'danger',
            approx: compliance.exact === false,
            hint: interpolate(local.hints.complianceMandatory, {
                compliant: compliance.compliant || 0,
                total: compliance.mandatoryTotal || 0,
            }),
            href: `/monitor/documents${suffix}`,
            children: (
                <div className="mt-2">
                    <GaugeBar
                        value={compliance.rate ?? null}
                        size="sm"
                        showValue={false}
                        ariaLabel={local.tiles.compliance}
                    />
                    <p className="mt-1 text-[11px] text-[var(--becpg-dark-grey)]">
                        {interpolate(local.hints.complianceDetail, {
                            missing: compliance.missing || 0,
                            expired: compliance.expired || 0,
                            refused: compliance.refused || 0,
                        })}
                    </p>
                </div>
            ),
        },
        {
            id: 'expiring30',
            label: local.tiles.expiring30,
            value: buckets[30] || 0,
            icon: 'schedule',
            tone: (buckets[30] || 0) > 0 ? 'warn' : 'ok',
            approx: expiring.exact === false,
            hint: interpolate(local.hints.expiring, { d60: buckets[60] || 0, d90: buckets[90] || 0 }),
            href: `/monitor/documents${suffix}`,
        },
        {
            id: 'campaigns',
            label: local.tiles.campaigns,
            value: campaigns.open || 0,
            icon: 'campaign',
            tone: (campaigns.unanswered || 0) > 0 ? 'warn' : 'info',
            approx: campaigns.exact === false,
            hint: interpolate(local.hints.campaigns, {
                rate: campaigns.responseRate ?? 0,
                late: campaigns.late || 0,
            }),
            href: `/monitor/campaigns${suffix}`,
        },
        {
            id: 'lateTasks',
            label: local.tiles.lateTasks,
            value: tasks.late || 0,
            icon: 'alarm',
            tone: (tasks.late || 0) > 0 ? 'danger' : 'ok',
            approx: tasks.exact === false,
            hint: local.hints.lateTasks,
            href: `/monitor/campaigns${suffix}`,
        },
        {
            id: 'nc',
            label: local.tiles.nc,
            value: nc.open || 0,
            icon: 'report_problem',
            tone: (nc.blocking || 0) > 0 ? 'danger' : (nc.open || 0) > 0 ? 'warn' : 'ok',
            approx: nc.exact === false,
            hint: interpolate(local.hints.nc, { blocking: nc.blocking || 0 }),
            href: `/monitor/quality${suffix}`,
        },
    ];
}

/**
 * Park composition — one labelled bar per approval status.
 *
 * Deliberately **not** a stacked bar: the two most severe statuses use the
 * status palette's warn and danger, which are 3.9 ΔE apart under deuteranopia
 * and must therefore never share an edge. One row each, every row carrying its
 * icon, its word, its count and its share.
 */
function ParkComposition({ park, local, query }) {
    const reduceMotion = useReducedMotion();
    const total = ['approved', 'inProgress', 'toRenew', 'suspended']
        .reduce((sum, status) => sum + (park[status] || 0), 0);

    if (total === 0) {
        return <EmptyState compact title={local.park.empty} />;
    }

    return (
        <>
            {/* Same treatment as the expiry panel: the shorter of the two spreads
                its bars instead of leaving a hole under them. */}
            <ul className="flex flex-1 flex-col justify-between gap-2.5">
                {['suspended', 'toRenew', 'inProgress', 'approved'].map((status, index) => {
                    const count = park[status] || 0;
                    const share = percent(count, total);
                    const tone = STATUS_TONE[status];
                    const href = `/monitor/suppliers?${[`status=${status}`, query].filter(Boolean).join('&')}`;
                    return (
                        <li key={status}>
                            <Link
                                href={href}
                                className="group block rounded-lg px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                            >
                                <div className="flex items-baseline justify-between gap-2">
                                    <StatusPill status={status} size="sm" />
                                    {/* The separator is not optional: "254 99 %"
                                        read as one mangled number. */}
                                    <span className="shrink-0 text-xs text-[var(--becpg-dark-grey)]">
                                        <span className="text-sm font-medium tabular-nums text-[var(--becpg-blue)]">
                                            {count}
                                        </span>
                                        {' · '}
                                        <span className="tabular-nums">
                                            {interpolate(local.park.share, { share })}
                                        </span>
                                    </span>
                                </div>
                                <div
                                    className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--becpg-grey)]"
                                    role="meter"
                                    aria-valuenow={share}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`${status} ${count}`}
                                >
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: TONE_COLOR[tone] }}
                                        initial={{ width: reduceMotion ? `${share}%` : 0 }}
                                        animate={{ width: `${share}%` }}
                                        transition={
                                            reduceMotion
                                                ? { duration: 0 }
                                                : { duration: 0.7, delay: index * 0.05, ease: 'easeOut' }
                                        }
                                    />
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            {park.breakdownScope === 'window' ? (
                <p className="mt-auto flex items-start gap-1.5 pt-4 text-xs text-[var(--status-warn)]">
                    <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                    <span>
                        {interpolate(local.park.windowScope, {
                            scanned: park.scanned || 0,
                            total: park.total || 0,
                        })}
                    </span>
                </p>
            ) : null}
        </>
    );
}

/**
 * Expiry horizon — three **nested** bars on a shared scale.
 *
 * The API's buckets are `cm:to ∈ [now, now + N days]`, so 30 ⊂ 60 ⊂ 90 and the
 * 90-day count is the scale. Stacking would count the same certificate three
 * times; nesting shows the inclusion, and the caption states it.
 */
function ExpiryHorizon({ expiring, local, query }) {
    const reduceMotion = useReducedMotion();
    const buckets = expiring.buckets || {};
    const days = Object.keys(buckets)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b);
    const scale = days.reduce((max, day) => Math.max(max, buckets[day] || 0), 0);

    if (scale === 0) {
        return <EmptyState compact variant="success" title={local.expiry.empty} />;
    }

    return (
        <>
            {/* `flex-1 justify-between`: side by side with the park panel this one
                is the shorter of the two, and three bars huddled at the top over
                100px of white read as a panel that failed to load. Spread, they
                read as a chart. */}
            <ul className="flex flex-1 flex-col justify-between gap-3.5">
                {days.map((day, index) => {
                    const count = buckets[day] || 0;
                    const width = percent(count, scale);
                    return (
                        <li key={day} className="flex items-center gap-3">
                            <span className="w-14 shrink-0 text-xs text-[var(--becpg-dark-grey)] tabular-nums">
                                {interpolate(local.expiry.bucket, { days: day })}
                            </span>
                            <div
                                className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--becpg-grey)]"
                                role="meter"
                                aria-valuenow={count}
                                aria-valuemin={0}
                                aria-valuemax={scale}
                                aria-label={`${interpolate(local.expiry.bucket, { days: day })} — ${count} ${local.expiry.unit}`}
                            >
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: EXPIRY_RAMP[day] || EXPIRY_RAMP[90] }}
                                    initial={{ width: reduceMotion ? `${width}%` : 0 }}
                                    animate={{ width: `${width}%` }}
                                    transition={
                                        reduceMotion
                                            ? { duration: 0 }
                                            : { duration: 0.7, delay: index * 0.06, ease: 'easeOut' }
                                    }
                                />
                            </div>
                            <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">
                                {count}
                            </span>
                        </li>
                    );
                })}
            </ul>
            {/* `mt-auto` pins the caption to the bottom of the panel: side by side
                in a stretched grid row, the two panels then end on the same line
                instead of leaving 140px of white in whichever one is shorter. */}
            <p className="pt-4 text-xs text-[var(--becpg-dark-grey)]">{local.expiry.cumulative}</p>
            <div className="mt-2">
                {/* Same link treatment as every "tout voir" of the portal:
                    blue-light, underlined on hover only. */}
                <Link
                    href={`/monitor/documents${query ? `?${query}` : ''}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--becpg-blue-light)] hover:underline"
                >
                    <Icon name="fact_check" size={14} />
                    {local.expiry.seeAll}
                </Link>
            </div>
        </>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.overview payload of `GET /api/v1/monitor/overview`
 * @param {string} [props.query] current filter query string, kept on every link
 */
export function ParkStats({ overview, query = '', className = '' }) {
    const { lang } = useMessages();
    const local = LABELS[lang] || LABELS.fr;
    const { profile } = useMonitorProfile();

    if (!overview) {
        return null;
    }

    const { ordered } = applyProfileOrder(buildTiles(overview, local, query), profile.tiles);
    const filters = overview.filters || {};
    const unsupported = filters.unsupported || [];
    const assocFilters = (filters.applied || []).filter((entry) => entry.mode === 'assoc');
    const panels = Array.isArray(profile.panels) ? profile.panels : ['park', 'expiry'];

    // `flex flex-col` on the card and `flex-1` on its body is what lets the
    // panels' trailing captions sit on the bottom edge (see `mt-auto` above).
    const panelCard = 'flex flex-col';
    const panelBody = 'flex flex-1 flex-col';

    const parkPanel = (
        <Card
            key="park"
            title={local.park.title}
            subtitle={local.park.subtitle}
            icon="donut_small"
            index={0}
            className={panelCard}
            bodyClassName={panelBody}
        >
            <ParkComposition park={overview.park || {}} local={local} query={query} />
        </Card>
    );
    const expiryPanel = (
        <Card
            key="expiry"
            title={local.expiry.title}
            subtitle={local.expiry.subtitle}
            icon="event_busy"
            index={1}
            className={panelCard}
            bodyClassName={panelBody}
        >
            <ExpiryHorizon expiring={overview.expiring || {}} local={local} query={query} />
        </Card>
    );
    const panelNodes = panels.map((id) => (id === 'expiry' ? expiryPanel : parkPanel));

    return (
        <div className={className}>
            <StatGrid columns={4}>
                {ordered.map((tile, index) => (
                    <StatCard
                        key={tile.id}
                        index={index}
                        label={tile.label}
                        value={tile.value === null ? '—' : tile.value}
                        unit={tile.unit}
                        icon={tile.icon}
                        tone={tile.tone}
                        href={tile.href}
                        hint={
                            tile.approx ? (
                                <span title={local.approx}>
                                    {tile.hint} · ≈ {local.approxShort}
                                </span>
                            ) : (
                                tile.hint
                            )
                        }
                    >
                        {tile.children}
                    </StatCard>
                ))}
            </StatGrid>

            {/* Same rhythm as the page that hosts this block (`mt-3 sm:mt-4`). */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-2">
                {panelNodes}
            </div>

            {unsupported.length > 0 || assocFilters.length > 0 ? (
                <div className="mt-3 flex flex-col gap-1 sm:mt-4">
                    {unsupported.length > 0 ? (
                        <p className="flex items-start gap-1.5 text-xs text-[var(--becpg-dark-grey)]">
                            <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                            <span>{interpolate(local.unsupported, { names: unsupported.join(', ') })}</span>
                        </p>
                    ) : null}
                    {assocFilters.length > 0 ? (
                        <p className="flex items-start gap-1.5 text-xs text-[var(--becpg-dark-grey)]">
                            <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                            <span>
                                {interpolate(local.assocScope, {
                                    names: assocFilters.map((entry) => entry.name).join(', '),
                                })}
                            </span>
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
