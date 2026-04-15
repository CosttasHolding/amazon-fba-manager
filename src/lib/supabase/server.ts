import {createServerClient,type CookieOptions} from'@supabase/ssr'
import {cookies} from'next/headers'
export async function createClient(){
const c=await cookies()
return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
cookies:{get(n:string){return c.get(n)?.value},set(n:string,v:string,o:CookieOptions){try{c.set({name:n,value:v,...o})}catch{}},remove(n:string,o:CookieOptions){try{c.set({name:n,value:'',...o})}catch{}}}
})}
