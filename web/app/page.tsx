import { redirect } from "next/navigation";

export default function Home() {
  // Direciona para o Kanban/Análise como home da aplicação (área de trabalho do analista)
  redirect("/kanban/analise");
}
