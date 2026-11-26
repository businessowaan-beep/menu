import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "crypto";
import {COOKIE,adminCookieName,makeToken} from "@/lib/auth";
import {getDb} from "@/lib/db";
import {verifyPassword} from "@/lib/platform-auth";

export const runtime="nodejs";

function safeEqual(a:string,b:string){
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
}
function active(t:any){
 return !!t&&t.status==="active"&&(!t.subscription?.status||t.subscription.status==="active")&&(!t.subscription?.endsAt||new Date(t.subscription.endsAt).getTime()>Date.now());
}
export async function POST(req:NextRequest){
 try{
  const b=await req.json(),db=await getDb();
  const referer=req.headers.get("referer")||"";
  const path=new URL(referer||"https://local.invalid/admin").pathname.split("/").filter(Boolean);
  const slug=typeof b.slug==="string"?b.slug:(path.length>1&&path[1]==="admin"?path[0]:"");
  let tenantId="royal",valid=false;
  if(slug){
   if(!process.env.SESSION_SECRET)return NextResponse.json({error:"إعدادات الجلسة غير مكتملة."},{status:503});
   if(!/^[a-z0-9-]{1,48}$/.test(slug)||typeof b.username!=="string"||typeof b.password!=="string")
    return NextResponse.json({error:"اسم المستخدم أو كلمة المرور غير صحيحة."},{status:401});
   const t=await db.collection("tenants").findOne({$or:[{slug},{_id:slug}]} as any);
   if(!t||!active(t))return NextResponse.json({error:"المتجر غير نشط أو انتهى اشتراكه. راجع السوبر أدمن."},{status:403});
   tenantId=slug;
   const tenantCredentials=String(b.username).trim()===String(t.adminUsername||"").trim()&&verifyPassword(b.password,String(t.adminPasswordHash||""));
   const legacyRoyalCredentials=slug==="royal"&&!!process.env.ADMIN_USERNAME&&!!process.env.ADMIN_PASSWORD&&safeEqual(b.username,process.env.ADMIN_USERNAME)&&safeEqual(b.password,process.env.ADMIN_PASSWORD);
   valid=tenantCredentials||legacyRoyalCredentials;
  }else{
   if(!process.env.ADMIN_USERNAME||!process.env.ADMIN_PASSWORD||!process.env.SESSION_SECRET)
    return NextResponse.json({error:"إعدادات دخول الأدمن غير مكتملة على Vercel."},{status:503});
   valid=typeof b.username==="string"&&typeof b.password==="string"&&safeEqual(b.username,process.env.ADMIN_USERNAME)&&safeEqual(b.password,process.env.ADMIN_PASSWORD);
  }
  if(!valid)return NextResponse.json({error:"اسم المستخدم أو كلمة المرور غير صحيحة."},{status:401});
  const response=NextResponse.json({ok:true,tenantId});
  response.cookies.set(adminCookieName(tenantId),makeToken(tenantId),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:604800});
  return response;
 }catch{
  return NextResponse.json({error:"تعذر إتمام تسجيل الدخول."},{status:500});
 }
}
export async function DELETE(req:NextRequest){
 const slug=req.headers.get("x-tenant-slug")||"royal";
 const r=NextResponse.json({ok:true});
 if(/^[a-z0-9-]{1,48}$/.test(slug))r.cookies.delete(adminCookieName(slug));
 if(slug==="royal")r.cookies.delete(COOKIE);
 return r;
}
