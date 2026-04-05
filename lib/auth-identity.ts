/**
 * Supabase email/password auth requires an email-shaped identifier.
 * Users can type only a username; we map it to a synthetic address on this domain.
 * Disable "Confirm email" in Supabase Auth for these users if they won't receive mail.
 */
const INTERNAL_DOMAIN = "mov.internal";

export function toAuthEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("Ingresa un usuario o email");
  }
  if (trimmed.includes("@")) {
    return trimmed;
  }
  const safe = trimmed.replace(/[^a-z0-9._-]/g, "");
  if (!safe || safe.length < 2) {
    throw new Error("El usuario debe tener al menos 2 caracteres validos (letras, numeros, ., -, _)");
  }
  return `${safe}@${INTERNAL_DOMAIN}`;
}

export function isInternalAuthEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${INTERNAL_DOMAIN}`);
}

export function labelForAuthEmail(email: string): string {
  const e = email.toLowerCase();
  if (e.endsWith(`@${INTERNAL_DOMAIN}`)) {
    return e.slice(0, -(INTERNAL_DOMAIN.length + 1));
  }
  return email;
}
