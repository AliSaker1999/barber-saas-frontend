/*
 * Support and legal contact details.
 *
 * These come from build-time env so a placeholder can never ship: the previous
 * footer hard-coded +961 00 000 000 as "Call Support", which is worse than no
 * number at all — a customer dials it, nothing happens, and they conclude the
 * app is abandoned. When a channel is unset the UI hides it and says support
 * isn't configured yet rather than offering a dead link.
 *
 * Set in .env / the Play build environment:
 *   VITE_SUPPORT_PHONE=+9611234567
 *   VITE_SUPPORT_WHATSAPP=9611234567
 *   VITE_SUPPORT_EMAIL=support@ajmal.app
 *   VITE_SUPPORT_URL=https://ajmal.app/help
 *   VITE_PRIVACY_URL=https://ajmal.app/privacy
 *   VITE_TERMS_URL=https://ajmal.app/terms
 */

const clean = (value) => {
  const trimmed = String(value ?? "").trim();
  /* Guard against a literal placeholder being pasted into the env file. */
  if (!trimmed || /^(0+|\+?9610+|changeme|todo|xxx+)$/i.test(trimmed.replace(/[\s()-]/g, ""))) {
    return null;
  }
  return trimmed;
};

const phone = clean(import.meta.env.VITE_SUPPORT_PHONE);
const whatsapp = clean(import.meta.env.VITE_SUPPORT_WHATSAPP);
const email = clean(import.meta.env.VITE_SUPPORT_EMAIL);

export const support = {
  phone,
  whatsapp,
  email,
  helpUrl: clean(import.meta.env.VITE_SUPPORT_URL),
  privacyUrl: clean(import.meta.env.VITE_PRIVACY_URL),
  termsUrl: clean(import.meta.env.VITE_TERMS_URL),

  phoneHref: phone ? `tel:${phone.replace(/[\s()-]/g, "")}` : null,
  whatsappHref: whatsapp ? `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}` : null,
  emailHref: email ? `mailto:${email}` : null,

  get isConfigured() {
    return Boolean(phone || whatsapp || email || this.helpUrl);
  }
};

/* Builds a wa.me link for a shop's own WhatsApp number, with a prefilled note. */
export function shopWhatsappHref(number, message) {
  const digits = String(number ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  const suffix = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${suffix}`;
}

export function telHref(number) {
  const trimmed = String(number ?? "").trim();
  return trimmed ? `tel:${trimmed.replace(/[\s()-]/g, "")}` : null;
}

export default support;
