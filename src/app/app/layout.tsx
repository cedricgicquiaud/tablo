import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ROUTES } from "@/lib/auth/routes";
import { Sidebar } from "@/components/tablo/sidebar";
import { MobileShell } from "@/components/tablo/mobile-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.LOGIN);
  return <MobileShell sidebar={<Sidebar />}>{children}</MobileShell>;
}
