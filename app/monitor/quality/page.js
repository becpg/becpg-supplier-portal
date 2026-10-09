'use client';

/**
 * `/monitor/quality` — the supplier non-conformities, their processing delay and
 * the state of their corrective actions (spec §4.6.5 « Qualité : conformité
 * documentaire, NC, certifications, audits », §4.2).
 *
 * Everything here comes from `GET /api/v1/monitor/quality`: `qa:ncState`,
 * `qa:ncType`, `qa:ncPriority` and `qa:ncCost` are indexed, so the counters are
 * **count queries** and the page is one scan — never a page fetched and counted
 * in JavaScript.
 *
 * Two facts this screen is built around, both from the spec:
 *
 *  1. **A blocking NC is what makes a supplier `suspended`** (§5.4.3): the
 *     approval status is derived, never stored, and an open `qa:ncPriority = 1`
 *     is one of its conditions. The "bloquantes" tile and the supplier list's
 *     "suspendus" tile therefore count the *same* fact — which is exactly why
 *     nobody should have to reconcile two screens by hand.
 *  2. **A suspension is not written, it is started** (§4.6.7). The bulk bar posts
 *     to `POST /api/v1/monitor/actions`, which reuses beCPG's own mechanisms: the
 *     supplier's forum thread for a reminder or an escalation, and the client's
 *     suspension process for a suspension. The status flips on its own once
 *     beCPG holds the blocking NC.
 *
 * The four tiles do not move when `qa:ncState` or `qa:ncType` are set, which is
 * deliberate: those narrow the *rows an officer works on*, not the size of the
 * problem the department owns.
 *
 * A **park filter is different** and the tiles do follow it. A perimeter
 * (`family`, `site`, `q`…) changes *which suppliers* the screen is about, and a
 * counter for another perimeter is not an imprecise figure, it is a figure about
 * someone else. Measured on the reference instance before this: filtering on suppliers
 * owning no NC left the list empty under tiles still reading « 5 NC ouvertes ·
 * 2 bloquantes », while « Au-delà du délai » and « Délai moyen » — computed from
 * the filtered rows — correctly read 0. Four tiles, two populations. They are
 * now one: `summary.parkScoped` says which, and `scope.empty` says when the
 * perimeter matched no supplier at all (in which case nothing was queried).
 *
 * The processing delay is `now − cm:created` while the NC is open, and
 * `cm:modified − cm:created` once it is closed: beCPG stores no closure date, and
 * the screen says so rather than presenting an invented lead time.
 */

