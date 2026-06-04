import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import upload from "@/app/api/utils/upload";
import { processCvWithOpenRouter } from "@/app/api/utils/cvOpenRouter";
import {
  extractTextFromStoredCvFile,
  looksLikePlaceholderCvText,
} from "@/app/api/utils/cvFileText";
import { auth } from "@/auth";

function buildOptimizedFileName(cvId) {
  return `autowork-ats-cv-${cvId}-${Date.now()}.doc`;
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cvId } = await request.json();
    if (!cvId) {
      return Response.json({ error: "CV ID is required" }, { status: 400 });
    }

    const user = await ensureAppUser(session);

    const rows = await sql`
      SELECT id, raw_text, file_url
      FROM cvs
      WHERE id = ${cvId} AND user_id = ${user.id}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return Response.json({ error: "CV not found" }, { status: 404 });
    }

    const cv = rows[0];
    const extracted = await extractTextFromStoredCvFile({
      fileUrl: cv.file_url,
      authUserId: session.user.id,
    });
    let sourceText = cv.raw_text || "";
    if (
      extracted.text &&
      (looksLikePlaceholderCvText(cv.raw_text) ||
        extracted.text.length > String(cv.raw_text || "").length)
    ) {
      sourceText = extracted.text;
    }

    const result = await processCvWithOpenRouter({
      rawText: sourceText,
      fileName: extracted.file?.file_name || "",
      userId: session.user.id,
    });
    let activeFileUrl = cv.file_url;
    let optimizedFile = null;

    result.audit_result.source_file_name = extracted.file?.file_name || null;
    result.audit_result.source_text_extracted = Boolean(extracted.text);
    result.audit_result.source_text_extraction_reason = extracted.reason;

    if (result.needsOptimization) {
      optimizedFile = await upload({
        buffer: Buffer.from(result.improvedHtml, "utf8"),
        fileName: buildOptimizedFileName(cv.id),
        mimeType: "application/msword",
        prefix: session.user.id,
      });
      activeFileUrl = optimizedFile.url;

      result.audit_result.optimized_cv_url = optimizedFile.url;
      result.audit_result.optimized_file_name = optimizedFile.path;
      result.audit_result.original_file_url = cv.file_url;
      result.audit_result.active_cv_replaced = true;

      await sql`
        INSERT INTO cv_versions (
          user_id,
          cv_id,
          version_type,
          title,
          content_json,
          file_url
        )
        VALUES (
          ${user.id},
          ${cv.id},
          'ATS_OPTIMIZED',
          'AutoWork ATS Optimized CV',
          ${JSON.stringify({
            original_score: result.audit_result.original_ats_score,
            ats_score: result.audit_result.ats_score,
            optimized_score: result.audit_result.optimized_ats_score,
            recommendations: result.audit_result.recommendations,
            ai_provider: result.audit_result.ai_provider,
            ai_model: result.audit_result.ai_model,
          })}::jsonb,
          ${optimizedFile.url}
        )
      `;
    }

    const parsedJson = JSON.stringify(result.parsed_json || {});
    const auditJson = JSON.stringify(result.audit_result || {});
    const finalRawText = result.needsOptimization ? result.improvedText : sourceText;

    await sql`
      UPDATE cvs
      SET parsed_json = ${parsedJson}::jsonb,
          audit_result = ${auditJson}::jsonb,
          raw_text = ${finalRawText},
          file_url = ${activeFileUrl}
      WHERE id = ${cv.id} AND user_id = ${user.id}
    `;

    return Response.json({
      success: true,
      usedFallback: false,
      optimized: result.needsOptimization,
      activeFileUrl,
      optimizedFile,
      parsed_json: result.parsed_json,
      audit_result: result.audit_result,
    });
  } catch (error) {
    if (error?.code === "OPENROUTER_NOT_CONFIGURED") {
      return Response.json(
        {
          error:
            "OpenRouter belum dikonfigurasi. Set OPENROUTER_API_KEY di Vercel Environment Variables.",
        },
        { status: 503 },
      );
    }
    console.error("CV Processing Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
