'use client';

/**
 * The documentary compliance in 3D: the same rows as the matrix, drawn as a
 * landscape the reader turns around, so the suppliers with documents waiting
 * stand out at a glance and open with a click.
 *
 *  - Relief: one column per supplier and document type, taller and redder the
 *    more urgent it is.
 *  - Constellation: one bubble per supplier, grouped by family; height is the
 *    number of documents waiting, size the number expected, colour the worst
 *    status.
 *
 * Without WebGL the scene falls back to a 2D chart of the documents waiting per
 * supplier; the matrix tab stays the exhaustive view.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Icon } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExpiryPill } from '@/components/documents/ExpiryPill';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { MonitorActionButtons } from '@/components/monitor/RiskList';
import { CockpitChart, axisStyle, escapeHtml, tooltipStyle } from '@/components/monitor/cockpit/parts';
import { DOCUMENT_TONES, cssVar } from '@/components/monitor/cockpit/palette';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/DocumentScene#LABELS', {
    fr: {
        relief: 'Relief',
        constellation: 'Constellation',
        mode: 'Mode d’affichage',
        filters: 'Statuts affichés',
        statuses: {
            expired: 'Expiré', missing: 'Manquant', refused: 'Refusé', expiring: 'Expire bientôt', toValidate: 'À valider', valid: 'Valide',
        },
        aria: 'Fournisseurs et documents attendus, en trois dimensions',
        rotate: 'Glisser pour tourner',
        zoom: 'Molette pour zoomer',
        pick: 'Cliquer un fournisseur pour agir',
        pickTitle: 'Cliquez un fournisseur dans la scène',
        waiting: '{count} document(s) en attente',
        waitingAxis: 'En attente',
        family: 'Famille',
        severity: 'Gravité',
        noFamily: 'Sans famille',
        openSheet: 'Ouvrir la fiche',
        view: 'Consulter',
        empty: 'Aucun document attendu dans ce périmètre',
    },
    en: {
        relief: 'Relief',
        constellation: 'Constellation',
        mode: 'Display mode',
        filters: 'Statuses shown',
        statuses: {
            expired: 'Expired', missing: 'Missing', refused: 'Refused', expiring: 'Expiring soon', toValidate: 'To validate', valid: 'Valid',
        },
        aria: 'Suppliers and expected documents, in three dimensions',
        rotate: 'Drag to rotate',
        zoom: 'Scroll to zoom',
        pick: 'Click a supplier to act',
        pickTitle: 'Click a supplier in the scene',
        waiting: '{count} document(s) waiting',
        waitingAxis: 'Waiting',
        family: 'Family',
        severity: 'Severity',
        noFamily: 'No family',
        openSheet: 'Open the sheet',
        view: 'View',
        empty: 'No document expected in this perimeter',
    },
});

/** Most urgent first; the order sets the colour legend and the "worst" status. */
const STATUS_ORDER = Object.freeze(['expired', 'missing', 'refused', 'expiring', 'toValidate', 'valid']);

/** Column height per status: the taller, the more urgent. */
const HEIGHTS = Object.freeze({ expired: 3.2, missing: 3, refused: 2.8, expiring: 2, toValidate: 1.4, valid: 0.45 });

/** A status that still asks something of the supplier or of the reviewer. */
const WAITING = new Set(['expired', 'missing', 'refused', 'expiring', 'toValidate']);

const MODES = Object.freeze({ relief: 'relief', constellation: 'constellation' });

/** Spread of the bubbles of one family, so they do not sit on one line. */
const FAMILY_SPACING = 3;
const JITTER = 1.6;

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

/** The matrix rows as the scene reads them: suppliers with at least one expected document. */
function toSuppliers(columns, rows) {
    return rows.map((row) => {
        const documents = columns
            .map((column) => ({ column, cell: row.cells?.[column.nodeRef || 'untyped'] }))
            .filter(({ cell }) => cell && STATUS_ORDER.includes(cell.status));
        const statuses = documents.map(({ cell }) => cell.status);
        return {
            ...row.supplier,
            documents,
            waiting: statuses.filter((status) => WAITING.has(status)).length,
            worst: [...statuses].sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))[0] || 'valid',
        };
    })
        .filter((supplier) => supplier.documents.length > 0)
        .sort((a, b) => b.waiting - a.waiting || String(a.name).localeCompare(String(b.name)));
}

