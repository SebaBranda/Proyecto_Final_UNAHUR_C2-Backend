# GalacticApp Backend

Backend API del proyecto GalacticApp desarrollado para el Proyecto Final de UNaHur C2.

## Descripción

Este es el servidor backend de GalacticApp, construido con **Express.js**. Los endpoints de usuarios, técnicos y clientes utilizan MongoDB cuando la conexión está disponible y conservan un repositorio en memoria como fallback para desarrollo local.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (v16 o superior)
- **npm** (se instala con Node.js)
- **MongoDB** local o remoto (opcional mientras se usen los repositorios en memoria)
- **Git**

## Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/SebaBranda/Proyecto_Final_UNAHUR_C2-Backend.git
   cd Proyecto_Final_UNAHUR_C2-Backend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   - Crear un archivo `.env` en la raíz del proyecto
   - Completar las variables requeridas (ver sección de Configuración)

## Instalación con Docker

### Requisitos Previos para Docker

- **Docker** (v20.10 o superior)
- **Docker Compose** (v2.0 o superior)

### Pasos para ejecutar con Docker

La configuración completa de frontend, backend y MongoDB está en el
`docker-compose.yml` de la carpeta padre del proyecto. Ejecuta los comandos
desde `Proyecto Final`:

1. **Crear variables de entorno:**
   ```bash
   copy .env.example .env
   ```

2. **Levantar los servicios:**
   ```bash
   docker compose up -d --build
   ```
   Este comando:
   - Construye las imágenes del frontend y del backend.
   - Inicia MongoDB con volúmenes persistentes.
   - Carga los datos iniciales una sola vez.
   - Publica la aplicación en `http://localhost:8080`.
   - Envía internamente `/api` del frontend al backend.

4. **Verificar que está corriendo:**
   ```bash
   docker compose ps
   ```

5. **Ver logs de la aplicación:**
   ```bash
   docker compose logs -f backend
   ```

6. **Detener los servicios:**
   ```bash
   docker compose down
   ```

### Comandos útiles de Docker

```bash
# Ver logs de MongoDB
docker-compose logs mongodb

# Entrar a la shell del backend
docker-compose exec backend sh

# Reconstruir la imagen
docker-compose build --no-cache

# Eliminar volúmenes (CUIDADO: borra datos de MongoDB)
docker-compose down -v

# Ejecutar un comando específico
docker-compose exec backend npm run dev
```

### Acceso a MongoDB desde Docker

- **Host:** mongodb
- **Puerto:** 27017
- **Usuario:** admin (por defecto)
- **Contraseña:** password (por defecto)
- **Base de datos:** galacticapp_db

Para conectarte desde fuera del contenedor:
```
mongodb://admin:password@localhost:27017/galacticapp_db
```

### Despliegue en Producción con Docker

Para producción, utiliza:
```bash
docker-compose -f docker-compose.yml up -d
```

Asegúrate de:
- Cambiar las credenciales de MongoDB en `.env`
- Usar variables de entorno seguras
- Configurar HTTPS/SSL si es necesario
- Usar un reverse proxy como Nginx

## Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Puerto del servidor
HTTPS_PORT=3000

# Certificado HTTPS local autofirmado (se genera automáticamente)
HTTPS_KEY_PATH=certs/localhost.key
HTTPS_CERT_PATH=certs/localhost.crt

# URI de conexión a MongoDB
MONGO_URI=mongodb://localhost:27017/galacticapp_db

# Secreto aleatorio de al menos 32 bytes para firmar JWT
JWT_SECRET=poner_un_secreto_aleatorio_local
```

El servidor inicia por HTTPS en `https://localhost:3000`. En Postman, para usar
el certificado autofirmado de desarrollo, desactivar temporalmente **Settings >
General > SSL certificate verification**. Las operaciones `GET` devuelven datos
sanitizados; `POST`, `PUT`, `PATCH` y `DELETE` devuelven mensajes de confirmación
y no exponen los registros almacenados.

### Roles disponibles

Todos los endpoints de recursos requieren un token `Bearer` obtenido mediante
`POST /api/auth/login`. Los roles se conservan como datos normalizados para
futuras restricciones, pero actualmente no limitan el acceso a las rutas.

| Rol | Alcance |
|---|---|
| `Administrador` (`rolId: 1`) | Rol disponible, sin restricciones activas. |
| `Coordinador` (`rolId: 2`) | Rol disponible, sin restricciones activas. |
| `Tecnico` (`rolId: 3`) | Rol disponible, sin restricciones activas. |

La autorización por rol queda fuera del alcance por ahora: no existe el endpoint
`GET /api/roles` ni se aplican restricciones de rol sobre los endpoints de
recursos. Las rutas siguen requiriendo un token `Bearer`. Al crear o actualizar
un usuario se debe enviar `rolId` como número (`1`, `2` o `3`); el nombre del rol
no se almacena en el usuario.

### Conexión a MongoDB

