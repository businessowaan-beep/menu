import {NextRequest,NextResponse} from "next/server";
import {getDb} from "@/lib/db";
import {getActiveTenant} from "@/lib/tenant";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const host=String(req.nextUrl.searchParams.get("host")||"").trim().toLowerCase().replace(/^www\\./,"");
 if(!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,}$/.test(host))return NextResponse.json({error:"Invalid host"},{status:400,headers:{"Cache-Control":"no-store"}});
 try{
  const db=await getDb();
  const record=await db.collection("platform_domains").findOne({domain:host,status:"active",verified:true});
  if(!record?.slug)return NextResponse.json({error:"Domain is not active"},{status:404,headers:{"Cache-Control":"no-store"}});
  const tenant=await getActiveTenant(String(record.slug));
  if(!tenant)return NextResponse.json({error:"Store unavailable"},{status:404,headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({slug:String(record.slug)},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Domain lookup unavailable"},{status:503,headers:{"Cache-Control":"no-store"}})}
}
