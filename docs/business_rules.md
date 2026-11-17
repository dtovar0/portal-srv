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
Afecta a [frontend/src/components/platform-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platform-admin.tsx) y a la suite de pruebas en [frontend/tests/components/platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx).


## Botones de Barra de Herramientas en Plataformas

### Regla
Los botones de acción en la barra de herramientas de la vista de plataformas siguen estrictamente la nomenclatura, diseño y orden estándar del sistema: `ADMINS` (icono usuarios), `EDITAR` (icono editar), `ELIMINAR` (icono eliminar, en variante neutra `fila` para simetría visual con los demás botones de acción secundaria), seguidos del separador vertical `|` y el botón primario `+ NUEVO` (icono más, variante `fila-primario`).

### Ejemplo
En la vista de plataformas del área seleccionada, el bloque de botones a la derecha muestra en orden y con tipografía en mayúsculas: `ADMINS`, `EDITAR`, `ELIMINAR`, la línea divisoria vertical y `+ NUEVO`.

### Impacto
Afecta a [frontend/src/components/platform-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platform-admin.tsx) y pruebas en [frontend/tests/components/platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx).


## Formulario Asistido de Creación y Edición de Áreas

### Regla
El modal de creación y edición de áreas (`AreaForm`) opera como un asistente estructurado de 2 pasos secuenciales:
- **Paso 1 (Descripción)**: Captura y valida el nombre obligatorio del área y su descripción funcional. Contiene las acciones de pie "Cancelar" y "Siguiente".
- **Paso 2 (Estilo visual)**: Permite configurar el color del área mediante selector, ofrece una vista previa interactiva en tiempo real (mostrando el chip con las iniciales teñidas dinámicamente, nombre, descripción y badge de estado) y el control de activación ("Activa"). Contiene las acciones de pie "Atrás" y "Guardar".

### Ejemplo
Al hacer click en "Nuevo" o "Editar área", el modal inicia en el paso 1 "Descripción". El usuario ingresa el nombre "Marketing" y descripción; al pulsar "Siguiente", avanza al paso 2 "Estilo visual" donde visualiza en vivo la tarjeta previa con el chip "MA" y puede ajustar el color o estado antes de presionar "Guardar".

### Impacto
Afecta a [frontend/src/components/areas/area-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas/area-form.tsx), [frontend/src/components/areas-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas-list.tsx) y pruebas en [frontend/tests/components/areas-list.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/areas-list.test.tsx).


## Estandarización de Radio de Borde en Modales y Botones

### Regla
Para garantizar consistencia visual y armonía en la jerarquía geométrica del sistema:
1. **Modales y Diálogos**: El panel contenedor de los modales (`Modal`) y diálogos de alerta (`AlertDialog`) adopta un radio de borde idéntico al de los contenedores estándar del sistema (`rounded-xl` / 12px / 0.75rem), eliminando el exceso de curvatura (`rounded-3xl` / 24px).
2. **Botones de Modales y Sistema**: Los botones de acción (`Button`, `.nexus-btn`) estandarizan su radio de borde en base al design token de radio de control `var(--radius-base, 8px)` (8px), evitando apariencias de cápsula o redondeo excesivo (`border-radius: 1rem` / 16px) y alineándose con los botones de fila, tarjetas y barras de herramientas.
3. **Contenedores Internos**: Componentes internos a los modales (steppers, indicadores de progreso, cajas de aviso) limitan su radio a `rounded-xl` o `rounded-lg` para respetar la jerarquía contenida respecto al panel principal.

### Ejemplo
Al abrir el modal de "Nueva área" o un diálogo de confirmación, la ventana modal presenta esquinas con radio uniforme de 12px (`rounded-xl`), igual al de las tarjetas del catálogo. Los botones inferiores "Cancelar", "Atrás", "Siguiente" o "Guardar" lucen esquinas de 8px (`var(--radius-base)`), consistentes y simétricas, sin deformación tipo píldora.

