import * as THREE from "three";

type CardImages = {
    background?: HTMLImageElement;
    cutout?: HTMLImageElement;
};


export const CARD_W = 1.7;
export const CARD_H = 1.1;

const PX_W = 1024;
const PX_H = 662;   // matches CARD_W / CARD_H

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
    const W = PX_W;
    const H = PX_H;

    ctx.clearRect(0, 0, W, H);

    // base paper
    ctx.fillStyle = "#fffcfd";
    ctx.fillRect(0, 0, W, H);

    // --- photo panel, right side ---
    const panelX = W * 0.50;
    const panelW = W - panelX;

    if (imgs.background) {
        drawCover(ctx, imgs.background, panelX, 0, panelW, H);
    } else {
        ctx.fillStyle = "#f3d9e1";
        ctx.fillRect(panelX, 0, panelW, H);
    }

    // soft fade from the paper into the photo
    const fade = ctx.createLinearGradient(panelX, 0, panelX + 180, 0);
    fade.addColorStop(0, "rgba(255,252,253,1)");
    fade.addColorStop(1, "rgba(255,252,253,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(panelX, 0, 180, H);

    // --- cutout, sitting in front ---
    if (imgs.cutout) {
        const ch = H * 0.92;
        const cw = (imgs.cutout.width / imgs.cutout.height) * ch;
        ctx.drawImage(imgs.cutout, panelX + panelW * 0.5 - cw / 2, H - ch, cw, ch);
    }

    // --- text, left side ---
    const textX = W * 0.06;

    ctx.textAlign = "left";
    ctx.fillStyle = "#a63a63";
    ctx.font = "italic 34px Georgia, serif";
    ctx.fillText("You're Invited", textX, 150);

    ctx.strokeStyle = "#e8b8cc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(textX, 180);
    ctx.lineTo(textX + 200, 180);
    ctx.stroke();

    ctx.fillStyle = "#6b3a4e";
    ctx.font = "26px Georgia, serif";
    [
        "We would love for you to come",
        "and join us in celebrating",
        "Makena's Graduation",
    ].forEach((line, i) => {
        ctx.fillText(line, textX, 260 + i * 40);
    });

    // border last, so it sits over everything
    ctx.strokeStyle = "#d98cab";
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 22, W - 44, H - 44);
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
        loadImage("/photos/IMG_7819.JPG"),
        loadImage("/photos/IMG_1777.png"),
    ])
        .then(([background, cutout]) => {
            if (cancelled) return;
            draw(canvas.getContext("2d")!, { background, cutout });
            texture.needsUpdate = true;
        })
        .catch((err) => console.error("Invite card images:", err));

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