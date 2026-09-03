import RoutinePageComponent from "./RoutinePage";

export function generateStaticParams() {
  return [
    { day: "1" },
    { day: "2" },
    { day: "3" },
    { day: "4" },
    { day: "5" },
    { day: "6" },
    { day: "7" },
    { day: "8" },
    { day: "9" },
    { day: "10" },
    { day: "11" },
    { day: "12" },
    { day: "13" },
  ];
}

export default async function Page({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  return <RoutinePageComponent day={Number(day)} />;
}
