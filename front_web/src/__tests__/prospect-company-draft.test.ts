import { buildProspectDraftFromCompany } from '@/types/prospect_type';

describe('buildProspectDraftFromCompany', () => {
  it('maps the provided company payload into a prospect draft', () => {
    const draft = buildProspectDraftFromCompany({
      name: 'Bâtiments & Travaux CI',
      email: 'projets@batimentstravaux.ci',
      phone: '+225 21 35 67 89',
      street: 'Boulevard de la Construction, Treichville',
      city: 'Abidjan',
      zip: '01 BP 567',
      country: 'Côte d\'Ivoire',
    });

    expect(draft.companyName).toBe('Bâtiments & Travaux CI');
    expect(draft.email).toBe('projets@batimentstravaux.ci');
    expect(draft.phone).toBe('+225 21 35 67 89');
    expect(draft.notes).toContain('Boulevard de la Construction');
    expect(draft.notes).toContain('Côte d\'Ivoire');
  });

  it('uses the full address when provided and falls back to a phone number from mobile', () => {
    const draft = buildProspectDraftFromCompany({
      name: 'Example Company',
      email: ' ',
      mobile: '+225 07 77 88 99',
      address: 'Rue 1, Cocody, Abidjan',
    });

    expect(draft.companyName).toBe('Example Company');
    expect(draft.email).toBe('');
    expect(draft.phone).toBe('+225 07 77 88 99');
    expect(draft.notes).toBe('Adresse: Rue 1, Cocody, Abidjan');
  });
});
