'use client';

/**
 * **The input languages of the current sheet**, made available to the
 * multilingual controls.
 *
 * A context rather than a prop passed from hand to hand: `MlTextControl` is the
 * only consumer, it is mounted six levels below the wizard (`Wizard` →
 * `WizardStep` → `FormRenderer` → `FormField` → control), and threading five
 * components with a prop none of them reads is exactly the plumbing this project
 * avoids elsewhere (`ControlProps` already carries five context props, that is
 * enough).
 *
 * The value comes from the server — `wizardState.contentLocales`, resolved by
 * `lib/adapters/contentLocales.js`: the catalogues applying to the sheet when they
 * declare languages, the repository's `$supportedLocales` otherwise.
 *
 * **`source` is what separates an offer from a requirement.** A catalogue naming
 * its languages is the customer stating what it expects; the repository listing
 * what Alfresco can store states nothing about this sheet. So `source: 'catalog'`
 * — and only that — makes the languages *required*, which is what the control is
 * allowed to mark. Marking, never blocking: the portal displays conformity, it
 * does not judge it (spec §4.4.1).
 *
 * **The default is `null`, not a list.** A control mounted outside any sheet has
 * no language policy, and inventing one would assert something about the
 * customer's repository that nobody said. `localesFor()` knows what to do with a
 * `null`: it keeps the behaviour it had.
 */

import { createContext, useContext, useMemo } from 'react';

const ContentLocalesContext = createContext(null);

/**
 * @param {Object} props
 * @param {{locales: string[], source: string}|null} [props.value] the
 *        `contentLocales` payload of the wizard state, as it comes
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function ContentLocalesProvider({ value = null, children }) {
    const locales = value && Array.isArray(value.locales) && value.locales.length > 0
        ? value.locales
        : null;
    const required = value && value.source === 'catalog';

    // Memoised on the joined string: the wizard state is refetched at every step,
    // and a fresh array reference on each render would repaint every multilingual
    // field of the form for nothing.
    const key = locales ? locales.join(',') : '';
    const stable = useMemo(
        () => (key ? { locales: key.split(','), required } : null),
        [key, required],
    );

    return (
        <ContentLocalesContext.Provider value={stable}>
            {children}
        </ContentLocalesContext.Provider>
    );
}

/**
 * The input languages in force, or `null` outside a sheet.
 *
 * @returns {string[]|null}
 */
export function useContentLocales() {
    return useContext(ContentLocalesContext)?.locales ?? null;
}

/**
 * The languages a catalogue **requires**, or `null` when none is asserted.
 *
 * Never the repository's list: what an instance can store is not what a customer
 * asks for, and marking twenty-seven boxes as required would be an invented
 * requirement the supplier would meet as an unexplained wall.
 *
 * @returns {string[]|null}
 */
export function useRequiredLocales() {
    const policy = useContext(ContentLocalesContext);
    return policy && policy.required ? policy.locales : null;
}
