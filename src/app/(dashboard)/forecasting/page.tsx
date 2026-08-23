export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { getForecastSuggestions } from "@/lib/forecasting";
import { ForecastingClient } from "@/components/forecasting-client";

export default async function ForecastingPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("No autorizado");

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) throw new Error("No hay organización activa");

  const forecasts = await getForecastSuggestions(user.id, orgId, supabase);
  return <ForecastingClient initialForecasts={forecasts} />;
}
