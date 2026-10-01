<div align="center">

# 🏠 InteriorSpace 3D

**A first-person, browser-based walkthrough for interior designs.**
Walk through a `.glb` scene, click any product, see its price, photos and details.

`Three.js` · `No build step` · `Static hosting` · `Desktop + Mobile`

</div>

---

## ✨ Features

- WASD / drag-to-look on desktop, joystick + swipe on mobile
- Click a product → outline, colour tint, and a **callout card beside it** joined by a line
- Product data comes from a simple `walkthrough.json` (no code changes)
- Lights from your GLB are supported, plus a built-in lighting rig
- Settings drawer: themes, outline / selection / reticle colours, lighting, FOV, speed, quality (saved per browser)

## 📁 Folder layout

```
your-repo/
├── index.html          ← this app
├── walkthrough.json    ← scene + product data
├── scene.glb           ← your model
├── img/                ← product photos
└── README.md
```

## 🚀 Host on GitHub Pages

1. Push these files to a repo.
2. **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
3. Open `https://<user>.github.io/<repo>/`.

### Will the JSON load? **Yes.**
`index.html` fetches `walkthrough.json` with a *relative* path, so it works on Pages as long as:

| ✅ Do | ❌ Avoid |
|---|---|
| Keep `walkthrough.json`, `scene.glb`, `img/` next to `index.html` | Opening `index.html` by double-click (`file://` blocks `fetch`) |
| Match file-name **case** exactly (Pages is case-sensitive: `Scene.glb` ≠ `scene.glb`) | Absolute paths like `/img/a.jpg` (breaks under `/<repo>/`) |
| Use paths **relative to the JSON** for `glb` and `images` | Files over 100 MB (GitHub limit; compress with Draco) |

**Test locally:** `python3 -m http.server` → open `http://localhost:8000`.
**Other config:** `index.html?config=other.json` loads a different JSON.

## 🧾 `walkthrough.json` reference

| Key | Meaning |
|---|---|
| `title` | Name shown in the header and browser tab |
| `glb` | Path to the model |
| `startCamera` | Name of a camera in the GLB used as spawn point |
| `eyeHeight` | Eye level in metres |
| `bounds` | Walkable area `{min:[x,z], max:[x,z]}` |
| `colliders` | Node names players can't walk through (`Wall_*` = prefix match) |
| `lighting` | See below |
| `products[]` | `node`, `name`, `tag`, `price`, `description`, `images[]`, `narration`, `sku`, `maker` |

`node` is the object's name in the GLB; `Lamp*` matches every node starting with `Lamp`.

## 💡 Lighting

Two sources work together:

1. **Lights inside your GLB** (Blender/Unreal export with *Punctual Lights* on) are loaded automatically.
   When present, the built-in rig is dimmed so your lighting leads.
2. **Built-in rig** (ambient + sun + fill) with presets: Day, Warm, Cool, Studio.

```json
"lighting": { "preset": "warm", "exposure": 1.2, "rig": 0.35, "glbScale": 1 }
```

| Key | Effect |
|---|---|
| `preset` | `daylight` · `warm` · `cool` · `studio` |
| `exposure` | Overall brightness |
| `rig` | Strength of the built-in rig (0 = off, 1 = full) |
| `glbScale` | Multiplier for GLB lights |

> **Tip:** Blender exports light power in watts, which can look blown out. If the scene is too bright, set `glbScale` to `0.01`–`0.1`.
> For best quality and speed, **bake lighting into textures** in Blender, then use the `studio` preset with a low `rig`.

## ⚙️ Settings

Open the sliders icon (top right, or on the welcome card). Choices are saved in the browser. *Reset to defaults* restores everything. Default theme is **Minimal**.

## 🛠 Troubleshooting

- **Stuck on sample room:** open DevTools → Console; usually a wrong path or filename case.
- **Product not clickable:** the `node` name doesn't match the GLB (see console warning).
- **Too dark / bright:** adjust *Brightness* and *GLB light power* in Settings.
