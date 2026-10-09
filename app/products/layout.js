/**
 * Names the browser tab of `/products` and a product page; renders nothing of its own.
 */

import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('nav.products');

/**
 * @param {{children: React.ReactNode}} props
 * @returns {React.ReactNode}
 */
export default function ProductsLayout({ children }) {
    return children;
}
