'use client';

/**
 * The two readings of the supplier dashboard under the KPI row: what is to be
 * done, then the follow-up charts. The cockpit's own tab bar, so both spaces
 * switch views the same way.
 *
 * Always opens on « À traiter »: the page is rendered on the server, and a tab
 * restored from browser storage would differ from the server's markup.
 */

import { CockpitTabs } from '@/components/monitor/cockpit/CockpitTabs';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LOCAL = defineLabels('components/dashboard/DashboardTabs#LOCAL', {
    fr: { label: 'Mon tableau de bord', todo: 'À traiter', followUp: 'Suivi' },
    en: { label: 'My dashboard', todo: 'To do', followUp: 'Follow-up' },
});

/**
 * @param {Object} props
 * @param {React.ReactNode} props.todo the lists to act on
 * @param {React.ReactNode} props.followUp the charts
 * @param {number} [props.todoCount] open items, shown on the tab
 */
export function DashboardTabs({ todo, followUp, todoCount = 0 }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);
    const tabs = [
        {
            id: 'todo',
            icon: 'checklist',
            label: local.todo,
            badge: todoCount > 0 ? <span className="pill pill-sm pill-no-dot pill-warn tabular-nums">{todoCount}</span> : null,
            render: () => todo,
        },
        { id: 'followUp', icon: 'insights', label: local.followUp, render: () => followUp },
    ];
    return <CockpitTabs tabs={tabs} label={local.label} storageKey={null} />;
}
