"use client";
import { useEffect } from "react";
import "../gtranslate.css"
export default function GTranslateWidget() {
  useEffect(() => {
    const settingsScript = document.createElement("script");
    settingsScript.type = "text/javascript";
    settingsScript.innerHTML = `
      window.gtranslateSettings = {
        default_language: "en",
        languages: ["en", "hi", "ml"],
        wrapper_selector: ".gtranslate_wrapper",
        flag_style: "rounded",
        alt_flags: { en: "gb" }
      };
    `;
    document.body.appendChild(settingsScript);

    // IMPORTANT: use dropdown.js instead of float.js
    const widgetScript = document.createElement("script");
    widgetScript.src = "https://cdn.gtranslate.net/widgets/latest/dropdown.js";
    widgetScript.defer = true;
    document.body.appendChild(widgetScript);

    return () => {
      settingsScript.remove();
      widgetScript.remove();
    };
  }, []);

  return <div className="gtranslate_wrapper"></div>;
}