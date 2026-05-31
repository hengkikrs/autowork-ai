import sql from "@/app/api/utils/sql";

export async function ensureAppUser(session) {
  const email = session?.user?.email;
  const authUserId = session?.user?.id;
  const name = session?.user?.name || null;

  if (!authUserId || !email) {
    throw new Error("Authenticated user is missing an id or email");
  }

  const existing = await sql`
    SELECT id, email, name
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (existing.length > 0) {
    if (!existing[0].name && name) {
      await sql`
        UPDATE users
        SET name = ${name}
        WHERE id = ${existing[0].id}
      `;
    }
    return existing[0];
  }

  const created = await sql`
    INSERT INTO users (email, name)
    VALUES (${email}, ${name})
    RETURNING id, email, name
  `;

  return created[0];
}
