import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, pbkdf2Sync, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
export const PLATFORM_COOKIE = "platform_super_admin";
const secret = () => process.env.SUPER_ADMIN_SESSION_SECRET || "";
export function platformToken(){const payload=String(Date.now()+7*24*60*60*1000);return payload+"."+createHmac("sha256",secret()).update(payload).digest("hex")}
export function validPlatformToken(token:string){if(!secret())return false;const [exp,sig]=token.split(".");if(!exp||!sig||Number(exp)<Date.now())return false;const expected=createHmac("sha256",secret()).update(exp).digest("hex");const a=Buffer.from(sig),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)}
export async function isSuperAdmin(){const jar=await cookies();return validPlatformToken(jar.get(PLATFORM_COOKIE)?.value||"")}
export function platformCookie(response:NextResponse){response.cookies.set(PLATFORM_COOKIE,platformToken(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:604800});return response}
export function hashPassword(password:string){const salt=randomBytes(16);const hash=pbkdf2Sync(password,salt,310000,32,"sha256");return "pbkdf2$310000$"+salt.toString("hex")+"$"+hash.toString("hex")}
export function verifyPassword(password:string,encoded:string){const [kind,rounds,salt,expected]=encoded.split("$");if(kind!=="pbkdf2"||!rounds||!salt||!expected)return false;const actual=pbkdf2Sync(password,Buffer.from(salt,"hex"),Number(rounds),32,"sha256");const target=Buffer.from(expected,"hex");return actual.length===target.length&&timingSafeEqual(actual,target)}
