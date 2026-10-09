/**
 * Names the browser tab of `/monitor/quality`; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.monitor.quality');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function MonitorQualityLayout({ children }) {
    return children;
}
