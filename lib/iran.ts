/** Iran provinces — mirrors get_iran_states() used by template/mobile/address.php */
export const iranStates: string[] = [
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
];

/** Next `count` pickup days, skipping the closed weekdays (0=Sunday … 6=Saturday; default Friday) —
 *  configured in admin → تنظیمات → ارسال و تحویل. */
export function nextDeliveryDays(count = 7, closedWeekdays: number[] = [5]): string[] {
  const out: string[] = [];
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  let guard = 0;
  while (out.length < count && guard++ < 60) {
    d.setDate(d.getDate() + 1);
    if (closedWeekdays.includes(d.getDay())) continue;
    out.push(fmt.format(d));
  }
  return out;
}

/** getNextTimeDate() equivalent — delivery time windows */
export const deliveryHours: string[] = [
  "۹ تا ۱۲",
  "۱۲ تا ۱۵",
  "۱۵ تا ۱۸",
  "۱۸ تا ۲۱",
];
