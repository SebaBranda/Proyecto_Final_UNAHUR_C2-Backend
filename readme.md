# GalacticApp · Backend

API REST de GalacticApp, el sistema de gestión de reclamos y técnicos de campo. La usan tanto la web ([frontend](https://github.com/AgusCuevas/Proyecto_Final_UNAHUR_C2-Frontend)) como la app móvil del técnico.

## Stack

| | |
|---|---|
| Runtime | Node.js 20 (ES Modules) |
| Framework | Express 5 |
| Base de datos | MongoDB 7 con Mongoose 9 |
| Autenticación | JWT (`jsonwebtoken`, HS256) y contraseñas con `scrypt` (módulo `crypto` de Node) |
| Otros | `cors`, `dotenv`, `selfsigned` (certificado HTTPS de desarrollo), `nodemon` |

## Arquitectura

La API está organizada en capas. Cada recurso tiene su propio controlador, servicio y repositorio:

```
ruta → middleware (autenticar, autorizarRoles) → controlador → servicio → repositorio → modelo Mongoose
```

- **Controlador:** lee la petición y devuelve la respuesta HTTP.
- **Servicio:** tiene las reglas de negocio y las validaciones, y arma el resultado (`{ status, body }`).
- **Repositorio:** es el único que hace consultas a MongoDB.

```
index.js                 arranque: conexión a Mongo, datos demo, HTTP/HTTPS, limpieza de imágenes
src/
  app.js                 Express: CORS, cabeceras de seguridad, JSON (máx. 5 MB), errores
  routes/                todas las rutas bajo /api y los roles que pueden usarlas
  middleware/            autenticación (JWT y sesión vigente) y autorización por rol
  controllers/           un controlador por recurso
  services/              reglas de negocio por recurso
    reportes/            fuentes de datos, filtros y plantillas del generador de reportes
  repositories/          acceso a datos por colección
  models/schemas.js      esquemas Mongoose
  config/                conexión, roles, perfiles por rol y carga de datos demo
  data/store.js          datos demo
  utils/                 paginación, búsqueda sin acentos, CSV, etc.
postman/                 colección de pruebas de la API
```

## Seguridad y sesión

- **Login:** `POST /api/auth/login` devuelve un JWT que dura 1 hora. Las demás rutas lo reciben en la cabecera `Authorization: Bearer <token>`.
- **Una sesión por usuario:** el token lleva un id de sesión (`sid`) que también se guarda en el usuario. Si el usuario ingresa desde otro lugar, los tokens anteriores dejan de servir y la API responde `401` con el código `SESION_REEMPLAZADA`.
- **Roles:** `1` Administrador, `2` Coordinador y `3` Técnico. Cada ruta indica qué roles la pueden usar (`autorizarRoles`), y los servicios además limitan los datos: por ejemplo, un técnico solo ve sus propios reclamos.
- **Intentos de login:** después de 5 contraseñas incorrectas seguidas, el usuario queda bloqueado por unos minutos.
- **Cabeceras de seguridad:** `nosniff`, `X-Frame-Options: DENY`, `no-store` en `/api` y HSTS si se usa HTTPS.

## Recursos de la API

Todas las rutas empiezan con `/api`. Los listados se paginan con `?pagina=&limite=` (20 por defecto, 100 como máximo) y devuelven `{ datos, paginacion }`.

| Recurso | Rutas principales |
|---|---|
| Autenticación | `POST /auth/login`, `GET /auth/sesion`, `POST /auth/logout` |
| Usuarios | CRUD en `/usuarios` y `GET /usuarios/resumen` |
| Técnicos | `GET /tecnicos`, `GET /tecnicos/:id` (con el estado calculado a partir de sus reclamos) |
| Clientes | CRUD en `/clientes` y `PATCH /clientes/:id/conexion` |
| Vehículos | CRUD en `/vehiculos`, más `/asignacion`, `/kilometraje` y `/control` |
| Reclamos | `/reclamos`, `/resumen`, `/opciones`, `PATCH /:id/asignacion` y `PATCH /:id/estado` |
| Jornadas | `/jornadas`, `/resumen` y `PATCH /:id/finalizar` (con el control del vehículo y 4 fotos) |
| Imágenes | `POST /imagenes` (data URLs en base64) y `GET /imagenes` / `GET /imagenes/:id` |
| Ubicaciones | `GET /ubicaciones-tecnicos`, `PATCH /ubicaciones-tecnicos/:tecnicoId` y `GET/POST /ubicaciones-tecnicos/recorrido` |
| Reportes | `/reportes/fuentes`, `/vista-previa`, `/exportar` (CSV), `/plantillas` y CRUD de reportes guardados |

`GET /api/ping` sirve para comprobar que la API responde. La colección de [postman/](postman/) tiene ejemplos de cada ruta.

### Imágenes

- Se reciben como data URL en base64 (JPG, PNG o WebP; hasta 600 KB cada una y 6 por pedido) y se suben a un bucket compatible con S3 (Oracle Object Storage). En MongoDB queda solo el id UUID y la ubicación del archivo; al pedirlas, la API devuelve un link temporal de una hora.
- Los registros (reclamos, controles y jornadas) guardan solo los ids de sus imágenes.
- Al arrancar el servidor y después cada 6 horas, se borran las imágenes subidas que ningún registro usa.

## Variables de entorno

Partir de [.env.example](.env.example):

| Variable | Descripción |
|---|---|
| `PORT` | Puerto HTTP (por defecto `3000`) |
| `MONGO_URI` | Cadena de conexión a MongoDB. **Obligatoria** |
| `JWT_SECRET` | Secreto para firmar los tokens, de al menos 32 bytes. **Obligatoria** |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma (por ejemplo `http://localhost:5173`) |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Bucket donde se guardan las fotos. Sin estas variables no se pueden subir ni ver imágenes |
| `SEED_DEMO_DATA` | `true` para cargar los datos demo al iniciar (solo agrega los que faltan) |
| `HTTPS_ENABLED`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH` | HTTPS directo desde Node. En desarrollo, si faltan los certificados, se genera uno autofirmado |
| `NODE_ENV` | `development` o `production` |

## Ejecución

### Local

Requiere Node.js 20 o superior y un MongoDB accesible.

```bash
npm install
cp .env.example .env   # completar MONGO_URI y JWT_SECRET
npm run dev            # con nodemon; o: npm start
```

### Docker

El `docker-compose.yml` del repositorio principal levanta MongoDB, este backend y el frontend (nginx). La API queda accesible solo a través del frontend, en `http://localhost:8080/api`.

```bash
docker compose up -d --build
```

La imagen ([Dockerfile](Dockerfile)) usa `node:20-alpine` en dos etapas, corre con un usuario sin privilegios y usa `dumb-init` para recibir bien las señales de apagado.

### Datos demo

Con `SEED_DEMO_DATA=true` se cargan usuarios, clientes, vehículos, reclamos y jornadas de ejemplo. Usuarios: `admin/admin`, `coordinador/coordinador` y `tecnico/tecnico`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia el servidor con recarga automática |
| `npm start` | Inicia el servidor |
| `npm run check` | Verifica la sintaxis de los archivos fuente |
