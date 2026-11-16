import type messages from "@/src/i18n/messages/en.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: "en-CH";
    Messages: typeof messages;
  }
}
