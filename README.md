# Own Lovi

Plataforma de agentes de soporte al cliente impulsada por IA. Permite a las empresas crear chatbots inteligentes, entrenarlos con bases de conocimiento (FAQs manuales o generadas automaticamente mediante web crawling) e incrustar un widget de chat en su sitio web.

## Arquitectura

El proyecto esta compuesto por 4 servicios independientes:

| Servicio | Tecnologia | Puerto | Descripcion |
|---|---|---|---|
| **frontend** | React 18 + Vite + Tailwind CSS | `5173` | Dashboard de administracion |
| **backend** | Express.js + TypeScript | `3001` | API REST principal |
| **ai-service** | Python + FastAPI | `8000` | Servicio de web crawling y generacion de FAQs |
| **widget** | Preact + Vite | — | Widget de chat embebible (se compila a un solo archivo JS) |

**Base de datos:** Supabase (PostgreSQL + Auth)
**LLM:** Groq API (Llama 3.3 70B por defecto)

```
Own Lovi/
├── frontend/          # Dashboard React (SPA)
├── backend/           # API Express.js
├── ai-service/        # Microservicio Python (crawling + generacion IA)
├── widget/            # Widget de chat embebible
├── supabase/          # Migraciones SQL
├── docker-compose.yml
└── .env.example
```

## Requisitos Previos

- [Node.js](https://nodejs.org/) v20 o superior
- [Python](https://python.org/) 3.12 o superior
- [Docker](https://www.docker.com/) y Docker Compose (opcional, para ejecucion con contenedores)
- Una cuenta en [Supabase](https://supabase.com/) (proyecto creado)
- Una API key de [Groq](https://console.groq.com/)

## Instalacion

### 1. Clonar el repositorio

```bash
git clone https://github.com/miusarname2/Support-Project
cd Support-Project
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Groq
GROQ_API_KEY=gsk_tu-api-key

# Backend
PORT=3001
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# AI Service
AI_SERVICE_PORT=8000
```

### 3. Configurar la base de datos

Abre el **SQL Editor** en tu proyecto de Supabase y ejecuta el contenido del archivo:

```
supabase/migrations/001_initial_schema.sql
```

Esto creara todas las tablas, politicas de Row Level Security, triggers e indices necesarios.

### 4. Instalar dependencias

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Widget
cd ../widget
npm install

# AI Service (Python)
cd ../ai-service
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate
pip install -r requirements.txt
```

## Ejecucion

### Opcion A: Docker Compose (recomendado)

Desde la raiz del proyecto:

```bash
docker-compose up --build
```

Esto levanta automaticamente:
- **Backend** en `http://localhost:3001`
- **AI Service** en `http://localhost:8000`
- **Frontend** en `http://localhost:5173`

### Opcion B: Ejecucion manual (desarrollo)

Abre 3-4 terminales:

```bash
# Terminal 1: AI Service
cd ai-service
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
python main.py

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev

# Terminal 4 (opcional): Widget en modo desarrollo
cd widget
npm run dev
```

## Uso

### 1. Registrar una cuenta

Accede a `http://localhost:5173` y crea una cuenta. Al registrarte se creara automaticamente tu empresa.

### 2. Crear un agente

Desde el dashboard, crea un nuevo agente de soporte. Puedes configurar:
- **Nombre** y descripcion del agente
- **System prompt** personalizado (instrucciones para la IA)
- **Modelo LLM** (Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B)
- **Temperatura** (creatividad de las respuestas)

### 3. Entrenar la base de conocimiento

Hay dos formas de alimentar la base de conocimiento del agente:

**Manual:** Agrega pares de pregunta/respuesta (FAQs) directamente desde el dashboard.

**Web Crawling (automatico):**
1. Proporciona la URL de tu sitio web
2. El sistema rastreara hasta 50 paginas automaticamente
3. Extraera el contenido relevante
4. Generara FAQs usando IA a partir del contenido rastreado

### 4. Crear y configurar un widget

Desde la pagina de detalle del agente, crea un widget. Configura su apariencia y obtendras un **snippet de codigo** para incrustar en tu sitio web:

```html
<script src="https://tu-dominio.com/widget.js" data-access-key="tu-access-key"></script>
```

### 5. Compilar el widget

Para generar el archivo `widget.js` que se incrustara en sitios externos:

```bash
cd widget
npm run build
```

El archivo compilado se generara en `widget/dist/`.

## Compilacion para Produccion

```bash
# Frontend
cd frontend
npm run build        # Genera archivos en dist/

# Backend
cd backend
npm run build        # Compila TypeScript a dist/
npm start            # Ejecuta node dist/index.js

# Widget
cd widget
npm run build        # Genera widget.js (IIFE)
```

## API

### Rutas autenticadas (JWT)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/auth/register` | Registrar usuario + empresa |
| `POST` | `/api/auth/login` | Iniciar sesion |
| `POST` | `/api/auth/logout` | Cerrar sesion |
| `GET` | `/api/auth/me` | Perfil + estadisticas |
| `GET/POST/PUT/DELETE` | `/api/agents` | CRUD de agentes |
| `GET/POST/PUT/DELETE` | `/api/agents/:id/faqs` | CRUD de FAQs |
| `GET/POST/PUT/DELETE` | `/api/agents/:id/widgets` | CRUD de widgets |
| `POST/GET/DELETE` | `/api/agents/:id/crawl` | Gestion de crawling |
| `POST` | `/api/agents/:id/crawl/:sourceId/generate-faqs` | Generar FAQs desde contenido rastreado |

### Rutas publicas (Access Key)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/widget/:accessKey/config` | Configuracion del widget |
| `POST` | `/api/widget/:accessKey/chat` | Enviar mensaje y obtener respuesta IA |
| `POST` | `/api/widget/:accessKey/chat/new` | Iniciar nueva conversacion |
| `GET` | `/api/widget/:accessKey/chat/:conversationId/messages` | Historial de mensajes |

## Estructura de la Base de Datos

| Tabla | Descripcion |
|---|---|
| `companies` | Empresas (multi-tenant) |
| `agents` | Agentes de IA por empresa |
| `faqs` | Pares pregunta/respuesta por agente |
| `crawl_sources` | URLs enviadas para rastreo |
| `crawled_pages` | Paginas individuales rastreadas |
| `widgets` | Widgets de chat con access keys |
| `conversations` | Sesiones de chat |
| `messages` | Mensajes individuales |
| `api_keys` | Claves API por empresa |
