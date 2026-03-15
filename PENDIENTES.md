## Subrayado automático de vocabulario en todos los lectores

**Descripción:** Cuando una palabra existe en la base de datos de
vocabulario, debe aparecer automáticamente subrayada (con un estilo
visual diferente al de los highlights manuales — por ejemplo, un
subrayado punteado en color teal) en cualquier lugar donde esa
palabra aparezca: notas Markdown, lector PDF, lector EPUB, y
artículos web guardados.

**Comportamiento al hacer clic:** Al pulsar sobre una de estas
palabras subrayadas automáticamente, aparece un popup pequeño que
muestra la información almacenada en el vocabulario: la etimología
y el significado. Desde ese popup hay un botón para ir a la entrada
completa del vocabulario.

**Comportamiento esperado:**
- El subrayado es automático, no requiere ninguna acción del usuario.
- El estilo visual es distinto al de los highlights manuales para
  que el usuario sepa que ese subrayado viene del vocabulario y no
  lo puso él.
- Si la palabra tiene varias formas (plurales, conjugaciones), el
  subrayado debe reconocerlas también — por ejemplo, si el
  vocabulario tiene "idiosincrasia", debe subrayarse también
  "idiosincrasias".
- El popup no interrumpe la lectura: aparece flotante y se cierra
  con un clic fuera o con Escape.

**Milestone donde implementar:** Milestone 13 (Funciones IA), una
vez que existan y sean estables: vocabulario (M9), lector PDF (M4),
lector EPUB (M5), notas TipTap (M3) y artículos web (M10).

**Por qué no antes:** Es una feature transversal que toca todos los
lectores. Implementarla antes de que esos módulos estén estables
obligaría a rehacer el trabajo cuando cada lector se construya.