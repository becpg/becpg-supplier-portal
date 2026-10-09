/**
 * Names the browser tab of `/monitor/products`; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.monitor.products');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function MonitorProductsLayout({ children }) {
    return children;
}
