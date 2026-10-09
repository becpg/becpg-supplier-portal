/**
 * Names the browser tab of `/company`; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.company');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function CompanyLayout({ children }) {
    return children;
}
