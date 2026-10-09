'use client';

/**
 * The open non-conformities a customer recorded against the supplier's records.
 *
 * Shown so the supplier knows they exist; they are treated by the customer, by
 * mail or another channel, not in the portal — so a row opens nothing.
 */

import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NcStatePill, ncPriorityLabel } from '@/components/monitor/NonConformityList';
import { useMessages } from '@/lib/messages';
import { formatDate } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LOCAL = defineLabels('components/dashboard/NonConformityCard#LOCAL', {
    fr: {
        title: 'Non-conformités en cours',
        hint: 'Enregistrées par votre client. Il revient vers vous pour leur traitement.',
        declared: 'Déclarée le {date}',
        priority: 'Priorité {level}',
    },
    en: {
        title: 'Open non-conformities',
        hint: 'Recorded by your customer, who will contact you about their treatment.',
        declared: 'Reported on {date}',
        priority: 'Priority {level}',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

/**
 * @param {Object} props
 * @param {Array<Object>|null} props.nonConformities `listMyNonConformities()`;
 *        nothing is rendered when there are none, or when they could not be read
 * @param {number} [props.index]
 */
export function NonConformityCard({ nonConformities, index = 0 }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);
    if (!nonConformities || nonConformities.length === 0) {
        return null;
    }
    return (
        <Card
            icon="report"
            title={<span className="inline-flex items-center gap-2">{local.title}<span className="pill pill-sm pill-no-dot pill-warn tabular-nums">{nonConformities.length}</span></span>}
            subtitle={local.hint}
            index={index}
        >
            <ul className="flex flex-col">
                {nonConformities.map((nc) => (
                    <li key={nc.nodeRef} className="flex items-start gap-2.5 border-b border-[var(--becpg-line)] py-2.5 last:border-0">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--status-warn-bg)] text-[var(--status-warn)]">
                            <Icon name="report" size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium text-[var(--becpg-ink)]">{nc.name}</span>
                                <NcStatePill state={nc.state} lang={lang} />
                            </p>
                            {nc.description ? <p className="mt-0.5 line-clamp-2 text-sm text-[var(--becpg-dark-grey)]">{nc.description}</p> : null}
                            <p className="mt-0.5 text-xs text-[var(--becpg-muted)]">
                                {[
                                    nc.product,
                                    nc.createdAt ? fill(local.declared, { date: formatDate(nc.createdAt, lang) }) : null,
                                    ncPriorityLabel(nc.priority, lang) ? fill(local.priority, { level: ncPriorityLabel(nc.priority, lang) }) : null,
                                ].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
