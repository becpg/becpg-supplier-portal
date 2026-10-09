'use client';

/**
 * Whether a control is drawn inside a datalist grid cell. A control that needs
 * a different shape there - a checkbox group cannot live in a 33px row - reads
 * it instead of growing a prop every other control would have to ignore.
 */

import { createContext, useContext } from 'react';

export const GridCellContext = createContext(false);

/** @returns {boolean} true inside a datalist grid cell */
export function useInGridCell() {
    return useContext(GridCellContext);
}
