import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { toPlain } from "@/lib/mongo-helpers";

const COLLECTION = "users";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET(
  _request: Request,
  context: { params: { uid: string } }
) {
  const { uid } = context.params;
  if (!uid) return err("uid is required", 400);

  try {
    const db = await getDb();
    const looksLikeEmail = uid.includes("@");
    const emailLower = looksLikeEmail ? normalizeEmail(uid) : null;

    const doc = await db.collection(COLLECTION).findOne(
      looksLikeEmail
        ? { $or: [{ emailLower }, { email: emailLower }] }
        : { uid }
    );
    if (!doc) {
      return ok({ uid, role: "user" });
    }
    const plain = toPlain(doc) as Record<string, unknown>;
    return ok({
      uid: plain.uid || uid,
      role: plain.role || "user",
      id: plain.id || null,
      email: plain.email || emailLower,
    });
  } catch (e) {
    return err("Failed to load user", 500, String(e));
  }
}
