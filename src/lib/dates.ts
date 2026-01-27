export type FirestoreTimestampLike = {
  seconds?: number;
  toDate?: () => Date;
};

export function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof value === "object") {
    const ts = value as FirestoreTimestampLike;
    if (typeof ts.toDate === "function") {
      const d = ts.toDate();
      return Number.isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof ts.seconds === "number") {
      const d = new Date(ts.seconds * 1000);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }
  }
  return undefined;
}

export function toIsoString(value: Date | string | undefined) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}