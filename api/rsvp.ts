import type { VercelRequest, VercelResponse } from "@vercel/node";
import { insertRsvp } from "./_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed." });
    }

    const { name, attending, plusOnes } = (req.body ?? {}) as {
        name?: unknown;
        attending?: unknown;
        plusOnes?: unknown;
    };

    if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Please enter your name." });
    }
    if (name.trim().length > 200) {
        return res.status(400).json({ error: "That name is too long." });
    }
    if (typeof attending !== "boolean") {
        return res.status(400).json({ error: "Please choose whether you're attending." });
    }

    // --- plus ones ---
    let guests: string[] = [];

    if (plusOnes !== undefined && plusOnes !== null) {
        if (!Array.isArray(plusOnes)) {
            return res.status(400).json({ error: "Invalid plus one data." });
        }
        if (plusOnes.length > 0 && !attending) {
            return res.status(400).json({
                error: "Plus ones can only be added if you're attending.",
            });
        }
        if (plusOnes.length > 3) {
            return res.status(400).json({ error: "You can bring up to 3 guests." });
        }

        for (const g of plusOnes) {
            if (typeof g !== "string" || g.trim().length === 0) {
                return res.status(400).json({ error: "Please enter each guest's name." });
            }
            if (g.trim().length > 200) {
                return res.status(400).json({ error: "That name is too long." });
            }
            guests.push(g.trim());
        }
    }

    try {
        await insertRsvp(name.trim(), attending, guests);
    } catch (err) {
        console.error("Failed to save RSVP:", err);
        return res.status(500).json({ error: "Something went wrong saving your RSVP." });
    }

    return res.status(200).json({ ok: true });
}