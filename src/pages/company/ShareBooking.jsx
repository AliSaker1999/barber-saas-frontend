import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import QRCode from "qrcode";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchCompanyProfile } from "../../features/company/companySlice";
import api from "../../services/api";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { Card, SectionHeader } from "../../components/ui/Primitives";
import { EmptyState, Skeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";

/*
 * Share & QR — the shop's acquisition kit (spec §18).
 *
 * Every pilot shop gets the same four things out of this screen: a public
 * booking link, a QR code for the counter, a printable A5 poster, and a
 * ready-made Instagram/WhatsApp share. Each channel gets its own `?src=` tag,
 * so "did the QR card or the Instagram bio bring this customer?" is answered by
 * data rather than opinion (the source is stored against the account at signup).
 *
 * The QR is rendered locally — a shop with a weak connection in Tripoli still
 * needs to be able to print its own poster.
 */

const CHANNELS = [
  { id: "qr", labelKey: "channel_qr", icon: "qr" },
  { id: "instagram", labelKey: "channel_instagram", icon: "camera" },
  { id: "whatsapp", labelKey: "channel_whatsapp", icon: "whatsapp" },
  { id: "poster", labelKey: "channel_poster", icon: "image" },
  { id: "direct", labelKey: "channel_direct", icon: "globe" }
];

/*
 * Every shared/printed link points at the backend's GET /share/:slug rather
 * than straight at the SPA's /book/:slug. The SPA is client-rendered with no
 * SSR, so a link pasted into Instagram, WhatsApp or any other crawler-driven
 * preview always showed Ajmal's own app-level tags, never this shop's name
 * or cover photo. /share/:slug renders that shop's real tags for a crawler
 * and 302s a real visitor straight on to /book/:slug — one extra hop, same
 * destination.
 */
const SHARE_ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "").replace(/\/$/, "");

function bookingUrl(slug, source) {
  const base = `${SHARE_ORIGIN}/share/${slug}`;
  return source && source !== "direct" ? `${base}?src=${source}` : base;
}

