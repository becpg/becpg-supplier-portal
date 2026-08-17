'use client';

/**
 * `/help` — the last supplier screen of spec §4.2, and the only one that had
 * never been built: the nav pointed at it and the route did not exist.
 *
 * ## What it is
 *
 * Reference material about *this* portal, mobile first: nine topics, all
 * collapsed by default so the whole map fits on a phone screen, each one
 * addressable by URL (`/help#wizard`, `/help?topic=documents`) so any screen can
 * link to the paragraph that explains it. That is the "contextual" part — the
 * in-*context* help stays where it belongs, in the wizard's `HelpPanel`, which
 * answers "what does my customer expect on *this* sheet"; this page answers "how
 * does this portal work".
 *
 * ## Why the content is data and not prose in JSX
 *
 * Every topic is a `{ id, icon, title, summary, blocks }` record and every block
 * is one of six shapes (`p`, `ul`, `ol`, `note`, `warn`, `links`).
 * Adding a paragraph is editing an array, not editing markup, and the renderer
 * guarantees that all topics look alike. Markdown was considered and dropped:
 * `react-markdown` is **not** a dependency of this project (checked in
 * `package.json`), and adding a parser to render text the portal itself owns
 * would buy nothing — while `links` would still need a component.
 *
 * ## Every statement here is checked against the code
 *
 * The wording is deliberately conservative: the 7-day threshold that turns an
 * overdue task red is `NOTIFICATION_CONFIG.taskDangerAfterDays`, the 60-day
 * notice is `DEFAULT_DOCUMENT_CONFIG.noticeDays`, the approval rules are
 * `DEFAULT_APPROVAL_CONFIG.rules`, the confidence buckets are rendered by the
 * wizard's own vocabulary, and the signature paragraph describes what
 * `SignatureFlow` actually does (read tracking, consent, server-side signing).
 * Graduated reminders and internal escalation (spec §4.5, gap 2) are **not**
 * described: they are not built yet, and help that promises a feature is worse
 * than no help.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AppShell } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/components/providers/SessionProvider';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Aide',
        subtitle: 'Comment fonctionne le portail, étape par étape',
        scope: 'Portail fournisseur beCPG',
        search: 'Rechercher dans l’aide',
        expandAll: 'Tout déplier',
        collapseAll: 'Tout replier',
        topics: 'Sommaire',
        noResult: 'Aucune rubrique ne correspond',
        noResultHint: 'Essayez un autre mot : « document », « signature », « étape », « agrément ».',
        anchor: 'Lien vers cette rubrique',
        anchorCopied: 'Lien copié',
        goTo: 'Aller à',
    },
    en: {
        title: 'Help',
        subtitle: 'How the portal works, step by step',
        scope: 'beCPG supplier portal',
        search: 'Search the help',
        expandAll: 'Expand all',
        collapseAll: 'Collapse all',
        topics: 'Contents',
        noResult: 'No topic matches',
        noResultHint: 'Try another word: "document", "signature", "step", "approval".',
        anchor: 'Link to this topic',
        anchorCopied: 'Link copied',
        goTo: 'Go to',
    },
};

/**
 * The content itself. One entry per topic, in reading order.
 *
 * @type {{fr: Array<Object>, en: Array<Object>}}
 */
