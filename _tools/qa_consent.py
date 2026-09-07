# -*- coding: utf-8 -*-
"""QA binario del mecanismo de consentimiento de ailitica.com.

Autor: Vista. Task #1048, 7 de septiembre de 2026.
Implementa literalmente el criterio de aceptación del apartado 6.5 del dictamen
de Lex, que es binario: si falla un paso, no se publica.

  1. Cargar una página y no tocar nada: cero cookies _ga*, cero peticiones a
     googletagmanager.com y a google-analytics.com.
  2. Pulsar "Rechazar" y navegar por tres páginas distintas: el mismo resultado.
  3. Pulsar "Aceptar": aparecen _ga y _ga_PWNT3YC598 y hay petición a la etiqueta.
  4. Pulsar "Preferencias de cookies" en el pie y retirar: las dos cookies
     desaparecen y no vuelve a haber peticiones.

Levanta un servidor estático local sobre el árbol de trabajo, así que prueba el
código tal y como quedará publicado. La verificación en producción, con captura,
la exige además Lex después del push: esto no la sustituye.

Uso:  python _tools/qa_consent.py [--salida <directorio>]
Sale con código 0 si los cuatro pasos pasan, 1 si alguno falla.
"""

import argparse
import json
import pathlib
import socket
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

DOMINIOS_GOOGLE = ("googletagmanager.com", "google-analytics.com", "analytics.google.com")
PUERTO = 8765

RAIZ = pathlib.Path(__file__).resolve().parent.parent
POST = "blog/que-es-un-agente-de-ia.html"


def es_google(url: str) -> bool:
    return any(d in url for d in DOMINIOS_GOOGLE)


def cookies_ga(contexto):
    return sorted(
        c["name"] for c in contexto.cookies() if c["name"].startswith("_ga")
    )


def esperar_puerto(puerto: int, intentos: int = 60) -> bool:
    for _ in range(intentos):
        with socket.socket() as s:
            s.settimeout(0.25)
            if s.connect_ex(("127.0.0.1", puerto)) == 0:
                return True
        time.sleep(0.25)
    return False


