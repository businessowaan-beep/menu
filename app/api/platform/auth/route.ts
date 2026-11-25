import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, platformCookie, PLATFORM_COOKIE } from "@/lib/platform-auth";
import { timingSafeEqual } from "crypto";
export const runtime="nodejs";
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export async function POST(req:NextRequest){try{const body=await req.json();const username=String(body.username||"");const password=String(body.password||"");if(!process.env.SUPER_ADMIN_USERNAME||!process.env.SUPER_ADMIN_PASSWORD||!process.env.SUPER_ADMIN_SESSION_SECRET)return NextResponse.json({error:"إعدادات السوبر أدمن غير مكتملة."},{status:503});if(!equal(username,process.env.SUPER_ADMIN_USERNAME)||!equal(password,process.env.SUPER_ADMIN_PASSWORD))return NextResponse.json({error:"اسم المستخدم أو كلمة المرور غير صحيحة."},{status:401});const db=await getDb();const now=new Date().toISOString();await db.collection("platform_admins").updateOne({_id:"primary"},{$set:{username,passwordHash:hashPassword(password),role:"super_admin",status:"active",updatedAt:now},$setOnInsert:{createdAt:now}},{upsert:true});return platformCookie(NextResponse.json({ok:true}));}catch{return NextResponse.json({error:"تعذر تسجيل الدخول."},{status:500})}}
export async function GET(){const {cookies}=await import("next/headers");const jar=await cookies();const token=jar.get(PLATFORM_COOKIE)?.value||"";const {validPlatformToken}=await import("@/lib/platform-auth");return NextResponse.json({authenticated:validPlatformToken(token)})}
export async function DELETE(){const response=NextResponse.json({ok:true});response.cookies.delete(PLATFORM_COOKIE);return response}
