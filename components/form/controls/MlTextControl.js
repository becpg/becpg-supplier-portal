'use client';

/**
 * `d:mltext` — one value per language.
 *
 * A multilingual property is not a string: in the repository it is an `MLText`,
 * a map of locale → text, and a supplier who fills only the French box has not
 * filled the English one. Rendering it as a single input is how a translation
 * gets silently overwritten, so the control shows what it really is.
 *
 * Layout, in one line: **the current language first, the others folded**. The
 * language the user works in is always the first box, editable straight away;
 * the other languages are one tap away behind a counter. That keeps a form of
 * twenty multilingual fields readable on a 360px screen while never hiding the
 * fact that translations exist.
 *
 * **In a datalist cell the same control is one line tall.** The first box and
 * the disclosure share a `becpg-ml-primary` wrapper; `app/globals.css` lays
 * that wrapper out as a row inside `.becpg-grid` and shrinks the disclosure to
 * the grid's 26px icon, so a multilingual column costs the row nothing. Opening
 * the other languages still grows the row — deliberately, and only while they
 * are open, which is the idiom the grid already uses for a focused textarea.
 *
 * Value in: a `{ locale: text }` map, or a plain string — which is read as the
 * current language, because that is what a repository upgrade or a legacy
 * import produces. Value out: **always** a map, which
 * `lib/adapters/forms.js#toFormValue` serialises for the form processor.
 *
 * The list of languages comes from the definition when it says something
 * (`locales` / `languages` control parameters), from the **content locale
 * policy** of the sheet otherwise, and always includes every locale the value
 * already carries — a language nobody configured but somebody translated must
 * not disappear.
 *
 * That policy is `contentLocales`, resolved server-side and published on the
 * wizard state: the catalogue bound to the assistant when it declares languages,
 * the repository's own `$supportedLocales` otherwise (`lib/adapters/contentLocales.js`).
 * It replaces what used to be the last resort here — `SUPPORTED_LANGS`, i.e. the
 * two languages the portal's **chrome** is translated into. Those two are a
 * property of this application; they were never a statement about what a
 * customer expects a supplier to write, and a supplier shipping to Italy simply
 * could not enter Italian. Measured on dev.becpg.fr the 11/08: the repository
 * declares 27 locales, the portal offered 2.
 *
 * `SUPPORTED_LANGS` remains the floor for the case where nothing answered at
 * all — degrading to zero language box would be worse than degrading to the one
 * the user is reading in.
 */

import { useState } from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { SUPPORTED_LANGS } from '@/config/messages';
import { useContentLocales } from '@/components/form/ContentLocalesProvider';
import { controlParams, lengthBounds, toNumber } from '@/components/form/validation';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

const LABELS = {
    fr: { more: '{count} autre(s) langue(s)', less: 'Masquer les autres langues' },
    en: { more: '{count} other language(s)', less: 'Hide the other languages' },
};

/**
 * Normalises any value into a `{ locale: text }` map.
 *
 * @param {*} value
 * @param {string} lang the current language, used when the value is a bare string
 * @returns {Object<string, string>}
 */
export function toLocaleMap(value, lang) {
    if (value === null || value === undefined || value === '') {
        return {};
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        if ('value' in value) {
            return toLocaleMap(value.value, lang);
        }
        const map = {};
        for (const [locale, text] of Object.entries(value)) {
            if (text !== null && text !== undefined) {
                map[locale] = String(text);
            }
        }
        return map;
    }
    const text = String(value);
    if (text.startsWith('{')) {
        try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return toLocaleMap(parsed, lang);
            }
        }
        catch {
            // A sentence that happens to start with a brace.
        }
    }
    return { [lang]: text };
}

/**
 * The languages to offer, current one first.
 *
 * @param {Object} field
 * @param {Object} valueMap
 * @param {string} lang
 * @param {string[]|null} [policy] the sheet's content locales — see the module
 *        comment; `null` keeps the previous behaviour rather than inventing one
 * @returns {string[]}
 */