const TOPICS = {
    fr: [
        {
            id: 'start',
            icon: 'flag',
            title: 'Par où commencer',
            summary: 'Le tableau de bord répond à une seule question : ce qu’on attend de vous, et pour quand.',
            blocks: [
                {
                    p: 'Tout part du tableau de bord. Les quatre cartes du haut résument votre dossier chez ce client :',
                },
                {
                    ul: [
                        '**Statut d’agrément** — Agréé, En cours, À renouveler ou Suspendu, avec la date de validité.',
                        '**Complétude** — le pourcentage de champs attendus déjà renseignés sur vos fiches.',
                        '**Actions requises** — le nombre de tâches ouvertes, et combien sont en retard.',
                        '**Documents** — combien sont valides, combien expirent bientôt, combien manquent.',
                    ],
                },
                {
                    p: 'En dessous, les listes reprennent le détail : vos tâches, vos produits, vos documents, vos discussions et vos notifications. La cloche du bandeau affiche la même liste de notifications depuis n’importe quel écran.',
                },
                {
                    note: 'Un même compte peut travailler pour plusieurs clients beCPG, avec un portail par client. Le logo et le nom du client sont toujours affichés en haut à gauche : c’est ce qui vous dit dans quel dossier vous êtes.',
                },
                {
                    warn: 'Si un bandeau « Instance de TEST » est affiché, vous êtes sur un environnement d’essai : ce que vous saisissez n’a aucune valeur contractuelle.',
                },
                {
                    links: [
                        { href: '/', icon: 'dashboard', label: 'Tableau de bord' },
                        { href: '/tasks', icon: 'assignment_turned_in', label: 'Mes tâches' },
                        { href: '/documents', icon: 'folder_shared', label: 'Mes documents' },
                    ],
                },
            ],
        },
        {
            id: 'tasks',
            icon: 'assignment_turned_in',
            title: 'Comment fonctionne une tâche de référencement',
            summary: 'Une tâche vient d’un projet ouvert par votre client. Son type décide de l’écran sur lequel vous arrivez.',
            blocks: [
                {
                    p: 'Votre client ouvre un projet de référencement, et ce projet vous adresse des tâches. Une tâche porte un titre, le produit concerné, une échéance et un type. Cliquer sur une tâche vous emmène directement sur l’écran qui permet de la faire — il n’y a pas d’écran intermédiaire.',
                },
                {
                    ul: [
                        '**Assistant** — la saisie guidée d’une fiche produit ou de votre fiche fournisseur.',
                        '**Signature** — la lecture d’un document PDF puis sa signature.',
                        '**Document** — le dépôt ou le renouvellement d’un document attendu.',
                        '**Revue** — la relecture d’un produit, sans saisie de votre part.',
                    ],
                },
                {
                    p: 'Une tâche Planifiée ou En cours attend une action de votre part. Une tâche Refusée vous a été renvoyée par votre client avec un motif : relisez la remarque avant de renvoyer. Une tâche Terminée ne demande plus rien.',
                },
                {
                    p: 'Une tâche dont l’échéance est passée est signalée « en retard », dans la liste comme dans les notifications. Au-delà de sept jours de retard, elle passe au rouge.',
                },
                {
                    note: 'Vous pouvez ouvrir et fermer une tâche autant de fois que nécessaire : elle reste ouverte jusqu’à ce que vous la terminiez vous-même. Rien ne se perd entre deux visites.',
                },
                { links: [{ href: '/tasks', icon: 'assignment_turned_in', label: 'Mes tâches' }] },
            ],
        },
        {
            id: 'wizard',
            icon: 'auto_stories',
            title: 'L’ordre des étapes de l’assistant',
            summary: 'Contexte, documents, suggestions, sections, conformité. Une fois visitée, chaque étape reste accessible.',
            blocks: [
                {
                    p: 'L’assistant suit toujours le même ordre. Ce n’est pas un tunnel : dès qu’une étape a été visitée, vous pouvez y revenir librement.',
                },
                {
                    ol: [
                        '**Étape 0 · Contexte** — un panneau toujours visible, qui devient une feuille dépliable sur téléphone. Il contient le cahier des charges applicable, les remarques de votre client, les listes qu’il a déjà validées et les refus précédents. Vous n’avez pas à le traverser : il est là en permanence.',
                        '**Documents** — les types de documents attendus sont affichés explicitement, avec la validité demandée pour chacun. Vous déposez les fichiers ici, par glisser-déposer ou depuis l’appareil photo du téléphone. Cette étape vient en premier : les documents alimentent la suite.',
                        '**Suggestions** — si l’extraction automatique est activée chez votre client, les valeurs lues dans les documents que vous venez de déposer sont proposées ici, chacune avec un badge de confiance (voir la rubrique suivante). Si l’extraction n’est pas activée, l’étape ne s’affiche pas.',
                        '**Sections** — propriétés, questionnaire, ingrédients, nutriments, allergènes, physico-chimie, allégations, microbiologie, organoleptique, matériaux d’emballage… Les sections affichées et leur ordre dépendent du type de produit et de la configuration de votre client : ce n’est pas le portail qui les choisit.',
                        '**Conformité** — la liste des champs encore manquants, cliquables pour y aller directement, et le score de complétion. Si votre client a défini un contrôle bloquant, la finalisation reste indisponible jusqu’à ce qu’il soit satisfait.',
                    ],
                },
                {
                    note: 'Chaque section est enregistrée automatiquement, sans bouton à cliquer. L’indicateur « Enregistré à HH:MM » en haut de l’assistant vous le confirme, et vous reprenez exactement là où vous en étiez si vous fermez le portail, changez d’appareil ou perdez le réseau.',
                },
                {
                    p: 'Entre certaines étapes, votre fiche est recalculée (allergènes, nutriments, coûts…). Ce calcul est lancé en arrière-plan et ne vous bloque jamais : vous pouvez continuer à saisir pendant qu’il tourne.',
                },
                {
                    p: 'Les remarques de votre client sont ancrées au champ ou à la ligne concernée, pas seulement à la tâche : cherchez la bulle de commentaire à côté du champ qu’il vous demande de corriger.',
                },
                {
                    note: 'Si votre interlocuteur saisit à votre place, un bandeau « vous saisissez au nom de … » l’indique explicitement en haut de l’assistant.',
                },
            ],
        },
        {
            /*
             * The two notions look alike — both say "what my customer expects" —
             * and they sit next to each other on screen: the specification is in
             * the Contexte panel, the catalogue in the Conformité step. Nothing
             * told them apart anywhere, while the difference is the one between a
             * text to read and a check that blocks the Terminer button.
             */
            id: 'specs',
            icon: 'menu_book',
            title: 'Cahier des charges et catalogue : quelle différence',
            summary: 'Le cahier des charges se lit. Le catalogue se remplit — et c’est lui qui décide si vous pouvez terminer.',
            blocks: [
                {
                    p: 'Ce sont deux objets différents, et ils ne servent pas au même moment. Le plus simple est de les prendre dans l’ordre où vous les rencontrez.',
                },
                {
                    ul: [
                        '**Le cahier des charges** — un document de votre client, rattaché à un produit ou à une famille de produits. Il énonce ses exigences : matières interdites, origines acceptées, seuils analytiques, conditions de transport, engagements RSE. C’est un **texte de référence**, à lire. Le portail vous le montre dans le panneau « Contexte » de l’assistant, et la rubrique « Cahiers des charges » les rassemble tous.',
                        '**Le catalogue** — une **liste de champs obligatoires** que votre client a définie : « pour qu’une matière première soit référencée chez moi, il me faut l’origine, la densité, le code EAN, l’allergène majeur… ». Ce n’est pas un texte, c’est un contrôle. Le portail le calcule en continu et vous en donne le score dans l’étape « Conformité ».',
                    ],
                },
                {
                    p: 'Autrement dit : le cahier des charges vous dit **ce que votre client attend de votre produit**, le catalogue vérifie **que sa fiche est complète**. On peut être conforme au cahier des charges et avoir une fiche incomplète, et l’inverse.',
                },
                {
                    p: 'Un seul des deux vous empêche de rendre : le catalogue. Quand votre client en a déclaré un bloquant, le bouton « Terminer » reste indisponible tant qu’il manque un champ, et l’étape « Conformité » vous liste précisément lesquels — chaque ligne vous emmène au champ concerné.',
                },
                {
                    note: 'Un cahier des charges peut aussi appeler des documents (un certificat bio, une attestation sans OGM). Ceux-là apparaissent dans « Mes documents » et dans l’étape Documents, avec leur date de validité — pas dans le catalogue.',
                },
                {
                    links: [
                        { href: '/specs', icon: 'menu_book', label: 'Cahiers des charges' },
                        { href: '/documents', icon: 'folder_shared', label: 'Mes documents' },
                    ],
                },
            ],
        },
        {
            id: 'frozen',
            icon: 'lock',
            title: 'Ce que veut dire une liste gelée',
            summary: 'Une liste validée par votre client passe en lecture seule. C’est volontaire, et réversible sur demande.',
            blocks: [
                {
                    p: 'Quand votre client valide une section — la liste des ingrédients, le questionnaire, les allergènes… — cette section est **gelée** : vous la voyez toujours, avec toutes ses valeurs, mais vous ne pouvez plus la modifier. Un cadenas et la mention « Lecture seule » l’indiquent.',
                },
                {
                    p: 'C’est le but : une fois qu’une donnée est validée, elle sert de référence à votre client (étiquetage, cahier des charges, contrôles). Si elle pouvait changer sans qu’il le sache, sa validation ne voudrait plus rien dire.',
                },
                {
                    p: 'Les listes gelées sont rappelées dans le panneau « Contexte » de l’assistant, sous « Listes validées » : c’est le moyen le plus rapide de voir ce qui est acté et ce qui reste ouvert.',
                },
                {
                    warn: 'Vous avez repéré une erreur dans une liste gelée ? Ne créez pas une fiche en double. Demandez la réouverture de la section par la discussion attachée à la fiche : votre client la dégèle, et vous la retrouvez modifiable.',
                },
                {
                    p: 'Une fiche entière peut aussi être en lecture seule pour une autre raison : la tâche est terminée, le projet est clos, ou vous n’avez qu’un accès en consultation. Dans ce cas l’assistant vous dit laquelle de ces raisons s’applique.',
                },
                { links: [{ href: '/messages', icon: 'forum', label: 'Discussions' }] },
            ],
        },
        {
            id: 'confidence',
            icon: 'auto_awesome',
            title: 'Ce que l’IA vous propose',
            summary: 'Des propositions, jamais des valeurs posées à votre place.',
            blocks: [
                {
                    p: 'Quand l’extraction automatique est activée chez votre client, le portail lit vos documents et vous propose les valeurs qu’il y a trouvées. Elles s’affichent dans le panneau « Contexte », à droite de la saisie, et sont relues à chaque changement d’étape.',
                },
                {
                    ul: [
                        '**Appliquer** — la valeur est écrite dans la fiche. Rien ne l’est avant ce clic.',
                        '**Ignorer** — la proposition disparaît de la liste et ne revient pas.',
                        '**Agrandir** — pour les analyses longues, qui ne tiennent pas dans le panneau.',
                    ],
                },
                {
                    note: 'Aucune valeur n’est appliquée automatiquement, quel que soit le degré de certitude de la lecture. C’est vous qui engagez votre fiche : la décision vous revient, champ par champ.',
                },
                {
                    p: 'Dans tous les cas, la valeur finale est la vôtre : vous restez responsable de ce que vous validez, et rien n’est envoyé à votre client avant que vous ne terminiez la tâche.',
                },
            ],
        },
        {
            id: 'documents',
            icon: 'folder_shared',
            title: 'Validité des documents et renouvellement',
            summary: 'Le portail sait quels documents sont attendus, jusqu’à quand ils sont valides, et lesquels manquent.',
            blocks: [
                {
                    p: 'Les documents attendus ne sont pas une liste que vous devinez : votre client les configure (type de document, caractère obligatoire, durée de validité, périmètre d’application), et l’écran « Mes documents » vous les restitue tels quels, produit par produit.',
                },
                {
                    ul: [
                        '**Valide** — fourni, accepté, et sa date de fin de validité n’est pas proche.',
                        '**À renouveler** — la fin de validité arrive dans moins de 60 jours (délai que votre client peut ajuster).',
                        '**Expiré** — la date de fin de validité est passée. Pour un document obligatoire, cela suspend votre agrément.',
                        '**Manquant** — attendu et jamais fourni.',
                        '**Refusé** — fourni, mais refusé par votre client : lisez le motif avant de redéposer.',
                    ],
                },
                {
                    p: 'Chaque document porte une période de validité (début et fin). Selon le type, cette période est saisie par vous à partir des dates du document, ou déduite automatiquement de la date de dépôt et de la durée configurée par votre client.',
                },
                {
                    p: 'Renouveler, c’est déposer une nouvelle version sur la même ligne — jamais créer une seconde ligne. La version précédente reste dans l’historique du document, avec sa période de validité : c’est ce qui permet de prouver que vous étiez couvert à une date passée.',
                },
                {
                    note: 'Le nom du fichier et son rangement n’ont pas d’importance : le portail renomme et classe le document d’après la configuration de votre client. Déposez le fichier tel qu’il vous a été remis.',
                },
                {
                    p: 'Les rappels par e-mail avant expiration sont envoyés par beCPG selon les règles définies par votre client. Le portail, lui, affiche en permanence l’état réel : ne comptez pas sur le mail, la liste « Mes documents » est la référence.',
                },
                { links: [{ href: '/documents', icon: 'folder_shared', label: 'Mes documents' }] },
            ],
        },
        {
            id: 'approval',
            icon: 'verified',
            title: 'Le statut d’agrément',
            summary: 'Calculé en direct à partir de vos documents, de vos fiches et de vos non-conformités. Jamais figé.',
            blocks: [
                {
                    p: 'Le statut affiché sur le tableau de bord n’est pas une décision saisie à la main : il est recalculé à chaque affichage à partir de votre dossier. Corrigez la cause, et il change.',
                },
                {
                    ul: [
                        '**Suspendu** — au moins un document obligatoire est expiré, ou une non-conformité bloquante est ouverte.',
                        '**À renouveler** — au moins un document obligatoire arrive à expiration.',
                        '**En cours** — un projet de référencement est ouvert, ou un document obligatoire n’a jamais été fourni, ou un contrôle bloquant n’est pas satisfait.',
                        '**Agréé** — aucun des cas ci-dessus.',
                    ],
                },
                {
                    p: 'La carte du tableau de bord liste les raisons du statut : chacune est cliquable et vous emmène sur ce qu’il faut corriger.',
                },
                {
                    note: 'Ce même statut est lu par les systèmes d’achat de votre client. Un document obligatoire expiré peut donc bloquer une commande, pas seulement afficher une pastille orange.',
                },
            ],
        },
        {
            id: 'signature',
            icon: 'draw',
            title: 'Comment fonctionne la signature',
            summary: 'On vous demande d’abord de lire, puis de signer. La signature est apposée par beCPG, pas par votre navigateur.',
            blocks: [
                {
                    p: 'Une tâche de type Signature ouvre le document dans une visionneuse intégrée au portail. Le fichier ne quitte jamais le portail et reste accessible sur téléphone.',
                },
                {
                    ol: [
                        '**Lisez le document en entier.** La progression de lecture est suivie page par page : tant qu’une page n’a pas été affichée, la signature reste indisponible.',
                        '**Tracez votre signature** au doigt, à la souris ou au stylet, dans les emplacements prévus par votre client. Les emplacements et les paraphes ont été positionnés en amont : vous n’avez pas à les placer.',
                        '**Cochez la case de consentement**, puis validez. La tâche est envoyée une seule fois.',
                    ],
                },
                {
                    p: 'C’est beCPG qui signe le document sur son serveur, l’archive dans sa version signée et l’envoie aux destinataires. Le portail ne fabrique aucun certificat.',
                },
                {
                    note: 'Si le réseau tombe pendant l’envoi, réessayez : la demande porte un identifiant unique, un envoi arrivé deux fois ne signe pas deux fois. Un document déjà signé s’affiche comme tel, avec son téléchargement, au lieu de vous demander une seconde signature.',
                },
                {
                    warn: 'Une signature ne se refuse pas et ne s’annule pas depuis le portail. Si le document est erroné, ne signez pas : ouvrez la discussion et signalez-le à votre client.',
                },
            ],
        },
        {
            id: 'contact',
            icon: 'support_agent',
            title: 'Qui contacter',
            summary: 'Votre interlocuteur est votre client. La discussion attachée à la fiche est le bon canal.',
            blocks: [
                {
                    p: 'Ce portail vous est ouvert par votre client : c’est lui qui configure les documents attendus, les étapes de l’assistant, les validations et les échéances. Il est donc votre premier interlocuteur pour toute question de contenu.',
                },
                {
                    ul: [
                        '**Une question sur une fiche, une remarque, une correction, une liste à dégeler** — utilisez la discussion attachée à la fiche ou à la tâche. Votre message arrive à la personne qui suit votre dossier, et il reste attaché au produit concerné.',
                        '**Un document refusé sans que le motif soit clair** — répondez dans la discussion du produit avant de redéposer.',
                        '**Une échéance intenable** — dites-le dans la discussion plutôt que de laisser la tâche passer en retard.',
                        '**Un problème d’accès** (mot de passe, collègue à ajouter, compte à fermer) — passez par votre contact chez le client : les comptes sont créés et fermés de son côté, pas depuis ce portail.',
                    ],
                },
                {
                    note: 'Les coordonnées de vos interlocuteurs et de vos contacts déclarés figurent sur votre fiche fournisseur, onglet Contacts.',
                },
                {
                    links: [
                        { href: '/messages', icon: 'forum', label: 'Discussions' },
                        { href: '/company', icon: 'business', label: 'Ma fiche' },
                        { href: '/specs', icon: 'menu_book', label: 'Cahiers des charges' },
                    ],
                },
            ],
        },
    ],
    en: [
        {
            id: 'start',
            icon: 'flag',
            title: 'Where to start',
            summary: 'The dashboard answers a single question: what is expected from you, and by when.',
            blocks: [
                { p: 'Everything starts on the dashboard. The four cards at the top summarise your file with this customer:' },
                {
                    ul: [
                        '**Approval status** — Approved, In progress, To renew or Suspended, with the validity date.',
                        '**Completeness** — the share of expected fields already filled in on your sheets.',
                        '**Required actions** — how many tasks are open, and how many are late.',
                        '**Documents** — how many are valid, how many expire soon, how many are missing.',
                    ],
                },
                {
                    p: 'Below them, the lists carry the detail: your tasks, your products, your documents, your discussions and your notifications. The bell in the header shows the same notification list from any screen.',
                },
                {
                    note: 'One account can work for several beCPG customers, with one portal per customer. The customer logo and name are always shown top left: that is what tells you which file you are in.',
                },
                {
                    warn: 'If a "TEST instance" banner is displayed, you are on a trial environment: nothing you enter there is contractual.',
                },
                {
                    links: [
                        { href: '/', icon: 'dashboard', label: 'Dashboard' },
                        { href: '/tasks', icon: 'assignment_turned_in', label: 'My tasks' },
                        { href: '/documents', icon: 'folder_shared', label: 'My documents' },
                    ],
                },
            ],
        },
        {
            id: 'tasks',
            icon: 'assignment_turned_in',
            title: 'How a referencing task works',
            summary: 'A task comes from a project opened by your customer. Its type decides which screen you land on.',
            blocks: [
                {
                    p: 'Your customer opens a referencing project, and that project sends you tasks. A task carries a title, the product concerned, a due date and a type. Clicking a task takes you straight to the screen that completes it — there is no intermediate page.',
                },
                {
                    ul: [
                        '**Assistant** — guided data entry for a product sheet or for your supplier sheet.',
                        '**Signature** — reading a PDF document, then signing it.',
                        '**Document** — uploading or renewing an expected document.',
                        '**Review** — reading a product through, with nothing to enter.',
                    ],
                },
                {
                    p: 'A Planned or In progress task is waiting for you. A Refused task was sent back by your customer with a reason: read the remark before submitting again. A Completed task needs nothing more.',
                },
                {
                    p: 'A task past its due date is flagged as late, both in the list and in the notifications. Beyond seven days late it turns red.',
                },
                {
                    note: 'You can open and leave a task as often as you need: it stays open until you complete it yourself, and nothing is lost between two visits.',
                },
                { links: [{ href: '/tasks', icon: 'assignment_turned_in', label: 'My tasks' }] },
            ],
        },
        {
            id: 'wizard',
            icon: 'auto_stories',
            title: 'The order of the assistant steps',
            summary: 'Context, documents, suggestions, sections, conformity. Once visited, a step stays reachable.',
            blocks: [
                {
                    p: 'The assistant always follows the same order. It is not a tunnel: as soon as a step has been visited you can go back to it freely.',
                },
                {
                    ol: [
                        '**Step 0 · Context** — a panel that is always visible, and becomes a sheet one tap away on a phone. It holds the applicable specification, your customer’s remarks, the lists already validated and previous rejections. You never walk through it: it is simply always there.',
                        '**Documents** — the expected document types are listed explicitly, each with the validity that is asked for. You drop the files here, by drag and drop or straight from the phone camera. This step comes first: the documents feed everything after it.',
                        '**Suggestions** — if automatic extraction is enabled at your customer, the values read from the documents you just uploaded are proposed here, each with a confidence badge (see the next topic). If extraction is not enabled, the step is not shown.',
                        '**Sections** — properties, questionnaire, ingredients, nutrients, allergens, physico-chemistry, claims, microbiology, organoleptics, packaging materials… Which sections appear, and in which order, depends on the product type and on your customer’s configuration: the portal does not choose them.',
                        '**Conformity** — the list of fields still missing, each clickable to go straight there, plus the completion score. If your customer defined a blocking check, completion stays unavailable until it is satisfied.',
                    ],
                },
                {
                    note: 'Every section is saved automatically, with no button to press. The "Saved at HH:MM" indicator at the top of the assistant confirms it, and you resume exactly where you were if you close the portal, switch device or lose the network.',
                },
                {
                    p: 'Between some steps your sheet is recalculated (allergens, nutrients, costs…). That calculation runs in the background and never blocks you: you can keep typing while it works.',
                },
                {
                    p: 'Your customer’s remarks are anchored to the field or the row they are about, not only to the task: look for the comment bubble next to the field you are asked to fix.',
                },
                {
                    note: 'If your contact enters data on your behalf, a banner saying "you are entering data for …" states it explicitly at the top of the assistant.',
                },
            ],
        },
        {
            /* See the note on the French section. */
            id: 'specs',
            icon: 'menu_book',
            title: 'Specification and catalogue: what is the difference',
            summary: 'A specification is read. A catalogue is filled in — and it is the one that decides whether you can finish.',
            blocks: [
                {
                    p: 'These are two different objects, and they do not serve the same moment. The simplest way is to take them in the order you meet them.',
                },
                {
                    ul: [
                        '**The specification** — a document from your customer, attached to a product or to a family of products. It states their requirements: banned materials, accepted origins, analytical thresholds, transport conditions, CSR commitments. It is a **reference text**, to be read. The portal shows it in the assistant\'s "Context" panel, and the "Specifications" screen gathers them all.',
                        '**The catalogue** — a **list of mandatory fields** your customer defined: "for a raw material to be referenced with me, I need the origin, the density, the EAN code, the major allergen…". It is not a text, it is a check. The portal computes it continuously and gives you its score in the "Compliance" step.',
                    ],
                },
                {
                    p: 'In other words: the specification tells you **what your customer expects of your product**, the catalogue verifies **that its sheet is complete**. You can comply with the specification and still have an incomplete sheet, and the other way round.',
                },
                {
                    p: 'Only one of the two stops you from submitting: the catalogue. When your customer declared a blocking one, the "Finish" button stays unavailable while a field is missing, and the "Compliance" step lists exactly which ones — each line takes you to the field.',
                },
                {
                    note: 'A specification may also call for documents (an organic certificate, a GMO-free attestation). Those appear under "My documents" and in the Documents step, with their validity dates — not in the catalogue.',
                },
                {
                    links: [
                        { href: '/specs', icon: 'menu_book', label: 'Specifications' },
                        { href: '/documents', icon: 'folder_shared', label: 'My documents' },
                    ],
                },
            ],
        },
        {
            id: 'frozen',
            icon: 'lock',
            title: 'What a frozen list means',
            summary: 'A list validated by your customer becomes read-only. That is deliberate, and reversible on request.',
            blocks: [
                {
                    p: 'When your customer validates a section — the ingredient list, the questionnaire, the allergens… — that section is **frozen**: you still see it with all its values, but you can no longer change it. A padlock and a "Read-only" mention say so.',
                },
                {
                    p: 'That is the point: once a value is validated it becomes the reference your customer relies on (labelling, specifications, controls). If it could change without them knowing, their validation would mean nothing.',
                },
                {
                    p: 'Frozen lists are also listed in the assistant’s "Context" panel, under "Validated lists": that is the fastest way to see what is settled and what is still open.',
                },
                {
                    warn: 'Spotted a mistake in a frozen list? Do not create a duplicate sheet. Ask for the section to be reopened through the discussion attached to the sheet: your customer unfreezes it and you get it back editable.',
                },
                {
                    p: 'A whole sheet can also be read-only for another reason: the task is completed, the project is closed, or you only have read access. The assistant tells you which of those applies.',
                },
                { links: [{ href: '/messages', icon: 'forum', label: 'Discussions' }] },
            ],
        },
        {
            id: 'confidence',
            icon: 'auto_awesome',
            title: 'What the AI proposes',
            summary: 'Proposals — never values written in your place.',
            blocks: [
                {
                    p: 'When automatic extraction is enabled at your customer, the portal reads your documents and proposes the values it found. They appear in the "Context" panel, to the right of the form, and are re-read on every step change.',
                },
                {
                    ul: [
                        '**Apply** — the value is written to the sheet. Nothing is written before that click.',
                        '**Dismiss** — the proposal leaves the list and does not come back.',
                        '**Expand** — for long analyses that do not fit in the panel.',
                    ],
                },
                {
                    note: 'No value is ever applied automatically, however certain the reading claims to be. You are the one committing the sheet: the decision is yours, field by field.',
                },
                {
                    p: 'In every case the final value is yours: you remain responsible for what you validate, and nothing reaches your customer before you complete the task.',
                },
            ],
        },
        {
            id: 'documents',
            icon: 'folder_shared',
            title: 'Document validity and renewal',
            summary: 'The portal knows which documents are expected, how long they are valid, and which ones are missing.',
            blocks: [
                {
                    p: 'The expected documents are not a list you have to guess: your customer configures them (document type, mandatory or not, validity duration, scope), and the "My documents" screen gives them back to you as they are, product by product.',
                },
                {
                    ul: [
                        '**Valid** — provided, accepted, and its end of validity is not close.',
                        '**To renew** — the end of validity is less than 60 days away (a delay your customer can adjust).',
                        '**Expired** — the end of validity is past. For a mandatory document, that suspends your approval.',
                        '**Missing** — expected and never provided.',
                        '**Refused** — provided, but refused by your customer: read the reason before uploading again.',
                    ],
                },
                {
                    p: 'Every document carries a validity period (start and end). Depending on the type, you enter it from the dates on the document, or it is derived automatically from the upload date and the duration your customer configured.',
                },
                {
                    p: 'Renewing means uploading a new version on the same line — never creating a second line. The previous version stays in the document history with its own validity period: that is what proves you were covered at a past date.',
                },
                {
                    note: 'The file name and where it is filed do not matter: the portal renames and files the document following your customer’s configuration. Upload the file as it was handed to you.',
                },
                {
                    p: 'Email reminders before expiry are sent by beCPG according to the rules your customer defined. The portal always shows the real state: do not rely on the email, "My documents" is the reference.',
                },
                { links: [{ href: '/documents', icon: 'folder_shared', label: 'My documents' }] },
            ],
        },
        {
            id: 'approval',
            icon: 'verified',
            title: 'The approval status',
            summary: 'Computed live from your documents, your sheets and your non-conformities. Never frozen.',
            blocks: [
                {
                    p: 'The status shown on the dashboard is not a decision typed in by hand: it is recomputed every time it is displayed, from your file. Fix the cause and it changes.',
                },
                {
                    ul: [
                        '**Suspended** — at least one mandatory document is expired, or a blocking non-conformity is open.',
                        '**To renew** — at least one mandatory document is about to expire.',
                        '**In progress** — a referencing project is open, or a mandatory document was never provided, or a blocking check is not satisfied.',
                        '**Approved** — none of the above.',
                    ],
                },
                {
                    p: 'The dashboard card lists the reasons behind the status: each one is clickable and takes you to what needs fixing.',
                },
                {
                    note: 'That same status is read by your customer’s purchasing systems. An expired mandatory document can therefore block an order, not just show an orange pill.',
                },
            ],
        },
        {
            id: 'signature',
            icon: 'draw',
            title: 'How the signature works',
            summary: 'You are asked to read first, then to sign. The signature is applied by beCPG, not by your browser.',
            blocks: [
                {
                    p: 'A Signature task opens the document in a viewer built into the portal. The file never leaves the portal and stays usable on a phone.',
                },
                {
                    ol: [
                        '**Read the whole document.** Reading progress is tracked page by page: as long as a page has not been displayed, signing stays unavailable.',
                        '**Draw your signature** with a finger, a mouse or a stylus, in the places your customer prepared. Signature and initial zones were positioned beforehand: you do not have to place them.',
                        '**Tick the consent box**, then submit. The task is sent once.',
                    ],
                },
                {
                    p: 'beCPG signs the document on its server, archives the signed version and mails it to the recipients. The portal issues no certificate of its own.',
                },
                {
                    note: 'If the network drops during submission, retry: the request carries a unique id, so a request that arrived twice does not sign twice. An already signed document is shown as such, with its download, instead of asking you to sign again.',
                },
                {
                    warn: 'A signature cannot be refused or undone from the portal. If the document is wrong, do not sign: open the discussion and tell your customer.',
                },
            ],
        },
        {
            id: 'contact',
            icon: 'support_agent',
            title: 'Who to contact',
            summary: 'Your contact is your customer. The discussion attached to the sheet is the right channel.',
            blocks: [
                {
                    p: 'This portal is opened for you by your customer: they configure the expected documents, the assistant steps, the validations and the deadlines. They are therefore your first contact for anything about content.',
                },
                {
                    ul: [
                        '**A question on a sheet, a remark, a correction, a list to unfreeze** — use the discussion attached to the sheet or to the task. Your message reaches the person following your file, and stays attached to the product concerned.',
                        '**A document refused without a clear reason** — reply in the product discussion before uploading again.',
                        '**A deadline you cannot meet** — say so in the discussion rather than letting the task go late.',
                        '**An access problem** (password, colleague to add, account to close) — go through your contact at the customer: accounts are created and closed on their side, not from this portal.',
                    ],
                },
                {
                    note: 'The contacts you declared, and your customer’s contacts, are listed on your supplier sheet, Contacts tab.',
                },
                {
                    links: [
                        { href: '/messages', icon: 'forum', label: 'Discussions' },
                        { href: '/company', icon: 'business', label: 'My company' },
                        { href: '/specs', icon: 'menu_book', label: 'Specifications' },
                    ],
                },
            ],
        },
    ],
};

