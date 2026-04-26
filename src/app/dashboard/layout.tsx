import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ROUTES } from "@/lib/auth/routes";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.LOGIN);
  return <>{children}</>;
}
