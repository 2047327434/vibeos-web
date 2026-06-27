<div align="center">

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Français](README.fr.md) · Deutsch · [Español](README.es.md) · [Русский](README.ru.md)

</div>

---

<h1 id="de">VibeOS</h1>

> Ein KI-gestütztes macOS-ähnliches Web-Desktop-Betriebssystem — wo KI Apps in Echtzeit generiert.

## Was ist VibeOS?

VibeOS ist ein Desktop-Betriebssystem, das im Browser läuft und eine macOS Aqua-ähnliche Benutzeroberfläche bietet. Anders als traditionelle Betriebssysteme sind seine Apps **nicht vorab geschrieben** — stattdessen **generiert** ein Large Language Model (LLM) HTML/CSS/JS-Code **in Echtzeit** basierend auf System-Prompts und führt diesen sicher in iframe-Sandboxen aus. Sie brauchen nur eine Idee, und die KI erstellt eine vollständige Desktop-App für Sie.

- **Version**: 0.2.0
- **Build**: Phase 1 — macOS Aqua Style

## Kernfunktionen

- **KI-App-Generierung** — Dynamische App-Erstellung via LLM mit SSE-Streaming
- **macOS-ähnliche UI** — Milchglas-Menüleiste, Dock-Vergrößerungseffekt, Ampelfenster-Schaltflächen, Spotlight-Suche
- **Vollständige Fensterverwaltung** — Ziehen, Größenänderung, Minimieren, Maximieren, Andocken, Cmd+Tab
- **Virtuelles Dateisystem** — Basierend auf localStorage + IndexedDB, 7 Standardverzeichnisse, volles CRUD
- **Dreistufige Sicherheits-Sandbox** — iframe-Isolation + postMessage-Whitelist (30 APIs) + VibeOSAPI
- **Reines Frontend** — Keine Framework-Abhängigkeiten, keine Build-Schritte, direkt im Browser ausführbar
- **Vektor-Iconsystem** — Reine SVG-Icon-Bibliothek, keine Emoji-Abhängigkeiten, keine Bildressourcen
- **Helle & dunkle Themes** — CSS-Variablen-gesteuertes Design-Token-System, Ein-Klick-Umschaltung

## Integrierte Apps

| App | ID | Beschreibung |
|------|----|------|
| Files | `files` | Zwei-Fenster-Dateimanager |
| TextEdit | `notepad` | Texteditor mit Syntaxhervorhebung |
| VibeCode | `vibecode` | Drei-Fenster-Code-IDE |
| Terminal | `terminal` | Terminal-Emulator mit Tab-Vervollständigung |
| Browser | `browser` | Eingebetteter Browser mit Lesezeichen & Verlauf |
| AI Chat | `aichat` | macOS-ähnlicher KI-Chat |
| Music | `music` | Web Audio API Musikplayer |
| Calculator | `calculator` | Standard-Taschenrechner mit Tastaturunterstützung |
| SysMon | `sysmon` | Systemüberwachungs-Dashboard |
| App Store | `app-store` | KI-App-Marktplatz (12+ Apps) |
| Settings | `settings` | Systemeinstellungen (Hintergrund/Theme/LLM) |
| Snake | `snake` | Klassisches Snake-Spiel |
| Tetris | `tetris` | Klassisches Tetris-Spiel |
| LLM API | `llm-api` | LLM-Konfigurationspanel |
| Viewer | `imageview` | Bildbetrachter (Zoom/Drehung) |

Der App Store enthält auch Clock, Paint, TaskMgr, Weather und weitere Apps.

## Schnellstart

### Voraussetzungen

- Moderner Browser (Chrome / Edge / Safari / Firefox)
- LLM API-Schlüssel (optional, Mock-Modus ohne Schlüssel verfügbar)

### Start

```bash
# Option 1: Direkt öffnen
open index.html

# Option 2: Lokaler Server (empfohlen, vermeidet CORS-Probleme)
python3 -m http.server 8080
# Dann http://localhost:8080 besuchen
```

### LLM konfigurieren

Nach dem Start auf **VibeOS > LLM-Einstellungen** in der Menüleiste klicken oder die **LLM API**-App vom Dock öffnen:

- Provider: `openai` (jede OpenAI-kompatible API)
- API Endpoint: Ihre API-URL
- API Key: Ihr geheimer Schlüssel
- Model: Modellname

Die Konfiguration wird automatisch in localStorage gespeichert.

## Architektur

```
┌─────────────────────────────────────┐
│             Browser                  │
│  ┌───────────────────────────────┐  │
│  │         VibeOS Host           │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │Desktop│ │Menü   │ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │  Fenstermanager           │ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ iframe-Sandbox    │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │ KI-generierte │ │   │ │  │
│  │  │  │ │     App       │ │   │ │  │
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

### Sicherheitsmodell

```
Benutzeraktion → App-iframe → postMessage → Whitelist-Prüfung → VibeOSAPI → Systemausführung
                      ↑                                                         │
                      └───────────────── Ergebnisrückgabe ──────────────────────┘
```

Nur 30 vordefinierte API-Aufrufe sind erlaubt, die Dateisystem, Zwischenablage, Benachrichtigungen, Fenstersteuerung, Speicher, Netzwerkproxy und LLM-Aufrufe abdecken.

## Tastenkürzel

| Kürzel | Aktion |
|--------|------|
| `Cmd + Space` | Spotlight-Suche öffnen |
| `Cmd + Tab` | App-Wechsler |
| `Cmd + W` | Aktuelles Fenster schließen |
| `Cmd + M` | Aktuelles Fenster minimieren |
| `Cmd + Shift + D` | Diagnosepanel |
| `Escape` | Spotlight schließen |

## Datenschutz

**VibeOS ist eine reine Frontend-Webanwendung. Alle Daten werden lokal in Ihrem Browser gespeichert.**

- **LLM API-Schlüssel**: Ihr API-Schlüssel, Endpunkt und Modell werden nur im `localStorage` des Browsers gespeichert.
- **LLM-Anfragen**: Bei der App-Generierung sendet Ihr Browser Anfragen **direkt** an Ihren konfigurierten LLM-API-Endpunkt.
- **Lokale Daten**: Das virtuelle Dateisystem, App-Installationsdatensätze und Caches werden alle in lokalem `localStorage` / `IndexedDB` gespeichert.
- **Keine Telemetrie**: VibeOS sammelt, meldet oder überträgt keine Benutzerverhaltensdaten.
- **Offline-Betrieb**: Kernfunktionen (Dateiverwaltung, Einstellungen, Spiele) funktionieren vollständig offline.

> ⚠️ **Hinweis**: LLM-bezogene Funktionen benötigen eine Internetverbindung für Drittanbieter-API-Aufrufe. Die Datenschutzrichtlinie Ihres gewählten LLM-Anbieters gilt.

---

## License

MIT
