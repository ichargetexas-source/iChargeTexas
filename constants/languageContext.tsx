import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Language = "en" | "es";

export const [LanguageContext, useLanguage] = createContextHook(() => {
  const [language, setLanguage] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const storedLanguage = await AsyncStorage.getItem("appLanguage");
      if (storedLanguage === "en" || storedLanguage === "es") {
        setLanguage(storedLanguage);
      }
    } catch (error) {
      console.error("Error loading language:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = useCallback(async (newLanguage: Language) => {
    try {
      await AsyncStorage.setItem("appLanguage", newLanguage);
      setLanguage(newLanguage);
    } catch (error) {
      console.error("Error saving language:", error);
    }
  }, []);

  return useMemo(() => ({
    language,
    isLoading,
    changeLanguage,
  }), [language, isLoading, changeLanguage]);
});
