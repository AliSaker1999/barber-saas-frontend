import { useState } from "react";

const ONBOARDING_KEY = "ajmal_onboarding_done";

export function useOnboarding() {
  const [isDone, setIsDone] = useState(() => {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  });

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsDone(true);
  };

  return { isDone, completeOnboarding };
}