/**
 * Renders `**bold**` runs, and nothing else.
 *
 * The content needs exactly one inline mark — the term being defined at the head
 * of a bullet — so it gets exactly one rule. Anything richer belongs in a block
 * type, where it can be styled consistently.
 *
 * @param {string} text
 * @returns {Array<React.ReactNode>}
 */
function inline(text) {
    return String(text)
        .split(/(\*\*[^*]+\*\*)/g)
        .filter((part) => part !== '')
        .map((part, index) =>
            part.startsWith('**') && part.endsWith('**') ? (
                <strong key={index} className="font-medium text-[var(--becpg-blue)]">
                    {part.slice(2, -2)}
                </strong>
            ) : (
                <span key={index}>{part}</span>
            ),
        );
}

/** Flattens a topic to plain text, for the search filter. */
function topicText(topic) {
    const parts = [topic.title, topic.summary];
    topic.blocks.forEach((block) => {
        if (block.p) {
            parts.push(block.p);
        }
        if (block.note) {
            parts.push(block.note);
        }
        if (block.warn) {
            parts.push(block.warn);
        }
        (block.ul || []).forEach((entry) => parts.push(entry));
        (block.ol || []).forEach((entry) => parts.push(entry));
        (block.links || []).forEach((link) => parts.push(link.label));
    });
    return parts.join(' ').replace(/\*\*/g, '').toLowerCase();
}

