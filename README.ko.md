<div align="center">

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · 한국어 · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Русский](README.ru.md)

</div>

---

<h1 id="ko">VibeOS</h1>

> AI 기반 macOS 스타일 웹 데스크톱 OS — AI가 실시간으로 앱을 생성합니다.

## VibeOS란?

VibeOS는 브라우저에서 실행되는 데스크톱 운영체제로, macOS Aqua 스타일 UI를 갖추고 있습니다. 기존 OS와 달리 앱은 **미리 작성되지 않습니다** — 대신 대규모 언어 모델(LLM)이 시스템 프롬프트에 따라 HTML/CSS/JS 코드를 **실시간 생성**하여 iframe 샌드박스 내에서 안전하게 실행됩니다. 아이디어만 있으면 AI가 완전한 데스크톱 앱을 만들어 줍니다.

- **버전**: 0.2.0
- **빌드**: Phase 1 — macOS Aqua Style

## 핵심 기능

- **AI 앱 생성** — LLM으로 데스크톱 앱 동적 생성, SSE 스트리밍 출력 지원
- **macOS 스타일 UI** — 반투명 메뉴바, Dock 확대 효과, 신호등 창 버튼, Spotlight 검색
- **완전한 창 관리** — 드래그, 크기 조절, 최소화, 최대화, 스냅, Cmd+Tab 전환
- **가상 파일 시스템** — localStorage + IndexedDB 기반, 7개 기본 디렉터리, 전체 CRUD 지원
- **3중 보안 샌드박스** — iframe 격리 + postMessage 화이트리스트(30 API) + VibeOSAPI
- **순수 프론트엔드** — 프레임워크 의존성 제로, 빌드 단계 제로, 브라우저에서 직접 실행
- **벡터 아이콘 시스템** — 순수 SVG 아이콘 라이브러리, 이모지 의존성 제로, 이미지 리소스 제로
- **라이트/다크 테마** — CSS 변수 기반 디자인 토큰 시스템, 원클릭 전환

## 내장 앱

| 앱 | ID | 설명 |
|------|----|------|
| Files | `files` | 듀얼 패널 파일 관리자 |
| TextEdit | `notepad` | 구문 강조 지원 텍스트 편집기 |
| VibeCode | `vibecode` | 3패널 레이아웃 코드 IDE |
| Terminal | `terminal` | Tab 자동완성 지원 터미널 에뮬레이터 |
| Browser | `browser` | 북마크 및 방문 기록 지원 내장 브라우저 |
| AI Chat | `aichat` | macOS 스타일 AI 채팅 |
| Music | `music` | Web Audio API 음악 플레이어 |
| Calculator | `calculator` | 키보드 지원 표준 계산기 |
| SysMon | `sysmon` | 시스템 모니터링 대시보드 |
| App Store | `app-store` | AI 앱 마켓플레이스 (12+ 앱) |
| Settings | `settings` | 시스템 설정 (배경화면/테마/LLM) |
| Snake | `snake` | 클래식 스네이크 게임 |
| Tetris | `tetris` | 클래식 테트리스 |
| LLM API | `llm-api` | LLM 구성 패널 |
| Viewer | `imageview` | 이미지 뷰어 (확대/회전) |

App Store에는 Clock, Paint, TaskMgr, Weather 등 더 많은 앱이 포함되어 있습니다.

## 빠른 시작

### 필요 조건

- 최신 브라우저 (Chrome / Edge / Safari / Firefox)
- LLM API 키 (선택 사항, 키 없이 Mock 모드 사용 가능)

### 실행

```bash
# 방법 1: 직접 열기
open index.html

# 방법 2: 로컬 서버 (권장, CORS 문제 방지)
python3 -m http.server 8080
# http://localhost:8080 접속
```

### LLM 구성

VibeOS 실행 후 메뉴바의 **VibeOS > LLM 설정** 또는 Dock의 **LLM API** 앱에서 입력:

- Provider: `openai` (OpenAI 호환 API 지원)
- API Endpoint: API 주소
- API Key: 비밀 키
- Model: 모델 이름

설정은 자동으로 localStorage에 저장됩니다.

## 아키텍처

```
┌─────────────────────────────────────┐
│              브라우저                 │
│  ┌───────────────────────────────┐  │
│  │         VibeOS 호스트         │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │Desktop│ │Menubar│ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │    Window Manager         │ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ iframe Sandbox    │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │ AI-Generated  │ │   │ │  │
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

### 보안 모델

```
사용자 작업 → 앱 iframe → postMessage → 화이트리스트 검증 → VibeOSAPI → 시스템 실행
                   ↑                                                      │
                   └──────────────── 결과 반환 ───────────────────────────┘
```

30개의 사전 정의된 API 호출만 허용되며, 파일 시스템, 클립보드, 알림, 창 제어, 저장소, 네트워크 프록시, LLM 호출 등을 포함합니다.

## 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Cmd + Space` | Spotlight 검색 열기 |
| `Cmd + Tab` | 앱 전환 |
| `Cmd + W` | 현재 창 닫기 |
| `Cmd + M` | 현재 창 최소화 |
| `Cmd + Shift + D` | 진단 패널 |
| `Escape` | Spotlight 닫기 |

## 개인정보 보호

**VibeOS는 순수 프론트엔드 웹 앱입니다. 모든 데이터는 브라우저에 로컬로 저장됩니다.**

- **LLM API 키**: API 키, 엔드포인트, 모델 설정은 브라우저의 `localStorage`에만 저장됩니다.
- **LLM 요청**: 앱 생성 중 브라우저는 구성된 LLM API 엔드포인트로 **직접** 요청을 보냅니다.
- **로컬 데이터**: 가상 파일 시스템, 앱 설치 기록, 캐시는 모두 로컬 `localStorage` / `IndexedDB`에 저장됩니다.
- **원격 측정 없음**: VibeOS는 사용자 행동 데이터를 수집, 보고, 전송하지 않습니다.
- **오프라인 작동**: 핵심 기능(파일 관리, 설정, 게임 등)은 완전히 오프라인으로 작동합니다.

> ⚠️ **참고**: LLM 관련 기능은 타사 API 호출을 위해 인터넷 연결이 필요합니다. 선택한 LLM 제공업체의 개인정보 보호정책이 적용됩니다.

---

## License

MIT
