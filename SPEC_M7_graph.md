# SPEC_M7 — Grafo de conocimiento

## Objetivo del milestone
Visualizar las conexiones entre notas de forma interactiva,
permitiendo al usuario descubrir relaciones entre conceptos que
quizás no recordaba haber establecido. El grafo es navegable
y funcional, no solo decorativo.

## Librería
Usar react-force-graph-2d. Es una librería que implementa grafos
de fuerza dirigida (los nodos se repelen entre sí y las aristas
los atraen) con Canvas 2D, lo que garantiza buen rendimiento
incluso con cientos de nodos. No usar D3 directamente porque
añade complejidad innecesaria de bajo nivel.

## Datos del grafo
El endpoint GET /api/graph devuelve un objeto con dos arrays.
El array "nodes" contiene un objeto por cada nota con: id, title,
type ("note"), folder, y weight (número de backlinks entrantes,
que determina el tamaño visual del nodo). El array "links"
contiene un objeto por cada wiki-link con: source (id de la nota
origen), target (id de la nota destino), y type ("wikilink").

Los nodos sin ninguna conexión (notas huérfanas) aparecen en el
grafo pero más pequeños y con menor opacidad, para que el usuario
pueda identificar qué notas están aisladas de su red de conocimiento.

## Visualización
Cada nodo es un círculo cuyo tamaño es proporcional a su weight
(notas con más backlinks aparecen más grandes, indicando que son
conceptos centrales en la red). El color por defecto es
--color-indigo. Las aristas son líneas con una pequeña flecha
indicando la dirección del enlace.

Al hacer hover sobre un nodo, se resaltan visualmente ese nodo
y todas sus conexiones directas, y el resto del grafo se atenúa.
Esto permite entender el vecindario inmediato de un concepto
sin ruido visual.

Al hacer clic en un nodo, se abre la nota correspondiente en el
editor de notas, en un panel lateral derecho, sin abandonar la
vista del grafo. Esto permite leer y editar notas mientras se
navega el grafo.

## Controles
El grafo tiene zoom con la rueda del ratón y arrastre del canvas
para navegar. Los nodos individuales son arrastrables para
reorganizar el layout manualmente. Hay un botón "Reset layout"
que devuelve el grafo a su disposición automática por fuerzas.

En la esquina superior derecha hay un campo de búsqueda que
resalta el nodo cuyo título coincide con el texto escrito,
navegando el canvas hacia él si está fuera del viewport.

## Filtros
Una barra de filtros permite mostrar solo nodos de una carpeta
específica, o solo nodos con más de N conexiones. Esto es útil
cuando el grafo crece y se vuelve difícil de leer en su totalidad.
