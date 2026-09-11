import type { VercelRequest, VercelResponse } from "@vercel/node";
import { insertRsvp } from "./_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed." });
    }

    const { name, attending } = (req.body ?? {}) as { name?: unknown; attending?: unknown };

    if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Please enter your name." });
    }
    if (name.trim().length > 200) {
        return res.status(400).json({ error: "That name is too long." });
    }
    if (typeof attending !== "boolean") {
        return res.status(400).json({ error: "Please choose whether you're attending." });
    }

    try {
        await insertRsvp(name.trim(), attending);
    } catch (err) {
        console.error("Failed to save RSVP:", err);
        return res.status(500).json({ error: "Something went wrong saving your RSVP." });
    }

    return res.status(200).json({ ok: true });
}