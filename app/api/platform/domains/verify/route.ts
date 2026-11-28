import {NextRequest,NextResponse} from "next/server";
import {getDb} from "@/lib/db";
import {isSuperAdmin} from "@/lib/platform-auth";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!await isSuperAdmin())return NextResponse.json({error:"غير مصرح"},{status:401});
 const body=await req.json().catch(()=>({}));
 const domain=String(body.domain||"").trim().toLowerCase().replace(/^www\./,"");
 if(!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain))return NextResponse.json({error:"الدومين غير صحيح"},{status:400});
 const token=process.env.VERCEL_TOKEN,projectId=process.env.VERCEL_PROJECT_ID||"prj_3GKoNmjRyyZJGn0kce07U7smdWRh",teamId=process.env.VERCEL_TEAM_ID||"team_4q5GjTDCTgrNb6R3ec37hPEf";
 if(!token)return NextResponse.json({error:"أضف VERCEL_TOKEN إلى إعدادات Vercel أولاً."},{status:503});
 try{
  const url=new URL("https://api.vercel.com/v9/projects/"+encodeURIComponent(projectId)+"/domains/"+encodeURIComponent(domain));url.searchParams.set("teamId",teamId);
  const vr=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const vd=await vr.json().catch(()=>({}));
  if(!vr.ok)return NextResponse.json({error:vd?.error?.message||"تعذر فحص الدومين في Vercel",vercel:vd},{status:vr.status});
  const verified=vd.verified===true;
  const active=verified&&vd.misconfigured!==true;
  const now=new Date().toISOString();
  const db=await getDb();
  await db.collection("platform_domains").updateOne({domain},{$set:{verified,status:active?"active":"pending_dns",sslStatus:active?"vercel_managed":"pending",vercelConfigured:true,vercelVerification:vd.verification||[],updatedAt:now}});
  return NextResponse.json({ok:true,domain,verified,status:active?"active":"pending_dns",verification:vd.verification||[],misconfigured:vd.misconfigured===true,message:active?"تم التحقق من الدومين وإعداد DNS. SSL تتم إدارته تلقائياً من Vercel.":"لم يكتمل إعداد الدومين بعد. أكمل سجلات DNS المعروضة ثم أعد الفحص."});
 }catch{return NextResponse.json({error:"تعذر الاتصال بخدمة Vercel"},{status:502})}
}
