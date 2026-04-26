import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/auth/routes";

export default function RootPage() {
  redirect(ROUTES.LOGIN);
}
