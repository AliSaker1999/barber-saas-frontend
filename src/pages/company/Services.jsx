import TopBar from "../../components/ui/TopBar";
import ServicesEditor from "../../components/setup/ServicesEditor";
import { useI18n } from "../../i18n";

/*
 * The shop's price list.
 *
 * Everything is in ServicesEditor, which the setup wizard also renders — so a
 * service added here and a service added during setup go through exactly the
 * same code, and the two can never drift.
 */
export default function Services() {
  const { t } = useI18n();

  return (
    <div className="pb-8">
      <TopBar back title={t("manage_services")} />
      <div className="px-4 pt-3">
        <ServicesEditor mode="manage" />
      </div>
    </div>
  );
}
