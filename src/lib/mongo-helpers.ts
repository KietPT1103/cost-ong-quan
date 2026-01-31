import { ObjectId } from "mongodb";

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof ObjectId) {
    return value.toHexString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => [k, serializeValue(v)]
    );
    return Object.fromEntries(entries);
  }
  return value;
}

export function toPlain<T extends { _id?: unknown }>(doc: T) {
  const { _id, ...rest } = doc as T & { _id?: unknown };
  const base = serializeValue(rest) as Record<string, unknown>;
  if (_id) {
    const { id: _ignored, ...restBase } = base;
    return { ...restBase, id: serializeValue(_id) };
  }
  return base;
}

export function parseObjectId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}
