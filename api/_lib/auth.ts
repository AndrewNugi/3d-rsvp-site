import { createHmac, timingSafeEqual } from "crypto";

export const HOST_SESSION_COOKIE = "host_session";

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function verifyPassword(input: string): boolean {
    const expected = process.env.HOST_PASSWORD;
    if (!expected) return false;
    const a = Buffer.from(input);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

function sign(payload: string): string {
    const secret = process.env.HOST_SESSION_SECRET;
    if (!secret) throw new Error("HOST_SESSION_SECRET not set");
    return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionToken(): string {
    const expires = Date.now() + MAX_AGE_MS;
    return `${expires}.${sign(String(expires))}`;
}

export function verifySessionToken(token: string | undefined): boolean {
    if (!token || !process.env.HOST_SESSION_SECRET) return false;
    const [expiresStr, sig] = token.split(".");
    if (!expiresStr || !sig) return false;

    const expected = sign(expiresStr);
    if (sig.length !== expected.length) return false;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;

    return Number(expiresStr) > Date.now();
}

export function readCookie(header: string | undefined, name: string): string | undefined {
    if (!header) return undefined;
    for (const part of header.split(";")) {
        const [k, ...v] = part.trim().split("=");
        if (k === name) return decodeURIComponent(v.join("="));
    }
    return undefined;
}