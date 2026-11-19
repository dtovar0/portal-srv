# Reglas de Negocio

## Preferencias y Temas de Interfaz

### Regla
El sistema solo acepta tres temas de interfaz: `sistema` (por defecto), `claro` y `oscuro`. Cualquier intento de guardar un valor retirado o desconocido es rechazado con error 422.

### Ejemplo
Si un usuario envía `theme: "rosa"` en `PUT /api/v1/me/preferences`, la API devuelve un código de error 422 indicando que debe elegir un tema válido de la lista.

### Impacto
Afecta a la API de preferencias de usuario (`/api/v1/me/preferences`), migración de base de datos `pref_theme` y selector de tema en la interfaz web.


## Identidad y Marca del Portal

### Regla
La identidad visual y nomenclatura del sistema debe utilizar la denominación "Portal" o "Portal de accesos", prescindiendo por completo de la denominación anterior "Nexus" en títulos, valores por defecto de configuración, componentes de marca y correos de notificación.

### Ejemplo
Al acceder al sistema sin configuración previa guardada en `system_config`, el nombre por defecto retornado por `/api/v1/settings` y mostrado en la interfaz es "Portal de accesos" (no "Nexus Core AI"), la pantalla de inicio de sesión titula "Portal de accesos", y las notificaciones por correo salen firmadas como "Portal".

### Impacto
Afecta a `app/modules/settings/valores_por_defecto.py`, `app/modules/notifications/services.py`, encabezados en `frontend/src/app/layout.tsx`, componente `Brand`, pantalla de login y descargas de respaldo.


## Plataformas y Áreas

### Regla
En la vista detallada de plataformas de un área (`/admin/platforms`), la barra de herramientas ubica el indicador del área activa inmediatamente después del buscador de plataformas (orden: Botón Volver -> Buscador -> Insignia del Área). Asimismo, a la derecha de la barra de herramientas se integran las acciones contextuales de administración del área activa: botón "Accesos" (disponible para superadministradores para gestionar los administradores delegados mediante modal), botón "Editar" (para editar los datos del área) y botón "Eliminar" (con diálogo de confirmación y retorno automático al catálogo general tras eliminar), finalizando con un separador vertical y el botón "Nuevo" para la creación de plataformas en dicha área.

### Ejemplo
Al hacer click en la tarjeta del área "Demo Finanzas", la barra superior muestra a la izquierda el botón de retorno "Áreas", el campo de búsqueda de plataformas y a su derecha la insignia de "Demo Finanzas". A la derecha de la barra se muestran los botones "Accesos", "Editar", "Eliminar", un separador y el botón "Nuevo".

