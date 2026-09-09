import { formatWaitRange } from "./format";

/*
 * Queue status vocabulary, shared by the customer tracker, the Home banner and
 * the shop's Today screen.
 *
 * Lives outside the component file so all three read the same mapping — and so
 * the component module stays component-only for fast refresh.
 *
 * Ids come from the backend Queue/QueueStatus tables.
 */
export const QUEUE_STATUS = {
  WAITING: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  NO_SHOW: 5,
  AWAITING_PAYMENT: 6,
  PENDING_APPROVAL: 7
};

/*
 * The single sentence describing where the customer stands.
 *
 * `key` drives layout (a position number vs an icon), `tone` drives colour,
 * and the copy always comes from i18n — never a status name from the database.
 */
export function queueHeadline(queue, t) {
  if (!queue) return null;

  const position = Number(queue.position ?? 0);

  if (queue.statusId === QUEUE_STATUS.IN_PROGRESS) {
    return {
      key: "serving",
      title: t("queue_in_chair"),
      sub: t("queue_in_chair_sub"),
      tone: "success"
    };
  }

  if (queue.statusId === QUEUE_STATUS.PENDING_APPROVAL) {
    return {
      key: "pending",
      title: t("queue_pending_title"),
      sub: t("queue_pending_sub"),
      tone: "warning"
    };
  }

  if (queue.statusId === QUEUE_STATUS.AWAITING_PAYMENT) {
    return {
      key: "payment",
      title: t("queue_payment_title"),
      sub: t("queue_payment_sub"),
      tone: "warning"
    };
  }

  /* Position 1 means nobody is ahead — "you're next" reads better than "#1". */
  if (position <= 1) {
    return {
      key: "next",
      title: t("queue_you_are_next"),
      sub: t("queue_next_sub"),
      tone: "success"
    };
  }

  return {
    key: "waiting",
    title: t("queue_position", { n: position }),
    sub: formatWaitRange(queue.waitTime, t),
    tone: "gold"
  };
}

/* Which of the four progress steps the customer is on. */
export function queueStage(queue) {
  /* No queue means nothing has happened yet — the first step, not the third. */
  if (!queue) return 0;

  if (queue.statusId === QUEUE_STATUS.IN_PROGRESS) return 3;

  const position = Number(queue.position ?? 0);
  if (position <= 1) return 2;
  if (position <= 3) return 1;
  return 0;
}
