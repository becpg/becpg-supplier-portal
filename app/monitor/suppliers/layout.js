/**
 * Names the browser tab of `/monitor/suppliers`; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.monitor.suppliers');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function MonitorSuppliersLayout({ children }) {
    return children;
}
