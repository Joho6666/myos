const demoEmail = "owner@example.com";

export function getOwnerEmail() {
  return process.env.OWNER_EMAIL?.trim().toLowerCase() || demoEmail;
}
