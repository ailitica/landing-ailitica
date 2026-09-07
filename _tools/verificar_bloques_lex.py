# -*- coding: utf-8 -*-
"""Comprobaciones A1, A3, A7, B3, B5, B6, B7 y C1 del apartado 4 de Lex, sobre el
HTML servido, mas capturas de las paginas legales a 402 px. Task #1048."""
import pathlib, re, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright

WEB = pathlib.Path(r"C:/Users/famil/Proton Drive/Andoni/My files/01 PROYECTOS/Ailitica/00_core/06_marketing/web")
SALIDA = pathlib.Path(r"C:/Users/famil/Proton Drive/Andoni/My files/01 PROYECTOS/Ailitica/00_core/00_inbox/owner/vista_2609071930_banner-consentimiento-qa")
PUERTO = 8768
EXCL = {"_mockups", "_staging", "_backlog", "_residual", "okf", "OLD", ".git"}

lineas = []


def di(s):
    print(s)
    lineas.append(s)


paginas = [p for p in sorted(WEB.rglob("*.html")) if not (EXCL & set(p.relative_to(WEB).parts))]
di(f"Paginas HTML publicables analizadas: {len(paginas)}")

# A1: cero referencias estaticas a la etiqueta en el HTML
patron = re.compile(r"googletagmanager\.com|google-analytics\.com|gtag\(", re.I)
sucias = []
for p in paginas:
    t = p.read_text(encoding="utf-8", errors="replace")
    # Los comentarios HTML documentan la retirada y no cargan nada.
    sin_comentarios = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    if patron.search(sin_comentarios):
        sucias.append(p.relative_to(WEB).as_posix())
di(f"A1  Paginas con referencia estatica a gtag/googletagmanager/google-analytics: {len(sucias)} {sucias or ''}")

# A3: consent.js en todas
sin_consent = [p.relative_to(WEB).as_posix() for p in paginas if "consent.js" not in p.read_text(encoding="utf-8", errors="replace")]
di(f"A3  Paginas sin la linea de consent.js: {len(sin_consent)} {sin_consent or ''}")

# B3: nombres declarados en cookies.html frente a los del codigo.
# Hay dos familias y NO se comprueban igual:
#  - Las que instala nuestro codigo tienen que aparecer en cookies.html Y en
#    consent.js. Declarar una que el codigo no instala, o instalar una que no se
#    declara, es el defecto de la fila fantasma "_tccl_visitor".
#  - Las tecnicas de tercero (Cloudflare) las instala la CDN, no nosotros: se
#    declaran en cookies.html y NO deben aparecer en consent.js. Que el script
#    las marcara como incoherencia seria un falso positivo.
js = (WEB / "consent.js").read_text(encoding="utf-8")
ck = (WEB / "cookies.html").read_text(encoding="utf-8")
for nombre in ["_ga", "_ga_PWNT3YC598", "ailitica_cookie_consent", "ailitica_traffic_internal"]:
    ok = nombre in ck and nombre in js
    di(f"B3  propia '{nombre}': declarada en cookies.html={nombre in ck}  "
       f"usada en consent.js={nombre in js}  {'OK' if ok else 'REVISAR'}")
for nombre in ["__cf_bm", "cf_clearance"]:
    ok = nombre in ck and nombre not in js
    di(f"B3  tecnica de tercero '{nombre}': declarada en cookies.html={nombre in ck}  "
       f"ausente de consent.js={nombre not in js}  {'OK' if ok else 'REVISAR'}")

# B5: frases prohibidas
prohibidas = ["no se transferirán fuera del Espacio Económico Europeo", "copia de tu DNI"]
for f in prohibidas:
    n = sum(1 for p in paginas if f in p.read_text(encoding="utf-8", errors="replace"))
    di(f"B5  '{f[:45]}...': {n} apariciones")

# B7: marcadores sin sustituir
n = sum(1 for p in paginas if "RELLENAR_" in p.read_text(encoding="utf-8", errors="replace"))
di(f"B7  Paginas con marcadores RELLENAR_: {n}")

# C1: interno.html fuera del sitemap y con noindex
sm = (WEB / "sitemap.xml").read_text(encoding="utf-8")
it = (WEB / "interno.html").read_text(encoding="utf-8")
di(f"C1  interno.html en sitemap.xml: {'interno' in sm}")
di(f"C1  interno.html con noindex: {'noindex' in it}")
enlaces = [p.relative_to(WEB).as_posix() for p in paginas if "interno.html" in p.read_text(encoding="utf-8", errors="replace") and p.name != "interno.html"]
di(f"C1  Paginas que enlazan interno.html: {len(enlaces)} {enlaces or ''}")

# ── A7 y B6 en el navegador ────────────────────────────────────────────────
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PUERTO), "--directory", str(WEB)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    with socket.socket() as s:
        s.settimeout(0.25)
        if s.connect_ex(("127.0.0.1", PUERTO)) == 0:
            break
    time.sleep(0.25)
base = f"http://127.0.0.1:{PUERTO}"

muestra = ["index.html", "cookies.html", "privacidad.html", "terminos.html", "politica-ia.html",
           "blog/index.html", "blog/que-es-un-agente-de-ia.html", "blog/categoria/estrategia/index.html"]

try:
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        ctx = nav.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        for pagina in muestra:
            pg.goto(f"{base}/{pagina}", wait_until="networkidle")
            pg.wait_for_timeout(400)
            # El banner cubre el pie mientras esta a la vista, que es su
            # comportamiento normal. Se rechaza primero, que es justo el caso
            # en que el enlace del pie tiene que servir para cambiar de opinion.
            if pg.locator('.ailitica-consent:not([hidden])').count():
                pg.click('.ailitica-consent__boton[data-accion="rechazar"]')
                pg.wait_for_timeout(300)
            en_pie = pg.evaluate(
                "!!document.querySelector('footer .footer-links [data-ailitica-consent-abrir]')")
            pg.click("[data-ailitica-consent-abrir]")
            abre = pg.locator(".ailitica-consent__panel:not([hidden])").count() > 0
            di(f"A7  {pagina}: enlace en el pie={en_pie}  abre el panel={abre}")
            pg.keyboard.press("Escape")
        ctx.close()

        # Capturas de las paginas legales a 402 px, con la tabla nueva
        ctx = nav.new_context(viewport={"width": 402, "height": 874}, device_scale_factor=3,
                              is_mobile=True, has_touch=True)
        pg = ctx.new_page()
        for pagina, nombre in [("cookies.html", "07_cookies_402px.png"),
                               ("privacidad.html", "08_privacidad_402px.png")]:
            pg.goto(f"{base}/{pagina}", wait_until="networkidle")
            pg.wait_for_timeout(600)
            ancho = pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
            di(f"B8  {pagina} a 402 px: scrollWidth={ancho[0]} innerWidth={ancho[1]} "
               f"{'sin desbordamiento horizontal' if ancho[0] <= ancho[1] else 'DESBORDA'}")
            pg.evaluate("window.scrollTo(0, 900)")
            pg.wait_for_timeout(400)
            pg.screenshot(path=str(SALIDA / nombre))
        ctx.close()
        nav.close()
finally:
    srv.terminate()

(SALIDA / "verificacion_bloques_lex.txt").write_text("\n".join(lineas) + "\n", encoding="utf-8")
print(f"\nGuardado en {SALIDA / 'verificacion_bloques_lex.txt'}")
