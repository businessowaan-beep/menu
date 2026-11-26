import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
export const COOKIE = "royal_admin";
const secret = () => process.env.SESSION_SECRET || "";
function signature(payload: string) { return createHmac("sha256", secret()).update(payload).digest("hex"); }
export function makeToken(tenantId = "royal") { const exp=String(Date.now()+7*24*60*60*1000); const payload=tenantId+"."+exp; return payload+"."+signature(payload); }
export async function getAdminTenantId(): Promise<string|null> {
 if(!secret()) return null;
 const jar=await cookies(); const token=jar.get(COOKIE)?.value||""; const parts=token.split(".");
 if(parts.length===3){const [tenantId,exp,sig]=parts;if(!/^[a-z0-9-]{1,48}$/.test(tenantId)||!exp||Number(exp)<Date.now()||!sig)return null;const expected=signature(tenantId+"."+exp);const a=Buffer.from(sig),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)?tenantId:null;}
 if(parts.length===2){const [exp,sig]=parts;if(!exp||Number(exp)<Date.now()||!sig)return null;const expected=signature(exp);const a=Buffer.from(sig),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)?"royal":null;}
 return null;
}
export async function isAdmin(){return !!(await getAdminTenantId());}
