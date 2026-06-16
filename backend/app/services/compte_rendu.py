"""Service de génération de Compte-Rendus PDF.

Génère des PDF professionnels à partir des notes via Claude AI.
"""

from __future__ import annotations

import re
from datetime import datetime, UTC
from uuid import UUID

from app.core.config import settings
from app.infrastructure.db.models.note import CompteRenduOrm, NoteOrm
from app.infrastructure.db.models.prospect import ProspectOrm
from app.infrastructure.storage.minio import StorageService


# Template HTML pour le PDF


# Prompt pour Claude
CR_GENERATION_PROMPT = """Tu es un assistant commercial professionnel. Tu dois créer un document HTML complet et professionnel pour un compte-rendu.

INSTRUCTIONS:
1. Analyse toutes les notes fournies
2. Génère un document HTML autonome avec:
   - CSS inline dans <style>
   - Logo PortaLis Sénégal (URL: https://web.portalis.manage.inov-consulting.com/assets/images/logo_portalis.png)
   - Couleurs du Design System PortaLis
   - Structure professionnelle avec page de garde

STRUCTURE HTML OBLIGATOIRE (appliquer le Design System fourni ci-dessous):
1. Page de garde avec gradient, logo (64px), titre, date
2. Résumé exécutif en bullets colorés
3. Détails structurés par sections
4. Actions recommandées avec badges
5. Footer "PortaLis — Sénégal"

⚠️ RÈGLES ABSOLUES - OBLIGATOIRES:
1. Document HTML COMPLET et autonome (pas de dépendances externes)
2. CSS inline uniquement dans <style>
3. **CRITIQUE: NE PAS utiliser de bloc de code Markdown** - pas de ```html au début, pas de ``` à la fin
4. **Le HTML doit démarrer immédiatement par <!DOCTYPE html>**
5. **Le HTML doit se termimer par </html>** sans rien après
6. Contenu en français
7. **MARGES DIFFÉRENCIÉES**: Utiliser @page pour marge 0 sur page de garde, 2cm sur autres pages
   CSS requis: @page :first {{ margin: 0; }} et @page {{ margin: 2cm; }}

❌ INTERDIT: ```html au début ou ``` à la fin
❌ INTERDIT: box-shadow, ombres sur les blocs (impression problématique)
✅ OBLIGATOIRE: Commencer directement par <!DOCTYPE html>

FORMAT DE SORTIE (copier-coller exact):
<!DOCTYPE html>
<html lang="fr">
...
</html>

NOTES À TRAITER:
{notes}
"""


