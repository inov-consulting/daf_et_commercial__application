// Helper pour générer l'URL du drapeau
function getFlagUrl(countryCode: string): string {
  // Mapping des codes téléphoniques vers les codes pays ISO
  const phoneToIso: Record<string, string> = {
    '+221': 'sn',
    '+225': 'ci',
    '+223': 'ml',
    '+226': 'bf',
    '+224': 'gn',
    '+229': 'bj',
    '+228': 'tg',
    '+227': 'ne',
    '+212': 'ma',
    '+33': 'fr',
    '+32': 'be',
    '+41': 'ch',
    '+1': 'us',
    '+44': 'gb',
  };
  
  const iso = phoneToIso[countryCode] || 'un';
  return `https://flagcdn.com/20x14/${iso}.png`;
}

export const COUNTRY_CODES = [
  { code: '+221', flag: '🇸🇳', label: 'Sénégal' },
  { code: '+225', flag: '🇨🇮', label: "Côte d'Ivoire" },
  { code: '+223', flag: '🇲🇱', label: 'Mali' },
  { code: '+226', flag: '🇧🇫', label: 'Burkina Faso' },
  { code: '+224', flag: '🇬🇳', label: 'Guinée' },
  { code: '+229', flag: '🇧🇯', label: 'Bénin' },
  { code: '+228', flag: '🇹🇬', label: 'Togo' },
  { code: '+227', flag: '🇳🇪', label: 'Niger' },
  { code: '+212', flag: '🇲🇦', label: 'Maroc' },
  { code: '+33', flag: '🇫🇷', label: 'France' },
  { code: '+32', flag: '🇧🇪', label: 'Belgique' },
  { code: '+41', flag: '🇨🇭', label: 'Suisse' },
  { code: '+1', flag: '🇺🇸', label: 'USA / Canada' },
  { code: '+44', flag: '🇬🇧', label: 'Royaume-Uni' },
].map(c => ({
  ...c,
  flagUrl: getFlagUrl(c.code),
}));