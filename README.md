# Remotion Animasi Paper Lightbox

Bilingual **AI Agent Multi-Skill Repository** for directing and producing programmatic **3D Layered Paper-cut Lightbox (*Shadow Box* / 纸雕灯影)** animated videos from scratch using **Remotion**, **Three.js (`@react-three/fiber`)**, and **ElevenLabs v4**.

Visual grammar and shader architecture adapted from [`lemomo-ai/lemo-opuscar`](https://github.com/lemomo-ai/lemo-opuscar) (`styles/paper-lantern`, pinned commit `8ca0dd805e214bcc1d30714cd5b9d21cc02a454b`).

Compatible with **Antigravity**, **Cursor**, **Windsurf**, **Claude Code**, and the **`npx skills`** CLI (`agentskills.io` specification).

---

## Included Skills

| Skill Name | Language | Path | Description |
|---|---|---|---|
| `remotion-animasi-paper-lightbox-id` | Bahasa Indonesia | [`skills/remotion-animasi-paper-lightbox-id`](skills/remotion-animasi-paper-lightbox-id/SKILL.md) | Sutradara interaktif animasi Paper-cut Lightbox 3D berbahasa Indonesia (GATE 1–7, VO-first, Remotion + Three.js + `-14 LUFS`). |
| `remotion-animasi-paper-lightbox-en` | English | [`skills/remotion-animasi-paper-lightbox-en`](skills/remotion-animasi-paper-lightbox-en/SKILL.md) | Interactive 3D Paper-cut Lightbox director in English (GATE 1–7, VO-first, Remotion + Three.js + `-14 LUFS`). |

---

## Installation

### Option 1: Universal CLI (`npx skills`)

Install all skills in this repository:

```bash
npx skills add Shiroizx/remotion-animasi-paper-lightbox
```

Or install only one language skill:

```bash
# Bahasa Indonesia
npx skills add Shiroizx/remotion-animasi-paper-lightbox --skill remotion-animasi-paper-lightbox-id

# English
npx skills add Shiroizx/remotion-animasi-paper-lightbox --skill remotion-animasi-paper-lightbox-en
```

### Option 2: Manual Installation per AI Agent

Copy the desired skill folder (`skills/remotion-animasi-paper-lightbox-id` or `skills/remotion-animasi-paper-lightbox-en`) into your agent's skills directory:

| AI Agent / IDE | Project-Level Directory | Global Directory |
|---|---|---|
| **Antigravity / Cross-Agent** | `.agents/skills/<skill-name>/` | `~/.agents/skills/<skill-name>/` |
| **Claude Code** | `.claude/skills/<skill-name>/` | `~/.claude/skills/<skill-name>/` |
| **Cursor** | `.cursor/skills/<skill-name>/` *(or `.agents/skills/`)* | `~/.cursor/skills/<skill-name>/` |
| **Windsurf** | `.windsurf/skills/<skill-name>/` *(or `.agents/skills/`)* | `~/.codeium/windsurf/skills/<skill-name>/` |

---

## Prerequisites

- **Node.js 20+** and **npm**
- **Git** (optional, only if you approve the pinned read-only reference checkout of `lemo-opuscar` in GATE 3)
- **ElevenLabs account** (for Eleven v4 voiceover generation)
- **Remotion Headless Browser & FFmpeg** (automatically resolved from `@remotion/compositor-*` or system `PATH`)

---

## Core Visual & Technical Architecture

- **6–9 Layered Paper Sheets in 3D Space (`z = -0.14 m` to `0 m`):** Procedural Canvas 2D cutouts (`destination-out`) with fibre grain, warm top-edge rim light, and dark bottom-edge thickness shade.
- **Value Ladder & Backlight Shader:** Far sheets are brighter and more translucent (`trans ≈ 0.85–0.95`), stepping down to near-opaque foreground silhouettes (`trans ≈ 0.05–0.12`), lit by a procedural pulp-mottle backlight shader (`onBeforeCompile`).
- **Real VSM Soft Shadows:** Top LED `SpotLight` casting soft shadows across depth layers via `THREE.VSMShadowMap` and silhouette-matched `customDepthMaterial` (`alphaTest: 0.5`).
- **Emissive Holes + Physical DoF + Bloom:** Separate `glowMap` channels for lit windows, moons, and lanterns paired with 2× SSAA, 2-pass physical depth-of-field rack focus (anti-halo bleeding), `UnrealBloomPass` (`threshold > 1.0`), and neutral/ACES tone mapping (0 film grain).
- **Two Framing Modes:** *Full-Bleed* (lens inside the shadow box, adapted for `9:16` Portrait, `16:9` Landscape, and `1:1` Square) and *Box Framing* (real wooden shadow box resting on a dark table with spill light).
- **Living Characters & Animated Hero Objects:** Mandatory colored multi-part `ax/ay`-jointed paper characters with periodic eye blinks, frame-synced mouth animation (`closed`/`half`/`open`/`o`/`smile`/`tense`), and active hero mechanisms (rotating wheels, steam puffs, hinged doors spilling light, subtle engine rumble), alongside detailed architecture, fauna, background NPCs, and foreground depth framing.
- **VO-First Pipeline, Tactile Micro-SFX & `-14 LUFS` Mastering:** 1× ElevenLabs v4 voiceover generation → FFmpeg `silencedetect` mapping → procedural 3-layer stems (`music`, `ambience`, frame-synced granular *micro-SFX* such as whistles, rail clacks, brake stops, footsteps, and door open/close + 2+ *Hard Silence Beats*) → two-pass EBU R128 `-14 LUFS` WAV master via `mix-master-audio-template.mjs`.

---

## Repository Structure

```text
./
├── README.md
├── LICENSE
└── skills/
    ├── remotion-animasi-paper-lightbox-id/
    │   ├── SKILL.md
    │   └── references/
    │       ├── elevenlabs-v4-guide.md
    │       ├── paper-lightbox-technical-standards.md
    │       └── mix-master-audio-template.mjs
    └── remotion-animasi-paper-lightbox-en/
        ├── SKILL.md
        └── references/
            ├── elevenlabs-v4-guide.md
            ├── paper-lightbox-technical-standards.md
            └── mix-master-audio-template.mjs
```

---

## Credits & License

- Released under the [MIT License](LICENSE).
- Paper-cut Lightbox style grammar, backlight translucency formulas, and shader techniques adapted from [`lemomo-ai/lemo-opuscar`](https://github.com/lemomo-ai/lemo-opuscar) (`styles/paper-lantern`, MIT/open-source reference).
