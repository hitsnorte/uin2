"use client";

import { useEffect, useState } from "react";

import en from "@/public/locales/en.json";
import pt from "@/public/locales/pt.json";

const translations = {
  1: pt,
  2: en,
};

export function useTranslations() {
  const [locale, setLocale] = useState(1);

  useEffect(() => {
    function updateLanguage() {
      const lang = Number(localStorage.getItem("lang"));

      setLocale(lang === 1 ? 1 : 2);
    }

    updateLanguage();

    window.addEventListener("languageChanged", updateLanguage);

    return () => {
      window.removeEventListener("languageChanged", updateLanguage);
    };
  }, []);

  return translations[locale];
}