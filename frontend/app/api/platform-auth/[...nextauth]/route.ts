// Platform auth no longer uses NextAuth.
// See: /api/platform-auth/login, /api/platform-auth/logout, /api/platform-auth/me
export const dynamic = "force-dynamic";
export async function GET() {
  return new Response("Not used", { status: 404 });
}
export async function POST() {
  return new Response("Not used", { status: 404 });
}
