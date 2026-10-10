/**
 * ============================================================================
 * WalkthroughMultiplayer Plugin (v1.0)
 * Plug-and-Play WebRTC Multiplayer & 3D Spatial Voice Chat for Web Walkthroughs
 * 
 * Works out-of-the-box with any Three.js architectural walkthrough.
 * Features:
 *   - Mesh WebRTC via PeerJS (Free, zero private server required)
 *   - Instant 5-character Room Codes + Shareable Invite URLs (?room=CODE)
 *   - 3D Remote Avatars (Hover Bot, Cute Robot, Classic, Male, Female, VR Player) at real human scale, with Seated Poses
 *   - Wave-hello emote on a key (synced to everyone in the room)
 *   - Voice FX (DSP: pitch / EQ / compressor / radio / robot) + Push-to-Talk (hold key or on-screen button)
 *   - Directional 3D Positional Audio via Web Audio API (HRTF PannerNodes)
 *   - Auto-Mounting Glassmorphism UI Modal & HUD Badge
 *   - Cross-Client Interactive Sync (Doors, Furniture, Custom Actions)
 * ============================================================================
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WalkthroughMultiplayer = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const PEERJS_LOCAL = './threejs/peerjs.min.js';
    const PEERJS_CDN = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';

    const MP_COLORS = [
        0x38bdf8, // Sky Blue
        0xf472b6, // Rose Pink
        0xfbbf24, // Amber Gold
        0x34d399, // Emerald Green
        0xa78bfa, // Soft Purple
        0xfb7185, // Coral Red
        0x38bdf8, // Cyan
        0x2dd4bf  // Teal
    ];

    const AV_STYLES = ['hover', 'robot', 'classic', 'male', 'female', 'vr'];
    const avStyle = (v) => (AV_STYLES.includes(v) ? v : 'hover');
    const randCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');


    /* ==========================================================================
       HUMAN-SCALE AVATAR CONFIG (office workspace) - all values in metres
       --------------------------------------------------------------------------
       lift   : height of the model origin above the floor (the hover bot floats)
       span   : un-scaled floor-to-crown height of the built model (head top, antenna excluded)
       target : real-world crown height the avatar is scaled to
       w      : extra width/depth factor (slims the chunky bots to a human-sized body; 1 = uniform)
       tagY   : nameplate height in model units
       ========================================================================== */
    const SEAT_HIP_Y = 0.8; // hip height above the reported ground Y when seated (unchanged from v1.0; lower it e.g. to 0.55 if seated avatars float above chairs)
    const AVATAR_CFG = {
        hover:   { lift: 0.28,   span: 2.09,  target: 1.70, w: 0.85, tagY: 2.15 },
        robot:   { lift: -0.125, span: 1.485, target: 1.70, w: 0.80, tagY: 1.95 },
        classic: { lift: 0.02,   span: 1.768, target: 1.70, w: 1,    tagY: 1.82 },
        male:    { lift: 0,      span: 1.76,  target: 1.76, w: 1,    tagY: 1.98 },
        female:  { lift: 0,      span: 1.64,  target: 1.64, w: 1,    tagY: 1.86 },
        vr:      { lift: 0,      span: 1.76,  target: 1.72, w: 1,    tagY: 1.98 }
    };

    /* ==========================================================================
       VOICE FX PRESETS (DSP) + PITCH CORE
       ========================================================================== */
    const VOICE_FX = {
        off:   { label: 'Natural (no effect)',          pitch: 1,    ring: 0, hp: 20,  lp: 20000, peak: 0, comp: 0, makeup: 1 },
        clear: { label: 'Office Clear (EQ + compressor)', pitch: 1,    ring: 0, hp: 110, lp: 20000, peak: 3, comp: 1, makeup: 1.5 },
        deep:  { label: 'Deep Voice',                   pitch: 0.80, ring: 0, hp: 70,  lp: 20000, peak: 0, comp: 0, makeup: 1 },
        high:  { label: 'Higher Voice',                 pitch: 1.25, ring: 0, hp: 120, lp: 20000, peak: 0, comp: 0, makeup: 1 },
        radio: { label: 'Radio / Walkie-talkie',        pitch: 1,    ring: 0, hp: 420, lp: 3200,  peak: 4, comp: 1, makeup: 1.6 },
        robot: { label: 'Robot (ring modulator)',       pitch: 1,    ring: 1, hp: 90,  lp: 20000, peak: 0, comp: 0, makeup: 1 }
    };

    // Dual-tap granular pitch shifter. Self-contained on purpose: it is stringified into an
    // AudioWorklet module, and also used directly by the ScriptProcessor fallback.
    function makePitchCore(sr) {
        const N = 16384;
        const W = Math.floor(0.08 * sr);
        const buf = new Float32Array(N);
        const TWO_PI = Math.PI * 2;
        let w = 0, d0 = 0, d1 = W / 2;
        const rd = (d) => {
            let p = w - d - 1;
            if (p < 0) p += N;
            const i = p | 0;
            const f = p - i;
            return buf[i] * (1 - f) + buf[(i + 1) & (N - 1)] * f;
        };
        return function (inp, out, pitch) {
            const step = 1 - pitch;
            for (let i = 0; i < inp.length; i++) {
                buf[w] = inp[i];
                out[i] = rd(d0) * (0.5 - 0.5 * Math.cos(TWO_PI * d0 / W)) +
                         rd(d1) * (0.5 - 0.5 * Math.cos(TWO_PI * d1 / W));
                d0 += step; d1 += step;
                if (d0 >= W) d0 -= W; else if (d0 < 0) d0 += W;
                if (d1 >= W) d1 -= W; else if (d1 < 0) d1 += W;
                w = (w + 1) & (N - 1);
            }
        };
    }

    function toLinearColor(c) {
        const col = new THREE.Color(c);
        if (typeof col.convertSRGBToLinear === 'function') {
            return col.convertSRGBToLinear();
        }
        return col;
    }

    /* ==========================================================================
       3D REMOTE AVATAR CLASS
       ========================================================================== */
    class Avatar {
        constructor(name, color, style = 'hover') {
            this.group = new THREE.Group();
            this.style = avStyle(style);
            this.hipY = 0.67;
            this.legs = [];
            this.arms = [];
            this.eyes = [];
            this.talk = 0;
            this.phase = 0;
            this.tgt = null;
            this.init = false;

            const mat = (c, r = 0.55, m = 0.05) => new THREE.MeshStandardMaterial({
                color: toLinearColor(c),
                roughness: r,
                metalness: m
            });

            if (this.style === 'classic') {
                this.buildClassic(mat, color);
            } else if (this.style === 'robot') {
                this.buildRobot(mat, color, false);
            } else if (this.style === 'male' || this.style === 'female' || this.style === 'vr') {
                this.buildHuman(mat, color, this.style === 'female');
                if (this.style === 'vr') this.addVRGear(mat, color);
            } else {
                // Default: Modern Hover Bot (no detached hands/legs in first person)
                this.buildRobot(mat, color, true);
            }

            // Human-scale fit: uniformly scale the model so floor-to-crown height is realistic
            const cfg = AVATAR_CFG[this.style];
            this.lift = cfg.lift;
            this.sc = cfg.target / cfg.span;
            this.group.scale.set(this.sc * cfg.w, this.sc, this.sc * cfg.w);
            if (this.style === 'robot' && this.ring) this.ring.position.y = -cfg.lift + 0.02; // keep glow ring on the floor

            // Floating 2D Nameplate Badge
            this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
            this.tag.position.y = cfg.tagY;
            this.tag.scale.set(0.85 / (this.sc * cfg.w), 0.22 / this.sc, 1); // keep nameplate a constant world size
            this.group.add(this.tag);

            this.group.traverse((o) => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = false;
                }
            });

            this.setStyle(name, color);
        }

        buildClassic(mat, color) {
            this.hipY = 0.80;
            const g = this.group;
            this.body = mat(color);
            const skin = mat(0xe0b08c, 0.6);
            const dark = mat(0x23262e, 0.7);

            const prof = [
                [0.001, 0], [0.2, 0.02], [0.23, 0.25], [0.21, 0.5],
                [0.15, 0.62], [0.06, 0.68], [0.001, 0.7]
            ].map(([x, y]) => new THREE.Vector2(x, y));

            const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), this.body);
            torso.position.y = 0.72;

            this.legs = [-1, 1].map((k) => {
                const l = new THREE.Group();
                l.position.set(k * 0.09, 0.8, 0);
                const m = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.78, 12), dark);
                m.position.y = -0.39;
                l.add(m);
                g.add(l);
                return l;
            });

            this.arms = [-1, 1].map((k) => {
                const a = new THREE.Group();
                a.position.set(k * 0.27, 1.34, 0);
                const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.5, 10), this.body);
                const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin);
                m.position.y = -0.25;
                h.position.y = -0.52;
                a.add(m, h);
                g.add(a);
                return a;
            });

            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10), skin);
            neck.position.y = 1.43;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 24, 18), skin);
            head.position.y = 1.56;
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.142, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), dark);
            hair.position.y = 1.57;
            hair.rotation.x = 0.3;

            const eyeG = new THREE.SphereGeometry(0.014, 8, 6);
            [-1, 1].forEach((k) => {
                const e = new THREE.Mesh(eyeG, dark);
                e.position.set(k * 0.05, 1.575, -0.125);
                g.add(e);
            });

            this.ring = new THREE.Mesh(
                new THREE.RingGeometry(0.3, 0.37, 40),
                new THREE.MeshBasicMaterial({
                    color: toLinearColor(color),
                    transparent: true,
                    opacity: 0.18,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                })
            );
            this.ring.rotation.x = -Math.PI / 2;
            this.ring.position.y = 0.02;

            g.add(torso, neck, head, hair, this.ring);
        }

        buildRobot(mat, color, hover = true) {
            this.hipY = hover ? 0.67 : 0.54;
            const g = this.group;
            const shell = this.body = mat(color, 0.35);
            const white = mat(0xf4f7fb, 0.4);
            const dark = mat(0x1d2433, 0.5);

            this.glow = new THREE.MeshStandardMaterial({
                color: 0x0b1220,
                emissive: toLinearColor(0x7dd3fc),
                emissiveIntensity: 0.9,
                roughness: 0.3
            });

            const upper = this.upper = new THREE.Group();
            g.add(upper);

            const prof = [
                [0.001, 0], [0.2, 0.02], [0.3, 0.2], [0.33, 0.42],
                [0.3, 0.62], [0.2, 0.76], [0.001, 0.8]
            ].map(([x, y]) => new THREE.Vector2(x, y));

            const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), shell);
            torso.position.y = 0.50;

            const belly = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), white);
            belly.position.set(0, 0.88, -0.322);
            belly.rotation.y = Math.PI;

            const light = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), this.glow);
            light.position.set(0, 0.88, -0.33);
            light.scale.z = 0.4;

            const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), white);
            head.position.y = 1.44;

            const visor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), dark);
            visor.position.set(0, 1.44, -0.115);
            visor.scale.set(1, 0.62, 0.45);

            this.eyes = [-1, 1].map((k) => {
                const e = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), this.glow);
                e.position.set(k * 0.055, 1.45, -0.172);
                return e;
            });

            const ears = [-1, 1].map((k) => {
                const e = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), shell);
                e.rotation.z = Math.PI / 2;
                e.position.set(k * 0.175, 1.44, 0);
                return e;
            });

            const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8), dark);
            stick.position.y = 1.66;
            this.ant = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), this.glow);
            this.ant.position.y = 1.74;

            upper.add(torso, belly, light, head, visor, ...this.eyes, ...ears, stick, this.ant);

            if (!hover) {
                // Robot arms and legs
                this.arms = [-1, 1].map((k) => {
                    const a = new THREE.Group();
                    a.position.set(k * 0.37, 1.10, 0);
                    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 12), shell);
                    const h = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), white);
                    m.position.y = -0.13;
                    h.position.y = -0.3;
                    a.add(m, h);
                    upper.add(a);
                    return a;
                });

                this.legs = [-1, 1].map((k) => {
                    const l = new THREE.Group();
                    l.position.set(k * 0.13, 0.54, 0);
                    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.32, 12), dark);
                    const f = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), shell);
                    m.position.y = -0.16;
                    f.position.set(0, -0.36, -0.02);
                    f.scale.set(1, 0.65, 1.4);
                    l.add(m, f);
                    g.add(l);
                    return l;
                });
            } else {
                // Hover Bot: soft glowing anti-gravity thruster pad
                this.upper.position.y = 0.2;
                const jm = () => new THREE.MeshBasicMaterial({
                    color: toLinearColor(0x7dd3fc),
                    transparent: true,
                    opacity: 0.28,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                this.jet = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 24, 1, true), jm());
                this.jet.rotation.x = Math.PI;
                this.jet.position.y = 0.46;
                const pad = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), jm());
                pad.rotation.x = -Math.PI / 2;
                pad.position.y = 0.64;
                this.jet.add(pad);
                g.add(this.jet);
            }

            // Audio-reactive ground ring
            this.ring = new THREE.Mesh(
                new THREE.RingGeometry(0.3, 0.37, 40),
                new THREE.MeshBasicMaterial({
                    color: toLinearColor(color),
                    transparent: true,
                    opacity: 0.18,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                })
            );
            this.ring.rotation.x = -Math.PI / 2;
            this.ring.position.y = 0.04;
            g.add(this.ring);
        }

        buildHuman(mat, color, female) {
            const g = this.group;
            // Anthropometric proportions (metres). Male 1.76 m / Female 1.64 m.
            const P = female ? {
                H: 1.64, hip: 0.855, knee: 0.465, shY: 1.345, shX: 0.185, chestR: 0.150, waistR: 0.118, hipR: 0.165,
                headH: 0.215, neckR: 0.045, armU: 0.30, armF: 0.24, legR: 0.082, armR: 0.040, depth: 0.62
            } : {
                H: 1.76, hip: 0.920, knee: 0.500, shY: 1.445, shX: 0.215, chestR: 0.185, waistR: 0.150, hipR: 0.165,
                headH: 0.230, neckR: 0.055, armU: 0.33, armF: 0.26, legR: 0.090, armR: 0.045, depth: 0.60
            };
            this.isHuman = true;
            this.hipY = P.hip;
            this.body = mat(color, 0.6);                       // shirt / top (recoloured by setStyle)
            const skin = mat(0xe0b08c, 0.6);
            const trousers = mat(female ? 0x2b3040 : 0x2f3542, 0.75);
            const shoes = mat(0x16181d, 0.5);
            const hairM = mat(female ? 0x3b2a1f : 0x2a2018, 0.8);
            const dark = mat(0x1a1a1f, 0.6);
            const lips = mat(0x9c4f4f, 0.6);
            const lathe = (pts, m) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 24), m);

            // ---- Legs: hip -> thigh -> knee -> shin -> shoe (sole at y = 0)
            const thigh = P.hip - P.knee;
            const shin = P.knee - 0.075;
            this.legs = [];
            this.shins = [];
            [-1, 1].forEach((k) => {
                const leg = new THREE.Group();
                leg.position.set(k * P.hipR * 0.52, P.hip, 0);
                const th = new THREE.Mesh(new THREE.CylinderGeometry(P.legR, P.legR * 0.72, thigh, 14), trousers);
                th.position.y = -thigh / 2;
                const knee = new THREE.Group();
                knee.position.y = -thigh;
                const sh = new THREE.Mesh(new THREE.CylinderGeometry(P.legR * 0.72, P.legR * 0.5, shin, 14), trousers);
                sh.position.y = -shin / 2;
                const kb = new THREE.Mesh(new THREE.SphereGeometry(P.legR * 0.72, 12, 10), trousers);
                const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.075, 0.27), shoes);
                shoe.position.set(0, -P.knee + 0.0375, -0.05);
                knee.add(sh, kb, shoe);
                leg.add(th, knee);
                g.add(leg);
                this.legs.push(leg);
                this.shins.push(knee);
            });

            // ---- Pelvis (trousers) and torso (shirt), flattened front-to-back
            const pelvis = lathe([
                [0.001, 0], [P.hipR * 0.92, 0.012], [P.hipR, 0.09], [P.hipR * 0.98, 0.17], [P.waistR * 1.03, 0.27]
            ], trousers);
            pelvis.position.y = P.hip - 0.10;
            pelvis.scale.z = P.depth;

            const y0 = P.hip - 0.03;
            const L = (P.shY + 0.025) - y0;
            const torso = lathe([
                [0.001, 0], [P.hipR * 1.04, 0.01], [P.hipR * 1.0, 0.12 * L], [P.waistR * 1.06, 0.38 * L],
                [P.chestR, 0.72 * L], [P.chestR * 0.96, 0.88 * L], [P.chestR * 0.70, 0.97 * L],
                [P.neckR * 1.3, L], [0.001, L]
            ], this.body);
            torso.position.y = y0;
            torso.scale.z = P.depth;

            // ---- Neck + head (head pivots at the chin so it can nod while talking)
            const chin = P.H - P.headH;
            const neckTop = chin + 0.02;
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(P.neckR, P.neckR * 1.08, neckTop - P.shY + 0.02, 12), skin);
            neck.position.y = (P.shY + neckTop) / 2;

            const hg = this.headG = new THREE.Group();
            hg.position.y = chin;
            const hy = this.headHy = P.headH / 2;
            const sy = P.headH / 0.2;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), skin);
            head.scale.set(0.78, sy, 0.95);
            head.position.y = hy;
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.104, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), hairM);
            hair.scale.set(0.80, (hy + 0.003) / 0.104, 0.97);
            hair.position.y = hy + 0.004;
            hair.rotation.x = 0.3;
            hg.add(head, hair);
            if (female) {
                const back = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), hairM);
                back.scale.set(0.82, 1.5, 0.62);
                back.position.set(0, hy - 0.06, 0.055);
                hg.add(back);
            }
            const eyeG = new THREE.SphereGeometry(0.011, 8, 6);
            [-1, 1].forEach((k) => {
                const e = new THREE.Mesh(eyeG, dark);
                e.position.set(k * 0.032, hy + 0.012, -0.083);
                hg.add(e);
            });
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), skin);
            nose.scale.z = 1.2;
            nose.position.set(0, hy - 0.012, -0.093);
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.006, 0.004), lips);
            mouth.position.set(0, hy - 0.05, -0.086);
            hg.add(nose, mouth);

            // ---- Arms: shoulder -> upper arm (sleeve) -> elbow -> forearm + hand (skin)
            this.arms = [];
            this.elbows = [];
            [-1, 1].forEach((k) => {
                const a = new THREE.Group();
                a.position.set(k * P.shX, P.shY - 0.03, 0);
                const cap = new THREE.Mesh(new THREE.SphereGeometry(P.armR * 1.15, 12, 10), this.body);
                const up = new THREE.Mesh(new THREE.CylinderGeometry(P.armR, P.armR * 0.84, P.armU, 12), this.body);
                up.position.y = -P.armU / 2;
                const el = new THREE.Group();
                el.position.y = -P.armU;
                const fo = new THREE.Mesh(new THREE.CylinderGeometry(P.armR * 0.82, P.armR * 0.66, P.armF, 12), skin);
                fo.position.y = -P.armF / 2;
                const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), skin);
                hand.scale.set(0.7, 1.7, 0.5);
                hand.position.y = -P.armF - 0.055;
                el.add(fo, hand);
                a.add(cap, up, el);
                g.add(a);
                this.arms.push(a);
                this.elbows.push(el);
            });

            // Audio-reactive ground ring (same as other avatars)
            this.ring = new THREE.Mesh(
                new THREE.RingGeometry(0.3, 0.37, 40),
                new THREE.MeshBasicMaterial({
                    color: toLinearColor(color),
                    transparent: true,
                    opacity: 0.18,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                })
            );
            this.ring.rotation.x = -Math.PI / 2;
            this.ring.position.y = 0.02;

            g.add(pelvis, torso, neck, hg, this.ring);
        }

        // "VR Player": human body + standalone-headset (visor, strap) + a controller in each hand
        addVRGear(mat, color) {
            const hy = this.headHy;
            const shell = mat(0x15181f, 0.25, 0.3);
            const grip = mat(0x20242d, 0.5, 0.2);
            this.accent = new THREE.MeshStandardMaterial({
                color: 0x0b1220,
                emissive: toLinearColor(color),
                emissiveIntensity: 0.8,
                roughness: 0.3
            });
            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.085, 0.11), shell);
            visor.position.set(0, hy + 0.012, -0.1);
            const strip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.004), this.accent);
            strip.position.set(0, hy + 0.012, -0.1565);
            const strap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.011, 8, 28), shell);
            strap.scale.set(0.80, 0.97, 1);
            strap.rotation.x = Math.PI / 2;
            strap.position.y = hy + 0.025;
            this.headG.add(visor, strip, strap);

            this.elbows.forEach((el) => {
                const c = new THREE.Group();
                c.position.set(0, -0.255 - 0.02, -0.03);
                c.rotation.x = -0.7;
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.015, 0.12, 10), grip);
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 6, 18), this.accent);
                ring.position.y = 0.075;
                ring.rotation.x = 1.0;
                c.add(handle, ring);
                el.add(c);
            });
            this.vr = true;
        }

        triggerWave() {
            const now = performance.now() / 1000;
            if (now < (this.waveUntil || 0)) return false;   // already waving
            this.waveUntil = now + 2.4;
            return true;
        }

        // Friendly "hello" emote. Humans/VR: raise right arm and wave the forearm.
        // Classic/Cute Bot: raise right arm. Hover Bot (no arms): wiggle + light flash.
        animWave(dt) {
            const now = performance.now() / 1000;
            const on = now < (this.waveUntil || 0);
            const b = this.waveB = (this.waveB || 0) + ((on ? 1 : 0) - (this.waveB || 0)) * (1 - Math.exp(-10 * dt));
            if (!on && b < 0.004) {
                if (this._waving) {
                    this._waving = false;
                    this.waveB = 0;
                    if (this.arms[1]) this.arms[1].rotation.z = 0;
                    if (this.elbows && this.elbows[1]) this.elbows[1].rotation.z = 0;
                    if (this.headG) this.headG.rotation.z = 0;
                    if (this.upper && this.style === 'hover') this.upper.rotation.z = 0;
                }
                return;
            }
            this._waving = true;
            const w = Math.sin(now * 13);
            if (this.isHuman) {
                const a = this.arms[1];
                const e = this.elbows[1];
                a.rotation.x = a.rotation.x * (1 - b) + 0.15 * b;
                a.rotation.z = 2.3 * b;
                e.rotation.x *= (1 - b);
                e.rotation.z = b * (0.84 + 0.45 * w);
                this.headG.rotation.z = -0.08 * b;
            } else if (this.arms.length >= 2) {
                this.arms[1].rotation.z = b * (2.5 + 0.28 * w);
            } else if (this.upper) {
                this.upper.rotation.z = 0.2 * b * w;
                if (this.glow) this.glow.emissiveIntensity += 1.5 * b;
            }
        }

        // Natural gait / seated pose for Male, Female & VR avatars (runs after the shared pose block in update())
        poseHuman(seated, spd, tt) {
            if (seated) {
                this.legs.forEach((l) => { l.rotation.x = 1.45; });
                this.shins.forEach((s) => { s.rotation.x = -1.45; });
                this.arms.forEach((a) => { a.rotation.x = 0.55; });
                this.elbows.forEach((e) => { e.rotation.x = 1.05; });   // forearms rest forward, as if on a desk
            } else {
                const amp = Math.min(spd / 1.4, 1);
                const s = Math.sin(this.phase * 1.3) * amp;
                this.legs[0].rotation.x = s * 0.45;
                this.legs[1].rotation.x = -s * 0.45;
                this.arms[0].rotation.x = -s * 0.40;
                this.arms[1].rotation.x = s * 0.40;
                this.shins.forEach((sh, i) => { sh.rotation.x = -(Math.max(0, this.legs[i].rotation.x) * 1.1 + 0.03); });
                this.elbows.forEach((e, i) => { e.rotation.x = 0.12 + Math.max(0, this.arms[i].rotation.x) * 0.9; });
                if (this.vr) {   // controllers held in front of the body
                    this.arms[0].rotation.x = 0.30 - s * 0.12;
                    this.arms[1].rotation.x = 0.30 + s * 0.12;
                    this.elbows.forEach((e) => { e.rotation.x = 0.85; });
                }
            }
            if (this.accent) this.accent.emissiveIntensity = 0.8 + this.talk * 2.2;
            // subtle nod while the person is speaking
            if (this.headG) this.headG.rotation.x = Math.sin(tt * 9) * 0.05 * this.talk;
        }

        setStyle(name, color) {
            if (this.body && this.body.color) this.body.color.copy(toLinearColor(color));
            if (this.ring && this.ring.material && this.ring.material.color) this.ring.material.color.copy(toLinearColor(color));
            if (this.accent && this.accent.emissive) this.accent.emissive.copy(toLinearColor(color));

            const c = document.createElement('canvas');
            c.width = 256;
            c.height = 64;
            const ctx = c.getContext('2d');

            ctx.fillStyle = 'rgba(26, 29, 31, 0.88)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(4, 8, 248, 48, 24);
            else ctx.rect(4, 8, 248, 48);
            ctx.fill();

            // Accent outline
            ctx.strokeStyle = '#' + color.toString(16).padStart(6, '0');
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, 128, 33, 230);

            const t = new THREE.CanvasTexture(c);
            t.encoding = THREE.sRGBEncoding;
            if (this.tag.material.map) this.tag.material.map.dispose();
            this.tag.material.map = t;
            this.tag.material.needsUpdate = true;
        }

        update(dt) {
            const t = this.tgt;
            const g = this.group;
            if (!t) return;

            const ty = t.y + this.lift * this.sc + (t.s ? (SEAT_HIP_Y - this.hipY * this.sc) : 0);

            if (!this.init || Math.hypot(t.x - g.position.x, t.z - g.position.z) > 6) {
                g.position.set(t.x, ty, t.z);
                g.rotation.y = t.r;
                this.init = true;
            }

            const k = 1 - Math.exp(-12 * dt);
            const px = g.position.x;
            const pz = g.position.z;
            g.position.x += (t.x - px) * k;
            g.position.z += (t.z - pz) * k;
            g.position.y += (ty - g.position.y) * k;

            let dr = t.r - g.rotation.y;
            dr = Math.atan2(Math.sin(dr), Math.cos(dr));
            g.rotation.y += dr * k;

            const spd = Math.hypot(g.position.x - px, g.position.z - pz) / Math.max(dt, 1e-3);
            this.phase += spd * dt * 3.2;
            const sw = Math.min(spd / 1.5, 1) * 0.7 * Math.sin(this.phase);

            if (t.s) {
                // Seated pose: knees bent forward, arms resting
                this.legs.forEach((l) => { l.rotation.x = 1.45; });
                this.arms.forEach((a) => { a.rotation.x = 0.6; });
            } else {
                if (this.legs.length >= 2) {
                    this.legs[0].rotation.x = sw;
                    this.legs[1].rotation.x = -sw;
                }
                if (this.arms.length >= 2) {
                    this.arms[0].rotation.x = -sw * 0.8;
                    this.arms[1].rotation.x = sw * 0.8;
                }
            }

            if (this.isHuman) this.poseHuman(!!t.s, spd, performance.now() / 1000);

            // Audio reactive ring glow
            if (this.ring) {
                this.ring.material.opacity = 0.18 + this.talk * 0.82;
                this.ring.scale.setScalar(1 + this.talk * 0.25);
            }

            // Robot / Hover Bot subtle breathing & talking animation
            if (this.style === 'hover' || this.style === 'robot') {
                const tt = performance.now() / 1000;
                const bl = (tt % 4.2) < 0.12 ? 0.1 : 1;
                this.eyes.forEach((e) => { e.scale.y = bl; });
                if (this.glow) this.glow.emissiveIntensity = 0.9 + this.talk * 2.5;
                if (this.ant) this.ant.scale.setScalar(1 + this.talk * 0.7);

                if (this.style === 'hover') {
                    this.upper.position.y = 0.2 + Math.sin(tt * 2.2) * 0.03;
                    if (this.jet) this.jet.material.opacity = 0.28 + 0.08 * Math.sin(tt * 5) + this.talk * 0.25;
                } else {
                    this.upper.position.y = t.s ? 0 : Math.abs(Math.sin(this.phase)) * 0.03 * Math.min(spd / 1.5, 1);
                }
            }

            this.animWave(dt);
        }

        dispose() {
            if (this.group.parent) this.group.parent.remove(this.group);
            this.group.traverse((o) => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) {
                    if (o.material.map) o.material.map.dispose();
                    o.material.dispose();
                }
            });
        }
    }

    /* ==========================================================================
       MAIN MULTIPLAYER CONTROLLER CLASS
       ========================================================================== */
    class WalkthroughMultiplayer {
        constructor(options = {}) {
            this.scene = options.scene || null;
            this.camera = options.camera || null;
            this.getYaw = options.getYaw || (() => 0);
            this.getGroundY = options.getGroundY || (() => 0);
            this.isSeated = options.isSeated || (() => false);
            this.onDoorSync = options.onDoorSync || null;
            this.onFanSync = options.onFanSync || null;
            this.onTVSync = options.onTVSync || null;
            this.onSyncRequest = options.onSyncRequest || null;
            this.onToast = options.onToast || ((msg) => console.log('[MP]', msg));
            this.mountButtonTarget = options.mountButtonTarget || null;
            this.getSpawnPosition = options.getSpawnPosition || null;
            this.setYaw = options.setYaw || null;

            this.peers = new Map();
            this.live = false;
            this.me = {
                name: 'Guest',
                color: MP_COLORS[0],
                style: 'hover'
            };
            this.sendT = 0;
            this.muted = false;
            this.code = '';
            this.isHost = false;
            this.peer = null;
            this.ctx = null;
            this.stream = null;
            this.out = null;

            // Auto-mount UI
            this.injectUI();
            this.bindUI();
            this.initVoiceFx(); // Voice FX + Push-to-Talk panel (additive)
            this.initEmotes();  // Wave-hello emote key + button (additive)

            // Auto-detect invite link URL query
            const q = new URLSearchParams(window.location.search);
            const roomParam = q.get('room');
            if (roomParam && roomParam.length >= 4) {
                const codeInput = document.getElementById('mp-code');
                if (codeInput) codeInput.value = roomParam.trim().slice(0, 5).toUpperCase();
                setTimeout(() => this.openModal(true), 600);
            }
        }

        /* ----------------------------------------------------------------------
           UI INJECTION (Clean, Modern Glassmorphism Aesthetic)
           ---------------------------------------------------------------------- */
        injectUI() {
            if (!document.getElementById('mp-modal')) {
                const modalHtml = `
                <!-- Multiplayer Glassmorphism Modal -->
                <div id="mp-modal" class="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm hidden items-center justify-center p-4">
                    <div class="glass-panel max-w-md w-full rounded-3xl p-6 shadow-2xl border border-white/80 relative text-[#262927]">
                        <!-- Header -->
                        <div class="flex items-center justify-between pb-3 border-b border-[#E3DBD0]">
                            <div class="flex items-center space-x-2.5">
                                <div class="w-8 h-8 rounded-xl bg-[#262927] text-white flex items-center justify-center text-xs">
                                    <i class="fa-solid fa-users"></i>
                                </div>
                                <div>
                                    <h3 class="text-sm font-bold">Multiplayer & Spatial Voice</h3>
                                    <p class="text-[10px] text-[#9FA8A0]">Live WebRTC Co-Presence</p>
                                </div>
                            </div>
                            <button id="mp-close-btn" class="w-8 h-8 rounded-full bg-[#E3DBD0] hover:bg-[#262927] hover:text-white flex items-center justify-center text-xs transition-colors">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <!-- Error Banner -->
                        <div id="mp-err" class="hidden mt-3 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200"></div>

                        <!-- Setup View -->
                        <div id="mp-setup-view" class="mt-4 space-y-4">
                            <!-- Player Name -->
                            <div>
                                <label class="text-[11px] font-bold uppercase tracking-wider block mb-1">Your Name</label>
                                <input id="mp-name-input" type="text" maxlength="16" placeholder="Architect / Guest" class="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E3DBD0] text-xs font-semibold focus:outline-none focus:border-[#262927]">
                            </div>

                            <!-- Avatar Style Selector -->
                            <div>
                                <label class="text-[11px] font-bold uppercase tracking-wider block mb-1">Avatar Model</label>
                                <div id="mp-style-group" class="grid grid-cols-3 gap-2">
                                    <button data-style="hover" class="mp-style-btn p-2 rounded-xl bg-white border border-[#262927] text-xs font-bold text-center">
                                        <i class="fa-solid fa-paper-plane block mb-1 text-emerald-600"></i> Hover Bot
                                    </button>
                                    <button data-style="robot" class="mp-style-btn p-2 rounded-xl bg-white border border-[#E3DBD0] text-xs font-bold text-center">
                                        <i class="fa-solid fa-robot block mb-1 text-sky-600"></i> Cute Bot
                                    </button>
                                    <button data-style="classic" class="mp-style-btn p-2 rounded-xl bg-white border border-[#E3DBD0] text-xs font-bold text-center">
                                        <i class="fa-solid fa-person block mb-1 text-amber-600"></i> Classic
                                    </button>
                                    <button data-style="male" class="mp-style-btn p-2 rounded-xl bg-white border border-[#E3DBD0] text-xs font-bold text-center">
                                        <i class="fa-solid fa-person block mb-1 text-blue-600"></i> Male
                                    </button>
                                    <button data-style="female" class="mp-style-btn p-2 rounded-xl bg-white border border-[#E3DBD0] text-xs font-bold text-center">
                                        <i class="fa-solid fa-person-dress block mb-1 text-pink-600"></i> Female
                                    </button>
                                    <button data-style="vr" class="mp-style-btn p-2 rounded-xl bg-white border border-[#E3DBD0] text-xs font-bold text-center">
                                        <i class="fa-solid fa-vr-cardboard block mb-1 text-violet-600"></i> VR Player
                                    </button>
                                </div>
                            </div>

                            <!-- Color Palette -->
                            <div>
                                <label class="text-[11px] font-bold uppercase tracking-wider block mb-1.5">Avatar Color</label>
                                <div id="mp-color-swatches" class="flex items-center space-x-2"></div>
                            </div>

                            <!-- Voice Mic Toggle -->
                            <div class="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3DBD0]">
                                <div class="flex items-center space-x-2 text-xs font-medium">
                                    <i class="fa-solid fa-microphone text-emerald-600"></i>
                                    <span>Enable 3D Directional Microphone</span>
                                </div>
                                <input id="mp-mic-check" type="checkbox" checked class="w-4 h-4 accent-[#262927] cursor-pointer">
                            </div>

                            <!-- Host or Join Actions -->
                            <div class="pt-2 border-t border-[#E3DBD0] space-y-2.5">
                                <button id="mp-create-btn" class="w-full py-2.5 px-4 rounded-xl bg-[#262927] hover:bg-black text-white text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2">
                                    <i class="fa-solid fa-plus"></i>
                                    <span>Create New Room</span>
                                </button>
                                <div class="flex items-center space-x-2">
                                    <input id="mp-code" type="text" placeholder="5-LETTER CODE" maxlength="5" class="flex-1 px-3 py-2 rounded-xl bg-white border border-[#E3DBD0] text-xs font-bold uppercase tracking-widest text-center focus:outline-none focus:border-[#262927]">
                                    <button id="mp-join-btn" class="px-5 py-2 rounded-xl bg-[#E3DBD0] hover:bg-[#262927] hover:text-white text-xs font-bold transition-all">
                                        Join Room
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Live Connected View -->
                        <div id="mp-live-view" class="hidden mt-4 space-y-4">
                            <!-- Room Code Badge -->
                            <div class="p-3.5 rounded-2xl bg-white border border-[#E3DBD0] flex items-center justify-between">
                                <div>
                                    <div class="text-[10px] text-[#9FA8A0] uppercase font-bold tracking-wider">Active Room</div>
                                    <div id="mp-room-display" class="text-xl font-bold font-display tracking-widest text-emerald-700">ABC12</div>
                                </div>
                                <button id="mp-copy-btn" class="px-3 py-1.5 rounded-xl bg-[#F7F4EF] hover:bg-[#262927] hover:text-white text-xs font-semibold border border-[#E3DBD0] transition-all flex items-center space-x-1.5">
                                    <i class="fa-solid fa-link text-[10px]"></i>
                                    <span id="mp-copy-text">Copy Link</span>
                                </button>
                            </div>

                            <!-- Live Avatar Customization (Model & Colors) -->
                            <div class="p-3.5 rounded-2xl bg-white border border-[#E3DBD0] space-y-2.5">
                                <div class="flex items-center justify-between">
                                    <label class="text-[10px] font-bold uppercase tracking-wider text-[#9FA8A0]">Switch Avatar Model (Live)</label>
                                    <span id="mp-live-style-label" class="text-[10px] font-bold text-emerald-700 uppercase">Hover Bot</span>
                                </div>
                                <div id="mp-live-style-group" class="grid grid-cols-3 gap-2">
                                    <button data-style="hover" class="mp-live-style-btn py-1.5 px-2 rounded-xl bg-[#F7F4EF] border border-[#262927] text-xs font-bold text-center transition-all flex items-center justify-center space-x-1">
                                        <i class="fa-solid fa-paper-plane text-emerald-600 text-[10px]"></i><span>Hover</span>
                                    </button>
                                    <button data-style="robot" class="mp-live-style-btn py-1.5 px-2 rounded-xl bg-[#F7F4EF] border border-[#E3DBD0] text-xs font-bold text-center transition-all flex items-center justify-center space-x-1">
                                        <i class="fa-solid fa-robot text-sky-600 text-[10px]"></i><span>Robot</span>
                                    </button>
                                    <button data-style="classic" class="mp-live-style-btn py-1.5 px-2 rounded-xl bg-[#F7F4EF] border border-[#E3DBD0] text-xs font-bold text-center transition-all flex items-center justify-center space-x-1">
                                        <i class="fa-solid fa-person text-amber-600 text-[10px]"></i><span>Classic</span>
                                    </button>
                                    <button data-style="male" class="mp-live-style-btn py-1.5 px-2 rounded-xl bg-[#F7F4EF] border border-[#E3DBD0] text-xs font-bold text-center transition-all flex items-center justify-center space-x-1">
                                        <i class="fa-solid fa-person text-blue-600 text-[10px]"></i><span>Male</span>
                                    </button>
                                    <button data-style="female" class="mp-live-style-btn py-1.5 px-2 rounded-xl bg-[#F7F4EF] border border-[#E3DBD0] text-xs font-bold text-center transition-all flex items-center justify-center space-x-1">
                                        <i class="fa-solid fa-person-dress text-pink-600 text-[10px]"></i><span>Female</span>
                                    </button>
                                    <button data-style="vr" class="mp-live-style-btn py-1.5 px-2 rounded-xl bg-[#F7F4EF] border border-[#E3DBD0] text-xs font-bold text-center transition-all flex items-center justify-center space-x-1">
                                        <i class="fa-solid fa-vr-cardboard text-violet-600 text-[10px]"></i><span>VR</span>
                                    </button>
                                </div>
                                <div>
                                    <div class="text-[10px] font-bold uppercase tracking-wider text-[#9FA8A0] mb-1.5">Switch Color (Live)</div>
                                    <div id="mp-live-color-swatches" class="flex items-center space-x-2"></div>
                                </div>
                            </div>

                            <!-- Online Participants -->
                            <div>
                                <label class="text-[11px] font-bold uppercase tracking-wider block mb-1">Participants in Room</label>
                                <ul id="mp-roster" class="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs font-semibold"></ul>
                            </div>

                            <!-- Live Voice Controls -->
                            <div class="pt-3 border-t border-[#E3DBD0] flex items-center justify-between">
                                <button id="mp-mute-btn" class="px-4 py-2 rounded-xl bg-white border border-[#E3DBD0] hover:border-[#262927] text-xs font-bold transition-all flex items-center space-x-2">
                                    <i class="fa-solid fa-microphone"></i>
                                    <span id="mp-mute-text">Mute Mic</span>
                                </button>
                                <button id="mp-leave-btn" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all">
                                    Leave Room
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Floating Multiplayer HUD Badge -->
                <div id="mp-hud" class="fixed top-20 left-4 z-30 hidden items-center space-x-2 glass-panel px-3.5 py-1.5 rounded-full shadow-lg border border-white/80 pointer-events-auto">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span id="mp-hud-title" class="text-xs font-bold text-[#262927]">Room ABC12 &bull; 1 online</span>
                    <button id="mp-hud-mute" class="w-6 h-6 rounded-full bg-[#E3DBD0] hover:bg-[#262927] hover:text-white flex items-center justify-center text-[10px] transition-colors ml-1" title="Toggle Microphone">
                        <i class="fa-solid fa-microphone"></i>
                    </button>
                    <button id="mp-hud-open" class="w-6 h-6 rounded-full bg-[#E3DBD0] hover:bg-[#262927] hover:text-white flex items-center justify-center text-[10px] transition-colors" title="Multiplayer Settings">
                        <i class="fa-solid fa-sliders"></i>
                    </button>
                </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
            }

            // Mount trigger button into target navbar or floating dock
            if (this.mountButtonTarget) {
                const targetEl = document.querySelector(this.mountButtonTarget);
                if (targetEl && !document.getElementById('mp-trigger-btn')) {
                    const btn = document.createElement('button');
                    btn.id = 'mp-trigger-btn';
                    btn.className = 'w-8 h-8 rounded-xl flex items-center justify-center text-[#262927] hover:bg-[#E3DBD0] transition-all';
                    btn.title = 'Multiplayer & Voice Chat';
                    btn.innerHTML = '<i class="fa-solid fa-users text-xs"></i>';
                    btn.onclick = () => this.openModal(true);
                    targetEl.appendChild(btn);
                }
            } else if (!document.getElementById('mp-trigger-btn')) {
                // Default floating button
                const btn = document.createElement('button');
                btn.id = 'mp-trigger-btn';
                btn.className = 'fixed top-4 right-4 z-30 w-10 h-10 rounded-2xl glass-panel shadow-md flex items-center justify-center text-[#262927] hover:bg-[#262927] hover:text-white transition-all pointer-events-auto';
                btn.title = 'Multiplayer & Voice Chat';
                btn.innerHTML = '<i class="fa-solid fa-users text-sm"></i>';
                btn.onclick = () => this.openModal(true);
                document.body.appendChild(btn);
            }
        }

        bindUI() {
            const nameInput = document.getElementById('mp-name-input');
            if (nameInput) {
                nameInput.value = localStorage.getItem('wt.mp.name') || 'Guest';
                this.me.name = nameInput.value;
                nameInput.addEventListener('input', () => {
                    this.me.name = (nameInput.value.trim() || 'Guest').slice(0, 16);
                    localStorage.setItem('wt.mp.name', this.me.name);
                    if (this.live) this.broadcastProfile();
                });
            }

            // Color Swatches
            const swatches = document.getElementById('mp-color-swatches');
            if (swatches) {
                swatches.innerHTML = '';
                MP_COLORS.forEach((c, idx) => {
                    const btn = document.createElement('button');
                    btn.className = 'w-6 h-6 rounded-full transition-all cursor-pointer';
                    btn.style.backgroundColor = '#' + c.toString(16).padStart(6, '0');
                    btn.onclick = () => {
                        this.me.color = c;
                        [...swatches.children].forEach((b, i) => {
                            b.style.outline = i === idx ? '2px solid #262927' : 'none';
                            b.style.outlineOffset = '2px';
                        });
                        if (this.live) this.broadcastProfile();
                    };
                    swatches.appendChild(btn);
                });
                if (swatches.children[0]) swatches.children[0].click();
            }

            // Avatar Style Buttons
            const styleBtns = document.querySelectorAll('.mp-style-btn');
            styleBtns.forEach((btn) => {
                btn.onclick = () => {
                    this.me.style = btn.dataset.style;
                    styleBtns.forEach((b) => {
                        b.style.borderColor = b === btn ? '#262927' : '#E3DBD0';
                    });
                    if (this.live) this.broadcastProfile();
                };
            });

            // Live Avatar Style Buttons in Connected View
            const liveStyleBtns = document.querySelectorAll('.mp-live-style-btn');
            liveStyleBtns.forEach((btn) => {
                btn.onclick = () => {
                    this.me.style = btn.dataset.style;
                    this.paintLiveStyles();
                    const setupBtns = document.querySelectorAll('.mp-style-btn');
                    setupBtns.forEach((b) => {
                        b.style.borderColor = (b.dataset.style === this.me.style) ? '#262927' : '#E3DBD0';
                    });
                    if (this.live) this.broadcastProfile();
                    this.refreshUI();
                };
            });

            // Action Buttons
            const closeBtn = document.getElementById('mp-close-btn');
            if (closeBtn) closeBtn.onclick = () => this.openModal(false);

            const createBtn = document.getElementById('mp-create-btn');
            if (createBtn) createBtn.onclick = () => this.start('host');

            const joinBtn = document.getElementById('mp-join-btn');
            if (joinBtn) joinBtn.onclick = () => {
                const code = (document.getElementById('mp-code').value || '').trim().toUpperCase();
                if (code.length < 4) {
                    this.showError('Enter a valid 5-letter room code.');
                    return;
                }
                this.start('join', code);
            };

            const leaveBtn = document.getElementById('mp-leave-btn');
            if (leaveBtn) leaveBtn.onclick = () => this.leave();

            const copyBtn = document.getElementById('mp-copy-btn');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    const u = new URL(window.location.href);
                    u.searchParams.set('room', this.code);
                    if (navigator.clipboard) navigator.clipboard.writeText(u.href);
                    const txt = document.getElementById('mp-copy-text');
                    if (txt) {
                        txt.innerText = 'Copied!';
                        setTimeout(() => { txt.innerText = 'Copy Link'; }, 1800);
                    }
                };
            }

            const muteBtn = document.getElementById('mp-mute-btn');
            const hudMute = document.getElementById('mp-hud-mute');
            const toggleMute = () => {
                this.muted = !this.muted;
                if (this.out) {
                    this.out.getAudioTracks().forEach((t) => { t.enabled = !this.muted; });
                }
                const txt = document.getElementById('mp-mute-text');
                if (txt) txt.innerText = this.muted ? 'Unmute Mic' : 'Mute Mic';
                if (hudMute) {
                    hudMute.firstElementChild.className = this.muted ? 'fa-solid fa-microphone-slash text-rose-600' : 'fa-solid fa-microphone';
                }
                this.onToast(this.muted ? 'Microphone muted' : 'Microphone unmuted');
            };
            if (muteBtn) muteBtn.onclick = toggleMute;
            if (hudMute) hudMute.onclick = toggleMute;

            const hudOpen = document.getElementById('mp-hud-open');
            if (hudOpen) hudOpen.onclick = () => this.openModal(true);

            this.paintLiveColors();
            this.paintLiveStyles();

            window.addEventListener('beforeunload', () => this.shutdown());
        }

        paintLiveStyles() {
            const styleLabel = document.getElementById('mp-live-style-label');
            if (styleLabel) {
                const names = { hover: 'Hover Bot', robot: 'Cute Bot', classic: 'Classic', male: 'Male', female: 'Female', vr: 'VR Player' };
                styleLabel.innerText = names[this.me.style] || 'Hover Bot';
            }
            const liveBtns = document.querySelectorAll('.mp-live-style-btn');
            liveBtns.forEach(btn => {
                const isActive = (btn.dataset.style === this.me.style);
                btn.style.borderColor = isActive ? '#262927' : '#E3DBD0';
                btn.style.backgroundColor = isActive ? '#FFFFFF' : '#F7F4EF';
                btn.style.boxShadow = isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
            });
        }

        paintLiveColors() {
            const liveSwatches = document.getElementById('mp-live-color-swatches');
            if (!liveSwatches) return;
            liveSwatches.innerHTML = '';
            MP_COLORS.forEach((c, idx) => {
                const btn = document.createElement('button');
                btn.className = 'w-6 h-6 rounded-full transition-all cursor-pointer';
                btn.style.backgroundColor = '#' + c.toString(16).padStart(6, '0');
                const isSelected = (c === this.me.color);
                btn.style.outline = isSelected ? '2px solid #262927' : 'none';
                btn.style.outlineOffset = '2px';
                btn.onclick = () => {
                    this.me.color = c;
                    this.paintLiveColors();
                    const setupSwatches = document.getElementById('mp-color-swatches');
                    if (setupSwatches && setupSwatches.children[idx]) {
                        [...setupSwatches.children].forEach((b, i) => {
                            b.style.outline = (i === idx) ? '2px solid #262927' : 'none';
                            b.style.outlineOffset = '2px';
                        });
                    }
                    if (this.live) this.broadcastProfile();
                    this.refreshUI();
                };
                liveSwatches.appendChild(btn);
            });
        }

        openModal(open) {
            const modal = document.getElementById('mp-modal');
            if (!modal) return;
            modal.classList.toggle('hidden', !open);
            modal.classList.toggle('flex', open);
            if (open) {
                this.paintLiveStyles();
                this.paintLiveColors();
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }
        }

        showError(msg) {
            const err = document.getElementById('mp-err');
            if (!err) return;
            err.innerText = msg || '';
            err.classList.toggle('hidden', !msg);
        }

        /* ----------------------------------------------------------------------
           PEERJS LIBRARY LOADER & WEBRTC INITIALIZATION
           ---------------------------------------------------------------------- */
        loadPeerLib() {
            if (window.Peer) return Promise.resolve();
            return new Promise((resolve, reject) => {
                // Try local script first
                const s = document.createElement('script');
                s.src = PEERJS_LOCAL;
                s.onload = resolve;
                s.onerror = () => {
                    // Fallback to CDN
                    const cdnScript = document.createElement('script');
                    cdnScript.src = PEERJS_CDN;
                    cdnScript.onload = resolve;
                    cdnScript.onerror = () => reject(new Error('Failed to load PeerJS library. Please check your network.'));
                    document.head.appendChild(cdnScript);
                };
                document.head.appendChild(s);
            });
        }

        peerConfig() {
            return {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:stun.cloudflare.com:3478' },
                        {
                            urls: [
                                'turn:openrelay.metered.ca:80',
                                'turn:openrelay.metered.ca:443',
                                'turn:openrelay.metered.ca:443?transport=tcp'
                            ],
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        }
                    ],
                    iceCandidatePoolSize: 10,
                    iceTransportPolicy: 'all'
                }
            };
        }

        async start(mode, code) {
            this.showError('');
            const createBtn = document.getElementById('mp-create-btn');
            const joinBtn = document.getElementById('mp-join-btn');
            if (createBtn) createBtn.disabled = true;
            if (joinBtn) joinBtn.disabled = true;

            try {
                await this.loadPeerLib();

                // AudioContext for 3D positional voice
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                    if (this.ctx.resume) this.ctx.resume().catch(() => {});
                }

                // Microphone stream
                const micCheck = document.getElementById('mp-mic-check');
                this.stream = null;
                if (micCheck && micCheck.checked && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    try {
                        this.stream = await navigator.mediaDevices.getUserMedia({
                            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                        });
                    } catch (e) {
                        this.showError('Microphone permission denied: You can listen to others, but they will not hear you.');
                    }
                }
                this.out = this.stream || new MediaStream();
                // Route the mic through the Voice FX / PTT chain (silently falls back to the raw mic on any failure)
                this.out = (await this.buildVoiceChain()) || this.out;
                this.muted = false;

                this.isHost = (mode === 'host');
                this.code = this.isHost ? randCode() : (code || '').toUpperCase();
                this.hostId = 'wt-walk-' + this.code;

                await new Promise((resolve, reject) => {
                    const id = this.isHost ? this.hostId : undefined;
                    const p = new Peer(id, this.peerConfig());
                    p.on('open', () => {
                        this.peer = p;
                        resolve();
                    });
                    p.on('error', (err) => {
                        if (!this.peer) reject(err);
                        else this.onPeerError(err);
                    });
                });

                const p = this.peer;
                p.on('connection', (conn) => this.onConnection(conn, false));
                p.on('call', (call) => {
                    call.answer(this.out);
                    this.onCall(call);
                });
                p.on('disconnected', () => {
                    try { p.reconnect(); } catch (e) {}
                });

                if (!this.isHost) {
                    this.connectHost();
                }

                this.live = true;
                document.getElementById('mp-setup-view').classList.add('hidden');
                document.getElementById('mp-live-view').classList.remove('hidden');
                document.getElementById('mp-room-display').innerText = this.code;

                const hud = document.getElementById('mp-hud');
                if (hud) {
                    hud.classList.remove('hidden');
                    hud.classList.add('flex');
                }

                this.paintLiveStyles();
                this.paintLiveColors();
                this.refreshUI();
                this.startHeartbeat();

                // Distributed spawn point placement (Host at foyer, Guests at executive stations)
                if (typeof this.getSpawnPosition === 'function' && this.camera) {
                    const spawn = this.getSpawnPosition(this.isHost, this.peers.size);
                    if (spawn && spawn.pos) {
                        this.camera.position.copy(spawn.pos);
                        if (spawn.yaw !== undefined && typeof this.setYaw === 'function') {
                            this.setYaw(spawn.yaw);
                        }
                    }
                }

                this.onToast(`Joined Room: ${this.code} (${this.isHost ? 'Host' : 'Guest'})`);
            } catch (err) {
                this.leave(true);
                this.showError((err && err.message) || 'Could not connect to multiplayer room.');
            }

            if (createBtn) createBtn.disabled = false;
            if (joinBtn) joinBtn.disabled = false;
        }

        onPeerError(e) {
            if (e.type === 'peer-unavailable') {
                if (!this.isHost) {
                    this.showError('Room not found. Check the 5-letter code or make sure the host is online.');
                }
            } else if (['network', 'server-error', 'socket-error'].includes(e.type)) {
                this.showError('Connection interrupted. Attempting to reconnect…');
            }
        }

        connectHost() {
            if (!this.peer || this.peer.destroyed) return;
            const conn = this.peer.connect(this.hostId, { reliable: true });
            this.onConnection(conn, true);
        }

        onConnection(conn, initiator) {
            conn.on('open', () => {
                const me = this.peer && this.peer.id;
                const them = conn.peer;
                if (!me) return;

                const P = this.addPeer(them);
                P.conn = conn;
                P.seen = Date.now();

                // Send self profile
                conn.send({
                    t: 'hello',
                    name: this.me.name,
                    color: this.me.color,
                    style: this.me.style
                });

                // Voice call
                if (initiator) {
                    this.onCall(this.peer.call(them, this.out));
                } else if (this.isHost) {
                    // Host introduces other peers in the mesh
                    conn.send({
                        t: 'peers',
                        list: [...this.peers.keys()].filter((id) => id !== them)
                    });

                    // Sync initial interactive states
                    if (this.onSyncRequest) {
                        const syncData = this.onSyncRequest();
                        if (syncData) conn.send({ t: 'initial_sync', data: syncData });
                    }
                }
            });

            conn.on('data', (d) => {
                const P = this.peers.get(conn.peer);
                if (P) P.seen = Date.now();
                this.onData(conn.peer, d);
            });

            const cleanup = () => {
                const P = this.peers.get(conn.peer);
                if (P && P.conn === conn) this.removePeer(conn.peer);
            };
            conn.on('close', cleanup);
            conn.on('error', cleanup);
        }

        onCall(call) {
            call.on('stream', (remoteStream) => {
                this.attachVoice(call.peer, remoteStream);
            });
        }

        attachVoice(id, stream) {
            const P = this.addPeer(id);
            if (P.stream || !stream.getAudioTracks().length) return;
            P.stream = stream;

            const audioEl = document.createElement('audio');
            audioEl.srcObject = stream;
            audioEl.muted = true; // Routed through Web Audio Panner
            audioEl.play().catch(() => {});
            P.audioEl = audioEl;

            if (this.ctx) {
                try {
                    const src = this.ctx.createMediaStreamSource(stream);
                    const pan = this.ctx.createPanner();
                    const an = this.ctx.createAnalyser();

                    pan.panningModel = 'HRTF';
                    pan.distanceModel = 'inverse';
                    pan.refDistance = 1.6;
                    pan.rolloffFactor = 1.5;
                    pan.maxDistance = 35;
                    an.fftSize = 256;

                    src.connect(an);
                    src.connect(pan);
                    pan.connect(this.ctx.destination);

                    P.pan = pan;
                    P.an = an;
                    P.buf = new Uint8Array(an.fftSize);
                } catch (e) {
                    console.warn('[MP] Audio panner failed', e);
                }
            }
        }

        addPeer(id) {
            let P = this.peers.get(id);
            if (!P) {
                const av = new Avatar('Guest', MP_COLORS[0], 'hover');
                if (this.scene) this.scene.add(av.group);
                P = {
                    id,
                    name: 'Guest',
                    color: MP_COLORS[0],
                    av,
                    seen: Date.now()
                };
                this.peers.set(id, P);
                this.refreshUI();
            }
            return P;
        }

        removePeer(id) {
            const P = this.peers.get(id);
            if (!P) return;
            if (P.av) P.av.dispose();
            try { if (P.pan) P.pan.disconnect(); } catch (e) {}
            if (P.audioEl) {
                try { P.audioEl.pause(); P.audioEl.srcObject = null; } catch (e) {}
            }
            this.peers.delete(id);
            this.refreshUI();
            this.onToast(`${P.name} left the room.`);
        }

        onData(id, d) {
            if (!d || typeof d !== 'object') return;
            if (d.t === 'bye') {
                this.removePeer(id);
                return;
            }
            if (d.t === 'ping') return;

            const P = this.addPeer(id);
            if (d.t === 'hello') {
                const isFirstJoin = !P.introduced;
                P.introduced = true;
                P.name = String(d.name || 'Guest').slice(0, 16);
                P.color = Number.isInteger(d.color) ? d.color : MP_COLORS[0];
                const sty = avStyle(d.style);
                if (sty !== P.av.style) {
                    const old = P.av;
                    const nv = new Avatar(P.name, P.color, sty);
                    nv.tgt = old.tgt;
                    if (old.group) {
                        nv.group.position.copy(old.group.position);
                        nv.group.rotation.copy(old.group.rotation);
                        nv.init = old.init;
                    }
                    if (this.scene) this.scene.add(nv.group);
                    old.dispose();
                    P.av = nv;
                } else {
                    P.av.setStyle(P.name, P.color);
                }
                this.refreshUI();
                if (isFirstJoin) {
                    this.onToast(`${P.name} entered the room.`);
                }
            } else if (d.t === 'peers' && Array.isArray(d.list)) {
                d.list.forEach((pid) => {
                    if (typeof pid === 'string' && !this.peers.has(pid) && pid !== this.peer.id) {
                        this.onConnection(this.peer.connect(pid, { reliable: true }), true);
                    }
                });
            } else if (d.t === 'wave') {
                if (P.av && P.av.triggerWave()) this.onToast(`${P.name} says hello \u{1F44B}`);
            } else if (d.t === 'pos' && [d.x, d.y, d.z, d.r].every(Number.isFinite)) {
                P.av.tgt = { x: d.x, y: d.y, z: d.z, r: d.r, s: d.s ? 1 : 0 };
            } else if (d.t === 'door' && this.onDoorSync) {
                this.onDoorSync(d.id, !!d.open);
            } else if (d.t === 'fan' && this.onFanSync) {
                this.onFanSync(d.id, !!d.rotating);
            } else if (d.t === 'tv' && this.onTVSync) {
                this.onTVSync(!!d.on);
            } else if (d.t === 'initial_sync' && d.data) {
                // Support both nested and flat initial_sync structures
                if (d.data.doors && this.onDoorSync) {
                    Object.entries(d.data.doors).forEach(([doorId, isOpen]) => {
                        this.onDoorSync(doorId, !!isOpen);
                    });
                } else if (this.onDoorSync && !d.data.doors) {
                    Object.entries(d.data).forEach(([key, val]) => {
                        if (key !== 'fans' && key !== 'tv') {
                            this.onDoorSync(key, !!val);
                        }
                    });
                }
                if (d.data.fans && this.onFanSync) {
                    Object.entries(d.data.fans).forEach(([fanId, isRotating]) => {
                        this.onFanSync(fanId, !!isRotating);
                    });
                }
                if (typeof d.data.tv === 'boolean' && this.onTVSync) {
                    this.onTVSync(d.data.tv);
                }
            }
        }

        broadcast(msg) {
            this.peers.forEach((P) => {
                if (P.conn && P.conn.open) {
                    try { P.conn.send(msg); } catch (e) {}
                }
            });
        }

        broadcastProfile() {
            this.broadcast({
                t: 'hello',
                name: this.me.name,
                color: this.me.color,
                style: this.me.style
            });
        }

        broadcastDoor(doorId, isOpen) {
            this.broadcast({
                t: 'door',
                id: doorId,
                open: isOpen
            });
        }

        broadcastFan(fanId, rotating) {
            this.broadcast({
                t: 'fan',
                id: fanId,
                rotating: !!rotating
            });
        }

        broadcastTV(isOn) {
            this.broadcast({
                t: 'tv',
                on: !!isOn
            });
        }

        refreshUI() {
            const roster = document.getElementById('mp-roster');
            if (roster) {
                roster.innerHTML = '';
                // Self
                const selfLi = document.createElement('li');
                selfLi.className = 'flex items-center space-x-2 p-1.5 rounded-lg bg-[#F7F4EF]';
                selfLi.innerHTML = `
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: #${this.me.color.toString(16).padStart(6, '0')}"></span>
                    <span class="flex-1">${this.me.name} <span class="text-[10px] text-[#9FA8A0]">(You)</span></span>
                    <span class="text-[10px] text-emerald-600 font-bold uppercase">Online</span>
                `;
                roster.appendChild(selfLi);

                // Peers
                this.peers.forEach((P) => {
                    const li = document.createElement('li');
                    li.className = 'flex items-center space-x-2 p-1.5 rounded-lg bg-[#F7F4EF]';
                    li.innerHTML = `
                        <span class="w-2.5 h-2.5 rounded-full" style="background-color: #${P.color.toString(16).padStart(6, '0')}"></span>
                        <span class="flex-1">${P.name}</span>
                        <span class="text-[10px] text-emerald-600 font-bold uppercase">Online</span>
                    `;
                    roster.appendChild(li);
                });
            }

            const hudTitle = document.getElementById('mp-hud-title');
            if (hudTitle) {
                hudTitle.innerText = `Room ${this.code} • ${this.peers.size + 1} online`;
            }
            if (this.syncVoiceUI) this.syncVoiceUI();
        }

        startHeartbeat() {
            this.stopHeartbeat();
            this.timer = setInterval(() => {
                if (!this.live) return;
                this.broadcast({ t: 'ping' });
                const now = Date.now();
                this.peers.forEach((P, id) => {
                    if (now - (P.seen || now) > 15000) {
                        try { P.conn && P.conn.close(); } catch (e) {}
                        this.removePeer(id);
                    }
                });
            }, 3000);
        }

        stopHeartbeat() {
            if (this.timer) clearInterval(this.timer);
            this.timer = null;
        }

        /* ----------------------------------------------------------------------
           VOICE FX (DSP) + PUSH-TO-TALK  (additive module)
           Mic -> gain -> high-pass -> presence EQ -> [dry | pitch shifter | ring mod]
               -> low-pass -> compressor -> make-up gain -> PTT gate -> outgoing stream
           ---------------------------------------------------------------------- */
        initVoiceFx() {
            const ls = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
            this._lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
            const fx = ls('wt.mp.fx', 'off');
            this.voice = {
                fx: VOICE_FX[fx] ? fx : 'off',
                gain: Math.min(2, Math.max(0.5, parseFloat(ls('wt.mp.gain', '1')) || 1)),
                ptt: ls('wt.mp.ptt', '0') === '1',
                key: ls('wt.mp.pttkey', 'KeyV'),
                down: false,
                capturing: false,
                chain: null
            };
            const v = this.voice;

            const options = Object.keys(VOICE_FX).map((k) => `<option value="${k}">${VOICE_FX[k].label}</option>`).join('');
            const panelHtml = `
                <summary class="text-xs font-bold cursor-pointer select-none flex items-center space-x-2">
                    <i class="fa-solid fa-wave-square text-sky-600"></i><span>Voice Effects &amp; Push-to-Talk</span>
                </summary>
                <div class="mt-3 space-y-3 text-xs">
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-wider text-[#9FA8A0] block mb-1">Voice Effect (what others hear)</label>
                        <select class="mp-fx-select w-full px-3 py-2 rounded-xl bg-white border border-[#E3DBD0] text-xs font-semibold focus:outline-none focus:border-[#262927]">${options}</select>
                    </div>
                    <div>
                        <div class="flex items-center justify-between">
                            <label class="text-[10px] font-bold uppercase tracking-wider text-[#9FA8A0]">Mic Level</label>
                            <span class="mp-gain-val text-[10px] font-bold">100%</span>
                        </div>
                        <input type="range" class="mp-gain w-full accent-[#262927]" min="50" max="200" step="5" value="100">
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="font-semibold">Push-to-Talk (mic is silent until you hold the key)</span>
                        <input type="checkbox" class="mp-ptt-check w-4 h-4 accent-[#262927] cursor-pointer">
                    </div>
                    <div class="mp-ptt-keyrow flex items-center justify-between" style="display:none">
                        <span class="font-semibold">Talk key</span>
                        <button type="button" class="mp-ptt-key px-3 py-1 rounded-lg bg-[#F7F4EF] border border-[#E3DBD0] hover:border-[#262927] text-xs font-bold">V</button>
                    </div>
                    <p class="text-[10px] text-[#9FA8A0]">With Push-to-Talk on, hold the key (or press &amp; hold the on-screen button) to speak. The mute button still overrides everything.</p>
                </div>`;

            const makePanel = () => {
                const d = document.createElement('details');
                d.className = 'mp-voice-panel p-3 rounded-xl bg-white border border-[#E3DBD0]';
                d.innerHTML = panelHtml;
                d.querySelector('.mp-fx-select').onchange = (e) => {
                    v.fx = VOICE_FX[e.target.value] ? e.target.value : 'off';
                    this._lsSet('wt.mp.fx', v.fx);
                    this.applyVoiceFx(true);
                    this.syncVoiceUI();
                };
                d.querySelector('.mp-gain').oninput = (e) => {
                    v.gain = Math.min(2, Math.max(0.5, (parseInt(e.target.value, 10) || 100) / 100));
                    this._lsSet('wt.mp.gain', String(v.gain));
                    if (v.chain) v.chain.inGain.gain.setTargetAtTime(v.gain, v.chain.ctx.currentTime, 0.02);
                    this.syncVoiceUI();
                };
                d.querySelector('.mp-ptt-check').onchange = (e) => {
                    v.ptt = !!e.target.checked;
                    v.down = false;
                    this._lsSet('wt.mp.ptt', v.ptt ? '1' : '0');
                    this.applyGate();
                    this.syncVoiceUI();
                };
                d.querySelector('.mp-ptt-key').onclick = () => {
                    v.capturing = true;
                    this.syncVoiceUI();
                };
                return d;
            };

            // Setup view: right under the "Enable 3D Directional Microphone" row
            const micCheck = document.getElementById('mp-mic-check');
            const micRow = micCheck && micCheck.parentElement;
            if (micRow && micRow.parentElement) micRow.parentElement.insertBefore(makePanel(), micRow.nextSibling);

            // Live view: just above the Mute / Leave buttons
            const muteBtn = document.getElementById('mp-mute-btn');
            const ctrlRow = muteBtn && muteBtn.parentElement;
            if (ctrlRow && ctrlRow.parentElement) ctrlRow.parentElement.insertBefore(makePanel(), ctrlRow);

            // On-screen push-to-talk button (also shows state). Press & hold on touch screens.
            if (!document.getElementById('mp-ptt-pill')) {
                const pill = document.createElement('div');
                pill.id = 'mp-ptt-pill';
                pill.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:35;display:none;' +
                    'padding:9px 20px;border-radius:999px;font:700 12px Inter,system-ui,sans-serif;color:#fff;' +
                    'background:rgba(26,29,31,.88);border:2px solid #9FA8A0;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none;';
                document.body.appendChild(pill);
                pill.addEventListener('pointerdown', (e) => { e.preventDefault(); if (v.ptt) this.setPtt(true); });
                ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => pill.addEventListener(ev, () => this.setPtt(false)));
            }

            const isTyping = (e) => {
                const t = e.target;
                return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
            };
            window.addEventListener('keydown', (e) => {
                if (v.capturing) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.code !== 'Escape' && !/^(Shift|Control|Alt|Meta)/.test(e.code)) {
                        v.key = e.code;
                        this._lsSet('wt.mp.pttkey', v.key);
                    }
                    v.capturing = false;
                    this.syncVoiceUI();
                    return;
                }
                if (!v.ptt || !this.live || e.repeat || e.code !== v.key || isTyping(e)) return;
                this.setPtt(true);
            }, true);
            window.addEventListener('keyup', (e) => { if (e.code === v.key) this.setPtt(false); }, true);
            window.addEventListener('blur', () => this.setPtt(false));
            document.addEventListener('visibilitychange', () => { if (document.hidden) this.setPtt(false); });

            // Keep the pill in step with the existing mute buttons (their own handlers still run first)
            ['mp-mute-btn', 'mp-hud-mute'].forEach((id) => {
                const b = document.getElementById(id);
                if (b) b.addEventListener('click', () => this.syncVoiceUI());
            });

            this.syncVoiceUI();
        }

        /* ----------------------------------------------------------------------
           EMOTES: "wave hello" on a key (default H). Synced to everyone in the room.
           ---------------------------------------------------------------------- */
        initEmotes() {
            let key = 'KeyH';
            try { key = localStorage.getItem('wt.mp.wavekey') || 'KeyH'; } catch (e) {}
            this.emote = { key, capturing: false, until: 0 };
            const em = this.emote;

            const makePanel = () => {
                const d = document.createElement('div');
                d.className = 'mp-emote-panel p-3 rounded-xl bg-white border border-[#E3DBD0] flex items-center justify-between text-xs';
                d.innerHTML = `
                    <span class="font-semibold"><i class="fa-solid fa-hand text-amber-500 mr-1.5"></i>Wave hello</span>
                    <span class="flex items-center space-x-2">
                        <button type="button" class="mp-wave-key px-3 py-1 rounded-lg bg-[#F7F4EF] border border-[#E3DBD0] hover:border-[#262927] text-xs font-bold" title="Click, then press a new key">H</button>
                        <button type="button" class="mp-wave-now px-3 py-1 rounded-lg bg-[#262927] hover:bg-black text-white text-xs font-bold">Wave</button>
                    </span>`;
                d.querySelector('.mp-wave-key').onclick = () => {
                    if (this.voice) this.voice.capturing = false;
                    em.capturing = true;
                    this.syncVoiceUI();
                };
                d.querySelector('.mp-wave-now').onclick = () => this.doWave();
                return d;
            };
            document.querySelectorAll('.mp-voice-panel').forEach((p) => {
                if (p.parentElement) p.parentElement.insertBefore(makePanel(), p.nextSibling);
            });

            // On-screen wave button (touch / VR-browser friendly)
            if (!document.getElementById('mp-wave-btn')) {
                const b = document.createElement('div');
                b.id = 'mp-wave-btn';
                b.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:35;display:none;padding:9px 18px;border-radius:999px;' +
                    'font:700 12px Inter,system-ui,sans-serif;color:#fff;background:rgba(26,29,31,.88);border:2px solid #fbbf24;' +
                    'cursor:pointer;user-select:none;-webkit-user-select:none;';
                document.body.appendChild(b);
                b.addEventListener('click', () => this.doWave());
            }

            const isTyping = (e) => {
                const t = e.target;
                return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
            };
            window.addEventListener('keydown', (e) => {
                if (em.capturing) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.code !== 'Escape' && !/^(Shift|Control|Alt|Meta)/.test(e.code)) {
                        if (this.voice && e.code === this.voice.key) {
                            this.onToast('That key is already used for Push-to-Talk.');
                        } else {
                            em.key = e.code;
                            try { localStorage.setItem('wt.mp.wavekey', em.key); } catch (err) {}
                        }
                    }
                    em.capturing = false;
                    this.syncVoiceUI();
                    return;
                }
                if (!this.live || e.repeat || e.code !== em.key || isTyping(e)) return;
                this.doWave();
            }, true);

            this.syncEmoteUI();
        }

        emoteKeyLabel() {
            const k = (this.emote && this.emote.key) || 'KeyH';
            return k.replace(/^Key|^Digit/, '') || k;
        }

        syncEmoteUI() {
            const em = this.emote;
            if (!em) return;
            document.querySelectorAll('.mp-wave-key').forEach((b) => {
                b.innerText = em.capturing ? 'Press a key…' : this.emoteKeyLabel();
            });
            const b = document.getElementById('mp-wave-btn');
            if (b) {
                b.style.display = this.live ? 'block' : 'none';
                b.innerText = `\u{1F44B} Wave (${this.emoteKeyLabel()})`;
            }
        }

        doWave() {
            if (!this.live || !this.emote) return;
            const now = performance.now() / 1000;
            if (now < this.emote.until) return;          // short cooldown while the animation plays
            this.emote.until = now + 2.4;
            this.broadcast({ t: 'wave' });
            this.onToast('You waved \u{1F44B}');
        }

        voiceKeyLabel() {
            const k = (this.voice && this.voice.key) || 'KeyV';
            return k.replace(/^Key|^Digit/, '') || k;
        }

        syncVoiceUI() {
            const v = this.voice;
            if (!v) return;
            document.querySelectorAll('.mp-voice-panel').forEach((p) => {
                const sel = p.querySelector('.mp-fx-select');
                if (sel) sel.value = v.fx;
                const gain = p.querySelector('.mp-gain');
                if (gain) gain.value = String(Math.round(v.gain * 100));
                const gv = p.querySelector('.mp-gain-val');
                if (gv) gv.innerText = Math.round(v.gain * 100) + '%';
                const chk = p.querySelector('.mp-ptt-check');
                if (chk) chk.checked = v.ptt;
                const row = p.querySelector('.mp-ptt-keyrow');
                if (row) row.style.display = v.ptt ? 'flex' : 'none';
                const kb = p.querySelector('.mp-ptt-key');
                if (kb) kb.innerText = v.capturing ? 'Press a key…' : this.voiceKeyLabel();
            });

            const pill = document.getElementById('mp-ptt-pill');
            if (pill) {
                const show = !!(this.live && v.ptt);
                pill.style.display = show ? 'block' : 'none';
                if (show) {
                    if (this.muted) {
                        pill.innerText = 'Mic muted';
                        pill.style.borderColor = '#fb7185';
                        pill.style.background = 'rgba(26,29,31,.88)';
                    } else if (v.down) {
                        pill.innerText = 'Transmitting…';
                        pill.style.borderColor = '#34d399';
                        pill.style.background = 'rgba(5,95,70,.92)';
                    } else {
                        pill.innerText = `Hold ${this.voiceKeyLabel()} to talk`;
                        pill.style.borderColor = '#9FA8A0';
                        pill.style.background = 'rgba(26,29,31,.88)';
                    }
                }
            }
            if (this.syncEmoteUI) this.syncEmoteUI();
        }

        setPtt(down) {
            const v = this.voice;
            if (!v || v.down === down) return;
            v.down = down;
            this.applyGate();
            this.syncVoiceUI();
        }

        applyGate() {
            const v = this.voice;
            const c = v && v.chain;
            if (!c) return;
            const open = !v.ptt || v.down;
            c.gate.gain.setTargetAtTime(open ? 1 : 0, c.ctx.currentTime, 0.008);
        }

        applyVoiceFx(announce) {
            const v = this.voice;
            const c = v && v.chain;
            if (!c) return;
            const p = VOICE_FX[v.fx] || VOICE_FX.off;
            const t = c.ctx.currentTime;
            const tc = 0.03;
            const wantsPitch = p.pitch !== 1;
            const usePitch = wantsPitch && !!c.pitch;
            const useRing = !!p.ring;

            c.dryG.gain.setTargetAtTime(usePitch || useRing ? 0 : 1, t, tc);
            c.pitchG.gain.setTargetAtTime(usePitch ? 1 : 0, t, tc);
            c.ringG.gain.setTargetAtTime(useRing ? 1.4 : 0, t, tc);
            if (c.pitch) c.pitch.set(p.pitch);

            c.hp.frequency.setTargetAtTime(p.hp, t, tc);
            c.lp.frequency.setTargetAtTime(p.lp, t, tc);
            c.peak.gain.setTargetAtTime(p.peak, t, tc);
            c.comp.threshold.setTargetAtTime(p.comp ? -26 : 0, t, tc);
            c.comp.ratio.setTargetAtTime(p.comp ? 3.5 : 1, t, tc);
            c.makeup.gain.setTargetAtTime(p.makeup, t, tc);

            if (announce && wantsPitch && !c.pitch) this.onToast('Pitch shifting is not supported in this browser - effect not applied.');
            else if (announce && this.live) this.onToast(`Voice effect: ${p.label}`);
        }

        async createPitchNode(ctx) {
            // Preferred: AudioWorklet (own audio thread). Fallback: ScriptProcessor (works on file:// and older browsers).
            if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined' && window.Blob && window.URL) {
                try {
                    const code = `${makePitchCore.toString()}
                    class WTPitch extends AudioWorkletProcessor {
                        static get parameterDescriptors() {
                            return [{ name: 'pitch', defaultValue: 1, minValue: 0.5, maxValue: 2, automationRate: 'k-rate' }];
                        }
                        constructor() { super(); this.core = makePitchCore(sampleRate); }
                        process(inputs, outputs, params) {
                            const i = inputs[0] && inputs[0][0];
                            const o = outputs[0] && outputs[0][0];
                            if (!o) return true;
                            if (!i) { o.fill(0); return true; }
                            this.core(i, o, params.pitch[0]);
                            return true;
                        }
                    }
                    registerProcessor('wt-pitch', WTPitch);`;
                    const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
                    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
                    const node = new AudioWorkletNode(ctx, 'wt-pitch', {
                        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
                        channelCount: 1, channelCountMode: 'explicit'
                    });
                    const prm = node.parameters.get('pitch');
                    return { node, kind: 'worklet', set: (x) => { prm.value = x; } };
                } catch (e) {
                    console.warn('[MP] AudioWorklet pitch shifter unavailable, using fallback', e);
                }
            }
            if (ctx.createScriptProcessor) {
                try {
                    const core = makePitchCore(ctx.sampleRate);
                    let pitch = 1;
                    const node = ctx.createScriptProcessor(2048, 1, 1);
                    node.onaudioprocess = (e) => core(e.inputBuffer.getChannelData(0), e.outputBuffer.getChannelData(0), pitch);
                    return { node, kind: 'script', set: (x) => { pitch = x; } };
                } catch (e) {
                    console.warn('[MP] ScriptProcessor pitch shifter unavailable', e);
                }
            }
            return null;
        }

        async buildVoiceChain() {
            this.stopVoiceChain();
            const ctx = this.ctx;
            const v = this.voice;
            if (!ctx || !v || !this.stream || !this.stream.getAudioTracks().length) return null;
            try {
                if (ctx.state === 'suspended') await ctx.resume().catch(() => {});

                const f = (type, freq, q) => {
                    const n = ctx.createBiquadFilter();
                    n.type = type;
                    n.frequency.value = freq;
                    if (q !== undefined) n.Q.value = q;
                    return n;
                };
                const src = ctx.createMediaStreamSource(this.stream);
                const inGain = ctx.createGain();
                inGain.gain.value = v.gain;
                const hp = f('highpass', 20, 0.707);
                const peak = f('peaking', 3500, 0.9);
                peak.gain.value = 0;
                const dryG = ctx.createGain();
                const pitchG = ctx.createGain();
                const ringG = ctx.createGain();
                const ring = ctx.createGain();
                ring.gain.value = 0;                       // carrier drives the gain => input x oscillator
                const osc = ctx.createOscillator();
                osc.frequency.value = 55;
                osc.connect(ring.gain);
                osc.start();
                const mix = ctx.createGain();
                const lp = f('lowpass', 20000, 0.707);
                const comp = ctx.createDynamicsCompressor();
                comp.threshold.value = 0; comp.ratio.value = 1; comp.knee.value = 12;
                comp.attack.value = 0.01; comp.release.value = 0.25;
                const makeup = ctx.createGain();
                const gate = ctx.createGain();
                gate.gain.value = (!v.ptt || v.down) ? 1 : 0;
                const dest = ctx.createMediaStreamDestination();

                const pitch = await this.createPitchNode(ctx);

                src.connect(inGain);
                inGain.connect(hp);
                hp.connect(peak);
                peak.connect(dryG); dryG.connect(mix);
                peak.connect(ring); ring.connect(ringG); ringG.connect(mix);
                if (pitch) { peak.connect(pitch.node); pitch.node.connect(pitchG); pitchG.connect(mix); }
                mix.connect(lp);
                lp.connect(comp);
                comp.connect(makeup);
                makeup.connect(gate);
                gate.connect(dest);

                v.chain = { ctx, src, inGain, hp, peak, dryG, pitchG, ringG, ring, osc, mix, lp, comp, makeup, gate, dest, pitch };
                this.applyVoiceFx(false);
                this.applyGate();
                return dest.stream;
            } catch (e) {
                console.warn('[MP] Voice FX chain failed - using raw microphone', e);
                v.chain = null;
                return null;
            }
        }

        stopVoiceChain() {
            const v = this.voice;
            if (!v) return;
            const c = v.chain;
            v.chain = null;
            v.down = false;
            if (c) {
                try { c.osc.stop(); } catch (e) {}
                try { if (c.pitch && c.pitch.kind === 'script') c.pitch.node.onaudioprocess = null; } catch (e) {}
                try { c.src.disconnect(); } catch (e) {}
                try { c.pitch && c.pitch.node.disconnect(); } catch (e) {}
            }
            this.syncVoiceUI();
        }

        /* ----------------------------------------------------------------------
           FRAME UPDATE (Called in Three.js animate() loop)
           ---------------------------------------------------------------------- */
        update(dt) {
            if (!this.live) return;

            // 1. Broadcast position at 20Hz (every 50ms)
            this.sendT += dt;
            if (this.sendT >= 0.05 && this.camera) {
                this.sendT = 0;
                const cam = this.camera;
                const groundY = this.getGroundY();
                const yaw = this.getYaw();
                const seated = this.isSeated();
                this.broadcast({
                    t: 'pos',
                    x: Number(cam.position.x.toFixed(3)),
                    y: Number((groundY || 0).toFixed(3)),
                    z: Number(cam.position.z.toFixed(3)),
                    r: Number(yaw.toFixed(3)),
                    s: seated ? 1 : 0
                });
            }

            // 2. Update 3D Audio Listener
            if (this.ctx && this.camera) {
                const L = this.ctx.listener;
                const cam = this.camera;
                const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);

                if (L.positionX) {
                    L.positionX.value = cam.position.x;
                    L.positionY.value = cam.position.y;
                    L.positionZ.value = cam.position.z;
                    L.forwardX.value = f.x;
                    L.forwardY.value = f.y;
                    L.forwardZ.value = f.z;
                    L.upX.value = 0;
                    L.upY.value = 1;
                    L.upZ.value = 0;
                } else if (L.setPosition) {
                    L.setPosition(cam.position.x, cam.position.y, cam.position.z);
                    L.setOrientation(f.x, f.y, f.z, 0, 1, 0);
                }
            }

            // 3. Update Avatars & Audio Analysers
            this.peers.forEach((P) => {
                P.av.update(dt);
                if (P.pan && P.av.group) {
                    const pos = P.av.group.position;
                    if (P.pan.positionX) {
                        P.pan.positionX.value = pos.x;
                        P.pan.positionY.value = pos.y + 1.5;
                        P.pan.positionZ.value = pos.z;
                    } else if (P.pan.setPosition) {
                        P.pan.setPosition(pos.x, pos.y + 1.5, pos.z);
                    }
                }
                if (P.an && P.buf) {
                    P.an.getByteTimeDomainData(P.buf);
                    let m = 0;
                    for (let i = 0; i < P.buf.length; i++) {
                        m = Math.max(m, Math.abs(P.buf[i] - 128));
                    }
                    P.av.talk += (Math.min(1, m / 35) - P.av.talk) * 0.3;
                }
            });
        }

        leave(silent = false) {
            if (this.live) {
                try { this.broadcast({ t: 'bye' }); } catch (e) {}
            }
            this.live = false;
            this.stopHeartbeat();

            this.peers.forEach((P) => {
                try { P.conn && P.conn.close(); } catch (e) {}
                if (P.av) P.av.dispose();
                if (P.audioEl) {
                    try { P.audioEl.pause(); P.audioEl.srcObject = null; } catch (e) {}
                }
            });
            this.peers.clear();

            try { this.peer && this.peer.destroy(); } catch (e) {}
            this.peer = null;

            if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
            this.stream = this.out = null;

            this.stopVoiceChain();
            try { this.ctx && this.ctx.close(); } catch (e) {}
            this.ctx = null;

            const setupView = document.getElementById('mp-setup-view');
            const liveView = document.getElementById('mp-live-view');
            const hud = document.getElementById('mp-hud');

            if (setupView) setupView.classList.remove('hidden');
            if (liveView) liveView.classList.add('hidden');
            if (hud) hud.classList.add('hidden');

            if (!silent) {
                this.showError('');
                this.onToast('Disconnected from multiplayer room.');
            }
        }

        shutdown() {
            if (!this.live) return;
            this.leave(true);
        }
    }

    return WalkthroughMultiplayer;
}));
