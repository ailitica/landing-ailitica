#!/usr/bin/env python3
"""Notifica URLs a Google Indexing API desde GitHub Actions.

Uso:
    # URLs desde argv
    python notify_indexing.py https://ailitica.com/blog/post1.html https://ailitica.com/blog/post2.html

    # URLs desde stdin (una por linea)
    cat urls.txt | python notify_indexing.py --stdin

Variables de entorno:
    SA_JSON_PATH
        Ruta absoluta al JSON de la service account de Google.
        En GitHub Actions: $RUNNER_TEMP/sa.json (escrito desde Secret).

Formato de salida (JSON-lines, una linea por URL):
    {"url": "...", "ok": true, "http_status": 200, "attempt": 1}
    {"url": "...", "ok": false, "http_status": 429, "attempt": 5, "error": "..."}

Codigo de salida:
    0 — todas OK
    2 — al menos una fallo

Reutiliza la logica de publish + backoff del script canonico
04_operaciones/herramientas/seo_indexing/indexar_url.py. No depende de
log_util ni de la API CORE (no accesible desde Actions).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

SCOPES = ["https://www.googleapis.com/auth/indexing"]
TIPOS_VALIDOS = {"URL_UPDATED", "URL_DELETED"}
MAX_REINTENTOS = 5
BACKOFF_BASE = 2  # segundos


def _cargar_credencial(path: str):
    """Carga la service account. Sale con codigo 1 si no existe."""
    if not path:
        print(
            "[error] SA_JSON_PATH no definido en el entorno.",
            file=sys.stderr,
        )
        sys.exit(1)

    if not os.path.exists(path):
        print(
            f"[error] credencial no encontrada en: {path}",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        from google.oauth2 import service_account  # type: ignore
    except ImportError:
        print(
            "[error] falta dependencia 'google-auth'. "
            "pip install google-auth google-api-python-client",
            file=sys.stderr,
        )
        sys.exit(1)

    return service_account.Credentials.from_service_account_file(
        path, scopes=SCOPES
    )


def _construir_servicio(credenciales):
    try:
        from googleapiclient.discovery import build  # type: ignore
    except ImportError:
        print(
            "[error] falta dependencia 'google-api-python-client'. "
            "pip install google-api-python-client google-auth",
            file=sys.stderr,
        )
        sys.exit(1)

    return build(
        "indexing",
        "v3",
        credentials=credenciales,
        cache_discovery=False,
    )


def notificar_url(url: str, servicio, tipo: str = "URL_UPDATED") -> dict:
    """Publica una URL en urlNotifications con backoff exponencial.

    Devuelve un dict con resultado para emitir como JSON-line.
    """
    if tipo not in TIPOS_VALIDOS:
        return {
            "url": url,
            "ok": False,
            "http_status": None,
            "attempt": 0,
            "error": f"tipo invalido: {tipo}",
        }

    try:
        from googleapiclient.errors import HttpError  # type: ignore
    except ImportError:
        HttpError = Exception  # type: ignore

    payload = {"url": url, "type": tipo}

    intento = 0
    ultimo_status = None
    ultimo_error = None
    while intento < MAX_REINTENTOS:
        intento += 1
        try:
            request = servicio.urlNotifications().publish(body=payload)
            request.execute()
            return {
                "url": url,
                "ok": True,
                "http_status": 200,
                "attempt": intento,
            }
        except HttpError as exc:  # type: ignore
            status = getattr(exc.resp, "status", None) if hasattr(exc, "resp") else None
            ultimo_status = status
            ultimo_error = str(exc)
            es_reintentable = status in (429, 500, 502, 503, 504)
            if es_reintentable and intento < MAX_REINTENTOS:
                espera = BACKOFF_BASE ** intento
                print(
                    f"[warn] HTTP {status} en intento {intento}/{MAX_REINTENTOS} "
                    f"para {url}. Espero {espera}s y reintento.",
                    file=sys.stderr,
                )
                time.sleep(espera)
                continue
            break
        except Exception as exc:
            ultimo_error = f"{type(exc).__name__}: {exc}"
            break

    return {
        "url": url,
        "ok": False,
        "http_status": ultimo_status,
        "attempt": intento,
        "error": ultimo_error or "desconocido",
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Notifica URLs a Google Indexing API."
    )
    parser.add_argument(
        "urls",
        nargs="*",
        help="URLs a notificar (o usar --stdin).",
    )
    parser.add_argument(
        "--stdin",
        action="store_true",
        help="Lee URLs desde stdin, una por linea.",
    )
    parser.add_argument(
        "--tipo",
        default="URL_UPDATED",
        choices=sorted(TIPOS_VALIDOS),
        help="Tipo de notificacion (default: URL_UPDATED).",
    )
    args = parser.parse_args()

    urls = list(args.urls)
    if args.stdin:
        urls.extend(linea.strip() for linea in sys.stdin if linea.strip())

    # Dedup preservando orden.
    vistos = set()
    urls_unicas = []
    for url in urls:
        if url not in vistos:
            vistos.add(url)
            urls_unicas.append(url)

    if not urls_unicas:
        print(
            "[info] no hay URLs que notificar. Saliendo limpio.",
            file=sys.stderr,
        )
        return 0

    key_path = os.environ.get("SA_JSON_PATH", "")
    credenciales = _cargar_credencial(key_path)
    servicio = _construir_servicio(credenciales)

    fallos = 0
    for url in urls_unicas:
        resultado = notificar_url(url, servicio, tipo=args.tipo)
        print(json.dumps(resultado, ensure_ascii=False))
        sys.stdout.flush()
        if not resultado["ok"]:
            fallos += 1

    total = len(urls_unicas)
    print(
        f"[resumen] total={total} ok={total - fallos} fallos={fallos}",
        file=sys.stderr,
    )
    return 0 if fallos == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
