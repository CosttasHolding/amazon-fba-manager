import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function MembersLoading() {
  return <PageSkeleton kpiCount={4} rowCount={5} showSearch={false} />;
}
