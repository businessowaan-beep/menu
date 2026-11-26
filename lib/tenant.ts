import {getDb} from "@/lib/db";
export async function getPlatformSettings(){return (await getDb()).collection("platform_settings").findOne({_id:"main"} as any)}
export async function getActiveTenant(slug:string){
 if(!/^[a-z0-9-]{1,48}$/.test(slug))return null;
 const db=await getDb(),platform=await getPlatformSettings();
 if(platform?.maintenanceMode)return null;
 const tenant=await db.collection("tenants").findOne({slug,status:"active"});
 if(!tenant)return null;
 if(tenant.subscription?.status&&tenant.subscription.status!=="active")return null;
 if(tenant.subscription?.endsAt&&new Date(tenant.subscription.endsAt).getTime()<=Date.now())return null;
 return tenant;
}
