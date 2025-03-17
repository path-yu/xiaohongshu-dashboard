import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";

type Language = "en" | "zh";

const LanguageContext = createContext<{
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  translations: {
    [key: string]:
      | string
      | ((count: number) => string)
      | ((taskId: string, status: string) => string)
      | ((minDelay: number) => string)
      | ((maxDelay: number) => string)
      | ((estimatedTime: number) => string)
      | ((successCount: number, totalCount: number) => string);
  };
}>({
  language: "en",
  setLanguage: () => {},
  translations: translations["en"],
});

import { ReactNode } from "react";
import translations from "../translations";

interface LanguageProviderProps {
  children: ReactNode;
}
export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("language");
    return (savedLanguage as Language) || "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      translations: translations[language],
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
