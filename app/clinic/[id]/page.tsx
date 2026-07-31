import { redirect } from "next/navigation";

export default function ClinicEncounterRedirect({ params }: { params: { id: string } }) {
  redirect(`/ward/${params.id}`);
}