function Callout({ tone, children }) {
    const palette =
        tone === 'warn'
            ? {
                  icon: 'warning',
                  className:
                      'border-[var(--status-warn)]/35 bg-[var(--status-warn-bg)] text-[var(--becpg-blue)]',
                  iconClass: 'text-[var(--status-warn)]',
              }
            : {
                  icon: 'info',
                  className: 'border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/45 text-[var(--becpg-blue)]',
                  iconClass: 'text-[var(--becpg-blue-light)]',
              };
    return (
        <div className={`flex gap-2 rounded-lg border p-3 text-sm ${palette.className}`}>
            <Icon name={palette.icon} size={18} className={`mt-0.5 shrink-0 ${palette.iconClass}`} />
            <p className="min-w-0">{children}</p>
        </div>
    );
}

/** One content block. Unknown shapes render nothing rather than crashing. */
function Block({ block, lang }) {
    if (block.p) {
        return <p className="text-sm leading-relaxed">{inline(block.p)}</p>;
    }
    if (block.note) {
        return <Callout tone="note">{inline(block.note)}</Callout>;
    }
    if (block.warn) {
        return <Callout tone="warn">{inline(block.warn)}</Callout>;
    }
    if (block.ul) {
        return (
            <ul className="flex flex-col gap-1.5">
                {block.ul.map((entry, index) => (
                    <li key={index} className="flex gap-2 text-sm leading-relaxed">
                        <span
                            className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--becpg-green)]"
                            aria-hidden="true"
                        />
                        <span className="min-w-0">{inline(entry)}</span>
                    </li>
                ))}
            </ul>
        );
    }
    if (block.ol) {
        return (
            <ol className="flex flex-col gap-2.5">
                {block.ol.map((entry, index) => (
                    <li key={index} className="flex gap-2.5 text-sm leading-relaxed">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--becpg-blue-lighter)] text-xs font-medium text-[var(--becpg-blue)]">
                            {index + 1}
                        </span>
                        <span className="min-w-0">{inline(entry)}</span>
                    </li>
                ))}
            </ol>
        );
    }
    if (block.links) {
        return (
            <div className="flex flex-wrap gap-2">
                {block.links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="inline-flex touch-target items-center gap-1.5 rounded-lg border border-[var(--becpg-grey)] px-3 py-2 text-sm text-[var(--becpg-blue)] transition-colors hover:bg-[var(--becpg-grey)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                    >
                        <Icon name={link.icon} size={18} />
                        {link.label}
                        <Icon name="arrow_forward" size={16} className="text-[var(--becpg-dark-grey)]" />
                    </Link>
                ))}
            </div>
        );
    }
    return null;
}

