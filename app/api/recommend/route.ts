import { z } from "zod";
import { guard, bodyJSON, json } from "@/lib/node/security";
import { store, limitValue } from "@/lib/node/store";
import { recommend } from "@/lib/node/providers";
export const runtime="nodejs";
export async function POST(request:Request) {
  const denied=guard(request,"recommend");if(denied)return denied;
  let problem:string;
  try {problem=z.object({problem:z.string().trim().min(1).max(2000)}).parse(await bodyJSON(request)).problem;}
  catch(e){return json({error:"Enter a valid business request, up to 2000 characters."},e instanceof Error&&e.message==="TOO_LARGE"?413:400);}
  try {
    if(!store().limit("ai-daily",limitValue("AI_DAILY_LIMIT",200),86400000))return json({error:"Daily request limit reached."},429);
    return json(await recommend(problem));
  } catch {return json({error:"Recommendations temporarily unavailable. Your draft is preserved."},503);}
}