export function localesFor(field, valueMap, lang, policy = null) {
    const params = controlParams(field);
    const declared = params.locales || params.languages;
    const fallback = Array.isArray(policy) && policy.length > 0 ? policy : SUPPORTED_LANGS;
    const configured = Array.isArray(declared)
        ? declared.map((entry) => String(entry))
        : typeof declared === 'string'
          ? declared.split(',').map((entry) => entry.trim()).filter(Boolean)
          : fallback;

    const all = [...configured, ...Object.keys(valueMap || {})];
    const seen = new Set();
    const unique = [];
    for (const locale of all) {
        const key = String(locale);
        if (key && !seen.has(key)) {
            seen.add(key);
            unique.push(key);
        }
    }

    const isCurrent = (locale) => String(locale).toLowerCase().replace('-', '_').startsWith(lang);
    const current = unique.filter(isCurrent);
    const others = unique.filter((locale) => !isCurrent(locale));
    return [...current, ...others];
}

/**
 * Le code drapeau d'une locale — **la règle de beCPG Share, à l'identique**.
 *
 * `form.lib.ftl#renderLocaleImage` prend les caractères 3 et 4 quand la locale
 * porte un `_` (donc le PAYS : `en_US` → `us`), et les deux premiers sinon
 * (donc la LANGUE : `fr` → `fr`). Reprendre exactement cette règle garantit
 * qu'un fournisseur voit le même drapeau dans Share et dans le portail — les
 * images viennent d'ailleurs du même jeu, recopié dans `public/theme/images/flags`.
 *
 * @param {string} locale
 * @returns {string} un code de fichier, sans extension
 */
export function flagCode(locale) {
    const value = String(locale || '').replace('-', '_');
    const parts = value.split('_');
    return (parts.length > 1 ? parts[1] : parts[0]).toLowerCase().slice(0, 2);
}

/**
 * Le code affiché sur la pastille : **la locale entière**, pas ses deux premières
 * lettres.
 *
 * `slice(0, 2)` rendait `en`, `en_US` et `en_AU` tous les trois « EN » : trois
 * cases identiques, et aucun moyen de savoir laquelle remplir. Signalé le 12/08.
 *
 * @param {string} locale
 * @returns {string}
 */
export function localeTag(locale) {
    return String(locale || '').replace('_', '-').toUpperCase();
}

/**
 * A human name for a locale code, with the code as the fallback.
 *
 * @param {string} locale
 * @param {string} lang
 * @returns {string}
 */
