import type { VercelRequest, VercelResponse } from "@vercel/node";
import { HOST_SESSION_COOKIE, readCookie, verifySessionToken } from "../_lib/auth.js";
import { deleteRsvp, getAllRsvps } from "../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const token = readCookie(req.headers.cookie, HOST_SESSION_COOKIE);
    if (!verifySessionToken(token)) {
        return res.status(401).json({ error: "Access denied." });
    }

    if (req.method === "GET") {
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json(await getAllRsvps());
    }

    if (req.method === "DELETE") {
        const id = Number(req.query.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid id." });
        }
        await deleteRsvp(id);
        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
}