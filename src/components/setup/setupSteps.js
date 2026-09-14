/*
 * The wizard's step list.
 *
 * Keys and flags only, no JSX — a plain module so it can be unit-tested, and
 * because `react-refresh/only-export-components` forbids exporting a const
 * beside a component.
 *
 * The order is the part worth defending:
 *
 *   identity first, because a shop with no name and no city has nothing worth
 *   showing on Explore even if everything else is done;
 *
 *   services before team, because assigning services needs both to exist;
 *
 *   assign before rota, because a barber with hours and no services is worse
 *   than the reverse — the shop reads "open, 1 barber on duty" and then every
 *   booking attempt fails. A barber with services and no hours simply doesn't
 *   appear, which is honest.
 *
 * `checkKey` ties a step to the server's readiness check, so progress is read
 * from the shop's real data rather than tracked in the client.
 */
export const SETUP_STEPS = [
  { key: "welcome", checkKey: null, optional: false },
  { key: "identity", checkKey: "identity", optional: false },
  { key: "look", checkKey: "branding", optional: true },
  { key: "services", checkKey: "services", optional: false },
  { key: "team", checkKey: "team", optional: false },
  { key: "assign", checkKey: "bookable", optional: false },
  { key: "rota", checkKey: "bookable", optional: false },
  { key: "shop_hours", checkKey: "shop_hours", optional: true },
  { key: "ready", checkKey: null, optional: false }
];

/* Which step satisfies a given check, for the checklist's shortcuts. */
export const STEP_FOR_CHECK = {
  identity: "identity",
  branding: "look",
  services: "services",
  team: "team",
  bookable: "assign",
  shop_hours: "shop_hours"
};

export const stepIndex = (key) => SETUP_STEPS.findIndex((step) => step.key === key);

/*
 * Where to drop someone who opens the wizard with no step in the URL: the
 * first blocking thing they have not done. A shop that is already ready lands
 * on the final screen, which is where its booking link lives.
 */
export function firstIncompleteStep(status) {
  if (!status) return "welcome";

  const blocked = SETUP_STEPS.find(
    (step) => step.checkKey && !step.optional && status.blockers?.includes(step.checkKey)
  );

  return blocked ? blocked.key : "ready";
}
