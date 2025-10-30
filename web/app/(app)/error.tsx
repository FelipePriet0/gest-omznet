"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log no console do navegador e do terminal do Next
    console.error("App segment error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
      <h2 className="mb-2 text-lg font-semibold">Ocorreu um erro ao renderizar esta página.</h2>
      <pre className="whitespace-pre-wrap break-words text-sm text-red-700">{String(error?.message || error)}</pre>
      {error?.digest && <div className="mt-2 text-xs opacity-80">Digest: {error.digest}</div>}
      <button className="mt-4 rounded border border-red-300 bg-white px-3 py-1 text-sm" onClick={() => reset()}>
        Tentar novamente
      </button>
    </div>
  );
}