function reliefOption({ palette, columns, suppliers, shown, local }) {
    const data = [];
    suppliers.forEach((supplier, y) => supplier.documents.forEach(({ column, cell }) => {
        if (!shown.has(cell.status)) {
            return;
        }
        data.push({
            value: [columns.indexOf(column), y, HEIGHTS[cell.status]],
            itemStyle: { color: palette[DOCUMENT_TONES[cell.status]] },
            supplier: supplier.nodeRef,
            status: cell.status,
            type: column.label,
        });
    }));
    return {
        tooltip: tooltipStyle(palette, {
            formatter: (entry) => `${escapeHtml(entry.data.type)}<br><b>${escapeHtml(suppliers[entry.value[1]]?.name)}</b><br>${escapeHtml(local.statuses[entry.data.status])}`,
        }),
        xAxis3D: { type: 'category', data: columns.map((column) => column.label), name: '', axisLabel: { color: palette.muted, fontSize: 10, interval: 0 } },
        yAxis3D: { type: 'category', data: suppliers.map((supplier) => supplier.code || supplier.name), name: '', axisLabel: { color: palette.muted, fontSize: 10, interval: 0 } },
        zAxis3D: { type: 'value', name: '', max: 3.4, axisLabel: { show: false } },
        grid3D: {
            boxWidth: 120,
            boxDepth: Math.max(60, Math.min(200, suppliers.length * 8)),
            boxHeight: 40,
            axisLine: { lineStyle: { color: palette.line } },
            splitLine: { lineStyle: { color: palette.line, opacity: 0.6 } },
            axisPointer: { show: false },
            viewControl: { alpha: 30, beta: 38, distance: 205, minDistance: 80, maxDistance: 320 },
            light: { main: { intensity: 1.15, shadow: true, alpha: 40, beta: 30 }, ambient: { intensity: 0.45 } },
        },
        series: [{ type: 'bar3D', data, shading: 'lambert', bevelSize: 0.25, bevelSmoothness: 2, barSize: [8, 5], emphasis: { label: { show: false }, itemStyle: { color: palette.orange } } }],
    };
}

function constellationOption({ palette, suppliers, shown, local, families }) {
    const data = suppliers
        .filter((supplier) => supplier.documents.some(({ cell }) => shown.has(cell.status)))
        .map((supplier, index) => {
            const family = families.indexOf(supplier.family?.label || local.noFamily);
            const jitter = ((index * 37) % 11) / 11 - 0.5;
            return {
                value: [family * FAMILY_SPACING + jitter * JITTER, supplier.waiting, STATUS_ORDER.indexOf(supplier.worst) + jitter],
                symbolSize: 10 + supplier.documents.length * 5,
                itemStyle: { color: palette[DOCUMENT_TONES[supplier.worst]], opacity: 0.9 },
                supplier: supplier.nodeRef,
                name: supplier.name,
            };
        });
    return {
        tooltip: tooltipStyle(palette, {
            formatter: (entry) => `<b>${escapeHtml(entry.data.name)}</b><br>${escapeHtml(fill(local.waiting, { count: entry.value[1] }))}`,
        }),
        xAxis3D: {
            type: 'value',
            name: local.family,
            min: -1.5,
            max: (families.length - 1) * FAMILY_SPACING + 1.5,
            axisLabel: {
                color: palette.muted,
                fontSize: 10,
                formatter: (value) => (Number.isInteger(value / FAMILY_SPACING) ? families[value / FAMILY_SPACING] || '' : ''),
            },
            nameTextStyle: { color: palette.muted },
        },
        yAxis3D: { type: 'value', name: local.waitingAxis, min: 0, axisLabel: { color: palette.muted }, nameTextStyle: { color: palette.muted } },
        zAxis3D: { type: 'value', name: local.severity, min: -1, max: STATUS_ORDER.length, axisLabel: { show: false }, nameTextStyle: { color: palette.muted } },
        grid3D: {
            boxWidth: 140,
            boxDepth: 90,
            boxHeight: 90,
            axisLine: { lineStyle: { color: palette.line } },
            splitLine: { lineStyle: { color: palette.line, opacity: 0.5 } },
            axisPointer: { show: false },
            viewControl: { alpha: 18, beta: 30, distance: 190, minDistance: 90, maxDistance: 340, autoRotate: true, autoRotateSpeed: 4, autoRotateAfterStill: 6 },
        },
        series: [{ type: 'scatter3D', data, emphasis: { itemStyle: { color: palette.orange } } }],
    };
}

