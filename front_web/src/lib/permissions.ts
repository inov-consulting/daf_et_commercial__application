/**
 * `"admin"` court-circuite toute vérification, à l'identique du backend
 * (`require_permission` dans `backend/app/api/deps.py`).
 */
export function hasPermission(
  perms: string[] | undefined,
  required?: string | string[],
): boolean {
  if (!required) return true;
  if (perms?.includes('admin')) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.some(p => perms?.includes(p));
}
