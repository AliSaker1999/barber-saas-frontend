import { useState } from "react";
import { useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import TopBar from "../../components/ui/TopBar";
import BottomSheet from "../../components/ui/BottomSheet";
import { SectionHeader } from "../../components/ui/Primitives";
import TeamEditor from "../../components/setup/TeamEditor";
import BarberServicesEditor from "../../components/setup/BarberServicesEditor";
import BarberHoursEditor from "../../components/setup/BarberHoursEditor";
import ScheduleRequestsSection from "../../components/setup/ScheduleRequestsSection";

/*
 * The Team tab.
 *
 * The list and the add form live in TeamEditor, which the setup wizard also
 * renders. A barber's services and rota open in a sheet rather than expanding
 * the row: both are full forms, and on a 360px phone an accordion of them left
 * the owner scrolling past three collapsed barbers to reach the fourth.
 */
export default function Barbers() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(null);

  const selected = useAppSelector((state) =>
    state.barbers.items.find((barber) => barber.Id === selectedId)
  );

  return (
    <div className="pb-8">
      <TopBar title={t("nav_team")} />

      <div className="px-4 pt-3 space-y-6">
        <TeamEditor mode="manage" onSelect={setSelectedId} />
        <ScheduleRequestsSection />
      </div>

      <BottomSheet
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={selected?.DisplayName || selected?.FullName || t("barber")}
        subtitle={selected?.Email}
      >
        {selectedId ? (
          <div className="space-y-6">
            <section>
              <SectionHeader
                title={t("services_performed")}
                subtitle={t("services_performed_sub")}
              />
              <BarberServicesEditor barberId={selectedId} />
            </section>

            <section>
              <SectionHeader title={t("working_hours")} subtitle={t("working_hours_sub")} />
              <BarberHoursEditor barberId={selectedId} />
            </section>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
