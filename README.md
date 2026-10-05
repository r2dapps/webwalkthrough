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
| 🚪 **Interactive architecture** | Click to open sliding windows, sliding doors, vertical windows and hinged doors. Everything is detected from your GLB node names |
| 🪑 **Sit on chairs and sofas** | Click a seat and the camera glides into it, facing the nearest table. Press W A S D to stand up |
| 🧱 **Furniture colliders** | Tables, racks, planters, sofas and chairs block the player automatically |
| 👥 **Multiplayer + 3D voice chat** | Create a room, share the code or invite link, walk around together as avatars, and talk. Voices get quieter and directional with distance. Free WebRTC, no server to run |
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

**Rotation:** drag to spin without limit and tilt up to about 75° up or down (see the top and the underside). Motion is eased and a flick keeps gliding. Use the **mouse wheel** or a **two-finger pinch** to zoom, and **double-click / double-tap** to reset the view. It resumes its slow turntable when you let go.

The preview works in every theme (the hint badge and stage adapt to Minimal, Midnight, Sage and Slate).

So you can ship a catalogue immediately and add photos later, product by product. The preview uses a clone of the model, so rotating it never moves anything in the scene.

> The turn is a clean orbit (spin + tilt, never roll), so the product never ends up sideways and the holo stage stays flat.

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
| `welcome` | Wording of the start screen (see *Start screen* below) |
| `rtc` | Optional: `iceServers` (TURN) and `peer` (your own signalling server) for voice chat |
| `hingedDoors` | `true` brings back the old swinging door. Default `false`: the door slides like the windows |
| `autoColliders` | `false` turns off the automatic furniture colliders |
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

## 👋 Start screen (two steps)

**Step 1: the start page.** A separate full-screen page themed on pipes and fittings: a pipe network with flowing water, floating elbow / tee / valve / coupling shapes, the shop name, a pipe-style divider, **category tiles with fitting icons**, a short message and the Enter button. The 3D scene loads behind it and the button shows *Loading showroom… 42%* until it is ready.

**Step 2: the walkthrough card.** Pressing *Enter the Showroom* reveals the original card over the live scene (controls guide + *Enter Walkthrough*), exactly as before. *Exit* in the showroom returns to this card.

Change the start-page words from `walkthrough.json`; all fields are optional:

```json
"welcome": {
  "eyebrow": "Welcome to",
  "title": "Sudhakar Pipes & Fittings",
  "tagline": "Quality PVC pipes, garden fittings & plumbing essentials",
  "message": "Step inside our 3D showroom. Walk around, open the doors, take a seat, and click any product to see its price and details.",
  "categories": ["Garden Pipes", "PVC Connectors", "Ball Valves", "Clamps", "Fittings"],
  "highlights": ["Walk-through 3D", "Live product preview", "Voice chat"],
  "button": "Enter the Showroom",
  "contact": "Your address · phone number",
  "footer": "Developed by Razel Tech"
}
```

- `categories` (up to 5) become the icon tiles. The icon is picked from the word: *valve*, *clamp*, *tee*, *connector / coupling*, *pipe / hose*, otherwise an elbow.
- Leave out `highlights` and the small pills are built from your product count and tags.
- Leave out `welcome` entirely and the card uses your top-level `title`.
- `contact` is shown small at the bottom only when you set it. `footer` defaults to *Developed by Razel Tech*; set it to `""` to hide it.
- The browser tab title uses the same name.

## 🚪 Doors, windows and seats

> **Modeller animations win.** If your 3D modeller adds an animation clip to a window or door in Blender (for example `WindowOpen`), that window/door is driven by **their clip**: click it to play the clip forward (open) and click again to play it backward (close). It does not autoplay. Windows and doors **without** a clip keep the automatic slide / swing described below, so you can migrate one window at a time with no code change. (The **Play animation** button in the product card is for *products*; doors and windows use a click.)

Nothing to configure: the app finds them by name when the GLB loads.

| What | How it is detected | Behaviour |
|---|---|---|
| Sliding window / door / vertical window | Sibling panels named `…Door_01`, `…Door_02` or `…Window_01`, `…Window_02` next to a `…Frame` | The last panel slides over the first **along its own rail**, so rotated (diagonal) windows work too. The panel can never leave its frame |
| Door leaf (`SM_Door`) | A node named `SM_Door` inside a group that has a `…Frame` | Slides along its frame over the fixed panel, like the windows. (`"hingedDoors": true` gives the old swinging door) |
| Seats | Nodes starting with `SM_Chair`, `SingleSofa`, `Sofa` | Click to sit; W A S D or the *Stand up* button to leave |
| Colliders | `SM_Table`, `RoundTable`, `Table`, `SM_Rack`, `SM_PlanterBox`, plus the seats | Walk around them. If you spawn inside one you can still walk out |

Aim at one and a hint such as *Open window* or *Sit here* appears. Tap it on a phone. Opening a door or window in a multiplayer room opens it for everyone.

Turn off the automatic colliders with `"autoColliders": false`. You can still list your own in `colliders`.

## 🤖 Characters (Classic or Cute robot)

Pick the look of your avatar (**Classic**, **Cute robot** or **Hover bot**) in **Settings → Multiplayer character**, or in the multiplayer window (people icon). Everyone in the room sees the character you chose, and you can switch at any time.

| Character | Look |
|---|---|
| **Classic** (default) | The original human-style avatar |
| **Hover bot** | A robot **without legs or hands**: a floating bean body with a dome head, glowing visor, antenna and a soft glow underneath. Bobs gently, and sits on seats |
| **Cute robot** | Bean-shaped body, small dome head with a glowing visor and antenna, stubby legs, round mitten hands. Blinks, glows and the antenna pulses while talking, bounces slightly when walking |

