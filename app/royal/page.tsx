import MenuClient from "../MenuClient";
import {getDb} from "@/lib/db";
import {getPlatformSettings} from "@/lib/tenant";

export const dynamic = "force-dynamic";

const defaultBanner="https://res.cloudinary.com/dyhbzxjvi/image/upload/v1795618585/843878039_122195547656865123_4500486321270004780_n_oipvt1.jpg";
const defaultSocialLinks={facebook:"https://web.facebook.com/RoyalMansaf.Jo",instagram:"",youtube:"",tiktok:"",snapchat:""};

export default async function Page(){
  const platform=await getPlatformSettings();
  if(platform?.maintenanceMode)return <main dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f7f5f0",fontFamily:"Arial,sans-serif",textAlign:"center"}}><section style={{maxWidth:520,background:"#fff",padding:32,borderRadius:20,boxShadow:"0 12px 40px #0000000d"}}><h1 style={{fontSize:26,marginBottom:12}}>المتجر تحت الصيانة</h1><p style={{color:"#64748b",lineHeight:1.9}}>{platform.maintenanceMessage||"نعمل على تحسين الخدمة. يرجى المحاولة مرة أخرى لاحقاً."}</p></section></main>;
  try{
    const db=await getDb();
    const [products,settings,categories]=await Promise.all([
      db.collection("products").find({tenantId:"royal",active:{$ne:false}}).project({name:1,description:1,price:1,category:1,imageUrl:1,imagePosition:1,imageFit:1,sortOrder:1,updatedAt:1,createdAt:1}).sort({sortOrder:1,createdAt:-1}).toArray(),
      db.collection("settings").findOne({tenantId:"royal"}),
      db.collection("categories").find({tenantId:"royal",active:{$ne:false}}).sort({sortOrder:1,name:1}).toArray()
    ]);
    const rows=products.map(p=>({_id:String(p._id),name:String(p.name||""),description:String(p.description||""),price:Number(p.price||0),category:String(p.category||"عام"),imageUrl:String(p.imageUrl||"").startsWith("data:")?"/api/product-image/"+String(p._id)+"?tenant=royal&v="+String(new Date(p.updatedAt||p.createdAt||0).getTime()):String(p.imageUrl||""),imagePosition:String(p.imagePosition||"50% 50%"),imageFit:String(p.imageFit||"cover")}));
    const categoryNames=categories.length?categories.map(c=>String(c.name)):Array.from(new Set(rows.map(p=>p.category)));
    const socialLinks={...defaultSocialLinks,...(settings?.socialLinks||{})};
    return <MenuClient initialData={{products:rows,categories:categoryNames,whatsappPhone:settings?.whatsappPhone||process.env.WHATSAPP_PHONE||"962781776889",contactPhone:settings?.contactPhone||"0781475902",bannerUrl:settings?.bannerUrl||defaultBanner,bannerDesktopPosition:settings?.bannerDesktopPosition||"50% 45%",bannerMobilePosition:settings?.bannerMobilePosition||"62% 50%",restaurantName:settings?.restaurantName||"رويال",logoUrl:settings?.logoUrl||"",headerBackground:settings?.headerBackground||"#171613",headerText:settings?.headerText||"#ffffff",primaryColor:settings?.primaryColor||settings?.themeColor||"#a67c45",accentColor:settings?.accentColor||"#e9bd58",pageBackground:settings?.pageBackground||"#f7f5f0",cardBackground:settings?.cardBackground||"#ffffff",textColor:settings?.textColor||"#29251d",buttonBackground:settings?.buttonBackground||"#171613",buttonText:settings?.buttonText||"#f3d48e",description:settings?.description||"",email:settings?.email||"",address:settings?.address||"",website:settings?.website||"",footerText:settings?.footerText||"",socialLinks,socialMessage:settings?.socialMessage||"تابعونا على صفحاتنا لتصلكم أخبار وعروض رويال",deliveryEnabled:settings?.deliveryEnabled!==false,pickupEnabled:settings?.pickupEnabled!==false,dineInEnabled:settings?.dineInEnabled===true,orderingPaused:settings?.orderingPaused===true,cashEnabled:settings?.cashEnabled!==false,cliqEnabled:settings?.cliqEnabled===true,cliqName:settings?.cliqName||"",cliqAlias:settings?.cliqAlias||"",cliqBank:settings?.cliqBank||"",cliqInstructions:settings?.cliqInstructions||"",storeAddress:settings?.address||""}}/>;
  }catch{
    return <MenuClient initialData={{products:[],categories:[],whatsappPhone:process.env.WHATSAPP_PHONE||"962781776889",contactPhone:"0781475902",bannerUrl:defaultBanner,bannerDesktopPosition:"50% 45%",bannerMobilePosition:"62% 50%",restaurantName:"رويال",logoUrl:"",headerBackground:"#171613",headerText:"#ffffff",primaryColor:"#a67c45",accentColor:"#e9bd58",pageBackground:"#f7f5f0",cardBackground:"#ffffff",textColor:"#29251d",buttonBackground:"#171613",buttonText:"#f3d48e",description:"",email:"",address:"",website:"",footerText:"",socialLinks:defaultSocialLinks,socialMessage:"تابعونا على صفحاتنا لتصلكم أخبار وعروض رويال",deliveryEnabled:true,pickupEnabled:true,dineInEnabled:false,orderingPaused:false,cashEnabled:true,cliqEnabled:false,cliqName:"",cliqAlias:"",cliqBank:"",cliqInstructions:"",storeAddress:""}}/>;
  }
}
