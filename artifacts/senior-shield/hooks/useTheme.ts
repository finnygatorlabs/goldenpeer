import { usePreferences } from "@/context/PreferencesContext";
import { Colors } from "@/constants/colors";

export function useTheme() {
  const { prefs } = usePreferences();
  const isDark = prefs.color_scheme === "dark";
  const isHighContrast = prefs.high_contrast_enabled;

  let theme: typeof Colors.light;
  if (isDark && isHighContrast) {
    theme = Colors.darkHighContrast;
  } else if (isHighContrast) {
    theme = Colors.lightHighContrast;
  } else if (isDark) {
    theme = Colors.dark;
  } else {
    theme = Colors.light;
  }

  return { theme, isDark, isHighContrast, Colors };
}
