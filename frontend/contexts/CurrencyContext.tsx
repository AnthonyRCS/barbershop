"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "PEN",
  setCurrency: () => undefined,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState("PEN");

  useEffect(() => {
    api
      .get<{ currency?: string }>("/api/v1/business/me")
      .then((data) => {
        if (data.currency) setCurrencyState(data.currency);
      })
      .catch(() => {/* use default */});
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
