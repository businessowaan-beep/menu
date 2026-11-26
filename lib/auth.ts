import {cookies,headers} from "next/headers";
import {createHmac,timingSafeEqual} from "crypto";
import {getDb} from "@/lib/db";
export const COOKIE="royal_admin";
export const adminCookieName=(tenantId:string)=>"store_admin_"+tenantId;
const secret=()=>process.env.SESSION_SECRET||"";
function signature(payload:string){return createHmac("sha256",secret()).update(payload).digest("hex")}
export function makeToken(tenantId="royal"){const exp=String(Date.now()+7*24*60*60*1000),payload=tenantId+"."+exp;return payload+"."+signature(payload)}
export async function getAdminTenantId():Promise<string|null>{
 if(!secret())return null;
 const requestHeaders=await headers();
 const expectedTenant=requestHeaders.get("x-tenant-slug")||"";
 if(!/^[a-z0-9-]{1,48}$/.test(expectedTenant))return null;
 const jar=await cookies(),token=jar.get(adminCookieName(expectedTenant))?.value||(expectedTenant==="royal"?jar.get(COOKIE)?.value:"")||"",parts=token.split(".");
 let tenantId:string|null=null;
 if(parts.length===3){const [id,exp,sig]=parts;if(!/^[a-z0-9-]{1,48}$/.test(id)||!exp||Number(exp)<Date.now()||!sig)return null;const expected=signature(id+"."+exp),a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))return null;tenantId=id;}
 else if(parts.length===2){const [exp,sig]=parts;if(!exp||Number(exp)<Date.now()||!sig)return null;const expected=signature(exp),a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))return null;tenantId="royal";}
 if(!tenantId||tenantId!==expectedTenant)return null;
 const tenant=await(await getDb()).collection("tenants").findOne({slug:tenantId,status:"active"});
 if(!tenant||(tenant.subscription?.status&&tenant.subscription.status!=="active")||(tenant.subscription?.endsAt&&new Date(tenant.subscription.endsAt).getTime()<=Date.now()))return null;
 return tenantId;
}
export async function isAdmin(){return !!(await getAdminTenantId())}
