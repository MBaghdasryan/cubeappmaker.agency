import { GET as health } from "../api/health/route";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET() { return health(); }
