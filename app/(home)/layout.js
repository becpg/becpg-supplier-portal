/**
 * Names the browser tab of the dashboard; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.dashboard');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function HomeLayout({ children }) {
    return children;
}