class CompteRenduService:
    """Service de génération de compte-rendus PDF."""

    def __init__(self) -> None:
        self._storage = StorageService()

    async def generate(
        self,
        prospect_id: UUID,
        note_ids: list[UUID] | None,
        author_id: UUID | None,
        template: str | None = None,
    ) -> CompteRenduOrm:
        """Génère un compte-rendu PDF pour un prospect.

        Args:
            prospect_id: ID du prospect
            note_ids: IDs des notes à inclure (toutes si None)
            author_id: ID de l'auteur
            template: Template de génération (défaut: standard)

        Returns:
            Le CompteRenduOrm créé avec le PDF uploadé sur MinIO
        """
        # 1. Récupérer les notes
        if note_ids:
            notes = await NoteOrm.filter(id__in=note_ids, prospect_id=prospect_id).order_by("created_at")
        else:
            notes = await NoteOrm.filter(prospect_id=prospect_id).order_by("created_at")

        if not notes:
            raise ValueError("Aucune note trouvée pour ce prospect")

        # 2. Préparer le contexte pour Claude
        notes_text = self._format_notes_for_prompt(notes)

        # 3. Récupérer le template de style depuis la base de données (OBLIGATOIRE)
        from app.infrastructure.db.models.ai_config import AiConfigOrm
        from fastapi import HTTPException, status
        
        config = await AiConfigOrm.first()
        style_template = config.compte_rendu_template if config else None
        
        # Vérifier que le template existe et n'est pas vide
        if not style_template or not style_template.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Template de compte-rendu non configuré. Veuillez configurer le Design System dans les paramètres AI."
            )
        
        # 4. Construire le prompt complet : instructions + template Design System
        base_prompt = CR_GENERATION_PROMPT.format(notes=notes_text)
        
        # Claude reçoit le Design System COMPLET de la DB avec instructions de marge
        prompt = f"""{base_prompt}

⚠️ DESIGN SYSTEM PORTALIS (À APPLIQUER STRICTEMENT):
{style_template}

RAPPEL: Générer un document HTML COMPLET avec ce Design System. Respecter les couleurs, typographie et espacements exacts."""
        
        # Utiliser Anthropic client
        html_content = await self._call_claude(prompt)
        
        # Nettoyer les éventuels blocs de code Markdown
        import re
        import logging
        logger = logging.getLogger(__name__)
        
        # Retirer ```html, ```, ou tout autre bloc de code au début/fin
        html_content = re.sub(r'^\s*```\s*\n?', '', html_content, flags=re.IGNORECASE)
        html_content = re.sub(r'\n?```\s*$', '', html_content, flags=re.IGNORECASE)
        html_content = html_content.strip()
        
        # Vérifier que le HTML est complet (se termine par </html>)
        if not html_content.rstrip().endswith('</html>'):
            if '<body>' in html_content and '</body>' not in html_content:
                html_content += "\n</body>\n</html>"
            elif '</body>' in html_content and '</html>' not in html_content:
                html_content += "\n</html>"
        
        # S'assurer que ça commence par <!DOCTYPE ou <html
        if not html_content.startswith(('<!DOCTYPE', '<!doctype', '<html')):
            # Si Claude a quand même mis du texte avant, on wrap dans un HTML basique
            # PAS de padding ici pour éviter les marges doublées (les marges sont gérées par CSS @page)
            html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>body{{font-family:system-ui,sans-serif;color:#212121;margin:0;padding:0;}}</style></head>
<body>{html_content}</body>
</html>"""

        # Debug: logger le HTML généré
    
        # Vérifier que le HTML n'est pas vide
        if len(html_content) < 100:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"HTML généré vide ou trop court ({len(html_content)} caractères)"
            )
        
        # 5. Convertir HTML en PDF avec Playwright
        pdf_bytes = await self._generate_pdf(html_content, prospect_id, style_template)
        
        # Vérifier que le PDF n'est pas vide
        if not pdf_bytes or len(pdf_bytes) < 1000:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"PDF généré vide ou trop petit ({len(pdf_bytes) if pdf_bytes else 0} bytes)"
            )

        # 6. Calculer la prochaine version
        existing_crs = await CompteRenduOrm.filter(
            parent_type="prospect",
            parent_id=prospect_id,
        ).count()
        version = existing_crs + 1

        # 6b. Récupérer le prospect pour le slug
        prospect = await ProspectOrm.get_or_none(id=prospect_id)
        prospect_slug = "prospect"
        if prospect and prospect.erp_metadata:
            # Utiliser partner_name (entreprise) ou name (titre lead)
            name = prospect.erp_metadata.get("partner_name") or prospect.erp_metadata.get("name") or "prospect"
            # Créer un slug: minuscule, sans accents, alphanumérique uniquement, max 30 car
            prospect_slug = re.sub(r'[^\w\s-]', '', name.lower())
            prospect_slug = re.sub(r'[-\s]+', '-', prospect_slug)
            prospect_slug = prospect_slug.strip('-')[:30] or "prospect"

        # 7. Upload sur MinIO
        filename = f"CR-{prospect_slug}-v{version}.pdf"
        folder = f"cr/prospect/{prospect_id}"
        minio_path = f"{folder}/{filename}"
        
        await self._storage.upload(
            pdf_bytes,
            filename=filename,
            content_type="application/pdf",
            folder=folder,
            unique=False,
        )

        # 8. Créer l'enregistrement en DB
        cr = await CompteRenduOrm.create(
            parent_type="prospect",
            parent_id=prospect_id,
            version=version,
            status="final",
            minio_bucket=settings.minio_bucket,
            minio_path=minio_path,
            file_size=len(pdf_bytes),
            generated_by="ai",
            prompt_used=prompt,
            note_ids=[str(n.id) for n in notes],
            created_by_id=author_id,
        )

        return cr

    def _format_notes_for_prompt(self, notes: list[NoteOrm]) -> str:
        """Formate les notes pour le prompt Claude."""
        lines = []
        for i, note in enumerate(notes, 1):
            date_str = note.created_at.strftime("%d/%m/%Y %H:%M")
            lines.append(f"--- Note #{i} ({date_str}) ---")
            lines.append(note.content)
            lines.append("")
        return "\n".join(lines)

    async def _call_claude(self, prompt: str) -> str:
        """Appelle Claude pour générer le contenu Markdown."""
        # Utiliser le client Anthropic existant
        # Note: C'est synchrone, on wrap avec to_thread
        import asyncio

        def _sync_call():
            from anthropic import Anthropic
            client = Anthropic(api_key=settings.anthropic_api_key)
            response = client.messages.create(
                model=settings.ai_default_model if "claude" in settings.ai_default_model else "claude-sonnet-4-5",
                max_tokens=10000,  # Augmenté pour HTML long avec Design System
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text

        return await asyncio.to_thread(_sync_call)


    async def _generate_pdf(self, html_content: str, prospect_id: UUID, style_template: str | None = None) -> bytes:
        """Convertit le HTML en PDF avec Playwright (Chromium headless)."""
        import asyncio
        from playwright.async_api import async_playwright
        import logging
        logger = logging.getLogger(__name__)

        async def _render_pdf() -> bytes:
            logger.info(f"Playwright: début conversion HTML ({len(html_content)} caractères) → PDF")
            
            async with async_playwright() as p:
                # Flags nécessaires pour Docker (no-sandbox)
                browser = await p.chromium.launch(
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                )
                page = await browser.new_page()
                
                # Charger le HTML - utiliser domcontentloaded pour éviter d'attendre les images externes
                logger.debug(f"HTML à charger: {html_content[:300]}...")
                await page.set_content(html_content, wait_until='domcontentloaded')
                
                # Attendre que le DOM soit stable
                await asyncio.sleep(1)
                
                # Vérifier que la page a du contenu
                # Vérifier si body existe
                body_exists = await page.evaluate('() => !!document.body')
                logger.info(f"Playwright: document.body existe: {body_exists}")
                
                if not body_exists:
                    # Logger tout le HTML de la page pour debug
                    full_html = await page.evaluate('() => document.documentElement.outerHTML.substring(0, 1000)')
                    logger.error(f"Playwright: Pas de body! HTML: {full_html}...")
                    raise ValueError("Pas de balise <body> dans le HTML généré")
                
                body_text = await page.evaluate('() => document.body.innerText.trim().length')
                body_html = await page.evaluate('() => document.body.innerHTML.substring(0, 500)')
                doc_html = await page.evaluate('() => document.documentElement.outerHTML.substring(0, 500)')
                
                logger.info(f"Playwright: HTML chargé, {body_text} caractères dans body")
                logger.info(f"Playwright: Body HTML preview: {body_html}...")
                logger.info(f"Playwright: Doc HTML preview: {doc_html}...")
                
                if body_text < 10:
                    logger.error("Playwright: Body vide ou quasi-vide!")
                    full_html = await page.evaluate('() => document.documentElement.outerHTML')
                    logger.error(f"Playwright: HTML complet: {full_html[:2000]}...")
                    raise ValueError(f"HTML rendu vide (body contient {body_text} caractères)")
                
                # Générer le PDF - pas de marges (le HTML les gère avec @page ou body padding)
                pdf_bytes = await page.pdf(
                    format="A4",
                    margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                    print_background=True,
                )
                
                logger.info(f"Playwright: PDF généré ({len(pdf_bytes)} bytes)")
                
                await browser.close()
                return pdf_bytes

        return await _render_pdf()
