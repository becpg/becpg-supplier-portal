'use client';

/**
 * **Which field — and which language — the user asked to be taken to.**
 *
 * The conformity step lists the fields a catalogue reports missing, and a
 * multilingual one is missing *per language*: `bcpg:legalName (EN)` is a real
 * entry, distinct from the same field in German. Clicking it lands on the form
 * step, and `FormStep` scrolls to the field — but the English box of an
 * `MlTextControl` is folded behind the disclosure and is not even mounted, so the
 * supplier arrives on the field it already filled and reads it as a false alarm.
 *
 * The control is the only component that can open its own disclosure, so it is
 * the control that must hear the request. A context rather than a prop for the
 * same reason as `ContentLocalesProvider`: the five components in between have no
 * use for it.
 *
 * **`nonce` is what makes the second click work.** Asking twice for the same
 * field and the same language is a legitimate request — the supplier may have
 * folded the languages back in the meantime — and comparing values alone would
 * make it a no-op.
 */

import { createContext, useContext } from 'react';

const FieldFocusContext = createContext(null);

/**
 * @param {Object} props
 * @param {{field: ?string, locale: ?string, nonce: number}|null} [props.value]
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function FieldFocusProvider({ value = null, children }) {
    return (
        <FieldFocusContext.Provider value={value}>
            {children}
        </FieldFocusContext.Provider>
    );
}

/**
 * The pending focus request, or `null` when nothing was asked.
 *
 * @returns {{field: ?string, locale: ?string, nonce: number}|null}
 */
export function useFieldFocus() {
    return useContext(FieldFocusContext);
}
