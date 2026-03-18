# Resetear la Contraseña de PostgreSQL en Windows sin Reinstalar

No es necesario desinstalar e instalar todo de nuevo, puedes resetear la contraseña del usuario `postgres` en unos minutos haciéndolo entrar en "Modo de Confianza" (Trust mode). 

Sigue estos pasos cuidadosamente:

### 1. Localizar el archivo de configuración `pg_hba.conf`
Normalmente en Windows, PostgreSQL instala sus datos en esta ruta:
`C:\Program Files\PostgreSQL\[VERSION]\data\`
(Donde `[VERSION]` puede ser 14, 15, 16, etc.)

Ve a esa ruta en el Explorador de Archivos y busca el archivo llamado **`pg_hba.conf`**.

### 2. Editar `pg_hba.conf` para evitar la contraseña temporalmente
1. Abre **Bloc de Notas** como Administrador (Busca "Bloc de notas" en el menú de inicio, clic derecho -> Ejecutar como administrador).
2. Arrastra el archivo `pg_hba.conf` hacia adentro del Bloc de Notas.
3. Baja hasta el final del archivo. Verás unas líneas parecidas a estas:
```text
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
# IPv6 local connections:
host    all             all             ::1/128                 scram-sha-256
```
4. Cambia la palabra **`scram-sha-256`** (o `md5`) por la palabra **`trust`** en esas líneas:
```text
# IPv4 local connections:
host    all             all             127.0.0.1/32            trust
# IPv6 local connections:
host    all             all             ::1/128                 trust
```
5. Guarda el archivo (Ctrl + S o Archivo -> Guardar).

### 3. Reiniciar el servicio de PostgreSQL
1. Presiona `Win + R`, escribe `services.msc` y presiona Enter.
2. Busca en la lista algo que diga **`postgresql-x64-[VERSION]`**.
3. Haz clic derecho y selecciona **Reiniciar**.

### 4. Cambiar la contraseña (Ahora entrará sin pedirla)
1. Abre **pgAdmin** y trata de conectar el servidor en `localhost` con el usuario `postgres` dejando la contraseña en blanco o con cualquier cosa. Debería dejarte entrar inmediatamente.
2. En pgAdmin, ve al árbol de la izquierda, expande **Login/Group Roles** y haz clic derecho en el usuario **`postgres`** -> **Properties**.
3. Ve a la pestaña **Definition** y en la casilla de **Password** escribe tu nueva contraseña (por ejemplo, `12345`). Haz clic en Save.

### 5. Regresar la seguridad a la normalidad
1. Vuelve a abrir el archivo `pg_hba.conf` en tu Bloc de Notas.
2. Cambia la palabra `trust` de regreso a `scram-sha-256` (o `md5` si así estaba antes).
3. Guarda el archivo.
4. Reinicia nuevamente el servicio desde `services.msc` para que apliquen los cambios de seguridad.

¡Listo! Ya tienes una nueva contraseña. Ponla en nuestro archivo `backend/.env` y confírmame para continuar.