## 👥 Multiplayer and voice chat

Click the **people icon** in the header, then **Create a room** (or enter a friend's 5-letter code and **Join**). *Copy invite link* gives a URL such as `…/?room=K4P9X` that opens the join box for the visitor.

- Avatars show each person's name and colour, walk, and sit when they sit. They stand on the real floor height of your model, not at a fixed y = 0.
- **Invite links** (`…/?room=K4P9X`) skip the start page: the visitor lands directly in the live showroom with the join box open.
- A glowing ring under an avatar shows who is talking.
- Voices are **3D**: quieter with distance and coming from the speaker's direction. Use headphones.
- A room works well for about 6 people, since everyone connects directly to everyone.

**How it works:** free **WebRTC** through [PeerJS](https://peerjs.com). The free PeerJS cloud only introduces people to each other; audio and positions go directly between browsers. No server of yours is involved. The microphone needs **HTTPS**, which GitHub Pages provides.

### Refreshing and rejoining

| What happens | Result |
|---|---|
| A guest refreshes or closes the tab | Everyone removes their avatar immediately. After the refresh the join box opens with the same room code ready, so it is one click to come back |
| The **host** refreshes | The host gets the **same room code** back (the app retries for a few seconds while the old connection closes), and guests **reconnect automatically**. Press *Resume my room* |
| A connection dies silently (battery died, network dropped) | The avatar is removed after about 12 seconds |
| A background tab | The avatar keeps its last position and voice keeps working. Moving resumes when the tab is visible |
| The host closes the tab and does not come back | People already in the room stay connected to each other, but **new** people cannot join with that code. Create a new room |

The room information is kept in the browser tab (`sessionStorage`), so it survives a refresh but is forgotten when the tab is closed or when you press *Leave room*.

### Different Wi-Fi networks (TURN)

Two people on the **same** Wi-Fi connect directly. On **different** networks the browsers must find a path through each router. The app tries, in this order: a direct path, a public STUN lookup, then a **TURN relay**. Most home connections work with STUN alone. These do not, and **need a TURN relay**: mobile data (carrier-grade NAT), office or school Wi-Fi, and some routers.

Next to every friend's name you will see **direct** or **relay**, so you can tell which path was used. If a connection fails, the app says so and points here.

**By default** the app uses Google and Cloudflare STUN plus the public *Open Relay* demo TURN from metered.ca. That demo relay is shared, rate-limited and may change or stop, so it is only a safety net. **For a real launch use your own relay**, for example:

- a free [Metered](https://www.metered.ca/tools/openrelay/) or [Cloudflare Calls TURN](https://developers.cloudflare.com/calls/turn/) account, or your own `coturn` server (a small VPS is enough);
- then set it in `walkthrough.json` (this replaces the demo relay):

```json
"rtc": {
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": ["turn:YOUR_TURN_HOST:3478", "turns:YOUR_TURN_HOST:443?transport=tcp"],
      "username": "YOUR_USER", "credential": "YOUR_PASSWORD" }
  ]
}
```

Audio is encrypted end to end (WebRTC); a relay only forwards encrypted packets. Use a plan with usage limits, because anyone who can read your page can read the TURN credentials.

**Other limits**
- The free PeerJS cloud has no uptime guarantee. For a production site run your own signalling server (`npx peerjs --port 9000`) and point to it:
  ```json
  "rtc": { "peer": { "host": "voice.example.com", "port": 443, "secure": true, "path": "/" } }
  ```
- Room codes are not passwords: anyone who knows a code can join. Do not put private information in the scene.

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

## 🧩 Developer notes (kept code)

Nothing useful was deleted. Where behaviour changed, the old code is kept and commented, with its purpose:

| Where | What is kept |
|---|---|
| `class Avatar` | The original human avatar is untouched; `buildRobot()` adds the second character. `style` picks one |
| Preview `initPreview` / `renderPreview` | The first drag handlers (limited tilt) and the instant-rotation line are kept in comments as *previous version*. The new free-orbit block replaces them |
| `buildInteractives` | Automatic slide / hinge logic stays as the **fallback**; modeller clips take over only where they exist |
| `buildInteractives` doors | The old hinged door code is kept (`"hingedDoors": true`). The old world-axis window slide is kept after the new local-space block (unused) |
| Multiplayer | `shutdown()` (refresh) and `leave()` (button) are separate on purpose; `poseMsg()` is shared by the animation loop and the hidden-tab heartbeat |
| Walkthrough card | The original card is restored unchanged; the new start page sits in front of it (`#start-page`) |

## 🛠 Troubleshooting

| Symptom | Fix |
|---|---|
| Stuck on sample room | DevTools → Console; usually a wrong path or filename case |
| Product not clickable | The `node` name doesn't match the GLB (see console warning) |
| Colours look different after update | Output is now sRGB-correct (as authored). Tune *Brightness* |
| Preview shows instead of my photo | The image path is wrong (it 404s). Check `img/` and case |
| Too dark / bright | *Brightness*, *Soft reflections*, *GLB light power* |

## 🗺 Roadmap ideas

Light switches and a time-of-day slider · Enquire on WhatsApp · product search with fly-to · shareable `?product=` links · text chat · AR on phones (`<model-viewer>`) · guided tour · analytics on viewed products.

---

## 👤 Credits

**Developed by Razel Tech.**
Built with [Three.js](https://threejs.org/).

<div align="center">

© Razel Tech · All rights reserved

</div>