import {NextResponse} from "next/server";
import {ObjectId} from "mongodb";
import {getDb} from "@/lib/db";

export const runtime="nodejs";

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    if(!ObjectId.isValid(id))return new NextResponse(null,{status:404});
    const db=await getDb();
    const product=await db.collection("products").findOne({_id:new ObjectId(id),active:{$ne:false}},{projection:{imageUrl:1}});
    const source=String(product?.imageUrl||"");
    const match=source.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if(!match)return new NextResponse(null,{status:404});
    const bytes=Buffer.from(match[2],"base64");
    return new NextResponse(new Uint8Array(bytes),{headers:{"Content-Type":match[1],"Content-Length":String(bytes.length),"Cache-Control":"public, max-age=300, s-maxage=1800, stale-while-revalidate=86400","X-Content-Type-Options":"nosniff"}});
  }catch{
    return new NextResponse(null,{status:404});
  }
}
