import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ day?: string }>;
}

export default async function CalendarRedirect({ params, searchParams }: Props) {
  const { username } = await params;
  const { day } = await searchParams;
  const qs = day ? `?day=${day}` : "";
  redirect(`/${username}/activity${qs}`);
}
