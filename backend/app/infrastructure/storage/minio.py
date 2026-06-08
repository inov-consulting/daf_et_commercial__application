"""Service de stockage fichiers — MinIO (compatible S3).

Utilisation :
    storage = StorageService()
    url = await storage.upload(file_bytes, filename="doc.pdf", content_type="application/pdf")
    await storage.delete("doc.pdf")
    url = storage.get_url("doc.pdf")
"""

from __future__ import annotations

import io
import json
import mimetypes
import uuid
from pathlib import PurePosixPath

import boto3
from PIL import Image
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings


class StorageService:
    """Gère l'upload, la suppression et la génération d'URL de fichiers sur MinIO."""

    def __init__(self, bucket: str | None = None) -> None:
        self._bucket = bucket or settings.minio_bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.minio_url,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        """Crée le bucket s'il n'existe pas encore, et applique une policy publique si configuré."""
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError as exc:
            error_code = exc.response["Error"]["Code"]
            if error_code in ("404", "NoSuchBucket"):
                self._client.create_bucket(Bucket=self._bucket)
                self._apply_public_policy()
            elif error_code in ("403", "AccessDenied"):
                # Le bucket existe — on tente quand même d'appliquer la policy publique
                if settings.minio_public_base_url:
                    self._apply_public_policy()
            else:
                raise
        else:
            # Bucket accessible — on applique la policy si URLs publiques activées
            if settings.minio_public_base_url:
                self._apply_public_policy()

    def _apply_public_policy(self) -> None:
        """Applique une policy S3 autorisant la lecture publique sur tous les objets du bucket."""
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{self._bucket}/*"],
                }
            ],
        }
        try:
            self._client.put_bucket_policy(
                Bucket=self._bucket,
                Policy=json.dumps(policy),
            )
        except ClientError:
            pass

    # ── Upload ────────────────────────────────────────────────────────

    async def upload(
        self,
        data: bytes,
        *,
        filename: str,
        content_type: str | None = None,
        folder: str = "",
        unique: bool = True,
    ) -> str:
        """Upload un fichier et retourne son URL publique ou signée.

        Args:
            data: Contenu binaire du fichier.
            filename: Nom original du fichier (ex: "rapport.pdf").
            content_type: MIME type. Si absent, détecté depuis le nom.
            folder: Sous-dossier dans le bucket (ex: "documents/2024").
            unique: Si True, préfixe le nom avec un UUID pour éviter les collisions.

        Returns:
            URL publique (si minio_public_base_url configuré) ou URL pré-signée 7 jours.
        """
        if content_type is None:
            content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

        object_key = self._build_key(filename, folder=folder, unique=unique)

        self._client.put_object(
            Bucket=self._bucket,
            Key=object_key,
            Body=data,
            ContentType=content_type,
        )

        return self.get_url(object_key)

    async def upload_fileobj(
        self,
        fileobj,
        *,
        filename: str,
        content_type: str | None = None,
        folder: str = "",
        unique: bool = True,
    ) -> str:
        """Upload depuis un file-like object (ex: UploadFile de FastAPI).

        Returns:
            URL publique ou pré-signée.
        """
        if content_type is None:
            content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

        object_key = self._build_key(filename, folder=folder, unique=unique)

        self._client.upload_fileobj(
            fileobj,
            self._bucket,
            object_key,
            ExtraArgs={"ContentType": content_type},
        )

        return self.get_url(object_key)

    # ── URL ───────────────────────────────────────────────────────────

    def get_url(self, object_key: str, expires_in: int = 604800) -> str:
        """Retourne l'URL d'accès à un fichier.

        - Si `minio_public_base_url` est défini → URL publique directe.
        - Sinon → URL pré-signée valable `expires_in` secondes (défaut : 7 jours).
        """
        if settings.minio_public_base_url:
            base = settings.minio_public_base_url.rstrip("/")
            return f"{base}/{self._bucket}/{object_key}"

        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": object_key},
            ExpiresIn=expires_in,
        )

    # ── Suppression ───────────────────────────────────────────────────

    async def delete(self, object_key: str) -> None:
        """Supprime un fichier du bucket."""
        self._client.delete_object(Bucket=self._bucket, Key=object_key)

    # ── Helpers ───────────────────────────────────────────────────────

    @staticmethod
    def compress_image(
        data: bytes,
        *,
        max_size: tuple[int, int] = (800, 800),
        quality: int = 85,
        output_format: str = "WEBP",
    ) -> tuple[bytes, str]:
        """Compresse et redimensionne une image.

        Args:
            data: Contenu binaire de l'image originale.
            max_size: Dimensions max (largeur, hauteur). Conserve le ratio.
            quality: Qualité de compression 1-95 (défaut 85).
            output_format: Format de sortie — WEBP (défaut), JPEG, PNG.

        Returns:
            Tuple (bytes compressés, content_type).
        """
        img = Image.open(io.BytesIO(data))

        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")

        img.thumbnail(max_size, Image.LANCZOS)

        output = io.BytesIO()
        fmt = output_format.upper()
        if fmt == "WEBP":
            img.save(output, format="WEBP", quality=quality, method=6)
            content_type = "image/webp"
        elif fmt == "JPEG":
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(output, format="JPEG", quality=quality, optimize=True)
            content_type = "image/jpeg"
        else:
            img.save(output, format="PNG", optimize=True)
            content_type = "image/png"

        return output.getvalue(), content_type

    @staticmethod
    def _build_key(filename: str, *, folder: str = "", unique: bool = True) -> str:
        """Construit la clé objet dans le bucket.

        Exemple : "documents/2024/a1b2c3d4-rapport.pdf"
        """
        stem = PurePosixPath(filename).stem
        suffix = PurePosixPath(filename).suffix
        name = f"{uuid.uuid4().hex}-{stem}{suffix}" if unique else filename
        if folder:
            return f"{folder.strip('/')}/{name}"
        return name

    @staticmethod
    def extract_key_from_url(url: str, bucket: str | None = None) -> str:
        """Extrait la clé objet depuis une URL publique ou pré-signée.

        Utile pour retrouver la clé avant une suppression.
        """
        bucket = bucket or settings.minio_bucket
        # URL publique : https://minio.example.com/portalis/folder/file.pdf
        if f"/{bucket}/" in url:
            return url.split(f"/{bucket}/", 1)[-1].split("?")[0]
        # URL pré-signée : chemin après le bucket dans le query
        return url.split("?")[0].split("/")[-1]
