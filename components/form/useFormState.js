'use client';

/**
 * The state behind a rendered form: values, dirtiness, errors.
 *
 * The wizard's hardest requirement is not rendering — it is **F2, "aucune saisie
 * ne peut être perdue"** (spec §4.4): autosave per section, an "enregistré à
 * HH:MM" indicator, and an exact resume at the step in progress. That is a state
 * problem, so it lives here rather than being re-improvised in every screen.
 *
 * ## Three ideas
 *
 * 1. **The values are keyed by `field.name`** — the prefixed name
 *    (`bcpg:legalName`). Not by `formsName`, not by DOM id: it is the key
 *    `lib/adapters/forms.js#toFormPayload` accepts on the way back, and the one
 *    a human reads in a payload.
 * 2. **Dirtiness is a diff against a baseline**, not a flag set on change. The
 *    baseline moves only when {@link markSaved} confirms a write, so a failed
 *    autosave leaves the field dirty and the next attempt still carries it —
 *    which is exactly what "no input can be lost" means.
 * 3. **`onDirty` is called synchronously with the next values**, not from an
 *    effect. The caller debounces and writes; it never has to reconstruct what
 *    changed. `changes()` gives the minimal payload: only the dirty fields.
 *
 * ```js
 * const form = useFormState({ definition, onDirty: () => scheduleAutosave() });
 * // …later, when the PUT succeeds:
 * form.markSaved();
 * ```
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readValue, validateField, validateForm } from '@/components/form/validation';

/**
 * Stable comparison of two form values. Arrays and `{ locale: text }` maps are
 * compared by content, because a new array with the same entries is not a
 * change the user made.
 *
 * @param {*} left
 * @param {*} right
 * @returns {boolean}
 */
export function sameValue(left, right) {
    if (left === right) {
        return true;
    }
    const emptyLeft = left === null || left === undefined || left === '';
    const emptyRight = right === null || right === undefined || right === '';
    if (emptyLeft || emptyRight) {
        return emptyLeft && emptyRight;
    }
    if (typeof left === 'object' || typeof right === 'object') {
        try {
            return JSON.stringify(left) === JSON.stringify(right);
        }
        catch {
            return false;
        }
    }
    return String(left) === String(right);
}

/**
 * Seeds the value map from the definition and, when given, from an explicit
 * value map.
 *
 * The definition already carries the values when it went through
 * `applyValues` server-side, which is the normal path
 * (`GET /api/v1/wizard/{entityId}/step/{stepId}`). `initialValues` wins when it
 * knows the field.
 *
 * @param {Object} definition
 * @param {Object} [initialValues]
 * @returns {Object} values keyed by `field.name`
 */
export function seedValues(definition, initialValues) {
    const values = {};
    for (const field of definition?.fields || []) {
        if (!field?.name) {
            continue;
        }
        const fromInitial = readValue(initialValues, field);
        values[field.name] = fromInitial.found ? fromInitial.value : (field.value ?? null);
    }
    return values;
}

/**
 * @param {Object} options
 * @param {Object} options.definition the normalised definition
 * @param {Object} [options.initialValues] values that win over the definition's
 * @param {(change: {name: string, value: *, values: Object, dirtyFields: string[]}) => void} [options.onDirty]
 *   called on every change, with the values **after** the change — the autosave hook
 * @param {boolean} [options.validateOnChange=false] re-validate a field as it is edited
 *   (a field is never flagged before it has been touched)
 * @param {string} [options.lang='fr']
 * @returns {Object} the form state and its actions
 *
 * @example
 * const form = useFormState({ definition, onDirty: schedule });
 * <FormRenderer definition={definition} values={form.values} errors={form.errors}
 *               onChange={form.setValue} />
 */
