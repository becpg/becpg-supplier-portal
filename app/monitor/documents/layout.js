/**
 * Names the browser tab of `/monitor/documents`; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.monitor.documents');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function MonitorDocumentsLayout({ children }) {
    return children;
}
