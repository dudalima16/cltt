import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Tempo sem interação até a sessão expirar sozinha.
const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutos
const CHECK_INTERVAL_MS = 30 * 1000;
const THROTTLE_MS = 5 * 1000;
const STORAGE_KEY = "sairdoclt:last-activity";
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/**
 * Desloga o usuário automaticamente após IDLE_LIMIT_MS sem interação.
 * O horário da última atividade fica salvo no localStorage, então funciona
 * mesmo se a pessoa fechar a aba e voltar depois do tempo limite.
 */
export function useIdleLogout(active: boolean) {
  const navigate = useNavigate();
  const lastWrite = useRef(0);

  useEffect(() => {
    if (!active) return;

    const markActive = () => {
      const now = Date.now();
      if (now - lastWrite.current < THROTTLE_MS) return;
      lastWrite.current = now;
      localStorage.setItem(STORAGE_KEY, String(now));
    };
    markActive();

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));

    async function checkIdle() {
      const last = Number(localStorage.getItem(STORAGE_KEY) ?? Date.now());
      if (Date.now() - last < IDLE_LIMIT_MS) return;
      clearInterval(interval);
      localStorage.removeItem(STORAGE_KEY);
      await supabase.auth.signOut();
      toast.info("Sessão encerrada por inatividade. Entre novamente.");
      navigate({ to: "/auth", replace: true });
    }

    const interval = setInterval(checkIdle, CHECK_INTERVAL_MS);
    checkIdle();

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, markActive));
      clearInterval(interval);
    };
  }, [active, navigate]);
}
