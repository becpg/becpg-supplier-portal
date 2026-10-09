'use client';

/**
 * The review becpg-ai left on a document (`bcpg:aiValidationHints`), drawn as a
 * list of checks rather than as the HTML report it arrives as.
 *
 * The report is rendered by becpg-ai's own template (`document-review.ftl`):
 * each check is a `.validation-item` whose class carries its status, with the
 * field name, a status label, a confidence and a detail. Those are read out and
 * shown with the portal's icons; the emojis and the « PRESENT 100% » run-on of
 * the raw report go. Whatever the report holds beyond the checks — a spelling
 * section, a competitive review — keeps its markup, so nothing is lost.
 */

import { useMemo } from 'react';
import { Icon } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';

/** Status class of `document-review.ftl` → the icon and tone of the check. */
const STATUS = {
    'status-compliant': { icon: 'check_circle', tone: 'text-[var(--status-ok)]', rank: 2 },
    'status-found': { icon: 'check_circle', tone: 'text-[var(--status-ok)]', rank: 2 },
    'status-not-found': { icon: 'warning', tone: 'text-[var(--status-warn)]', rank: 1 },
    'status-non-compliant': { icon: 'cancel', tone: 'text-[var(--status-danger)]', rank: 0 },
};

const UNKNOWN = { icon: 'help_outline', tone: 'text-[var(--becpg-dark-grey)]', rank: 1 };

const text = (node) => (node ? node.textContent.replace(/\s+/g, ' ').trim() : '');

/**
 * The checks of a review report, problems first, and what is left of it.
 *
 * @param {string} html `bcpg:aiValidationHints`
 * @returns {{checks: Array<{name: string, status: string, label: string, details: string}>, rest: string}}
 */
export function parseReviewReport(html) {
    if (typeof DOMParser === 'undefined' || !html) {
        return { checks: [], rest: html || '' };
    }
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const items = [...doc.querySelectorAll('.validation-item')];
    const checks = items.map((item) => {
        const status = Object.keys(STATUS).find((name) => item.classList.contains(name)) || '';
        return {
            name: text(item.querySelector('.validation-header strong')),
            status,
            label: text(item.querySelector('.status-badge')),
            details: text(item.querySelector('.validation-details')),
        };
    }).filter((check) => check.name)
        .sort((left, right) => (STATUS[left.status] || UNKNOWN).rank - (STATUS[right.status] || UNKNOWN).rank);
    doc.querySelectorAll('.overall-state, .validation-results, style').forEach((node) => node.remove());
    const rest = text(doc.body) ? doc.body.innerHTML : '';
    return { checks, rest };
}

/**
 * @param {Object} props
 * @param {string} props.hints `bcpg:aiValidationHints`
 */
export function AiReviewReport({ hints }) {
    const { checks, rest } = useMemo(() => parseReviewReport(hints), [hints]);
    if (checks.length === 0) {
        return <RichText value={hints} className="flex flex-col gap-1 break-words text-xs leading-relaxed text-[var(--becpg-dark-grey)]" />;
    }
    return (
        <div className="flex flex-col gap-2">
            <ul className="flex flex-col divide-y divide-[var(--becpg-line)] rounded-lg border border-[var(--becpg-line)] bg-white">
                {checks.map((check) => {
                    const status = STATUS[check.status] || UNKNOWN;
                    return (
                        <li key={`${check.name}-${check.status}`} className="flex items-start gap-2 px-3 py-2">
                            <Icon name={status.icon} size={16} className={`mt-0.5 shrink-0 ${status.tone}`} />
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                                    <span className="font-medium text-[var(--becpg-ink)]">{check.name}</span>
                                    {check.label ? <span className={`text-xs ${status.tone}`}>{check.label}</span> : null}
                                </p>
                                {check.details ? <p className="text-xs text-[var(--becpg-dark-grey)]">{check.details}</p> : null}
                            </div>
                        </li>
                    );
                })}
            </ul>
            {rest ? <RichText value={rest} className="flex flex-col gap-1 break-words text-xs leading-relaxed text-[var(--becpg-dark-grey)]" /> : null}
        </div>
    );
}
