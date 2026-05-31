import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { auth } from "@/auth";

const emptyArray = [];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureAppUser(session);
    const rows = await sql`
      SELECT id, target_roles, locations, job_type, min_salary, remote_preference,
             preferred_industries, blacklisted_companies, daily_apply_limit, updated_at
      FROM job_preferences
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    const preferences = rows[0] || {
      target_roles: emptyArray,
      locations: emptyArray,
      job_type: emptyArray,
      min_salary: null,
      remote_preference: "",
      preferred_industries: emptyArray,
      blacklisted_companies: emptyArray,
      daily_apply_limit: 5,
    };

    return Response.json({ preferences });
  } catch (error) {
    console.error("Preferences fetch error:", error);
    return Response.json(
      { error: "Tidak bisa mengambil preferensi" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureAppUser(session);
    const body = await request.json();
    const targetRoles = Array.isArray(body.target_roles)
      ? body.target_roles
      : [];
    const locations = Array.isArray(body.locations) ? body.locations : [];
    const jobType = Array.isArray(body.job_type) ? body.job_type : [];
    const preferredIndustries = Array.isArray(body.preferred_industries)
      ? body.preferred_industries
      : [];
    const blacklistedCompanies = Array.isArray(body.blacklisted_companies)
      ? body.blacklisted_companies
      : [];
    const dailyApplyLimit = Number(body.daily_apply_limit || 5);
    const minSalary = body.min_salary ? Number(body.min_salary) : null;

    const details = JSON.stringify(body);

    const rows = await sql`
      INSERT INTO job_preferences (
        user_id, target_roles, locations, job_type, min_salary, remote_preference,
        preferred_industries, blacklisted_companies, daily_apply_limit, updated_at
      )
      VALUES (
        ${user.id}, ${JSON.stringify(targetRoles)}::jsonb, ${JSON.stringify(locations)}::jsonb, ${JSON.stringify(jobType)}::jsonb, ${minSalary},
        ${body.remote_preference || ""}, ${JSON.stringify(preferredIndustries)}::jsonb, ${JSON.stringify(blacklistedCompanies)}::jsonb,
        ${dailyApplyLimit}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        target_roles = EXCLUDED.target_roles,
        locations = EXCLUDED.locations,
        job_type = EXCLUDED.job_type,
        min_salary = EXCLUDED.min_salary,
        remote_preference = EXCLUDED.remote_preference,
        preferred_industries = EXCLUDED.preferred_industries,
        blacklisted_companies = EXCLUDED.blacklisted_companies,
        daily_apply_limit = EXCLUDED.daily_apply_limit,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    await sql`
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (${user.id}, 'PREFERENCES_UPDATED', ${details}::jsonb)
    `;

    return Response.json({ preferences: rows[0] });
  } catch (error) {
    console.error("Preferences save error:", error);
    return Response.json(
      { error: "Tidak bisa menyimpan preferensi" },
      { status: 500 },
    );
  }
}
