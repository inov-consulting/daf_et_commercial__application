export function getRoleAbbreviation(role: string | undefined): string {
  if (!role) return '?';
  
  const abbreviations: Record<string, string> = {
    'Directeur Général': 'DG',
    'Directeur général': 'DG',
    'directeur général': 'DG',
    'Commercial': 'COM',
    'Administrateur': 'ADM',
    'Admin': 'ADM',
    'Responsable': 'RESP',
    'Manager': 'MGR',
    'Développeur': 'DEV',
    'Comptable': 'CPT',
    'Marketing': 'MKT',
    'Ressources Humaines': 'RH',
    'Support Client': 'SUP',
    'Chef de Projet': 'CDP',
    'Stagiaire': 'STG',
    'Consultant': 'CST',
  };
  
  return abbreviations[role] || role.substring(0, 3).toUpperCase();
}