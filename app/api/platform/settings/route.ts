import {NextRequest,NextResponse} from "next/server";
import {getDb} from "@/lib/db";
import {isSuperAdmin} from "@/lib/platform-auth";
export const runtime="nodejs";
export async function PATCH(req:NextRequest){
 if(!await isSuperAdmin())return NextResponse.json({error:"غير مصرح"},{status:401});
 try{
  const b=await req.json();
  const allowed={
   platformName:String(b.platformName||"Menu Store").trim().slice(0,100),
   supportEmail:String(b.supportEmail||"").trim().slice(0,160),
   supportPhone:String(b.supportPhone||"").trim().slice(0,40),
   currency:"JOD",
   defaultSubscriptionMonths:Math.min(60,Math.max(1,Number(b.defaultSubscriptionMonths)||1)),
   maintenanceMode:Boolean(b.maintenanceMode),\n   maintenanceMessage:String(b.maintenanceMessage||"نعمل على تحسين الخدمة. يرجى المحاولة مرة أخرى لاحقاً.").trim().slice(0,240)
  };
  const db=await getDb();
  await db.collection("platform_settings").updateOne(({_id:"main"} as any),{$set:{...allowed,updatedAt:new Date().toISOString()},$setOnInsert:{createdAt:new Date().toISOString()}},{upsert:true});
  return NextResponse.json({ok:true,settings:allowed});
 }catch{return NextResponse.json({error:"تعذر حفظ الإعدادات"},{status:500})}
}
