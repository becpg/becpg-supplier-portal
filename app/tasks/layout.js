/**
 * Names the browser tab of `/tasks` and a task page; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.tasks');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function TasksLayout({ children }) {
    return children;
}
