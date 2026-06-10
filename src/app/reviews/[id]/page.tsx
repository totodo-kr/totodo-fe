import { redirect } from "next/navigation";

export default function ReviewDetailRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/community/${params.id}`);
}
