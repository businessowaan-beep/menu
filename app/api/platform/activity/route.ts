import {NextResponse} from "next/server";
import {getDb} from "@/lib/db";
import {isSuperAdmin} from "@/lib/platform-auth";
export const runtime="nodejs";
export async function GET(){
 if(!await isSuperAdmin())return NextResponse.json({error:"غير مصرح"},{status:401});
 try{const db=await getDb();const items=await db.collection("platform_activity").find({}).sort({createdAt:-1}).limit(100).toArray();return NextResponse.json({items:items.map(x=>({...x,_id:String(x._id)}))})}
 catch{return NextResponse.json({items:[]})}
}