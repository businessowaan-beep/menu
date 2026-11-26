import {getDb} from "@/lib/db";
export async function getActiveTenant(slug:string){
 if(!/^[a-z0-9-]{1,48}$/.test(slug))return null;
 const tenant=await(await getDb()).collection("tenants").findOne({slug,status:"active"});
 if(!tenant)return null;
 if(tenant.subscription?.status&&tenant.subscription.status!=="active")return null;
 if(tenant.subscription?.endsAt&&new Date(tenant.subscription.endsAt).getTime()<=Date.now())return null;
 return tenant;
}
