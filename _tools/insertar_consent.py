#!/usr/bin/env python3
"""Inserta la línea de carga de consent.js en todas las páginas publicables del sitio.

Autor: Vista. Task #1048, 7 de septiembre de 2026.

Qué hace, y solo esto: añade `<script src="/consent.js" defer></script>` justo
antes de `</body>` en cada fichero HTML publicable de `06_marketing/web/`. Es
idempotente: si la página ya referencia `consent.js`, no la toca.

Por qué existe: el banner de consentimiento tiene que desplegarse en todas las
páginas, incluidos los 46 artículos del blog y los 5 hubs de categoría (apartado
6.2 del dictamen de Lex). Editar 56 pies a mano es exactamente la clase de tarea
que se hace mal una vez y se queda mal para siempre.

Uso:
    python _tools/insertar_consent.py --dry-run   # solo informa, no escribe
    python _tools/insertar_consent.py             # aplica
    python _tools/insertar_consent.py --quitar    # revierte la inserción

No hace git add, ni commit, ni push. Deja los cambios en el árbol de trabajo.
"""

import argparse
import pathlib
import re
import sys

LINEA = '<script src="/consent.js" defer></script>'

# Directorios que no se publican o que no son nuestros: borradores, staging,
# backlog del blog, mockups y la carpeta okf.
EXCLUIDOS = {"_mockups", "_staging", "_backlog", "_residual", "okf", "OLD", ".git"}

# Ficheros que no llevan banner por no ser páginas del sitio.
EXENTOS = {"interno.html"}  # ya carga consent.js con su propia línea


def raiz_repo() -> pathlib.Path:
    return pathlib.Path(__file__).resolve().parent.parent


def paginas(base: pathlib.Path):
    for ruta in sorted(base.rglob("*.html")):
        rel = ruta.relative_to(base)
        if EXCLUIDOS & set(rel.parts):
            continue
        if rel.name in EXENTOS:
            continue
        yield ruta


def leer(ruta: pathlib.Path) -> str:
    """Lee preservando los finales de línea originales (Path.read_text no admite
    newline hasta Python 3.13, y aquí corre 3.11)."""
    with ruta.open("r", encoding="utf-8", newline="") as fh:
        return fh.read()


def escribir(ruta: pathlib.Path, texto: str) -> None:
    with ruta.open("w", encoding="utf-8", newline="") as fh:
        fh.write(texto)


def tiene_consent(texto: str) -> bool:
    return "consent.js" in texto


def fin_de_linea(texto: str) -> str:
    """Final de línea dominante del fichero.

    El repo mezcla LF y CRLF (privacidad.html, terminos.html y cookies.html
    venían con CRLF). Escribir todo en LF convierte una inserción de una línea
    en un diff de 600 líneas y hace irrevisable el cambio, así que el final de
    línea original se respeta siempre.
    """
    return "\r\n" if "\r\n" in texto else "\n"


def insertar(texto: str) -> str | None:
    """Devuelve el texto con la línea insertada, o None si no se puede."""
    m = re.search(r"([ \t]*)</body>", texto, flags=re.IGNORECASE)
    if not m:
        return None
    sangria = m.group(1)
    salto = fin_de_linea(texto)
    reemplazo = f"{sangria}{LINEA}{salto}{sangria}</body>"
    return texto[: m.start()] + reemplazo + texto[m.end():]


def quitar(texto: str) -> str:
    patron = re.compile(
        r"[ \t]*<script[^>]*src=[\"'][^\"']*consent\.js[\"'][^>]*>\s*</script>\s*\n?",
        flags=re.IGNORECASE,
    )
    return patron.sub("", texto)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="no escribe, solo informa")
    ap.add_argument("--quitar", action="store_true", help="revierte la inserción")
    args = ap.parse_args()

    base = raiz_repo()
    if not (base / "index.html").exists():
        print(f"ERROR: no parece la raíz del repo web: {base}", file=sys.stderr)
        return 2

    tocados, ya_estaban, sin_body = [], [], []

    for ruta in paginas(base):
        rel = ruta.relative_to(base).as_posix()
        original = leer(ruta)

        if args.quitar:
            nuevo = quitar(original)
            if nuevo == original:
                continue
            if not args.dry_run:
                escribir(ruta, nuevo)
            tocados.append(rel)
            continue

        if tiene_consent(original):
            ya_estaban.append(rel)
            continue

        nuevo = insertar(original)
        if nuevo is None:
            sin_body.append(rel)
            continue
        if not args.dry_run:
            escribir(ruta, nuevo)
        tocados.append(rel)

    verbo = "se quitaría de" if args.quitar else "se insertaría en"
    hecho = "quitada de" if args.quitar else "insertada en"
    accion = verbo if args.dry_run else hecho

    print(f"Línea {accion} {len(tocados)} fichero(s).")
    for r in tocados:
        print(f"  + {r}")
    if ya_estaban:
        print(f"\nYa la tenían ({len(ya_estaban)}), sin tocar:")
        for r in ya_estaban:
            print(f"  = {r}")
    if sin_body:
        print(f"\nSIN </body>, revisar a mano ({len(sin_body)}):", file=sys.stderr)
        for r in sin_body:
            print(f"  ! {r}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
