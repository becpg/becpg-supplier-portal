'use client';

/**
 * The CSR tab of the cockpit: certificates, document compliance per type, and the
 * CSR sources the repository does not expose yet - shown as such, with no figure.
 */

import { useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Button';
import { DOCUMENT_TONES } from '@/components/monitor/cockpit/palette';
import {
    BlockUnavailable,
    ChartCard,
    CockpitChart,
    ExportButton,
    KpiCard,
    Legend,
    SoonPill,
    WindowPill,
    axisStyle,
    figure,
    fill,
    saveCsv,
    tooltipStyle,
} from '@/components/monitor/cockpit/parts';
import { DOCUMENT_STATUSES, useVocabulary } from '@/components/monitor/cockpit/vocabulary';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/cockpit/CsrTab#LABELS', {
    fr: {
        expected: 'Certificats attendus',
        expectedHelp: 'Types de document dont le libellé contient « certificat », un par fournisseur concerné.',
        valid: 'Certificats valides',
        outOf: '/ {total}',
        origins: 'Origines déclarées',
        surveys: 'Questionnaires RSE',
        notWired: 'Cette information n’est pas encore exposée par beCPG au portail.',
        byType: 'Conformité par type de document',
        byTypeAria: 'Statut des documents par type',
        byTypeHelp: 'Pour chaque type de document, un statut par fournisseur concerné : le plus défavorable de ses documents.',
        map: 'Origines des approvisionnements',
        mapEmpty: 'Carte des pays d’origine et des sites fournisseurs.',
        csv: { type: 'Type de document', expected: 'Attendus' },
    },
    en: {
        expected: 'Expected certificates',
        expectedHelp: 'Document types whose label contains "certificate", one per supplier concerned.',
        valid: 'Valid certificates',
        outOf: '/ {total}',
        origins: 'Declared origins',
        surveys: 'CSR questionnaires',
        notWired: 'beCPG does not expose this information to the portal yet.',
        byType: 'Compliance by document type',
        byTypeAria: 'Document status by type',
        byTypeHelp: 'For each document type, one status per supplier concerned: the least favourable of its documents.',
        map: 'Supply origins',
        mapEmpty: 'Map of the countries of origin and of the supplier sites.',
        csv: { type: 'Document type', expected: 'Expected' },
    },
});

/** Height of one document type row in the stacked bar chart, in px. */
const ROW_HEIGHT = 30;
/** Chart height around the rows: axis and margins. */
const CHART_CHROME = 70;
/** Longest document type label on the axis, in px, before it is cut. */
const AXIS_LABEL_WIDTH = 180;

/** Statuses that count a certificate as valid. */
const VALID_STATUSES = Object.freeze(['valid', 'expiring']);
/** The split of the valid-certificates card: the valid ones, then what stands in their way. */
const CERTIFICATE_PARTS = Object.freeze(['toValidate', 'missing', 'expired', 'refused']);

function CertificateKpis({ documents, local, words, lang }) {
    const certificates = documents.available ? documents.certificates : null;
    const known = certificates?.available === true;
    const counts = known ? certificates.counts : null;
    const valid = known ? VALID_STATUSES.reduce((sum, status) => sum + (counts[status] || 0), 0) : null;
    return (
        <>
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="workspace_premium"
                label={local.expected}
                value={known ? certificates.expected : null}
                help={local.expectedHelp}
                hint={known ? certificates.types.map((type) => `${type.label} ${figure(type.expected, lang)}`).join(' · ') : null}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="task_alt"
                label={local.valid}
                value={valid}
                unit={known ? fill(local.outOf, { total: figure(certificates.expected, lang) }) : undefined}
                parts={known ? [
                    { key: 'valid', tone: DOCUMENT_TONES.valid, label: words.documents.valid, value: valid },
                    ...CERTIFICATE_PARTS.map((status) => ({
                        key: status, tone: DOCUMENT_TONES[status], label: words.documents[status], value: counts[status] || 0,
                    })),
                ] : undefined}
            />
            {[['public', local.origins], ['quiz', local.surveys]].map(([icon, label]) => (
                <KpiCard
                    key={icon}
                    className="col-span-12 sm:col-span-6 xl:col-span-3"
                    icon={icon}
                    label={label}
                    value={null}
                    help={local.notWired}
                    hint={<SoonPill />}
                />
            ))}
        </>
    );
}

function DocumentTypesCard({ documents, local, words }) {
    const types = useMemo(() => (documents.available ? documents.types : []), [documents]);
    const rows = useMemo(() => [...types].reverse(), [types]);
    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
        grid: { left: 10, right: 20, top: 10, bottom: 10, containLabel: true },
        xAxis: axisStyle(palette, { type: 'value', minInterval: 1 }),
        yAxis: axisStyle(palette, {
            type: 'category', data: rows.map((type) => type.label), splitLine: { show: false },
            axisLabel: { color: palette.muted, width: AXIS_LABEL_WIDTH, overflow: 'truncate' },
        }),
        series: DOCUMENT_STATUSES.map((status) => ({
            name: words.documents[status],
            type: 'bar',
            stack: 'documents',
            barWidth: 16,
            data: rows.map((type) => type.counts[status] || 0),
            itemStyle: { color: palette[DOCUMENT_TONES[status]] },
        })),
    }), [rows, words]);
    const exportTypes = () => saveCsv('document-types', [
        { key: 'label', label: local.csv.type },
        { key: 'expected', label: local.csv.expected },
        ...DOCUMENT_STATUSES.map((status) => ({ key: status, label: words.documents[status], get: (row) => row.counts[status] })),
    ], types);

    return (
        <ChartCard
            icon="stacked_bar_chart"
            title={local.byType}
            help={local.byTypeHelp}
            className="col-span-12 xl:col-span-8"
            actions={(
                <>
                    {documents.truncated ? <WindowPill /> : null}
                    <ExportButton onClick={exportTypes} disabled={types.length === 0} />
                </>
            )}
        >
            {types.length > 0 ? (
                <>
                    <Legend items={DOCUMENT_STATUSES.map((status) => ({ key: status, tone: DOCUMENT_TONES[status], label: words.documents[status] }))} />
                    <CockpitChart build={build} height={rows.length * ROW_HEIGHT + CHART_CHROME} label={local.byTypeAria} />
                </>
            ) : (
                <BlockUnavailable reason={documents.available ? 'noData' : documents.reason} />
            )}
        </ChartCard>
    );
}

function OriginsMapCard({ local }) {
    return (
        <Card icon="map" title={local.map} animate={false} className="col-span-12 xl:col-span-4" actions={<SoonPill />}>
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-1.5 text-center text-sm text-[var(--becpg-muted)]">
                <Icon name="public" size={28} className="text-[var(--becpg-blue-light)]" />
                <span>{local.mapEmpty}</span>
                <span className="text-xs">{local.notWired}</span>
            </div>
        </Card>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.data the `/monitor/cockpit` payload
 */
export function CsrTab({ data }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const words = useVocabulary();
    return (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
            <CertificateKpis documents={data.documents} local={local} words={words} lang={lang} />
            <DocumentTypesCard documents={data.documents} local={local} words={words} />
            <OriginsMapCard local={local} />
        </div>
    );
}
