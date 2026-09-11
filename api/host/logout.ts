import type { VercelRequest, VercelResponse } from "@vercel/node";
import { HOST_SESSION_COOKIE } from "../_lib/auth.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
    res.setHeader(
        "Set-Cookie",
        `${HOST_SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
    );
    return res.status(200).json({ ok: true });
}