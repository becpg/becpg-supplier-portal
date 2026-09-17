'use client';

/**
 * **The label line of a field, lent to its control.**
 *
 * A control owns state the chrome cannot compute — how many required languages
 * are still empty, which language the box being typed into is — and that state
 * belongs *beside the label*, not under the input: on a form of twenty fields,
 * an indicator sitting below the box reads as a comment on the value rather
 * than as part of the field, and it pushes every row apart.
 *
 * Passing it up as a prop would mean threading it through `FormRenderer`,
 * `FieldRenderer` and `Field` — three components that have no business knowing
 * about multilingual text. So `Field` publishes the DOM node of its label row
 * here, and a control renders into it with a portal: the markup lands in the
 * label line, the state stays in the control, and a control rendered outside a
 * `Field` (a datalist cell) sees `null` and keeps its own layout.
 *
 * `null` is therefore a supported value and the default, not an error.
 */

import { createContext, useContext } from 'react';

const FieldHeaderSlotContext = createContext(null);

/** @type {React.Provider<HTMLElement|null>} */
export const FieldHeaderSlotProvider = FieldHeaderSlotContext.Provider;

/**
 * The label row of the surrounding field, or `null` outside one.
 *
 * @returns {HTMLElement|null}
 */
export function useFieldHeaderSlot() {
    return useContext(FieldHeaderSlotContext);
}