class Registro:
    def __init__(self):
        self.pasos = []
        self.peticiones = []

    def paso(self, numero, titulo, ok, detalle):
        self.pasos.append({"paso": numero, "titulo": titulo, "ok": ok, "detalle": detalle})
        marca = "PASA" if ok else "FALLA"
        print(f"[{marca}] Paso {numero}: {titulo}")
        for linea in detalle:
            print(f"         {linea}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default=None)
    args = ap.parse_args()

    salida = pathlib.Path(args.salida) if args.salida else RAIZ / "_tools" / "_qa_salida"
    salida.mkdir(parents=True, exist_ok=True)

    servidor = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PUERTO), "--directory", str(RAIZ)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if not esperar_puerto(PUERTO):
        servidor.terminate()
        print("ERROR: el servidor local no ha arrancado", file=sys.stderr)
        return 2

    base = f"http://127.0.0.1:{PUERTO}"
    reg = Registro()

    try:
        with sync_playwright() as pw:
            navegador = pw.chromium.launch()

            # ── Paso 1: sin tocar nada ────────────────────────────────────
            ctx = navegador.new_context(viewport={"width": 1440, "height": 900})
            vistas = []
            ctx.on("request", lambda r: vistas.append(r.url) if es_google(r.url) else None)
            pg = ctx.new_page()
            pg.goto(f"{base}/index.html", wait_until="networkidle")
            pg.wait_for_selector(".ailitica-consent", state="visible")
            time.sleep(1.5)
            alto_escritorio = pg.evaluate(
                "() => { const r = document.querySelector('.ailitica-consent').getBoundingClientRect();"
                " return {alto: Math.round(r.height), viewport: window.innerHeight,"
                " pct: Math.round(r.height / window.innerHeight * 1000) / 10}; }")
            c1, g1 = cookies_ga(ctx), list(vistas)
            reg.peticiones += g1
            reg.paso(1, "Carga sin interaccion", not c1 and not g1,
                     [f"cookies _ga*: {c1 or 'ninguna'}",
                      f"peticiones a Google: {len(g1)}",
                      "banner visible: si"])

            # Capturas de escritorio con el banner en pantalla
            pg.screenshot(path=str(salida / "01_banner_escritorio_home.png"))
            pg.goto(f"{base}/{POST}", wait_until="networkidle")
            pg.wait_for_selector(".ailitica-consent", state="visible")
            pg.screenshot(path=str(salida / "02_banner_escritorio_post.png"))
            ctx.close()

            # ── Paso 2: rechazar y navegar por tres paginas ───────────────
            ctx = navegador.new_context(viewport={"width": 1440, "height": 900})
            vistas = []
            ctx.on("request", lambda r: vistas.append(r.url) if es_google(r.url) else None)
            pg = ctx.new_page()
            pg.goto(f"{base}/index.html", wait_until="networkidle")
            pg.click('.ailitica-consent__boton[data-accion="rechazar"]')
            recorrido = [f"{base}/{POST}", f"{base}/cookies.html", f"{base}/blog/index.html"]
            banner_reaparece = False
            for url in recorrido:
                pg.goto(url, wait_until="networkidle")
                time.sleep(0.6)
                if pg.locator(".ailitica-consent:not([hidden])").count():
                    banner_reaparece = True
            c2, g2 = cookies_ga(ctx), list(vistas)
            reg.peticiones += g2
            reg.paso(2, "Rechazar y navegar por tres paginas",
                     not c2 and not g2 and not banner_reaparece,
                     [f"cookies _ga*: {c2 or 'ninguna'}",
                      f"peticiones a Google: {len(g2)}",
                      f"paginas visitadas tras rechazar: {len(recorrido)}",
                      f"el banner vuelve a preguntar: {'si' if banner_reaparece else 'no'}"])
            ctx.close()

            # ── Paso 3: aceptar ──────────────────────────────────────────
            ctx = navegador.new_context(viewport={"width": 1440, "height": 900})
            vistas = []
            ctx.on("request", lambda r: vistas.append(r.url) if es_google(r.url) else None)
            pg = ctx.new_page()
            pg.goto(f"{base}/index.html", wait_until="networkidle")
            pg.click('.ailitica-consent__boton[data-accion="aceptar"]')
            pg.wait_for_timeout(4000)
            c3, g3 = cookies_ga(ctx), list(vistas)
            reg.peticiones += g3
            etiqueta = [u for u in g3 if "googletagmanager.com/gtag/js" in u]
            reg.paso(3, "Aceptar",
                     "_ga" in c3 and "_ga_PWNT3YC598" in c3 and bool(etiqueta),
                     [f"cookies _ga*: {c3 or 'ninguna'}",
                      f"peticiones a Google: {len(g3)}",
                      f"etiqueta gtag/js solicitada: {'si' if etiqueta else 'no'}"])

            # ── Paso 4: retirar desde el pie ─────────────────────────────
            # Antes de medir hay que dejar que se agoten los envíos que todavía
            # corresponden al periodo CON consentimiento. Pulsar el enlace del
            # pie obliga al navegador a desplazarse hasta el final de la página,
            # y eso dispara el evento "scroll" de la medición mejorada de GA4,
            # que llega con retraso variable. Si se contara como posterior a la
            # retirada, el paso 4 fallaría por una carrera del propio test y no
            # por un defecto del mecanismo. Aquí se provoca ese desplazamiento
            # a propósito y se espera a verlo salir.
            pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            limite = time.time() + 15
            while time.time() < limite:
                if any("en=scroll" in u for u in vistas):
                    break
                pg.wait_for_timeout(500)
            pg.wait_for_timeout(2000)

            pg.click('[data-ailitica-consent-abrir]')
            pg.wait_for_selector(".ailitica-consent__panel:not([hidden])")
            pg.screenshot(path=str(salida / "03_panel_escritorio.png"))
            pg.wait_for_timeout(2000)
            marca = len(vistas)
            pg.click('.ailitica-consent__boton[data-accion="rechazar-todas"]')
            pg.wait_for_load_state("networkidle")
            pg.wait_for_timeout(1500)
            c4a = cookies_ga(ctx)
            for url in [f"{base}/{POST}", f"{base}/cookies.html"]:
                pg.goto(url, wait_until="networkidle")
                pg.wait_for_timeout(600)
            c4 = cookies_ga(ctx)
            nuevas = vistas[marca:]
            reg.peticiones += nuevas
            reg.paso(4, "Retirar el consentimiento desde el pie",
                     not c4 and not c4a and not nuevas,
                     [f"cookies _ga* justo tras retirar: {c4a or 'ninguna'}",
                      f"cookies _ga* tras navegar dos paginas mas: {c4 or 'ninguna'}",
                      f"peticiones a Google despues de retirar: {len(nuevas)}"])
            ctx.close()

            # ── Paso 5 (D5 de Lex): almacenamiento tras rechazar ─────────
            ctx = navegador.new_context(viewport={"width": 1440, "height": 900})
            vistas = []
            ctx.on("request", lambda r: vistas.append(r.url) if es_google(r.url) else None)
            pg = ctx.new_page()
            pg.goto(f"{base}/index.html", wait_until="networkidle")
            pg.click('.ailitica-consent__boton[data-accion="rechazar"]')
            pg.goto(f"{base}/{POST}", wait_until="networkidle")
            pg.wait_for_timeout(1200)
            claves = pg.evaluate("Object.keys(window.localStorage)")
            sesion = pg.evaluate("Object.keys(window.sessionStorage)")
            galletas = sorted(c["name"] for c in ctx.cookies())
            reg.paso(5, "Almacenamiento del navegador tras rechazar",
                     claves == ["ailitica_cookie_consent"] and not sesion and not galletas,
                     [f"localStorage: {claves}",
                      f"sessionStorage: {sesion or 'vacio'}",
                      f"cookies: {galletas or 'ninguna'}"])
            ctx.close()

            # ── Paso 6 (C1 de Lex): el parámetro interno solo en su página ──
            # Un enlace preparado del tipo /blog/articulo.html?interno=1 no puede
            # instalar una cookie no necesaria en el navegador de un visitante
            # sin consentimiento (art. 22.2 LSSI), y además haría falsa la frase
            # que publicamos en cookies.html.
            interna = "ailitica_traffic_internal"

            ctx = navegador.new_context(viewport={"width": 1440, "height": 900})
            pg = ctx.new_page()
            pg.goto(f"{base}/index.html?interno=1", wait_until="networkidle")
            pg.wait_for_timeout(800)
            en_home = [c["name"] for c in ctx.cookies() if c["name"] == interna]
            pg.goto(f"{base}/{POST}?interno=1", wait_until="networkidle")
            pg.wait_for_timeout(800)
            en_post = [c["name"] for c in ctx.cookies() if c["name"] == interna]
            ctx.close()

            ctx = navegador.new_context(viewport={"width": 1440, "height": 900})
            pg = ctx.new_page()
            pg.goto(f"{base}/interno.html?interno=1", wait_until="networkidle")
            pg.wait_for_timeout(800)
            en_interno = [c["name"] for c in ctx.cookies() if c["name"] == interna]
            pg.goto(f"{base}/interno.html?interno=0", wait_until="networkidle")
            pg.wait_for_timeout(800)
            tras_quitar = [c["name"] for c in ctx.cookies() if c["name"] == interna]
            ctx.close()

            reg.paso(6, "El parametro interno solo actua en /interno.html",
                     not en_home and not en_post and en_interno == [interna] and not tras_quitar,
                     [f"/index.html?interno=1 instala la cookie: {'SI' if en_home else 'no'}",
                      f"/{POST}?interno=1 instala la cookie: {'SI' if en_post else 'no'}",
                      f"/interno.html?interno=1 instala la cookie: {'si' if en_interno else 'NO'}",
                      f"/interno.html?interno=0 la retira: {'si' if not tras_quitar else 'NO'}"])

            # ── Capturas moviles (iPhone 17 Pro, 402 px) ─────────────────
            ctx = navegador.new_context(
                viewport={"width": 402, "height": 874},
                device_scale_factor=3,
                is_mobile=True,
                has_touch=True,
            )
            pg = ctx.new_page()
            pg.goto(f"{base}/index.html", wait_until="networkidle")
            pg.wait_for_selector(".ailitica-consent", state="visible")
            pg.screenshot(path=str(salida / "04_banner_402px_home.png"))
            medidas = pg.eval_on_selector_all(
                ".ailitica-consent__boton, .ailitica-consent__enlace",
                "els => els.map(e => ({t: e.textContent.trim(), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height)}))",
            )
            alto_movil = pg.evaluate(
                "() => { const r = document.querySelector('.ailitica-consent').getBoundingClientRect();"
                " return {alto: Math.round(r.height), viewport: window.innerHeight,"
                " pct: Math.round(r.height / window.innerHeight * 1000) / 10}; }")
            pg.click('[data-accion="configurar"]')
            pg.wait_for_selector(".ailitica-consent__panel:not([hidden])")
            pg.screenshot(path=str(salida / "05_panel_402px.png"))
            pg.keyboard.press("Escape")
            pg.goto(f"{base}/{POST}", wait_until="networkidle")
            pg.wait_for_selector(".ailitica-consent", state="visible")
            pg.screenshot(path=str(salida / "06_banner_402px_post.png"))
            ctx.close()

            navegador.close()
    finally:
        servidor.terminate()

    (salida / "medidas_botones_402px.json").write_text(
        json.dumps(
            {
                "acciones_402px": medidas,
                "alto_banner_402x874": alto_movil,
                "alto_banner_1440x900": alto_escritorio,
                "objetivo_forma": {"movil_pct_max": 25, "escritorio_pct_max": 15},
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (salida / "log_red_google.json").write_text(
        json.dumps(
            {
                "dominios_vigilados": list(DOMINIOS_GOOGLE),
                "peticiones_registradas": reg.peticiones,
                "pasos": reg.pasos,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print("\nMedidas de las tres acciones a 402 px:")
    for m in medidas:
        print(f"  {m['t']}: {m['w']}x{m['h']} px")
    print(f"Alto del banner a 402x874: {alto_movil['alto']} px = {alto_movil['pct']} % "
          f"(techo de Forma: 25 %)")
    print(f"Alto del banner a 1440x900: {alto_escritorio['alto']} px = {alto_escritorio['pct']} % "
          f"(techo de Forma: 15 %)")

    fallidos = [p for p in reg.pasos if not p["ok"]]
    print("\nRESULTADO: " + ("TODOS LOS PASOS PASAN" if not fallidos
                             else f"{len(fallidos)} PASO(S) FALLIDO(S)"))
    print(f"Salida en: {salida}")
    return 1 if fallidos else 0


if __name__ == "__main__":
    raise SystemExit(main())
