'use client';

/**
 * **Les langues de saisie de la fiche courante**, mises à disposition des
 * contrôles multilingues.
 *
 * Un contexte plutôt qu'une propriété passée de main en main : `MlTextControl`
 * est le seul consommateur, il est monté six niveaux sous l'assistant
 * (`Wizard` → `WizardStep` → `FormRenderer` → `FormField` → contrôle), et
 * traverser cinq composants avec une propriété qu'aucun d'eux ne lit est
 * exactement la plomberie que ce projet évite ailleurs (`ControlProps` porte
 * déjà cinq propriétés de contexte, c'est assez).
 *
 * La valeur vient du serveur — `wizardState.contentLocales`, résolu par
 * `lib/adapters/contentLocales.js` : le catalogue lié à l'assistant s'il déclare
 * des langues, les `$supportedLocales` du dépôt sinon.
 *
 * **La valeur par défaut est `null`, pas une liste.** Un contrôle monté hors de
 * tout assistant — une datalist d'une fiche produit, par exemple — n'a pas de
 * politique de langues, et lui en inventer une serait affirmer quelque chose sur
 * le référentiel du client que personne n'a dit. `localesFor()` sait quoi faire
 * d'un `null` : il garde le comportement qu'il avait.
 */

import { createContext, useContext, useMemo } from 'react';

const ContentLocalesContext = createContext(null);

/**
 * @param {Object} props
 * @param {{locales: string[], source: string}|null} [props.value] la charge utile
 *        `contentLocales` de l'état de l'assistant, telle quelle
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function ContentLocalesProvider({ value = null, children }) {
    // Mémoïsé sur le tableau lui-même : l'état de l'assistant est refetché à
    // chaque étape, et une nouvelle référence de tableau à chaque rendu ferait
    // repeindre tous les champs multilingues du formulaire pour rien.
    const locales = value && Array.isArray(value.locales) && value.locales.length > 0
        ? value.locales
        : null;
    const key = locales ? locales.join(',') : '';
    const stable = useMemo(() => (key ? key.split(',') : null), [key]);

    return (
        <ContentLocalesContext.Provider value={stable}>
            {children}
        </ContentLocalesContext.Provider>
    );
}

/**
 * Les langues de saisie en vigueur, ou `null` hors assistant.
 *
 * @returns {string[]|null}
 */
export function useContentLocales() {
    return useContext(ContentLocalesContext);
}
