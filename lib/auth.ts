import {cookies} from "next/headers";import{createHmac,timingSafeEqual}from"crypto";
export const COOKIE="royal_admin";
function signature(payload:string){const key=process.env.SESSION_SECRET||"";return createHmac("sha256",key).update(payload).digest("hex")}
export function makeToken(){const exp=String(Date.now()+7*24*60*60*1000);return exp+"."+signature(exp)}
export async function isAdmin(){if(!process.env.SESSION_SECRET||!process.env.ADMIN_USERNAME)return false;const jar=await cookies();const token=jar.get(COOKIE)?.value||"";const[exp,sig]=token.split(".");if(!exp||!sig||Number(exp)<Date.now())return false;const a=Buffer.from(sig),b=Buffer.from(signature(exp));return a.length===b.length&&timingSafeEqual(a,b)}