### Impacto
Afecta a [frontend/src/components/form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/form.tsx), [frontend/src/components/alert-dialog.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/alert-dialog.tsx), [frontend/src/styles/components.css](file:///home/dtovar/bayblade/pokemon/frontend/src/styles/components.css), [frontend/src/components/areas/area-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas/area-form.tsx) y [frontend/src/components/users/directory-account-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users/directory-account-form.tsx).


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
Afecta a [frontend/src/components/platforms/platform-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-form.tsx), [frontend/src/components/areas/area-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas/area-form.tsx), [frontend/tests/components/platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx) y [frontend/tests/components/areas-list.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/areas-list.test.tsx).


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
Afecta a [platform-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-form.tsx), [platform-payload.ts](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-payload.ts) y [platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx).


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
Afecta a [platform-columns.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-columns.tsx), [platform-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platform-admin.tsx) y la suite de pruebas [platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx).


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
Afecta a [platform-payload.ts](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-payload.ts), [platform-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-form.tsx) y pruebas en [platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx).


## Reglas de Activación y Desactivación de Botones en la Tabla de Plataformas

### Regla
1. **Regla de Selección Estricta en Toolbar**: En la vista de tabla de plataformas de un área (`/admin/platforms`), los botones de acción situados en la barra de herramientas a la izquierda del separador vertical (`ADMINS`, `EDITAR`, `ELIMINAR`) deben obedecer de forma uniforme las mismas reglas de activación y desactivación vigentes en los módulos de Usuarios (`users-list.tsx`) y Áreas (`areas-list.tsx`):
   - **0 filas seleccionadas**: Los botones `ADMINS`, `EDITAR` y `ELIMINAR` permanecen inactivos/deshabilitados (`disabled={true}`, con clases visuales de estado deshabilitado en gris tenue). Sus tooltips y atributos `title` indican claramente al usuario la acción requerida: `"Selecciona 1 plataforma para ver administradores"`, `"Selecciona 1 plataforma para editar"` y `"Selecciona 1 plataforma para eliminar"`.
   - **1 fila seleccionada**: Los botones se habilitan automáticamente (`disabled={false}`). `EDITAR` y `ELIMINAR` operan sobre la plataforma seleccionada (con `aria-label` y `title` contextuales: `"Editar {nombre}"`, `"Eliminar {nombre}"`). `ADMINS` permite abrir el panel de administradores del área activa. `ELIMINAR` utiliza la variante visual destructiva estándar `variant="fila-peligro"`.
   - **Más de 1 fila seleccionada**: Los botones se deshabilitan preventivamente (`disabled={true}`), mostrando en su `title` el mensaje explicativo: `"Solo se puede editar 1 plataforma a la vez"` y `"Solo se puede eliminar 1 plataforma a la vez"`, junto al badge que indica el número total de plataformas seleccionadas.
2. **Consistencia Visual con el Botón Nuevo**: El botón `+ NUEVO` permanece ubicado a la derecha del separador vertical `|` como acción de creación primaria independiente de la selección (`variant="fila-primario"`), siempre disponible salvo durante la carga inicial o si no existen áreas disponibles.

### Ejemplo
Al acceder a "Demo Finanzas" con 0 plataformas marcadas, los botones `ADMINS`, `EDITAR` y `ELIMINAR` se muestran en gris tenue y no permiten clic (deshabilitados), mientras que `+ NUEVO` permanece activo en azul primario. Al marcar la casilla de la plataforma "Contabilidad", los tres botones se iluminan y se vuelven interactivos, mostrando "Editar Contabilidad" y "Eliminar Contabilidad". Al desmarcarla o marcar más de una, los botones regresan inmediatamente a su estado deshabilitado.

### Impacto
Afecta a [platform-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platform-admin.tsx), [areas-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas-list.tsx), [users-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users-list.tsx) y a las pruebas en [platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx).


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
Afecta a [platform-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-form.tsx), [platform-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platform-admin.tsx) y la suite de pruebas [platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx).


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
Afecta a [platform-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platform-admin.tsx), [platform-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-access-panel.tsx), [api.ts](file:///home/dtovar/bayblade/pokemon/frontend/src/lib/api.ts), [api.py](file:///home/dtovar/bayblade/pokemon/app/modules/access/api.py) y las suites de pruebas [platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx) y [platform-access-panel.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-access-panel.test.tsx).


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
Afecta a [platform-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-access-panel.tsx), [form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/form.tsx) y la suite de pruebas [platform-access-panel.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-access-panel.test.tsx).


## Cierre Automático del Modal de Accesos tras Guardar

### Regla
Al completar exitosamente el guardado de los cambios en el modal de accesos por plataforma (`PlatformAccessPanel`), el sistema debe emitir la notificación Toast reactiva y cerrar de inmediato el diálogo modal invocando `onClose()`, devolviendo el foco de forma accesible al disparador en la barra de herramientas y evitando que el usuario deba presionar manualmente el botón "Cerrar".

### Ejemplo
El administrador transfiere a "Ana López" a la columna "Con acceso" y presiona "Guardar". Una vez que la API confirma el otorgamiento del acceso, se muestra el Toast de éxito y el modal se cierra automáticamente, regresando a la tabla de plataformas.

### Impacto
Afecta a [platform-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-access-panel.tsx) y [platform-access-panel.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-access-panel.test.tsx).


## Guardado Directo Sin Diálogo de Confirmación en Dual Picklist de Accesos

### Regla
En el modal de gestión de accesos por plataforma (`PlatformAccessPanel`), la transferencia de un usuario hacia la columna "Sin acceso" (quitar acceso) no debe requerir un diálogo secundario de confirmación (`ConfirmDialog`). Al presionar el botón "Guardar", todas las modificaciones (tanto otorgamientos como revocaciones) se ejecutan de manera directa y atómica, emitiendo de inmediato la notificación Toast de confirmación correspondiente y cerrando el modal.

### Ejemplo
El administrador traslada a un usuario de la columna "Con acceso" a "Sin acceso" y hace clic en "Guardar". El sistema procesa la revocación inmediatamente sin mostrar ninguna ventana emergente adicional, muestra la notificación Toast "Acceso retirado para «Contabilidad»." y cierra el modal devolviendo el foco a la tabla.

### Impacto
Afecta a [platform-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-access-panel.tsx) y [platform-access-panel.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-access-panel.test.tsx).


## Notificaciones Exclusivas vía Toast en Gestión de Accesos

### Regla
En el modal de administración de accesos por plataforma (`PlatformAccessPanel`), todos los mensajes informativos, de confirmación y de error derivados de las operaciones de otorgar o revocar accesos deben comunicarse exclusivamente mediante el sistema global de notificaciones Toast (`useToast`). Queda prohibido renderizar notas de error o badges de confirmación como elementos de contenido inline dentro del cuerpo del modal, garantizando que el diseño del modal permanezca limpio, estable y sin desplazamientos de layout.

### Ejemplo
Cuando ocurre un error o se completa exitosamente el guardado de accesos, el sistema despacha `avisar('error', ...)` o `avisar('success', ...)`. Ningún bloque `<ErrorNote>` o `<Badge>` aparece dentro del modal.

### Impacto
Afecta a [platform-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-access-panel.tsx) y [platform-access-panel.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-access-panel.test.tsx).


## Auto-cierre Universal de Notificaciones Toast

### Regla
Todos los avisos y notificaciones mostrados a través del proveedor Toast (`ToastProvider`), incluidos los de tono error, advertencia, éxito e información, deben cerrarse automáticamente al transcurrir el tiempo definido (`TOAST_MS`). Cada notificación incorpora una barra de progreso regresivo y soporta pausa interactiva mientras el cursor (ratón) o el foco por teclado se encuentren sobre la tarjeta (WCAG 2.2.1), reanudando el temporizador al salir.

### Ejemplo
Al producirse un error en una operación, se despliega una tarjeta Toast roja en la esquina inferior derecha con su barra de progreso. El usuario puede leerla y, si no interactúa con ella, se disipa automáticamente tras 6 segundos sin requerir que haga clic en el botón de cerrar.

### Impacto
Afecta a [toast.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/toast.tsx) y [componentes-comunes.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/componentes-comunes.test.tsx).


## Gestión Directa de Accesos en Plataformas sin Conector Automatizado

### Regla
En plataformas que no cuentan con un conector externo activo ni integración LDAP (`sin_conector`), las operaciones de asignación y revocación directa ejecutadas por administradores deben resolverse de forma síncrona e inmediata. Al otorgar acceso, el registro se establece directamente en estado `activo` (sin quedar bloqueado en `en_proceso`); al revocar acceso, el registro pasa directamente a `revocado` (liberando de inmediato el slot vigente sin requerir un worker de aprovisionamiento en segundo plano ni arrojar 409 por estados no sincronizados).

### Ejemplo
Un administrador ingresa a los accesos de la plataforma "qw" (sin conector), mueve a "Usuario Demo 2" a la columna "Con acceso" y guarda: el acceso queda inmediatamente en estado "activo". Al retirarlo y guardar, el acceso se revoca de inmediato sin error de "Solo se revoca un acceso activo".

### Impacto
Afecta a [api.py](file:///home/dtovar/bayblade/pokemon/app/modules/access/api.py) y [test_platform_access_api.py](file:///home/dtovar/bayblade/pokemon/tests/access/test_platform_access_api.py).


## Configuración de Duración a 8 Segundos en Auto-cierre Toast

### Regla
El temporizador global de auto-cierre para todas las notificaciones Toast (`TOAST_MS`) queda establecido en 8 segundos (8000 ms), sincronizando la animación CSS de la barra regresiva (`.nx-toast-progress`) a 8 segundos. Toda notificación (éxito, error, advertencia e información) permanece visible durante este intervalo completo, manteniendo el soporte de pausa al recibir cursor o foco accesible y reanudando al perderlos.

### Ejemplo
Al guardar o retirar un acceso, el aviso Toast generado se muestra durante 8 segundos completos mientras su barra de progreso disminuye suavemente, desapareciendo de forma automática si el usuario no interactúa con él.

### Impacto
Afecta a [toast.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/toast.tsx), [components.css](file:///home/dtovar/bayblade/pokemon/frontend/src/styles/components.css) y [componentes-comunes.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/componentes-comunes.test.tsx).


## Optimización de Navegación: Caché en Memoria y Stale-While-Revalidate

### Regla
Para eliminar bloqueos y destellos de "Cargando…" en las transiciones de página:
1. `SessionProvider` debe mantener la sesión en memoria (`cachedSession`) una vez autenticada. En navegaciones subsecuentes, la sesión se sirve de forma inmediata (`loading: false`) mientras se valida en segundo plano sin desmontar el marco general de la interfaz.
2. El hook `useAsync` soporta el patrón Stale-While-Revalidate mediante una clave opcional `cacheKey`. Al revisitar vistas con clave de caché, los datos previos se despliegan instantáneamente en el primer render (`loading: false`), sincronizando silenciosamente en segundo plano sin provocar parpadeos de esqueletos o spinners.

### Ejemplo
Al navegar entre "Áreas", "Plataformas" y otras secciones del sistema, la barra superior, la barra lateral y los listados principales se muestran de inmediato sin el spinner de pantalla completa ni recargas vacías.

### Impacto
Afecta a [session-provider.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/session-provider.tsx), [use-async.ts](file:///home/dtovar/bayblade/pokemon/frontend/src/lib/use-async.ts) y [platform-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platform-admin.tsx).


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
Afecta a [serializacion.py](file:///home/dtovar/bayblade/pokemon/app/modules/users/serializacion.py), [types.ts](file:///home/dtovar/bayblade/pokemon/frontend/src/lib/types.ts), [area-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas/area-form.tsx), [platform-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platform-admin.tsx), [users-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users-list.tsx) y pruebas en [users-list.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/users-list.test.tsx).


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
Afecta a [areas-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas-list.tsx) y a la suite de pruebas en [areas-list.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/areas-list.test.tsx).


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
Afecta a [user-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users/user-access-panel.tsx), [users-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users-list.tsx), [api.ts](file:///home/dtovar/bayblade/pokemon/frontend/src/lib/api.ts), [serializacion.py](file:///home/dtovar/bayblade/pokemon/app/modules/access/serializacion.py) y las suites de pruebas en [user-access-panel.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/users/user-access-panel.test.tsx) y [users-list.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/users-list.test.tsx).


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
Afecta a [areas-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas-list.tsx) y a la suite de pruebas en [areas-list.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/areas-list.test.tsx).


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
Afecta a [user-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users/user-access-panel.tsx), [users-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users-list.tsx), [api.ts](file:///home/dtovar/bayblade/pokemon/frontend/src/lib/api.ts), [serializacion.py](file:///home/dtovar/bayblade/pokemon/app/modules/access/serializacion.py) y las suites de pruebas en [user-access-panel.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/users/user-access-panel.test.tsx) y [users-list.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/users-list.test.tsx).


## Persistencia de Dimensiones de Cuadrícula en Plataformas

### Regla
En la vista de administración de plataformas (`/admin/platforms`), las dimensiones de la cuadrícula de tarjetas de áreas (filas de 2 a 4 y columnas de 2 a 4) se persisten en el navegador del usuario utilizando `localStorage` (`portal_grid_filas` y `portal_grid_columnas`). Cada cambio de filas, columnas o combinaciones predefinidas ($2\times 2$, $3\times 3$, $4\times 4$, etc.) se almacena inmediatamente en el almacenamiento local. Al recargar la página o navegar entre distintas vistas del sistema, el componente restaura de forma reactiva las dimensiones configuradas por el usuario, evitando que se restablezcan a los valores iniciales de $2\times 4$.

### Ejemplo
Un administrador ingresa a `General > Plataformas` y en el menú de cuadrícula selecciona la combinación `3×3`. El diseño se adapta de inmediato mostrando 9 ranuras y guardando los valores `3` y `3` en el almacenamiento local. Al navegar hacia otra ruta del sistema o refrescar la pestaña, la vista de plataformas mantiene activa la configuración de 3 filas por 3 columnas.

### Impacto
Afecta a [platform-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platform-admin.tsx) y a la suite de pruebas en [platform-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/platform-admin.test.tsx).


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
Afecta a [connectors-admin.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/connectors-admin.tsx), [connector-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/connector-list.tsx) y a la suite de pruebas en [connectors-admin.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/connectors/connectors-admin.test.tsx).


## Tolerancia a Entidades Nulas en Bitácora de Ejecuciones

### Regla
En la vista y componentes de bitácora de ejecuciones de aprovisionamiento (`/admin/jobs`, `JobsTable`, `JobDetailModal`, `JobRetryDialog` y `JobsLog`), las referencias a entidades asociadas (`job.platform`, `job.user` y `job.area`) deben consumirse de forma defensiva mediante encadenamiento opcional (`?.`) y textos descriptivos de contingencia (`'Plataforma eliminada'`, `'Usuario eliminado'`, `'Área eliminada'`).
Debido a que el backend retorna intencionalmente `null` cuando una entidad referenciada por un trabajo previo ha sido eliminada del sistema, los componentes frontend deben garantizar la renderización íntegra de la bitácora histórica sin generar excepciones `TypeError` ni páginas de error 500.

### Ejemplo
Si un trabajo de aprovisionamiento histórico referencia una plataforma que posteriormente fue eliminada de la base de datos (como el trabajo n.º 2), la bitácora despliega correctamente la fila identificando al usuario y señalando "Plataforma eliminada · [Nombre del área]" en lugar de interrumpir la renderización.

### Impacto
Afecta a [jobs-table.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/jobs-table.tsx), [job-detail-modal.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/job-detail-modal.tsx), [job-retry-dialog.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/job-retry-dialog.tsx), [jobs-log.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/jobs-log.tsx), [types.ts](file:///home/dtovar/bayblade/pokemon/frontend/src/lib/access/types.ts) y a la suite de pruebas en [jobs-page.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/connectors/jobs-page.test.tsx).


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
Afecta a [start.sh](file:///home/dtovar/bayblade/pokemon/start.sh) y a los procedimientos de desarrollo local.


## Limpieza Visual en Modal de Accesos (Dual Picklist)

### Regla
En el modal de administración de accesos (`PlatformAccessPanel` y paneles análogos con Dual Picklist), se suprime el texto de ayuda explicativo sobre la transferencia de registros entre columnas ("Haz clic sobre cualquier usuario para transferirlo entre columnas..."). La interacción intuitiva mediante botones interactivos, estados visuales y diseño autodirigido sustituye la instrucción redundante, maximizando el espacio vertical y la legibilidad de las listas de transferencia.

### Ejemplo
Al abrir el modal de accesos para una plataforma desde el catálogo, la cabecera muestra inmediatamente los contadores y las dos columnas del Dual Picklist sin párrafos de texto instructivo innecesarios, permitiendo una visión despejada y directa de los usuarios asignados y disponibles.

### Impacto
Afecta a [platform-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-access-panel.tsx) y a la experiencia de usuario en la administración de accesos del portal.


## Estandarización Global de Opciones de Selección (Option y nexus-option)

### Regla
Todos los elementos desplegables de selección (`<Select>` y selectores del sistema) deben utilizar el componente reutilizable `<Option>` de [form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/form.tsx) o, en su defecto, portar la clase CSS `.nexus-option` (junto con tokens de fondo, texto y peso tipográfico semibold: `bg-input-bg text-input-text font-semibold`). Queda estrictamente prohibido el uso de etiquetas `<option>` nativas desnudas sin estilizado de clase, asegurando que en todos los navegadores y sistemas operativos las opciones respeten los tokens de superficie, contraste, estados `:checked`, `:hover` y soporte completo de modo oscuro.

### Ejemplo
En los filtros de auditoría, bitácora de ejecuciones, alcance, inventario y solicitudes, cada opción se renderiza como `<Option value="...">Texto</Option>`, inyectando la clase `.nexus-option` y garantizando que el menú desplegable conserve el tema visual de Nexus en lugar de los estilos grises por defecto del navegador.

### Impacto
Afecta a [form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/form.tsx), [select-premium.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/select-premium.tsx), [scope-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/scope-filters.tsx), [inventory-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/inventory-filters.tsx), [my-access.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/my-access.tsx), [approvals-inbox.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/approvals-inbox.tsx), [my-requests.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/my-requests.tsx), [catalog-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/catalog-filters.tsx), [theme-selector.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/theme-selector.tsx), [platform-integration-fields.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-integration-fields.tsx), [jobs-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/jobs-filters.tsx), [connector-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/connector-form.tsx), [connector-param-fields.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/connector-param-fields.tsx), [audit-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/audit/audit-filters.tsx), [smtp-tab.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/settings/smtp-tab.tsx) y [components.css](file:///home/dtovar/bayblade/pokemon/frontend/src/styles/components.css).


## Supresión de Texto Instructivo en Modal de Accesos de Usuarios (UserAccessPanel)

### Regla
En concordancia con la estandarización del modal de accesos de plataformas, en el modal de accesos de usuarios ([user-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users/user-access-panel.tsx)) se elimina el texto de instrucción ("Haz clic sobre cualquier plataforma para transferirla entre columnas..."). Las columnas Dual Picklist, los buscadores independientes y los botones interactivos proporcionan una interfaz autodirigida y ergonómica sin necesidad de leyendas explicativas estáticas.

### Ejemplo
Al seleccionar un usuario en la tabla de usuarios y hacer clic en el botón `Accesos`, el modal desplegado muestra de inmediato los contadores y las columnas de plataformas disponibles y asignadas, con máximo aprovechamiento del espacio vertical y sin bloques de texto redundantes.

### Impacto
Afecta a [user-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users/user-access-panel.tsx) y a la suite de pruebas en [user-access-panel.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/users/user-access-panel.test.tsx).


## Estandarización Global de Opciones de Selección (Option y nexus-option)

### Regla
Todos los elementos desplegables de selección (`<Select>` y selectores del sistema) deben utilizar el componente reutilizable `<Option>` de [form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/form.tsx) o, en su defecto, portar la clase CSS `.nexus-option` (junto con tokens de fondo, texto y peso tipográfico semibold: `bg-input-bg text-input-text font-semibold`). Queda estrictamente prohibido el uso de etiquetas `<option>` nativas desnudas sin estilizado de clase, asegurando que en todos los navegadores y sistemas operativos las opciones respeten los tokens de superficie, contraste, estados `:checked`, `:hover` y soporte completo de modo oscuro.

### Ejemplo
En los filtros de auditoría, bitácora de ejecuciones, alcance, inventario y solicitudes, cada opción se renderiza como `<Option value="...">Texto</Option>`, inyectando la clase `.nexus-option` y garantizando que el menú desplegable conserve el tema visual de Nexus en lugar de los estilos grises por defecto del navegador.

### Impacto
Afecta a [form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/form.tsx), [select-premium.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/select-premium.tsx), [scope-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/scope-filters.tsx), [inventory-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/inventory-filters.tsx), [my-access.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/my-access.tsx), [approvals-inbox.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/approvals-inbox.tsx), [my-requests.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/my-requests.tsx), [catalog-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/access/catalog-filters.tsx), [theme-selector.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/theme-selector.tsx), [platform-integration-fields.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-integration-fields.tsx), [jobs-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/jobs-filters.tsx), [connector-form.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/connector-form.tsx), [connector-param-fields.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/connectors/connector-param-fields.tsx), [audit-filters.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/audit/audit-filters.tsx), [smtp-tab.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/settings/smtp-tab.tsx) y [components.css](file:///home/dtovar/bayblade/pokemon/frontend/src/styles/components.css).


## Supresión de Texto Instructivo en Modal de Accesos de Usuarios (UserAccessPanel)

### Regla
En concordancia con la estandarización del modal de accesos de plataformas, en el modal de accesos de usuarios ([user-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users/user-access-panel.tsx)) se elimina el texto de instrucción ("Haz clic sobre cualquier plataforma para transferirla entre columnas..."). Las columnas Dual Picklist, los buscadores independientes y los botones interactivos proporcionan una interfaz autodirigida y ergonómica sin necesidad de leyendas explicativas estáticas.

### Ejemplo
Al seleccionar un usuario en la tabla de usuarios y hacer clic en el botón `Accesos`, el modal desplegado muestra de inmediato los contadores y las columnas de plataformas disponibles y asignadas, con máximo aprovechamiento del espacio vertical y sin bloques de texto redundantes.

### Impacto
Afecta a [user-access-panel.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users/user-access-panel.tsx) y a la suite de pruebas en [user-access-panel.test.tsx](file:///home/dtovar/bayblade/pokemon/frontend/tests/components/users/user-access-panel.test.tsx).


## Estandarización de Dimensiones de Iconos en Tablas (Usuarios y Áreas)

### Regla
Todos los iconos contenedores, badges de estado, contadores numéricos y avatares en las tablas de entidades maestras ([users-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users-list.tsx), [areas-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas-list.tsx) y [platform-columns.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-columns.tsx)) deben estar rigurosamente estandarizados bajo el sistema de 8pt con una altura y escala unificada:
- **Contenedores de iconos / Avatares**: Cuadrados de 32x32 px (`size-8`) con radio de curvatura uniforme (`rounded-lg`).
- **Pastillas de contadores y estados**: Altura fija de 32 px (`h-8` / `!h-8`) con esquinas curvadas (`rounded-lg`) y relleno táctil equilibrado.
- **Iconografía interna**: Escala estándar de 16 px (`tamano="sm"`), eliminando iconos reducidos (`tamano="xs"` o contenedores `size-7`) que producían disparidad visual respecto al avatar de la columna de nombre.
- **Representación de Área**: En la columna de área, si el registro cuenta con un icono personalizado configurado (`area.icon`), se renderiza dicho icono dentro del chip de 32 px en lugar de las iniciales alfabéticas.

### Ejemplo
En la tabla de usuarios, las insignias de estado (activo/inactivo y LDAP/local) y los iconos de áreas asignadas miden exactamente 32x32 px (`size-8`), alineándose de manera simétrica y con la misma presencia visual que el avatar del nombre. En la tabla de áreas, los contadores de plataformas y usuarios tienen altura de 32 px con iconos de 16 px (`tamano="sm"`), igualando la escala del chip de nombre de área.

### Impacto
Afecta a [users-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/users-list.tsx), [areas-list.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/areas-list.tsx), [platform-columns.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/platforms/platform-columns.tsx) y [ui.tsx](file:///home/dtovar/bayblade/pokemon/frontend/src/components/ui.tsx).


## Operaciones de Directorio LDAP en el Backend (CRUD de Usuarios, Contraseñas y Membresías)

### Regla
El backend centraliza y garantiza la gestión integral de cuentas y membresías sobre el servidor de directorio OpenLDAP a través de `EscritorDirectorio` (writer.py), cumpliendo con las siguientes directrices de seguridad y consistencia:
1. **Creación de usuarios (`create_user`)**: Crea la entrada en `LDAP_USERS_BASE_DN` con clases `inetOrgPerson` (y las configuradas en `LDAP_USER_OBJECT_CLASSES`). Valida identificador y correo, escapa caracteres RDN y filtros, y admite opcionalmente el establecimiento seguro del atributo `userPassword` si se suministra una contraseña inicial.
2. **Eliminación de usuarios (`delete_user`)**: Permite la baja de cuentas en OpenLDAP identificando al usuario por instancia `UsuarioDirectorio`, identificador (UID) o DN completo. Valida estrictamente que el DN pertenezca a la base de usuarios configurada (`bajo_base(dn, cfg.usuarios_base_dn)`) y rechaza cualquier intento de borrado sobre la base o fuera de ella con `Resultado.ERROR_PERMANENTE` (`motivo='fuera_de_base'`). La baja es idempotente (`Resultado.NO_EXISTE` si el usuario no existe).
3. **Cambio de contraseña (`change_password` / `set_password`)**: Actualiza el atributo `userPassword` mediante la operación atómica `MODIFY_REPLACE`. Valida que la contraseña sea texto no vacío y que la cuenta pertenezca a la base de usuarios. Si se proporciona `old_password`, valida previamente la clave actual antes de efectuar la modificación.
4. **Membresía en grupos (`add_member` y `remove_member`)**: Gestiona la inclusión y exclusión de usuarios en grupos de LDAP (`groupOfNames` o `groupOfUniqueNames`), aceptando tanto instancias de `UsuarioDirectorio` como cadenas de identificador o DN normalizadas. Previene que grupos con miembros obligatorios queden vacíos inyectando el marcador `LDAP_GROUP_PLACEHOLDER_MEMBER` o denegando la operación con `ultimo_miembro`.

### Ejemplo
Al invocar `escritor.create_user(DatosCuenta('carlos', 'Carlos', 'Gomez', 'carlos@dominio.com', password='Password123!'))`, el backend crea la entrada en LDAP con su `userPassword`. Para cambiar su contraseña, `escritor.change_password('carlos', 'NuevaClave456!')` actualiza la clave en OpenLDAP de forma segura y sin exponer credenciales en los logs. Para eliminar la cuenta, `escritor.delete_user('carlos')` verifica que el DN esté bajo la base autorizada y ejecuta la eliminación sin afectar ramas ajenas.

### Impacto
Afecta a [writer.py](file:///home/dtovar/bayblade/pokemon/app/modules/directory/writer.py), [directory_accounts.py](file:///home/dtovar/bayblade/pokemon/app/modules/users/directory_accounts.py), [ldap_provider.py](file:///home/dtovar/bayblade/pokemon/app/modules/provisioning/ldap_provider.py) y las suites de pruebas [test_writer.py](file:///home/dtovar/bayblade/pokemon/tests/directory/test_writer.py) y [test_alta_directorio.py](file:///home/dtovar/bayblade/pokemon/tests/users/test_alta_directorio.py).
