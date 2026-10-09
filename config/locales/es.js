/**
 * Spanish (Spain) translation of the portal chrome.
 *
 * Generated from the inline French and English labels (`npm run i18n:extract`),
 * then translated. Keys mirror the English source; a key missing here reads
 * English. Edit translations here, and the source labels in their components.
 */
const LOCALE = {
    "app/(home)/page#LOCAL": {
        "state": "Mi expediente",
        "detail": "Por hacer"
    },
    "app/company/page#LABELS": {
        "title": "Mi empresa",
        "noSupplier": "Sin ficha de proveedor",
        "noSupplierHint": "Su cuenta no está vinculada a ningún proveedor. Póngase en contacto con su interlocutor en el cliente.",
        "approval": "Estado de homologación",
        "approvalHint": "Calculado en tiempo real a partir de sus documentos, proyectos y no conformidades.",
        "reasons": {
            "documentExpired": "Un documento obligatorio ha caducado",
            "documentExpiring": "Un documento obligatorio está a punto de caducar",
            "documentMissing": "No se ha aportado un documento obligatorio",
            "blockingNc": "Hay una no conformidad bloqueante abierta",
            "openProject": "Hay un proyecto de referenciación en curso",
            "blockingCatalog": "No se cumple un catálogo bloqueante"
        },
        "metrics": {
            "documentsExpired": "Documentos caducados",
            "documentsExpiring": "Documentos a punto de caducar",
            "documentsMissing": "Documentos que faltan",
            "openNc": "NC abiertas",
            "openProjects": "Proyectos abiertos"
        },
        "sections": {
            "identity": "Identidad",
            "surveyList": "Cuestionario",
            "contactList": "Contactos",
            "plant": "Centros",
            "certification": "Certificaciones",
            "documents": "Documentos",
            "specs": "Especificaciones"
        },
        "frozen": "Lista validada por el cliente — solo lectura",
        "emptyList": "Ninguna fila",
        "emptyListHint": "Esta sección aún no se ha cumplimentado.",
        "questionnaire": "{done} / {total} preguntas respondidas",
        "noProperties": "Ninguna propiedad que mostrar",
        "yes": "Sí",
        "no": "No",
        "code": "Código",
        "request": "Solicitar una actualización"
    },
    "app/documents/page#LABELS": {
        "title": "Mis documentos",
        "tabRequirements": "Requisitos",
        "tabAll": "Todos los documentos",
        "tabSigned": "Firmados",
        "deposit": "Subir un documento",
        "depositTitle": "Subir un documento",
        "depositHint": "Elija el producto al que corresponde y, a continuación, suelte el archivo. beCPG deduce el tipo y la validez.",
        "entity": "Producto asociado",
        "chooseEntity": "Elija un producto…",
        "filters": {
            "open": "Pendientes",
            "blocking": "Bloqueantes",
            "expiring": "A punto de caducar",
            "done": "Aportados",
            "all": "Todos"
        },
        "stats": {
            "toProvide": "Por aportar",
            "expired": "Caducados",
            "expiring": "Caducan en < {days} d",
            "compliance": "Conformidad documental",
            "mandatory": "{done} / {total} obligatorios",
            "noScope": "ningún perímetro que evaluar"
        },
        "search": "Buscar un documento",
        "noMatch": "Ningún documento coincide con este filtro",
        "noMatchHint": "Pruebe «Todos» para ver todos los documentos.",
        "columns": {
            "document": "Documento",
            "entity": "Producto",
            "status": "Estado",
            "validity": "Validez",
            "modified": "Modificado",
            "ai": "Revisión IA",
            "actions": ""
        },
        "download": "Descargar",
        "noFile": "Aún no aportado",
        "blockingBanner": "{count} documento(s) obligatorio(s) bloquean su homologación. Aparecen al principio de la lista.",
        "scopeEmpty": "Su cuenta no está vinculada a ningún proveedor, por lo que no se puede calcular ningún requisito documental. Los contadores anteriores están vacíos, no cumplidos. Póngase en contacto con su interlocutor en el cliente."
    },
    "app/error#LABELS": {
        "title": "No se ha podido mostrar esta página",
        "message": "Se ha producido un error técnico durante la visualización. Lo que haya introducido no se ha perdido: se guarda sobre la marcha.",
        "retry": "Reintentar",
        "home": "Volver al inicio",
        "reference": "Referencia que debe indicar al soporte"
    },
    "app/global-error#LABELS": {
        "title": "No se ha podido iniciar el portal",
        "message": "Un error técnico impide mostrar el portal. Vuelva a intentarlo; si persiste, póngase en contacto con su interlocutor de beCPG indicando la referencia siguiente.",
        "retry": "Reintentar",
        "reference": "Referencia"
    },
    "app/help/page#LABELS": {
        "title": "Ayuda",
        "subtitle": "Cómo funciona el portal, paso a paso",
        "scope": "Portal de proveedores beCPG",
        "search": "Buscar en la ayuda",
        "expandAll": "Desplegar todo",
        "collapseAll": "Plegar todo",
        "topics": "Índice",
        "noResult": "Ningún tema coincide",
        "noResultHint": "Pruebe con otra palabra: «documento», «firma», «paso», «homologación».",
        "anchor": "Enlace a este tema",
        "anchorCopied": "Enlace copiado",
        "goTo": "Ir a",
        "monitorNotice": "Esta ayuda describe la vista del proveedor: las pantallas que ven sus proveedores, donde «su cliente» designa a su propia empresa. El espacio de seguimiento aún no está documentado."
    },
    "app/help/page#TOPICS": [
        {
            "id": "start",
            "icon": "flag",
            "title": "Por dónde empezar",
            "summary": "El panel de control responde a una sola pregunta: qué se espera de usted, y para cuándo.",
            "blocks": [
                {
                    "p": "Todo empieza en el panel de control. Las cuatro tarjetas superiores resumen su expediente con este cliente:"
                },
                {
                    "ul": [
                        "**Estado de homologación** — Homologado, En curso, Por renovar o Suspendido, con la fecha de validez.",
                        "**Cumplimentación** — la proporción de campos esperados ya cumplimentados en sus fichas.",
                        "**Acciones requeridas** — cuántas tareas están abiertas y cuántas van con retraso.",
                        "**Documentos** — cuántos son válidos, cuántos caducan pronto y cuántos faltan."
                    ]
                },
                {
                    "p": "Debajo, las listas muestran el detalle: sus tareas, sus productos, sus documentos, sus conversaciones y sus notificaciones. La campana de la cabecera muestra la misma lista de notificaciones desde cualquier pantalla."
                },
                {
                    "note": "Una misma cuenta puede trabajar para varios clientes de beCPG, con un portal por cliente. El logotipo y el nombre del cliente se muestran siempre arriba a la izquierda: así sabe en qué expediente se encuentra."
                },
                {
                    "warn": "Si aparece un banner «Instancia de TEST», está en un entorno de pruebas: nada de lo que introduzca en él tiene valor contractual."
                },
                {
                    "links": [
                        {
                            "href": "/",
                            "icon": "dashboard",
                            "label": "Panel de control"
                        },
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Mis tareas"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Mis documentos"
                        }
                    ]
                }
            ]
        },
        {
            "id": "tasks",
            "icon": "assignment_turned_in",
            "title": "Cómo funciona una tarea de referenciación",
            "summary": "Una tarea procede de un proyecto abierto por su cliente. Su tipo determina la pantalla a la que accede.",
            "blocks": [
                {
                    "p": "Su cliente abre un proyecto de referenciación, y ese proyecto le envía tareas. Una tarea tiene un título, el producto afectado, una fecha límite y un tipo. Al hacer clic en una tarea accede directamente a la pantalla que permite completarla — no hay ninguna página intermedia."
                },
                {
                    "ul": [
                        "**Asistente** — introducción guiada de datos de una ficha de producto o de su ficha de proveedor.",
                        "**Firma** — lectura de un documento PDF y, a continuación, firma.",
                        "**Documento** — subida o renovación de un documento esperado.",
                        "**Revisión** — lectura completa de un producto, sin nada que introducir."
                    ]
                },
                {
                    "p": "Una tarea Planificada o En curso le está esperando. Una tarea Rechazada le ha sido devuelta por su cliente con un motivo: lea la observación antes de volver a enviarla. Una tarea Terminada no requiere nada más."
                },
                {
                    "p": "Una tarea que ha superado su fecha límite se marca como retrasada, tanto en la lista como en las notificaciones. Con más de siete días de retraso pasa a rojo."
                },
                {
                    "note": "Puede abrir y salir de una tarea tantas veces como necesite: permanece abierta hasta que usted mismo la complete, y no se pierde nada entre dos visitas."
                },
                {
                    "links": [
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Mis tareas"
                        }
                    ]
                }
            ]
        },
        {
            "id": "wizard",
            "icon": "auto_stories",
            "title": "El orden de los pasos del asistente",
            "summary": "Ficha técnica en la cabecera, un panel Contexto permanente, las secciones de su cliente y, por último, la conformidad.",
            "blocks": [
                {
                    "p": "El asistente sigue siempre el mismo orden. No es un recorrido cerrado: en cuanto ha visitado un paso, puede volver a él libremente."
                },
                {
                    "ol": [
                        "**Cabecera · Ficha técnica** — lo primero que se espera de usted. Mientras falte, una franja roja lo indica encima de cada paso; una vez subida, solo queda una línea con su fecha y su validez. Es el documento que lee la IA para proponer valores: sin él, no hay nada que leer. Si su cliente no ha configurado ese tipo de documento, la franja no se muestra.",
                        "**Paso 0 · Contexto** — un panel siempre visible, que en un teléfono se convierte en una hoja a un toque de distancia. Contiene las propuestas de la IA, la especificación aplicable, las listas que su cliente ya ha validado y los rechazos anteriores. Nunca se recorre: está ahí sea cual sea el paso en el que se encuentre.",
                        "**Las secciones de su cliente** — propiedades, cuestionario, ingredientes, nutrientes, alérgenos, características fisicoquímicas, alegaciones, microbiología, características organolépticas, materiales de envase, documentos… Qué secciones aparecen, y en qué orden, depende de la configuración de su cliente y del tipo de producto: el portal no las elige.",
                        "**Documentos** — el paso conserva el lugar que le ha dado su cliente, normalmente hacia el final. Es intencionado: beCPG deduce los documentos esperados de lo que usted ha introducido (una alegación «sin OGM» requiere su certificado), por lo que, si se pidiera demasiado pronto, la lista estaría vacía o sería errónea. Solo la ficha técnica se espera en todos los casos, y está en la cabecera.",
                        "**Conformidad** — la lista de los campos que aún faltan, en la que puede hacer clic en cada uno para ir directamente a él, además de la puntuación de cumplimentación. Si su cliente ha definido un control bloqueante, no podrá terminar hasta que se cumpla."
                    ]
                },
                {
                    "note": "Cada sección se guarda automáticamente, sin ningún botón que pulsar. El indicador «Guardado a las HH:MM», en la parte inferior del asistente junto a los botones de navegación, lo confirma — y retoma exactamente donde lo dejó si cierra el portal, cambia de dispositivo o pierde la conexión."
                },
                {
                    "p": "Entre algunos pasos su ficha se recalcula (alérgenos, nutrientes, costes…). Ese cálculo se ejecuta en segundo plano y nunca le bloquea: puede seguir escribiendo mientras se realiza."
                },
                {
                    "p": "En una pantalla ancha, «Ampliar la zona de introducción» oculta los paneles laterales y reduce la lista de pasos a sus iconos, para las tablas anchas. La elección se recuerda de una ficha a otra; los paneles siguen a un clic, mediante los iconos de la cabecera."
                },
                {
                    "note": "Si su interlocutor introduce datos en su nombre, un banner «está introduciendo datos para …» lo indica explícitamente en la parte superior del asistente."
                }
            ]
        },
        {
            "id": "grids",
            "icon": "grid_on",
            "title": "Introducir datos rápidamente en una tabla",
            "summary": "Ingredientes, nutrientes, alérgenos: todo se hace con el teclado, y un bloque de hoja de cálculo se pega directamente.",
            "blocks": [
                {
                    "p": "Las secciones en forma de tabla — ingredientes, nutrientes, alérgenos, características fisicoquímicas… — se cumplimentan sin soltar el teclado. El botón del teclado situado encima de la tabla vuelve a mostrar la lista en cualquier momento."
                },
                {
                    "ul": [
                        "**Tab / Shift+Tab** — celda siguiente / anterior.",
                        "**Enter** — guarda la fila y baja en la misma columna; en la última fila, añade una.",
                        "**↑ / ↓** — misma columna, fila superior / inferior.",
                        "**Esc** — descarta los cambios de la fila en edición.",
                        "**Ctrl+D** — duplica la fila actual.",
                        "**Ctrl+V** — pega un bloque de celdas procedente de una hoja de cálculo."
                    ]
                },
                {
                    "p": "Al pegar desde una hoja de cálculo se toman varias filas y columnas a la vez, se crean las filas que faltan y se le indica lo que no se ha podido tomar — un valor fuera de la lista propuesta, un número esperado donde hay texto, una columna de solo lectura. No se adivina nada: todo lo que no tiene una correspondencia exacta se le devuelve para que lo corrija."
                },
                {
                    "note": "Como en todo el asistente, una fila se guarda en cuanto la abandona — o al pulsar Enter, o en cuanto marca una casilla. No hay botón de guardar: no hay nada que confirmar. Solo un pegado ofrece «Guardar las N filas», porque nadie ha revisado esas filas."
                },
                {
                    "p": "En un teléfono, la tabla se convierte en una tarjeta por fila: los mismos campos, apilados, sin desplazamiento horizontal."
                }
            ]
        },
        {
            "id": "specs",
            "icon": "menu_book",
            "title": "Especificación y catálogo: cuál es la diferencia",
            "summary": "Una especificación se lee. Un catálogo se cumplimenta — y es él el que decide si puede terminar.",
            "blocks": [
                {
                    "p": "Son dos objetos distintos, y no sirven para el mismo momento. Lo más sencillo es verlos en el orden en que los encuentra."
                },
                {
                    "ul": [
                        "**La especificación** — un documento de su cliente, asociado a un producto o a una familia de productos. Enuncia sus exigencias: materias prohibidas, orígenes aceptados, umbrales analíticos, condiciones de transporte, compromisos de RSC. Es un **texto de referencia**, para leer. El portal la muestra en el panel «Contexto» del asistente, y la pantalla «Especificaciones» las reúne todas.",
                        "**El catálogo** — una **lista de campos obligatorios** definida por su cliente: «para referenciar una materia prima conmigo, necesito el origen, la densidad, el código EAN, el alérgeno principal…». No es un texto, es un control. El portal lo calcula continuamente y le da su puntuación en el paso «Conformidad»."
                    ]
                },
                {
                    "p": "Dicho de otro modo: la especificación le indica **lo que su cliente espera de su producto**, el catálogo verifica **que su ficha está completa**. Puede cumplir la especificación y tener aun así una ficha incompleta, y a la inversa."
                },
                {
                    "p": "Solo uno de los dos le impide enviar: el catálogo. Cuando su cliente ha declarado uno bloqueante, el botón «Terminar» no está disponible mientras falte un campo, y el paso «Conformidad» indica exactamente cuáles — cada línea le lleva al campo."
                },
                {
                    "note": "Una especificación también puede requerir documentos (un certificado ecológico, un certificado sin OGM). Estos aparecen en «Mis documentos» y en el paso Documentos, con sus fechas de validez — no en el catálogo."
                },
                {
                    "links": [
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Especificaciones"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Mis documentos"
                        }
                    ]
                }
            ]
        },
        {
            "id": "frozen",
            "icon": "lock",
            "title": "Qué significa una lista bloqueada",
            "summary": "Una lista validada por su cliente pasa a ser de solo lectura. Es intencionado, y reversible a petición.",
            "blocks": [
                {
                    "p": "Cuando su cliente valida una sección — la lista de ingredientes, el cuestionario, los alérgenos… — esa sección queda **bloqueada**: sigue viéndola con todos sus valores, pero ya no puede modificarla. Un candado y la mención «Solo lectura» lo indican."
                },
                {
                    "p": "Ese es el objetivo: una vez validado, un valor se convierte en la referencia en la que se basa su cliente (etiquetado, especificaciones, controles). Si pudiera cambiar sin que lo supiera, su validación no tendría ningún valor."
                },
                {
                    "p": "Las listas bloqueadas también aparecen en el panel «Contexto» del asistente, en «Listas validadas»: es la forma más rápida de ver lo que está cerrado y lo que sigue abierto."
                },
                {
                    "warn": "¿Ha detectado un error en una lista bloqueada? No cree una ficha duplicada. Solicite la reapertura de la sección mediante la conversación asociada a la ficha: su cliente la desbloquea y vuelve a poder editarla."
                },
                {
                    "p": "Una ficha completa también puede ser de solo lectura por otro motivo: la tarea está terminada, el proyecto está cerrado o solo tiene acceso de lectura. El asistente le indica cuál de ellos se aplica."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Conversaciones"
                        }
                    ]
                }
            ]
        },
        {
            "id": "confidence",
            "icon": "auto_awesome",
            "title": "Lo que propone la IA",
            "summary": "Propuestas — nunca valores escritos en su lugar.",
            "blocks": [
                {
                    "p": "Cuando la extracción automática está activada en su cliente, el portal lee sus documentos y propone los valores que ha encontrado. Aparecen en el panel «Contexto», a la derecha del formulario, y se vuelven a leer en cada cambio de paso — lo que acaba de introducir cambia lo que queda por proponer."
                },
                {
                    "p": "Todo empieza por la **ficha técnica**, en la cabecera del asistente. Mientras no se haya subido no hay nada que leer y la lista de propuestas permanece vacía: eso es lo que significa la franja roja."
                },
                {
                    "ul": [
                        "**Aplicar** — el valor se escribe en la ficha. No se escribe nada antes de ese clic.",
                        "**Ampliar** — para los análisis largos que no caben en el panel."
                    ]
                },
                {
                    "note": "Una propuesta que no desea no necesita ser rechazada: no la aplique, que es ya el comportamiento por defecto. Ningún valor se aplica nunca automáticamente, por segura que parezca la lectura. Usted es quien compromete la ficha: la decisión es suya, campo por campo."
                },
                {
                    "p": "En todos los casos, el valor final es suyo: usted sigue siendo responsable de lo que valida, y nada llega a su cliente antes de que complete la tarea."
                }
            ]
        },
        {
            "id": "documents",
            "icon": "folder_shared",
            "title": "Validez y renovación de los documentos",
            "summary": "El portal sabe qué documentos se esperan, cuánto tiempo son válidos y cuáles faltan.",
            "blocks": [
                {
                    "p": "Los documentos esperados no son una lista que deba adivinar: los configura su cliente (tipo de documento, obligatorio o no, duración de validez, ámbito), y la pantalla «Mis documentos» se los muestra tal cual, producto por producto."
                },
                {
                    "ul": [
                        "**Válido** — aportado, aceptado, y su fin de validez no está próximo.",
                        "**Por renovar** — el fin de validez está a menos de 60 días (un plazo que su cliente puede ajustar).",
                        "**Caducado** — el fin de validez ha pasado. Para un documento obligatorio, esto suspende su homologación.",
                        "**Falta** — esperado y nunca aportado.",
                        "**Rechazado** — aportado, pero rechazado por su cliente: lea el motivo antes de volver a subirlo."
                    ]
                },
                {
                    "p": "Cada documento tiene un periodo de validez (inicio y fin), mostrado en su línea y coloreado como lo colorea beCPG: **verde** mientras está dentro de su periodo, **naranja** al acercarse el vencimiento, **rojo** una vez superado."
                },
                {
                    "p": "Según el tipo, ese periodo se deduce automáticamente de la fecha de subida y de la duración configurada por su cliente, o **debe introducirlo usted**: en ese caso aparecen dos campos de fecha en la zona de subida, que se cumplimentan a partir del documento que está subiendo. Acompañan al archivo y siguen siendo editables después mediante «Modificar» en la línea."
                },
                {
                    "warn": "Un documento obligatorio cuya validez nunca se ha introducido se marca en rojo, «Validez por introducir». Sin fecha de fin nunca caducará, no se enviará ningún recordatorio y su cliente no sabrá desde cuándo es válido."
                },
                {
                    "p": "Renovar significa subir una nueva versión en la misma línea — nunca crear una segunda línea. La versión anterior permanece en el historial del documento con su propio periodo de validez: es lo que demuestra que estaba cubierto en una fecha pasada."
                },
                {
                    "note": "El nombre del archivo y el lugar donde se archiva no importan: el portal renombra y archiva el documento según la configuración de su cliente. Suba el archivo tal como se lo entregaron."
                },
                {
                    "p": "beCPG envía los recordatorios por correo electrónico antes del vencimiento según las reglas definidas por su cliente. El portal muestra siempre el estado real: no se fíe del correo, «Mis documentos» es la referencia."
                },
                {
                    "links": [
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Mis documentos"
                        }
                    ]
                }
            ]
        },
        {
            "id": "approval",
            "icon": "verified",
            "title": "El estado de homologación",
            "summary": "Calculado en directo a partir de sus documentos, sus fichas y sus no conformidades. Nunca fijo.",
            "blocks": [
                {
                    "p": "El estado que se muestra en el panel de control no es una decisión introducida a mano: se recalcula cada vez que se muestra, a partir de su expediente. Corrija la causa y cambiará."
                },
                {
                    "ul": [
                        "**Suspendido** — al menos un documento obligatorio ha caducado, o hay una no conformidad bloqueante abierta.",
                        "**Por renovar** — al menos un documento obligatorio está a punto de caducar.",
                        "**En curso** — hay un proyecto de referenciación abierto, o nunca se ha aportado un documento obligatorio, o no se cumple un control bloqueante.",
                        "**Homologado** — ninguno de los casos anteriores."
                    ]
                },
                {
                    "p": "La tarjeta del panel de control enumera los motivos del estado: en cada uno se puede hacer clic y le lleva a lo que hay que corregir."
                },
                {
                    "note": "Ese mismo estado lo leen los sistemas de compras de su cliente. Por tanto, un documento obligatorio caducado puede bloquear un pedido, no solo mostrar una etiqueta naranja."
                }
            ]
        },
        {
            "id": "signature",
            "icon": "draw",
            "title": "Cómo funciona la firma",
            "summary": "Se le pide que primero lea y después firme. La firma la aplica beCPG, no su navegador.",
            "blocks": [
                {
                    "p": "Una tarea de Firma abre el documento en un visor integrado en el portal. El archivo nunca sale del portal y sigue siendo utilizable en un teléfono."
                },
                {
                    "ol": [
                        "**Lea todo el documento.** El progreso de lectura se sigue página a página: mientras no se haya mostrado una página, la firma no está disponible.",
                        "**Dibuje su firma** con el dedo, el ratón o un lápiz, en los lugares preparados por su cliente. Las zonas de firma y de rúbrica se han colocado previamente: no tiene que situarlas.",
                        "**Marque la casilla de consentimiento** y, a continuación, envíe. La tarea se envía una sola vez."
                    ]
                },
                {
                    "p": "beCPG firma el documento en su servidor, archiva la versión firmada y la envía por correo a los destinatarios. El portal no emite ningún certificado propio."
                },
                {
                    "note": "Si se corta la conexión durante el envío, vuelva a intentarlo: la solicitud lleva un identificador único, por lo que una solicitud recibida dos veces no firma dos veces. Un documento ya firmado se muestra como tal, con su descarga, en lugar de pedirle que vuelva a firmar."
                },
                {
                    "warn": "Una firma no se puede rechazar ni deshacer desde el portal. Si el documento es incorrecto, no firme: abra la conversación e indíqueselo a su cliente."
                }
            ]
        },
        {
            "id": "discussion",
            "icon": "forum",
            "title": "Dónde llegan las observaciones de su cliente",
            "summary": "Una conversación por ficha, pero cada mensaje está anclado a aquello a lo que se refiere.",
            "blocks": [
                {
                    "p": "La conversación de una ficha es la misma en ambos lados: lo que su cliente escribe desde beCPG le llega aquí, y sus respuestas le llegan allí. No hay ningún buzón aparte que vigilar."
                },
                {
                    "p": "Un mensaje puede anclarse en tres lugares, y el selector de la parte superior del panel le permite elegir cuál lee o a cuál se dirige:"
                },
                {
                    "ul": [
                        "**Toda la ficha** — la conversación completa, incluidas las observaciones dejadas en un campo o en una fila de tabla. Es la vista por defecto.",
                        "**Un campo** — «la razón social está incompleta». Aparece entonces una burbuja junto a ese campo en el asistente.",
                        "**Una fila de tabla** — «las grasas saturadas son incorrectas». La observación sigue a la fila, no al número de fila."
                    ]
                },
                {
                    "note": "Escribir desde un campo o una fila en lugar de desde «Toda la ficha» ahorra tiempo a todos: su interlocutor ve inmediatamente de qué habla, sin buscar entre doscientos campos."
                },
                {
                    "p": "La conversación pasa a ser de solo lectura una vez cerrada la referenciación: puede releer el intercambio, pero no añadir nada. La pantalla le indica cuál de esos motivos se aplica."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Conversaciones"
                        }
                    ]
                }
            ]
        },
        {
            "id": "contact",
            "icon": "support_agent",
            "title": "A quién dirigirse",
            "summary": "Su interlocutor es su cliente. La conversación asociada a la ficha es el canal adecuado.",
            "blocks": [
                {
                    "p": "Este portal lo abre para usted su cliente: configura los documentos esperados, los pasos del asistente, las validaciones y los plazos. Por tanto, es su primer interlocutor para todo lo relativo al contenido."
                },
                {
                    "ul": [
                        "**Una pregunta sobre una ficha, una observación, una corrección, una lista que desbloquear** — utilice la conversación asociada a la ficha o a la tarea. Su mensaje llega a la persona que sigue su expediente y queda asociado al producto afectado.",
                        "**Un documento rechazado sin un motivo claro** — responda en la conversación del producto antes de volver a subirlo.",
                        "**Un plazo que no puede cumplir** — indíquelo en la conversación en lugar de dejar que la tarea se retrase.",
                        "**Un problema de acceso** (contraseña, compañero que añadir, cuenta que cerrar) — diríjase a su interlocutor en el cliente: las cuentas se crean y se cierran por su parte, no desde este portal."
                    ]
                },
                {
                    "note": "Los contactos que ha declarado, y los contactos de su cliente, figuran en su ficha de proveedor, pestaña Contactos."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Conversaciones"
                        },
                        {
                            "href": "/company",
                            "icon": "business",
                            "label": "Mi empresa"
                        },
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Especificaciones"
                        }
                    ]
                }
            ]
        }
    ],
    "app/login/page#PAGE_TEXT": {
        "welcome": "Bienvenido",
        "intro": "Inicie sesión para acceder a su espacio de proveedor: sus tareas, sus productos, sus documentos y su estado de homologación.",
        "chooseTenant": "Seleccione su cliente",
        "chooseTenantHelp": "¿Trabaja para varios clientes de beCPG? Elija aquel cuyo expediente desea abrir.",
        "sso": "Será redirigido al servicio de autenticación de su cliente.",
        "testNotice": "Instancia de TEST — los datos introducidos aquí no tienen valor contractual.",
        "help": "¿Necesita ayuda?",
        "errorTitle": "Error al iniciar sesión",
        "pitch": "El portal de proveedores beCPG",
        "sellingPoints": [
            {
                "icon": "assignment_turned_in",
                "text": "Sus solicitudes de referenciación y sus tareas, en un solo lugar"
            },
            {
                "icon": "folder_shared",
                "text": "Sus documentos y certificados, con sus fechas de caducidad"
            },
            {
                "icon": "verified",
                "text": "Su estado de homologación, mantenido al día por su cliente"
            }
        ]
    },
    "app/login/page#ERROR_TEXT": {
        "oidc_not_configured": "La autenticación no está configurada para este cliente.",
        "tenant_mismatch": "Su sesión pertenecía a otro cliente. Vuelva a iniciar sesión.",
        "dev_auth_misconfigured": "El modo de desarrollo está activado pero mal configurado.",
        "session_expired": "Su sesión ha caducado. Vuelva a iniciar sesión."
    },
    "app/messages/page#LABELS": {
        "title": "Conversaciones",
        "subjects": "Asuntos",
        "messageCount": "{count} mensaje(s)",
        "search": "Buscar un asunto",
        "myRecord": "Mi ficha de proveedor",
        "back": "Asuntos",
        "placeholder": "Escriba un mensaje…",
        "send": "Enviar",
        "sending": "Enviando…",
        "empty": "Ningún mensaje",
        "emptyHint": "Inicie la conversación — se notificará al cliente.",
        "noSubject": "Elija un asunto",
        "noSubjectHint": "Seleccione un producto o su ficha para ver los intercambios.",
        "noSubjects": "Ningún asunto de conversación",
        "noSubjectsHint": "Las conversaciones dependen de sus productos. Actualmente no tiene ningún producto vinculado.",
        "field": "Campo",
        "edited": "editado",
        "you": "Usted",
        "openSubject": "Abrir la ficha",
        "thread": "Conversación",
        "more": "Cargar más",
        "loading": "Cargando…",
        "tooLong": "Mensaje demasiado largo (20.000 caracteres como máximo).",
        "denyReasons": {
            "noAssignedTask": "La referenciación está cerrada: esta conversación es de solo lectura.",
            "readAccess": "Solo tiene acceso de lectura a esta ficha.",
            "noPermission": "No tiene permiso para escribir en esta conversación."
        }
    },
    "app/monitor/campaigns/[id]/page#LABELS": {
        "back": "Proyectos",
        "notFound": "Proyecto no encontrado",
        "notFoundHint": "Este proyecto no existe, no es un proyecto de proveedor o está fuera de su perímetro.",
        "kpi": {
            "response": "Tasa de respuesta",
            "age": "Abierto desde hace",
            "due": "Fecha límite",
            "tasks": "Tareas abiertas"
        },
        "hints": {
            "days": "{count} d",
            "noDue": "Sin fecha límite",
            "overdue": "{count} d de retraso",
            "dueIn": "en {count} d",
            "late": "{count} con retraso",
            "unanswered": "Sin respuesta desde su apertura"
        },
        "tasks": "Tareas abiertas",
        "tasksEmpty": "Ninguna tarea abierta en este proyecto.",
        "tasksHint": "Lo que espera el flujo de trabajo, y de quién.",
        "noAssignee": "Sin asignar",
        "entities": "A qué se refiere el proyecto",
        "entitiesHint": "Abra la ficha para leer los datos que se están introduciendo y su conversación.",
        "entitiesEmpty": "Este proyecto no hace referencia a ninguna ficha.",
        "unreadable": "Fuera de su perímetro",
        "open": "Abrir",
        "suppliers": "Proveedores",
        "manager": "Responsable",
        "discussion": "Conversación del proyecto",
        "state": "Estado"
    },
    "app/monitor/campaigns/page#LABELS": {
        "title": "Proyectos",
        "subtitle": "Proyectos de referenciación y de renovación abiertos. Seleccione proyectos para enviar un recordatorio a sus proveedores o escalarlos.",
        "stats": {
            "open": "Proyectos abiertos",
            "openState": "Proyectos · {state}",
            "response": "Tasa de respuesta",
            "unanswered": "Sin respuesta",
            "reminders": "Recordatorios pendientes"
        },
        "hints": {
            "scanned": "{count} analizados",
            "meanCompletion": "Avance medio {value}%",
            "escalations": "{count} por escalar",
            "late": "{count} con retraso",
            "noEscalation": "Ninguna escalada necesaria",
            "answered": "{count} con respuesta"
        },
        "startCampaign": "Iniciar un proyecto",
        "allOpen": "Todos los proyectos abiertos",
        "state": "Estado del proyecto",
        "sortLabel": "Ordenar por",
        "sorts": {
            "dueDate": "Fecha límite más próxima",
            "completion": "Tasa de respuesta más baja",
            "age": "Abiertos desde hace más tiempo",
            "name": "Nombre"
        },
        "searchSupplier": "Filtrar por proveedor",
        "truncated": "Ventana de análisis: beCPG limita un listado a 250 filas y se han leído {scanned} proyecto(s). La ordenación y los totales de esta página abarcan esa ventana — restrinja el estado o el perímetro para obtener una vista completa.",
        "scopeEmpty": "Ningún proveedor coincide con este perímetro. No se le puede asociar ningún proyecto: los contadores anteriores son ceros por construcción, no mediciones.",
        "parkScoped": "Contadores limitados al perímetro filtrado ({count} proveedor(es)).",
        "noRate": "Ningún proyecto que puntuar",
        "unsupported": "Filtro(s) no admitido(s) por el modelo estándar de beCPG: {names}. Configúrelos en el lado del cliente.",
        "pageOf": "{from}-{to} de {total} proyectos",
        "previous": "Anterior",
        "next": "Siguiente",
        "rows": "Filas",
        "reminder": "Su proyecto abierto en el portal sigue esperando su respuesta. Le rogamos que complete lo antes posible las tareas que se le han asignado.",
        "hintTargets": "Proveedores de los proyectos seleccionados",
        "noteReminder": "beCPG no conserva ningún registro de recordatorios: la columna «Último recordatorio» muestra la última actividad del proyecto, el dato más cercano realmente disponible.",
        "truncatedShort": "Ventana: {scanned} proyectos leídos"
    },
    "app/monitor/documents/page#LABELS": {
        "title": "Conformidad documental",
        "subtitle": "Matriz proveedor × tipo de documento. Seleccione celdas o filas para enviar un recordatorio masivo.",
        "search": "Buscar un proveedor",
        "allTypes": "Todos los tipos de documento",
        "allStatuses": "Todos los estados",
        "mandatoryOnly": "Solo documentos obligatorios",
        "export": "Exportar (CSV)",
        "stats": {
            "suppliers": "Proveedores",
            "missing": "Faltan",
            "expired": "Caducados",
            "expiring": "Por renovar",
            "refused": "Rechazados"
        },
        "statuses": {
            "valid": "Válido",
            "expiring": "Caduca pronto",
            "expired": "Caducado",
            "missing": "Falta",
            "refused": "Rechazado",
            "toValidate": "En revisión"
        },
        "truncated": "Parque mayor que la ventana de análisis ({scanned} proveedores de {total}): restrinja los filtros para obtener una matriz completa.",
        "scopeEmpty": "Ningún proveedor coincide con este perímetro. No se ha ejecutado ninguna consulta de documentos: los contadores anteriores son ceros por construcción, no mediciones.",
        "cellsScope": "celdas · sobre los {total} proveedores del parque",
        "statusScope": "Filtro de visualización «{status}»: {kept} fila(s) conservada(s) de las {shown} mostradas en esta página. Los contadores anteriores abarcan los {total} proveedores del parque, no esta página.",
        "unsupported": "Filtro(s) no admitido(s) por el modelo estándar de beCPG: {names}. Configúrelos en el lado del cliente.",
        "pageOf": "{from}-{to} de {total} proveedores",
        "previous": "Anterior",
        "next": "Siguiente",
        "rows": "Filas",
        "reminder": "Su expediente de proveedor tiene documentos que actualizar en el portal: {types}. Le rogamos que los suba lo antes posible.",
        "reminderGeneric": "A su expediente de proveedor le faltan documentos obligatorios o los tiene caducados. Le rogamos que los actualice en el portal.",
        "hintTypes": "{count} tipo(s) de documento afectado(s)"
    },
    "app/monitor/layout#LABELS": {
        "metaTitle": "Seguimiento de proveedores — beCPG",
        "metaDescription": "El parque de proveedores de un vistazo: conformidad documental y proyectos",
        "title": "Espacio de seguimiento",
        "denied": "El espacio de seguimiento está reservado a los equipos internos",
        "deniedGroups": "Su cuenta no pertenece a ninguno de los grupos de beCPG que dan acceso al espacio de seguimiento: {groups}. Solicite la pertenencia a su administrador de beCPG.",
        "backSupplier": "Ir a mi panel de control"
    },
    "app/monitor/page#LABELS": {
        "title": "Seguimiento del parque de proveedores",
        "description": "Homologación, conformidad documental, vencimientos, proyectos y no conformidades de su parque, en tiempo real.",
        "generatedAt": "Datos a {time}",
        "openList": "Ver la lista completa",
        "openDocuments": "Conformidad documental",
        "openCampaigns": "Proyectos",
        "openQuality": "No conformidades",
        "truncated": "Parque mayor que la ventana de análisis: {scanned} proveedores leídos de {total}. Los contadores marcados con «≈» están limitados; el desglose y el top 10 abarcan la ventana.",
        "truncatedShort": "Ventana: {scanned} proveedores leídos"
    },
    "app/monitor/products/page#LABELS": {
        "title": "Productos de proveedores",
        "subtitle": "Los productos confiados a un proveedor. Filtre por la fecha del certificado para ver lo que debe renovarse.",
        "search": "Buscar un producto, un código, una razón social…",
        "state": "Estado del producto",
        "anyState": "Todos los estados",
        "certified": "Fecha del certificado",
        "anyCertified": "Todos",
        "certifiedNone": "Sin fecha",
        "certifiedYears": "Certificado hace más de {count} año(s)",
        "columns": {
            "name": "Producto",
            "code": "Código",
            "supplierRef": "Referencia del proveedor",
            "suppliers": "Proveedor(es)",
            "plants": "Centros del proveedor",
            "state": "Estado",
            "certificate": "Fecha del certificado",
            "modified": "Actualizado"
        },
        "age": "hace {count} año(s)",
        "ageMonths": "hace {count} mes(es)",
        "none": "—",
        "empty": "Ningún producto en este perímetro",
        "emptyHint": "Ninguna entidad de producto tiene el aspecto proveedor con estos filtros. Los productos aparecen aquí en cuanto se les asocia un proveedor.",
        "pageOf": "{from} - {to} de {total}",
        "previous": "Página anterior",
        "next": "Página siguiente",
        "rows": "Filas por página",
        "sortScope": "La ordenación se aplica a la página mostrada, no a todo el parque."
    },
    "app/monitor/quality/page#LABELS": {
        "title": "No conformidades",
        "subtitle": "NC de proveedores, plazo de tratamiento y avance de las acciones correctivas. Seleccione NC para enviar un recordatorio, escalar o suspender a los proveedores afectados.",
        "stats": {
            "open": "NC abiertas",
            "blocking": "Bloqueantes",
            "overdue": "Fuera de plazo",
            "delay": "Plazo medio"
        },
        "hints": {
            "total": "{count} en total",
            "blocking": "Pone el estado de homologación en «suspendido»",
            "noBlocking": "Ninguna homologación bloqueada por una NC",
            "actionsLate": "{count} acción(es) correctiva(s) con retraso",
            "noActionsLate": "Ninguna acción correctiva con retraso",
            "closing": "Cierre medio {value} d",
            "noClosing": "Ninguna NC cerrada en este perímetro",
            "closingHidden": "{count} NC cerradas — marque «Incluir las NC cerradas» para ver el plazo de cierre"
        },
        "dayUnit": "d",
        "allStates": "Todos los estados",
        "allTypes": "Todos los tipos",
        "includeClosed": "Incluir las NC cerradas",
        "searchSupplier": "Filtrar por proveedor",
        "truncated": "Más NC que la ventana de análisis ({scanned} analizadas): restrinja los filtros para obtener una vista completa.",
        "inexact": "Contadores aproximados: el motor ha devuelto un total limitado para al menos una consulta.",
        "scopeEmpty": "Ningún proveedor coincide con este perímetro. No se ha ejecutado ninguna consulta: los contadores anteriores son ceros por construcción, no mediciones.",
        "unsupported": "Filtro(s) no admitido(s) por el modelo estándar de beCPG: {names}. Configúrelos en el lado del cliente.",
        "pageOf": "{from}-{to} de {total} NC",
        "previous": "Anterior",
        "next": "Siguiente",
        "rows": "Filas",
        "reminder": "Le concierne una no conformidad abierta. Le rogamos que trate lo antes posible las acciones correctivas asociadas en el portal.",
        "hintTargets": "Proveedores de las NC seleccionadas",
        "note": "Plazo de tratamiento: desde la creación de la NC; para una NC cerrada, entre su creación y su última modificación — beCPG no almacena ninguna fecha de cierre."
    },
    "app/monitor/suppliers/[id]/page#LABELS": {
        "unavailable": {
            "title": "Datos no disponibles",
            "message": "beCPG no ha podido devolver este bloque: la lista vacía no indica nada sobre este proveedor."
        },
        "back": "Proveedores",
        "startCampaign": "Iniciar un proyecto",
        "notFound": "Proveedor no encontrado",
        "notFoundHint": "Este proveedor no existe o está fuera de su perímetro: el portal nunca revela un nodo que sus permisos de beCPG no cubren.",
        "kpi": {
            "approval": "Estado de homologación",
            "completion": "Cumplimentación",
            "documents": "Documentos obligatorios",
            "nc": "NC bloqueantes",
            "campaigns": "Proyectos abiertos"
        },
        "kpiHints": {
            "derived": "Calculado, nunca almacenado",
            "documents": "{expired} caducados · {expiring} a punto de caducar · {missing} faltan",
            "completion": "{count} catálogo(s) activo(s)",
            "campaigns": "{late} con retraso",
            "cached": "estado servido desde la caché"
        },
        "why": {
            "title": "Por qué este estado",
            "subtitle": "Las filas que determinan el estado",
            "empty": "Ninguna anomalía: documentos obligatorios válidos, ninguna NC bloqueante, ningún catálogo bloqueante.",
            "more": "… y {count} más",
            "entity": "en {name}",
            "priority": "prioridad {priority}",
            "catalog": "Catálogo bloqueante no cumplido"
        },
        "documents": {
            "title": "Documentos",
            "subtitle": "Documentos esperados y fechas de validez",
            "empty": "Ningún documento esperado ni aportado para este proveedor",
            "mandatory": "obligatorio",
            "download": "Descargar",
            "summary": "{satisfied}/{mandatory} obligatorios cumplidos · {total} documentos"
        },
        "products": {
            "title": "Productos vinculados",
            "subtitle": "Entidades asociadas al proveedor",
            "empty": "Ningún producto vinculado",
            "emptyHint": "Solo se pueden encontrar los productos archivados bajo el proveedor o asociados a uno de sus proyectos o documentos: una entidad vinculada mediante «Proveedores» y archivada en otro lugar no está indexada por Alfresco."
        },
        "subSuppliers": {
            "title": "Subproveedores",
            "empty": "Ningún subproveedor declarado"
        },
        "projects": {
            "title": "Proyectos abiertos",
            "empty": "Ningún proyecto abierto",
            "manager": "Responsable: {name}",
            "due": "Vence el {date}",
            "late": "Con retraso",
            "unanswered": "Sin respuesta desde hace {days} días"
        },
        "activity": {
            "title": "Historial de intercambios",
            "empty": "Ningún intercambio registrado",
            "message": "Mensaje",
            "activity": "Actividad"
        },
        "process": {
            "title": "Iniciar un proceso",
            "hint": "Referenciación, renovación, apertura de una NC… según lo que permita la instancia.",
            "none": "No se permite ningún proceso en esta instancia (PORTAL_PROCESS_TEMPLATES).",
            "launch": "Iniciar",
            "confirmTitle": "¿Iniciar «{process}»?",
            "confirmMessage": "Se creará un proyecto de beCPG para este proveedor a partir de la plantilla autorizada. Un proceso iniciado no se puede cancelar desde el portal.",
            "started": "Proceso iniciado."
        },
        "identity": {
            "code": "Código",
            "erpCode": "Código ERP",
            "legalName": "Razón social",
            "state": "Estado en beCPG",
            "family": "Familia",
            "subFamily": "Subfamilia",
            "sites": "Centros",
            "subsidiaries": "Filiales",
            "buyer": "Comprador de referencia",
            "email": "Contacto",
            "lastActivity": "Última actividad",
            "parent": "Proveedor principal",
            "none": "—"
        },
        "generatedAt": "Datos a {time}"
    },
    "app/monitor/suppliers/page#LABELS": {
        "title": "Proveedores",
        "statuses": {
            "suspended": "Suspendido",
            "toRenew": "Por renovar",
            "inProgress": "En curso",
            "approved": "Homologado"
        },
        "statusFiltered": "Filtro activo",
        "export": "Exportar (CSV)",
        "exportCutTitle": "Exportación incompleta: {scanned} filas de {total}",
        "exportCutMessage": "beCPG limita un listado a 250 filas por consulta, por lo que la exportación abarca la ventana leída, no todo el parque. Restrinja los filtros (familia, comprador, estado) y exporte por lotes para obtener un archivo completo.",
        "exportCutConfirm": "Exportar la ventana",
        "generatedAt": "Datos a {time}",
        "windowOf": "{from}-{to} de {total} proveedores",
        "previous": "Ventana anterior",
        "next": "Ventana siguiente",
        "truncated": "Parque mayor que la ventana de análisis ({scanned} leídos de {total}): la ordenación y la clasificación abarcan esa ventana. Restrinja los filtros para obtener una clasificación exacta de todo el parque.",
        "sortScope": "Ordenado dentro de la ventana leída",
        "sortedBy": "Orden inicial: {sort}",
        "reminder": "Buenos días:\n\nSu expediente de proveedor necesita una actualización (documentos obligatorios que faltan, caducados o pendientes).\nLe rogamos que inicie sesión en el portal para completarlo.\n\nAtentamente,",
        "countsScope": "Desglose sobre los {scanned} proveedores leídos",
        "sortNames": {
            "risk": "riesgo, descendente",
            "name": "nombre",
            "code": "código",
            "status": "estado de homologación",
            "completion": "cumplimentación",
            "expiring": "documentos a punto de caducar",
            "expired": "documentos caducados",
            "nc": "NC abiertas",
            "lastActivity": "última actividad",
            "buyer": "comprador"
        },
        "truncatedShort": "Ventana: {scanned} proveedores leídos"
    },
    "app/not-found#LABELS": {
        "title": "Página no encontrada",
        "message": "Esta dirección no existe, o el elemento al que apunta ya no es accesible. Si ha llegado desde un correo electrónico, es posible que el enlace haya caducado.",
        "home": "Volver al inicio"
    },
    "app/products/[id]/page#LABELS": {
        "sheet": "Ficha",
        "notFound": "Producto no encontrado",
        "notFoundHint": "Esta ficha no existe o no forma parte de su ámbito.",
        "back": "Mis productos",
        "partial": "Esta ficha se muestra incompleta: hace referencia al menos a un dato que su cuenta no puede leer. Los campos afectados no aparecen en pantalla — lo que no significa que estén vacíos. Solicite acceso a su interlocutor de beCPG si necesita alguno de ellos.",
        "request": "Solicitar una actualización"
    },
    "app/products/page#LABELS": {
        "title": "Mis productos",
        "search": "Buscar un producto",
        "allStates": "Todos los estados",
        "allTypes": "Todos los tipos",
        "branch": "Actualización",
        "branchFrom": "Actualización de la versión {version}",
        "columns": {
            "name": "Producto",
            "code": "Código",
            "type": "Tipo",
            "state": "Estado",
            "completion": "Cumplimentación",
            "project": "Proyecto",
            "supplierRef": "Referencia del proveedor",
            "certificateDate": "Fecha del certificado",
            "modified": "Actualizado",
            "actions": "Acciones"
        },
        "stats": {
            "total": "Productos",
            "valid": "Validados",
            "pending": "En curso",
            "completion": "Cumplimentación media"
        },
        "empty": "Ningún producto",
        "emptyHint": "Aún no tiene ningún producto vinculado. Una ficha aparece aquí en cuanto el cliente le asigna una.",
        "request": "Solicitar una actualización"
    },
    "app/specs/page#LABELS": {
        "title": "Especificaciones",
        "stats": {
            "specs": "Especificaciones",
            "products": "Productos cubiertos"
        },
        "emptyHint": "No tiene ninguna especificación disponible. El cliente compartirá una si es aplicable."
    },
    "app/tasks/[id]/page#LABELS": {
        "loading": "Tarea",
        "notFound": "Tarea no encontrada",
        "notFoundHint": "Esta tarea ya no existe, ya se ha tratado o no forma parte de su ámbito.",
        "back": "Mis tareas",
        "noEntity": "Esta tarea no hace referencia a ninguna ficha",
        "noEntityHint": "El entregable asociado a esta tarea no hace referencia a ningún producto. Póngase en contacto con su cliente a través de la conversación del proyecto.",
        "documents": "Documentos que aportar",
        "viewDocument": "Ver el documento",
        "due": "Vence el {date}",
        "late": "Con retraso",
        "done": "Terminada",
        "discussion": "Conversación"
    },
    "app/tasks/page#LOCAL": {
        "title": "Mis tareas",
        "search": "Buscar una tarea, un producto, un código…",
        "anyType": "Todos los tipos",
        "anyPriority": "Todas las prioridades",
        "anyProduct": "Todos los productos",
        "anyDue": "Todas las fechas límite",
        "dueLate": "Con retraso",
        "dueToday": "Hoy",
        "dueWeek": "En los próximos 7 días",
        "dueMonth": "En los próximos 30 días",
        "dueNone": "Sin fecha límite",
        "stateOpen": "En curso",
        "stateDone": "Terminadas",
        "colTask": "Tarea",
        "colProduct": "Producto / cliente",
        "colType": "Tipo",
        "colPriority": "Prioridad",
        "colDue": "Fecha límite",
        "colProgress": "Avance",
        "kpiTotal": "Tareas",
        "kpiLate": "Con retraso",
        "kpiNext": "Próxima fecha límite",
        "kpiNone": "Ninguna",
        "reset": "Restablecer",
        "empty": "Ninguna tarea",
        "emptyHint": "En este momento no se espera nada de usted.",
        "emptyFiltered": "Ninguna tarea coincide con estos filtros.",
        "truncated": "Solo se muestran las primeras tareas. Restrinja los filtros para ver el resto.",
        "scoped": "Ámbito: {supplier}.",
        "scopedAll": "Ámbito: todos los proveedores.",
        "orphans": "{count} tarea(s) no están asociadas a ninguna de sus fichas de proveedor y no aparecen aquí. Elija «Todos los proveedores» en la esquina superior derecha para verlas.",
        "priorityHigh": "Alta",
        "priorityMedium": "Media",
        "priorityLow": "Baja",
        "noPriority": "Sin prioridad",
        "untitled": "Tarea sin título",
        "caption": "Mi lista de tareas"
    },
    "components/dashboard/ActionsCard#LOCAL": {
        "title": "Acciones requeridas",
        "open": "tarea(s) abierta(s)",
        "late": "{count} con retraso",
        "onTime": "Ninguna con retraso",
        "nextDue": "Próxima fecha límite: {date}",
        "noDue": "Ninguna fecha límite prevista",
        "none": "Nada que hacer por ahora",
        "all": "Ver todas mis tareas"
    },
    "components/dashboard/ActionsCard#TASK_TYPE_META.wizard": "Asistente",
    "components/dashboard/ActionsCard#TASK_TYPE_META.signature": "Firma",
    "components/dashboard/ActionsCard#TASK_TYPE_META.document": "Documento",
    "components/dashboard/ActionsCard#TASK_TYPE_META.review": "Revisión",
    "components/dashboard/ApprovalCard#REASONS": {
        "documentExpired": "Documento obligatorio caducado",
        "documentExpiring": "Documento a punto de caducar",
        "documentMissing": "Documento esperado no aportado",
        "documentRefused": "Documento rechazado",
        "catalogIncomplete": "Ficha incompleta",
        "openProject": "Proyecto de referenciación abierto",
        "openNonConformity": "No conformidad abierta"
    },
    "components/dashboard/ApprovalCard#LOCAL": {
        "title": "Estado de homologación",
        "validUntil": "Válido hasta el {date}",
        "noValidity": "Ningún vencimiento conocido",
        "why": "¿Por qué?",
        "unknown": "Estado no disponible",
        "unknownHint": "No se ha podido calcular el estado. Vuelva a intentarlo más tarde.",
        "allGood": "Nada bloquea"
    },
    "components/dashboard/CompletionCard#LOCAL": {
        "title": "Cumplimentación",
        "scope": "{scored} de {total} producto(s) puntuado(s)",
        "noScore": "Aún no hay ningún catálogo puntuado",
        "noScoreHint": "La cumplimentación aparece en cuanto se ha formulado un producto.",
        "seeProducts": "Ver mis productos",
        "worst": "Catálogos menos completos"
    },
    "components/dashboard/DiscussionList#LOCAL": {
        "title": "Mis conversaciones",
        "empty": "Ninguna conversación",
        "emptyHint": "Las observaciones de su cliente sobre sus tareas y productos aparecerán aquí.",
        "all": "Ver todo",
        "messages": "{count} mensaje(s)",
        "anonymous": "Usuario",
        "onField": "en {field}",
        "unread": "Nuevo",
        "unreadCount": "{count} sin leer"
    },
    "components/dashboard/DocumentList#LOCAL": {
        "title": "Mis documentos",
        "empty": "Ningún documento esperado",
        "emptyHint": "Los certificados que exige su cliente aparecerán aquí.",
        "all": "Ver todo",
        "supplierScope": "Proveedor",
        "mandatory": "Obligatorio",
        "until": "Hasta el {date}",
        "expiredSince": "Caducado hace {days} d",
        "expiresIn": "Caduca en {days} d",
        "noValidity": "Sin fecha de fin",
        "upload": "Subir una nueva versión",
        "uploadFirst": "Subir el documento",
        "download": "Descargar",
        "uploading": "Subiendo…",
        "uploaded": "Documento subido. Ahora está pendiente de validación por parte de su cliente."
    },
    "components/dashboard/DocumentsCard#LOCAL": {
        "title": "Documentos",
        "valid": "Válidos",
        "expiring": "Caducan en < {days} d",
        "expired": "Caducados",
        "missing": "Faltan",
        "refused": "Rechazados",
        "total": "{count} documento(s) en seguimiento",
        "none": "Ningún documento en seguimiento",
        "unavailable": "El seguimiento de documentos no está disponible en esta instancia.",
        "all": "Ver mis documentos",
        "toHandle": "por tratar"
    },
    "components/dashboard/NotificationList#NOTIFICATION_LABELS": {
        "title": "Mis notificaciones",
        "empty": "Ninguna notificación",
        "emptyHint": "En este momento nada requiere su atención.",
        "overdue": "{days} d de retraso",
        "expiresIn": "En {days} d",
        "types": {
            "task.overdue": "Tarea con retraso",
            "document.expired": "Documento caducado",
            "document.expiring": "Documento por renovar",
            "document.missing": "Documento que falta",
            "document.refused": "Documento rechazado"
        },
        "assigned": "Asignada a mí",
        "mandatory": "Obligatorio",
        "isNew": "Nuevo",
        "scopeEmpty": {
            "noSupplierIdentity": "Su cuenta no está vinculada a ningún proveedor, por lo que no se pueden identificar sus documentos. Solo se muestran sus tareas. Indíqueselo a su interlocutor en el cliente.",
            "internalAccount": "Cuenta interna: las alertas de documentos siguen al proveedor que los debe aportar, por lo que su campana solo muestra sus tareas. La vista de todo el parque está en Conformidad documental.",
            "fallback": "El perímetro de su cuenta está vacío: algunas alertas no se pueden calcular."
        },
        "countTitle": "{total} pendientes · las {shown} más urgentes a continuación"
    },
    "components/dashboard/ProductList#LOCAL": {
        "title": "Mis productos",
        "empty": "Ningún producto",
        "emptyHint": "Los productos que le confía su cliente aparecerán aquí.",
        "all": "Ver todo",
        "updatedOn": "Actualizado el {date}",
        "request": "Solicitar una actualización",
        "noCompletion": "Sin puntuar",
        "completion": "Cumplimentación"
    },
    "components/dashboard/ProductList#STATE_LABELS": {
        "Valid": "Homologado",
        "ToValidate": "Pendiente de homologación",
        "Refused": "Por corregir",
        "Simulation": "Borrador",
        "Stopped": "Detenido",
        "Archived": "Archivado"
    },
    "components/dashboard/TaskList#LOCAL": {
        "title": "Mis tareas",
        "empty": "Ninguna tarea en curso",
        "emptyHint": "Todo está al día. Las nuevas solicitudes del cliente aparecerán aquí.",
        "all": "Ver todo",
        "overdue": "{days} d de retraso",
        "overdueToday": "Vence hoy",
        "dueIn": "En {days} d",
        "noDue": "Sin fecha límite",
        "priorityHigh": "Alta",
        "priorityMedium": "Media",
        "priorityLow": "Baja",
        "progress": "Avance",
        "untitled": "Tarea sin título"
    },
    "components/datalist/RowFormModal#LABELS": {
        "title": "Modificar la fila",
        "create": "Nueva fila",
        "save": "Guardar",
        "cancel": "Cancelar",
        "description": "Los campos que la tabla no muestra se introducen aquí.",
        "refused": "La fila no se ha guardado. Compruebe los campos obligatorios y vuelva a intentarlo."
    },
    "components/datalist/useDataList#DATALIST_LABELS": {
        "rows": "{count} fila(s)",
        "addRow": "Añadir una fila",
        "deleteRow": "Eliminar la fila",
        "editRow": "Modificar la fila",
        "moveUp": "Subir",
        "moveDown": "Bajar",
        "actions": "Acciones",
        "order": "Orden",
        "row": "Fila {index}",
        "newRow": "Nueva fila",
        "totalRow": "Fila de total, calculada por beCPG",
        "incomplete": "Cumplimente los campos obligatorios para guardar esta fila",
        "sortBy": "Ordenar por {column}",
        "saving": "Guardando…",
        "saved": "Guardado",
        "discard": "Descartar los cambios",
        "failed": "Error al guardar",
        "retry": "Reintentar",
        "deleting": "Eliminando…",
        "search": "Buscar en la lista",
        "readOnly": "Solo lectura",
        "frozenTitle": "Lista validada por su cliente",
        "frozenText": "Su cliente ha validado esta lista: ahora está bloqueada y ya no se puede modificar. Si es necesaria una corrección, solicite su reapertura a través de la conversación del proyecto.",
        "readAccessTitle": "Solo consulta",
        "readAccessText": "Solo tiene acceso de lectura a esta entidad.",
        "noTaskTitle": "Ninguna tarea abierta",
        "noTaskText": "La edición solo está abierta mientras tenga una tarea asignada. Esta lista sigue visible.",
        "wizardReadOnlyTitle": "Asistente de solo lectura",
        "wizardReadOnlyText": "Este asistente está configurado para consulta: no es posible ninguna modificación.",
        "protectedTitle": "Campo protegido",
        "protectedText": "La columna «{column}» está protegida: su valor alimenta los controles de conformidad de su cliente. Confirme que desea modificarla.",
        "protectedUnlock": "Modificar de todos modos",
        "protectedLocked": "Campo protegido — haga clic para desbloquear",
        "deleteTitle": "¿Eliminar esta fila?",
        "deleteText": "Esta fila se eliminará definitivamente de la lista.",
        "expand": "Mostrar el detalle",
        "collapse": "Ocultar el detalle",
        "nestedEmpty": "Ningún elemento",
        "empty": "Esta lista está vacía",
        "emptyHint": "Añada una primera fila para empezar.",
        "emptyReadOnly": "Su cliente no espera ninguna fila en esta lista.",
        "mandatory": "Campo obligatorio",
        "detail": "Detalle",
        "duplicate": "Duplicar esta fila",
        "select": "Seleccionar",
        "selectRow": "Seleccionar la fila {index}",
        "selectAll": "Seleccionar todas las filas de esta página",
        "selected": "{count} fila(s) seleccionada(s)",
        "clearSelection": "Borrar la selección",
        "bulkMoveUp": "Subir",
        "bulkMoveUpLong": "Subir la selección",
        "bulkMoveDown": "Bajar",
        "bulkMoveDownLong": "Bajar la selección",
        "bulkDuplicate": "Duplicar",
        "bulkDuplicateLong": "Duplicar la selección",
        "bulkDelete": "Eliminar",
        "bulkDeleteLong": "Eliminar la selección",
        "accessDenied": "Acceso denegado",
        "accessDeniedRow": "Esta fila contiene una característica que su cuenta no puede leer: no se puede modificar aquí.",
        "bulkEdit": "Modificar",
        "bulkEditLong": "Modificar la selección",
        "bulkEditTitle": "Modificar {count} fila(s)",
        "bulkEditDescription": "Los mismos valores, en todas las filas seleccionadas, en una sola escritura.",
        "bulkEditPickFields": "Campos que cumplimentar",
        "bulkEditSearchField": "Buscar un campo",
        "bulkEditApply": "Aplicar a {count} fila(s)",
        "bulkEditCancel": "Cancelar",
        "bulkEditEmptyClears": "Un campo marcado pero dejado vacío borra el valor en todas las filas.",
        "bulkEditSkipped": "{count} fila(s) seleccionada(s) no se pueden modificar y se dejarán como están.",
        "bulkEditTooMany": "{count} filas seleccionadas, el máximo es {max}. Reduzca la selección.",
        "bulkEditNoColumn": "Ninguna columna de esta lista se puede cumplimentar en serie.",
        "deleteSelectedTitle": "¿Eliminar {count} fila(s)?",
        "deleteSelectedText": "Estas filas se eliminarán definitivamente de la lista.",
        "rowsPerPage": "Filas por página",
        "shortcuts": "Atajos de teclado",
        "shortcutsTitle": "Introducir datos con el teclado",
        "shortcutList": [
            [
                "Tab / Shift+Tab",
                "celda siguiente / anterior"
            ],
            [
                "Enter",
                "guarda la fila y baja en la misma columna"
            ],
            [
                "Enter en la última fila",
                "añade una fila"
            ],
            [
                "↑ / ↓",
                "misma columna, fila superior / inferior"
            ],
            [
                "Esc",
                "descarta los cambios de la fila en edición"
            ],
            [
                "Ctrl+Enter",
                "añade una fila"
            ],
            [
                "Ctrl+D",
                "duplica la fila actual"
            ],
            [
                "Ctrl+V",
                "pega un bloque de celdas procedente de una hoja de cálculo"
            ]
        ],
        "pasteTitle": "Pegado desde una hoja de cálculo",
        "pasteApplied": "{cells} valor(es) pegado(s) en {rows} fila(s), {created} de ellas nuevas.",
        "pasteNothing": "No se ha podido pegar nada.",
        "pasteUndo": "Deshacer el pegado",
        "pasteSave": "Guardar las {count} fila(s)",
        "pasteResolving": "Buscando las etiquetas…",
        "pasteUnmatched": "{count} valor(es) no tomado(s) — corríjalos a mano:",
        "pasteExtraColumns": "{count} columna(s) pegada(s) más allá de la última columna de la lista: ignorada(s).",
        "pasteRefusedRows": "{count} fila(s) más allá del final de la lista: esta lista no admite filas nuevas.",
        "pasteLine": "línea {line}",
        "pasteReasons": {
            "number": "se esperaba un número",
            "integer": "se esperaba un número entero",
            "boolean": "se esperaba sí / no",
            "date": "se esperaba una fecha (dd/mm/aaaa)",
            "list": "valor fuera de la lista propuesta",
            "readonly": "la columna no se puede modificar",
            "association": "ninguna correspondencia exacta en los datos de referencia"
        }
    },
    "components/documents/DepositedDocuments#LABELS": {
        "title": "Documentos depositados",
        "subtitle": "Los archivos presentes en la carpeta de este producto, sea cual sea su tipo.",
        "empty": "Ningún archivo depositado",
        "emptyHint": "La carpeta de este producto aún no contiene ningún documento.",
        "signed": "Firmado",
        "download": "Descargar",
        "consult": "Consultar",
        "modified": "Modificado el {date}"
    },
    "components/documents/DocumentUpload#LABELS": {
        "drop": "Suelte un archivo aquí",
        "or": "o",
        "browse": "Examinar",
        "deposit": "Subir",
        "renew": "Renovar",
        "replace": "Sustituir",
        "uploading": "Subiendo…",
        "analysing": "Analizando el documento…",
        "done": "Archivo subido",
        "doneHint": "El cliente lo revisará. No se espera nada más de usted.",
        "retry": "Reintentar",
        "cancel": "Cancelar",
        "tooLarge": "Archivo demasiado grande ({size}). Máximo: {max}.",
        "badType": "Formato no admitido ({name}). Se espera: {accept}.",
        "empty": "El archivo está vacío.",
        "failed": "Error al subir el archivo.",
        "locked": "Subida no disponible",
        "accepted": "Formatos: {accept} — {max} máx.",
        "aiValid": "Verificado por la IA",
        "aiToValidate": "Por verificar",
        "aiRefused": "Rechazado por la IA",
        "aiOn": "Analizado el {date}",
        "selected": "Archivo seleccionado",
        "validityHint": "Las fechas de validez que figuran en el documento.",
        "validityInverted": "La fecha de fin es anterior a la fecha de inicio.",
        "validityMissing": "Introduzca el fin de validez antes de subir el archivo.",
        "validityNotApplied": "El archivo se ha subido, pero sus fechas de validez no se han guardado. Introdúzcalas en la línea del documento."
    },
    "components/documents/DocumentValidity#LABELS": {
        "fromTo": "Válido del {from} al {to}",
        "from": "Válido desde el {from}",
        "to": "Válido hasta el {to}",
        "none": "Sin fecha de validez",
        "required": "Validez por introducir",
        "expired": "Validez caducada el {to}",
        "fromLabel": "Válido desde",
        "toLabel": "Válido hasta",
        "edit": "Modificar",
        "setDates": "Introducir",
        "save": "Guardar",
        "cancel": "Cancelar",
        "saved": "Validez guardada",
        "inverted": "La fecha de fin es anterior a la fecha de inicio.",
        "hint": "Las fechas que figuran en el documento que está subiendo."
    },
    "components/documents/DocumentViewer#LABELS": {
        "title": "Documento",
        "download": "Descargar",
        "close": "Cerrar",
        "unsupported": "Sin vista previa para este tipo de archivo",
        "unsupportedHint": "Este formato no se puede previsualizar en el navegador. Descárguelo para leerlo.",
        "failed": "No se ha podido mostrar el documento",
        "failedHint": "Aun así, se puede descargar."
    },
    "components/documents/ExpiryPill#LABELS": {
        "missing": "Por aportar",
        "refused": "Rechazado",
        "toValidate": "En revisión",
        "valid": "Válido",
        "validUntil": "Válido hasta el {date}",
        "expiredOn": "Caducado el {date}",
        "expiredSince": "Caducado hace {days} días",
        "expiresToday": "Caduca hoy",
        "expiresIn": "Caduca en {days} días",
        "noDate": "Sin fecha de validez",
        "from": "Del",
        "to": "al",
        "since": "Desde",
        "until": "Hasta"
    },
    "components/documents/RequirementChecklist#LABELS": {
        "mandatory": "Obligatorio",
        "satisfied": "Aportado",
        "upload": "Subir",
        "renew": "Renovar",
        "replace": "Sustituir",
        "download": "Descargar",
        "consult": "Consultar",
        "details": "Detalles",
        "hide": "Ocultar",
        "of": "{done} / {total} documentos obligatorios",
        "allDone": "Todo está al día",
        "allDoneHint": "En este momento no se espera nada de usted.",
        "nothing": "Ningún requisito documental",
        "nothingHint": "El cliente aún no ha definido ningún documento esperado para este ámbito.",
        "openCount": "{count} por tratar",
        "blockingCount": "{count} obligatorio(s) por corregir",
        "category": "Categoría",
        "readOnly": "Las subidas están cerradas en esta ficha.",
        "noEntity": "Documentos del proveedor",
        "aiHints": "Notas del análisis",
        "deposit": "Subir un archivo",
        "file": "Archivo"
    },
    "components/documents/SignedDocumentList#LABELS": {
        "document": "Documento firmado",
        "signedAt": "Firmado el",
        "download": "Descargar",
        "search": "Buscar un documento firmado",
        "empty": "Ningún documento firmado",
        "emptyHint": "Los documentos que firma desde sus tareas aparecen aquí.",
        "truncated": "Lista parcial: no se han podido leer todos los documentos firmados."
    },
    "components/form/FieldRenderer#LABELS": {
        "add": "Añadir un valor",
        "remove": "Eliminar este valor"
    },
    "components/form/FormRenderer#LABELS": {
        "empty": "Ningún campo que cumplimentar",
        "emptyHint": "La configuración de este formulario no devuelve ningún campo."
    },
    "components/form/controls/AutocompleteControl#LABELS": {
        "search": "Buscar…",
        "hint": "Introduzca un nombre o un código para filtrar los datos",
        "loading": "Buscando…",
        "noResult": "Ningún resultado",
        "clear": "Borrar",
        "remove": "Quitar",
        "browse": "Mostrar los valores",
        "error": "Error en la búsqueda",
        "errorUnconfigured": "Este campo no tiene ninguna lista de valores configurada. Indíqueselo a su interlocutor en el cliente.",
        "showing": "Elementos 1 - {count} de {total}",
        "favourite": "Favorito"
    },
    "components/form/controls/BooleanControl#LABELS": {
        "yes": "Sí",
        "no": "No",
        "empty": "(vacío)"
    },
    "components/form/controls/MlTextControl#LABELS": {
        "more": "{count} idioma(s) más",
        "less": "Ocultar los demás idiomas",
        "required": "exigido por el cliente",
        "missing": "{count} idioma(s) obligatorio(s) aún vacío(s)"
    },
    "components/form/controls/NumberUnitControl#DURATION_SYMBOLS": {
        "d": "días",
        "mo": "meses",
        "y": "años"
    },
    "components/form/controls/NumberUnitControl#LABELS": {
        "unit": "Unidad"
    },
    "components/form/controls/ReadOnlyControl#LABELS": {
        "yes": "Sí",
        "no": "No",
        "empty": "—"
    },
    "components/form/controls/SelectControl#LABELS": {
        "placeholder": "Elija…",
        "offList": "valor fuera de la lista",
        "empty": "Ningún valor propuesto"
    },
    "components/form/controls/SizeControl#LABELS": {
        "bytes": "bytes"
    },
    "components/form/validation#VALIDATION_MESSAGES": {
        "validation.required": "Este campo es obligatorio.",
        "validation.number": "Introduzca un número.",
        "validation.integer": "Introduzca un número entero.",
        "validation.date": "Introduzca una fecha válida.",
        "validation.boolean": "Indique sí o no.",
        "validation.list": "Elija un valor de la lista.",
        "validation.regex": "No se respeta el formato esperado.",
        "validation.min": "El valor debe ser mayor o igual que {min}.",
        "validation.max": "El valor debe ser menor o igual que {max}.",
        "validation.range": "El valor debe estar entre {min} y {max}.",
        "validation.minLength": "Introduzca al menos {min} carácter(es).",
        "validation.maxLength": "Introduzca como máximo {max} carácter(es)."
    },
    "components/monitor/BulkActionBar#LABELS": {
        "selected": "{count} proveedor seleccionado",
        "selectedPlural": "{count} proveedores seleccionados",
        "clear": "Borrar la selección",
        "overflow": "Solo se tratarán los {max} primeros.",
        "loading": "Cargando las acciones…",
        "unavailable": "No hay ninguna acción disponible para su perfil.",
        "actions": {
            "remind": "Enviar recordatorio",
            "escalate": "Escalar",
            "suspend": "Suspender"
        },
        "confirm": {
            "remind": "Enviar un recordatorio a {count} proveedor(es)",
            "escalate": "Escalar {count} proveedor(es)",
            "suspend": "Suspender {count} proveedor(es)"
        },
        "mechanism": {
            "remind": "El mensaje se publica en el hilo de conversación del proveedor — el que ya muestran el portal y Share. No se crea ningún otro canal.",
            "escalate": "El mensaje se publica internamente en el proyecto abierto del proveedor, mencionando a su jefe de proyecto. El proveedor no lo ve. Sin proyecto abierto, no se publica nada.",
            "suspend": "El estado de homologación se calcula, nunca se almacena: la suspensión inicia el proceso de suspensión configurado en beCPG. El estado cambia por sí solo."
        },
        "message": "Mensaje",
        "messageRequired": "El mensaje es obligatorio.",
        "process": "Proceso que iniciar",
        "targets": "Proveedores afectados",
        "andMore": "… y {count} más",
        "send": "Enviar",
        "suspendConfirm": "Suspender",
        "report": "Resultado de la acción",
        "reportOk": "{count} proveedor(es) tratado(s) correctamente.",
        "reportKo": "{count} error(es):",
        "reportSkipped": "{count} proveedor(es) excluido(s): por encima del límite de {max}.",
        "reportNone": "No se ha tratado ningún proveedor.",
        "close": "Cerrar",
        "successToast": {
            "remind": "Recordatorio enviado a {ok} proveedor(es)",
            "escalate": "{ok} escalada(s) enviada(s)",
            "suspend": "{ok} suspensión(es) iniciada(s)"
        },
        "successToastFallback": "{ok} proveedor(es) tratado(s)",
        "partialToast": "{ok} tratado(s), {ko} con error",
        "errors": {
            "notFound": "Proveedor fuera de su perímetro"
        }
    },
    "components/monitor/CampaignList#LABELS": {
        "columns": {
            "campaign": "Proyecto",
            "suppliers": "Proveedores",
            "response": "Tasa de respuesta",
            "age": "Antigüedad",
            "silence": "Último recordatorio",
            "due": "Fecha límite",
            "reminders": "Recordatorios",
            "follow": "Seguimiento",
            "manager": "Responsable"
        },
        "days": "{count} d",
        "since": "Abierto desde hace {count} d",
        "lastActivity": "Última actividad {date}",
        "silenceDays": "hace {count} d",
        "silenceToday": "Hoy",
        "silenceHint": "beCPG no conserva ningún registro de recordatorios: esta columna muestra la última actividad del proyecto (cm:modified), el dato más cercano realmente disponible.",
        "noSilence": "Ninguna actividad fechada",
        "noAnswer": "Sin respuesta",
        "late": "Con retraso",
        "onTrack": "En plazo",
        "toRemind": "Por recordar",
        "toEscalate": "Por escalar",
        "lateTasks": "{late} / {open} tarea(s) con retraso",
        "noTasks": "Ninguna tarea abierta",
        "dueIn": "En {count} d",
        "overdue": "{count} d de retraso",
        "noDue": "Sin fecha límite",
        "others": "+{count}",
        "search": "Buscar un proyecto",
        "empty": "Ningún proyecto abierto en este perímetro",
        "projectStates": {
            "Planned": "Planificado",
            "InProgress": "En curso",
            "OnHold": "En espera",
            "Completed": "Terminado",
            "Cancelled": "Cancelado"
        }
    },
    "components/monitor/DocumentMatrix#LABELS": {
        "supplier": "Proveedor",
        "types": "{count} tipo(s) de documento",
        "notApplicable": "No se aplica a este proveedor",
        "mandatory": "Obligatorio",
        "expected": "{count} esperado(s)",
        "selectRow": "Seleccionar {name}",
        "selectCell": "Seleccionar {type} para {name}",
        "download": "Descargar",
        "empty": "Ningún proveedor en este perímetro",
        "emptyHint": "Amplíe los filtros para ver la matriz.",
        "noColumns": "Ningún tipo de documento está materializado en este perímetro",
        "noColumnsHint": "beCPG materializa los documentos esperados durante la formulación: sin ningún requisito documental configurado, la matriz está vacía.",
        "toggle": "Mostrar los documentos",
        "summary": "{missing} faltan · {expired} caducados · {expiring} por renovar",
        "legend": "Leyenda"
    },
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Valid": "Válido",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Simulation": "Borrador",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.ToValidate": "Por validar",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Refused": "Rechazado",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Archived": "Archivado",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Stopped": "Detenido",
    "components/monitor/MonitorFilters#LABELS": {
        "search": "Buscar un proveedor, un código, una razón social…",
        "toggle": "Filtros",
        "reset": "Restablecer",
        "close": "Ocultar los filtros",
        "legend": "Filtros del parque",
        "family": "Familia",
        "subFamily": "Subfamilia",
        "site": "Centro",
        "subsidiary": "Filial",
        "buyer": "Comprador de referencia",
        "market": "Mercado",
        "state": "Estado del proveedor",
        "any": "Todos",
        "anyBuyer": "Todos los compradores",
        "buyerHint": "Nombre de usuario de beCPG (cm:owner)",
        "windowScoped": "limitado a la ventana",
        "windowScopedHelp": "Alfresco no indexa las asociaciones: este filtro se aplica a los proveedores ya leídos, no a todo el parque.",
        "unsupported": "no configurado",
        "unsupportedHelp": "Ninguna propiedad estándar de beCPG contiene esta noción. Actívela en el lado del cliente declarando la propiedad en la configuración del seguimiento.",
        "noVocabulary": "Ningún valor en el perímetro cargado",
        "active": "{count} filtro activo",
        "activePlural": "{count} filtros activos",
        "clearOne": "Quitar este filtro"
    },
    "components/monitor/NonConformityList#LABELS": {
        "columns": {
            "nc": "No conformidad",
            "suppliers": "Proveedores",
            "state": "Estado",
            "priority": "Prioridad",
            "delay": "Plazo de tratamiento",
            "actions": "Acciones correctivas",
            "cost": "Coste"
        },
        "states": {
            "new": "Nueva",
            "analysis": "Análisis",
            "treatment": "Tratamiento",
            "response": "Respuesta",
            "classification": "Clasificación",
            "closing": "Cierre",
            "closed": "Cerrada"
        },
        "types": {
            "NonConformity": "No conformidad",
            "Claim": "Reclamación"
        },
        "priorities": {
            "1": "Alta",
            "2": "Media",
            "3": "Baja"
        },
        "blocking": "Bloqueante",
        "blockingHint": "Prioridad alta y aún abierta: esto es lo que pone el estado de homologación calculado en «suspendido» (calculado, nunca almacenado).",
        "days": "{count} d",
        "openSince": "Abierta desde hace {count} d",
        "overdue": "Fuera del plazo de tratamiento objetivo",
        "closedIn": "Tratada en {count} d",
        "closedApprox": "beCPG no almacena ninguna fecha de cierre: el plazo de una NC cerrada se mide entre su creación y su última modificación.",
        "createdOn": "Creada el {date}",
        "noDelay": "Sin fecha de creación",
        "actionsCount": "{done} / {total}",
        "actionsLate": "{count} con retraso",
        "noActions": "Ninguna acción",
        "noActionsHint": "Ninguna tarea de tratamiento vinculada a esta NC en beCPG — el plan de acción aún no está abierto.",
        "actionState": {
            "done": "terminada",
            "late": "con retraso",
            "open": "en curso"
        },
        "andMore": "… y {count} más",
        "others": "+{count}",
        "noSupplier": "Ningún proveedor vinculado",
        "search": "Buscar una no conformidad",
        "empty": "Ninguna no conformidad en este perímetro",
        "open": "Abrir esta no conformidad",
        "detail": {
            "description": "Descripción",
            "comment": "Comentario de calidad",
            "noText": "Esta no conformidad no tiene ni descripción ni comentario en beCPG.",
            "facts": "Datos",
            "actions": "Acciones correctivas",
            "noActions": "Ninguna acción correctiva abierta.",
            "suppliers": "Proveedores afectados",
            "discussion": "Conversación",
            "created": "Creada el",
            "modified": "Última modificación",
            "cost": "Coste",
            "priority": "Prioridad",
            "state": "Estado",
            "type": "Tipo"
        }
    },
    "components/monitor/ParkStats#LABELS": {
        "tiles": {
            "approved": "Homologados",
            "toRenew": "Por renovar",
            "suspended": "Suspendidos",
            "compliance": "Conformidad doc.",
            "expiring30": "Caducan en < 30 d",
            "campaigns": "Proyectos",
            "lateTasks": "Tareas con retraso",
            "nc": "NC abiertas"
        },
        "hints": {
            "ofPark": "de {total} proveedores",
            "ofScanned": "de los {scanned} proveedores leídos",
            "complianceDetail": "{missing} faltan · {expired} caducados · {refused} rechazados",
            "complianceMandatory": "{compliant} / {total} documentos obligatorios",
            "noRate": {
                "countsCapped": "Tasa no calculable: beCPG ha limitado el recuento de documentos.",
                "scopeTruncated": "Tasa no calculable: no se ha podido consultar {dropped} proveedor(es) del parque.",
                "emptyScope": "Ningún proveedor en este perímetro: no hay nada que evaluar."
            },
            "expiring": "documentos · {d60} a 60 d, {d90} a 90 d",
            "campaigns": "abiertos · {rate} % con respuesta, {late} con retraso",
            "campaignsNoRate": "abiertos · ninguna tasa de respuesta que calcular, {late} con retraso",
            "lateTasks": "vencidas",
            "nc": "de ellas {blocking} bloqueantes",
            "inProgress": "{count} en referenciación",
            "noNotice": "aviso con {days} d de antelación"
        },
        "park": {
            "title": "Composición del parque",
            "empty": "Ningún proveedor en este perímetro",
            "share": "{share} %",
            "unknown": "{count} proveedor(es) leído(s) sin estado de homologación evaluado: no figuran en ninguna barra.",
            "windowScope": "Desglose calculado sobre los {scanned} proveedores leídos (el parque tiene {total}): restrinja los filtros para obtener un desglose exacto."
        },
        "expiry": {
            "title": "Horizonte de caducidad",
            "cumulative": "Acumulado: un documento contado a 30 d también se cuenta a 60 y 90 d.",
            "bucket": "< {days} d",
            "empty": "Ningún documento caduca en los próximos 90 días",
            "unit": "documentos",
            "seeAll": "Ver la conformidad documental"
        },
        "approx": "Contador aproximado: beCPG ha limitado el recuento.",
        "approxShort": "aproximado",
        "scopeEmpty": "Ningún proveedor coincide con este perímetro. No se ha calculado ningún contador: las cifras anteriores son ceros por construcción, no mediciones.",
        "scopeDropped": "No se ha podido consultar {dropped} proveedor(es) del parque (límite de {chunks} consultas): los contadores son valores mínimos.",
        "unsupported": "Filtro no disponible en esta instancia: {names}. Ninguna propiedad estándar de beCPG lo contiene.",
        "assocScope": "Filtro {names} aplicado a la ventana leída (Alfresco no indexa las asociaciones).",
        "generatedAt": "Datos a {time}"
    },
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.label": "Calidad",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.focus": "Conformidad documental, no conformidades, certificaciones, auditorías",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.label": "Compras",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.focus": "Estado de homologación (bloquea los pedidos), puntuación, reactividad",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.label": "I+D",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.focus": "Cumplimentación de los datos técnicos, catálogos, especificaciones",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.label": "RSC",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.focus": "Certificaciones, orígenes, cuestionarios de RSC",
    "components/monitor/ProfileSwitcher#LABELS": {
        "legend": "Vista de negocio",
        "hint": "El mismo parque, cuatro lecturas. Reordena las tarjetas y las columnas."
    },
    "components/monitor/RiskList#RISK_REASONS.documentExpired": "{count} documento(s) caducado(s)",
    "components/monitor/RiskList#RISK_REASONS.documentExpiring": "{count} documento(s) a punto de caducar",
    "components/monitor/RiskList#RISK_REASONS.documentMissing": "{count} documento(s) que faltan",
    "components/monitor/RiskList#RISK_REASONS.blockingNc": "{count} NC bloqueante(s)",
    "components/monitor/RiskList#RISK_REASONS.openNc": "{count} NC abierta(s)",
    "components/monitor/RiskList#RISK_REASONS.campaignNoAnswer": "{count} proyecto(s) sin respuesta",
    "components/monitor/RiskList#RISK_REASONS.lateTask": "{count} tarea(s) con retraso",
    "components/monitor/RiskList#RISK_REASONS.lowCompletion": "Cumplimentación baja ({score} %)",
    "components/monitor/RiskList#RISK_REASONS.scoreDropping": "Puntuación en descenso",
    "components/monitor/RiskList#RISK_REASONS.openProject": "{count} referenciación(es) en curso",
    "components/monitor/RiskList#RISK_REASONS.blockingCatalog": "Catálogo bloqueante no cumplido",
    "components/monitor/RiskList#RISK_LEVELS.critical": "Crítico",
    "components/monitor/RiskList#RISK_LEVELS.high": "Alto",
    "components/monitor/RiskList#RISK_LEVELS.medium": "Medio",
    "components/monitor/RiskList#RISK_LEVELS.low": "Bajo",
    "components/monitor/RiskList#LABELS": {
        "title": "Top 10 de proveedores en riesgo",
        "empty": "Ningún proveedor en riesgo en este perímetro",
        "emptyHint": "No se ha detectado ningún documento caducado, NC bloqueante ni proyecto sin respuesta.",
        "riskScore": "Puntuación de riesgo {score}",
        "level": "Riesgo {level}",
        "buyer": "Comprador: {name}",
        "lastActivity": "Última actividad el {date}",
        "completion": "Cumplimentación {value} %",
        "openSheet": "Abrir la ficha",
        "actions": {
            "remind": "Enviar recordatorio",
            "escalate": "Escalar",
            "suspend": "Suspender"
        },
        "dialog": {
            "remindTitle": "Enviar un recordatorio a {target}",
            "escalateTitle": "Escalar {target}",
            "suspendTitle": "Suspender {target}",
            "messageLabel": "Mensaje",
            "messageHelp": "Se publica en el hilo de conversación del proveedor — el mismo que muestran el portal y Share. El proveedor lo recibe a través de sus suscripciones de Alfresco.",
            "escalateHelp": "Se publica internamente en el proyecto abierto del proveedor, nunca en el hilo que lee el proveedor, mencionando al responsable. Sin proyecto abierto, no se publica nada.",
            "messageRequired": "El mensaje es obligatorio.",
            "suspendWarning": "El estado de homologación se calcula sobre la marcha, nunca se almacena: esta acción no escribe «suspendido». Inicia el proceso de suspensión del cliente. Una vez que beCPG registra la NC bloqueante, el estado cambia por sí solo.",
            "suspendIrreversible": "Un proceso iniciado no se puede cancelar desde el portal. Compruebe la selección.",
            "process": "Proceso que iniciar",
            "noProcess": "No se permite ningún proceso de suspensión en esta instancia (PORTAL_PROCESS_TEMPLATES).",
            "targets": "{count} proveedor(es) afectado(s):",
            "send": "Enviar",
            "suspendConfirm": "Iniciar la suspensión"
        },
        "result": {
            "ok": "{count} acción(es) ejecutada(s).",
            "partial": "{ok} correcta(s), {failed} con error.",
            "failed": "Ninguna acción se ha ejecutado correctamente."
        },
        "defaults": {
            "remind": "Buenos días:\n\nSu expediente de proveedor necesita una actualización: {reasons}.\nLe rogamos que inicie sesión en el portal para completarlo.\n\nAtentamente,",
            "escalate": "Escalada: el expediente del proveedor sigue presentando anomalías ({reasons}) a pesar de los recordatorios.\nLe rogamos que se haga cargo.",
            "genericReasons": "documentos y plazos pendientes"
        }
    },
    "components/monitor/StartCampaignDialog#LABELS": {
        "title": "Iniciar un proyecto",
        "subtitle": "Un proyecto de referenciación por producto, como hace «Enviar al proveedor» en beCPG.",
        "supplier": "Proveedor",
        "supplierPlaceholder": "Elija un proveedor…",
        "scope": "Ámbito",
        "scopeAll": "Todos los productos de este proveedor",
        "scopeOne": "Un producto",
        "entity": "Producto",
        "entityPlaceholder": "Elija un producto…",
        "process": "Plantilla de proyecto",
        "processPlaceholder": "Elija una plantilla…",
        "start": "Iniciar",
        "cancel": "Cancelar",
        "starting": "Iniciando…",
        "noEntity": "Ningún producto está asociado a este proveedor: no hay nada que enviar.",
        "noProcess": "En esta instancia no hay ninguna plantilla de proyecto abierta al portal.",
        "countAll": "Se enviarán {count} producto(s), un proyecto por cada uno.",
        "done": "{count} proyecto(s) iniciado(s)",
        "partial": "{done} iniciado(s), {failed} con error",
        "failedTitle": "Estos productos no se han iniciado",
        "countTruncated": "Aquí solo se pueden mostrar {count} de {total} productos: se enviarán esos, y solo esos.",
        "suppliersTruncated": "Solo se proponen {count} de {total} proveedores. Inicie el proyecto desde la página del proveedor si no aparece en la lista.",
        "atLeast": "al menos {count}",
        "loadFailed": "No se ha podido cargar la lista.",
        "retry": "Reintentar"
    },
    "components/monitor/SupplierScorecard#LABELS": {
        "title": "Cuadro de evaluación",
        "subtitle": "Criterios, ponderaciones y puntuaciones — configurados en el lado del cliente",
        "weighted": "Puntuación ponderada",
        "weightedHint": "{count} criterios · ponderación total {weight}",
        "criterion": "Criterio",
        "weight": "ponderación {weight}",
        "weightShare": "{share} % del total",
        "range": "escala {range}",
        "noScore": "Sin puntuar",
        "scaleNote": "Escala deducida de la configuración (o de la puntuación más alta observada): siempre se muestra la puntuación bruta.",
        "unavailable": "Ningún cuadro de evaluación para este proveedor",
        "unavailableHint": "Los cuadros de evaluación se alimentan de las puntuaciones de los proyectos de proveedor. No se ha encontrado ningún proyecto puntuado en su perímetro.",
        "completion": "Cumplimentación de los catálogos",
        "completionSubtitle": "Los catálogos activos en las entidades del proveedor",
        "completionEmpty": "Ningún catálogo activo en este proveedor",
        "completionScore": "Cumplimentación media",
        "approval": "Estado de homologación",
        "approvalDerived": "Recalculado en cada visualización",
        "history": "Tendencia",
        "historyUnavailable": "Historial no disponible",
        "historyWhy": "El módulo de decisión de beCPG no pudo proporcionar el historial.",
        "historyWhyBy": {
            "supplierAxisUnavailable": "El módulo BI está activo pero aún no distingue a los proveedores: hay que añadir el eje proveedor al cubo y recargar el esquema.",
            "supplierUnresolved": "Este proveedor aún no está en el módulo BI: aparecerá en la próxima reconstrucción.",
            "noData": "El módulo BI conoce a este proveedor pero aún no tiene ningún punto para el periodo: el historial se completa a medida que se alimenta.",
            "unknownQuery": "La serie solicitada no está declarada en el portal: es un defecto de configuración, no una falta de datos.",
            "unreachable": "El módulo de decisión de beCPG no responde: está desactivado en esta instancia o su servidor no es accesible.",
            "denied": "Su cuenta no tiene acceso al módulo de decisión de beCPG."
        },
        "historyNeeds": "Lo que necesita la parte BI para activarlo",
        "dimensions": "Dimensiones",
        "measures": "Medidas",
        "statusPartial": "parcial",
        "statusMissing": "por crear",
        "trendLast": "Último punto: {value} el {date}",
        "trendCaption": "Puntuación ponderada a lo largo del tiempo"
    },
    "components/monitor/SupplierTable#LABELS": {
        "caption": "Proveedores del parque, estado de homologación e indicadores calculados",
        "columns": {
            "name": "Proveedor",
            "code": "Código",
            "status": "Homologación",
            "risk": "Riesgo",
            "completion": "Cumplimentación",
            "documentsExpired": "Doc. caducados",
            "documentsExpiring": "Doc. a punto de caducar",
            "documentsMissing": "Doc. que faltan",
            "openNc": "NC abiertas",
            "openProjects": "Proyectos",
            "family": "Familia",
            "sites": "Centros",
            "buyer": "Comprador",
            "lastActivity": "Última actividad"
        },
        "metrics": {
            "documentsExpired": "{count} documento(s) obligatorio(s) caducado(s)",
            "documentsExpiring": "{count} documento(s) a punto de caducar",
            "documentsMissing": "{count} documento(s) obligatorio(s) no aportado(s)",
            "openNc": "{count} no conformidad(es) abierta(s)",
            "openProjects": "{count} proyecto(s) abierto(s)"
        },
        "none": "—",
        "noBuyer": "Sin asignar",
        "empty": "Ningún proveedor en este perímetro",
        "emptyHint": "Amplíe los filtros o compruebe su perímetro de comprador.",
        "emptyFiltered": "Ningún proveedor coincide con estos filtros.",
        "compare": "Comparar",
        "compareTitle": "Comparación de {count} proveedores",
        "compareCapped": "Comparación limitada a los {max} primeros proveedores seleccionados — más allá, las columnas dejan de ser legibles.",
        "compareRows": {
            "status": "Estado de homologación",
            "reasons": "Motivos",
            "risk": "Puntuación de riesgo",
            "completion": "Cumplimentación (catálogos)",
            "documentsExpired": "Documentos caducados",
            "documentsExpiring": "Documentos a punto de caducar",
            "documentsMissing": "Documentos que faltan",
            "openNc": "NC abiertas",
            "openProjects": "Proyectos abiertos",
            "state": "Estado en beCPG",
            "family": "Familia",
            "sites": "Centros",
            "buyer": "Comprador de referencia",
            "lastActivity": "Última actividad"
        },
        "openSheet": "Abrir la ficha",
        "selected": "{count} seleccionado(s)",
        "clear": "Borrar la selección",
        "close": "Cerrar",
        "noReason": "Ningún motivo de riesgo"
    },
    "components/products/CatalogPanel#LABELS": {
        "title": "Conformidad",
        "overall": "Cumplimentación",
        "complete": "Completo",
        "incomplete": "Incompleto",
        "missing": "Campos que faltan",
        "missingCount": "{count} campo(s) que faltan",
        "duplicates": "Valores ya utilizados",
        "duplicateOn": "Ya utilizado por",
        "duplicateUnnamed": "{count} producto(s) más",
        "protectedFields": "{count} campo(s) de este catálogo los cumplimenta su cliente",
        "protectedFieldsHint": "Cuentan para la puntuación pero no se le piden a usted: no puede introducirlos, lo hace su cliente.",
        "none": "Ningún catálogo aplicable",
        "noneHint": "No hay ningún catálogo de conformidad configurado para este producto, por lo que no hay ningún control de cumplimentación que superar.",
        "allComplete": "Todos los catálogos están completos",
        "allCompleteHint": "Por el lado de los datos, nada bloquea la validación de este producto.",
        "missingHint": "Cumplimente los campos siguientes para alcanzar el 100 % — son los que bloquean la validación.",
        "goToField": "Ir al campo",
        "notScored": "Sin puntuar"
    },
    "components/products/CompletionMeter#LABELS": {
        "title": "Completitud",
        "noScore": "Aún sin evaluar",
        "notCounted": "fuera de la nota",
        "more": "+ {count} catálogo(s) más"
    },
    "components/products/ProductHeader#LABELS": {
        "code": "Código",
        "branch": "Actualización en curso",
        "branchFrom": "Actualización de la versión {version}",
        "branchTitle": "Esta ficha es una copia de trabajo creada para la referenciación.",
        "branchTitleLocked": "Esta ficha es la copia de trabajo creada para la referenciación. La versión homologada existe en el lado del cliente, pero no tiene acceso de lectura a ella.",
        "erpCode": "Código ERP",
        "supplier": "Proveedor",
        "subsidiary": "Filial",
        "project": "Proyecto",
        "modified": "Actualizado",
        "created": "Creado el",
        "version": "Versión",
        "legalName": "Razón social",
        "back": "Mis productos",
        "types": {
            "bcpg:rawMaterial": "Materia prima",
            "bcpg:finishedProduct": "Producto terminado",
            "bcpg:semiFinishedProduct": "Semielaborado",
            "bcpg:localSemiFinishedProduct": "Semielaborado local",
            "bcpg:packagingMaterial": "Envase",
            "bcpg:packagingKit": "Kit de envase",
            "bcpg:supplier": "Proveedor",
            "bcpg:productSpecification": "Especificación",
            "qa:nc": "No conformidad"
        }
    },
    "components/products/ProductSections#LABELS": {
        "sheet": "Ficha",
        "compliance": "Conformidad",
        "documents": "Documentos",
        "specs": "Especificaciones",
        "sections": "Secciones de la ficha",
        "noProperties": "Ninguna propiedad que mostrar",
        "noPropertiesHint": "La configuración del asistente no expone las propiedades de este producto.",
        "rawProperties": "Propiedades",
        "rawNotice": "Etiquetas técnicas: la configuración del asistente no está disponible para este producto.",
        "noData": "Ningún dato aportado",
        "noDataHint": "Esta sección no contiene ninguna fila para este producto.",
        "configTitle": "Configuración no disponible",
        "configHint": "No se ha podido cargar la configuración de esta sección. Las demás pestañas siguen disponibles.",
        "documentsHint": "Lo que su cliente espera de este producto, y para cuándo.",
        "readOnly": "Solo consulta: la introducción de datos se realiza desde la tarea que se le ha asignado.",
        "yes": "Sí",
        "no": "No"
    },
    "components/products/ProductTaskBanner#LABELS": {
        "one": "Hay una tarea abierta en esta ficha",
        "many": "Hay varias tareas abiertas en esta ficha",
        "open": "Abrir la tarea",
        "all": "Ver las tareas de este producto",
        "untitled": "Tarea sin título"
    },
    "components/products/UpdateRequestDialog#LABELS": {
        "title": "Solicitar una actualización",
        "intro": "Su cliente recibe la solicitud y la trata como un referenciamiento: recibirá una tarea para actualizar la ficha, que él validará. Nada cambia hasta entonces.",
        "template": "Tipo de solicitud",
        "templatePlaceholder": "Elegir…",
        "noTemplate": "Su cliente no ha abierto ningún tipo de solicitud a los proveedores. Escríbale desde Mensajes.",
        "reason": "Motivo de la solicitud",
        "reasonHint": "Nueva receta, nuevo origen, nuevo centro de producción, nueva ficha técnica…",
        "file": "Nueva ficha técnica (opcional)",
        "submit": "Enviar la solicitud",
        "sent": "Solicitud enviada. Se ha abierto una tarea de actualización para usted.",
        "sentFileFailed": "Solicitud enviada, pero no se ha podido subir la ficha técnica: súbala desde la tarea."
    },
    "components/shell/Header#LOCAL_LABELS": {
        "menu": "Abrir el menú",
        "account": "Mi cuenta",
        "home": "beCPG — inicio del portal"
    },
    "components/shell/Nav#LOCAL_LABELS": {
        "more": "Más",
        "menu": "Menú",
        "close": "Cerrar el menú",
        "supplierSpace": "Espacio de proveedor",
        "monitorSpace": "Espacio de seguimiento",
        "collapse": "Plegar el menú",
        "expand": "Desplegar el menú"
    },
    "components/shell/NotificationBell#LOCAL": {
        "open": "Notificaciones",
        "panel": "Notificaciones",
        "close": "Cerrar",
        "refresh": "Actualizar",
        "markRead": "Marcar como leído",
        "countOne": "1 notificación pendiente",
        "countMany": "{count} notificaciones pendientes",
        "countNone": "Ninguna notificación",
        "updatedAt": "Actualizado a las {time}",
        "more": "y {count} más — consulte «Mis documentos» y «Mis tareas»",
        "allTasks": "Mis tareas",
        "allDocuments": "Mis documentos"
    },
    "components/shell/SupplierSwitcher#LABELS": {
        "all": "Todos los proveedores",
        "change": "Cambiar de proveedor",
        "current": "Proveedor seleccionado",
        "group": "Mis fichas de proveedor",
        "scope": "Ámbito"
    },
    "components/signature/PdfViewer#LABELS": {
        "previous": "Página anterior",
        "next": "Página siguiente",
        "page": "Página",
        "of": "de {pages}",
        "zoomIn": "Ampliar",
        "zoomOut": "Reducir",
        "fit": "Ajustar al ancho",
        "download": "Descargar el PDF",
        "loading": "Cargando el documento…",
        "pageLoading": "Cargando la página {page}…",
        "error": "No se ha podido mostrar este documento",
        "errorHint": "Es posible que el archivo esté protegido o no esté disponible temporalmente. Puede volver a intentarlo o descargarlo para leerlo.",
        "retry": "Reintentar",
        "pinch": "Pellizque para hacer zoom"
    },
    "components/signature/SignatureDocument#LABELS": {
        "zonesHint": "Los marcos indican dónde se aplicarán su firma y su rúbrica.",
        "counter": "Documento {index} de {total}",
        "read": "Leído",
        "unavailable": "Documento no disponible",
        "unavailableHint": "Este documento ya no es accesible en beCPG: puede que se haya sustituido tras la firma o que se haya retirado su acceso. Solicite una copia a su cliente si la necesita."
    },
    "components/signature/SignatureFlow#LABELS": {
        "title": "Firma",
        "back": "Mis tareas",
        "loading": "Abriendo el documento…",
        "notFound": "Ningún documento que firmar",
        "notFoundHint": "Esta tarea no hace referencia a ningún documento firmable. Es posible que el entregable aún esté en preparación — póngase en contacto con su cliente a través de la conversación del proyecto.",
        "readTitle": "Lectura del documento",
        "progress": "{seen} / {pages} páginas leídas",
        "progressDone": "Documento leído por completo",
        "progressHint": "El botón de firma se desbloquea cuando se han visto todas las páginas.",
        "readyHint": "Todo listo: su firma se aplicará al documento.",
        "goToPage": "Continuar en la página {page}",
        "goToDocumentPage": "Continuar en el doc. {document}, página {page}",
        "documentCount": "{count} documentos que firmar",
        "toSignature": "Ir a la firma",
        "signTitle": "Su firma",
        "initialsTitle": "Su rúbrica",
        "initialsHint": "Se aplicará en la parte inferior de cada página.",
        "consent": "He leído todo el documento y acepto firmarlo electrónicamente. Reconozco que esta firma tiene el mismo valor que una firma manuscrita.",
        "sign": "Firmar el documento",
        "signing": "Firmando…",
        "blockedRead": "Lea todas las páginas para poder firmar.",
        "blockedSignature": "Añada su firma.",
        "blockedInitials": "Añada su rúbrica.",
        "blockedConsent": "Marque la casilla de consentimiento.",
        "successTitle": "Documento firmado",
        "successBody": "Su firma se ha registrado. beCPG la aplica al documento y le envía una copia por correo electrónico. También la encontrará en Mis documentos › Firmados.",
        "successNext": "No se espera nada más de usted: la tarea se cierra y se notifica a su cliente.",
        "successDownload": "Descargar el documento",
        "successBack": "Volver a mis tareas",
        "signedTitle": "Este documento ya está firmado",
        "signedBody": "Ya se ha registrado una firma para esta tarea. No hay nada que repetir — puede descargar el documento.",
        "signedBodyNoCopy": "Ya se ha registrado una firma para esta tarea. No hay nada que repetir. El documento ya no es accesible desde el portal; solicite una copia a su cliente si la necesita.",
        "signedView": "Ver el documento",
        "signedComplete": "Terminar la tarea",
        "signedCompleteDone": "Tarea terminada.",
        "signedCompleteError": "No se ha podido terminar la tarea.",
        "cancelledTitle": "Firma cancelada",
        "cancelledBody": "Su cliente ha cancelado esta solicitud de firma. No se espera ninguna acción por su parte.",
        "closedTitle": "Tarea ya tratada",
        "closedBody": "Esta tarea ya no está abierta. Si cree que se trata de un error, póngase en contacto con su cliente.",
        "externalTitle": "Firma en su proveedor de servicios",
        "externalBody": "Su cliente utiliza un servicio de firma externo. El documento se abre en una pestaña nueva; vuelva aquí cuando haya terminado.",
        "externalOpen": "Abrir la firma",
        "failed": "No se ha podido registrar la firma.",
        "failedNetwork": "Se ha cortado la conexión durante el envío. Su firma no se ha perdido: vuelva a intentarlo, no se registrará dos veces.",
        "retry": "Reintentar",
        "refresh": "Actualizar",
        "leaving": "La firma se está enviando. Si sale ahora, puede interrumpirla.",
        "document": "Documento"
    },
    "components/signature/SignaturePad#LABELS": {
        "draw": "Dibujar",
        "type": "Escribir mi nombre",
        "drawHint": "Firme dentro del marco con el dedo, un lápiz o el ratón.",
        "typeHint": "Su nombre se aplicará como firma.",
        "namePlaceholder": "Nombre APELLIDOS",
        "nameLabel": "Nombre del firmante",
        "clear": "Borrar",
        "undo": "Deshacer el último trazo",
        "preview": "Vista previa de su firma",
        "empty": "Aún no hay firma",
        "required": "Su firma es obligatoria para continuar.",
        "initialsType": "Escribir mis iniciales",
        "initialsDrawHint": "Dibuje su rúbrica dentro del marco.",
        "initialsTypeHint": "Estas iniciales se aplicarán como rúbrica.",
        "initialsNameLabel": "Iniciales",
        "initialsPlaceholder": "VL",
        "initialsPreview": "Vista previa de su rúbrica",
        "initialsEmpty": "Aún no hay rúbrica"
    },
    "components/signature/SignatureZones#DEFAULT_LABELS": {
        "signature": "Firma",
        "initials": "Rúbrica",
        "date": "Fecha",
        "text": "Texto"
    },
    "components/specs/SpecPanel#LABELS": {
        "title": "Especificaciones",
        "subtitle": "Documentos de referencia aplicables a sus productos",
        "consult": "Consultar",
        "open": "Abrir",
        "download": "Descargar",
        "appliesTo": "Se aplica a",
        "andOthers": "y {count} más",
        "updated": "Actualizado el {date}",
        "search": "Buscar una especificación",
        "none": "Ninguna especificación",
        "noneHint": "No hay ninguna especificación asociada a este ámbito. El cliente compartirá una si es aplicable.",
        "noResult": "Ninguna especificación coincide con esta búsqueda",
        "count": "{count} documento(s)",
        "readFirst": "Leer antes de cumplimentar",
        "unreadable": "{count} especificación(es) se aplican a sus productos, pero su cuenta no puede abrirlas. Solicite acceso a su cliente."
    },
    "components/survey/DecisionTree#LABELS": {
        "required": "Pregunta obligatoria",
        "noAnswer": "Sin respuesta",
        "choose": "Seleccione una respuesta",
        "openLink": "Abrir el enlace",
        "answer": "Respuesta",
        "blank": "Esta pregunta obligatoria sigue sin responder."
    },
    "components/tasks/TaskActions#LABELS": {
        "complete": "Terminar la tarea",
        "refuse": "Rechazar",
        "completeTitle": "¿Terminar esta tarea?",
        "completeMessage": "La tarea se marcará como terminada y el proyecto pasará al paso siguiente.",
        "refuseTitle": "¿Rechazar esta tarea?",
        "refuseMessage": "El proyecto vuelve al paso que define el circuito de rechazo. El motivo indicado a continuación se envía al proveedor.",
        "refuseReason": "Motivo del rechazo",
        "refuseReasonHint": "Este texto se envía al proveedor: indíquele qué debe corregir.",
        "refuseReasonRequired": "Es obligatorio indicar un motivo para rechazar.",
        "cancel": "Cancelar",
        "completed": "Tarea terminada.",
        "refused": "Tarea rechazada."
    },
    "components/ui/DataTable#LOCAL_LABELS": {
        "selectAll": "Seleccionar todo",
        "selectRow": "Seleccionar la fila",
        "columns": "Columnas visibles",
        "rowsPerPage": "Filas por página"
    },
    "components/ui/EmptyState#SENTENCES": {
        "empty": "Aún no hay nada que mostrar aquí. Los elementos aparecerán en cuanto se creen o se envíen.",
        "search": "Ningún elemento coincide con su búsqueda. Pruebe con menos palabras o quite uno de los filtros."
    },
    "components/ui/TabScroller#LOCAL": {
        "previous": "Pestañas anteriores",
        "next": "Pestañas siguientes"
    },
    "components/wizard/AutoSaveIndicator#LABELS": {
        "pending": "Cambios pendientes",
        "saving": "Guardando…",
        "saved": "guardado a las {time}",
        "savedShort": "Guardado",
        "error": "No se ha podido guardar",
        "retry": "Reintentar",
        "unsaved": "Sus cambios no se han perdido: se volverán a enviar."
    },
    "components/wizard/TechnicalSheetBanner#LABELS": {
        "title": "Ficha técnica",
        "deposited": "Subida el {date}",
        "replace": "Sustituir",
        "cancel": "Cancelar",
        "missing": "Falta la ficha técnica",
        "missingHint": "Suba su ficha técnica para activar las sugerencias de la IA.",
        "missingClosed": "No se ha subido ninguna ficha técnica en esta ficha."
    },
    "components/wizard/Wizard#LABELS": {
        "context": "Contexto",
        "discussion": "Conversación",
        "documents": "Documentos",
        "technicalSheet": "Ficha técnica",
        "suggestions": "Sugerencias",
        "compliance": "Conformidad",
        "properties": "Propiedades",
        "list": "Lista",
        "survey": "Cuestionario",
        "readOnly": "Solo lectura",
        "readOnlyReasons": {
            "readAccess": "Solo tiene acceso de lectura a esta ficha.",
            "noAssignedTask": "No tiene ninguna tarea asignada en esta ficha: la introducción de datos está cerrada.",
            "wizardReadOnly": "Este asistente está configurado como de solo lectura."
        },
        "finish": "Terminar",
        "finished": "Tarea enviada a su cliente",
        "finishBlocked": "Cumplimente los campos que faltan del paso «Conformidad» para terminar.",
        "finishMissingStep": "«{step}»: faltan {count} respuesta(s) obligatoria(s).",
        "finishGapStep": "{step} · {count} campo(s)",
        "finishGapCatalog": "{step} · {count} esperado(s)",
        "finishGapCatalogPlain": "{step} por completar",
        "notFound": "Ficha no encontrada",
        "notFoundHint": "Esta ficha no existe o no forma parte de su ámbito.",
        "delegated": "Está introduciendo datos en nombre de {supplier}",
        "due": "Vence el {date}",
        "step": "Paso",
        "widen": "Ampliar la zona de introducción",
        "widenHint": "Oculta los paneles laterales y reduce los pasos a sus iconos.",
        "restore": "Restaurar los paneles",
        "steps": "Pasos"
    },
    "components/wizard/WizardFooter#LABELS": {
        "previous": "Anterior",
        "next": "Siguiente",
        "finish": "Terminar",
        "finishing": "Enviando…",
        "formulating": "Recalculando…",
        "blocked": "Aún no se puede terminar",
        "incomplete": "Ficha incompleta"
    },
    "components/wizard/WizardStepper#LABELS": {
        "title": "Pasos",
        "step": "Paso {index} de {total}",
        "open": "Elegir un paso",
        "frozen": "Validado por el cliente",
        "readOnly": "Solo lectura",
        "done": "Visitado",
        "complete": "Completo",
        "current": "Paso actual",
        "todo": "Aún no visitado",
        "locked": "Disponible más adelante",
        "incomplete": "Faltan {count} obligatorio(s)",
        "catalogGap": "{count} campo(s) esperado(s) por el catálogo",
        "remaining": "{count} sección(es) por completar",
        "remainingNone": "No se indica que falte nada",
        "remainingHint": "Su cliente espera esta información para validar la ficha.",
        "remainingHintNone": "Puede volver a cualquier paso en cualquier momento.",
        "collapse": "Plegar los pasos",
        "expand": "Desplegar los pasos"
    },
    "components/wizard/panels/CommentsPanel#LABELS": {
        "title": "Conversación",
        "subtitle": "Sus intercambios con su cliente sobre esta ficha",
        "placeholder": "Escriba un mensaje…",
        "send": "Enviar",
        "empty": "Ningún mensaje",
        "emptyHint": "Haga una pregunta a su cliente o responda a una de sus observaciones.",
        "emptyAnchored": "Ningún mensaje sobre este elemento",
        "subject": "Asunto",
        "whole": "Toda la ficha",
        "onField": "Campo: {label}",
        "onRow": "Fila: {label}",
        "onRowOfList": "Fila «{label}» de «{list}»",
        "inList": "Una fila de «{list}»",
        "row": "una fila",
        "anchored": "Sobre {label}",
        "clear": "Quitar el anclaje",
        "readOnly": "La conversación es de solo lectura.",
        "posting": "Enviando…",
        "count": "{count} mensaje(s)",
        "denyReasons": {
            "noAssignedTask": "La referenciación está cerrada: esta conversación es de solo lectura.",
            "readAccess": "Solo tiene acceso de lectura a esta ficha.",
            "noPermission": "No tiene permiso para escribir en esta conversación."
        }
    },
    "components/wizard/panels/HelpPanel#LABELS": {
        "title": "Contexto",
        "suggestions": "Sugerencias de la IA",
        "specs": "Especificaciones",
        "specsEmpty": "Ninguna especificación asociada a esta ficha.",
        "specsUnreadable": "Hay una especificación asociada a esta ficha, pero su cuenta no puede abrirla.",
        "refusals": "Rechazos anteriores",
        "refusalsEmpty": "Ningún rechazo en esta ficha.",
        "refusalsHint": "Estos pasos le han sido devueltos: lea la observación asociada antes de volver a enviar.",
        "onField": "en {field}",
        "seeStep": "Abrir",
        "more": "+{count} más"
    },
    "components/wizard/steps/DataListStep#LABELS": {
        "row": "Fila {index}"
    },
    "components/wizard/steps/DocumentsStep#LABELS": {
        "title": "Documentos esperados",
        "subtitle": "Lo que su cliente espera, y para cuándo.",
        "otherTitle": "Otros documentos",
        "otherSubtitle": "Los archivos de la carpeta que no responden a ninguno de los requisitos anteriores. Suelte aquí cualquier documento útil (foto, análisis…).",
        "blocking": "Faltan {count} documento(s) obligatorio(s)",
        "allGood": "Se han aportado todos los documentos obligatorios",
        "readOnly": "No puede depositar ningún documento en esta ficha."
    },
    "components/wizard/steps/FormStep#LABELS": {
        "comment": "Comentar este campo",
        "comments": "{count} mensaje(s) sobre este campo",
        "catalogGap": "Esperado por el catálogo de su cliente",
        "catalogGapLocale": "Esperado por el catálogo de su cliente en {locale}",
        "frozenTitle": "Sección validada por su cliente",
        "frozenText": "Su cliente ha validado esta información: está bloqueada y ya no se puede modificar. Si es necesaria una corrección, solicite su reapertura a través de la conversación.",
        "readAccessTitle": "Solo lectura",
        "readAccessText": "No tiene acceso de escritura a esta ficha.",
        "noTaskTitle": "Ninguna tarea abierta",
        "noTaskText": "Esta ficha no le está asignada en este momento: puede leerla, pero no modificarla.",
        "readOnlyTitle": "Solo lectura",
        "readOnlyText": "Este paso no se puede modificar."
    },
    "components/wizard/steps/ReviewStep#LABELS": {
        "title": "Conformidad",
        "subtitle": "Lo que aún falta para que su cliente pueda validar la ficha.",
        "blocking": "Catálogo(s) bloqueante(s): {names}",
        "blockingHint": "Cumplimente los campos que faltan a continuación para poder terminar.",
        "ready": "Se cumplen todos los catálogos bloqueantes",
        "incomplete": "Catálogo(s) por completar: {names}",
        "documents": "Documentos obligatorios",
        "documentsMissing": "Faltan {count} documento(s) obligatorio(s)",
        "documentsOk": "Se han aportado todos los documentos obligatorios",
        "reviewTitle": "Ficha de solo lectura",
        "reviewSubtitle": "Está consultando esta ficha: no es posible ninguna modificación.",
        "expand": "Mostrar",
        "collapse": "Ocultar",
        "expandAll": "Desplegar todo",
        "collapseAll": "Plegar todo",
        "reviewed": "Sección revisada",
        "reviewedHint": "Marque las secciones a medida que avanza: {done} de {total} revisadas.",
        "empty": "Nada que mostrar"
    },
    "components/wizard/steps/SuggestionsStep#LABELS": {
        "title": "Extracción automática",
        "subtitle": "Estos valores se han leído de los documentos que ha depositado. Compruébelos: usted mantiene el control.",
        "applied": "Aplicado automáticamente",
        "appliedHint": "Confianza alta: el valor ya está aplicado, puede deshacerlo.",
        "toConfirm": "Por confirmar",
        "toConfirmHint": "Compruebe el valor propuesto y, a continuación, aplíquelo.",
        "flagged": "Introdúzcalo usted mismo",
        "flaggedHint": "La extracción no es lo bastante fiable: preferimos que lo introduzca usted.",
        "unscored": "Propuestas",
        "unscoredHint": "Estas propuestas no incluyen una puntuación de confianza.",
        "apply": "Aplicar",
        "expand": "Ampliar",
        "applyAnyway": "Aplicar de todos modos",
        "revoke": "Deshacer",
        "restore": "Revisar",
        "applying": "Aplicando…",
        "appliedAt": "Aplicado",
        "revoked": "Deshecho",
        "dismissed": "Descartado",
        "notRevocable": "El valor anterior no se puede restaurar automáticamente: modifique el campo directamente si es necesario.",
        "empty": "Ninguna sugerencia",
        "emptyHint": "Nada que proponer para este paso. La ficha técnica se sube justo arriba: la extracción propondrá los valores que encuentre en ella.",
        "emptyEntityLevel": "El análisis se ha ejecutado, pero solo ha producido deducciones a partir de la propia ficha, sin ningún documento que las respalde: no se le proponen.",
        "analysing": "Análisis en curso",
        "analysingHint": "El portal está leyendo sus documentos. Las propuestas aparecerán aquí por sí solas, sin salir de la página: la lectura de una ficha técnica suele tardar menos de un minuto.",
        "analysingPlugins": "En ejecución: {plugins}",
        "refresh": "Volver a ejecutar el análisis",
        "readOnly": "Esta ficha es de solo lectura: no se pueden aplicar las sugerencias.",
        "source": "Fuente",
        "changes": "{count} valor(es)",
        "error": "Error al aplicar la sugerencia."
    },
    "components/wizard/steps/SurveyStep#LABELS": {
        "discuss": "Conversación",
        "answered": "{answered} de {total} respondidas",
        "empty": "Ninguna pregunta",
        "emptyHint": "Su cliente aún no ha publicado ningún cuestionario para esta ficha.",
        "check": "Comprobar mis respuestas",
        "complete": "Cuestionario completo",
        "missingTitle": "{count} pregunta(s) obligatoria(s) aún sin responder",
        "missingHint": "Elija una para ir a ella. Sus demás respuestas ya están guardadas.",
        "readOnly": "Solo consulta",
        "noneAnswered": "Ninguna respuesta registrada",
        "noneAnsweredHint": "El cuestionario se va desplegando a medida que lo responde.",
        "dropped": "Su cliente no ha previsto dónde almacenar {count} de sus respuestas: {questions}. No se han guardado — indíqueselo a su cliente."
    },
    "lib/adapters/monitor#CSV_HEADERS": {
        "code": "Código",
        "name": "Proveedor",
        "legalName": "Razón social",
        "approvalStatus": "Estado de homologación",
        "approvalReasons": "Motivos",
        "completion": "Cumplimentación (%)",
        "risk": "Riesgo",
        "riskLevel": "Nivel de riesgo",
        "documentsExpired": "Documentos caducados",
        "documentsExpiring": "Documentos a punto de caducar",
        "documentsMissing": "Documentos que faltan",
        "openNc": "NC abiertas",
        "openProjects": "Proyectos abiertos",
        "family": "Familia",
        "buyer": "Comprador",
        "lastActivity": "Última actividad",
        "state": "Estado",
        "compliance": "Conformidad (%)"
    },
    "config/messages#messages": {
        "app.title": "Portal de proveedores",
        "app.shortTitle": "Portal",
        "app.tenantSuffix": "espacio de proveedor",
        "app.description": "Portal de proveedores beCPG — referenciación, documentos y conformidad",
        "nav.dashboard": "Panel de control",
        "nav.tasks": "Mis tareas",
        "nav.products": "Mis productos",
        "nav.documents": "Mis documentos",
        "nav.company": "Mi empresa",
        "nav.specs": "Especificaciones",
        "nav.messages": "Conversaciones",
        "nav.notifications": "Notificaciones",
        "nav.help": "Ayuda",
        "nav.monitor": "Seguimiento",
        "nav.monitor.suppliers": "Proveedores",
        "nav.monitor.products": "Productos de proveedores",
        "nav.monitor.documents": "Conformidad documental",
        "nav.monitor.campaigns": "Proyectos",
        "nav.monitor.quality": "No conformidades",
        "nav.monitor.reports": "Informes",
        "nav.monitor.tasks": "Mis tareas",
        "account.profile": "Mi perfil",
        "account.language": "Idioma",
        "account.login": "Iniciar sesión",
        "account.logout": "Cerrar sesión",
        "account.tenant": "Cliente",
        "account.suppliers": "Mis fichas de proveedor",
        "account.allSuppliers": "Todos los proveedores",
        "action.save": "Guardar",
        "action.cancel": "Cancelar",
        "action.close": "Cerrar",
        "action.back": "Volver",
        "action.next": "Siguiente",
        "action.previous": "Anterior",
        "action.submit": "Enviar",
        "action.confirm": "Confirmar",
        "action.delete": "Eliminar",
        "action.download": "Descargar",
        "action.upload": "Subir un archivo",
        "action.retry": "Reintentar",
        "action.search": "Buscar",
        "action.filter": "Filtrar",
        "action.reset": "Restablecer",
        "action.export": "Exportar",
        "action.sign": "Firmar",
        "action.showMore": "{count} más",
        "action.showLess": "Mostrar menos",
        "suggestion.replaces": "Sustituye a {value}",
        "state.loading": "Cargando…",
        "state.saving": "Guardando…",
        "state.saved": "Guardado",
        "state.empty": "Nada que mostrar",
        "state.noResults": "Ningún resultado para esta búsqueda",
        "state.required": "Campo obligatorio",
        "state.of": "{from}-{to} de {total}",
        "state.page": "Página {page} de {pages}",
        "state.atLeast": "al menos {total}",
        "error.title": "Se ha producido un error",
        "error.generic": "Se ha producido un error. Vuelva a intentarlo.",
        "error.network": "No se puede contactar con el servidor.",
        "error.upstream": "beCPG ha devuelto un error. Vuelva a intentarlo; si persiste, indíqueselo a su administrador.",
        "error.unauthorized": "Su sesión ha caducado. Vuelva a iniciar sesión.",
        "error.forbidden": "No tiene permiso para realizar esta acción.",
        "error.notFound": "Esta página o este elemento no existe.",
        "error.tenant": "No hay ningún cliente asociado a su cuenta.",
        "error.upload": "Error al subir el archivo.",
        "error.http": "Error {status}: {message}",
        "status.approved": "Homologado",
        "status.inProgress": "En curso",
        "status.toRenew": "Por renovar",
        "status.suspended": "Suspendido",
        "status.valid": "Válido",
        "status.expiring": "Caduca pronto",
        "status.expired": "Caducado",
        "status.missing": "Falta",
        "status.validityMissing": "Validez por introducir",
        "status.rejected": "Rechazado",
        "status.pending": "Pendiente",
        "status.completed": "Terminado",
        "status.late": "Con retraso",
        "status.draft": "Borrador",
        "status.notApplicable": "No aplicable",
        "test.banner": "Instancia de TEST — los datos introducidos aquí no tienen valor contractual",
        "test.badge": "Test",
        "app.monitorSuffix": "pilotaje de proveedores"
    },
    "components/monitor/HistoryPanel#LABELS": {
        "title": "Evolución",
        "help": "Leído en el módulo de decisión de beCPG, cargado por lotes: las cifras pueden datar de la última carga.",
        "period": "Periodo",
        "measures": {
            "stepsNumber": "Tareas",
            "averageActualDurations": "Duración real media (d)",
            "refusalRate": "Tasa de rechazo",
            "avgResponseDelay": "Plazo de respuesta medio (d)",
            "averageProgress": "Avance medio",
            "projectsNumber": "Proyectos"
        }
    }
};

export default LOCALE;
