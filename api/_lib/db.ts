import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type Rsvp = {
    id: number;
    name: string;
    attending: boolean;
    created_at: string;
    guest_of: number | null;
};

export async function insertRsvp(
    name: string,
    attending: boolean,
    plusOnes: string[] = [],
) {
    const rows = (await sql`
        INSERT INTO rsvps (name, attending)
        VALUES (${name}, ${attending})
        RETURNING id
    `) as { id: number }[];

    const hostId = rows[0].id;

    for (const guest of plusOnes) {
        await sql`
            INSERT INTO rsvps (name, attending, guest_of)
            VALUES (${guest}, true, ${hostId})
        `;
    }
}

export async function getAllRsvps(): Promise<Rsvp[]> {
    return (await sql`
        SELECT id, name, attending, created_at, guest_of
        FROM rsvps
        ORDER BY created_at DESC
    `) as Rsvp[];
}

export async function deleteRsvp(id: number) {
    await sql`DELETE FROM rsvps WHERE id = ${id}`;
}