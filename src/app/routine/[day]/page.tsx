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
  ];
}

export default function Page({ params }: { params: { day: string } }) {
  return <RoutinePageComponent day={Number(params.day)} />;
}
