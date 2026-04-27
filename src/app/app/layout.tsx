import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ROUTES } from "@/lib/auth/routes";
import { Sidebar } from "@/components/pinpoint/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.LOGIN);
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-x-hidden">{children}</div>
    </div>
  );
}
