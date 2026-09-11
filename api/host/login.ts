import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSessionToken, HOST_SESSION_COOKIE, verifyPassword } from "../_lib/auth.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed." });
    }

    const password = (req.body as { password?: unknown } | undefined)?.password;

    if (typeof password !== "string" || !verifyPassword(password)) {
        return res.status(401).json({ error: "Access denied." });
    }

    res.setHeader(
        "Set-Cookie",
        `${HOST_SESSION_COOKIE}=${createSessionToken()}; HttpOnly; Secure; SameSite=Lax; Path=/`,
    );
    return res.status(200).json({ ok: true });
}