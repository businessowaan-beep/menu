import {NextRequest,NextResponse} from "next/server";
import {getDb} from "@/lib/db";
import {getActiveTenant} from "@/lib/tenant";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const slug=req.nextUrl.searchParams.get("slug")||"";
  if(!/^[a-z0-9-]{1,48}$/.test(slug))return NextResponse.json({error:"Invalid store"},{status:400});
  const tenant=await getActiveTenant(slug);
  if(!tenant)return NextResponse.json({error:"Store unavailable"},{status:404});
  const settings=await (await getDb()).collection("settings").findOne({tenantId:slug},{projection:{logoUrl:1,restaurantName:1}});
  return NextResponse.json({logoUrl:typeof settings?.logoUrl==="string"?settings.logoUrl:"",restaurantName:String(settings?.restaurantName||tenant.name||"")},{headers:{"Cache-Control":"no-store"}});
}