import { useCallback, useMemo, useState } from 'react';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { useListExport } from '@/components/ui/useListExport';
import { WindowNotice } from '@/components/monitor/WindowNotice';
import { Checkbox, SEARCH_SLOT_CLASS, SearchInput, Select } from '@/components/ui/Field';
import { formatTotal } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { useApi } from '@/lib/client';
import {
    NC_STATES,
    NC_TYPES,
    NonConformityList,
    ncStateLabel,
    ncTargets,
    ncTypeLabel,
} from '@/components/monitor/NonConformityList';
import { BulkActionBar } from '@/components/monitor/BulkActionBar';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('app/monitor/quality/page#LABELS', {
    fr: {
        title: 'Non-conformités',
        subtitle:
            'NC fournisseur, délai de traitement et avancement des actions correctives. Sélectionnez des NC pour relancer, escalader ou suspendre les fournisseurs concernés.',
        stats: {
            open: 'NC ouvertes',
            blocking: 'Bloquantes',
            overdue: 'Au-delà du délai',
            delay: 'Délai moyen',
        },
        hints: {
            total: '{count} au total',
            blocking:
                'Rend le statut d’agrément « suspendu »',
            noBlocking: 'Aucun agrément bloqué par une NC',
            actionsLate: '{count} action(s) corrective(s) en retard',
            noActionsLate: 'Aucune action corrective en retard',
            closing: 'Clôture moyenne {value} j',
            noClosing: 'Aucune NC fermée sur ce périmètre',
            /*
             * The closing delay is computed on the listed rows, and closed NCs are
             * excluded from the list by default. Measured on dev: the first tile
             * announced « 11 au total » (so 1 closed) while this one claimed
             * « Aucune NC fermée sur ce périmètre ». There is one; it simply is
             * not in the population that was read.
             */
            closingHidden: '{count} NC fermée(s) · cliquer pour les inclure',
        },
        dayUnit: 'j',
        allStates: 'Tous les états',
        allTypes: 'Tous les types',
        includeClosed: 'Inclure les NC fermées',
        searchSupplier: 'Filtrer par fournisseur',
        truncatedShort: 'Fenêtre : {scanned} NC lues',
        truncated:
            'Plus de NC que la fenêtre d’analyse ({scanned} analysées) : affinez les filtres pour une vue complète.',
        inexact:
            'Compteurs approchés : le moteur a renvoyé un total borné pour au moins une requête.',
        scopeEmpty:
            'Aucun fournisseur ne correspond à ce périmètre. Aucune requête n’a été exécutée : les compteurs ci-dessus sont des zéros de construction, pas des mesures.',
        unsupported:
            'Filtre(s) non pris en charge par le modèle beCPG standard : {names}. À paramétrer côté client.',
        pageOf: '{from}–{to} sur {total} NC',
        previous: 'Précédent',
        next: 'Suivant',
        rows: 'Lignes',
        reminder:
            'Une non-conformité ouverte vous concerne. Merci de traiter les actions correctives associées sur le portail dans les meilleurs délais.',
        hintTargets: 'Fournisseurs des NC sélectionnées',
        note:
            'Délai de traitement : depuis la création de la NC ; pour une NC fermée, entre sa création et sa dernière modification — beCPG ne stocke pas de date de clôture.',
    },
    en: {
        title: 'Non-conformities',
        subtitle:
            'Supplier NCs, processing delay and corrective-action progress. Select NCs to remind, escalate or suspend the suppliers concerned.',
        stats: {
            open: 'Open NCs',
            blocking: 'Blocking',
            overdue: 'Past target',
            delay: 'Mean delay',
        },
        hints: {
            total: '{count} in total',
            blocking: 'Makes the approval status "suspended"',
            noBlocking: 'No approval blocked by an NC',
            actionsLate: '{count} corrective action(s) late',
            noActionsLate: 'No late corrective action',
            closing: 'Mean closing {value} d',
            noClosing: 'No closed NC in this perimeter',
            /* See the note on the French `closingHidden`. */
            closingHidden: '{count} closed NC · click to include them',
        },
        dayUnit: 'd',
        allStates: 'All states',
        allTypes: 'All types',
        includeClosed: 'Include closed NCs',
        searchSupplier: 'Filter by supplier',
        truncatedShort: 'Window: {scanned} NCs read',
        truncated:
            'More NCs than the scan window ({scanned} scanned): narrow the filters for a complete view.',
        inexact: 'Approximate counters: the engine returned a capped total for at least one query.',
        scopeEmpty:
            'No supplier matches this perimeter. No query was run: the counters above are zeros by construction, not measurements.',
        unsupported:
            'Filter(s) unsupported by the standard beCPG model: {names}. Configure them client side.',
        pageOf: '{from}–{to} of {total} NCs',
        previous: 'Previous',
        next: 'Next',
        rows: 'Rows',
        reminder:
            'An open non-conformity concerns you. Please handle the related corrective actions on the portal as soon as possible.',
        hintTargets: 'Suppliers of the selected NCs',
        note:
            'Processing delay: since the NC was created; for a closed NC, between its creation and its last modification — beCPG stores no closure date.',
    },
});

const PAGE_SIZES = [25, 50, 100];

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