export function localeName(locale, lang) {
    const code = String(locale).replace('_', '-');
    try {
        const name = new Intl.DisplayNames([lang], { type: 'language' }).of(code);
        if (name && name.toLowerCase() !== code.toLowerCase()) {
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
    }
    catch {
        // Intl.DisplayNames is unavailable or the code is not a language tag.
    }
    return code.toUpperCase();
}

/**
 * One language box.
 *
 * @param {Object} props
 */
function LocaleInput({ locale, lang, text, rows, maxLength, invalid, onChange, id, autoFocus }) {
    const name = localeName(locale, lang);
    const shared = {
        id,
        value: text,
        onChange: (event) => onChange(event.target.value),
        maxLength,
        invalid,
        'aria-label': name,
        autoFocus,
    };
    return (
        <div className="becpg-ml-locale flex items-start gap-2">
            {/*
              * The language of the box, as a chip.
              *
              * It is hidden inside a datalist cell (`app/globals.css`), where the
              * column header already names the field and only one box is shown at
              * rest — but never removed from the accessibility tree: the input
              * carries `aria-label={name}`, so the language is announced whether
              * or not the chip is painted.
              */}
            <span
                className="becpg-ml-tag mt-2 flex w-16 shrink-0 items-center gap-1 text-xs font-medium uppercase text-[var(--becpg-dark-grey)]"
                title={name}
            >
                {/* Le drapeau ne remplace pas le code, il l'accompagne : il ne
                    distingue pas `en` de `en_GB`, et il n'est lu par aucun
                    lecteur d'écran (l'input porte déjà `aria-label={name}`). */}
                <Image
                    src={`/theme/images/flags/${flagCode(locale)}.png`}
                    alt=""
                    width={16}
                    height={11}
                    aria-hidden="true"
                    className="shrink-0"
                    onError={(event) => {
                        // Une locale sans drapeau dans le jeu : le code seul
                        // reste lisible, une icône cassée ne l'est pas.
                        event.currentTarget.style.visibility = 'hidden';
                    }}
                />
                <span className="truncate">{localeTag(locale)}</span>
            </span>
            <div className="min-w-0 flex-1">
                {rows ? <Textarea rows={rows} {...shared} /> : <Input type="text" autoComplete="off" {...shared} />}
            </div>
        </div>
    );
}

/**
 * @param {import('./index').ControlProps} props
 */
export function MlTextControl({
    field,
    value,
    displayValue,
    onChange,
    readOnly = false,
    error,
    id,
    lang = 'fr',
    invalid = false,
    // Context props of the contract: never DOM attributes, so they are
    // consumed here rather than forwarded with `...rest`.
    values,
    formId,
    itemType,
    listId,
    entityNodeRef,
    ...rest
}) {
    const [expanded, setExpanded] = useState(false);
    const labels = LABELS[lang] || LABELS.fr;

    const map = toLocaleMap(value, lang);
    const locales = localesFor(field, map, lang, useContentLocales());

    if (readOnly) {
        return <ReadOnlyControl field={field} value={value} displayValue={displayValue} lang={lang} id={id} />;
    }

    const params = controlParams(field);
    const configuredRows = toNumber(params.rows);
    const rows = configuredRows === null ? 0 : Math.max(2, Math.min(20, Math.round(configuredRows)));
    const maxLength = lengthBounds(field).max;

    const primary = locales[0];
    const others = locales.slice(1);
    const filledOthers = others.filter((locale) => map[locale]).length;

    const setLocale = (locale, text) => {
        const next = { ...map };
        if (text === '') {
            delete next[locale];
        }
        else {
            next[locale] = text;
        }
        onChange(next);
    };

    const toggleLabel = expanded
        ? labels.less
        : labels.more.replace('{count}', String(others.length));

    /*
     * The disclosure sits **with** the first box, not under the whole stack.
     *
     * `becpg-ml-primary` is a column by default, so a full-page form renders
     * exactly what it always did: the current language, then the button, then
     * the other languages once they are opened. Inside a datalist cell
     * `app/globals.css` turns that one wrapper into a row and folds the button
     * down to the grid's 26px icon size — which is the whole of the fix for the
     * 65px row pitch a multilingual column used to impose (see §4.1 of
     * `doc/implementation-status.md`). The rule lives under `min-width: 768px`
     * and under `.becpg-grid`, so the phone layout — where a row is a card and
     * every target is 40px — is untouched by construction.
     */
    return (
        <div id={`${id}-group`} className="becpg-ml flex flex-col gap-2" {...rest}>
            <div className="becpg-ml-primary">
                {primary ? (
                    <LocaleInput
                        id={id}
                        locale={primary}
                        lang={lang}
                        text={map[primary] || ''}
                        rows={rows}
                        maxLength={maxLength === null ? undefined : maxLength}
                        invalid={Boolean(error) || invalid}
                        onChange={(text) => setLocale(primary, text)}
                    />
                ) : null}

                {others.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => setExpanded((open) => !open)}
                        aria-expanded={expanded}
                        // The sentence is on the button itself, not only in the
                        // span: the grid hides the visible text to buy back its
                        // row height, and a `display: none` label is gone from
                        // the accessibility tree too. `title` gives the pointer
                        // user the same sentence as the tooltip.
                        aria-label={toggleLabel}
                        title={toggleLabel}
                        className="becpg-ml-toggle inline-flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs text-[var(--becpg-blue-light)] hover:text-[var(--becpg-orange)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                    >
                        <Icon name={expanded ? 'expand_less' : 'translate'} size={14} />
                        <span className="becpg-ml-toggle-text">{toggleLabel}</span>
                        {!expanded && filledOthers > 0 ? (
                            <span className="becpg-ml-toggle-count rounded-full bg-[var(--becpg-blue-lighter)] px-1.5 text-[10px] text-[var(--becpg-blue)]">
                                {filledOthers}
                            </span>
                        ) : null}
                    </button>
                ) : null}
            </div>

            {others.length > 0 && expanded
                ? others.map((locale) => (
                      <LocaleInput
                          key={locale}
                          id={`${id}-${locale}`}
                          locale={locale}
                          lang={lang}
                          text={map[locale] || ''}
                          rows={rows}
                          maxLength={maxLength === null ? undefined : maxLength}
                          invalid={false}
                          onChange={(text) => setLocale(locale, text)}
                      />
                  ))
                : null}
        </div>
    );
}

MlTextControl.fullWidth = true;
