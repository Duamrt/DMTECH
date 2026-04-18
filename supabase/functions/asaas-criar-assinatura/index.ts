import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
const ASAAS_BASE = Deno.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const corsHeaders = { "Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS" };
function json(b:unknown,s=200){return new Response(JSON.stringify(b),{status:s,headers:{...corsHeaders,"content-type":"application/json"}});}
async function asaas(p:string,init:RequestInit={}){const r=await fetch(`${ASAAS_BASE}${p}`,{...init,headers:{...(init.headers||{}),"access_token":ASAAS_KEY,"content-type":"application/json","User-Agent":"DMTech/1.0"}});const t=await r.text();const d=t?JSON.parse(t):{};if(!r.ok)throw new Error(`Asaas ${r.status}: ${t}`);return d;}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const jwt=(req.headers.get("authorization")??"").replace("Bearer ","");
  if(!jwt)return json({error:"unauthorized"},401);
  const sb=createClient(SUPABASE_URL,SUPABASE_SERVICE_KEY);
  const {data:u}=await sb.auth.getUser(jwt);
  if(!u?.user)return json({error:"unauthorized"},401);
  const b=await req.json().catch(()=>({}));
  const {company_id,plano,valor,ciclo="MONTHLY",forma_pagamento="UNDEFINED"}=b;
  if(!company_id||!plano||!valor)return json({error:"missing_fields"},400);
  const {data:perfil}=await sb.from("profiles").select("company_id, role").eq("id",u.user.id).single();
  const isAdmin=perfil?.company_id==="aaaa0001-0000-0000-0000-000000000001"&&perfil?.role==="dono";
  if(!isAdmin&&perfil?.company_id!==company_id)return json({error:"forbidden"},403);
  const {data:co,error:ce}=await sb.from("companies").select("id,name,cnpj,email,phone,whatsapp,asaas_customer_id").eq("id",company_id).single();
  if(ce||!co)return json({error:"company_not_found"},404);
  try{
    let cid=co.asaas_customer_id;
    if(!cid){
      const c=await asaas("/customers",{method:"POST",body:JSON.stringify({name:co.name,cpfCnpj:(co.cnpj??"").replace(/\D/g,"")||undefined,email:co.email??undefined,mobilePhone:(co.whatsapp??co.phone??"").replace(/\D/g,"")||undefined,externalReference:co.id})});
      cid=c.id;
      await sb.from("companies").update({asaas_customer_id:cid}).eq("id",co.id);
    }
    const nd=new Date();nd.setDate(nd.getDate()+7);
    const ndi=nd.toISOString().slice(0,10);
    const sub=await asaas("/subscriptions",{method:"POST",body:JSON.stringify({customer:cid,billingType:forma_pagamento,value:Number(valor),nextDueDate:ndi,cycle:ciclo,description:`DMTech - Plano ${plano}`,externalReference:`dmtech:${co.id}`})});
    const {data:a,error:ae}=await sb.from("assinaturas").insert({company_id:co.id,asaas_customer_id:cid,asaas_subscription_id:sub.id,plano,valor:Number(valor),ciclo,forma_pagamento,status:"ativa",proximo_vencimento:ndi}).select().single();
    if(ae)throw ae;
    await sb.from("companies").update({status_pagamento:"ativo",plano,plan:plano,trial_ate:null,trial_ends_at:null}).eq("id",co.id);
    let invoiceUrl:string|null=null;
    try{const ps=await asaas(`/payments?subscription=${sub.id}&limit=1`);if(ps?.data?.[0])invoiceUrl=ps.data[0].invoiceUrl??ps.data[0].bankSlipUrl??null;}catch(_){}
    return json({ok:true,assinatura:a,subscription_id:sub.id,invoice_url:invoiceUrl});
  }catch(e){console.error("[dmtech-asaas-criar]",e);return json({error:"asaas_error",message:String(e instanceof Error?e.message:e)},500);}
});
