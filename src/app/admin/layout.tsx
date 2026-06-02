import AdminGuard from "@/components/AdminGuard";
import AdminLayout from "@/components/AdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
