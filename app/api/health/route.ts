import { store } from "@/lib/node/store";
import { json } from "@/lib/node/security";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export function GET(){try{store().ready();return json({healthy:true});}catch{return json({healthy:false},503);}}
