import { useState } from "react";
import { useI18n } from "../i18n";

export default function ShareButton({ title, text, url, whatsappText }) {
  const { t } = useI18n();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled
      }
    } else {
      setShowMenu(true);
    }
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(whatsappText || `${title}\n${url}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    setShowMenu(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className="p-2 rounded-lg bg-app-surface-2 text-app-muted hover:bg-app-surface hover:text-app-text transition-all"
        title={t("share")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-app-surface rounded-xl shadow-2xl border border-app-border p-2 min-w-[180px]">
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-app-surface-2 transition-colors text-left"
            >
              <span className="text-xl">💬</span>
              <span className="text-sm font-bold text-app-text">{t("share_via_whatsapp")}</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-app-surface-2 transition-colors text-left"
            >
              <span className="text-xl">{copied ? "✅" : "📋"}</span>
              <span className="text-sm font-bold text-app-text">
                {copied ? t("link_copied") : t("copy_link")}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
