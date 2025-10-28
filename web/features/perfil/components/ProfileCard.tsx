export type ProfileView = {
  full_name: string | null;
  role: string | null;
  created_at?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function ProfileCard({ profile }: { profile: ProfileView }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-4 text-lg font-semibold">Seu Perfil</h2>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Nome</dt>
          <dd className="font-medium">{profile.full_name || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Função</dt>
          <dd className="font-medium capitalize">{profile.role || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Criado em</dt>
          <dd className="font-medium">
            {profile.created_at
              ? new Intl.DateTimeFormat("pt-BR", {
                  timeZone: "UTC",
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(profile.created_at))
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Telefone</dt>
          <dd className="font-medium">{profile.phone || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-zinc-500">E-mail</dt>
          <dd className="font-medium">{profile.email || "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