### Impacto
Afecta a [frontend/src/components/platform-admin.tsx](../frontend/src/components/platform-admin.tsx) y a la suite de pruebas en [frontend/tests/components/platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Botones de Barra de Herramientas en Plataformas

### Regla
Los botones de acción en la barra de herramientas de la vista de plataformas siguen estrictamente la nomenclatura, diseño y orden estándar del sistema: `ADMINS` (icono usuarios), `EDITAR` (icono editar), `ELIMINAR` (icono eliminar, en variante neutra `fila` para simetría visual con los demás botones de acción secundaria), seguidos del separador vertical `|` y el botón primario `+ NUEVO` (icono más, variante `fila-primario`).

### Ejemplo
En la vista de plataformas del área seleccionada, el bloque de botones a la derecha muestra en orden y con tipografía en mayúsculas: `ADMINS`, `EDITAR`, `ELIMINAR`, la línea divisoria vertical y `+ NUEVO`.

### Impacto
Afecta a [frontend/src/components/platform-admin.tsx](../frontend/src/components/platform-admin.tsx) y pruebas en [frontend/tests/components/platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Formulario Asistido de Creación y Edición de Áreas

### Regla
El modal de creación y edición de áreas (`AreaForm`) opera como un asistente estructurado de 2 pasos secuenciales:
- **Paso 1 (Descripción)**: Captura y valida el nombre obligatorio del área y su descripción funcional. Contiene las acciones de pie "Cancelar" y "Siguiente".
- **Paso 2 (Estilo visual)**: Permite configurar el color del área mediante selector, ofrece una vista previa interactiva en tiempo real (mostrando el chip con las iniciales teñidas dinámicamente, nombre, descripción y badge de estado) y el control de activación ("Activa"). Contiene las acciones de pie "Atrás" y "Guardar".

### Ejemplo
Al hacer click en "Nuevo" o "Editar área", el modal inicia en el paso 1 "Descripción". El usuario ingresa el nombre "Marketing" y descripción; al pulsar "Siguiente", avanza al paso 2 "Estilo visual" donde visualiza en vivo la tarjeta previa con el chip "MA" y puede ajustar el color o estado antes de presionar "Guardar".

### Impacto
Afecta a [frontend/src/components/areas/area-form.tsx](../frontend/src/components/areas/area-form.tsx), [frontend/src/components/areas-list.tsx](../frontend/src/components/areas-list.tsx) y pruebas en [frontend/tests/components/areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx).


## Estandarización de Radio de Borde en Modales y Botones

### Regla
Para garantizar consistencia visual y armonía en la jerarquía geométrica del sistema:
1. **Modales y Diálogos**: El panel contenedor de los modales (`Modal`) y diálogos de alerta (`AlertDialog`) adopta un radio de borde idéntico al de los contenedores estándar del sistema (`rounded-xl` / 12px / 0.75rem), eliminando el exceso de curvatura (`rounded-3xl` / 24px).
2. **Botones de Modales y Sistema**: Los botones de acción (`Button`, `.nexus-btn`) estandarizan su radio de borde en base al design token de radio de control `var(--radius-base, 8px)` (8px), evitando apariencias de cápsula o redondeo excesivo (`border-radius: 1rem` / 16px) y alineándose con los botones de fila, tarjetas y barras de herramientas.
3. **Contenedores Internos**: Componentes internos a los modales (steppers, indicadores de progreso, cajas de aviso) limitan su radio a `rounded-xl` o `rounded-lg` para respetar la jerarquía contenida respecto al panel principal.

### Ejemplo
Al abrir el modal de "Nueva área" o un diálogo de confirmación, la ventana modal presenta esquinas con radio uniforme de 12px (`rounded-xl`), igual al de las tarjetas del catálogo. Los botones inferiores "Cancelar", "Atrás", "Siguiente" o "Guardar" lucen esquinas de 8px (`var(--radius-base)`), consistentes y simétricas, sin deformación tipo píldora.

### Impacto
Afecta a [frontend/src/components/form.tsx](../frontend/src/components/form.tsx), [frontend/src/components/alert-dialog.tsx](../frontend/src/components/alert-dialog.tsx), [frontend/src/styles/components.css](../frontend/src/styles/components.css), [frontend/src/components/areas/area-form.tsx](../frontend/src/components/areas/area-form.tsx) y [frontend/src/components/users/directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx).


## Asistente de 2 Pasos en Modales de Creación y Edición (Plataforma y Área)

### Regla
Los modales de creación y edición tanto de **Área** (`AreaForm`) como de **Plataforma** (`PlatformForm`) operan bajo un flujo unificado y secuencial de dos pasos claros y delimitados:
1. **Paso 1 (1. Descripción)**:
   - Captura la información funcional obligatoria y de configuración:
     - En Áreas: Nombre (obligatorio) y Descripción (opcional).
     - En Plataformas: Nombre (obligatorio), Descripción (obligatoria), Enlace directo https:// (opcional), Área asignada (obligatoria) y Configuración de Integración (manual o LDAP/AD con grupos de nivel usuario y admin según el rol del usuario).
   - Botones de pie: "Cancelar" (a la izquierda) y "Siguiente" (a la derecha).
   - Al pulsar "Siguiente" o presionar Enter, se validan los campos de este paso antes de avanzar.
2. **Paso 2 (2. Estilo)**:
   - Permite personalizar la apariencia visual y estado operativo:
     - En Áreas: Color personalizado del área, Vista previa en vivo con chip de iniciales dinámicas y estado Activa/Inactiva.
     - En Plataformas: Color de fondo y Color de texto (mediante `ColorInput` con altura táctil accesible de 48px), Vista previa en vivo de la tarjeta con chip sólido, nombre, descripción, área y badge de estado, y checkbox de activación ("Activa").
   - Botones de pie: "Atrás" (a la izquierda, para regresar al Paso 1 conservando datos) y "Guardar" (a la derecha, para persistir los cambios).

### Ejemplo
Al pulsar "+ Nuevo" en la sección de plataformas, se abre el modal "Nueva plataforma" posicionado en el paso "1. Descripción". El usuario introduce nombre, descripción y tipo de integración. Al pulsar "Siguiente", el modal transiciona al paso "2. Estilo", donde visualiza una tarjeta simulada interactiva que reacciona a los colores de fondo y texto elegidos antes de presionar "Guardar".

### Impacto
Afecta a [frontend/src/components/platforms/platform-form.tsx](../frontend/src/components/platforms/platform-form.tsx), [frontend/src/components/areas/area-form.tsx](../frontend/src/components/areas/area-form.tsx), [frontend/tests/components/platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx) y [frontend/tests/components/areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx).


Simplificación del Modal de Nueva Plataforma (Omisión de Área y Conector)

## Plataformas

### Regla
En el modal de creación de una nueva plataforma (`PlatformForm`, modo alta `!isEdit`), se omiten del formulario los campos y selectores de **Área** y de **Integración/Conector**:
1. **Área**: Dado que la creación de plataformas ocurre de forma contextual dentro del área seleccionada actualmente (`defaultAreaId`), el formulario asocia automáticamente la plataforma a dicha área sin necesidad de mostrar un selector redundante en pantalla. El nombre del área se refleja en la vista previa del Paso 2.
2. **Integración/Conector**: En el alta de nueva plataforma no se solicitan campos de conector ni configuración de grupos del directorio (LDAP), estableciendo por omisión el tipo de integración `conector` en el payload (`POST /platforms`) para permitir el alta limpia sin dependencias de infraestructura ni configuraciones previas de directorio. La configuración avanzada de conectores e integraciones se administra posteriormente o en la edición por administradores autorizados.
3. El Paso 1 del modal "Nueva plataforma" queda enfocado exclusivamente en la identidad funcional esencial: Nombre, Descripción y Enlace https:// opcional.

### Ejemplo
Al acceder al área "Demo Finanzas" y pulsar "+ NUEVO", el modal "Nueva plataforma" muestra en el Paso 1 únicamente los campos "Nombre", "Descripción" y "Enlace". No se muestra el selector de área ni la sección de integración/conector. Al pulsar "Siguiente", el Paso 2 muestra los colores y la tarjeta de vista previa con la insignia del área "Demo Finanzas". Al guardar, la plataforma se registra exitosamente asignada a "Demo Finanzas" con `integration_type: 'conector'`.

### Impacto
Afecta a [platform-form.tsx](../frontend/src/components/platforms/platform-form.tsx), [platform-payload.ts](../frontend/src/components/platforms/platform-payload.ts) y [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Selección por Checkbox y Notificaciones Toast en Tabla de Plataformas

### Regla
1. **Eliminación de Botones de Fila**: En la tabla de plataformas de un área (`/admin/platforms`), se suprimen los botones de acción por fila (anterior columna "Acciones" con botones de historial, edición y eliminación).
2. **Selección por Checkbox al Inicio**: En su lugar, la tabla inicia con una columna de selección por casilla de verificación (`nexus-checkbox`), permitiendo seleccionar una o todas las plataformas visibles mediante el checkbox maestro del encabezado (`aria-label="Seleccionar todas las plataformas"`) o la casilla de cada fila (`aria-label="Seleccionar {nombre}"`), así como mediante el clic directo sobre cualquier punto de la fila.
3. **Acciones Contextuales en Barra de Herramientas**:
   - Cuando no hay plataformas seleccionadas, los botones `EDITAR` y `ELIMINAR` de la barra de herramientas actúan sobre el área activa.
   - Cuando se selecciona exactamente una plataforma, los botones `EDITAR` y `ELIMINAR` de la barra de herramientas se vinculan a dicha plataforma para permitir su edición o eliminación.
   - Si se seleccionan múltiples plataformas, se muestra un contador badge (`{n} plataformas seleccionadas`) y los botones de edición/eliminación se deshabilitan preventivamente.
4. **Notificaciones Flotantes (Toast)**: Se suprimen de manera definitiva los banners informativos fijos en la parte superior del contenedor (`PlatformSaveNotice`, `<ErrorNote>` superior). Toda confirmación de guardado, retiro o advertencia operativa se emite exclusivamente a través del sistema de notificaciones flotantes `useToast` (`avisar(tono, mensaje, titulo)`), garantizando una interfaz despejada y accesible con regiones vivas WCAG (`role="status"` y `role="alert"`).

### Ejemplo
Al visualizar las plataformas de "Demo Finanzas", cada fila inicia con un checkbox y ya no existe la columna "Acciones" al final. Al marcar el checkbox de la plataforma "asd", los botones "EDITAR" y "ELIMINAR" de la barra superior cambian su foco a "asd". Al editar y guardar, no aparece ninguna barra superior en la página, sino un toast flotante en la esquina inferior derecha confirmando "Se guardó «asd»".

### Impacto
Afecta a [platform-columns.tsx](../frontend/src/components/platforms/platform-columns.tsx), [platform-admin.tsx](../frontend/src/components/platform-admin.tsx) y la suite de pruebas [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Normalización Automática del Protocolo en Enlaces de Plataformas

### Regla
En los formularios de creación y edición de plataformas (`PlatformForm`), el campo de enlace directo no obliga al usuario a escribir manualmente el prefijo `https://`:
1. **Normalización Inteligente**: Si el usuario introduce un dominio, dirección o ruta omitiendo el protocolo (por ejemplo `google.com`, `localhost:3000`, `sistema.empresa.local/panel`), el sistema le antepone automáticamente `https://` al desenfocar el campo (`onBlur`), al avanzar de paso y al guardar.
2. **Prevención de Errores Innecesarios**: La validación previa en cliente (`validate`) y la construcción del payload (`buildPayload`) normalizan la entrada antes de evaluar la seguridad del enlace (`enlaceSeguro`), evitando que se arroje el error `"Usa una dirección https://."` por el simple hecho de haber omitido el protocolo.
3. **Seguridad Preservada**: Esquemas explícitamente inseguros o no autorizados (como `http://`, `javascript:`, `mailto:`, `data:`, `file:`) no se transforman silenciosamente, manteniéndose la protección para que sean rechazados conforme a las políticas de seguridad.
4. **Claridad en la Interfaz**: El marcador de posición se actualiza a `ejemplo.com o https://ejemplo.com` y la pista textual especifica que `https://` se añade automáticamente si se omite.

### Ejemplo
Al crear una plataforma llamada "ERP" y escribir simplemente `erp.empresa.local` en el campo Enlace, el usuario puede presionar directamente "Siguiente" o "Guardar" sin recibir ningún mensaje de error. El enlace se almacena y se envía al backend como `https://erp.empresa.local`.

### Impacto
Afecta a [platform-payload.ts](../frontend/src/components/platforms/platform-payload.ts), [platform-form.tsx](../frontend/src/components/platforms/platform-form.tsx) y pruebas en [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Reglas de Activación y Desactivación de Botones en la Tabla de Plataformas

### Regla
1. **Regla de Selección Estricta en Toolbar**: En la vista de tabla de plataformas de un área (`/admin/platforms`), los botones de acción situados en la barra de herramientas a la izquierda del separador vertical (`ADMINS`, `EDITAR`, `ELIMINAR`) deben obedecer de forma uniforme las mismas reglas de activación y desactivación vigentes en los módulos de Usuarios (`users-list.tsx`) y Áreas (`areas-list.tsx`):
   - **0 filas seleccionadas**: Los botones `ADMINS`, `EDITAR` y `ELIMINAR` permanecen inactivos/deshabilitados (`disabled={true}`, con clases visuales de estado deshabilitado en gris tenue). Sus tooltips y atributos `title` indican claramente al usuario la acción requerida: `"Selecciona 1 plataforma para ver administradores"`, `"Selecciona 1 plataforma para editar"` y `"Selecciona 1 plataforma para eliminar"`.
   - **1 fila seleccionada**: Los botones se habilitan automáticamente (`disabled={false}`). `EDITAR` y `ELIMINAR` operan sobre la plataforma seleccionada (con `aria-label` y `title` contextuales: `"Editar {nombre}"`, `"Eliminar {nombre}"`). `ADMINS` permite abrir el panel de administradores del área activa. `ELIMINAR` utiliza la variante visual destructiva estándar `variant="fila-peligro"`.
   - **Más de 1 fila seleccionada**: `ADMINS` y `EDITAR` se deshabilitan (`"Solo se puede editar 1 plataforma a la vez"`); `ELIMINAR` sigue activo para el borrado en lote (ver "Eliminación en Lote para Selección Múltiple de Áreas y Plataformas").
2. **Consistencia Visual con el Botón Nuevo**: El botón `+ NUEVO` permanece ubicado a la derecha del separador vertical `|` como acción de creación primaria independiente de la selección (`variant="fila-primario"`), siempre disponible salvo durante la carga inicial o si no existen áreas disponibles.

### Ejemplo
Al acceder a "Demo Finanzas" con 0 plataformas marcadas, los botones `ADMINS`, `EDITAR` y `ELIMINAR` se muestran en gris tenue y no permiten clic (deshabilitados), mientras que `+ NUEVO` permanece activo en azul primario. Al marcar la casilla de la plataforma "Contabilidad", los tres botones se iluminan y se vuelven interactivos, mostrando "Editar Contabilidad" y "Eliminar Contabilidad". Al desmarcarla o marcar más de una, los botones regresan inmediatamente a su estado deshabilitado.

### Impacto
Afecta a [platform-admin.tsx](../frontend/src/components/platform-admin.tsx), [areas-list.tsx](../frontend/src/components/areas-list.tsx), [users-list.tsx](../frontend/src/components/users-list.tsx) y a las pruebas en [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Simplificación de los Asistentes de Plataformas (Eliminación de Área e Integración en Alta y Edición)

### Regla
1. **Flujo de 2 Pasos Estricto y Simplificado**: Tanto el modal de creación ("Nueva plataforma") como el de edición ("Editar plataforma") operan bajo un flujo unificado y conciso de exactamente dos pasos:
   - **Paso 1: Descripción**: Contiene exclusivamente los campos esenciales de la plataforma: Nombre (`name`), Descripción (`description`) y Enlace directo (`direct_link`). Se eliminan por completo los selectores y configuraciones de "Área" y de "Integración" (conector o LDAP).
   - **Paso 2: Estilo**: Permite configurar el Color de fondo (`bg_color`), Color de texto (`text_color`), visualización de la tarjeta en la Vista previa en tiempo real (mostrando el badge del área activa a la que pertenece) y el interruptor de Estado Activo/Inactivo (`status`).
2. **Contexto Automático del Área**:
   - En el alta, la plataforma se vincula de manera automática al área seleccionada en la vista (`selectedArea.id`), aplicando el tipo de integración por omisión (`conector`).
   - En la edición, la plataforma conserva inmutable su `area_id` y su `integration_type` original, actualizando únicamente su identidad descriptiva, enlace y atributos de estilo visual.

### Ejemplo
Al seleccionar una plataforma en la tabla y presionar el botón "EDITAR", se abre el diálogo "Editar plataforma" mostrando en el Paso 1 únicamente los campos Nombre, Descripción y Enlace (sin el selector desplegable de Área ni la sección de Integración). El usuario puede modificar el nombre o enlace, presionar "Siguiente" para ajustar los colores o estado en el Paso 2, y guardar de inmediato sin fricción ni validaciones accesorias de directorio o conector.

### Impacto
Afecta a [platform-form.tsx](../frontend/src/components/platforms/platform-form.tsx), [platform-admin.tsx](../frontend/src/components/platform-admin.tsx) y la suite de pruebas [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Botón de Accesos en la Tabla de Plataformas (Gestión de Accesos por Plataforma)

### Regla
1. **Sustitución de Botón Admins por Accesos**: En la vista de tabla de plataformas de un área (`/admin/platforms`), el botón de acción anteriormente denominado `ADMINS` se sustituye de forma permanente por `ACCESOS` (`Icono nombre="solicitudes"`), disponible para administradores de área y superadministradores (`canManage`).
2. **Reglas de Selección y Activación**:
   - **0 plataformas seleccionadas**: El botón permanece deshabilitado (`disabled={true}`), con `title="Selecciona 1 plataforma para gestionar accesos"` y `aria-label="Accesos"`.
   - **1 plataforma seleccionada**: Se habilita (`disabled={false}`), con `title="Accesos de {nombre_plataforma}"` y `aria-label="Accesos de {nombre_plataforma}"`.
   - **Más de 1 plataforma seleccionada**: Se deshabilita preventivamente (`disabled={true}`), con `title="Solo se pueden gestionar accesos de 1 plataforma a la vez"`.
3. **Panel Modal de Gestión de Accesos (`PlatformAccessPanel`)**:
   - Al pulsar el botón `ACCESOS` con una plataforma seleccionada, se abre el diálogo modal "Accesos — {nombre_plataforma}".
   - Lista los usuarios pertenecientes al área de la plataforma, indicando mediante casillas de verificación interactivas (`Checkbox`) quiénes cuentan con acceso vigente y su estado (`Activo`).
   - **Dar acceso**: Marcar la casilla de un usuario sin acceso programa el alta; al guardar, se invoca `POST /api/v1/platforms/{id}/access`, encolando el aprovisionamiento correspondiente y registrando la auditoría.
   - **Quitar acceso**: Desmarcar la casilla de un usuario con acceso vigente programa su revocación; antes de aplicar el cambio, el sistema solicita confirmación mediante un diálogo explicativo (`ConfirmDialog`) y, al confirmar, se invoca `POST /api/v1/access/{id}/revoke`.
   - Incluye buscador rápido por nombre o correo, región viva WCAG (`role="status"`) y notificación Toast al completar los cambios.

### Ejemplo
Al seleccionar la plataforma "Contabilidad" dentro del área "Finanzas" y hacer clic en el botón "ACCESOS" de la barra de herramientas, se abre el panel modal "Accesos — Contabilidad". Si la usuaria "Ana López" no tiene acceso, el administrador marca su casilla y presiona "Guardar", otorgándole acceso inmediatamente. Si el usuario "Carlos Ruiz" ya tiene acceso y se desmarca su casilla, el sistema solicita confirmación ("¿Deseas retirar el acceso?") y al confirmar ejecuta la revocación formal.

### Impacto
Afecta a [platform-admin.tsx](../frontend/src/components/platform-admin.tsx), [platform-access-panel.tsx](../frontend/src/components/platforms/platform-access-panel.tsx), [api.ts](../frontend/src/lib/api.ts), [api.py](../app/modules/access/api.py) y las suites de pruebas [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx) y [platform-access-panel.test.tsx](../frontend/tests/components/platform-access-panel.test.tsx).


## Dual Picklist en la Gestión de Accesos por Plataforma

### Regla
1. **Estructura de Doble Columna (Dual Picklist - DIS-019)**:
   - El modal de gestión de accesos por plataforma (`PlatformAccessPanel`) organiza a los usuarios del área en dos listas interactivas claramente diferenciadas:
     - **Columna Izquierda ("Sin acceso")**: Contiene a los miembros del área que no tienen acceso otorgado a la plataforma seleccionada. Cuenta con buscador propio, contador de usuarios disponibles y acción rápida "Todos +".
     - **Columna Derecha ("Con acceso")**: Contiene a los miembros del área autorizados con acceso activo a la plataforma. Cuenta con buscador propio, contador de usuarios asignados y acción rápida "Todos ✕".
2. **Interacción y Transferencia**:
   - Transferencia ágil con un solo clic: al pulsar sobre un usuario en la columna "Sin acceso", este se transfiere de inmediato a la columna "Con acceso" con la insignia visual `Nuevo`.
   - Al pulsar sobre un usuario en la columna "Con acceso", este se transfiere de vuelta a la columna "Sin acceso".
3. **Persistencia y Confirmación de Seguridad**:
   - Los cambios permanecen en estado pendiente hasta presionar el botón "Guardar".
   - Si se detectan revocaciones de accesos previamente vigentes (`aRevocar > 0`), se despliega un diálogo de confirmación de seguridad (`ConfirmDialog`) antes de ejecutar las revocaciones mediante `POST /api/v1/access/{id}/revoke`.
   - Las nuevas asignaciones se procesan vía `POST /api/v1/platforms/{id}/access`, notificando mediante Toast reactivo.

### Ejemplo
Al abrir el modal "Accesos — Contabilidad", en el lado izquierdo aparecen los usuarios de Finanzas que no cuentan con cuenta o permisos en Contabilidad, y en el lado derecho aquellos que ya están autorizados. El administrador puede hacer clic sobre "Ana López" en la izquierda para moverla a la derecha ("Con acceso"). Luego pulsa "Guardar" para consolidar el otorgamiento. Si traslada a "Carlos Ruiz" de la derecha a la izquierda y presiona "Guardar", el sistema despliega el diálogo "Revocar accesos" solicitando confirmación explícita para evitar revocaciones accidentales.

### Impacto
Afecta a [platform-access-panel.tsx](../frontend/src/components/platforms/platform-access-panel.tsx), [form.tsx](../frontend/src/components/form.tsx) y la suite de pruebas [platform-access-panel.test.tsx](../frontend/tests/components/platform-access-panel.test.tsx).


## Cierre Automático del Modal de Accesos tras Guardar

### Regla
Al completar exitosamente el guardado de los cambios en el modal de accesos por plataforma (`PlatformAccessPanel`), el sistema debe emitir la notificación Toast reactiva y cerrar de inmediato el diálogo modal invocando `onClose()`, devolviendo el foco de forma accesible al disparador en la barra de herramientas y evitando que el usuario deba presionar manualmente el botón "Cerrar".

### Ejemplo
El administrador transfiere a "Ana López" a la columna "Con acceso" y presiona "Guardar". Una vez que la API confirma el otorgamiento del acceso, se muestra el Toast de éxito y el modal se cierra automáticamente, regresando a la tabla de plataformas.

### Impacto
Afecta a [platform-access-panel.tsx](../frontend/src/components/platforms/platform-access-panel.tsx) y [platform-access-panel.test.tsx](../frontend/tests/components/platform-access-panel.test.tsx).


## Guardado Directo Sin Diálogo de Confirmación en Dual Picklist de Accesos

### Regla
En el modal de gestión de accesos por plataforma (`PlatformAccessPanel`), la transferencia de un usuario hacia la columna "Sin acceso" (quitar acceso) no debe requerir un diálogo secundario de confirmación (`ConfirmDialog`). Al presionar el botón "Guardar", todas las modificaciones (tanto otorgamientos como revocaciones) se ejecutan de manera directa y atómica, emitiendo de inmediato la notificación Toast de confirmación correspondiente y cerrando el modal.

### Ejemplo
El administrador traslada a un usuario de la columna "Con acceso" a "Sin acceso" y hace clic en "Guardar". El sistema procesa la revocación inmediatamente sin mostrar ninguna ventana emergente adicional, muestra la notificación Toast "Acceso retirado para «Contabilidad»." y cierra el modal devolviendo el foco a la tabla.

### Impacto
Afecta a [platform-access-panel.tsx](../frontend/src/components/platforms/platform-access-panel.tsx) y [platform-access-panel.test.tsx](../frontend/tests/components/platform-access-panel.test.tsx).


## Notificaciones Exclusivas vía Toast en Gestión de Accesos

### Regla
En el modal de administración de accesos por plataforma (`PlatformAccessPanel`), todos los mensajes informativos, de confirmación y de error derivados de las operaciones de otorgar o revocar accesos deben comunicarse exclusivamente mediante el sistema global de notificaciones Toast (`useToast`). Queda prohibido renderizar notas de error o badges de confirmación como elementos de contenido inline dentro del cuerpo del modal, garantizando que el diseño del modal permanezca limpio, estable y sin desplazamientos de layout.

### Ejemplo
Cuando ocurre un error o se completa exitosamente el guardado de accesos, el sistema despacha `avisar('error', ...)` o `avisar('success', ...)`. Ningún bloque `<ErrorNote>` o `<Badge>` aparece dentro del modal.

### Impacto
Afecta a [platform-access-panel.tsx](../frontend/src/components/platforms/platform-access-panel.tsx) y [platform-access-panel.test.tsx](../frontend/tests/components/platform-access-panel.test.tsx).


## Auto-cierre Universal de Notificaciones Toast

### Regla
Todos los avisos y notificaciones mostrados a través del proveedor Toast (`ToastProvider`), incluidos los de tono error, advertencia, éxito e información, deben cerrarse automáticamente al transcurrir el tiempo definido (`TOAST_MS`). Cada notificación incorpora una barra de progreso regresivo y soporta pausa interactiva mientras el cursor (ratón) o el foco por teclado se encuentren sobre la tarjeta (WCAG 2.2.1), reanudando el temporizador al salir.

### Ejemplo
Al producirse un error en una operación, se despliega una tarjeta Toast roja en la esquina inferior derecha con su barra de progreso. El usuario puede leerla y, si no interactúa con ella, se disipa automáticamente tras 6 segundos sin requerir que haga clic en el botón de cerrar.

### Impacto
Afecta a [toast.tsx](../frontend/src/components/toast.tsx) y [componentes-comunes.test.tsx](../frontend/tests/components/componentes-comunes.test.tsx).


## Gestión Directa de Accesos en Plataformas sin Conector Automatizado

### Regla
En plataformas que no cuentan con un conector externo activo ni integración LDAP (`sin_conector`), las operaciones de asignación y revocación directa ejecutadas por administradores deben resolverse de forma síncrona e inmediata. Al otorgar acceso, el registro se establece directamente en estado `activo` (sin quedar bloqueado en `en_proceso`); al revocar acceso, el registro pasa directamente a `revocado` (liberando de inmediato el slot vigente sin requerir un worker de aprovisionamiento en segundo plano ni arrojar 409 por estados no sincronizados).

### Ejemplo
Un administrador ingresa a los accesos de la plataforma "qw" (sin conector), mueve a "Usuario Demo 2" a la columna "Con acceso" y guarda: el acceso queda inmediatamente en estado "activo". Al retirarlo y guardar, el acceso se revoca de inmediato sin error de "Solo se revoca un acceso activo".

### Impacto
Afecta a [api.py](../app/modules/access/api.py) y [test_platform_access_api.py](../tests/access/test_platform_access_api.py).


## Configuración de Duración a 8 Segundos en Auto-cierre Toast

### Regla
El temporizador global de auto-cierre para todas las notificaciones Toast (`TOAST_MS`) queda establecido en 8 segundos (8000 ms), sincronizando la animación CSS de la barra regresiva (`.nx-toast-progress`) a 8 segundos. Toda notificación (éxito, error, advertencia e información) permanece visible durante este intervalo completo, manteniendo el soporte de pausa al recibir cursor o foco accesible y reanudando al perderlos.

### Ejemplo
Al guardar o retirar un acceso, el aviso Toast generado se muestra durante 8 segundos completos mientras su barra de progreso disminuye suavemente, desapareciendo de forma automática si el usuario no interactúa con él.

### Impacto
Afecta a [toast.tsx](../frontend/src/components/toast.tsx), [components.css](../frontend/src/styles/components.css) y [componentes-comunes.test.tsx](../frontend/tests/components/componentes-comunes.test.tsx).


## Optimización de Navegación: Caché en Memoria y Stale-While-Revalidate

### Regla
Para eliminar bloqueos y destellos de "Cargando…" en las transiciones de página:
1. `SessionProvider` debe mantener la sesión en memoria (`cachedSession`) una vez autenticada. En navegaciones subsecuentes, la sesión se sirve de forma inmediata (`loading: false`) mientras se valida en segundo plano sin desmontar el marco general de la interfaz.
2. El hook `useAsync` soporta el patrón Stale-While-Revalidate mediante una clave opcional `cacheKey`. Al revisitar vistas con clave de caché, los datos previos se despliegan instantáneamente en el primer render (`loading: false`), sincronizando silenciosamente en segundo plano sin provocar parpadeos de esqueletos o spinners.

### Ejemplo
Al navegar entre "Áreas", "Plataformas" y otras secciones del sistema, la barra superior, la barra lateral y los listados principales se muestran de inmediato sin el spinner de pantalla completa ni recargas vacías.

### Impacto
Afecta a [session-provider.tsx](../frontend/src/components/session-provider.tsx), [use-async.ts](../frontend/src/lib/use-async.ts) y [platform-admin.tsx](../frontend/src/components/platform-admin.tsx).


## Configuración de Icono en Áreas y Columnas Estandarizadas en Tabla de Usuarios

### Regla
1. **Configuración de Icono en Áreas**: En el modal de creación y edición de áreas (`AreaForm`), dentro del Paso 2 (Estilo visual), se proporciona un selector accesible de iconos (`ICONOS_AREA`) que permite configurar el icono identificativo del área. El icono elegido se refleja en la vista previa del área y se persiste en base de datos.
2. **Columnas en Tabla de Usuarios**: La tabla principal de usuarios (`UsersList`) estructura sus columnas exactamente en:
   - `Nombre`: Muestra el avatar con iniciales y el nombre completo del usuario.
   - `Correo`: Muestra la dirección de correo electrónico del usuario.
   - `Rol`: Muestra la insignia correspondiente a su rol en el sistema.
   - `Estado`: Muestra las insignias de estatus de actividad (Activo/Inactivo) y tipo de autenticación.
   - `Áreas asignadas`: Despliega **únicamente** los iconos representativos de cada área asignada al usuario dentro de contenedores compactos y accesibles (incluyendo `title` y `aria-label` con el nombre del área), sin texto plano visible del nombre del área.
3. **Serialización Backend**: El backend serializa `icon` y `color` en las áreas asignadas del usuario (`app/modules/users/serializacion.py`).

### Ejemplo
En la tabla de usuarios, las columnas visibles son "Nombre", "Correo", "Rol", "Estado" y "Áreas asignadas". En la columna "Áreas asignadas", en lugar de etiquetas de texto como "Finanzas", se observan exclusivamente los iconos distintivos configurados para dichas áreas (por ejemplo el icono de estructura o de plataforma con tooltip de su nombre). Al dar de alta un área, en el paso 2 el administrador puede pulsar el icono deseado dentro de la cuadrícula interactiva.

### Impacto
Afecta a [serializacion.py](../app/modules/users/serializacion.py), [types.ts](../frontend/src/lib/types.ts), [area-form.tsx](../frontend/src/components/areas/area-form.tsx), [platform-admin.tsx](../frontend/src/components/platform-admin.tsx), [users-list.tsx](../frontend/src/components/users-list.tsx) y pruebas en [users-list.test.tsx](../frontend/tests/components/users-list.test.tsx).


## Columnas Estandarizadas en la Tabla de Áreas

### Regla
En la vista de administración de áreas (`/areas`), la tabla principal (`AreasList`) estandariza sus columnas para mostrar exclusivamente:
1. `Casilla de selección`: Control de selección individual y global para acciones en lote.
2. `Área`: Chip de iniciales con color personalizado + nombre del área (incluyendo la insignia `Administras` si el usuario en sesión es administrador delegado de dicha área).
3. `Descripción`: Detalle descriptivo del área o indicador en cursiva si no cuenta con descripción.
4. `Plataformas`: Contador numérico acompañado del icono representativo de plataformas.
5. `Usuarios`: Contador numérico acompañado del icono representativo de usuarios.
6. `Estado`: Insignia de estado operativo (`Activo` / `Inactivo`).

Queda eliminada la columna `Alcance` de la tabla, integrando el indicador de administración delegada de forma contextual y compacta directamente junto al nombre del área.

### Ejemplo
Al acceder a `/areas`, la tabla muestra los encabezados "Área", "Descripción", "Plataformas", "Usuarios" y "Estado". La columna previa "Alcance" no se despliega, optimizando el espacio horizontal y concentrando la información de descripción de cada área en su propia columna dedicada.

### Impacto
Afecta a [areas-list.tsx](../frontend/src/components/areas-list.tsx) y a la suite de pruebas en [areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx).


## Gestión de Usuarios y Accesos

### Regla
En la vista de administración de usuarios (`/users`), al seleccionar un usuario y pulsar la acción "Accesos" (en la barra de herramientas o en las acciones de fila), el sistema abre obligatoriamente un diálogo modal accesible (`Modal` flotante centrado con tamaño `2xl`), sustituyendo cualquier visualización incrustada inline que desplace la tabla.
El modal implementa un componente Dual Picklist estructurado en dos columnas independientes:
1. Columna izquierda ("Sin acceso"): Plataformas disponibles a las que el usuario no tiene acceso concedido actualmente, con buscador reactivo por nombre/código y contador de elementos.
2. Columna derecha ("Con acceso"): Plataformas en las que el usuario posee acceso activo/vigente, con buscador reactivo y contador de elementos.
Cada elemento de plataforma en las columnas cuenta con un objetivo táctil $\ge 48\text{ px}$ y un botón de transferencia inmediata en un solo clic (`+` para asignar, `−` para desasignar). El pie del modal exhibe el botón secundario "Cerrar", un indicador en tiempo real de cambios pendientes y el botón primario "Guardar" (deshabilitado si no hay cambios pendientes).
Al guardar, se realizan las operaciones de otorgamiento (`grantPlatformAccess`) y revocación (`revokeAccess`), notificando el resultado exclusivamente mediante mensajes Toast del sistema (sin alertas ni banners inline dentro del modal). En caso de usuarios con rol `superadmin`, el modal informa de manera accesible que cuentan con acceso universal automático.

### Ejemplo
Al seleccionar al usuario "Ana Ruiz" y presionar "Accesos", se despliega el modal flotante "Accesos — Ana Ruiz". En la columna "Sin acceso" se listan las plataformas disponibles. Al hacer clic en el botón "+" de la plataforma "GitLab", esta se transfiere inmediatamente a la columna "Con acceso" y el pie actualiza a "1 cambio pendiente". Al presionar "Guardar", se aplican las operaciones correspondientes y se muestra un toast de éxito "Accesos actualizados correctamente".

### Impacto
Afecta a [user-access-panel.tsx](../frontend/src/components/users/user-access-panel.tsx), [users-list.tsx](../frontend/src/components/users-list.tsx), [api.ts](../frontend/src/lib/api.ts), [serializacion.py](../app/modules/access/serializacion.py) y las suites de pruebas en [user-access-panel.test.tsx](../frontend/tests/components/users/user-access-panel.test.tsx) y [users-list.test.tsx](../frontend/tests/components/users-list.test.tsx).


## Columnas Estandarizadas en la Tabla de Áreas

### Regla
En la vista de administración de áreas (`/areas`), la tabla principal (`AreasList`) estandariza sus columnas para mostrar exclusivamente:
1. `Casilla de selección`: Control de selección individual y global para acciones en lote.
2. `Área`: Chip de iniciales con color personalizado + nombre del área (incluyendo la insignia `Administras` si el usuario en sesión es administrador delegado de dicha área).
3. `Descripción`: Detalle descriptivo del área o indicador en cursiva si no cuenta con descripción.
4. `Plataformas`: Contador numérico acompañado del icono representativo de plataformas.
5. `Usuarios`: Contador numérico acompañado del icono representativo de usuarios.
6. `Estado`: Insignia de estado operativo (`Activo` / `Inactivo`).

Queda eliminada la columna `Alcance` de la tabla, integrando el indicador de administración delegada de forma contextual y compacta directamente junto al nombre del área.

### Ejemplo
Al acceder a `/areas`, la tabla muestra los encabezados "Área", "Descripción", "Plataformas", "Usuarios" y "Estado". La columna previa "Alcance" no se despliega, optimizando el espacio horizontal y concentrando la información de descripción de cada área en su propia columna dedicada.

### Impacto
Afecta a [areas-list.tsx](../frontend/src/components/areas-list.tsx) y a la suite de pruebas en [areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx).


## Gestión de Usuarios y Accesos

### Regla
En la vista de administración de usuarios (`/users`), al seleccionar un usuario y pulsar la acción "Accesos" (en la barra de herramientas o en las acciones de fila), el sistema abre obligatoriamente un diálogo modal accesible (`Modal` flotante centrado con tamaño `2xl`), sustituyendo cualquier visualización incrustada inline que desplace la tabla.
El modal implementa un componente Dual Picklist estructurado en dos columnas independientes:
1. Columna izquierda ("Sin acceso"): Plataformas disponibles a las que el usuario no tiene acceso concedido actualmente, con buscador reactivo por nombre/código y contador de elementos.
2. Columna derecha ("Con acceso"): Plataformas en las que el usuario posee acceso activo/vigente, con buscador reactivo y contador de elementos.
Cada elemento de plataforma en las columnas cuenta con un objetivo táctil $\ge 48\text{ px}$ y un botón de transferencia inmediata en un solo clic (`+` para asignar, `−` para desasignar). El pie del modal exhibe el botón secundario "Cerrar", un indicador en tiempo real de cambios pendientes y el botón primario "Guardar" (deshabilitado si no hay cambios pendientes).
Al guardar, se realizan las operaciones de otorgamiento (`grantPlatformAccess`) y revocación (`revokeAccess`), notificando el resultado exclusivamente mediante mensajes Toast del sistema (sin alertas ni banners inline dentro del modal). En caso de usuarios con rol `superadmin`, el modal informa de manera accesible que cuentan con acceso universal automático.

### Ejemplo
Al seleccionar al usuario "Ana Ruiz" y presionar "Accesos", se despliega el modal flotante "Accesos — Ana Ruiz". En la columna "Sin acceso" se listan las plataformas disponibles. Al hacer clic en el botón "+" de la plataforma "GitLab", esta se transfiere inmediatamente a la columna "Con acceso" y el pie actualiza a "1 cambio pendiente". Al presionar "Guardar", se aplican las operaciones correspondientes y se muestra un toast de éxito "Accesos actualizados correctamente".

### Impacto
Afecta a [user-access-panel.tsx](../frontend/src/components/users/user-access-panel.tsx), [users-list.tsx](../frontend/src/components/users-list.tsx), [api.ts](../frontend/src/lib/api.ts), [serializacion.py](../app/modules/access/serializacion.py) y las suites de pruebas en [user-access-panel.test.tsx](../frontend/tests/components/users/user-access-panel.test.tsx) y [users-list.test.tsx](../frontend/tests/components/users-list.test.tsx).


## Persistencia de Dimensiones de Cuadrícula en Plataformas

### Regla
En la vista de administración de plataformas (`/admin/platforms`), las dimensiones de la cuadrícula de tarjetas de áreas (filas de 2 a 4 y columnas de 2 a 4) se persisten en el navegador del usuario utilizando `localStorage` (`portal_grid_filas` y `portal_grid_columnas`). Cada cambio de filas, columnas o combinaciones predefinidas ($2\times 2$, $3\times 3$, $4\times 4$, etc.) se almacena inmediatamente en el almacenamiento local. Al recargar la página o navegar entre distintas vistas del sistema, el componente restaura de forma reactiva las dimensiones configuradas por el usuario, evitando que se restablezcan a los valores iniciales de $2\times 4$.

### Ejemplo
Un administrador ingresa a `General > Plataformas` y en el menú de cuadrícula selecciona la combinación `3×3`. El diseño se adapta de inmediato mostrando 9 ranuras y guardando los valores `3` y `3` en el almacenamiento local. Al navegar hacia otra ruta del sistema o refrescar la pestaña, la vista de plataformas mantiene activa la configuración de 3 filas por 3 columnas.

### Impacto
Afecta a [platform-admin.tsx](../frontend/src/components/platform-admin.tsx) y a la suite de pruebas en [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Botones Estandarizados en la Barra de Herramientas de Conectores

### Regla
En la vista de administración de conectores (`/admin/connectors`), la barra de herramientas principal estandariza sus acciones contextuales a la derecha, reemplazando el botón aislado de "Recargar":
1. **Botón `EDITAR`**: Variante `fila`, icono de edición y texto "Editar". Se activa únicamente cuando se selecciona una plataforma en la lista (`disabled={!seleccionada}`) y permite abrir o enfocar el panel de edición del conector correspondiente.
2. **Botón `ELIMINAR`**: Variante `fila-peligro`, icono de eliminar y texto "Eliminar". Se habilita exclusivamente cuando la plataforma seleccionada cuenta con un conector configurado (`disabled={!seleccionada || !seleccionada.has_connector}`). Al pulsarlo, abre el diálogo de confirmación `ConnectorDeleteDialog` para eliminar el conector.
3. **Separador vertical**: Divisor visual de 24 px (`w-px bg-panel-border/80`).
4. **Botón `+ NUEVO`**: Variante `fila-primario`, icono de más y texto "Nuevo". Si se tiene seleccionada una plataforma sin conector, abre directamente su panel para configurarla. En caso contrario, despliega un modal accesible para seleccionar cuál de las plataformas pendientes se desea configurar; si todas ya tienen conector, notifica amigablemente mediante Toast.

### Ejemplo
Al ingresar a `Gestión > Conectores`, la barra de herramientas presenta a la derecha los botones `Editar` y `Eliminar` (ambos deshabilitados inicialmente), el separador vertical y `+ Nuevo`. Al seleccionar la plataforma "Contabilidad", los botones `Editar` y `Eliminar` se activan con sus respectivas etiquetas accesibles. Al presionar `Eliminar`, se despliega el diálogo de confirmación para revocar el conector sin necesidad de descender al panel inferior.

### Impacto
Afecta a [connectors-admin.tsx](../frontend/src/components/connectors/connectors-admin.tsx), [connector-list.tsx](../frontend/src/components/connectors/connector-list.tsx) y a la suite de pruebas en [connectors-admin.test.tsx](../frontend/tests/components/connectors/connectors-admin.test.tsx).


## Tolerancia a Entidades Nulas en Bitácora de Ejecuciones

### Regla
En la vista y componentes de bitácora de ejecuciones de aprovisionamiento (`/admin/jobs`, `JobsTable`, `JobDetailModal`, `JobRetryDialog` y `JobsLog`), las referencias a entidades asociadas (`job.platform`, `job.user` y `job.area`) deben consumirse de forma defensiva mediante encadenamiento opcional (`?.`) y textos descriptivos de contingencia (`'Plataforma eliminada'`, `'Usuario eliminado'`, `'Área eliminada'`).
Debido a que el backend retorna intencionalmente `null` cuando una entidad referenciada por un trabajo previo ha sido eliminada del sistema, los componentes frontend deben garantizar la renderización íntegra de la bitácora histórica sin generar excepciones `TypeError` ni páginas de error 500.

### Ejemplo
Si un trabajo de aprovisionamiento histórico referencia una plataforma que posteriormente fue eliminada de la base de datos (como el trabajo n.º 2), la bitácora despliega correctamente la fila identificando al usuario y señalando "Plataforma eliminada · [Nombre del área]" en lugar de interrumpir la renderización.

### Impacto
Afecta a [jobs-table.tsx](../frontend/src/components/connectors/jobs-table.tsx), [job-detail-modal.tsx](../frontend/src/components/connectors/job-detail-modal.tsx), [job-retry-dialog.tsx](../frontend/src/components/connectors/job-retry-dialog.tsx), [jobs-log.tsx](../frontend/src/components/connectors/jobs-log.tsx), [types.ts](../frontend/src/lib/access/types.ts) y a la suite de pruebas en [jobs-page.test.tsx](../frontend/tests/components/connectors/jobs-page.test.tsx).


## Script Unificado de Arranque de Servicios

### Regla
Para facilitar el levantamiento del ecosistema de desarrollo en local, se dispone del script ejecutable `start.sh` en la raíz del proyecto (a la altura de `run.py`). El script orquesta de forma automatizada:
1. Validación de la presencia del entorno virtual Python (`venv`).
2. Comprobación e instalación de dependencias del frontend (`frontend/node_modules`).
3. Aplicación de migraciones pendientes de base de datos (`venv/bin/alembic upgrade head`).
4. Lanzamiento concurrente del Backend Flask (`run.py` en puerto 5001) y del Frontend Next.js (`npm run dev` en puerto 3000).
5. Captura y propagación de señales de terminación (`SIGINT`, `SIGTERM`, `EXIT`) para asegurar el apagado limpio y simultáneo de ambos procesos al pulsar `Ctrl+C`, previniendo puertos bloqueados o procesos huérfanos.

### Ejemplo
Al ejecutar `./start.sh` desde la terminal en la raíz del proyecto, el sistema aplica las migraciones pendientes y levanta de inmediato tanto el backend (`http://localhost:5001`) como el frontend (`http://localhost:3000`). Al presionar `Ctrl+C`, la terminal finaliza ambos subprocesos y libera los puertos de forma segura.

### Impacto
Afecta a [start.sh](../start.sh) y a los procedimientos de desarrollo local.


## Limpieza Visual en Modal de Accesos (Dual Picklist)

### Regla
En el modal de administración de accesos (`PlatformAccessPanel` y paneles análogos con Dual Picklist), se suprime el texto de ayuda explicativo sobre la transferencia de registros entre columnas ("Haz clic sobre cualquier usuario para transferirlo entre columnas..."). La interacción intuitiva mediante botones interactivos, estados visuales y diseño autodirigido sustituye la instrucción redundante, maximizando el espacio vertical y la legibilidad de las listas de transferencia.

### Ejemplo
Al abrir el modal de accesos para una plataforma desde el catálogo, la cabecera muestra inmediatamente los contadores y las dos columnas del Dual Picklist sin párrafos de texto instructivo innecesarios, permitiendo una visión despejada y directa de los usuarios asignados y disponibles.

### Impacto
Afecta a [platform-access-panel.tsx](../frontend/src/components/platforms/platform-access-panel.tsx) y a la experiencia de usuario en la administración de accesos del portal.


## Estandarización Global de Opciones de Selección (Option y nexus-option)

### Regla
Todos los elementos desplegables de selección (`<Select>` y selectores del sistema) deben utilizar el componente reutilizable `<Option>` de [form.tsx](../frontend/src/components/form.tsx) o, en su defecto, portar la clase CSS `.nexus-option` (junto con tokens de fondo, texto y peso tipográfico semibold: `bg-input-bg text-input-text font-semibold`). Queda estrictamente prohibido el uso de etiquetas `<option>` nativas desnudas sin estilizado de clase, asegurando que en todos los navegadores y sistemas operativos las opciones respeten los tokens de superficie, contraste, estados `:checked`, `:hover` y soporte completo de modo oscuro.

### Ejemplo
En los filtros de auditoría, bitácora de ejecuciones, alcance, inventario y solicitudes, cada opción se renderiza como `<Option value="...">Texto</Option>`, inyectando la clase `.nexus-option` y garantizando que el menú desplegable conserve el tema visual de Nexus en lugar de los estilos grises por defecto del navegador.

### Impacto
Afecta a [form.tsx](../frontend/src/components/form.tsx), [select-premium.tsx](../frontend/src/components/select-premium.tsx), [scope-filters.tsx](../frontend/src/components/access/scope-filters.tsx), [inventory-filters.tsx](../frontend/src/components/access/inventory-filters.tsx), [my-access.tsx](../frontend/src/components/access/my-access.tsx), [approvals-inbox.tsx](../frontend/src/components/access/approvals-inbox.tsx), [my-requests.tsx](../frontend/src/components/access/my-requests.tsx), [catalog-filters.tsx](../frontend/src/components/access/catalog-filters.tsx), [theme-selector.tsx](../frontend/src/components/theme-selector.tsx), [platform-integration-fields.tsx](../frontend/src/components/platforms/platform-integration-fields.tsx), [jobs-filters.tsx](../frontend/src/components/connectors/jobs-filters.tsx), [connector-form.tsx](../frontend/src/components/connectors/connector-form.tsx), [connector-param-fields.tsx](../frontend/src/components/connectors/connector-param-fields.tsx), [audit-filters.tsx](../frontend/src/components/audit/audit-filters.tsx), [smtp-tab.tsx](../frontend/src/components/settings/smtp-tab.tsx) y [components.css](../frontend/src/styles/components.css).


## Supresión de Texto Instructivo en Modal de Accesos de Usuarios (UserAccessPanel)

### Regla
En concordancia con la estandarización del modal de accesos de plataformas, en el modal de accesos de usuarios ([user-access-panel.tsx](../frontend/src/components/users/user-access-panel.tsx)) se elimina el texto de instrucción ("Haz clic sobre cualquier plataforma para transferirla entre columnas..."). Las columnas Dual Picklist, los buscadores independientes y los botones interactivos proporcionan una interfaz autodirigida y ergonómica sin necesidad de leyendas explicativas estáticas.

### Ejemplo
Al seleccionar un usuario en la tabla de usuarios y hacer clic en el botón `Accesos`, el modal desplegado muestra de inmediato los contadores y las columnas de plataformas disponibles y asignadas, con máximo aprovechamiento del espacio vertical y sin bloques de texto redundantes.

### Impacto
Afecta a [user-access-panel.tsx](../frontend/src/components/users/user-access-panel.tsx) y a la suite de pruebas en [user-access-panel.test.tsx](../frontend/tests/components/users/user-access-panel.test.tsx).


## Estandarización Global de Opciones de Selección (Option y nexus-option)

### Regla
Todos los elementos desplegables de selección (`<Select>` y selectores del sistema) deben utilizar el componente reutilizable `<Option>` de [form.tsx](../frontend/src/components/form.tsx) o, en su defecto, portar la clase CSS `.nexus-option` (junto con tokens de fondo, texto y peso tipográfico semibold: `bg-input-bg text-input-text font-semibold`). Queda estrictamente prohibido el uso de etiquetas `<option>` nativas desnudas sin estilizado de clase, asegurando que en todos los navegadores y sistemas operativos las opciones respeten los tokens de superficie, contraste, estados `:checked`, `:hover` y soporte completo de modo oscuro.

### Ejemplo
En los filtros de auditoría, bitácora de ejecuciones, alcance, inventario y solicitudes, cada opción se renderiza como `<Option value="...">Texto</Option>`, inyectando la clase `.nexus-option` y garantizando que el menú desplegable conserve el tema visual de Nexus en lugar de los estilos grises por defecto del navegador.

### Impacto
Afecta a [form.tsx](../frontend/src/components/form.tsx), [select-premium.tsx](../frontend/src/components/select-premium.tsx), [scope-filters.tsx](../frontend/src/components/access/scope-filters.tsx), [inventory-filters.tsx](../frontend/src/components/access/inventory-filters.tsx), [my-access.tsx](../frontend/src/components/access/my-access.tsx), [approvals-inbox.tsx](../frontend/src/components/access/approvals-inbox.tsx), [my-requests.tsx](../frontend/src/components/access/my-requests.tsx), [catalog-filters.tsx](../frontend/src/components/access/catalog-filters.tsx), [theme-selector.tsx](../frontend/src/components/theme-selector.tsx), [platform-integration-fields.tsx](../frontend/src/components/platforms/platform-integration-fields.tsx), [jobs-filters.tsx](../frontend/src/components/connectors/jobs-filters.tsx), [connector-form.tsx](../frontend/src/components/connectors/connector-form.tsx), [connector-param-fields.tsx](../frontend/src/components/connectors/connector-param-fields.tsx), [audit-filters.tsx](../frontend/src/components/audit/audit-filters.tsx), [smtp-tab.tsx](../frontend/src/components/settings/smtp-tab.tsx) y [components.css](../frontend/src/styles/components.css).


## Supresión de Texto Instructivo en Modal de Accesos de Usuarios (UserAccessPanel)

### Regla
En concordancia con la estandarización del modal de accesos de plataformas, en el modal de accesos de usuarios ([user-access-panel.tsx](../frontend/src/components/users/user-access-panel.tsx)) se elimina el texto de instrucción ("Haz clic sobre cualquier plataforma para transferirla entre columnas..."). Las columnas Dual Picklist, los buscadores independientes y los botones interactivos proporcionan una interfaz autodirigida y ergonómica sin necesidad de leyendas explicativas estáticas.

### Ejemplo
Al seleccionar un usuario en la tabla de usuarios y hacer clic en el botón `Accesos`, el modal desplegado muestra de inmediato los contadores y las columnas de plataformas disponibles y asignadas, con máximo aprovechamiento del espacio vertical y sin bloques de texto redundantes.

### Impacto
Afecta a [user-access-panel.tsx](../frontend/src/components/users/user-access-panel.tsx) y a la suite de pruebas en [user-access-panel.test.tsx](../frontend/tests/components/users/user-access-panel.test.tsx).


## Estandarización de Dimensiones de Iconos en Tablas (Usuarios y Áreas)

### Regla
Todos los iconos contenedores, badges de estado, contadores numéricos y avatares en las tablas de entidades maestras ([users-list.tsx](../frontend/src/components/users-list.tsx), [areas-list.tsx](../frontend/src/components/areas-list.tsx) y [platform-columns.tsx](../frontend/src/components/platforms/platform-columns.tsx)) deben estar rigurosamente estandarizados bajo el sistema de 8pt con una altura y escala unificada:
- **Contenedores de iconos / Avatares**: Cuadrados de 32x32 px (`size-8`) con radio de curvatura uniforme (`rounded-lg`).
- **Pastillas de contadores y estados**: Altura fija de 32 px (`h-8` / `!h-8`) con esquinas curvadas (`rounded-lg`) y relleno táctil equilibrado.
- **Iconografía interna**: Escala estándar de 16 px (`tamano="sm"`), eliminando iconos reducidos (`tamano="xs"` o contenedores `size-7`) que producían disparidad visual respecto al avatar de la columna de nombre.
- **Representación de Área**: En la columna de área, si el registro cuenta con un icono personalizado configurado (`area.icon`), se renderiza dicho icono dentro del chip de 32 px en lugar de las iniciales alfabéticas.

### Ejemplo
En la tabla de usuarios, las insignias de estado (activo/inactivo y LDAP/local) y los iconos de áreas asignadas miden exactamente 32x32 px (`size-8`), alineándose de manera simétrica y con la misma presencia visual que el avatar del nombre. En la tabla de áreas, los contadores de plataformas y usuarios tienen altura de 32 px con iconos de 16 px (`tamano="sm"`), igualando la escala del chip de nombre de área.

### Impacto
Afecta a [users-list.tsx](../frontend/src/components/users-list.tsx), [areas-list.tsx](../frontend/src/components/areas-list.tsx), [platform-columns.tsx](../frontend/src/components/platforms/platform-columns.tsx) y [ui.tsx](../frontend/src/components/ui.tsx).


## Operaciones de Directorio LDAP en el Backend (CRUD de Usuarios, Contraseñas y Membresías)

### Regla
El backend centraliza y garantiza la gestión integral de cuentas y membresías sobre el servidor de directorio OpenLDAP a través de `EscritorDirectorio` (writer.py), cumpliendo con las siguientes directrices de seguridad y consistencia:
1. **Creación de usuarios (`create_user`)**: Crea la entrada en `LDAP_USERS_BASE_DN` con clases `inetOrgPerson` (y las configuradas en `LDAP_USER_OBJECT_CLASSES`). Valida identificador y correo, escapa caracteres RDN y filtros, y, si se suministra una contraseña inicial, la fija **después del alta con Password Modify (RFC 3062)**: el servidor la guarda cifrada; nunca va `userPassword` en claro en el alta (FNC-138).
2. **Eliminación de usuarios (`delete_user`)**: Permite la baja de cuentas en OpenLDAP identificando al usuario por instancia `UsuarioDirectorio`, identificador (UID) o DN completo. Valida estrictamente que el DN pertenezca a la base de usuarios configurada (`bajo_base(dn, cfg.usuarios_base_dn)`) y rechaza cualquier intento de borrado sobre la base o fuera de ella con `Resultado.ERROR_PERMANENTE` (`motivo='fuera_de_base'`). La baja es idempotente (`Resultado.NO_EXISTE` si el usuario no existe).
3. **Cambio de contraseña (`change_password` / `set_password`)**: Fija la contraseña con Password Modify (RFC 3062), que el servidor cifra; ya no se escribe `userPassword` en claro con `MODIFY_REPLACE` (FNC-138). Valida que la contraseña sea texto no vacío y que la cuenta pertenezca a la base de usuarios. Si se proporciona `old_password`, valida previamente la clave actual antes de efectuar la modificación.
4. **Membresía en grupos (`add_member` y `remove_member`)**: Gestiona la inclusión y exclusión de usuarios en grupos de LDAP (`groupOfNames` o `groupOfUniqueNames`), aceptando tanto instancias de `UsuarioDirectorio` como cadenas de identificador o DN normalizadas. Previene que grupos con miembros obligatorios queden vacíos inyectando el marcador `LDAP_GROUP_PLACEHOLDER_MEMBER` o denegando la operación con `ultimo_miembro`.

### Ejemplo
Al invocar `escritor.create_user(DatosCuenta('carlos', 'Carlos', 'Gomez', 'carlos@dominio.com', password='Password123!'))`, el backend crea la entrada en LDAP y luego fija su contraseña con Password Modify (OpenLDAP la guarda cifrada). Para cambiar su contraseña, `escritor.change_password('carlos', 'NuevaClave456!')` actualiza la clave en OpenLDAP de forma segura y sin exponer credenciales en los logs. Para eliminar la cuenta, `escritor.delete_user('carlos')` verifica que el DN esté bajo la base autorizada y ejecuta la eliminación sin afectar ramas ajenas.

### Impacto
Afecta a [writer.py](../app/modules/directory/writer.py), [directory_accounts.py](../app/modules/users/directory_accounts.py), [ldap_provider.py](../app/modules/provisioning/ldap_provider.py) y las suites de pruebas [test_writer.py](../tests/directory/test_writer.py) y [test_alta_directorio.py](../tests/users/test_alta_directorio.py).


## Eliminación en Lote para Selección Múltiple de Usuarios

### Regla
En la vista de administración de usuarios ([users-list.tsx](../frontend/src/components/users-list.tsx)), el botón de acción "Eliminar" en la barra de herramientas se habilita tanto para selección individual como para selecciones múltiples (`disabled={activeSelectedIds.size === 0}`):
1. **Acción unificada**: Mientras que los botones "Accesos" y "Editar" requieren un alcance singular (`isSingleSelected = activeSelectedIds.size === 1`), el botón "Eliminar" permite la supresión de una o más cuentas de usuarios concurrentemente.
2. **Confirmación contextual**: Al presionar "Eliminar" con múltiples registros seleccionados, el diálogo de confirmación `ConfirmDialog` adapta su título a "Eliminar usuarios" y expone explícitamente el conteo total de cuentas a retirar ("Se eliminarán las cuentas de los X usuarios seleccionados. Esta acción no se puede deshacer.").
3. **Ejecución y notificación**: Tras la confirmación, el sistema ejecuta la baja de cada cuenta invocando `api.deleteUser`, limpia la selección activa, recarga la lista de usuarios y notifica mediante Toast el total de cuentas retiradas.

### Ejemplo
Al marcar la casilla superior para seleccionar todos los usuarios o seleccionar varias filas (por ejemplo, 3 usuarios), los botones "Accesos" y "Editar" permanecen deshabilitados con sus respectivas descripciones explicativas, mientras que el botón "Eliminar" se activa indicando "Eliminar 3 usuarios seleccionados". Al pulsarlo, el modal solicita confirmación para los 3 usuarios y, tras confirmar, retira las cuentas y muestra el aviso "3 cuentas de usuarios retiradas".

### Impacto
Afecta a [users-list.tsx](../frontend/src/components/users-list.tsx) y a la suite de pruebas en [users-list.test.tsx](../frontend/tests/components/users-list.test.tsx).


## Eliminación en Lote para Selección Múltiple de Áreas y Plataformas

### Regla
En las tablas de administración de entidades ([areas-list.tsx](../frontend/src/components/areas-list.tsx) y [platform-admin.tsx](../frontend/src/components/platform-admin.tsx)), el botón de acción "Eliminar" en la barra de herramientas admite tanto selección individual como selección múltiple de 2 o más registros:
1. **Áreas ([areas-list.tsx](../frontend/src/components/areas-list.tsx))**:
   - El botón "Eliminar" se habilita cuando hay al menos 1 área seleccionada y el usuario cuenta con permisos sobre todas las áreas seleccionadas (superadministrador, o administrador de área con todas las áreas seleccionadas dentro de `managedIds`).
   - El diálogo de confirmación `ConfirmDialog` adapta título y mensaje en plural indicando el conteo de áreas ("Se eliminarán las X áreas seleccionadas. Si alguna tiene plataformas asignadas, primero hay que reasignarlas.").
   - La eliminación ejecuta `api.deleteArea` secuencialmente por cada área, limpia la selección, recarga la lista y notifica con Toast el resultado ("X áreas fueron retiradas.").
2. **Plataformas ([platform-admin.tsx](../frontend/src/components/platform-admin.tsx))**:
   - En la tabla de plataformas de un área activa, el botón "Eliminar" se habilita para 1 o más plataformas seleccionadas (`activeSelectedPlatformIds.size > 0`). Los botones "Accesos" y "Editar" se mantienen restringidos a exactamente 1 plataforma (`isSinglePlatformSelected`).
   - El diálogo de confirmación adapta título y mensaje ("Se eliminarán las X plataformas seleccionadas. Esta acción no se puede deshacer.").
   - La eliminación invoca `api.deletePlatform` por cada plataforma en lote, retira los IDs de la selección activa, recarga el listado y reporta mediante Toast el total de plataformas eliminadas.

### Ejemplo
Al marcar varias casillas en la tabla de áreas (por ejemplo, 2 áreas administradas), el botón "Eliminar" se activa como "Eliminar 2 áreas seleccionadas". Al hacer click y confirmar en el modal, se eliminan ambas áreas y se muestra el toast "2 áreas fueron retiradas". De igual forma, en la tabla de plataformas de un área, al seleccionar 3 plataformas el botón "Eliminar" se activa para eliminarlas en lote tras la confirmación respectiva.

### Impacto
Afecta a [areas-list.tsx](../frontend/src/components/areas-list.tsx), [platform-admin.tsx](../frontend/src/components/platform-admin.tsx) y a las suites de pruebas [areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx) y [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Condiciones de Integridad para la Baja de Áreas (Plataformas y Usuarios)

### Regla
La eliminación de un área en el sistema está sujeta a las siguientes reglas estrictas de integridad referencial:
1. **Plataformas vinculadas (Bloqueo de eliminación)**: Un área no puede eliminarse si contiene una o más plataformas asociadas (`area.platforms` no vacío). La API rechaza la solicitud con código `409 Conflict` (`area_con_plataformas`), requiriendo que las plataformas sean previamente eliminadas o reasignadas a otra área.
2. **Usuarios asignados (Desvinculación automática)**: La existencia de usuarios asignados al área (`user_areas`) o administradores delegados (`area_admins`) no impide la baja del área. Al concretarse la eliminación del área, las asociaciones en las tablas relacionales secundarias se eliminan automáticamente (desvinculando a los usuarios y administradores de dicha área), mientras que las cuentas de usuario (`users`) se conservan intactas en el sistema y en el directorio.

### Ejemplo
Si el área "Finanzas" contiene 2 plataformas y 5 usuarios, al intentar eliminarla el sistema rechaza la operación informando que primero deben reasignarse o eliminarse sus plataformas. Una vez que las plataformas se han movido a otra área (dejando 0 plataformas en Finanzas), el área se elimina exitosamente y los 5 usuarios simplemente dejan de pertenecer a "Finanzas", manteniéndose activos en el catálogo de usuarios.

### Impacto
Afecta a [app/modules/areas/baja.py](../app/modules/areas/baja.py), [app/modules/areas/api.py](../app/modules/areas/api.py), [areas-list.tsx](../frontend/src/components/areas-list.tsx) y los modelos de datos en [app/modules/auth/models.py](../app/modules/auth/models.py).


## Generador de Contraseñas Seguras en el Modal de Nueva Cuenta

### Regla
El modal de creación de nueva cuenta ([directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx)) incorpora un generador criptográfico de contraseñas de alta seguridad ([generador-contrasena.ts](../frontend/src/lib/generador-contrasena.ts)):
1. **Composición y Longitud**: Genera contraseñas alfanuméricas con símbolos con una longitud mínima garantizada de 16 caracteres (`LONGITUD_MINIMA_GENERADOR = 16`). La contraseña generada incluye obligatoriamente al menos una letra mayúscula (`A-Z`), una minúscula (`a-z`), un dígito numérico (`0-9`) y un símbolo especial (`!@#$%^&*()_+-=[]{}|;:,.<>?`), distribuidos mediante aleatoriedad criptográfica (`window.crypto.getRandomValues`) y mezclados con el algoritmo Fisher-Yates.
2. **Sincronización Automática de Campos**: Al pulsar el botón "Generar contraseña", el sistema asigna el valor generado simultáneamente a los campos `Contraseña` y `Confirmar contraseña`, eliminando discrepancias o errores de coincidencia, activa la visibilidad del texto para que el operador pueda inspeccionarlo y copia la contraseña al portapapeles del navegador emitiendo una notificación Toast informativa.
3. **Controles de Inspección**: Se habilitan controles contextuales para alternar la visibilidad de la contraseña ("Ver / Ocultar") y para copiarla al portapapeles en cualquier momento ("Copiar").

### Ejemplo
Al crear un nuevo usuario mediante el botón "Nuevo", el administrador hace clic en "Generar contraseña". El sistema genera instantáneamente una clave de 16 caracteres como `k7$M9!wP#2zL&4qX`, la copia al portapapeles, muestra la notificación correspondiente y puebla automáticamente los campos de contraseña y confirmación sin necesidad de digitación manual.

### Impacto
Afecta a [directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx), [generador-contrasena.ts](../frontend/src/lib/generador-contrasena.ts) y a las suites de pruebas [directory-account-form.test.tsx](../frontend/tests/components/users/directory-account-form.test.tsx) y [generador-contrasena.test.ts](../frontend/tests/lib/generador-contrasena.test.ts).


## Disposición Inferior del Generador de Contraseñas en el Modal de Nueva Cuenta

### Regla
En el formulario del modal de nueva cuenta ([directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx)), la barra de utilidades del generador de contraseñas seguras se posiciona inmediatamente debajo de la cuadrícula de campos de contraseña (`Contraseña` y `Confirmar contraseña`):
- Los campos de entrada de credenciales se presentan de forma limpia y directa al usuario en su cuadrícula de 2 columnas.
- La barra de herramientas ubicada abajo integra la leyenda de asistencia, el botón de acción principal ("Generar contraseña") y los controles secundarios dinámicos ("Ver / Ocultar" y "Copiar") preservando el flujo visual natural de arriba a abajo.

### Ejemplo
Al visualizar el Paso 1 en "Nueva cuenta", el operador observa primero los campos "Nombre completo", "Correo", y a continuación la cuadrícula con "Contraseña" y "Confirmar contraseña". Inmediatamente debajo de ambos campos encuentra el contenedor del generador con el botón "Generar contraseña".

### Impacto
Afecta a [directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx) y a la suite de pruebas [directory-account-form.test.tsx](../frontend/tests/components/users/directory-account-form.test.tsx).


## Optimización Dimensional y Prevención de Desbordamiento en Modales

### Regla
Para garantizar que todos los modales con formularios complejos de 2 pasos ([directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx)) desplieguen su contenido íntegro sin generar barras de desplazamiento vertical internas (scroll) ni ocultar acciones secundarias:
1. **Altura Base de Modal ([components.css](../frontend/src/styles/components.css))**: La clase `.nx-modal-glass` eleva su altura estándar a `640px` (respetando `max-height: 90vh`), proveyendo el espacio vertical necesario para alojar el encabezado, el indicador de pasos (stepper), los campos del formulario con sus reservas de error de layout (`min-h-5`) y las barras de herramientas auxiliares.
2. **Compactación de Contenedores Auxiliares**: La barra de autogeneración de contraseñas adopta una disposición horizontal ultra compacta (`px-3 py-2`), alineando la leyenda y los botones de acción (`Generar`, `Ver / Ocultar`, `Copiar`) en una sola línea fluida sin generar saltos de línea ni forzar scroll.

### Ejemplo
Al abrir el modal "Nueva cuenta", todo el Paso 1 (stepper, nombre completo, correo, contraseña, confirmar contraseña y la barra del generador) se visualiza completo y despejado sobre los botones "Cancelar" y "Siguiente", sin que aparezca ninguna barra de desplazamiento vertical y sin elementos recortados detrás del pie del modal.

### Impacto
Afecta a [components.css](../frontend/src/styles/components.css), [directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx) y a la suite de pruebas [directory-account-form.test.tsx](../frontend/tests/components/users/directory-account-form.test.tsx).


## Asistente de 3 Pasos en la Creación y Edición de Plataformas

## Plataformas

### Regla
El asistente modal de alta y edición de plataformas ([platform-form.tsx](../frontend/src/components/platforms/platform-form.tsx)) adopta un flujo guiado de 3 pasos progresivos:
1. **Paso 1: Descripción**: Recopila los metadatos esenciales de la plataforma: `Nombre` (obligatorio), `Descripción` (obligatoria) y `Enlace directo` (con normalización automática de protocolo `https://`).
2. **Paso 2: Diseño** (Sustituye a "Estilo"):
   - **Personalización de Colores**: Permite seleccionar el `Color de fondo` (`bg_color`) y el `Color del icono` (`text_color`), con soporte de valores por omisión del sistema si no se especifican.
   - **Identidad Visual**: Ofrece un selector interactivo dual entre:
     - **Elegir icono del catálogo**: Cuadrícula accesible de iconos representativos del sistema (`ICONOS_PLATAFORMA`).
     - **Subir imagen / logotipo**: Control de carga de archivos de imagen locales (PNG, JPG, SVG, WebP, máx. 2 MB) con lectura y previsualización instantánea.
3. **Paso 3: Vista previa y activación**:
   - **Vista previa de la plataforma**: Muestra una representación fiel de la tarjeta en vivo con el chip estilizado, icono o imagen subida, nombre, descripción, enlace y badge de estado.
   - **Toggle de activación**: Reemplaza la casilla de verificación tradicional por un control conmutador accesible (`Toggle` / `role="switch"`), permitiendo alternar de forma intuitiva el estado `Activa` / `Inactiva` con retroalimentación visual reactiva inmediata.

### Ejemplo
Al crear una plataforma en el área Finanzas, el operador completa en el Paso 1 el nombre "ERP Central" y la URL. Al avanzar al Paso 2 ("Diseño"), puede seleccionar un color azul distintivo y cargar el archivo `erp-logo.svg` de su equipo o escoger el icono `panel` del catálogo. En el Paso 3 ("Vista previa"), revisa la tarjeta resultante exactamente como la verán los usuarios y conmuta el Toggle a "Activa" antes de pulsar "Guardar".

### Impacto
Afecta a [platform-form.tsx](../frontend/src/components/platforms/platform-form.tsx), [form.tsx](../frontend/src/components/form.tsx), [platform-admin.tsx](../frontend/src/components/platform-admin.tsx) y a la suite de pruebas [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Simetría de Espaciado y Ajuste Natural en Modales

## UI/UX

### Regla
Para garantizar una distribución armónica y simétrica de los elementos dentro de las ventanas modales ([form.tsx](../frontend/src/components/form.tsx), [directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx)):
1. **Ajuste Dinámico de Altura**: La clase `.nx-modal-glass` en [components.css](../frontend/src/styles/components.css) prescinde de una altura rígida forzada (`height: 640px`), adoptando un ajuste de altura natural al contenido con límite superior seguro `max-height: 90vh`.
2. **Equidistancia y Simetría Vertical**: El espaciado inferior entre el último elemento interactivo del formulario (la barra compacta de "Clave segura") y el pie de página (`footer`) coincide exactamente con el espaciado superior entre la cabecera del modal y el primer elemento del formulario ("1. Datos de usuario"), ambos fijados de forma consistente en 24 px (`py-6`).

### Ejemplo
Al abrir el modal "Nueva cuenta", la distancia desde el divisor de la cabecera hasta el stepper ("1. Datos de usuario") es de exactamente 24 px, y la distancia desde la barra de "Clave segura" hasta el divisor del pie del modal es igualmente de 24 px, eliminando zonas muertas y evitando la aparición de barras de desplazamiento vertical innecesarias.

### Impacto
Afecta a [components.css](../frontend/src/styles/components.css), [form.tsx](../frontend/src/components/form.tsx), [directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx) y a la suite de pruebas [directory-account-form.test.tsx](../frontend/tests/components/users/directory-account-form.test.tsx).


## Ocultamiento de Parámetros de Consulta (Clean URLs) en Navegación de Plataformas

## Navegación

### Regla
Para evitar la exposición de parámetros internos en la barra de direcciones del navegador (`/admin/platforms?area=2&area_name=Demo+Finanzas`), la navegación entre la cuadrícula de áreas y el listado de plataformas gestionadas ([platform-admin.tsx](../frontend/src/components/platform-admin.tsx), [ruta-navegacion.tsx](../frontend/src/components/marco/ruta-navegacion.tsx)) implementa URLs limpias (Clean URLs):
1. **Preservación de Estado sin Query String**: Al seleccionar un área, la información de navegación (`areaId`, `areaName`) se almacena en el estado del historial del navegador (`window.history.pushState({ areaId, areaName }, '', window.location.pathname)`) y en almacenamiento de sesión (`sessionStorage`), manteniendo la barra de direcciones permanentemente en `/admin/platforms` sin parámetros después del signo `?`.
2. **Saneamiento Inmediato de URLs Residuales**: Si un usuario o enlace externo accede mediante una URL con parámetros de consulta (`?area=...&area_name=...`), el sistema extrae de forma transparente los identificadores necesarios para cargar el área e inmediatamente limpia la barra de direcciones mediante `window.history.replaceState`.
3. **Migas de Pan y Navegación Histórica**: La ruta de migas de pan (`RutaNavegacion`) y los botones de retroceso/avance del navegador recuperan fluidamente el contexto del área seleccionada mediante los eventos `popstate` y el estado en memoria, sin requerir exponer cadenas de consulta en la URL visible.

### Ejemplo
Cuando un administrador hace clic sobre el área "Demo Finanzas" dentro de `/admin/platforms`, el sistema muestra la tabla y plataformas de "Demo Finanzas", actualiza las migas de pan a `Administración › Plataformas › Demo Finanzas`, y la barra de direcciones del navegador permanece limpia como `https://portal.empresa.local/admin/platforms`, sin mostrar `?area=2&area_name=Demo+Finanzas`.

### Impacto
Afecta a [platform-admin.tsx](../frontend/src/components/platform-admin.tsx), [ruta-navegacion.tsx](../frontend/src/components/marco/ruta-navegacion.tsx) y a la suite de pruebas [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Supresión de Prefijos Numéricos Redundantes en Indicadores de Pasos (Wizards/Steppers)

## UI/UX

### Regla
En todos los componentes de tipo asistente o paso a paso (`steppers` / `wizards`), las etiquetas de texto de cada paso no deben incluir números ni prefijos ordinales manuales (`1.`, `2.`, `3.`):
1. **No Duplicidad con la Insignia Visual**: El número ordinal de cada paso se muestra de forma centralizada y estilizada dentro del círculo/insignia (`badge`) del paso (`[ 1 ]`, `[ 2 ]`, `[ 3 ]`), por lo que anteponerlo en el texto de la etiqueta resulta redundante y satura visualmente la cabecera del formulario.
2. **Claridad y Concisión**: La etiqueta textual debe reflejar única y exclusivamente el título semántico del paso (por ejemplo, `Descripción`, `Diseño`, `Vista previa`, `Datos de usuario`, `Accesos y áreas`), facilitando la lectura accesible y evitando desfases tipográficos o rupturas de línea en dispositivos compactos.

### Ejemplo
En el diálogo modal "Nueva plataforma", la barra de navegación de pasos muestra visualmente los números 1, 2 y 3 en sus respectivos círculos indicadores, mientras que las etiquetas adyacentes muestran limpiamente `Descripción`, `Diseño` y `Vista previa` (en lugar de `1. Descripción`, `2. Diseño` y `3. Vista previa`). Igualmente, en "Nueva cuenta" se presentan como `Datos de usuario` y `Accesos y áreas`.

### Impacto
Afecta a [platform-form.tsx](../frontend/src/components/platforms/platform-form.tsx), [directory-account-form.tsx](../frontend/src/components/users/directory-account-form.tsx), [area-form.tsx](../frontend/src/components/areas/area-form.tsx) y a las suites de pruebas [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx), [directory-account-form.test.tsx](../frontend/tests/components/users/directory-account-form.test.tsx) y [areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx).


## Notificaciones de Error y Validación Mediante Toast en Formularios y Diálogos

## UI/UX

### Regla
1. **Sustitución de Banners Estáticos por Toasts**: Las alertas generales de validación (por ejemplo, "Revisa los campos marcados.") y los errores de operaciones en formularios, diálogos modales y paneles no deben renderizarse como cajas de alerta o banners visuales estáticos (`ErrorNote`) en el flujo del formulario, ya que alteran la geometría del modal y desplazan los campos de entrada. En su lugar, el sistema emite una notificación emergente no intrusiva mediante el servicio centralizado de `useToast`:
   - Errores de validación o datos faltantes: notificación con tono de advertencia (`toast.avisar('warning', ...)`).
   - Errores de API o rechazo de operaciones: notificación con tono de error (`toast.avisar('error', ...)`).
2. **Preservación de Errores de Campo y Accesibilidad**:
   - Cada campo individual que presente error conserva su indicador contextual (`FieldErrorNote`) y su borde visual para retroalimentación puntual.
   - El mensaje general de error se conserva en el DOM de forma accesible para lectores de pantalla mediante una región viva oculta (`<div className="sr-only" role="alert">{error}</div>`), cumpliendo estrictamente con los criterios WCAG 4.1.3 sin generar impacto visual ni scroll innecesario.

### Ejemplo
Al abrir el modal "Nueva plataforma" y presionar "Siguiente" con campos obligatorios vacíos, los campos "Nombre" y "Descripción" se marcan con su mensaje de error respectivo, pero no aparece ninguna caja roja debajo del stepper. En su lugar, se despliega una notificación flotante Toast en la esquina con el mensaje "Revisa los campos marcados." sin alterar el alto ni la posición de los campos del formulario.

### Impacto
Afecta a [platform-form.tsx](../frontend/src/components/platforms/platform-form.tsx), [area-form.tsx](../frontend/src/components/areas/area-form.tsx), [connector-form.tsx](../frontend/src/components/connectors/connector-form.tsx), [request-form-modal.tsx](../frontend/src/components/access/request-form-modal.tsx), [reject-dialog.tsx](../frontend/src/components/access/reject-dialog.tsx), [approve-dialog.tsx](../frontend/src/components/access/approve-dialog.tsx), [revoke-access-dialog.tsx](../frontend/src/components/users/revoke-access-dialog.tsx), [user-form.tsx](../frontend/src/components/users/user-form.tsx), [connector-delete-dialog.tsx](../frontend/src/components/connectors/connector-delete-dialog.tsx), [job-retry-dialog.tsx](../frontend/src/components/connectors/job-retry-dialog.tsx), [admin-role-dialog.tsx](../frontend/src/components/users/admin-role-dialog.tsx), [area-admins-panel.tsx](../frontend/src/components/areas/area-admins-panel.tsx), [purge-panel.tsx](../frontend/src/components/users/purge-panel.tsx), [areas-list.tsx](../frontend/src/components/areas-list.tsx) y [users-list.tsx](../frontend/src/components/users-list.tsx).


## Eliminación en Cascada de Solicitudes y Accesos al Dar de Baja una Plataforma

## Plataformas

### Regla
1. **Borrado en Cascada de Solicitudes y Registros Relacionados**:
   - Al eliminar una plataforma (`DELETE /platforms/<id>`), el sistema elimina de forma atómica e inmediata todas las solicitudes de acceso asociadas a dicha plataforma (`PlatformAccessRequest`), incluyendo especialmente aquellas en estado `pendiente`, aprobadas o rechazadas.
   - De igual forma, se eliminan los accesos asignados (`PlatformAccessGrant`), los conectores configurados (`PlatformConnector`) y las tareas de aprovisionamiento vinculadas (`ProvisioningJob`).
2. **Consistencia de Consultas y Contadores de Bandeja**:
   - Todas las consultas de solicitudes (personales en `consultas_solicitud.mias`, bandejas de aprobación en `approvals.bandeja` y métricas globales del tablero en `dashboard/summary` y `home/summary`) realizan un `INNER JOIN` con la tabla `platforms` (`Platform.id == PlatformAccessRequest.platform_id`).
   - Queda estrictamente impedido que existan solicitudes huérfanas en el sistema o que se contabilicen solicitudes pendientes de plataformas que ya han sido dadas de baja o que no existen.

### Ejemplo
Si un usuario solicita acceso a la plataforma "Finanzas ERP" y la solicitud queda en estado "pendiente", pero posteriormente el administrador elimina la plataforma "Finanzas ERP" desde la gestión de plataformas, la solicitud pendiente se elimina automáticamente de la base de datos. Como consecuencia, el indicador de la campana, el contador de la barra de navegación y la bandeja de aprobaciones reflejan de inmediato 0 solicitudes pendientes.

### Impacto
Afecta a [api.py](../app/modules/platforms/api.py), [consultas.py](../app/modules/access_requests/consultas.py), [consultas.py](../app/modules/access/consultas.py), [routes.py](../app/modules/api/routes.py), [test_baja_plataforma.py](../tests/platforms/test_baja_plataforma.py) y al esquema relacional de [models.py](../app/modules/access_requests/models.py).


## Baja de Plataformas con Accesos (FNC-144)

### Regla
- Una plataforma con accesos vigentes no se elimina: `409 plataforma_con_accesos`. Borrarla dejaría a la gente en los grupos del sistema real sin rastro en el portal.
- Sin accesos vigentes, se eliminan sus solicitudes (también las pendientes), sus accesos revocados y su conector; los trabajos de aprovisionamiento se conservan desligados. La auditoría guarda los conteos.
- Borrado en lote (usuarios, áreas, plataformas): se detiene en el primer error y avisa "Se eliminaron N de M." con el motivo; lo eliminado sale de la selección (FNC-145).

### Impacto
Afecta a [baja.py](../app/modules/platforms/baja.py), [api.py](../app/modules/platforms/api.py), [eliminar-en-lote.ts](../frontend/src/lib/eliminar-en-lote.ts) y a [test_baja_plataforma.py](../tests/platforms/test_baja_plataforma.py).


## Botón de Accesos en Áreas para Asignación de Usuarios

## Áreas

### Regla
1. **Botón de Accesos en la Barra de Herramientas de Áreas**: En la pantalla de consulta y administración de Áreas (`/admin/areas`), la barra de herramientas incorpora un botón de acción estandarizado `ACCESOS` (`Icono nombre="solicitudes"`), disponible para superadministradores y administradores de área que gestionen el área en cuestión (`isAdmin || managedIds.has(area.id)`).
2. **Reglas de Selección y Activación**:
   - **0 áreas seleccionadas**: El botón permanece deshabilitado (`disabled={true}`), con `title="Selecciona 1 área para gestionar accesos"` y `aria-label="Accesos"`.
   - **1 área seleccionada**: Se habilita (`disabled={false}` si se cuenta con permisos sobre dicha área), con `title="Accesos de {nombre_area}"` y `aria-label="Accesos de {nombre_area}"`.
   - **Más de 1 área seleccionada**: Se deshabilita preventivamente (`disabled={true}`), con `title="Solo se pueden gestionar accesos de 1 área a la vez"`.
3. **Panel Modal de Gestión de Usuarios del Área (`AreaUsersPanel`)**:
   - Al pulsar el botón `ACCESOS`, se abre el diálogo modal "Accesos — {nombre_area}" con una lista de selección dual (*Dual Picklist*):
     - **Columna izquierda (Sin acceso)**: Muestra los usuarios del sistema dentro del alcance del administrador que aún no pertenecen al área. Al hacer clic en un usuario, se transfiere a la columna derecha y se anuncia por lector de pantalla (`aria-live="polite"`).
     - **Columna derecha (Con acceso)**: Muestra los usuarios que pertenecen al área. Los usuarios recientemente agregados se marcan con badge `Nuevo`; los existentes se muestran como `Miembro`. Al hacer clic en el botón de retiro, vuelven a la columna izquierda.
   - Ambas columnas cuentan con filtros de búsqueda rápidos e independientes por nombre o correo electrónico.
   - Al presionar **Guardar**, se envía `PUT /api/v1/areas/{id}/users` con los IDs de todos los usuarios asignados al área (`user_ids`), actualizando la relación atómicamente y emitiendo una notificación Toast de confirmación (`useToast`).
   - Al vincular a los usuarios al área, quedan automáticamente habilitados para que se les pueda otorgar accesos en las plataformas pertenecientes a dicha área desde `PlatformAccessPanel`.

### Ejemplo
Un administrador de área necesita dar de alta a un usuario en una plataforma de Finanzas, pero el usuario no aparece en la lista de candidatos de la plataforma porque no pertenece al área "Finanzas". El administrador entra a `/admin/areas`, selecciona la fila de "Finanzas", hace clic en el botón **Accesos**, busca al usuario en la columna "Sin acceso" y hace clic sobre su nombre para moverlo a "Con acceso". Al hacer clic en **Guardar**, el usuario queda formalmente asignado a "Finanzas". Inmediatamente después, al gestionar los accesos de las plataformas de Finanzas, el usuario ya aparece como disponible para otorgarle acceso.

### Impacto
Afecta a [areas-list.tsx](../frontend/src/components/areas-list.tsx), [area-users-panel.tsx](../frontend/src/components/areas/area-users-panel.tsx), [api.py](../app/modules/areas/api.py), [api.ts](../frontend/src/lib/api.ts) y a las pruebas en [areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx).


## Botones de Áreas y Accesos a Plataformas en Usuarios

## Usuarios

### Regla
1. **Doble Botón de Gestión en Barra de Herramientas de Usuarios**: En la pantalla de consulta y administración de Usuarios (`/admin/users`), la barra de herramientas expone acciones de acceso diferenciadas para el usuario seleccionado:
   - **Botón `ÁREAS`** (`Icono nombre="areas"`): Permite gestionar las áreas organizativas a las que pertenece el usuario.
   - **Botón `ACCESOS`** (`Icono nombre="solicitudes"`): Permite gestionar las plataformas a las que tiene acceso el usuario.
2. **Reglas de Selección y Activación**:
   - **0 usuarios seleccionados**: Ambos botones permanecen deshabilitados (`disabled={true}`), indicando en su `title` que se debe seleccionar 1 usuario.
   - **1 usuario seleccionado**: Ambos botones se habilitan automáticamente (`disabled={false}`).
     - Al pulsar `ÁREAS`, se abre el diálogo modal "Accesos — {nombre_usuario}" con la pestaña de **Áreas** activa por defecto.
     - Al pulsar `ACCESOS`, se abre el diálogo modal "Accesos — {nombre_usuario}" con la pestaña de **Plataformas** activa por defecto (o aviso Toast si es superadmin por contar con acceso irrestricto).
   - **Más de 1 usuario seleccionado**: Ambos botones se deshabilitan preventivamente (`disabled={true}`).
3. **Modal Unificado con Pestañas y Dual Picklist (`UserAccessPanel`)**:
   - Dentro del panel modal de accesos, el administrador puede alternar libremente entre las pestañas **Áreas** y **Plataformas** mediante botones de control segmentado con contadores en tiempo real.
   - **Pestaña Áreas**: Dispone de un *Dual Picklist* para transferir áreas entre "Sin acceso" y "Con acceso". Al guardar, envía `PUT /api/v1/users/{id}/areas` con `area_ids`, actualizando de inmediato la pertenencia y habilitando la elegibilidad de plataformas de dichas áreas.
   - **Pestaña Plataformas**: Dispone de un *Dual Picklist* para transferir plataformas entre "Sin acceso" y "Con acceso". Al guardar, invoca el aprovisionamiento o revocación correspondiente (`api.grantPlatformAccess` / `api.revokeAccess`).
   - Ambas pestañas disponen de buscadores independientes, gestión accesible de foco (`useFocoTrasMover`) y notificaciones Toast al completar las modificaciones.

### Ejemplo
Un administrador de TI necesita asignar a un empleado al área "Finanzas" y posteriormente otorgarle acceso al sistema "Contabilidad". En la tabla de usuarios selecciona a dicho empleado y presiona el botón **Áreas**. En el modal que se abre, busca "Finanzas" en la columna de la izquierda y hace clic para transferirla a la derecha, guardando los cambios. Inmediatamente o desde la pestaña contigua **Plataformas**, "Contabilidad" ya aparece como elegible para otorgar el acceso sin necesidad de navegar a otros módulos.

### Impacto
Afecta a [users-list.tsx](../frontend/src/components/users-list.tsx), [user-access-panel.tsx](../frontend/src/components/users/user-access-panel.tsx), [user-access-panel.test.tsx](../frontend/tests/components/users/user-access-panel.test.tsx) y [users-list.test.tsx](../frontend/tests/components/users-list.test.tsx).


## Deshabilitación del Acceso a Plataformas para Usuarios sin Áreas Asignadas

## Usuarios

### Regla
1. **Inhabilitación Estricta de Acceso a Plataformas sin Áreas**: Un usuario que no pertenezca al menos a un área organizativa (`user.areas.length === 0`) no puede tener habilitada la acción de concesión de plataformas:
   - **En la barra de herramientas de Usuarios (`users-list.tsx`)**: El botón `ACCESOS` permanece deshabilitado (`disabled={true}`) para usuarios sin áreas asignadas, mostrando el tooltip y título explicativo: `"El usuario no tiene áreas asignadas. Asigna al menos 1 área primero"`. El botón `ÁREAS` permanece habilitado para permitirle al administrador otorgar las áreas requeridas.
   - **En el panel modal de accesos (`user-access-panel.tsx`)**: La pestaña de `Plataformas` permanece inhabilitada (`disabled={true}`) mientras el usuario no cuente con áreas asignadas (`areasConAcceso.length === 0`), con tooltip explicativo. Si por alguna vía se visualiza la sección de plataformas, se despliega una nota de estado indicando: `"El usuario no tiene áreas asignadas. Ve a la pestaña de Áreas y asigna al menos una para poder otorgarle acceso a plataformas."`, impidiendo el envío de concesiones inválidas.
2. **Coherencia con las Reglas de Negocio del Backend**: Esta restricción previene solicitudes y concesiones destinadas a fallar, dado que el backend (`rules.validar_otorgamiento`) exige estrictamente que la plataforma pertenezca a un área donde el usuario esté registrado (`plataforma.area_id in usuario.areas`).

### Ejemplo
Un administrador registra a un nuevo usuario pero aún no le asigna ningún área. Al seleccionarlo en la tabla de usuarios, observa que el botón **Accesos** se encuentra en gris deshabilitado y con el mensaje "El usuario no tiene áreas asignadas. Asigna al menos 1 área primero", mientras que el botón **Áreas** está activo. El administrador pulsa **Áreas**, le asigna el área "Sistemas" y guarda. Inmediatamente el botón **Accesos** se ilumina y se activa, permitiendo ahora otorgarle las plataformas correspondientes a Sistemas.

### Impacto
Afecta a [users-list.tsx](../frontend/src/components/users-list.tsx), [user-access-panel.tsx](../frontend/src/components/users/user-access-panel.tsx) y [users-list.test.tsx](../frontend/tests/components/users-list.test.tsx).


## Sección de Importación Masiva (Bulk Import) en Ajustes

## Configuración y Ajustes

### Regla
1. **Acceso Exclusivo de Superadministrador**: La sección de **Importación masiva** se integra como una pestaña dedicada dentro del módulo de **Ajustes** (`/settings`, pestaña `bulk-import`), visible y ejecutable única y exclusivamente por usuarios con rol `administrador`. Los usuarios sin permisos de superadministración no visualizan la pestaña ni pueden invocar sus endpoints.
2. **Entidades Soportadas y Plantillas**:
   - Soporta la importación masiva de **Usuarios y Cuentas** (`users`), **Áreas** (`areas`) y **Plataformas** (`platforms`).
   - Provee descarga de plantillas oficiales en formato CSV con cabeceras y ejemplos preconfigurados (`GET /api/v1/import/template/{entity}`).
3. **Flujo de Carga, Parseo y Previsualización**:
   - Permite la entrada de datos vía archivo (`.csv`, `.txt`, `.json`) o mediante texto pegado directamente.
   - Analiza y previsualiza los registros utilizando `DataTable`, asignando dinámicamente un distintivo de validación fila por fila:
     - **Válido**: Datos completos y sintácticamente correctos.
     - **Error**: Detalle explícito de la discrepancia (ej. correo inválido, campos obligatorios vacíos, área inexistente).
   - Muestra métricas consolidadas en tiempo real: Total de filas, Filas válidas y Filas con error.
4. **Seguridad y Restricciones de Carga**:
   - **Prohibición de Escalación de Privilegios**: Ningún registro en la importación masiva puede crearse con rol `administrador`. Las solicitudes de cuentas de superadministrador son rechazadas con error de seguridad. Solo se permite el aprovisionamiento de roles `usuario` y `admin_area`.
   - **Saneamiento Automático**: Todos los nombres de usuario, áreas y plataformas son procesados mediante `sanitize_display_name` para evitar caracteres de control o inyecciones XSS.
   - **Auditoría Transaccional**: Toda ejecución de importación masiva queda registrada en el módulo de auditoría del sistema con el detalle del número de altas efectuadas.

### Ejemplo
Un superadministrador desea incorporar 25 nuevos empleados al portal. Se dirige a **Ajustes**, hace clic en la pestaña **Importación masiva**, selecciona la entidad **Usuarios y Cuentas** y descarga la plantilla CSV. Rellena las filas con los nombres, correos y áreas correspondientes y arrastra el archivo al panel. La interfaz previsualiza los 25 registros en una tabla accesible, indicando que 24 son válidos y 1 tiene un correo mal formateado. El administrador presiona "Importar 24 registros válidos", el sistema procesa el lote en el backend, registra el evento en auditoría y muestra una confirmación Toast de éxito.

### Impacto
Afecta a [bulk_import_api.py](../app/modules/bulk_import/api.py), [services.py](../app/modules/bulk_import/services.py), [bulk-import-tab.tsx](../frontend/src/components/settings/bulk-import-tab.tsx), [settings-panel.tsx](../frontend/src/components/settings-panel.tsx), [settings-tabs.ts](../frontend/src/components/settings/settings-tabs.ts), [api.ts](../frontend/src/lib/api.ts) y [test_bulk_import.py](../tests/test_bulk_import.py).


## Asignación Múltiple de Áreas y Accesos a Plataformas en Usuarios

## Usuarios

### Regla
1. **Soporte de Selección Múltiple para Áreas y Accesos**:
   - En la lista de usuarios (`UsersList`), tanto el botón `ÁREAS` como el botón `ACCESOS` permiten ser accionados cuando hay 1 o más usuarios seleccionados (`activeSelectedIds.size >= 1`).
   - El botón `ÁREAS` permanece habilitado siempre que haya al menos 1 usuario seleccionado, permitiendo asignar o desasignar áreas organizativas en lote a todos los usuarios seleccionados simultáneamente.
   - El botón `ACCESOS` está habilitado si hay al menos 1 usuario seleccionado **y ninguno** de los usuarios seleccionados carece de áreas asignadas (`algunoSinAreas === false`). Si uno o más usuarios seleccionados no tienen áreas asignadas, el botón se deshabilita con el mensaje: `"Uno o más usuarios seleccionados no tienen áreas asignadas. Asigna al menos 1 área primero"`.
2. **Modal Multi-Usuario (`UserAccessPanel`)**:
   - El modal adapta su título e indicadores: exhibe `"Accesos — {N} usuarios seleccionados"` y un bloque contextual que desglosa la selección múltiple.
   - En la pestaña **Áreas**, la asignación o desvinculación se aplica a cada uno de los usuarios seleccionados mediante peticiones concurrentes a `PUT /api/v1/users/{id}/areas`.
   - En la pestaña **Plataformas**, otorgar o revocar plataformas aplica la acción (`api.grantPlatformAccess` / `api.revokeAccess`) a través de todos los usuarios seleccionados, excluyendo automáticamente a los superadministradores que ya cuentan con acceso universal.
   - Todas las operaciones multi-usuario informan el resultado a través de notificaciones Toast unificadas.

### Ejemplo
Un administrador selecciona 5 usuarios pertenecientes al departamento de Finanzas. Con los 5 seleccionados, presiona el botón **Accesos**. El modal de accesos se abre indicando "Accesos — 5 usuarios seleccionados". El administrador busca la plataforma "SAP Concur" en la columna de sin acceso, la transfiere a con acceso y presiona "Guardar". El sistema otorga el acceso a SAP Concur a los 5 usuarios de forma concurrente y notifica mediante un Toast: "Accesos actualizados para 5 usuarios".

### Impacto
Afecta a [users-list.tsx](../frontend/src/components/users-list.tsx), [user-access-panel.tsx](../frontend/src/components/users/user-access-panel.tsx), [user-access-panel.test.tsx](../frontend/tests/components/users/user-access-panel.test.tsx) y [users-list.test.tsx](../frontend/tests/components/users-list.test.tsx).

## Contraseña inicial de onboarding entregada por Send (FNC-138, ADR-008)

### Regla
El portal fija **solo la contraseña inicial** de una cuenta del directorio (alta y «Reenviar credenciales»); el resto del ciclo de la contraseña sigue en Authelia. La contraseña cumple la política vigente (`PASSWORD_POLICY_*`, siempre validada en el backend), se escribe en OpenLDAP con Password Modify y se entrega por un Send de Vaultwarden (usuario, contraseña y URL del portal) con **solo el enlace** por correo. Nunca se guarda en la BD, la auditoría ni los logs, ni se manda en claro. Si Vaultwarden, el correo o las notificaciones fallan, la cuenta se crea igual con `credentials_status: pendientes` y el worker reintenta con una **contraseña nueva** en cada intento (`PROVISIONING_MAX_ATTEMPTS`); agotados los intentos se avisa a los superadmins y solo «Reenviar» (superadmin) los reabre. Si la `ppolicy` del directorio rechaza la contraseña, el alta responde `422` en `fields.password` y no se crea nada.

### Ejemplo
Alta de `ana.ruiz` con Vaultwarden caído: la cuenta y su entrada se crean, el estado es `pendientes`; al volver el servicio, el worker genera otra contraseña, la escribe en LDAP, crea el Send y manda el enlace.

### Impacto
`POST /users/directory`, `GET /users/password-policy`, `POST /users/<id>/credentials`, `credentials_status` en `ManagedUser`, tabla `credential_deliveries` (migración 0015), worker, plantillas `credenciales_iniciales` y `credenciales_no_entregadas`, modal de alta.

## Orden de Acciones en la Barra de Herramientas de Usuarios

## Usuarios

### Regla
En la barra de herramientas superior de la vista de Usuarios (`/admin/users`), los botones de gestión de accesos y estructura organizativa se ordenan de izquierda a derecha de la siguiente forma:
1. `ACCESOS` (`Icono nombre="solicitudes"`): Gestión y consulta de plataformas a las que tiene acceso el usuario o los usuarios seleccionados.
2. `ÁREAS` (`Icono nombre="areas"`): Asignación y desvinculación de áreas organizativas del usuario o los usuarios seleccionados.
3. `Editar` (`Icono nombre="editar"`): Edición del perfil de usuario seleccionado.
4. `Eliminar` (`Icono nombre="eliminar"`): Baja individual o masiva de usuarios seleccionados.
5. `Nuevo` (`Icono nombre="mas"`): Alta de nueva cuenta en el directorio.

### Ejemplo
Al acceder a `/admin/users`, un administrador observa en la barra de acciones superior a la derecha el botón "Accesos" en primer lugar, seguido inmediatamente por el botón "Áreas", ubicando en primer plano la consulta directa de permisos a plataformas.

### Impacto
Afecta a [users-list.tsx](../frontend/src/components/users-list.tsx) y [users-list.test.tsx](../frontend/tests/components/users-list.test.tsx).


## Columna de Administradores y Orden de Acciones en la Tabla de Áreas

## Áreas

### Regla
1. **Columna Admin en la Tabla de Áreas**:
   - En la vista principal de Áreas (`/admin/areas`), la tabla `AreasList` incorpora la columna dedicada `Admin`, situada entre `Descripción` y `Plataformas`.
   - Muestra el nombre de las cuentas con rol `admin_area` que administran dicha área (`area.admins` / `area.admin_names`). Si no cuenta con administradores delegados, despliega el texto `"Sin asignar"` en cursiva.
   - El backend serializa los administradores activos de cada área en `GET /api/v1/areas` (`admins` y `admin_names`).
2. **Orden de Acciones en la Barra de Herramientas de Áreas**:
   - En la barra de herramientas de `/admin/areas`, las acciones de fila seleccionada se ordenan de izquierda a derecha de la siguiente manera:
     1. `ACCESOS` (`Icono nombre="solicitudes"`): Gestión de usuarios asignados al área.
     2. `ADMINS` (`Icono nombre="usuarios"`): Asignación y desvinculación de administradores delegados del área (visible solo para superadmin).
     3. `Editar` (`Icono nombre="editar"`): Modificación de datos y estilo del área.
     4. `Eliminar` (`Icono nombre="eliminar"`): Baja del área (restringida si tiene plataformas o usuarios).
     5. `Nuevo` (`Icono nombre="mas"`): Creación de nueva área.

### Ejemplo
Al ingresar al catálogo de áreas en `/admin/areas`, un superadmin observa en la tabla la columna "Admin" con el nombre del administrador responsable de cada área (ej. "Admin de Área Demo"). En la barra de herramientas superior, el botón "Accesos" precede al botón "Admins", unificando el criterio de orden con la pantalla de Usuarios donde las acciones operativas de accesos se ubican en primer término.

### Impacto
Afecta a [routes.py](../app/modules/api/routes.py), [types.ts](../frontend/src/lib/types.ts), [areas-list.tsx](../frontend/src/components/areas-list.tsx) y [areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx).


## Paso de Accesos con Dual Picklist y Asignación de Administradores en Nueva Área

## Áreas

### Regla
1. **Flujo de 3 Pasos en el Asistente de Áreas (`AreaForm`)**:
   - El formulario modal de creación y edición de áreas (`AreaForm`) pasa a contar con 3 pasos secuenciales y accesibles:
     1. **Paso 1: Descripción**: Captura del Nombre (obligatorio) y la Descripción del área.
     2. **Paso 2: Estilo**: Selección de color visual, icono representativo, vista previa interactiva y estado (Activa / Inactiva).
     3. **Paso 3: Accesos**: Asignación rápida de usuarios y administradores delegados del área mediante un *Dual Picklist*.
   - La barra de navegación superior (`nav[aria-label="Progreso del formulario"]`) refleja los 3 pasos (`1. Descripción`, `2. Estilo`, `3. Accesos`), permitiendo navegación directa entre pasos validados y marcando con un cotejo (`✓`) los pasos completados.
2. **Dual Picklist en el Paso 3 (Accesos)**:
   - **Columna Izquierda ("Sin acceso")**: Despliega la lista de usuarios del sistema que aún no pertenecen al área. Incluye buscador en tiempo real, contador de usuarios y acción rápida para "Agregar todos" los filtrados. La pulsación de un usuario o su control `+` lo transfiere inmediatamente a la columna derecha.
   - **Columna Derecha ("Con acceso")**: Despliega los usuarios incorporados al área. Incluye buscador, contador de miembros y acción para "Quitar todos".
3. **Casilla de Administrador (`Admin`) por Usuario**:
   - Cada usuario dentro de la columna "Con acceso" dispone de una casilla de verificación accesible (`Checkbox` con etiqueta `Admin` y área táctil $\ge 48\text{ px}$).
   - Al marcar la casilla, el usuario es designado como administrador del área.
   - Al guardar (`save`):
     - El área se crea o actualiza (`api.createArea` / `api.updateArea`).
     - Se asignan los miembros seleccionados al área mediante `api.setAreaUsers(areaId, userIds)`.
     - Para los usuarios marcados como `Admin`: si no cuentan con rol `admin_area`, se les promueve (`api.updateUser(userId, { role: 'admin_area' })`) y se añade la nueva área a su lista de áreas administradas mediante `usersApi.setManagedAreas(userId, [...areasActuales, areaId])`.
     - Al retirar a un usuario del área o desmarcar su casilla de administrador, se retira el área de sus áreas administradas.
4. **Guardado Flexible y Accesibilidad**:
   - En el Paso 2 se mantiene disponible el botón "Guardar" para permitir guardar el área de forma directa sin requerir avanzar obligatoriamente al Paso 3 si no se desean agregar usuarios en ese momento.
   - Todos los controles interactivos respetan el área táctil mínima de 48 px (`min-h-12`, `min-w-12`), los tokens de diseño y anuncios para lectores de pantalla (`RegionDeAnuncios`).

### Ejemplo
Un superadministrador pulsa "Nueva área". En el Paso 1 escribe "Logística" y presiona "Siguiente". En el Paso 2 selecciona el color y el icono del área y presiona "Siguiente: Accesos". En el Paso 3 busca a "Carlos" en la columna de la izquierda y hace clic sobre él, trasladándolo a la columna "Con acceso". En la fila de Carlos marca la casilla "Admin". Al presionar "Crear área", el sistema crea el área "Logística", asocia a Carlos como miembro del área y le otorga el rol y administración de "Logística", todo en una sola operación ágil y sin pasos manuales posteriores.

### Impacto
Afecta a [area-form.tsx](../frontend/src/components/areas/area-form.tsx) y [areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx).


## Definición y Aislamiento de Permisos por Rol: Superadmin, Admin de Área y Usuario

## Autorización y Permisos

### Regla
1. **Superadministrador (`superadmin` / `administrador`)**:
   - Acceso irrestricto y completo a todas las secciones, módulos y funcionalidades del sistema (Dashboard, Plataformas, Administrar plataformas, Conectores, Áreas, Usuarios, Auditoría, Ajustes y Ejecuciones).
   - Es el único rol con facultades para crear nuevas áreas en el sistema (`POST /api/v1/areas`) y para designar o revocar administradores de área (`role: 'admin_area'` y asignación en `managed_areas`).
   - Puede dar de alta, editar y desvincular plataformas y usuarios en cualquier área registrada.

2. **Administrador de Área (`admin` / `admin_area`)**:
   - Ámbito operativo delimitado exclusivamente a las áreas que tiene asignadas como administrador (`session.managed_areas` / `current_user.managed_areas`).
   - En la administración de plataformas (`/admin/platforms`), únicamente puede consultar, listar y gestionar las plataformas pertenecientes a las áreas donde es administrador.
   - Puede dar de alta nuevas plataformas únicamente dentro de sus áreas administradas.
   - Puede dar de alta nuevas cuentas de usuario en el directorio y asociarlas a sus áreas, asignándoles el rol estándar de usuario (`role: 'usuario'`).
   - **Prohibiciones estrictas**: No puede dar de alta usuarios con privilegios de administrador (`admin_area` ni `administrador`) ni crear nuevas áreas. En la interfaz, el botón "Nueva área" permanece oculto para este rol, y en los asistentes de área las opciones y casillas para designar administradores quedan deshabilitadas con indicador de solo lectura y mensaje accesible.

3. **Usuario Estándar (`usuario`)**:
   - Acceso exclusivo al portal y catálogo de solicitud de plataformas (`/platforms` con `PlatformsView` y `RequestCatalog`).
   - No tiene acceso a pantallas de gestión ni de configuración global (Dashboard, Gestión de plataformas, Áreas, Usuarios, Conectores, Ajustes, Ejecuciones ni Auditoría).
   - En el menú principal (`entradasVisibles`), tanto en la barra lateral como en el menú móvil, solo se despliega la opción "Plataformas" (`/platforms`).
   - Si un usuario estándar ingresa a la raíz del portal (`/`), la compuerta de navegación (`DashboardGate`) lo redirige automáticamente a `/platforms`.
   - Se incorpora un acceso directo interactivo con área táctil accesible ($\ge 48\text{ px}$) en la barra superior (`BarraSuperior` en el adminboard), situado a un costado del interruptor de tema claro/oscuro, garantizando el acceso inmediato al catálogo de solicitudes.

### Ejemplo
- Un usuario con rol `usuario` inicia sesión: la barra lateral muestra únicamente la entrada "Plataformas", la barra superior incluye el botón con icono de plataformas junto al selector de tema, y al intentar acceder al Dashboard es redirigido a `/platforms`, donde puede visualizar el catálogo de plataformas de sus áreas y solicitar permisos.
- Un usuario con rol `admin_area` para el área de "Finanzas": ingresa al portal y en la lista de áreas observa únicamente "Finanzas"; el botón "Nueva área" no se muestra. Al crear o consultar plataformas en `/admin/platforms`, solo visualiza y puede asociar plataformas al área de "Finanzas". En la pantalla de usuarios, puede dar de alta nuevos usuarios pero no puede conferirles rol de administrador.
- Un `superadmin`: visualiza la totalidad de áreas y plataformas, puede pulsar "Nueva área", asignar administradores de área en el paso 3 de accesos y realizar cualquier cambio administrativo global.

### Impacto
Afecta a [nav-items.ts](../frontend/src/components/marco/nav-items.ts), [barra-superior.tsx](../frontend/src/components/marco/barra-superior.tsx), [dashboard-gate.tsx](../frontend/src/components/dashboard-gate.tsx), [page.tsx](../frontend/src/app/page.tsx), [platform-admin.tsx](../frontend/src/components/platform-admin.tsx), [areas-list.tsx](../frontend/src/components/areas-list.tsx), [area-form.tsx](../frontend/src/components/areas/area-form.tsx), [users-list.tsx](../frontend/src/components/users-list.tsx), [settings/page.tsx](../frontend/src/app/settings/page.tsx), [audit/page.tsx](../frontend/src/app/audit/page.tsx), [marco-nav.test.ts](../frontend/tests/lib/marco-nav.test.ts), [navegacion-por-rol.test.tsx](../frontend/tests/components/navegacion-por-rol.test.tsx), [menu-movil.test.tsx](../frontend/tests/components/menu-movil.test.tsx), [areas-list.test.tsx](../frontend/tests/components/areas-list.test.tsx), [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx) y [marco-admin.test.tsx](../frontend/tests/components/marco-admin.test.tsx).


## Reestructuración del Asistente de Plataformas: Vista Previa en Paso 2 y Dual Picklist de Accesos en Paso 3

## Administración de Plataformas

### Regla
1. **Flujo de 3 Pasos Reorganizado**:
   - **Paso 1: Descripción**: Nombre (`name`), Descripción (`description`), Enlace directo (`direct_link`).
   - **Paso 2: Diseño y Activación**: Identidad visual (colores de fondo y texto, selector de icono o subida de imagen), **Vista previa en tiempo real de la plataforma** y el **Interruptor (Toggle) de Estado Activo/Inactivo**. Al consolidar aquí la vista previa y la activación, el administrador valida visualmente la tarjeta de la plataforma y su disponibilidad inmediatamente tras configurar su apariencia.
   - **Paso 3: Accesos**: Se renombra formalmente de "Vista previa" a "Accesos". Integra un componente **Dual Picklist** accesible de dos columnas:
     - **Columna Izquierda ("Sin acceso")**: Muestra a los usuarios pertenecientes al área de la plataforma (`form.area_id`) que actualmente no disponen de acceso a la misma. Incluye buscador reactivo, contador y acción rápida "Agregar todos".
     - **Columna Derecha ("Con acceso")**: Muestra a los usuarios autorizados para acceder a la plataforma. Incluye buscador reactivo, contador y acción rápida "Quitar todos".
2. **Transferencia e Interacción**:
   - Transferencia ágil con un solo clic: al pulsar sobre un usuario en "Sin acceso", este se transfiere a "Con acceso" con la insignia `Nuevo`. Al pulsar en "Con acceso", se transfiere de regreso a "Sin acceso".
3. **Persistencia Directa de Accesos al Guardar**:
   - Al pulsar "Guardar", se crea o actualiza la plataforma (`api.createPlatform` o `api.updatePlatform`).
   - Para los usuarios añadidos a "Con acceso", el sistema invoca de inmediato `api.grantPlatformAccess(platformId, userId, 'usuario')`.
   - Para los usuarios retirados en edición, se invoca `api.revokeAccess(accessId, 'Retirado por administrador')`.
4. **Accesibilidad y Sistema 8pt**:
   - Modal ampliado a `size="2xl"` para máxima legibilidad de la doble columna.
   - Área táctil $\ge 48\text{ px}$ (`min-h-12`) en todos los botones de transferencia y acciones en lote.
   - Foco preservado tras mover (`useFocoTrasMover`) y anuncios audibles con `RegionDeAnuncios`.

### Ejemplo
Al crear una plataforma para el área "Finanzas", en el Paso 2 el administrador elige el color azul, el icono de catálogo y ve en tiempo real la tarjeta generada junto con el interruptor "Activa". Al presionar "Siguiente", llega al Paso 3 "Accesos", donde visualiza a los usuarios de "Finanzas". Hace clic sobre "Carlos" y "Lucía" para otorgarles acceso directo a la plataforma, o pulsa "Agregar todos". Al presionar "Guardar", la plataforma se crea y ambos usuarios reciben de inmediato sus accesos sin necesidad de gestionar permisos por separado.

### Impacto
Afecta a [platform-form.tsx](../frontend/src/components/platforms/platform-form.tsx) y [platform-admin.test.tsx](../frontend/tests/components/platform-admin.test.tsx).


## Bloqueo Obligatorio por Carta Responsiva de TI en Primer Ingreso

## Autenticación y Cumplimiento

### Regla
1. **Gatekeeper de Primer Ingreso (Consent Gate)**:
   - Todo usuario que cuente con `responsiva_firmada = False` en su cuenta queda confinado de forma estricta e infranqueable a la pantalla de **Carta Responsiva de Uso de Activos de Información y Plataformas Institucionales** (`PantallaResponsiva` en `AppShell`).
   - El sistema oculta por completo el marco de administración (`Marco`), la barra lateral, la barra superior, el menú móvil y cualquier contenido o plataforma pre-asignada.
   - Cualquier intento de navegación directa por URL (por ejemplo hacia `/`, `/platforms`, `/admin/platforms` o `/settings`) es interceptado por `AppShell`, manteniendo al usuario bloqueado en la vista de responsiva.
2. **Defensa en Profundidad en Backend**:
   - En la API Flask (`api_bp.before_request`), cualquier solicitud autenticada de un usuario con responsiva pendiente (distinto de `administrador`) es rechazada con código HTTP `403 Forbidden` (`code: 'responsiva_requerida'`), exceptuando exclusivamente `GET /api/v1/me` (consulta de sesión), `GET /api/v1/responsiva` (lectura de términos y plataformas) y `POST /api/v1/me/firmar-responsiva` (registro de firma).
   - El rol `administrador` (superadmin) queda exento del bloqueo por facultad operativa de gobernanza global.
3. **Firma y Desbloqueo Atómico**:
   - El usuario visualiza la lista de áreas y plataformas asignadas sobre las que asume responsabilidad.
   - Debe marcar la casilla de verificación obligatoria para habilitar el botón de firma.
   - Al pulsar "Firmar y acceder al portal", se ejecuta `POST /api/v1/me/firmar-responsiva`:
     - Se registra `responsiva_firmada = True` y `responsiva_firmada_at` con fecha y hora UTC.
     - Se emite un evento en la bitácora de auditoría (`audit_log`) con acción `firma_responsiva`, IP de origen y versión del documento.
     - El frontend actualiza de forma reactiva el estado de la sesión, desmontando la pantalla de bloqueo y permitiendo el acceso normal al portal.
4. **Relación con el SSO de Authelia**:
   - Authelia funge como proveedor de identidad exterior (valida usuario y contraseña contra LDAP).
   - Al validar las credenciales, Authelia redirige al usuario al portal.
   - Es el portal (Next.js + Flask) el que inspecciona el estado de la responsiva tras la autenticación y ejecuta el confinamiento antes de permitir el acceso a cualquier recurso.

### Ejemplo
Un administrador de área da de alta a "Pedro" y le asigna el área de "Operaciones" y la plataforma "Jira". Cuando Pedro inicia sesión por primera vez a través de Authelia, Authelia valida su cuenta y lo envía a la URL del portal. En ese instante, `AppShell` detecta que Pedro tiene `responsiva_firmada: false`. En lugar de mostrarle el catálogo o menú, le presenta en pantalla completa la Carta Responsiva indicando: "Hola, Pedro. Se te han asignado los siguientes activos: Área Operaciones, Plataforma Jira Software". Pedro no puede saltarse la pantalla ni navegar a otra sección. Lee los términos, marca la casilla "He leído y acepto los términos..." y presiona "Firmar y acceder al portal". El sistema registra la firma en auditoría y en ese momento se desbloquea el portal, dándole la bienvenida a su espacio de trabajo. En logins posteriores, el portal lo lleva directamente a sus plataformas sin volver a solicitarle la firma.

### Impacto
Afecta a [pantalla-responsiva.tsx](../frontend/src/components/responsiva/pantalla-responsiva.tsx), [app-shell.tsx](../frontend/src/components/app-shell.tsx), [session-provider.tsx](../frontend/src/components/session-provider.tsx), [routes.py](../app/modules/api/routes.py), [models.py](../app/modules/auth/models.py), [types.ts](../frontend/src/lib/types.ts), [api.ts](../frontend/src/lib/api.ts), [0014_responsiva_de_usuario.py](../migrations/versions/0014_responsiva_de_usuario.py) y las suites de pruebas [responsiva.test.tsx](../frontend/tests/components/responsiva.test.tsx) y [test_responsiva.py](../tests/test_responsiva.py).
