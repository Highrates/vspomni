export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Company={company:string,kpp:string,legalAddress:string};
type TaxCard={id:number,inn:string,kpp?:string,shortName?:string,fullName?:string,index?:string,region?:string,district?:string,city?:string,settlement?:string,street?:string,house?:string,building?:string,office?:string};
async function readJson<T>(url:string,init:RequestInit={}):Promise<T>{
  const res=await fetch(url,{...init,signal:AbortSignal.timeout(5500)});
  if(!res.ok)throw Error("registry unavailable");
  return await res.json() as T;
}
async function accounting(inn:string):Promise<Company|null>{
  const base="https://bo.nalog.gov.ru";
  const result=await readJson<{content:TaxCard[]}>(base+"/advanced-search/organizations/search?query="+inn+"&page=0");
  const row=result.content.find(r=>r.inn?.replace(/<\/?strong>/g,"")===inn);
  if(!row||!Number.isSafeInteger(row.id))return null;
  const card=await readJson<TaxCard>(base+"/nbo/organizations/"+row.id);
  if(card.inn!==inn||!(card.shortName||card.fullName))return null;
  const address=[card.index,card.region,card.district,card.city,card.settlement,card.street,card.house&&"д. "+card.house,card.building&&"корп. "+card.building,card.office&&"пом. "+card.office].filter(Boolean).join(", ");
  return {company:card.shortName||card.fullName!,kpp:card.kpp||"",legalAddress:card.street||card.house?address:""};
}
async function registry(inn:string):Promise<Company|null>{
  const base="https://egrul.nalog.ru";
  const request=await readJson<{t?:string,captchaRequired?:boolean}>(base+"/",{method:"POST",body:new URLSearchParams({query:inn,queryEq:"true"})});
  if(request.captchaRequired||!request.t)throw Error("registry unavailable");
  type Row={i:string,k:string,c?:string,n:string,p?:string,a?:string,e?:string};
  for(const delay of [250,600,1200]){
    await new Promise(resolve=>setTimeout(resolve,delay));
    const result=await readJson<{rows?:Row[],status?:string}>(base+"/search-result/"+encodeURIComponent(request.t));
    if(!Array.isArray(result.rows))continue;
    const matches=result.rows.filter(r=>r.i===inn);
    const row=matches.find(r=>!r.e)??matches[0];
    return row?{company:row.c||(row.k==="ip"?"ИП ":"")+row.n,kpp:row.p||"",legalAddress:row.a||""}:null;
  }
  throw Error("registry timed out");
}
const cache = new Map<string, {value: Company | null; expires: number}>()
const inFlight = new Map<string, Promise<Company | null>>()
const minute = 60_000
let windowStart = 0
let queries = 0

async function lookup(inn: string) {
  const company = (inn.length === 10 ? await accounting(inn).catch(() => null) : null) ?? await registry(inn)
  if (cache.size >= 2000) cache.delete(cache.keys().next().value!)
  cache.set(inn, {value: company, expires: Date.now() + (company ? 12 * 60 * minute : minute)})
  return company
}

export async function GET(req: Request) {
  const inn = new URL(req.url).searchParams.get('inn') ?? ''
  if (!/^(?:\d{10}|\d{12})$/.test(inn)) return Response.json({error: 'Проверьте ИНН.'}, {status: 400})
  const cached = cache.get(inn)
  let value
  try {
    if (cached && cached.expires > Date.now()) value = cached.value
    else {
      let pending = inFlight.get(inn)
      if (!pending) {
        if (Date.now() - windowStart >= minute) { windowStart = Date.now(); queries = 0 }
        if (queries >= 60 || inFlight.size >= 8) return Response.json({error: 'Повторите позже.'}, {status: 429})
        queries++
        pending = lookup(inn).finally(() => inFlight.delete(inn))
        inFlight.set(inn, pending)
      }
      value = await pending
    }
  } catch {
    return Response.json({error: 'Справочник временно недоступен.'}, {status: 503})
  }
  if (!value) return Response.json({error: 'Компания или ИП не найдены.'}, {status: 404})
  return Response.json({inn, ...value}, {headers: {'Cache-Control': 'public, max-age=600'}})
}
