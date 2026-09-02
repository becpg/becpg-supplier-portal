/**
 * Prefixe sous lequel le portail est servi, cote navigateur.
 *
 * `basePath` de next.config ne couvre que ce que Next genere : next/link,
 * next/router, les assets. Tout chemin absolu ecrit a la main -- l'action d'un
 * formulaire, un href, une URL passee a fetch -- part sans prefixe. Servi sous
 * /supplier d'un hote d'instance, il tombe alors chez le core beCPG.
 */
export const basePath = process.env.NEXT_PUBLIC_PORTAL_BASE_PATH || '';

/**
 * Prefixe un chemin absolu de l'application. Idempotent, et identite quand le
 * portail est servi a la racine.
 *
 * @param {string} path chemin commencant par '/'
 * @returns {string}
 */
export function withBasePath(path) {
    if (!basePath || typeof path !== 'string' || !path.startsWith('/')) {
        return path;
    }
    if (path === basePath || path.startsWith(`${basePath}/`)) {
        return path;
    }
    return `${basePath}${path}`;
}
