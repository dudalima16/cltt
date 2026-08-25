import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TITLE = "Gestão Sair do CLT — Controle de estoque, vendas e lucro";
const DESC =
  "Cadastre seus produtos, registre vendas e acompanhe estoque, lucro e retorno do investimento em um painel simples.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const items = [
  {
    tag: "ESTOQUE",
    title: "Produtos e estoque",
    text: "Cadastre cada item com preço de custo, preço de venda e estoque mínimo.",
  },
  {
    tag: "GIRO",
    title: "Vendas com estoque automático",
    text: "Registre a venda — o estoque desce e o investimento de cada compra é contado sozinho.",
  },
  {
    tag: "MARGEM",
    title: "Calculadora de margem",
    text: "Simule taxas, frete e margem desejada antes de fechar o preço.",
  },
  {
    tag: "PAINEL",
    title: "Previsibilidade de ganho",
    text: "Veja quanto investiu, quanto pode voltar e o lucro parado no estoque.",
  },
];

const receiptLines = [
  { label: "1x Estoque investido", value: "R$ 1.240,00" },
  { label: "1x Vendido este mês", value: "R$ 2.860,00" },
];

function Home() {
  const { session, loading } = useAuth();
  const signedIn = !loading && !!session;
  const target = signedIn ? "/painel" : "/auth";

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-lg font-display text-lg font-bold text-primary-foreground">
            S
          </span>
          <span className="font-display font-bold">Gestão Sair do CLT</span>
        </div>
        <Link
          to={target}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {signedIn ? "Ir para o painel" : "Entrar"}
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            Feito pra quem revende, não pra investidor
          </p>
          <h1 className="text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Cada venda é uma linha a menos até você{" "}
            <span className="text-gradient-brand">largar o CLT</span>.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Registre o que comprou, o que vendeu e o que sobrou. Sem investidor, sem
            planilha bagunçada — só o real que entra e o real que sai.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to={target}
              className="brand-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              {signedIn ? "Ir para o painel" : "Começar a registrar"}
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#como-funciona"
              className="rounded-xl border border-border px-6 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Ver o que ele faz
            </a>
          </div>
        </div>

        {/* Recibo — o elemento que resume o app inteiro num objeto que quem
            revende reconhece na hora: um cupom de venda. */}
        <div className="flex justify-center lg:justify-end">
          <div className="receipt w-full max-w-xs px-6 pb-7 pt-6 font-mono">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold tracking-wider">CUPOM DE VIRADA</p>
              <p className="rounded-sm bg-[oklch(0.24_0.02_275/8%)] px-1.5 py-0.5 text-[10px] tracking-wider text-[var(--paper-muted)]">
                EXEMPLO
              </p>
            </div>

            <div className="receipt-cut mt-4 space-y-2 pt-4 text-xs">
              {receiptLines.map((l) => (
                <div key={l.label} className="flex items-center justify-between gap-3">
                  <span className="text-[var(--paper-muted)]">{l.label}</span>
                  <span>{l.value}</span>
                </div>
              ))}
            </div>

            <div className="receipt-cut mt-3 flex items-center justify-between pt-3">
              <span className="text-xs font-semibold tracking-wide">LUCRO LÍQUIDO</span>
              <span className="text-lg font-semibold">R$ 980,00</span>
            </div>

            <div className="receipt-cut mt-3 pt-3 text-center text-[11px] text-[var(--paper-muted)]">
              margem média · 60%
            </div>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-[var(--paper-muted)]">
              Isso é um mês de dados de exemplo.
              <br />O seu cupom começa em branco agora.
            </p>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-5xl scroll-mt-20 px-5 pb-16">
        <div className="mb-8 max-w-xl">
          <h2 className="text-2xl font-bold sm:text-3xl">O que fica registrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Quatro telas, cada uma com um trabalho só — sem funcionalidade sobrando.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((f) => (
            <div
              key={f.title}
              className="panel flex gap-4 p-6 transition-colors hover:border-primary/40"
            >
              <span className="shrink-0 font-mono text-[11px] font-medium tracking-wider text-primary">
                {f.tag}
              </span>
              <div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-5 pb-24 text-center">
        <p className="text-sm text-muted-foreground">
          Não é mais uma planilha pra manter. É o controle que faltava pra saber se hoje
          valeu a pena.
        </p>
        <Link
          to={target}
          className="brand-gradient mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          {signedIn ? "Ir para o painel" : "Criar minha conta"}
          <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
