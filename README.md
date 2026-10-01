<div align="center">

# 🏠 InteriorSpace 3D

### Walk through a 3D interior. Click anything. Buy what you love.

A first-person, browser-based showroom built on **Three.js**.
Drop in a `.glb`, describe your products in a JSON file, and publish on any static host.

**Developed by [Razel Tech](#-credits)**

![Three.js](https://img.shields.io/badge/Three.js-r128-black?logo=three.js)
![No build step](https://img.shields.io/badge/build-none-2ea44f)
![Hosting](https://img.shields.io/badge/hosting-static-blue)
![Devices](https://img.shields.io/badge/desktop%20%2B%20mobile-✔-orange)

</div>

---

## ✨ Highlights

| | |
|---|---|
| 🚶 **First-person walkthrough** | WASD + mouse on desktop, joystick + swipe on mobile, with wall collisions and walkable bounds |
| 🛍 **Click any product** | Outline, colour tint, a soft spotlight, and a callout card with price, details and audio narration |
| 🔄 **Holographic 3D preview** | No photos? The selected model itself floats on a glowing holo-projector stage with scan lines. Drag to turn it; it resumes spinning when you let go |
| 💡 **Realistic lighting** | sRGB colour, studio environment reflections, soft shadows, GLB lights and **emissive materials** (glowing signs, LEDs, screens) |
| 🗣 **Voice narration** | Uses the device's default voice (numbers always spoken in English), optional per-language voices, or your own recorded audio |
| ▶️ **Product animations** | Products with GLB animation clips get a Play / Pause / Replay button, shown in both the room and the 3D preview |
| 🧾 **Data-driven** | Products live in `walkthrough.json`. No code changes needed |
| 🎛 **Settings drawer** | Themes, outline / selection / reticle colours, lighting, FOV, speed, quality (saved per browser) |

## 📁 Folder layout

```
your-repo/
├── index.html          ← the app
├── walkthrough.json    ← scene + product data
├── scene.glb           ← your model
├── img/                ← optional product photos
└── README.md
```

## 🚀 Quick start

**Locally** (the `file://` protocol blocks `fetch`, so use a tiny server):

```bash
python3 -m http.server
# open http://localhost:8000
```

**GitHub Pages:** push the files → *Settings → Pages → Deploy from a branch → `main` / `(root)`* → open `https://<user>.github.io/<repo>/`.

Use `index.html?config=other.json` to load a different scene file.

### Path rules (Pages is case-sensitive)

| ✅ Do | ❌ Avoid |
|---|---|
| Keep `walkthrough.json`, `scene.glb`, `img/` next to `index.html` | Double-clicking `index.html` |
| Match file-name **case** exactly (`Scene.glb` ≠ `scene.glb`) | Absolute paths like `/img/a.jpg` |
| Use paths **relative to the JSON** for `glb` and `images` | Single files over 100 MB (compress with Draco) |

## 🔄 Product images vs. 3D preview

For each selected product the card decides automatically:

1. **Photos listed and loading** → image slideshow.
2. **No `images`, an empty list, or every file fails to load (404)** → the product's own 3D model is shown on a turntable.

The preview works in every theme (the hint badge and stage adapt to Minimal, Midnight, Sage and Slate).

So you can ship a catalogue immediately and add photos later, product by product. The preview uses a clone of the model, so rotating it never moves anything in the scene.

> Rotation is deliberately *yaw plus a limited tilt*: products always stay upright, the base never flips to the top, and the model's pivot point never causes odd orbits.

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
| `voiceLang` | Default narration language, e.g. `en-IN` (default), `hi-IN`, `te-IN` |
| `products[]` | `node`, `name`, `tag`, `price`, `description`, `images[]`, `narration`, `sku`, `maker`, plus optional `narrationLang`, `audio`, `animation`, `animationLoop` |

`node` is the object's name in the GLB; `Lamp*` matches every node starting with `Lamp`.

```json
{
  "node": "PRODUCT_Clamp",
  "name": "Clamp",
  "tag": "Garden",
  "price": "₹180",
  "description": "A sturdy clamp that holds connected components.",
  "images": [],
  "narration": "This is a Clamp.",
  "sku": "CLAMP",
  "maker": "Garden Essentials"
}
```

## 🗣 Voice narration

Turn it on with the speaker icon in the header. Narration plays when you select a product.

**Which voice?** By default the app prefers **Google Hindi** (with graceful fallback to any installed Hindi or Indian English voice, or device default) at normal speed and pitch. A different voice can be chosen in **Settings → Voice narration**, or per-product with `narrationLang` (or `voiceLang` in the JSON).

**Numbers are always read in English** for English narration (`Connector 01` → "Connector zero one", `₹1,200` → "one thousand two hundred rupees"), whatever voice the device uses, so a Hindi default voice still says them in English. Narration written in another language (e.g. Telugu) is not changed.

Open **Settings → Voice narration** to pick a voice by hand, change speed and pitch, and press *Play* to hear a sample.

```json
{ "node": "PRODUCT_Clamp", "narration": "ఇది ఒక క్లాంప్.", "narrationLang": "te-IN" }
```

| Want | Do this |
|---|---|
| A different language for one product | Write `narration` in that language and set `narrationLang` (`hi-IN`, `te-IN`, `ta-IN`, `kn-IN`, `ml-IN`, `bn-IN`…) |
| Same language everywhere | Set `"voiceLang": "te-IN"` at the top of `walkthrough.json` (leave it out to keep Google Hindi / default) |
| **Guaranteed, studio-quality voice** | Record or generate an mp3 and add `"audio": "audio/clamp.mp3"`. It plays instead of the browser voice and falls back to it if the file is missing |

> The browser can only use voices **installed on the visitor's device**. Edge and Android Chrome usually have good Indian voices; some desktop Chrome installs only have a Hindi one. For one identical voice on every device, use the `audio` field (neural TTS tools such as Azure *Neerja / Swara* or ElevenLabs can generate the files once).

## ▶️ Product animations

If your GLB contains animation clips (Blender: Action Editor / NLA, export with *Animation* on), the product card shows a **Play animation** button for products that have one.

- **Automatic matching:** a clip belongs to a product when it animates that product's node or anything inside it.
- **Manual matching:** `"animation": "Open"` or `["Open","Light"]`; use `"animation": false` to hide the button.
- **Loop:** plays on repeat by default. Use `"animationLoop": false` to play once; the button then becomes *Replay*.
- The button cycles Play → Pause → Resume. The animation plays in the room **and** in the 3D preview. Closing the card puts the product back in its rest pose.
- Clips that belong to **no** product (ambient motion such as a spinning fan in the background) simply keep playing.

```json
{ "node": "PRODUCT_Ballvalve", "animation": "Open", "animationLoop": false }
```

## 🔄 Rotate the selected object (optional)

Off by default, because the card's 3D preview already lets you turn the product. Enable **Settings → View & controls → Rotate selected object** to also turn it *in the room*:

- Drag with mouse or finger, or hold **Q / E** (or ← / →).
- Motion is smooth and has momentum, and it spins a full 360° with no limits.
- When it is off, Q / E and drag do nothing while a product is selected.

## ✨ Emission (glowing materials)

Emissive materials from your GLB are supported, including emissive **colour**, emissive **texture maps**, and **`KHR_materials_emissive_strength`** (Blender 3.x+ *Emission → Strength* above 1 is exported with this extension).

- Use **Settings → Lighting → Emission glow** to scale all emissive materials (0 = off, 1 = as authored).
- Selecting an emissive product keeps its authored glow; the selection tint is applied only to non-emissive materials. The outline still shows.
- Emission lights the object itself but does not light its surroundings. For a real light cast on nearby surfaces, add a light in Blender or **bake** the lighting.
- A bloom halo (glow bleeding into the air) is not enabled, since it costs performance on phones. It can be added as an optional "High" quality effect.

## 💡 Lighting guide

Three layers work together:

| Layer | What it does |
|---|---|
| **Studio environment** | A procedural sky + soft-box map gives all PBR materials natural ambient light and reflections. Strength: *Soft reflections* |
| **Sun, fill and ambient** | Presets: Day · Warm · Cool · Studio. The sun casts soft 2048px shadows |
| **GLB lights** | Lights exported from Blender/Unreal (*Punctual Lights* on) load automatically; the built-in rig dims to let them lead |
| **Product spotlight** | A soft light fades in over the selected product (toggle in Settings) |
| **Emission** | Emissive materials glow; scale with *Emission glow* |

```json
"lighting": { "preset": "warm", "exposure": 1.0, "rig": 0.35, "glbScale": 1 }
```

| Key | Effect |
|---|---|
| `preset` | `daylight` · `warm` · `cool` · `studio` |
| `exposure` | Overall brightness |
| `rig` | Strength of the built-in rig (0 = off, 1 = full) |
| `glbScale` | Multiplier for GLB lights |

**Tips**
- Blender exports light power in watts, which can look blown out. Set `glbScale` to `0.01`–`0.1`.
- Scene already has **baked lighting**? Set *Soft reflections* to `0`, use the `studio` preset and a low `rig`.
- Too bright or too dark? Adjust *Brightness* first, then *Soft reflections*.

## 🔐 Securing your project

A static site is public by design: anything the browser downloads can be copied. Protect what matters:

- **Never put secrets in the repo** (API keys, admin URLs, private pricing rules).
- **Protect the 3D asset itself.** Serve `scene.glb` from a host that supports signed URLs, hotlink protection or a login (Cloudflare R2/Workers, Netlify password, Vercel auth). Compress and *decimate* the public version so the full-quality source never leaves your machine.
- **Add a Content-Security-Policy** (needs a host that sets headers, e.g. Cloudflare, Netlify, Vercel; GitHub Pages can use a `<meta http-equiv>` tag).
- **Pin third-party scripts** with versions and [Subresource Integrity](https://developer.mozilla.org/docs/Web/Security/Subresource_Integrity) (`integrity="sha384-…" crossorigin`), or better, download them into the repo.
- **Do payments server-side.** Prices in JSON are display-only; never trust them for checkout.
- **Never inject JSON text with `innerHTML`.** This app uses `textContent`; keep it that way if you add fields.
- Minifying/obfuscating JavaScript only slows copying down. It is not security.

## 🛠 Troubleshooting

| Symptom | Fix |
|---|---|
| Stuck on sample room | DevTools → Console; usually a wrong path or filename case |
| Product not clickable | The `node` name doesn't match the GLB (see console warning) |
| Colours look different after update | Output is now sRGB-correct (as authored). Tune *Brightness* |
| Preview shows instead of my photo | The image path is wrong (it 404s). Check `img/` and case |
| Too dark / bright | *Brightness*, *Soft reflections*, *GLB light power* |

## 🗺 Roadmap ideas

Search and category filter · "Add to cart / Enquire on WhatsApp" buttons · AR on phones (`<model-viewer>`) · minimap · guided tour · analytics on viewed products.

---

## 👤 Credits

**Developed by Razel Tech.**
Built with [Three.js](https://threejs.org/).

<div align="center">

© Razel Tech · All rights reserved

</div>