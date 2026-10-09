'use client';

/**
 * The head of the supplier sheet: who the supplier is, its status, its risk and
 * the actions on it. Why the status is what it is reads in the rule ladder below.
 */

import Link from 'next/link';
import { Button, Icon } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { RISK_LEVELS, MonitorActionButtons } from '@/components/monitor/RiskList';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/supplier/SupplierBand#LABELS', {
    fr: {
        erp: 'ERP {code}',
        risk: 'Risque {level} · {score}',
        created: 'Créé le',
        lastActivity: 'Dernière activité',
        startProject: 'Démarrer un projet',
        openInBecpg: 'Ouvrir dans beCPG',
        actions: 'Actions sur le fournisseur',
        parent: 'Rattaché à',
        group: '{count} sous-fournisseur(s)',
    },
    en: {
        erp: 'ERP {code}',
        risk: '{level} risk · {score}',
        created: 'Created on',
        lastActivity: 'Last activity',
        startProject: 'Start a project',
        openInBecpg: 'Open in beCPG',
        actions: 'Supplier actions',
        parent: 'Part of',
        group: '{count} sub-supplier(s)',
    },
});

function Facts({ supplier, local, lang }) {
    const facts = [
        supplier.email ? (
            <a key="email" href={`mailto:${supplier.email}`} className="inline-flex items-center gap-1 font-medium text-[var(--becpg-ink)] hover:underline">
                <Icon name="mail" size={15} className="text-[var(--becpg-muted)]" />
                {supplier.email}
            </a>
        ) : null,
        supplier.createdAt ? (
            <span key="created">{local.created} <b className="font-medium text-[var(--becpg-ink)]">{formatDate(supplier.createdAt, lang)}</b></span>
        ) : null,
        supplier.lastActivity ? (
            <span key="activity">{local.lastActivity} <b className="font-medium text-[var(--becpg-ink)]">{formatDate(supplier.lastActivity, lang)}</b></span>
        ) : null,
    ].filter(Boolean);
    if (facts.length === 0) {
        return null;
    }
    return <p className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-[var(--becpg-muted)]">{facts}</p>;
}

/**
 * @param {Object} props
 * @param {Object} props.sheet the `GET /monitor/suppliers/{id}` payload
 * @param {Function} props.onStartProject
 * @param {Function} props.onDone reloads the sheet after an action
 */
export function SupplierBand({ sheet, onStartProject, onDone }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const { supplier, approval, risk } = sheet;
    const level = RISK_LEVELS[risk?.level] || RISK_LEVELS.low;
    const targets = [{
        nodeRef: supplier.nodeRef,
        name: supplier.name,
        code: supplier.code,
        lang: supplier.lang,
        risk: { reasons: (risk?.reasons || []).map(({ code, count }) => ({ code, count })) },
    }];

    return (
        <section
            aria-labelledby="supplier-name"
            className="mb-4 grid grid-cols-1 items-center gap-x-6 gap-y-3.5 rounded-2xl border border-[var(--becpg-line)] bg-white p-4 shadow-[var(--becpg-shadow-raised)] sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto]"
        >
            <div className="min-w-0">
                <h1 id="supplier-name" className="flex flex-wrap items-baseline gap-x-2.5 text-xl font-medium text-[var(--becpg-ink)] sm:text-[1.375rem]">
                    <span className="min-w-0 break-words">{supplier.name}</span>
                    <small className="text-[0.8125rem] font-normal text-[var(--becpg-muted)]">
                        {[supplier.code, supplier.erpCode ? fill(local.erp, { code: supplier.erpCode }) : null].filter(Boolean).join(' · ')}
                    </small>
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusPill status={approval.status} label={approval.statusLabel} size="sm" />
                    <span className={`pill pill-sm pill-no-dot pill-${level.tone}`}>
                        <Icon name={level.icon} size={13} />
                        <span>{fill(local.risk, { level: pickLabels(level, lang), score: risk?.score ?? 0 })}</span>
                    </span>
                    {supplier.state ? <StatusPill status={supplier.state} size="sm" /> : null}
                    {supplier.parent ? (
                        <Link
                            href={`/monitor/suppliers/${encodeURIComponent(supplier.parent.nodeRef)}`}
                            className="pill pill-sm pill-no-dot pill-neutral hover:underline"
                        >
                            <Icon name="subdirectory_arrow_right" size={13} />
                            <span>{local.parent} {supplier.parent.label || supplier.parent.nodeRef}</span>
                        </Link>
                    ) : null}
                    {sheet.subSuppliers?.length > 0 ? (
                        <span className="pill pill-sm pill-no-dot pill-neutral">
                            <Icon name="account_tree" size={13} />
                            <span>{fill(local.group, { count: sheet.subSuppliers.length })}</span>
                        </span>
                    ) : null}
                    {[supplier.family, supplier.subFamily].filter((entry) => entry?.label).map((entry) => (
                        <span key={entry.nodeRef || entry.label} className="pill pill-sm pill-no-dot pill-info">{entry.label}</span>
                    ))}
                </div>
                <Facts supplier={supplier} local={local} lang={lang} />
            </div>

            <div role="group" aria-label={local.actions} className="flex flex-wrap gap-2 lg:justify-end">
                <MonitorActionButtons targets={targets} allowed={sheet.actions} size="md" onDone={onDone} />
                <Button variant="primary" icon="rocket_launch" onClick={onStartProject}>{local.startProject}</Button>
                {sheet.links?.becpg ? (
                    <Button variant="outline" icon="open_in_new" href={sheet.links.becpg} external>{local.openInBecpg}</Button>
                ) : null}
            </div>

        </section>
    );
}
