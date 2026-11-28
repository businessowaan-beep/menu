import {NextRequest,NextResponse} from "next/server";

const PLATFORM_HOSTS=new Set(["menustore.vercel.app","menustore-sow13.vercel.app"]);
function hostOf(req:NextRequest){return (req.headers.get("x-forwarded-host")||req.headers.get("host")||req.nextUrl.hostname).split(",")[0].trim().toLowerCase().replace(/:\\d+$/,"");}
function isPlatformHost(host:string){return PLATFORM_HOSTS.has(host)||(host.endsWith(".vercel.app")&&host.startsWith("menustore-"))||host==="localhost"||host==="127.0.0.1";}

export async function middleware(req:NextRequest){
 const host=hostOf(req);
 if(isPlatformHost(host))return NextResponse.next();
 const path=req.nextUrl.pathname;
 if(path.startsWith("/api/")||path.startsWith("/_next/")||path==="/favicon.ico"||path==="/robots.txt"||path==="/sitemap.xml")return NextResponse.next();
 const lookup=new URL("/api/internal/domain-resolve",req.url);
 lookup.searchParams.set("host",host);
 try{
  const response=await fetch(lookup,{headers:{"x-domain-lookup":"middleware"},cache:"no-store"});
  if(!response.ok)throw new Error("Domain lookup failed");
  const data=await response.json() as {slug?:string};
  if(!data.slug||!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(data.slug))throw new Error("Domain is not active");
  const target=req.nextUrl.clone();
  if(path==="/"||path==="")target.pathname="/"+data.slug;
  else if(path==="/admin"||path==="/admin/")target.pathname="/"+data.slug+"/admin";
  else target.pathname="/domain-unavailable";
  return NextResponse.rewrite(target);
 }catch{
  const target=req.nextUrl.clone();
  target.pathname="/domain-unavailable";
  target.search="";
  return NextResponse.rewrite(target);
 }
}
export const config={matcher:["/((?!api/|_next/|favicon.ico|robots.txt|sitemap.xml).*)"]};
