import {notFound} from "next/navigation";import Admin from "../../royal/admin/page";import {getActiveTenant} from "@/lib/tenant";
export const dynamic="force-dynamic";
export default async function TenantAdminPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const tenant=await getActiveTenant(slug);if(!tenant)notFound();return <Admin tenantSlug={slug} tenantName={tenant.name}/>}
