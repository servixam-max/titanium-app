import RoutinePageComponent from "./RoutinePage";

export function generateStaticParams() {
  return [{ day: "1" }, { day: "2" }, { day: "3" }, { day: "4" }];
}

export default function Page({ params }: { params: { day: string } }) {
  return <RoutinePageComponent day={Number(params.day)} />;
}
