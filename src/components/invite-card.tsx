import * as THREE from "three";

type CardImages = {
    background?: HTMLImageElement;
    cutout?: HTMLImageElement;
};

const SS = 2;                  // supersample factor
const DESIGN_W = 1024;
const DESIGN_H = 662;
const PX_W = DESIGN_W * SS;
const PX_H = DESIGN_H * SS;
export const CARD_W = 1.7;
export const CARD_H = 1.1;

// const PX_W = 1024;
// const PX_H = 662;   // matches CARD_W / CARD_H

async function loadFonts() {
    if (!document.fonts) return;
    await Promise.all([
        document.fonts.load('italic 500 52px "Playfair Display"'),
        document.fonts.load('500 34px "Lora"'),
        document.fonts.load('400 30px "Lora"'),
    ]);
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });
}

function drawCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number, y: number, w: number, h: number,
) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function draw(ctx: CanvasRenderingContext2D, imgs: CardImages = {}) {
    const W = DESIGN_W;
    const H = DESIGN_H;

    ctx.setTransform(SS, 0, 0, SS, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.clearRect(0, 0, W, H);

    // base paper
    ctx.fillStyle = "#fffcfd";
    ctx.fillRect(0, 0, W, H);

    // --- photo panel, right side ---
    const panelX = W * 0.56;
    const panelW = W - panelX;

    if (imgs.background) {
        drawCover(ctx, imgs.background, panelX, 0, panelW, H);
    } else {
        ctx.fillStyle = "#f3d9e1";
        ctx.fillRect(panelX, 0, panelW, H);
    }

    // soft fade from the paper into the photo
    const fade = ctx.createLinearGradient(panelX, 0, panelX + 200, 0);
    fade.addColorStop(0, "rgba(255,252,253,1)");
    fade.addColorStop(1, "rgba(255,252,253,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(panelX, 0, 200, H);

    // --- cutout, sitting in front ---
    if (imgs.cutout) {
        const ch = H * 0.92;
        const cw = (imgs.cutout.width / imgs.cutout.height) * ch;
        ctx.drawImage(imgs.cutout, panelX + panelW * 0.5 - cw / 2, H - ch, cw, ch);
    }

    // --- text, left side ---
    // --- text, left side ---
    const textX = W * 0.07;

    ctx.textAlign = "left";

    // heading
    ctx.fillStyle = "#a63a63";
    ctx.font = 'italic 500 52px "Playfair Display", Georgia, serif';
    ctx.fillText("You're Invited", textX, 168);

    // rule
    ctx.strokeStyle = "#e8b8cc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(textX, 200);
    ctx.lineTo(textX + 240, 200);
    ctx.stroke();

    // body copy
    ctx.fillStyle = "#5c3142";
    ctx.font = '400 34px "Lora", Georgia, serif';
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0.4px";

    [
        "We would love for you to",
        "join us in celebrating",
    ].forEach((line, i) => {
        ctx.fillText(line, textX, 290 + i * 50);
    });

    // the name, given weight
    ctx.fillStyle = "#8a2d52";
    ctx.font = 'italic 500 42px "Playfair Display", Georgia, serif';
    ctx.fillText("Makena Kaminchia", textX, 420);
    
    ctx.fillStyle = "#5c3142";
    ctx.font = '400 34px "Lora", Georgia, serif';
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0.4px";

    [
        "for completing BA-IS",
    ].forEach((line, i) => {
        ctx.fillText(line, textX, 480 + i * 50);
    });

    // the name, given weight
    ctx.fillStyle = "#8a2d52";
    ctx.font = 'italic 500 20px "Playfair Display", Georgia, serif';
    ctx.fillText("with a FIRST CLASS HONOURS 🎓", textX, 520);

    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

export function createInviteCard(renderer: THREE.WebGLRenderer) {
    const canvas = document.createElement("canvas");
    canvas.width = PX_W;
    canvas.height = PX_H;
    draw(canvas.getContext("2d")!);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    let cancelled = false;

    Promise.all([
        loadFonts(),
        loadImage("/photos/IMG_7819.webp"),
        loadImage("/photos/IMG_1777.png"),
    ])
        .then(([, background, cutout]) => {
            if (cancelled) return;
            draw(canvas.getContext("2d")!, { background, cutout });
            texture.needsUpdate = true;
        })
        .catch((err) => console.error("Invite card:", err));

    return {
        mesh,
        dispose() {
            cancelled = true;
            geometry.dispose();
            material.dispose();
            texture.dispose();
        },
    };
}