Al iniciar, el servidor se conecta a MongoDB y verifica los datos iniciales. La
URI usada dentro de Docker tiene este formato:
```
mongodb://admin:password@mongodb:27017/galacticapp_db?authSource=admin
```

Los cambios de usuarios, técnicos y clientes quedan persistidos en MongoDB.
Los volúmenes `mongodb_data` y `mongodb_config` evitan perder la información al
recrear los contenedores. `docker compose down -v` elimina esos datos.

`JWT_SECRET` debe contener al menos 32 bytes aleatorios. Se puede generar localmente con:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

No publiques ni compartas el secreto configurado en `.env`.

## Scripts Disponibles

```bash
# Iniciar servidor en modo desarrollo (con nodemon)
npm run dev

# Iniciar servidor en producción
npm start
```

## Estructura del Proyecto

```
.
├── index.js                         # Arranque del servidor
├── src/
│   ├── app.js                         # Configuración de Express y middlewares
│   ├── config/database.js             # Conexión a MongoDB
│   ├── controllers/                   # Controladores HTTP y CRUD compartido
│   ├── data/store.js                  # Datos iniciales para memoria
│   ├── models/schemas.js              # Esquemas Mongoose de usuarios y clientes
│   ├── repositories/                  # Repositorios en memoria
│   ├── routes/resources.routes.js      # Rutas HTTP de la API
│   └── services/                      # Hash de contraseñas y lógica de usuarios
├── package.json                      # Dependencias y scripts
├── .env                              # Variables de entorno (no versionado)
├── .gitignore                        # Archivos ignorados por git
└── README.md                         # Este archivo
```

## Dependencias Principales

- **express** (^5.2.1): Framework web para Node.js
- **mongoose** (^9.9.4): ODM para MongoDB
- **cors** (^2.8.6): Middleware para CORS
- **dotenv** (^17.4.2): Gestor de variables de entorno
- **nodemon** (^3.1.14): Monitor de cambios en desarrollo

## Endpoints Base

### Salud de la API

```
GET http://localhost:3000/
```

**Respuesta `200`:**
```json
{
  "servicio": "GalacticApp API",
  "estado": "ok"
}
```

### Probar en Postman

1. Inicia el servidor desde la carpeta del backend:

   ```powershell
   npm run dev
   ```

2. En Postman crea una request, selecciona el método y URL de los ejemplos siguientes. Para requests con cuerpo, elige **Body → raw → JSON**.

3. Usa `https://localhost:3000` como base URL, desactiva la verificación SSL de Postman para el certificado local y envía el JWT como `Authorization: Bearer <token>`.

#### Resumen de endpoints activos

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/` | Estado del servicio |
| `GET` | `/api/ping` | Verificar comunicación con la API |
| `POST` | `/api/auth/login` | Autenticar usuario y emitir JWT |
| `GET` | `/api/usuarios` | Listar usuarios; admite `?usuario=nombre` |
| `GET` | `/api/usuarios/:id` | Obtener usuario |
| `POST` | `/api/usuarios` | Crear usuario |
| `PUT`, `PATCH` | `/api/usuarios/:id` | Actualizar usuario |
| `DELETE` | `/api/usuarios/:id` | Eliminar usuario |
| `GET` | `/api/tecnicos` | Listar técnicos; admite `?usuario=nombre` |
| `GET` | `/api/tecnicos/:id` | Obtener técnico |
| `POST` | `/api/tecnicos` | Crear técnico |
| `PUT`, `PATCH` | `/api/tecnicos/:id` | Actualizar técnico |
| `DELETE` | `/api/tecnicos/:id` | Eliminar técnico |
| `GET` | `/api/clientes` | Listar clientes |
| `GET` | `/api/clientes/:id` | Obtener cliente |
| `POST` | `/api/clientes` | Crear cliente |
| `PUT`, `PATCH` | `/api/clientes/:id` | Actualizar cliente |
| `DELETE` | `/api/clientes/:id` | Eliminar cliente |

#### Salud

```http
GET http://localhost:3000/
GET http://localhost:3000/api/ping
```

#### Autenticación

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "usuario": "admin",
  "contrasena": "admin"
}
```

Con credenciales correctas responde `200` con un token Bearer, vencimiento de 3600 segundos y datos públicos del usuario. Credenciales incorrectas o cuenta inactiva responden `401`; si falta usuario o contraseña responde `400`.

Usuarios de demostración disponibles:

| Usuario | Contraseña |
|---|---|
| `admin` | `admin` |
| `coordinador` | `coordinador` |
| `tecnico` | `tecnico` |
| `tecnico.libre` | `tecnico` |
| `tecnico.moreno` | `tecnico` |
| `tecnico.hurlingham` | `tecnico` |
| `tecnico.ramos` | `tecnico` |
| `tecnico.haedo` | `tecnico` |
| `tecnico.ituz` | `tecnico` |

Son credenciales solo para desarrollo local; no deben usarse en producción.

#### Usuarios

Listar todos o filtrar por nombre de usuario:

```http
GET http://localhost:3000/api/usuarios
GET http://localhost:3000/api/usuarios?usuario=admin
```

