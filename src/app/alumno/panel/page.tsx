import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/session";
import { loadWorkshopSnapshot } from "@/lib/snapshot";
import { buildStudentPanelData } from "@/lib/views/student";
import { StudentApp } from "@/components/student/StudentApp";

export default async function StudentPanelPage() {
  const session = await requireStudent();
  if (!session) redirect("/alumno");

  const snap = await loadWorkshopSnapshot();
  const data = await buildStudentPanelData(snap, session.studentId);
  if (!data) redirect("/alumno");

  return <StudentApp data={data} />;
}
