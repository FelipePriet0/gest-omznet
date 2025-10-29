import { redirect } from "next/navigation";

export default function Home() {
  // Direciona para o Kanban como home da aplicação
  redirect("/kanban");
}
