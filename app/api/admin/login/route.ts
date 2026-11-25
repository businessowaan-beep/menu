import{NextRequest,NextResponse}from"next/server";
import{timingSafeEqual}from"crypto";
import{COOKIE,makeToken}from"@/lib/auth";
import{getDb}from"@/lib/db";
export const runtime="nodejs";
const WINDOW_MS=15*60*1000;
const MAX_ATTEMPTS=5;
function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
function clientIp(req:NextRequest){return(req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown").slice(0,100)}
export async function POST(req:NextRequest){
 try{
  const b=await req.json();
  if(!process.env.ADMIN_USERNAME||!process.env.ADMIN_PASSWORD||!process.env.SESSION_SECRET)return NextResponse.json({error:"إعدادات دخول الأدمن غير مكتملة على Vercel."},{status:503});
  const db=await getDb(),ip=clientIp(req),now=new Date();
  const attempts=db.collection("adminLoginAttempts");
  const state=await attempts.findOne({_id:ip as any});
  if(state?.blockedUntil&&new Date(state.blockedUntil)>now)return NextResponse.json({error:"تم إيقاف محاولات الدخول مؤقتاً. حاول بعد 15 دقيقة."},{status:429});
  const valid=typeof b.username==="string"&&typeof b.password==="string"&&safeEqual(b.username,process.env.ADMIN_USERNAME)&&safeEqual(b.password,process.env.ADMIN_PASSWORD);
  if(!valid){
   const fresh=!state||!state.windowStart||now.getTime()-new Date(state.windowStart).getTime()>WINDOW_MS;
   const count=fresh?1:Number(state?.attempts||0)+1;
   await attempts.updateOne({_id:ip as any},{$set:{windowStart:fresh?now:state.windowStart,attempts:count,blockedUntil:count>=MAX_ATTEMPTS?new Date(now.getTime()+WINDOW_MS):null,updatedAt:now}},{upsert:true});
   return NextResponse.json({error:count>=MAX_ATTEMPTS?"محاولات كثيرة. تم إيقاف الدخول 15 دقيقة.":"اسم المستخدم أو كلمة المرور غير صحيحة."},{status:count>=MAX_ATTEMPTS?429:401});
  }
  await attempts.deleteOne({_id:ip as any});
  const response=NextResponse.json({ok:true});
  response.cookies.set(COOKIE,makeToken(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:604800});
  return response;
 }catch{return NextResponse.json({error:"تعذر إتمام تسجيل الدخول."},{status:500})}
}
export async function DELETE(){const response=NextResponse.json({ok:true});response.cookies.delete(COOKIE);return response}