Obtener por ID:

```http
GET http://localhost:3000/api/usuarios/1
```

Crear (`201`):

```http
POST http://localhost:3000/api/usuarios
Content-Type: application/json
```

```json
{
  "usuario": "usuario.postman",
  "contrasena": "claveDePrueba",
  "nombre": "Usuario Postman",
  "rolId": 2,
  "activo": true
}
```

Los roles permitidos son `rolId: 1` (`Administrador`), `rolId: 2`
(`Coordinador`) y `rolId: 3` (`Tecnico`). El campo `contrasena` se convierte a
hash antes de guardarse; ni contraseña ni hash se incluyen en la respuesta.

Actualizar datos (`PATCH` o `PUT`; ambos aceptan campos parciales):

```http
PATCH http://localhost:3000/api/usuarios/10
Content-Type: application/json
```

```json
{
  "nombre": "Nombre actualizado"
}
```

Para cambiar la contraseña, enviar `contrasena` nueva en el JSON. No enviar `passwordHash`.

Eliminar:

```http
DELETE http://localhost:3000/api/usuarios/10
```

#### Técnicos

Los técnicos se guardan como usuarios con `rolId: 3`; al crear no hace falta
enviar el rol porque el endpoint lo asigna automáticamente:

```http
GET http://localhost:3000/api/tecnicos
GET http://localhost:3000/api/tecnicos?usuario=tecnico
GET http://localhost:3000/api/tecnicos/3
```

Crear (`201`):

```http
POST http://localhost:3000/api/tecnicos
Content-Type: application/json
```

```json
{
  "usuario": "tecnico.postman",
  "contrasena": "claveDePrueba",
  "nombre": "Técnico Postman",
  "documento": "40999888",
  "telefono": "11-4000-0000",
  "email": "tecnico.postman@galactic.app",
  "direccion": "Dirección de prueba 123"
}
```

Actualizar (`PATCH` o `PUT`) y eliminar usan el ID del técnico:

```http
PATCH http://localhost:3000/api/tecnicos/3
Content-Type: application/json
```

```json
{
  "telefono": "11-4111-2222"
}
```

```http
DELETE http://localhost:3000/api/tecnicos/3
```

#### Clientes

Listar y obtener:

```http
GET http://localhost:3000/api/clientes
GET http://localhost:3000/api/clientes/1
```

Crear (`201`, `nombre` es obligatorio):

```http
POST http://localhost:3000/api/clientes
Content-Type: application/json
```

```json
{
  "nombre": "Cliente Postman",
  "documento": "40999777",
  "telefono": "11-4222-0000",
  "email": "cliente.postman@galactic.app",
  "direccion": "Dirección de prueba 456",
  "activo": true,
  "coordenadas": {
    "latitud": -34.65,
    "longitud": -58.62
  },
  "zona": "Morón Centro"
}
```

Actualizar (`PATCH` o `PUT`; ambos aceptan campos parciales):

```http
PATCH http://localhost:3000/api/clientes/1
Content-Type: application/json
```

```json
{
  "telefono": "11-4333-1111",
  "activo": false
}
```

Eliminar:

```http
DELETE http://localhost:3000/api/clientes/1
```

#### IDs y errores esperados

- Los IDs iniciales de memoria son números. Usa un ID existente al probar `GET`, `PATCH`, `PUT` o `DELETE`.
- `400`: JSON/campos inválidos, rol no permitido o ID no válido.
- `401`: usuario/contraseña incorrectos o cuenta inactiva al iniciar sesión.
- `404`: ruta o registro no encontrado.
- `500`: error inesperado del servidor.

Los datos creados, actualizados o eliminados solo viven en memoria y se pierden al reiniciar el proceso.

`npm run check` valida la sintaxis del código sin requerir una instancia de MongoDB.

## Configuración de CORS

CORS está habilitado en todas las rutas para permitir solicitudes desde el frontend. Configurable en `index.js`.

## Middlewares

- **CORS**: Permite solicitudes desde diferentes orígenes
- **Express JSON**: Parsea automáticamente JSON en los requests

## Notas Importantes

- El servidor escucha por defecto en el puerto **3000**
- La conexión a MongoDB no es necesaria mientras se usen los repositorios en memoria
- Asegúrate de que el archivo `.env` no se versionea (incluido en `.gitignore`)
- Usa `npm run dev` durante el desarrollo para recargas automáticas

## Troubleshooting

### Error: "Cannot connect to MongoDB"
- Verifica que MongoDB esté corriendo
- Comprueba la URI en la variable `MONGO_URI`
- Revisa tu conexión de red si usas MongoDB remoto

### Error: "Port already in use"
- Cambia el puerto en la variable `PORT` del `.env`
- O termina el proceso que está usando el puerto 3000

## Contacto y Soporte

Para reportar issues o sugerencias, utiliza [GitHub Issues](https://github.com/SebaBranda/Proyecto_Final_UNAHUR_C2-Backend/issues).

## Licencia

ISC - Ver archivo package.json para más detalles