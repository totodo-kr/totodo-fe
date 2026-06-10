import { redirect } from "next/navigation";

export default function EditReviewRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/community/${params.id}/edit`);
}
