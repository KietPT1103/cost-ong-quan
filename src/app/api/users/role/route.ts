import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";

const COLLECTION = "users";

type Role = "admin" | "user";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) return err("email is required", 400);

  try {
    const db = await getDb();
    const emailLower = normalizeEmail(email);

    const doc = await db.collection(COLLECTION).findOne({
      $or: [{ emailLower }, { email: emailLower }],
    });

    if (!doc) {
      return ok({ role: "user" as Role, id: null, email: emailLower });
    }

    const role = (doc.role as Role) || "user";
    return ok({ role, id: doc._id?.toHexString?.() ?? null, email: emailLower });
  } catch (e) {
    return err("Failed to load user role", 500, String(e));
  }
}
