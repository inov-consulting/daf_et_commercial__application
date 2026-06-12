"""Service de génération de Compte-Rendus PDF.

Génère des PDF professionnels à partir des notes via Claude AI.
"""

from __future__ import annotations

from datetime import datetime, UTC
from uuid import UUID

import markdown
from app.core.config import settings
from app.infrastructure.ai.anthropic_client import anthropic_client
from app.infrastructure.db.models.note import CompteRenduOrm, NoteOrm
from app.infrastructure.storage.minio import StorageService


# Template HTML pour le PDF
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        @page {{
            size: A4;
            margin: 2.5cm;
        }}
        body {{
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
        }}
        h1 {{
            font-size: 18pt;
            color: #1a365d;
            border-bottom: 2px solid #1a365d;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}
        h2 {{
            font-size: 14pt;
            color: #2c5282;
            margin-top: 25px;
            margin-bottom: 12px;
        }}
        h3 {{
            font-size: 12pt;
            color: #2d3748;
        }}
        .header {{
            text-align: right;
            font-size: 9pt;
            color: #666;
            margin-bottom: 30px;
        }}
        .metadata {{
            background: #f7fafc;
            border-left: 4px solid #1a365d;
            padding: 15px;
            margin-bottom: 20px;
        }}
        .metadata-item {{
            margin: 5px 0;
        }}
        .note {{
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 12px;
            margin: 10px 0;
        }}
        .note-meta {{
            font-size: 9pt;
            color: #666;
            margin-bottom: 8px;
        }}
        .footer {{
            position: fixed;
            bottom: 1cm;
            right: 2.5cm;
            font-size: 8pt;
            color: #999;
        }}
    </style>
</head>
<body>
    <div class="header">
        Généré le {date}<br>
        PortaLis - CRM Commercial
    </div>
    {content}
    <div class="footer">
        Page {{ page }} sur {{ pages }}
    </div>
</body>
</html>
"""

# Prompt pour Claude
CR_GENERATION_PROMPT = """Tu es un assistant commercial professionnel. Tu dois rédiger un compte-rendu structuré et professionnel à partir des notes fournies.

INSTRUCTIONS:
1. Analyse toutes les notes fournies
2. Rédige un compte-rendu professionnel en français
3. Structure le document avec:
   - Un titre approprié
   - Un résumé exécutif (points clés)
   - Les détails par thème ou chronologiquement
   - Des recommandations ou actions à suivre
4. Utilise un ton professionnel mais accessible
5. Format: Markdown avec titres (# ## ###), listes, etc.

FORMAT DE SORTIE (Markdown):
# Compte-Rendu: [Sujet]

## Résumé Exécutif
[Bullets des points clés]

## Détails
[Contenu structuré des notes]

## Actions Recommandées
[Liste d'actions]

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

        # 3. Récupérer le template de la config AI (ou utiliser le défaut)
        from app.infrastructure.db.models.ai_config import AiConfigOrm
        
        config = await AiConfigOrm.first()
        cr_template = config.compte_rendu_template if config and config.compte_rendu_template else CR_GENERATION_PROMPT
        
        # 4. Appeler Claude pour générer le contenu
        prompt = cr_template.format(notes=notes_text)
        
        # Utiliser Anthropic client
        md_content = await self._call_claude(prompt)

        # 4. Convertir Markdown en HTML puis PDF
        pdf_bytes = await self._generate_pdf(md_content, prospect_id)

        # 5. Calculer la prochaine version
        existing_crs = await CompteRenduOrm.filter(
            parent_type="prospect",
            parent_id=prospect_id,
        ).count()
        version = existing_crs + 1

        # 6. Upload sur MinIO
        filename = f"CR_prospect_{prospect_id}_v{version}.pdf"
        minio_path = f"cr/prospect/{prospect_id}/v{version}.pdf"
        
        await self._storage.upload(
            pdf_bytes,
            filename=filename,
            content_type="application/pdf",
            folder=f"cr/prospect/{prospect_id}",
            unique=False,  # On gère l'unicité via le path
        )

        # 7. Créer l'enregistrement en DB
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
            created_by=author_id,
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
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text

        return await asyncio.to_thread(_sync_call)

    async def _generate_pdf(self, md_content: str, prospect_id: UUID) -> bytes:
        """Convertit le Markdown en PDF."""
        # Convertir MD en HTML
        html_body = markdown.markdown(
            md_content,
            extensions=[
                "markdown.extensions.tables",
                "markdown.extensions.fenced_code",
            ],
        )

        # Construire le HTML complet
        title = f"Compte-Rendu Prospect {prospect_id}"
        date_str = datetime.now(UTC).strftime("%d/%m/%Y")
        
        html = HTML_TEMPLATE.format(
            title=title,
            date=date_str,
            content=html_body,
        )

        # Convertir en PDF avec WeasyPrint
        import asyncio
        
        def _sync_pdf():
            from weasyprint import HTML
            return HTML(string=html).write_pdf()

        return await asyncio.to_thread(_sync_pdf)