export default function ShareBooking() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const shop = useAppSelector((state) => state.company.profile);
  const loading = useAppSelector((state) => state.company.loading);

  const [channel, setChannel] = useState("qr");
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (!shop) dispatch(fetchCompanyProfile());
  }, [dispatch, shop]);

  const slug = shop?.Slug;
  const url = useMemo(() => (slug ? bookingUrl(slug, channel) : null), [slug, channel]);

  /* Regenerated per channel so the printed QR carries that channel's tag. */
  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 720,
      /* Near-black on white: a gold-on-ivory QR looks lovely and scans badly
         under a barbershop's warm lighting. */
      color: { dark: "#111111ff", light: "#ffffffff" }
    })
      .then((data) => {
        if (!cancelled) setQrDataUrl(data);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  const copy = useCallback(
    async (value, message) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success(message || t("link_copied"));
      } catch {
        toast.error(t("error_generic"));
      }
    },
    [t]
  );

  const shopName = shop?.Name || "";

  const share = useCallback(async () => {
    if (!url) return;
    const text = t("share_caption", { shop: shopName });

    if (navigator.share) {
      try {
        await navigator.share({ title: shopName, text, url });
        return;
      } catch {
        /* Dismissed by the user — fall through to copying instead. */
      }
    }
    copy(`${text} ${url}`);
  }, [url, shopName, t, copy]);

  const downloadQr = useCallback(() => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `ajmal-qr-${slug}-${channel}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrDataUrl, slug, channel]);

  /*
   * Printing opens a standalone window rather than print-styling this screen:
   * the shop needs one clean A5 sheet, and print CSS on an app screen fights
   * the app shell, the tab bar and the theme.
   */
  const printPoster = useCallback(() => {
    if (!qrDataUrl || !shop) return;

    const win = window.open("", "_blank", "width=800,height=1100");
    if (!win) {
      toast.error(t("popup_blocked"));
      return;
    }

    win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${shop.Name}</title>
<style>
  @page { size: A5; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; width: 148mm; height: 210mm;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; gap: 6mm;
    padding: 14mm 12mm;
    font-family: Manrope, Inter, "Segoe UI", system-ui, sans-serif;
    background: #F7F4EE; color: #141414;
  }
  h1 { font-size: 26pt; margin: 0; letter-spacing: -0.5pt; }
  h2 { font-size: 13pt; margin: 0; font-weight: 600; color: #4A463F; }
  .qr { width: 78mm; height: 78mm; background: #fff; padding: 5mm; border-radius: 6mm; }
  .qr img { width: 100%; height: 100%; display: block; }
  .cta { font-size: 15pt; font-weight: 800; color: #8A6A1F; margin: 0; }
  .url { font-size: 9.5pt; color: #857F74; word-break: break-all; margin: 0; }
  .brand { font-size: 8.5pt; letter-spacing: 2pt; text-transform: uppercase; color: #857F74; margin: 0; }
</style></head>
<body>
  <p class="brand">Ajmal</p>
  <h1>${shop.Name}</h1>
  <h2>${t("poster_headline")}</h2>
  <div class="qr"><img src="${qrDataUrl}" alt=""></div>
  <p class="cta">${t("poster_cta")}</p>
  <p class="url">${url}</p>
</body></html>`);

    win.document.close();
    win.focus();
    /* Give the QR image a tick to decode before the print dialog snapshots. */
    setTimeout(() => win.print(), 350);
  }, [qrDataUrl, shop, url, t]);

  if (loading && !shop) {
    return (
      <div>
        <TopBar back title={t("share_booking_title")} />
        <div className="px-4 space-y-4">
          <Skeleton className="h-64 w-full" rounded="rounded-card" />
          <Skeleton className="h-24 w-full" rounded="rounded-card" />
        </div>
      </div>
    );
  }

  if (!slug) {
    return (
      <div>
        <TopBar back title={t("share_booking_title")} />
        <EmptyState
          icon="qr"
          title={t("share_no_slug_title")}
          description={t("share_no_slug_body")}
          actionLabel={t("shop_info")}
          actionTo="/company/profile"
        />
      </div>
    );
  }

  const instagramBio = t("instagram_bio_copy", { shop: shop.Name });
  const whatsappText = `${t("share_caption", { shop: shop.Name })} ${bookingUrl(slug, "whatsapp")}`;

  return (
    <div className="pb-8">
      <TopBar back title={t("share_booking_title")} subtitle={shop.Name} />

      <div className="px-4">
        <p className="text-body-sm text-content-secondary">{t("share_intro")}</p>
      </div>

      {/* ---- channel ---- */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-4">
        {CHANNELS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setChannel(entry.id)}
            aria-pressed={channel === entry.id}
            className={`press flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-pill text-body-sm font-semibold border transition-colors ${
              channel === entry.id
                ? "bg-brand-gold text-content-on-gold border-brand-gold"
                : "bg-surface-raised text-content-secondary border-line-subtle"
            }`}
          >
            <Icon name={entry.icon} size={15} />
            {t(entry.labelKey)}
          </button>
        ))}
      </div>

      {/* ---- QR ---- */}
      <div className="px-4 mt-5">
        <Card className="text-center">
          {/* Always white behind the QR, in both themes — a dark-mode QR on a
              charcoal card does not scan. */}
          <div className="mx-auto w-[220px] h-[220px] rounded-card bg-white p-3 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={t("share_booking_title")} className="w-full h-full" />
            ) : (
              <Skeleton className="w-full h-full" rounded="rounded-control" />
            )}
          </div>

          <p className="mt-3.5 text-caption text-content-muted break-all tnum">{url}</p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Button variant="secondary" icon="share" onClick={() => copy(url)}>
              {t("copy_booking_link")}
            </Button>
            <Button variant="secondary" icon="image" onClick={downloadQr} disabled={!qrDataUrl}>
              {t("download_qr")}
            </Button>
            <Button variant="secondary" icon="qr" onClick={printPoster} disabled={!qrDataUrl}>
              {t("print_poster")}
            </Button>
            <Button icon="share" onClick={share}>
              {t("share")}
            </Button>
          </div>
        </Card>
      </div>

      {/* ---- ready-made copy ---- */}
      <section className="px-4 mt-7">
        <SectionHeader title={t("ready_made_copy")} subtitle={t("ready_made_copy_sub")} />

        <div className="space-y-3">
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="camera" size={16} className="text-content-muted" />
              <p className="text-body-sm font-bold text-content-primary">
                {t("instagram_bio_label")}
              </p>
            </div>
            <p className="text-body-sm text-content-secondary whitespace-pre-line">
              {instagramBio}
            </p>
            <p className="mt-1.5 text-caption text-brand-gold-text break-all">
              {bookingUrl(slug, "instagram")}
            </p>
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                icon="share"
                onClick={() => copy(`${instagramBio}\n${bookingUrl(slug, "instagram")}`)}
              >
                {t("copy_link")}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="whatsapp" size={16} className="text-content-muted" />
              <p className="text-body-sm font-bold text-content-primary">
                {t("whatsapp_message_label")}
              </p>
            </div>
            <p className="text-body-sm text-content-secondary">{whatsappText}</p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon="share"
                onClick={() => copy(whatsappText)}
              >
                {t("copy_link")}
              </Button>
              <Button
                size="sm"
                icon="whatsapp"
                href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("share_via_whatsapp")}
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* ---- how attribution works ---- */}
      <section className="px-4 mt-7">
        <Card className="bg-surface-sunken">
          <div className="flex items-start gap-3">
            <Icon name="info" size={18} className="text-content-muted flex-shrink-0 mt-0.5" />
            <p className="text-caption text-content-secondary">{t("share_tracking_note")}</p>
          </div>
        </Card>
      </section>
    </div>
  );
}
