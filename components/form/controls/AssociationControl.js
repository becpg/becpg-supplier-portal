'use client';

/**
 * `association.ftl` — the standard Alfresco association picker.
 *
 * ## Why it is the same widget as the autocomplete
 *
 * Share renders this one as a modal object finder: a dialog, a folder tree, a
 * results table, a "add / remove" pane. That component is a desktop artefact —
 * it is unusable on a phone, and the supplier portal must be completable on a
 * 360px screen (spec §4.3, §4.4).
 *
 * The **data** behind it, however, is exactly the data behind an autocomplete:
 * `lib/adapters/autocomplete.js` accepts the `association` control and, when no
 * `ds` is configured, rebuilds the default beCPG datasource
 * `becpg/autocomplete/targetassoc/associations/{endpointType}` — the very rule
 * `autocomplete-association.ftl` applies. So there is one picker, and this
 * control is that picker with the defaults an association needs:
 *
 * - `multiple` follows `endpointMany` — an association is multi-valued far more
 *   often than a property is;
 * - the stored value is always the **nodeRef** (`saveTitle` is an autocomplete
 *   notion and has no meaning here);
 * - `showTargetLink` / `pageLinkTemplate`, when configured, turn each selected
 *   item into a link to the target entity.
 *
 * Parameters that only describe the Share dialog — `startLocation`,
 * `compactMode`, `displayMode`, `editorAppearance` — are deliberately ignored:
 * there is no dialog to configure.
 */

import { controlParams } from '@/components/form/validation';
import { DatasourcePicker } from '@/components/form/controls/AutocompleteControl';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

/**
 * @param {import('./index').ControlProps} props
 */
export function AssociationControl({ readOnly = false, field, ...props }) {
    if (readOnly) {
        return (
            <ReadOnlyControl
                field={field}
                value={props.value}
                displayValue={props.displayValue}
                lang={props.lang}
                id={props.id}
            />
        );
    }

    const params = controlParams(field);
    const multiple =
        params.multipleSelectMode !== undefined
            ? params.multipleSelectMode === true || params.multipleSelectMode === 'true'
            : Boolean(field?.endpointMany || field?.repeating);

    return <DatasourcePicker field={field} multiple={multiple} {...props} />;
}

AssociationControl.handlesRepeating = true;
