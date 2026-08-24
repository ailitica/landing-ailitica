# Este directorio ya no se publica

**Fecha:** 6 de agosto de 2026
**Quién:** Vista, por encargo de Litica (task #918)

## Qué ha pasado

Hasta hoy, GitHub Pages convertía los seis `.md` de este directorio en `.html` mediante
Jekyll, de modo que `https://ailitica.com/okf/index.html` respondía 200 aunque nadie lo
enlazara. Al añadir un fichero `.nojekyll` en la raíz del repositorio, esa conversión
deja de ocurrir: los `.md` siguen en el repositorio y se sirven tal cual, pero los
`.html` correspondientes ya no se generan y devuelven 404.

**No es un accidente ni una pérdida.** Responde a la decisión del CEO del 4 de agosto de
2026 sobre `/okf/`: *"se retira, no se publica"*. Ese día se retiraron del `llms.txt` la
sección y sus seis enlaces. Lo que seguía vivo en el servidor era un residuo de aquella
decisión, no material en uso.

## Por qué se añadió `.nojekyll`

Por una razón distinta y más urgente, que se cruzó con la anterior. Los builds de
GitHub Pages tardaban **9 minutos y 11 segundos** contra un límite de 10 minutos, y el
6 de agosto lo cruzaron: dos builds consecutivos del mismo commit fallaron con
`duration: 0`, y **la web quedó imposible de publicar**, no solo ese lote. `.nojekyll`
hace que Pages copie los ficheros en vez de procesarlos con Jekyll, que es todo lo que
este sitio necesita: no hay `_config.yml`, ni plantillas, ni colecciones.

Diagnóstico completo en `01_legal/rgpd/260806_orden_publicacion_lote_rgpd.md`.

## Si algún día se quieren publicar

Los `.md` están intactos y son recuperables. Hay dos vías:

1. **Convertirlos a `.html`** con la plantilla del sitio y publicarlos como páginas
   normales. Es la vía correcta si se quieren enlazar desde el `llms.txt` y el sitemap.
2. **Servirlos como `.md` en crudo**, que para material pensado para que lo lean modelos
   de lenguaje es incluso preferible. En ese caso hay que enlazarlos por su extensión
   real (`/okf/index.md`, no `/okf/index.html`).

Lo que **no** vale es quitar el `.nojekyll` para recuperarlos: eso devolvería el sitio a
builds de nueve minutos y al fallo que dejó la web sin poder publicarse.

Dueño del contenido: Cenit (SEO/GEO/AEO). La decisión de publicar o no es del CEO.
