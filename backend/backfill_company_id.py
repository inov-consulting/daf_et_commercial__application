#!/usr/bin/env python3
"""Script de remplissage : affecte la première entreprise à toutes les lignes
dont company_id est NULL dans les tables qui ont ce champ.

Usage :
    cd backend
    python backfill_company_id.py              # mode interactif (choix de l'entreprise)
    python backfill_company_id.py --dry-run    # simulation (aucune modification)
"""
from __future__ import annotations

import asyncio
import sys

from tortoise import Tortoise

# ── Tables à remplir ──────────────────────────────────────────────────────────
TABLES = [
    "transport_offers",
    "commercial_runs",
    "commercial_predictions",
    "ai_usage_logs",
    "daf_agent_runs",
    "notifications",
    "whatsapp_conversations",
    "prospects",
    "compte_rendus",
]


async def main(dry_run: bool = False) -> None:
    # ── Connexion ─────────────────────────────────────────────────────────────
    from app.infrastructure.db.config import TORTOISE_ORM

    await Tortoise.init(config=TORTOISE_ORM)

    conn = Tortoise.get_connection("default")

    try:
        # ── Lister les entreprises ────────────────────────────────────────────
        rows, _ = await conn.execute_query(
            "SELECT id, name, country_name, is_active FROM companies ORDER BY created_at ASC"
        )

        if not rows:
            print("❌  Aucune entreprise trouvée dans la base de données.")
            return

        print("\n=== Entreprises disponibles ===")
        for i, row in enumerate(rows):
            status = "✓ active" if row["is_active"] else "✗ inactive"
            print(f"  [{i + 1}] {row['name']}  ({row['country_name']})  {status}")
            print(f"       id = {row['id']}")
        print()

        # ── Choix de l'entreprise ─────────────────────────────────────────────
        if len(rows) == 1:
            chosen = rows[0]
            print(f"Une seule entreprise → sélection automatique : {chosen['name']}")
        else:
            default_idx = 1
            raw = input(f"Numéro de l'entreprise à utiliser comme défaut [{default_idx}] : ").strip()
            idx = int(raw) if raw else default_idx
            if idx < 1 or idx > len(rows):
                print(f"❌  Numéro invalide : {idx}")
                return
            chosen = rows[idx - 1]
            print(f"\nEntreprise choisie : {chosen['name']}  (id={chosen['id']})")

        company_uuid = str(chosen["id"])

        # ── Comptage des lignes à mettre à jour ───────────────────────────────
        print("\n=== Lignes NULL à corriger ===")
        totals: dict[str, int] = {}
        for table in TABLES:
            result, _ = await conn.execute_query(
                f"SELECT COUNT(*) AS n FROM {table} WHERE company_id IS NULL"  # noqa: S608
            )
            count = result[0]["n"]
            totals[table] = count
            mark = "  " if count == 0 else "⚠ "
            print(f"  {mark}{table:<30}  {count:>6} ligne(s) NULL")

        total_affected = sum(totals.values())
        if total_affected == 0:
            print("\n✅  Aucune ligne NULL — rien à faire.")
            return

        print(f"\nTotal : {total_affected} ligne(s) à mettre à jour.")

        if dry_run:
            print("\n⚠  Mode --dry-run : aucune modification effectuée.")
            return

        # ── Confirmation ──────────────────────────────────────────────────────
        confirm = input(
            f"\nConfirmer le remplissage avec company_id = {company_uuid} ? [o/N] : "
        ).strip().lower()
        if confirm not in ("o", "oui", "y", "yes"):
            print("Annulé.")
            return

        # ── Mise à jour ───────────────────────────────────────────────────────
        print("\n=== Mise à jour en cours ===")
        for table in TABLES:
            if totals[table] == 0:
                continue
            await conn.execute_query(
                f"UPDATE {table} SET company_id = $1 WHERE company_id IS NULL",  # noqa: S608
                [company_uuid],
            )
            print(f"  ✓  {table:<30}  {totals[table]:>6} ligne(s) mise(s) à jour")

        print(f"\n✅  Terminé — {total_affected} ligne(s) affectée(s) à « {chosen['name']} ».")

    finally:
        await Tortoise.close_connections()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    asyncio.run(main(dry_run=dry_run))