/** Without WebGL: the documents waiting per supplier, as plain bars. */
function fallbackOption({ palette, suppliers, local }) {
    const top = suppliers.slice(0, 25);
    return {
        tooltip: tooltipStyle(palette, { trigger: 'axis' }),
        grid: { left: 10, right: 30, top: 10, bottom: 10, containLabel: true },
        xAxis: axisStyle(palette, { type: 'value', minInterval: 1, name: local.waitingAxis }),
        yAxis: axisStyle(palette, { type: 'category', inverse: true, data: top.map((supplier) => supplier.name), splitLine: { show: false } }),
        series: [{
            type: 'bar',
            barMaxWidth: 18,
            data: top.map((supplier) => ({ value: supplier.waiting, supplier: supplier.nodeRef, itemStyle: { color: palette[DOCUMENT_TONES[supplier.worst]], borderRadius: 4 } })),
        }],
    };
}

function SupplierPanel({ supplier, local, onView, onDone }) {
    if (!supplier) {
        return <EmptyState compact icon="touch_app" title={local.pickTitle} />;
    }
    const documents = [...supplier.documents]
        .sort((a, b) => STATUS_ORDER.indexOf(a.cell.status) - STATUS_ORDER.indexOf(b.cell.status));
    return (
        <div className="flex flex-col gap-3">
            <div>
                <h2 className="text-base font-medium text-[var(--becpg-ink)]">{supplier.name}</h2>
                <p className="text-[0.8125rem] text-[var(--becpg-muted)]">
                    {[supplier.code, supplier.family?.label, fill(local.waiting, { count: supplier.waiting })].filter(Boolean).join(' · ')}
                </p>
            </div>
            <ul className="flex flex-col">
                {documents.map(({ column, cell }) => (
                    <li key={column.nodeRef || column.label} className="flex items-center gap-2 border-t border-[var(--becpg-line)] py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate" title={column.label}>{column.label}</span>
                        <ExpiryPill status={cell.status} validTo={cell.validTo} daysToExpiry={cell.daysToExpiry} size="sm" />
                        {cell.downloadUrl ? (
                            <button
                                type="button"
                                onClick={() => onView({ nodeRef: cell.documentRef, name: cell.documentName || column.label, downloadUrl: cell.downloadUrl })}
                                className="rounded p-1 text-[var(--becpg-blue)] hover:bg-[var(--becpg-grey)]"
                                aria-label={`${local.view} ${column.label}`}
                            >
                                <Icon name="visibility" size={16} />
                            </button>
                        ) : null}
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-2">
                <MonitorActionButtons targets={[{ nodeRef: supplier.nodeRef, name: supplier.name, code: supplier.code }]} allowed={['remind', 'escalate']} onDone={onDone} />
                <Button variant="outline" size="sm" icon="open_in_new" href={`/monitor/suppliers/${encodeURIComponent(supplier.nodeRef)}`}>
                    {local.openSheet}
                </Button>
            </div>
        </div>
    );
}

/**
 * @param {Object} props
 * @param {Object[]} props.columns the matrix columns (document types)
 * @param {Object[]} props.rows the matrix rows (suppliers and their cells)
 * @param {Function} [props.onDone] reloads the matrix after an action
 */
export function DocumentScene({ columns = [], rows = [], onDone }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const [mode, setMode] = useState(MODES.relief);
    const [shown, setShown] = useState(() => new Set(STATUS_ORDER));
    const [selectedRef, setSelectedRef] = useState(null);
    const [viewing, setViewing] = useState(null);

    const suppliers = useMemo(() => toSuppliers(columns, rows), [columns, rows]);
    const families = useMemo(
        () => [...new Set(suppliers.map((supplier) => supplier.family?.label || local.noFamily))],
        [suppliers, local],
    );
    const selected = suppliers.find((supplier) => supplier.nodeRef === selectedRef) || suppliers[0] || null;

    // The selection is not part of the scene: redrawing it would reset the camera
    // the reader has just turned.
    const build = useCallback(
        (palette) => (mode === MODES.relief
            ? reliefOption({ palette, columns, suppliers, shown, local })
            : constellationOption({ palette, suppliers, shown, local, families })),
        [mode, columns, suppliers, shown, local, families],
    );
    const fallback = useCallback((palette) => fallbackOption({ palette, suppliers, local }), [suppliers, local]);
    const onClick = useCallback((event) => {
        if (event?.data?.supplier) {
            setSelectedRef(event.data.supplier);
        }
    }, []);
    const toggle = (status) => setShown((current) => {
        const next = new Set(current);
        if (next.has(status)) {
            next.delete(status);
        }
        else {
            next.add(status);
        }
        return next;
    });

    if (suppliers.length === 0) {
        return <EmptyState icon="task_alt" variant="success" title={local.empty} />;
    }

    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="min-w-0 rounded-2xl border border-[var(--becpg-line)] bg-white shadow-[var(--becpg-shadow-raised)]">
                <div className="flex flex-wrap items-center gap-2.5 px-3.5 pt-3">
                    <div role="group" aria-label={local.mode} className="inline-flex overflow-hidden rounded-full border border-[var(--becpg-line)]">
                        {[[MODES.relief, 'bar_chart', local.relief], [MODES.constellation, 'bubble_chart', local.constellation]].map(([id, icon, label]) => (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={mode === id}
                                onClick={() => setMode(id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${mode === id ? 'bg-[var(--becpg-blue)] text-white' : 'text-[var(--becpg-blue)] hover:bg-[var(--becpg-grey)]'}`}
                            >
                                <Icon name={icon} size={15} />
                                {label}
                            </button>
                        ))}
                    </div>
                    <div role="group" aria-label={local.filters} className="ms-auto flex flex-wrap gap-1.5">
                        {STATUS_ORDER.map((status) => (
                            <button
                                key={status}
                                type="button"
                                aria-pressed={shown.has(status)}
                                onClick={() => toggle(status)}
                                className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--becpg-line)] bg-white py-0.5 pe-2.5 ps-1.5 text-xs ${shown.has(status) ? '' : 'opacity-50 line-through'}`}
                            >
                                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: cssVar(DOCUMENT_TONES[status]) }} />
                                {local.statuses[status]}
                            </button>
                        ))}
                    </div>
                </div>
                <CockpitChart build={build} fallback={fallback} gl height={540} label={local.aria} onClick={onClick} />
                <p className="flex flex-wrap gap-x-4 gap-y-1 px-3.5 pb-3 text-xs text-[var(--becpg-muted)]">
                    <span className="inline-flex items-center gap-1"><Icon name="3d_rotation" size={15} />{local.rotate}</span>
                    <span className="inline-flex items-center gap-1"><Icon name="zoom_in" size={15} />{local.zoom}</span>
                    <span className="inline-flex items-center gap-1"><Icon name="touch_app" size={15} />{local.pick}</span>
                </p>
            </section>
            <aside className="rounded-2xl border border-[var(--becpg-line)] bg-white p-4 shadow-[var(--becpg-shadow-raised)]" aria-live="polite">
                <SupplierPanel supplier={selected} local={local} onView={setViewing} onDone={onDone} />
            </aside>
            <DocumentViewer document={viewing} onClose={() => setViewing(null)} />
        </div>
    );
}
