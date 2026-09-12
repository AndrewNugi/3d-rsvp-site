import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { createInviteCard } from "./invite-card";
import { useEffect, useRef, useState } from "react";
import RsvpForm from "./rsvp-form";
import Polaroids, { PHOTOS } from "./polaroids";

const W = 2;        // envelope width
const H = 1.3;      // envelope height
const D = 0.002;     // envelope thickness
const FLAP_DROP = 0.72; // how far the flap tip hangs down

const CARD_REST_Y = -0.80;   // where it settles, below the envelope
const CARD_PEAK_Y = 0.55;   // top of the arc

const REST_ROT_X = -0.18;
const REST_ROT_Y = -0.28;

const isMobile = window.innerWidth < 768;


function Envelope() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [revealed, setRevealed] = useState(false);
    const rsvpRef = useRef<HTMLElement>(null);
    const hasRevealed = useRef(false);
    const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [opened, setOpened] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const getSize = () => ({
            w: container.clientWidth || window.innerWidth,
            h: container.clientHeight || window.innerHeight,
        });

        // --- scene / camera / renderer ---
        const scene = new THREE.Scene();
        // scene.background = new THREE.Color(0xfdeef4);

        let visible = true;
        const io = new IntersectionObserver(
            ([entry]) => { visible = entry.isIntersecting; },
            { threshold: 0 },
        );
        io.observe(container);

        const bgCanvas = document.createElement("canvas");
        bgCanvas.width = 2;
        bgCanvas.height = 512;
        const bgCtx = bgCanvas.getContext("2d")!;

        const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0.00, "#fffbfa");
        grad.addColorStop(0.30, "#fdf1f4");
        grad.addColorStop(0.65, "#f9e4ea");
        grad.addColorStop(1.00, "#f3d9e1");
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, 2, 512);

        const bgTexture = new THREE.CanvasTexture(bgCanvas);
        bgTexture.colorSpace = THREE.SRGBColorSpace;
        scene.background = bgTexture;

        const { w, h } = getSize();
        const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        const isMobile = window.innerWidth < 768;
        camera.position.set(0, 0, isMobile ? 5.8 : 3.6);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();

        let envTexture: THREE.Texture | null = null;
        new RGBELoader().load('/hdr/studio.hdr', (hdr: any) => {
            envTexture = pmrem.fromEquirectangular(hdr).texture;
            scene.environment = envTexture;
            hdr.dispose();
            pmrem.dispose();
        });

        const texLoader = new THREE.TextureLoader();

        const paperNormal = texLoader.load("/textures/paper_normal.jpg");
        const paperRough = texLoader.load("/textures/paper_roughness.jpg");

        [paperNormal, paperRough].forEach((t) => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(3, 2);
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        });

        // --- materials ---
        const paper = new THREE.MeshStandardMaterial({
            color: 0xf7dde6,
            normalMap: paperNormal,
            normalScale: new THREE.Vector2(0.35, 0.35),
            roughnessMap: paperRough,
            roughness: 0.6,
            envMapIntensity: 0.8,
            metalness: 0,
            // flatShading: true
        });
        const flapPaper = new THREE.MeshStandardMaterial({
            color: 0xebc4d2,     // a shade darker so the fold edge is visible
            normalMap: paperNormal,
            normalScale: new THREE.Vector2(0.35, 0.35),
            roughnessMap: paperRough,
            roughness: 0.7,
            envMapIntensity: 0.8,
            metalness: 0,
            side: THREE.DoubleSide, // ShapeGeometry is single-sided by default
            // flatShading: true
        });

        // --- envelope group (tilt slightly for depth) ---
        const envelope = new THREE.Group();
        envelope.rotation.set(-0.18, -0.28, 0);
        scene.add(envelope);

        // body
        const bodyGeo = new THREE.BoxGeometry(W, H, D);
        const body = new THREE.Mesh(bodyGeo, paper);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0xd98cab,
            wireframe: true
        })
        const wireMesh = new THREE.Mesh(bodyGeo, wireMat)
        wireMesh.scale.setScalar(1.001);
        envelope.add(body);
        // envelope.add(wireMesh)

        // flap: a real flat triangle, drawn hanging DOWN from local origin
        const shape = new THREE.Shape();
        shape.moveTo(-W / 2, 0);
        shape.lineTo(W / 2, 0);
        shape.lineTo(0, -FLAP_DROP);
        shape.closePath();
        const flapGeo = new THREE.ShapeGeometry(shape);

        // hinge sits at the top edge of the body, just in front of the face
        const hinge = new THREE.Group();
        hinge.position.set(0, H / 2, D / 2 + 0.002);
        const flap = new THREE.Mesh(flapGeo, flapPaper);
        const wireMesh2 = new THREE.Mesh(flapGeo, wireMat)
        wireMesh2.scale.setScalar(1.005);
        hinge.add(flap);
        hinge.add(wireMesh2)
        envelope.add(hinge);

        // --- invite card ---
        const invite = createInviteCard(renderer);
        const card = invite.mesh;
        card.position.set(0, 0, 0);
        envelope.add(card);

        const sealNormal = texLoader.load("/textures/seal_normal.jpg");
        const sealRough = texLoader.load("/textures/seal_roughness.jpg");

        [sealNormal, sealRough].forEach((t) => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(1, 1);   // ← not 3,2
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        });

        // --- wax seal ---
        const sealGeo = new THREE.CylinderGeometry(0.13, 0.14, 0.005, 32);
        const sealMat = new THREE.MeshStandardMaterial({
            color: 0xc94f7c,        // deep rose wax
            normalMap: sealNormal,
            normalScale: new THREE.Vector2(0.9, 0.9),
            roughnessMap: sealRough,
            roughness: 0.45,
            metalness: 0.4,
            envMapIntensity: 1.2,
        });
        const seal = new THREE.Mesh(sealGeo, sealMat);

        seal.rotation.x = Math.PI / 2;              // lay it flat against the paper
        seal.position.set(0, -FLAP_DROP + 0.1, 0.005);
        seal.castShadow = true;
        seal.receiveShadow = true;

        hinge.add(seal);

        const ringGeo = new THREE.TorusGeometry(0.1, 0.005, 12, 32);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xa63a63,
            normalMap: sealNormal,
            normalScale: new THREE.Vector2(0.9, 0.9),
            roughnessMap: sealRough,
            roughness: 0.5,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, -FLAP_DROP + 0.1, 0.008);
        hinge.add(ring);


        // --- lighting ---
        // scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const hemiLight = new THREE.HemisphereLight(
            0xfff0f5,   // sky: lavender blush — soft warm white from above
            0xff9ec4,   // ground: rose pink bouncing up from below
            0.25         // intensity
        );
        scene.add(hemiLight);

        // const key = new THREE.DirectionalLight(0xffffff, 0.8);
        // key.position.set(2, 3, 4);
        // scene.add(key);

        const key = new THREE.DirectionalLight(0xffffff, 0.8);
        key.position.set(0, 5, 2);
        key.castShadow = true;

        key.shadow.mapSize.set(4096, 4096);
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 15;
        key.shadow.camera.left = -3;
        key.shadow.camera.right = 3;
        key.shadow.camera.top = 3;
        key.shadow.camera.bottom = -3;
        key.shadow.bias = -0.001;
        key.shadow.radius = 50;

        scene.add(key);

        const rim = new THREE.DirectionalLight(0xfff0f5, 0.9);
        rim.position.set(-2, 1, -4);
        scene.add(rim);

        body.castShadow = true;
        body.receiveShadow = true;

        flap.castShadow = true;
        flap.receiveShadow = true;

        card.castShadow = true;
        card.receiveShadow = true;

        // Floor
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.6;
        floor.receiveShadow = true;
        scene.add(floor);   // scene, not envelope — it shouldn't tilt

        // --- open / close on click ---
        let open = 0;        // current, 0 = closed, 1 = fully open
        let target = 0;      // where we're heading
        let downX = 0, downY = 0;
        const onPointerDown = (e: PointerEvent) => {
            downX = e.clientX;
            downY = e.clientY;
        };
        const onPointerUp = (e: PointerEvent) => {
            const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
            if (moved >= 5) return;   // a drag, not a click

            target = target === 0 ? 1 : 0;
            setOpened(true);

            if (target === 1 && !hasRevealed.current) {
                PHOTOS.forEach((p) => {
                    const img = new Image();
                    img.src = p.src;
                    img.decode?.().catch(() => { });
                });
                revealTimer.current = setTimeout(() => {
                    hasRevealed.current = true;
                    setRevealed(true);
                }, 3000);
            } else if (target === 0 && revealTimer.current) {
                clearTimeout(revealTimer.current);
                revealTimer.current = null;
            }
        };
        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointerup", onPointerUp);

        // --- resize ---
        const onResize = () => {
            const { w, h } = getSize();
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener("resize", onResize);

        // --- loop ---
        let frameId = 0;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            if (!visible) return;
            open += (target - open) * 0.08;              // ease toward target
            hinge.rotation.x = -open * Math.PI * 0.98;   // swing up toward viewer
            // envelope.scale.setScalar(Math.cos(t * 0.001) + 1.0);
            // envelope.rotation.y = t * 0.0005;
            const facing = Math.atan2(
                camera.position.x - envelope.position.x,
                camera.position.z - envelope.position.z,
            );
            envelope.rotation.y = THREE.MathUtils.lerp(REST_ROT_Y, facing, open);
            envelope.rotation.x = REST_ROT_X * (1 - open);

            // card starts once the flap is ~half open
            const p = THREE.MathUtils.clamp((open - 0.80) / 0.20, 0, 1);

            if (p <= 0) {
                card.position.set(0, 0, 0);
                card.rotation.set(0, 0, 0);
            } else {
                // two phases: 0 → 0.45 = jump up, 0.45 → 1 = fall and land
                if (p < 0.45) {
                    const u = p / 0.45;
                    const eased = 1 - Math.pow(1 - u, 2);        // decelerate at the peak
                    card.position.y = eased * CARD_PEAK_Y;
                    card.position.z = THREE.MathUtils.lerp(0, 0.05, eased);
                } else {
                    const u = (p - 0.45) / 0.55;
                    const eased = u * u;                          // accelerate downward
                    card.position.y = THREE.MathUtils.lerp(CARD_PEAK_Y, CARD_REST_Y, eased);
                    card.position.z = THREE.MathUtils.lerp(0.05, 0.1, eased);
                }

                // tumble slightly on the way, settle flat at the end
                const settle = THREE.MathUtils.clamp((p - 0.8) / 0.2, 0, 1);
                card.rotation.z = Math.sin(p * Math.PI * 1.4) * 0.35 * (1 - settle);
                card.rotation.x = Math.sin(p * Math.PI) * 0.25 * (1 - settle);
            }

            controls.update();


            renderer.render(scene, camera);
        };

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true;
        controls.dampingFactor = 0.03;

        animate();

        // --- cleanup ---
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener("resize", onResize);
            bodyGeo.dispose();
            flapGeo.dispose();
            paper.dispose();
            flapPaper.dispose();
            invite.dispose();
            renderer.dispose();
            renderer.domElement.removeEventListener("pointerdown", onPointerDown);
            renderer.domElement.removeEventListener("pointerup", onPointerUp);
            if (revealTimer.current) clearTimeout(revealTimer.current);
            wireMat.dispose();
            controls.dispose();
            bgTexture.dispose();
            floorGeo.dispose();
            floorMat.dispose();
            sealGeo.dispose();
            sealMat.dispose();
            sealRough.dispose();
            sealNormal.dispose();
            io.disconnect();
            envTexture?.dispose();
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    // lock scrolling until the envelope has been opened
    useEffect(() => {
        document.body.style.overflow = revealed ? "" : "hidden";
        return () => { document.body.style.overflow = ""; };
    }, [revealed]);

    // scroll down once the form has mounted
    useEffect(() => {
        if (!revealed) return;
        const id = setTimeout(() => {
            window.scrollTo({ top: rsvpRef.current?.offsetTop ?? 0, behavior: "smooth" });
        }, 100);
        return () => clearTimeout(id);
    }, [revealed]);

    return (
        <>
            <section
                style={{
                    width: "100%",
                    height: "100vh",
                    display: "flex",
                    justifyContent: "center",
                    background: "linear-gradient(180deg, #fffbfa 0%, #fdf1f4 30%, #f9e4ea 65%, #f3d9e1 100%)",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        width: "100%",
                    }}
                >
                    <div
                        ref={containerRef}
                        style={{
                            width: isMobile ? "min(980px, 90vw)" : "min(900px, 80vw)",
                            flex: 1,
                            minWidth: 0,
                            minHeight: 0,
                            overflow: "hidden",
                        }}
                    />

                    <p className={`open-hint${opened ? " hidden" : ""}`}>
                        Click the envelope to open
                    </p>
                </div>
            </section>

            {revealed && (
                <section
                    ref={rsvpRef}
                    className={revealed ? "rsvp-section visible" : "rsvp-section"}
                    style={{
                        minHeight: "50vh",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3rem",
                        padding: "4rem 1.5rem",
                        background: "linear-gradient(180deg, #f3d9e1 0%, #fdf1f4 100%)",
                    }}
                >
                    <Polaroids />
                    <RsvpForm />
                </section>
            )}
        </>
    );
}

export default Envelope;