export function useFormState({
    definition,
    initialValues = null,
    onDirty,
    validateOnChange = false,
    lang = 'fr',
} = {}) {
    const [values, setValuesState] = useState(() => seedValues(definition, initialValues));
    const [baseline, setBaseline] = useState(values);
    const [errors, setErrorsState] = useState({});
    const [touched, setTouched] = useState({});

    // The values are read synchronously by the actions, so two changes in the
    // same tick compose instead of overwriting each other. The mirrors are
    // refreshed after every commit — never during a render.
    const valuesRef = useRef(values);
    const baselineRef = useRef(baseline);

    const handlers = useRef({ onDirty, definition, validateOnChange });
    useEffect(() => {
        handlers.current = { onDirty, definition, validateOnChange };
        valuesRef.current = values;
        baselineRef.current = baseline;
    });

    // A new definition is a new form: reseed during render rather than in an
    // effect, the pattern `useApi` uses in `lib/client.js`.
    const [seenDefinition, setSeenDefinition] = useState(definition);
    if (definition !== seenDefinition) {
        setSeenDefinition(definition);
        const seeded = seedValues(definition, initialValues);
        setValuesState(seeded);
        setBaseline(seeded);
        setErrorsState({});
        setTouched({});
    }

    /** Names whose value differs from the last saved state. */
    const dirtyFields = useMemo(
        () =>
            Object.keys(values).filter((name) => !sameValue(values[name], baseline[name])),
        [values, baseline],
    );

    const commit = useCallback((next, changedName) => {
        valuesRef.current = next;
        setValuesState(next);

        const { onDirty: notify } = handlers.current;
        if (notify) {
            const dirty = Object.keys(next).filter(
                (name) => !sameValue(next[name], baselineRef.current[name]),
            );
            notify({
                name: changedName,
                value: changedName ? next[changedName] : undefined,
                values: next,
                dirtyFields: dirty,
            });
        }
    }, []);

    /**
     * Sets one field.
     *
     * The signature matches what `FormRenderer` emits — `(name, value, field)` —
     * so it can be handed over directly as `onChange`.
     */
    const setValue = useCallback(
        (name, value) => {
            if (!name) {
                return;
            }
            const next = { ...valuesRef.current, [name]: value };
            commit(next, name);

            setTouched((current) => (current[name] ? current : { ...current, [name]: true }));

            const { definition: currentDefinition, validateOnChange: live } = handlers.current;
            if (live) {
                const field = (currentDefinition?.fields || []).find((entry) => entry.name === name);
                if (field) {
                    const error = validateField(field, value);
                    setErrorsState((current) => {
                        if (error) {
                            return current[name] === error ? current : { ...current, [name]: error };
                        }
                        if (!current[name]) {
                            return current;
                        }
                        const copy = { ...current };
                        delete copy[name];
                        return copy;
                    });
                }
            }
        },
        [commit],
    );

    /** Sets several fields at once — an AI suggestion applied, a bulk fill. */
    const setValues = useCallback(
        (patch) => {
            if (!patch || typeof patch !== 'object') {
                return;
            }
            commit({ ...valuesRef.current, ...patch }, null);
            setTouched((current) => {
                const next = { ...current };
                for (const name of Object.keys(patch)) {
                    next[name] = true;
                }
                return next;
            });
        },
        [commit],
    );

    /**
     * The minimal payload: only what changed since the last save.
     *
     * @returns {Object}
     */
    const changes = useCallback(
        () =>
            Object.fromEntries(
                Object.keys(valuesRef.current)
                    .filter((name) => !sameValue(valuesRef.current[name], baselineRef.current[name]))
                    .map((name) => [name, valuesRef.current[name]]),
            ),
        [],
    );

    /**
     * Confirms a successful write: the current values become the new baseline
     * and the form is clean again.
     *
     * @param {string[]} [names] confirm only these fields (a partial save)
     */
    const markSaved = useCallback((names) => {
        const next = names
            ? { ...baselineRef.current, ...Object.fromEntries(names.map((name) => [name, valuesRef.current[name]])) }
            : { ...valuesRef.current };
        baselineRef.current = next;
        setBaseline(next);
    }, []);

    /**
     * Back to a known state. Without an argument, back to the last saved values.
     *
     * @param {Object} [nextValues]
     */
    const reset = useCallback((nextValues) => {
        const next = nextValues ? { ...nextValues } : { ...baselineRef.current };
        valuesRef.current = next;
        baselineRef.current = next;
        setValuesState(next);
        setBaseline(next);
        setErrorsState({});
        setTouched({});
    }, []);

    /**
     * Validates the whole form and stores the result.
     *
     * @param {Object} [options] forwarded to `validateForm`
     * @returns {{valid: boolean, errors: Object}}
     */
    const validate = useCallback((options) => {
        const result = validateForm(handlers.current.definition, valuesRef.current, options);
        setErrorsState(result.errors);
        return result;
    }, []);

    const setErrors = useCallback((next) => {
        setErrorsState(next && typeof next === 'object' ? next : {});
    }, []);

    const clearError = useCallback((name) => {
        setErrorsState((current) => {
            if (!current[name]) {
                return current;
            }
            const copy = { ...current };
            delete copy[name];
            return copy;
        });
    }, []);

    return {
        values,
        baseline,
        errors,
        touched,
        dirtyFields,
        isDirty: dirtyFields.length > 0,
        isValid: Object.keys(errors).length === 0,
        lang,
        setValue,
        setValues,
        changes,
        markSaved,
        reset,
        validate,
        setErrors,
        clearError,
    };
}
