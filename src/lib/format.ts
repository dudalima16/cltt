export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(value) ? value : 0,
  );

export const pct = (value: number) =>
  `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
    Number.isFinite(value) ? value : 0,
  )}%`;

export const int = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(Number.isFinite(value) ? value : 0);

export const shortDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

export const fullDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");

// Usa o fuso horário local (não UTC) para não "pular" de dia à noite,
// o que era um problema real para usuários no Brasil (UTC-3).
const toLocalISODate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const today = () => toLocalISODate(new Date());

export const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalISODate(d);
};

// Erros do Supabase nem sempre são instâncias de Error (dependendo da
// versão, vêm como objeto plano { message, code, ... }). Isso extrai a
// mensagem real de qualquer um dos dois formatos, em vez de cair sempre
// numa mensagem genérica.
export const errorMessage = (err: unknown, fallback = "Algo deu errado.") => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
};