/**
 * A topic: a full-width header button that expands the content below it.
 *
 * `<h2><button>` rather than `<details>`: the open state has to be driven from
 * the URL and from the search box, which `<details>` fights.
 */
function Topic({ topic, lang, open, onToggle, local, registerRef }) {
    const reduceMotion = useReducedMotion();
    return (
        <section
            id={topic.id}
            ref={registerRef}
            /* Same surface as every `Card` in the portal — border, radius *and*
               `--becpg-shadow-raised`, the shared elevation token rather than a
               hand-copied shadow. Without the lift the topics read as wireframes
               next to the dashboard, which is the whole "it looks unfinished"
               impression this page used to give. */
            className="scroll-mt-24 overflow-hidden rounded-xl border border-[var(--becpg-grey)] bg-white shadow-[var(--becpg-shadow-raised)]"
        >
            <h2>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`help-panel-${topic.id}`}
                    onClick={() => onToggle(topic.id)}
                    className="flex w-full touch-target items-start gap-3 p-3 text-left transition-colors hover:bg-[var(--becpg-grey)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] sm:p-4"
                >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]">
                        <Icon name={topic.icon} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[var(--becpg-blue)] sm:text-base">
                            {topic.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--becpg-dark-grey)] sm:text-sm">
                            {topic.summary}
                        </span>
                    </span>
                    <Icon
                        name={open ? 'expand_less' : 'expand_more'}
                        size={22}
                        className="mt-1 shrink-0 text-[var(--becpg-dark-grey)]"
                    />
                </button>
            </h2>

            <AnimatePresence initial={false}>
                {open ? (
                    <motion.div
                        id={`help-panel-${topic.id}`}
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col gap-3 border-t border-[var(--becpg-grey)] p-3 sm:p-4">
                            {topic.blocks.map((block, index) => (
                                <Block key={index} block={block} lang={lang} />
                            ))}
                            <a
                                href={`#${topic.id}`}
                                className="mt-1 inline-flex w-fit items-center gap-1 rounded text-xs text-[var(--becpg-dark-grey)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                            >
                                <Icon name="link" size={14} />
                                {local.anchor}
                            </a>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </section>
    );
}

