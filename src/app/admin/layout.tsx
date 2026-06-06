import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AdminLayout from "@/components/AdminLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return <AdminLayout>{children}</AdminLayout>;
}
