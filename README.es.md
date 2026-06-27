<div align="center">

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · Español · [Русский](README.ru.md)

</div>

---

<h1 id="es">VibeOS</h1>

> Un sistema operativo de escritorio web estilo macOS impulsado por IA — donde la IA genera aplicaciones en tiempo real.

## ¿Qué es VibeOS?

VibeOS es un sistema operativo de escritorio que se ejecuta en tu navegador, con una interfaz estilo macOS Aqua. A diferencia de los SO tradicionales, sus aplicaciones **no están preescritas** — en su lugar, un Modelo de Lenguaje (LLM) **genera código HTML/CSS/JS en tiempo real** basándose en prompts del sistema, ejecutándose de forma segura en sandboxes iframe. Solo necesitas una idea, y la IA crea una aplicación de escritorio completa para ti.

- **Versión**: 0.2.0
- **Build**: Phase 1 — macOS Aqua Style

## Características principales

- **Generación de apps por IA** — Genera apps dinámicamente vía LLM con streaming SSE
- **UI estilo macOS** — Barra de menú de vidrio esmerilado, efecto de ampliación del Dock, botones de semáforo, búsqueda Spotlight
- **Gestión completa de ventanas** — Arrastrar, redimensionar, minimizar, maximizar, anclar, Cmd+Tab
- **Sistema de archivos virtual** — Basado en localStorage + IndexedDB, 7 directorios por defecto, CRUD completo
- **Sandbox de seguridad de tres capas** — Aislamiento iframe + lista blanca postMessage (30 API) + VibeOSAPI
- **Frontend puro** — Cero dependencias de framework, cero pasos de compilación, se ejecuta directamente en el navegador
- **Sistema de iconos vectoriales** — Biblioteca de iconos SVG pura, sin dependencias de emoji, sin recursos de imagen
- **Temas claro y oscuro** — Sistema de tokens de diseño basado en variables CSS, cambio con un clic

## Aplicaciones integradas

| Aplicación | ID | Descripción |
|------|----|------|
| Files | `files` | Gestor de archivos de doble panel |
| TextEdit | `notepad` | Editor de texto con resaltado de sintaxis |
| VibeCode | `vibecode` | IDE de código de tres paneles |
| Terminal | `terminal` | Emulador de terminal con autocompletado Tab |
| Browser | `browser` | Navegador integrado con marcadores e historial |
| AI Chat | `aichat` | Chat IA estilo macOS |
| Music | `music` | Reproductor de música Web Audio API |
| Calculator | `calculator` | Calculadora estándar con soporte de teclado |
| SysMon | `sysmon` | Panel de monitoreo del sistema |
| App Store | `app-store` | Mercado de apps impulsado por IA (12+ apps) |
| Settings | `settings` | Configuración del sistema (fondo/tema/LLM) |
| Snake | `snake` | Juego clásico Snake |
| Tetris | `tetris` | Juego clásico Tetris |
| LLM API | `llm-api` | Panel de configuración LLM |
| Viewer | `imageview` | Visor de imágenes (zoom/rotación) |

La App Store también incluye Clock, Paint, TaskMgr, Weather y más.

## Inicio rápido

### Requisitos previos

- Navegador moderno (Chrome / Edge / Safari / Firefox)
- Clave API LLM (opcional, modo Mock disponible sin clave)

### Lanzamiento

```bash
# Opción 1: Abrir directamente
open index.html

# Opción 2: Servidor local (recomendado, evita problemas CORS)
python3 -m http.server 8080
# Luego visita http://localhost:8080
```

### Configurar LLM

Tras lanzar VibeOS, haz clic en **VibeOS > Configuración LLM** en la barra de menú, o abre la app **LLM API** desde el Dock:

- Provider: `openai` (cualquier API compatible con OpenAI)
- API Endpoint: Tu URL de API
- API Key: Tu clave secreta
- Model: Nombre del modelo

La configuración se guarda automáticamente en localStorage.

## Arquitectura

```
┌─────────────────────────────────────┐
│            Navegador                 │
│  ┌───────────────────────────────┐  │
│  │        Host VibeOS            │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │Escrit│ │ Menú │ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │  Gestor de ventanas      │ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ Sandbox iframe    │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │ App generada  │ │   │ │  │
│  │  │  │ │    por IA     │ │   │ │  │
│  │  │  │ └──────────────┘ │   │ │  │
│  │  │  └──────────────────┘   │ │  │
│  │  └──────────────────────────┘ │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │   VFS    │ │AppGenerator│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │   LLM API   │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### Modelo de seguridad

```
Acción de usuario → App iframe → postMessage → Verificación whitelist → VibeOSAPI → Ejecución del sistema
                        ↑                                                          │
                        └────────────────── Retorno de resultado ──────────────────┘
```

Solo se permiten 30 llamadas API predefinidas, que cubren sistema de archivos, portapapeles, notificaciones, control de ventanas, almacenamiento, proxy de red y llamadas LLM.

## Atajos de teclado

| Atajo | Acción |
|--------|------|
| `Cmd + Space` | Abrir búsqueda Spotlight |
| `Cmd + Tab` | Cambiar de aplicación |
| `Cmd + W` | Cerrar ventana actual |
| `Cmd + M` | Minimizar ventana actual |
| `Cmd + Shift + D` | Panel de diagnóstico |
| `Escape` | Cerrar Spotlight |

## Privacidad

**VibeOS es una aplicación web de frontend puro. Todos los datos se almacenan localmente en tu navegador.**

- **Clave API LLM**: Tu clave API, endpoint y modelo se almacenan solo en el `localStorage` del navegador.
- **Solicitudes LLM**: Durante la generación de apps, tu navegador envía solicitudes **directamente** a tu endpoint API LLM configurado.
- **Datos locales**: El sistema de archivos virtual, registros de instalación y cachés se almacenan en `localStorage` / `IndexedDB`.
- **Sin telemetría**: VibeOS no recopila, informa ni transmite ningún dato de comportamiento del usuario.
- **Funcionamiento sin conexión**: Las funciones principales (gestión de archivos, configuración, juegos) funcionan completamente sin conexión.

> ⚠️ **Nota**: Las funciones relacionadas con LLM requieren conexión a Internet para llamar a APIs de terceros. Se aplica la política de privacidad de tu proveedor LLM.

---

## License

MIT
