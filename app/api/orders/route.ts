import{NextRequest,NextResponse}from"next/server";import{ObjectId}from"mongodb";import{getDb}from"@/lib/db";export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const b=await req.json();
  const requestId=typeof b.requestId==="string"?b.requestId.slice(0,80):"";
  if(!requestId)return NextResponse.json({error:"معرّف الطلب غير صالح."},{status:400});
  const db=await getDb();
  const previous=await db.collection("orders").findOne({requestId});
  if(previous)return NextResponse.json({ok:true,orderNumber:previous.orderNumber,total:previous.total,items:previous.items,replayed:true});
  if(!b.customerName||!b.customerPhone||!Array.isArray(b.items)||!b.items.length)return NextResponse.json({error:"يرجى إدخال الاسم والهاتف واختيار صنف واحد على الأقل."},{status:400});
  const requested=b.items.filter((x:any)=>ObjectId.isValid(x.productId)&&Number.isInteger(Number(x.quantity))&&Number(x.quantity)>0&&Number(x.quantity)<=50);
  if(!requested.length||requested.length!==b.items.length)return NextResponse.json({error:"تفاصيل الأصناف غير صالحة."},{status:400});
  const ids=requested.map((x:any)=>new ObjectId(x.productId));
  const products=await db.collection("products").find({_id:{$in:ids},active:{$ne:false}}).toArray();
  if(products.length!==ids.length)return NextResponse.json({error:"بعض الأصناف لم تعد متاحة. حدّث القائمة وحاول مجدداً."},{status:409});
  const items=requested.map((x:any)=>{const p=products.find(p=>String(p._id)===x.productId)!;return{productId:String(p._id),name:p.name,price:Number(p.price),quantity:Number(x.quantity)}});
  const total=items.reduce((sum:any,x:any)=>sum+x.price*x.quantity,0);
  const c=await db.collection("counters").findOneAndUpdate({_id:"orders" as any},{$inc:{seq:1}},{upsert:true,returnDocument:"after"});
  const seq=Number((c as any)?.value?.seq??(c as any)?.seq??1);
  const orderNumber="R-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+String(seq).padStart(4,"0");
  await db.collection("orders").insertOne({requestId,orderNumber,customerName:String(b.customerName).trim().slice(0,100),customerPhone:String(b.customerPhone).trim().slice(0,30),notes:String(b.notes||"").slice(0,1000),items,total,status:"new",createdAt:new Date()});
  return NextResponse.json({ok:true,orderNumber,total,items});
 }catch(error){if((error as any)?.code===11000){const b=await req.clone().json().catch(()=>({}));const previous=typeof b.requestId==="string"?await (await getDb()).collection("orders").findOne({requestId:b.requestId}):null;if(previous)return NextResponse.json({ok:true,orderNumber:previous.orderNumber,total:previous.total,items:previous.items,replayed:true})}return NextResponse.json({error:"تعذر تسجيل الطلب. يرجى المحاولة لاحقاً."},{status:500})}
}