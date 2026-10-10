# 🏢 Interior 302 &bull; Interactive 3D Web Walkthrough Engine

An enterprise-grade, high-performance **Architectural 3D Walkthrough** built with Three.js (r128), Tailwind CSS, and WebRTC. Designed for photorealistic interior visualization of **Residence 302 (1BHK Executive Studio D+B &bull; 550 sqft)** with CAD-aligned geometry, real-time procedural PBR materials, 360° HDR skies, spatial audio, and peer-to-peer multiplayer co-presence.

---

## 🌟 Key Highlights & Capabilities

### 1. 📐 Architectural Accuracy & CAD Alignment
- **Dimensional Fidelity:** Modeled directly from architectural CAD layout drawings (Balcony 16'-9" / 5.10m scale, partition walls at 0.12m, exterior envelope at 0.23m).
- **Interactive Doors & Sliders:** Inward-swinging entrance, bedroom, and bathroom doors; smooth horizontal sliding balcony glass door.
- **Dynamic 2D Floor Plan:** Interactive pop-up CAD overlay (`assets/plan_overlay.png`) with one-click direct room teleports (Foyer, Living, Dining, Balcony, Kitchen, Suite, Toilet).

### 2. 🚶 Dual Navigation Modes
- **Free Walk Mode:** Smooth first-person exploration with WASD / Arrow keys on PC and dual-zone virtual joystick on touch devices. Includes collision sliding, natural standing eye-height (1.55m), and chair sitting (1.05m seated eye-level).
- **Executive Tour Mode:** Curated architectural vantage points with smooth camera tweening and station carousel dock (Foyer &rarr; Living Lounge &rarr; Dining &rarr; East Balcony &rarr; Modular Kitchen &rarr; Bedroom Suite &rarr; En-suite Bathroom).

### 3. 🎨 Procedural PBR Material Engine & Lighting
- **High-End Interior Materials:** Smoked French Oak Parquet Flooring, Calacatta Gold Quartz countertops, Travertine tile surfaces, and Heather Sand boucle upholstery.
- **Lighting & Ambiance Presets:**
  - ☀️ **Daylight:** Crisp 360° outdoor skybox with directional sunlight.
  - 🌇 **Golden Hour / Evening:** Warm sunset horizon and soft interior amber glows.
  - 🌙 **Architectural Night:** Twilight exterior with warm recessed LED ceiling downlights.
- **Visual Controls Drawer:** Live exposure sliders, sun intensity, ambient fill, and soft shadow radius tuning.

### 4. 🧭 Real-Time Top Radar Minimap & Spatial HUD
- **Top-Right Spatial Radar:** Live bird's-eye architectural minimap showing player coordinates (`X, Z`) and direction cone.
- **Collapsible & Configurable:** One-click chevron collapse/expand and dynamic on/off toggle in the Settings Drawer.
- **3D Tape Measure Tool:** Real-time point-to-point laser measurement with millimeter accuracy and floating 3D billboarding dimension badges.

### 5. 👥 Peer-to-Peer WebRTC Multiplayer & Spatial 3D Audio
- **Instant Room Codes:** 5-character shareable room codes (`?room=ABCDE`) using PeerJS (zero private relay servers required).
- **Live Avatar Customizer:** Dynamic real-time style switcher (Hover Bot, Cute Robot, Classic, Male, Female, VR Player) and 8 curated architectural palette colors.
- **Spatial Audio & Non-Overlapping Spawns:** Web Audio HRTF directional voice chat with audio-reactive visualizers, wave emotes, and distributed executive spawn positioning.

---

## 📁 Directory Structure

```
interiordemo/
├── README.md                           # Documentation & Overview
├── index.html                          # Production Entry Point (Standard Release)
│
├── js/                                 # Production JavaScript Plugins
│   ├── multiplayer_plugin.js           # Multi-user WebRTC & Spatial Audio Engine
│   └── legacy/                         # Archived / Backup Plugin Versions
│       ├── multiplayer_plugin_old.js
│       └── multiplayer_plugin5characyers.js
│
├── assets/                             # Visual Runtime Assets & References
│   ├── plan_overlay.png                # Active 2D Floor Plan CAD Overlay
│   └── references/                     # Source PDF & CAD High-Resolution Crops
│       ├── MICRO HOUSING_FLOOR PLANS LAYOUT_-05-10-2026.pdf
│       ├── full_plan_300dpi.png
│       ├── bottom_cluster_crop.png
│       ├── top_cluster_crop.png
│       ├── unit_3_crop.png
│       └── unit_9_crop.png
│
├── models/                             # 3D GLTF / GLB Architectural Models
│   ├── unit_3_new.glb                  # Production Optimized 3D Apartment Model
│   └── archive/                        # Prior Revisions
│       └── unit_3.glb
│
├── textures/                           # 360° Panoramic HDR Skies & Environment Maps
│   ├── golden_gate_hills.hdr           # Daytime 360° HDR Skybox
│   ├── skybox_outdoor.hdr              # Evening / Sunset 360° HDR Skybox
│   └── raw_exr/                        # Raw High-Bitrate Source EXRs
│       ├── golden_gate_hills_1k.exr
│       └── quadrangle_sunny_1k.exr
│
├── threejs/                            # Three.js Core Engine & Decoders
│   ├── three.min.js
│   ├── GLTFLoader.js
│   ├── DRACOLoader.js
│   ├── RoomEnvironment.js
│   ├── RGBELoader.js
│   ├── peerjs.min.js
│   └── draco/
│
└── tools/                              # Procedural 3D Generators & Extraction Scripts
    ├── generate_unit3_glb_new.py
    └── generate_unit_3_glb.py
```

---

## 🚀 How to Run Locally

Because the application loads local GLTF models (`.glb`), Draco decoders, and HDR textures via `fetch()`, run via a local HTTP server:

### Option 1: Python HTTP Server (Built-in)
```bash
# From workspace root
python -m http.server 8000
```
Open in browser:
```
http://localhost:8000/interiordemo/
# or
http://localhost:8000/interiordemo/index.html
```

### Option 2: Node.js `npx serve` or `http-server`
```bash
npx serve .
# or
npx http-server -p 8000
```

---

## 🎮 Navigation & Controls Reference

| Action | Desktop (Mouse & Keyboard) | Mobile & Tablet (Touch) |
| :--- | :--- | :--- |
| **Move / Walk** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>&uarr;</kbd> <kbd>&larr;</kbd> <kbd>&darr;</kbd> <kbd>&rarr;</kbd> | Left on-screen floating virtual joystick |
| **Look Around** | Click canvas (Pointer Lock) or Click + Drag | Swipe / drag across right half of screen |
| **Interact (Doors / TV)** | Click target or press <kbd>E</kbd> when aimed | Tap directly on doors, TV, or chairs |
| **Sit on Chairs / Sofa** | Aim and click seat or press <kbd>E</kbd> | Tap chair/sofa |
| **Stand Up** | Move <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or click on-screen Stand Up button | Tap on-screen **Stand Up** button |
| **Tape Measure** | Click ruler icon &bull; Click two points on walls | Click ruler icon &bull; Tap two points |
| **2D Floor Plan** | Click Map icon in top toolbar | Click Map icon in top toolbar |
| **Settings Drawer** | Click Sliders icon in top toolbar | Click Sliders icon in top toolbar |
| **Multiplayer Voice / Room** | Click Multiplayer icon &bull; Share Room Code | Click Multiplayer icon &bull; Share Room Code |

---

## 🌐 Browser Compatibility & Requirements

- **Supported Browsers:** Chrome 90+, Edge 90+, Firefox 88+, Safari 14+ (macOS / iOS / iPadOS), Android Chrome.
- **Hardware Acceleration:** WebGL 2.0 supported GPU.
- **Audio & Microphone:** Required for WebRTC 3D spatial voice features.
