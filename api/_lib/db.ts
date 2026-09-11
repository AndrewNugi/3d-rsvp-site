import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type Rsvp = {
    id: number;
    name: string;
    attending: boolean;
    created_at: string;
};

export async function insertRsvp(name: string, attending: boolean) {
    await sql`INSERT INTO rsvps (name, attending) VALUES (${name}, ${attending})`;
}

export async function getAllRsvps(): Promise<Rsvp[]> {
    return (await sql`
        SELECT id, name, attending, created_at
        FROM rsvps
        ORDER BY created_at DESC
    `) as Rsvp[];
}

export async function deleteRsvp(id: number) {
    await sql`DELETE FROM rsvps WHERE id = ${id}`;
}