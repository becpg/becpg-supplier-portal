/**
 * Names the browser tab of `/messages`; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.messages');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function MessagesLayout({ children }) {
    return children;
}
