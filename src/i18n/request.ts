import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from "@/src/config/app";
import messages from "./messages/en.json";

/**
 * Single-locale setup for v1. The catalogue is English, formatting is en-CH.
 * When DE and FR arrive, resolve the locale here (person.locale, then the
 * Accept-Language header) and load the matching catalogue.
 */
export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  timeZone: DEFAULT_TIME_ZONE,
  messages,
}));