export default function HelpPage() {
    const { lang } = useMessages();
    const local = LABELS[lang] || LABELS.fr;
    const topics = TOPICS[lang] || TOPICS.fr;
    const session = useSession();

    const [openIds, setOpenIds] = useState([]);
    const [query, setQuery] = useState('');
    const nodes = useRef({});

    const searchable = useMemo(
        () => topics.map((topic) => ({ id: topic.id, text: topicText(topic) })),
        [topics],
    );

    const needle = query.trim().toLowerCase();
    const visible = useMemo(() => {
        if (!needle) {
            return topics;
        }
        const matching = new Set(
            searchable.filter((entry) => entry.text.includes(needle)).map((entry) => entry.id),
        );
        return topics.filter((topic) => matching.has(topic.id));
    }, [needle, searchable, topics]);

    const toggle = useCallback((id) => {
        setOpenIds((previous) =>
            previous.includes(id) ? previous.filter((entry) => entry !== id) : previous.concat(id),
        );
    }, []);

    // Deep link: `/help#wizard` and `/help?topic=wizard` both open and reveal one
    // topic. Read from `window` rather than from `useSearchParams`, which would
    // force this page into a Suspense boundary for no benefit.
    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        const reveal = () => {
            const fromHash = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
            const fromQuery = new URLSearchParams(window.location.search).get('topic') || '';
            const wanted = fromHash || fromQuery;
            if (!wanted) {
                return;
            }
            const known = (TOPICS[lang] || TOPICS.fr).some((topic) => topic.id === wanted);
            if (!known) {
                return;
            }
            setQuery('');
            setOpenIds((previous) => (previous.includes(wanted) ? previous : previous.concat(wanted)));
            // The panel has to exist before it can be scrolled to.
            window.requestAnimationFrame(() => {
                const node = nodes.current[wanted];
                if (node) {
                    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        };
        reveal();
        window.addEventListener('hashchange', reveal);
        return () => window.removeEventListener('hashchange', reveal);
    }, [lang]);

    const allOpen = visible.length > 0 && visible.every((topic) => openIds.includes(topic.id));
    const toggleAll = () =>
        setOpenIds(allOpen ? [] : visible.map((topic) => topic.id));

    // Searching is only useful if it shows what it found, so the matches open up.
    // Done here, in the change handler, rather than in an effect on `query`:
    // typing is the event, and an effect would only re-derive it one render late.
    const onQueryChange = useCallback(
        (value) => {
            setQuery(value);
            const search = String(value || '').trim().toLowerCase();
            setOpenIds(
                search
                    ? searchable.filter((entry) => entry.text.includes(search)).map((entry) => entry.id)
                    : [],
            );
        },
        [searchable],
    );

    // Which portal this documents. `local.scope` names the space; the tenant is
    // appended when the session carries one, never invented.
    const scope = session.tenant && session.tenant.label
        ? `${local.scope} · ${session.tenant.label}`
        : local.scope;

    return (
        <AppShell
            title={local.title}
            aside={
                <nav
                    aria-label={local.topics}
                    className="hidden rounded-xl border border-[var(--becpg-grey)] bg-white p-2 shadow-[var(--becpg-shadow-raised)] lg:block"
                >
                    <p className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                        {local.topics}
                    </p>
                    {topics.map((topic) => (
                        <a
                            key={topic.id}
                            href={`#${topic.id}`}
                            className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm text-[var(--becpg-blue)]/85 hover:bg-[var(--becpg-grey)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                        >
                            <Icon
                                name={topic.icon}
                                size={18}
                                className="mt-px shrink-0 text-[var(--becpg-dark-grey)]"
                            />
                            {/* Wraps rather than truncates: five of the nine titles
                                ended in an ellipsis in a 20rem rail, and a table of
                                contents whose entries are cut off is not one. */}
                            <span className="min-w-0 leading-snug">{topic.title}</span>
                        </a>
                    ))}
                </nav>
            }
        >
            {/*
             * The masthead.
             *
             * Documentation still has to look like the product: the page used to
             * open on a grey sentence, which read as a page whose header had not
             * been written yet. It now opens on the same blue → blue-light
             * gradient as the sign-in hero, and names the tenant, because help
             * that does not say *whose* portal it documents is half an answer.
             *
             * `shape.png` is deliberately **not** on it: the mark is 440px wide
             * and this block is ~100px tall, so `.brand-hero-shape` cropped it
             * into a bright hard-edged band across the right half — checked in
             * the browser. The asset needs a tall surface (the sign-in hero); on
             * a strip, the gradient carries the brand on its own.
             */}
            <div className="brand-hero mb-4 rounded-xl p-4 text-white sm:p-5">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                        <Icon name="help_outline" size={22} />
                    </span>
                    {/*
                     * A lead paragraph, deliberately *not* a heading: the page
                     * title ("Aide") is already the `<h1>` the app header
                     * renders, and repeating it here would add a second h1 and
                     * say nothing new. The big line is the sentence that is
                     * actually useful, the small one names the tenant.
                     */}
                    <div className="min-w-0">
                        <p className="text-lg font-light leading-tight sm:text-2xl">
                            {local.subtitle}
                        </p>
                        <p className="mt-1.5 text-xs text-white/85 sm:text-sm">{scope}</p>
                    </div>
                </div>
            </div>

            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                    <SearchInput value={query} onChange={onQueryChange} placeholder={local.search} />
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    icon={allOpen ? 'unfold_less' : 'unfold_more'}
                    onClick={toggleAll}
                    className="shrink-0"
                >
                    {allOpen ? local.collapseAll : local.expandAll}
                </Button>
            </div>

            {/*
             * Phone shortcut to a topic; the aside covers `lg` and up.
             *
             * `lg:hidden` has to sit on this wrapper and not on the rail itself:
             * `.scroll-x` is a plain `display: flex` rule in globals.css, and
             * unlayered CSS beats Tailwind's utility layer — so `lg:hidden` on the
             * rail lost, and the rail was rendering (clipped, mid-page) on every
             * desktop screen. Checked in the browser at 1440px: gone.
             */}
            <div className="mb-3 lg:hidden">
                <div className="scroll-x no-scrollbar pb-1" aria-label={local.topics}>
                    {topics.map((topic) => (
                        <a
                            key={topic.id}
                            href={`#${topic.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--becpg-grey)] bg-white px-3 py-1.5 text-xs text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                        >
                            <Icon name={topic.icon} size={14} />
                            {topic.title}
                        </a>
                    ))}
                </div>
            </div>

            {visible.length === 0 ? (
                <EmptyState variant="search" title={local.noResult} message={local.noResultHint} />
            ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                    {visible.map((topic) => (
                        <Topic
                            key={topic.id}
                            topic={topic}
                            lang={lang}
                            local={local}
                            open={openIds.includes(topic.id)}
                            onToggle={toggle}
                            registerRef={(node) => {
                                nodes.current[topic.id] = node;
                            }}
                        />
                    ))}
                </div>
            )}
        </AppShell>
    );
}
