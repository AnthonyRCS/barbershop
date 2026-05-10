"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export function useBusinessData() {
  const [business, setBusiness] = useState<BusinessData | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await api.get<BusinessData>("/api/v1/business/me");
      setBusiness(data);
    };
    void load();
  }, []);

  return { business };
}