export default function MonitorQualityPage() {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    const [ncState, setNcState] = useState('');
    const [ncType, setNcType] = useState('');
    const [includeClosed, setIncludeClosed] = useState(false);
    const [supplier, setSupplier] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [rowSelection, setRowSelection] = useState({});
    const [focus, setFocus] = useState('');

    const params = useMemo(
        () => ({
            ncState: ncState || undefined,
            ncType: ncType || undefined,
            // A closed state asked for explicitly implies the closed rows: the
            // endpoint excludes them by default, and a filter that returns
            // nothing would look like a bug rather than a setting.
            includeClosed: includeClosed || ncState === 'closed' ? 'true' : undefined,
            q: supplier.trim() || undefined,
            focus: focus || undefined,
            page,
            pageSize,
        }),
        [ncState, ncType, includeClosed, supplier, focus, page, pageSize],
    );

    const quality = useApi('monitor/quality', { params });
    const exportQuery = useMemo(() => {
        const { page: unusedPage, pageSize: unusedPageSize, ...rest } = params;
        return rest;
    }, [params]);
    const listExport = useListExport({ path: 'monitor/quality', query: exportQuery, filename: 'non-conformites' });
    /** A tile is a filter: one click narrows the list to what it counts, a second one clears it. */
    const tileProps = (id) => ({
        onClick: () => {
            setFocus((current) => (current === id ? '' : id));
            setPage(1);
        },
        'aria-pressed': focus === id,
        badge: focus === id ? (
            <span className="pill pill-info pill-sm pill-no-dot"><Icon name="filter_alt" size={12} /></span>
        ) : null,
    });
    const data = quality.data;

    // Memoised so an empty answer keeps one stable `[]` identity — otherwise the
    // selection and type-option memos below would recompute on every render.
    const items = useMemo(() => (data && data.items) || [], [data]);
    const summary = (data && data.summary) || {};
    const pagination = (data && data.pagination) || {
        page: 1,
        pageSize,
        count: 0,
        totalItems: 0,
        totalAtLeast: 0,
        totalExact: true,
    };
    const filters = (data && data.filters) || {};
    // A configuration fact the API states, never inferred from `items.length === 0`:
    // "the perimeter matched no supplier", which is why every tile reads 0.
    const scopeEmpty = Boolean(data && data.scope && data.scope.empty);
    const correctiveActions = summary.correctiveActions || {};
    // `null` is a real answer here (no open NC at all), so the tile shows a dash
    // and drops its unit rather than printing "— j".
    const meanOpen = summary.meanOpenDelayDays;
    const hasMeanOpen = typeof meanOpen === 'number';

    // Any change of what is displayed drops the selection: suspending rows the
    // user can no longer see would be suspending blind. Done in the handlers,
    // never in an effect (an effect would fire after the dialog opened).
    const resetView = useCallback(() => {
        setPage(1);
        setRowSelection({});
    }, []);

    const goToPage = useCallback((updater) => {
        setPage(updater);
        setRowSelection({});
    }, []);

    const targets = useMemo(() => ncTargets(items, rowSelection), [items, rowSelection]);

    // From the rows in hand. The three counters below come from `countNodes()`,
    // which answers with a floor when beCPG only offered its `count + 1` sentinel:
    // `summary.exact` says which, and the tiles read "N+" rather than claim a total.
    const rowsOnPage = Number.isFinite(pagination.count) ? pagination.count : items.length;
    const from = rowsOnPage === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
    const to = (pagination.page - 1) * pagination.pageSize + rowsOnPage;
    const total = formatTotal(pagination, lang);
    const countOf = (value) => formatTotal({ total: value, exact: summary.exact !== false }, lang);
    const openCount = countOf(summary.open);
    const blockingCount = countOf(summary.blocking);

    const stateOptions = useMemo(
        () => [
            { value: '', label: labels.allStates },
            ...NC_STATES.map((value) => ({ value, label: ncStateLabel(value, lang) })),
        ],
        [labels, lang],
    );

    // The standard `qa:ncTypes`, plus any value this instance actually uses — a
    // client may have extended the list constraint, and a type present in the
    // data must be filterable even when the portal does not know its wording.
    const typeOptions = useMemo(() => {
        const values = new Set(NC_TYPES);
        items.forEach((item) => {
            if (item.ncType) {
                values.add(item.ncType);
            }
        });
        if (ncType) {
            values.add(ncType);
        }
        return [
            { value: '', label: labels.allTypes },
            ...[...values].map((value) => ({ value, label: ncTypeLabel(value, lang) })),
        ];
    }, [items, ncType, labels, lang]);

    return (
        <AppShell
            ownHeading
            fullWidth
            space="monitor"
            title={labels.title}
        >
            <PageHeader
                title={labels.title}
                description={labels.subtitle}
                actions={pagination.truncated ? (
                    <WindowNotice
                        label={fill(labels.truncatedShort, { scanned: pagination.scanned || 0 })}
                        detail={fill(labels.truncated, { scanned: pagination.scanned || 0 })}
                    />
                ) : null}
            />

            {/* ------------------------------------------------------ KPI row */}
            <StatGrid columns={4} className="mb-4">
                <StatCard
                    label={labels.stats.open}
                    value={openCount.text}
                    icon="report_problem"
                    tone={summary.open ? 'warn' : 'ok'}
                    loading={quality.loading}
                    index={0}
                    onClick={() => {
                        setFocus('');
                        setPage(1);
                    }}
                    aria-pressed={!focus}
                    hint={
                        summary.total
                            ? fill(labels.hints.total, { count: countOf(summary.total).text })
                            : undefined
                    }
                />
                <StatCard
                    label={labels.stats.blocking}
                    value={blockingCount.text}
                    icon="block"
                    tone={summary.blocking ? 'danger' : 'ok'}
                    loading={quality.loading}
                    index={1}
                    {...tileProps('blocking')}
                    hint={summary.blocking ? labels.hints.blocking : labels.hints.noBlocking}
                />
                <StatCard
                    label={labels.stats.overdue}
                    value={summary.overdue || 0}
                    icon="alarm"
                    tone={summary.overdue ? 'danger' : 'ok'}
                    loading={quality.loading}
                    index={2}
                    {...tileProps('overdue')}
                    hint={
                        correctiveActions.late
                            ? fill(labels.hints.actionsLate, { count: correctiveActions.late })
                            : labels.hints.noActionsLate
                    }
                />
                <StatCard
                    label={labels.stats.delay}
                    value={hasMeanOpen ? meanOpen : '—'}
                    unit={hasMeanOpen ? labels.dayUnit : undefined}
                    icon="schedule"
                    tone={
                        !hasMeanOpen
                            ? 'neutral'
                            : meanOpen > 30
                              ? 'danger'
                              : meanOpen > 15
                                ? 'warn'
                                : 'ok'
                    }
                    loading={quality.loading}
                    index={3}
                    onClick={(summary.closed || 0) > 0 ? () => {
                        setIncludeClosed((value) => !value);
                        setPage(1);
                    } : undefined}
                    aria-pressed={(summary.closed || 0) > 0 ? includeClosed : undefined}
                    /*
                     * `meanClosingDelayDays` is folded over the **listed** rows, and
                     * closed NCs are excluded from the list unless the box is ticked.
                     * "Aucune NC fermée" is therefore only true when the summary
                     * counts none either — otherwise the delay is not absent, it is
                     * out of the population, and the hint says which.
                     */
                    hint={
                        typeof summary.meanClosingDelayDays === 'number'
                            ? fill(labels.hints.closing, { value: summary.meanClosingDelayDays })
                            : (summary.closed || 0) > 0
                              ? fill(labels.hints.closingHidden, { count: summary.closed })
                              : labels.hints.noClosing
                    }
                />
            </StatGrid>

            {/* ----------------------------------------------------- warnings */}
            {scopeEmpty ? (
                <Card variant="accent" padding="sm" className="mb-3">
                    <p className="flex items-start gap-2 text-xs">
                        <Icon name="info" size={16} className="mt-0.5 text-[var(--becpg-orange)]" />
                        <span>{labels.scopeEmpty}</span>
                    </p>
                </Card>
            ) : null}


            {summary.exact === false ? (
                <p className="mb-3 text-xs text-[var(--becpg-dark-grey)]">{labels.inexact}</p>
            ) : null}

            {filters.unsupported && filters.unsupported.length > 0 ? (
                <p className="mb-3 text-xs text-[var(--becpg-dark-grey)]">
                    {fill(labels.unsupported, { names: filters.unsupported.join(', ') })}
                </p>
            ) : null}

            {/* -------------------------------------------------------- table */}
            <NonConformityList
                items={items}
                loading={quality.loading}
                error={quality.error}
                onRetry={quality.refresh}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                enablePagination={false}
                toolbar={
                    <>
                        <div className={SEARCH_SLOT_CLASS}>
                            <SearchInput
                                value={supplier}
                                placeholder={labels.searchSupplier}
                                onChange={(value) => {
                                    setSupplier(value);
                                    resetView();
                                }}
                            />
                        </div>
                        <Select
                            value={ncState}
                            aria-label={labels.allStates}
                            className="min-w-[10rem]"
                            options={stateOptions}
                            onChange={(event) => {
                                setNcState(event.target.value);
                                resetView();
                            }}
                        />
                        <Select
                            value={ncType}
                            aria-label={labels.allTypes}
                            className="min-w-[11rem]"
                            options={typeOptions}
                            onChange={(event) => {
                                setNcType(event.target.value);
                                resetView();
                            }}
                        />
                        <Checkbox
                            label={labels.includeClosed}
                            checked={includeClosed || ncState === 'closed'}
                            disabled={ncState === 'closed'}
                            onChange={(event) => {
                                setIncludeClosed(event.target.checked);
                                resetView();
                            }}
                        />
                    </>
                }
                legend={labels.note}
                onExport={listExport.onExport}
                exporting={listExport.exporting}
            />

            {/* --------------------------------------------------- pagination */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--becpg-dark-grey)]">
                <span />
                <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                        {fill(labels.pageOf, { from, to, total: total.text })}
                    </span>
                    <select
                        aria-label={labels.rows}
                        className="rounded-md border border-[var(--becpg-grey)] bg-white px-2 py-1 text-xs"
                        value={pageSize}
                        onChange={(event) => {
                            setPageSize(Number(event.target.value));
                            resetView();
                        }}
                    >
                        {PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                    <Button
                        variant="outline"
                        size="sm"
                        icon="chevron_left"
                        label={labels.previous}
                        disabled={pagination.page <= 1}
                        onClick={() => goToPage((value) => Math.max(1, value - 1))}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        icon="chevron_right"
                        label={labels.next}
                        disabled={!pagination.hasMoreItems}
                        onClick={() => goToPage((value) => value + 1)}
                    />
                </div>
            </div>

            {/* ------------------------------------------------- bulk actions */}
            {/* All three steps are legitimate on a NC: relancer le plan d'action,
                escalader vers le référent interne, suspendre le fournisseur. The
                bar renders only what this instance actually offers. */}
            <BulkActionBar
                targets={targets}
                defaultMessage={labels.reminder}
                hint={labels.hintTargets}
                onClear={() => setRowSelection({})}
                onDone={() => {
                    setRowSelection({});
                    quality.refresh();
                }}
            />
        </AppShell>
    );
}
