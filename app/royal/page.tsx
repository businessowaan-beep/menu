import MenuClient from "./MenuClient";
import {getDb} from "@/lib/db";

export const dynamic = "force-dynamic";

const defaultBanner="https://res.cloudinary.com/dyhbzxjvi/image/upload/v1795618585/843878039_122195547656865123_4500486321270004780_n_oipvt1.jpg";
const defaultSocialLinks={facebook:"https://web.facebook.com/RoyalMansaf.Jo",instagram:"",youtube:"",tiktok:"",snapchat:""};

export default async function Page(){
  try{
    const db=await getDb();
    const [products,settings,categories]=await Promise.all([
      db.collection("products").find({active:{$ne:false}}).project({name:1,description:1,price:1,category:1,imageUrl:1,imagePosition:1,imageFit:1,sortOrder:1,updatedAt:1,createdAt:1}).sort({sortOrder:1,createdAt:-1}).toArray(),
      db.collection("settings").findOne({_id:"restaurant" as any}),
      db.collection("categories").find({active:{$ne:false}}).sort({sortOrder:1,name:1}).toArray()
    ]);
    const rows=products.map(p=>({_id:String(p._id),name:String(p.name||""),description:String(p.description||""),price:Number(p.price||0),category:String(p.category||"عام"),imageUrl:String(p.imageUrl||"").startsWith("data:")?"/api/product-image/"+String(p._id)+"?v="+String(new Date(p.updatedAt||p.createdAt||0).getTime()):String(p.imageUrl||""),imagePosition:String(p.imagePosition||"50% 50%"),imageFit:String(p.imageFit||"cover")}));
    const categoryNames=categories.length?categories.map(c=>String(c.name)):Array.from(new Set(rows.map(p=>p.category)));
    const socialLinks={...defaultSocialLinks,...(settings?.socialLinks||{})};
    return <MenuClient initialData={{products:rows,categories:categoryNames,whatsappPhone:settings?.whatsappPhone||process.env.WHATSAPP_PHONE||"962781776889",contactPhone:settings?.contactPhone||"0781475902",bannerUrl:settings?.bannerUrl||defaultBanner,bannerDesktopPosition:settings?.bannerDesktopPosition||"50% 45%",bannerMobilePosition:settings?.bannerMobilePosition||"62% 50%",restaurantName:settings?.restaurantName||"رويال",socialLinks,socialMessage:settings?.socialMessage||"تابعونا على صفحاتنا لتصلكم أخبار وعروض رويال"}}/>;
  }catch{
    return <MenuClient initialData={{products:[],categories:[],whatsappPhone:process.env.WHATSAPP_PHONE||"962781776889",contactPhone:"0781475902",bannerUrl:defaultBanner,bannerDesktopPosition:"50% 45%",bannerMobilePosition:"62% 50%",restaurantName:"رويال",socialLinks:defaultSocialLinks,socialMessage:"تابعونا على صفحاتنا لتصلكم أخبار وعروض رويال"}}/>;
  }
}
