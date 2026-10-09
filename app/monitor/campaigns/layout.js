/**
 * Names the browser tab of `/monitor/campaigns`; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.monitor.campaigns');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function MonitorCampaignsLayout({ children }) {
    return children;
}
