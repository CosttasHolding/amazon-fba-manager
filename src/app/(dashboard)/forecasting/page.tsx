export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getForecastSuggestions } from "@/lib/forecasting";
import { ForecastingClient } from "@/components/forecasting-client";

export default async function ForecastingPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("No autorizado");

  const forecasts = await getForecastSuggestions(user.id, supabase);
  return <ForecastingClient initialForecasts={forecasts} />;
}
