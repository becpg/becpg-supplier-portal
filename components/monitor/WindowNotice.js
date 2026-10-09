'use client';

/**
 * A scan-window warning in the space of a pill: beCPG capped the listing, the
 * figures cover what was read. The full explanation sits in the pill's bubble,
 * so it is said without taking a line of every screen it applies to.
 */

import { Icon } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';

/**
 * @param {Object} props
 * @param {string} props.label the short statement, shown
 * @param {string} props.detail the full explanation, in the bubble
 */
export function WindowNotice({ label, detail }) {
    return (
        <Tooltip content={detail} placement="bottom" maxWidth={340}>
            <span className="pill pill-warn pill-sm pill-no-dot">
                <Icon name="filter_center_focus" size={13} />
                <span>{label}</span>
            </span>
        </Tooltip>
    );
}
