import type { VercelRequest, VercelResponse } from "@vercel/node";
import PDFDocument from "pdfkit";
import { HOST_SESSION_COOKIE, readCookie, verifySessionToken } from "../_lib/auth.js";
import { getAllRsvps } from "../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const token = readCookie(req.headers.cookie, HOST_SESSION_COOKIE);
    if (!verifySessionToken(token)) {
        return res.status(401).json({ error: "Access denied." });
    }

    const rsvps = await getAllRsvps();
    const attending = rsvps.filter((r) => r.attending).length;
    const notAttending = rsvps.length - attending;

    const filename = `rsvp-list-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    // --- header ---
    doc.fontSize(20).fillColor("#8a3b4f").text("RSVP List");
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#555555")
        .text(`${attending} Attending  ·  ${notAttending} Not Attending  ·  ${rsvps.length} Total`);
    doc.moveDown(1.2);

    // --- table ---
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const colName = width * 0.5;
    const colAttending = width * 0.18;
    const rowH = 22;

    const drawRow = (
        y: number,
        name: string,
        att: string,
        date: string,
        bold: boolean,
    ) => {
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor("#333333");
        doc.text(name, left + 6, y + 6, { width: colName - 12, ellipsis: true });
        doc.text(att, left + colName + 6, y + 6, { width: colAttending - 12 });
        doc.text(date, left + colName + colAttending + 6, y + 6, {
            width: width - colName - colAttending - 12,
        });
    };

    let y = doc.y;

    // header row
    doc.rect(left, y, width, rowH).fill("#f7ddd4");
    drawRow(y, "Name", "Attending", "Submitted", true);
    y += rowH;

    if (rsvps.length === 0) {
        doc.font("Helvetica").fontSize(10).fillColor("#777777")
            .text("No RSVPs yet.", left + 6, y + 8);
    }

    for (const r of rsvps) {
        // new page if we've run out of room
        if (y + rowH > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            y = doc.page.margins.top;
            doc.rect(left, y, width, rowH).fill("#f7ddd4");
            drawRow(y, "Name", "Attending", "Submitted", true);
            y += rowH;
        }

        doc.rect(left, y, width, rowH).stroke("#eeeeee");
        drawRow(
            y,
            r.name,
            r.attending ? "Yes" : "No",
            new Date(r.created_at).toLocaleDateString("en-GB"),
            false,
        );
        y += rowH;
    }

    doc.end();
}