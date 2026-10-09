/**
 * Names the browser tab of `/specs`; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.specs');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function SpecsLayout({ children }) {
    return children;
}
