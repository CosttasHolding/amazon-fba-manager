import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function TasksLoading() {
  return <PageSkeleton kpiCount={3} rowCount={6} showSearch={false} />;
}
