import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function DriveLoading() {
  return <PageSkeleton kpiCount={3} rowCount={5} showSearch={false} />;
}
