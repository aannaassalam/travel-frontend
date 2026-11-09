/**
 * National / international buses and flights, and the visa box on the payment
 * step. All seven languages here; merged into each catalogue in lib/i18n.ts.
 * Every language is typed against French, so a missing key fails to compile.
 */
const fr = {
  "trip.international": "International",
  "trip.visaConfirm":
    "Je confirme que moi-même et chaque voyageur de cette réservation détenons un visa valide pour ce voyage, ou n’en avons pas besoin.",
  "trip.visaApply": "Pas encore de visa ? Faites la demande avec E-Visa",
  "trip.visaRequired": "Ce voyage est international : confirmez le visa pour réserver.",
  "trip.tickAll": "Cochez toutes les cases pour continuer."
};
type Dict = Record<keyof typeof fr, string>;

const en: Dict = {
  "trip.international": "International",
  "trip.visaConfirm":
    "I confirm that I — and every traveller on this booking — hold a valid visa for this trip, or do not need one.",
  "trip.visaApply": "No visa yet? Apply with E-Visa",
  "trip.visaRequired": "This is an international trip: confirm the visa to book.",
  "trip.tickAll": "Tick every box to continue."
};

const pt: Dict = {
  "trip.international": "Internacional",
  "trip.visaConfirm":
    "Confirmo que eu — e todos os viajantes desta reserva — temos um visto válido para esta viagem, ou não precisamos de um.",
  "trip.visaApply": "Ainda sem visto? Peça com o E-Visa",
  "trip.visaRequired": "Esta viagem é internacional: confirme o visto para reservar.",
  "trip.tickAll": "Marque todas as caixas para continuar."
};

const es: Dict = {
  "trip.international": "Internacional",
  "trip.visaConfirm":
    "Confirmo que yo — y cada viajero de esta reserva — tenemos un visado válido para este viaje, o no lo necesitamos.",
  "trip.visaApply": "¿Aún sin visado? Solicítelo con E-Visa",
  "trip.visaRequired": "Este viaje es internacional: confirme el visado para reservar.",
  "trip.tickAll": "Marque todas las casillas para continuar."
};

const zh: Dict = {
  "trip.international": "国际",
  "trip.visaConfirm": "我确认，我本人以及本次预订的每位旅客均持有此行程的有效签证，或无需签证。",
  "trip.visaApply": "还没有签证？通过 E-Visa 申请",
  "trip.visaRequired": "这是国际行程：请确认签证后再预订。",
  "trip.tickAll": "请勾选所有复选框以继续。"
};

const ar: Dict = {
  "trip.international": "دولي",
  "trip.visaConfirm":
    "أؤكد أنني — وكل مسافر في هذا الحجز — نحمل تأشيرة سارية لهذه الرحلة، أو لا نحتاج إليها.",
  "trip.visaApply": "ليست لديك تأشيرة بعد؟ قدّم طلبك عبر E-Visa",
  "trip.visaRequired": "هذه رحلة دولية: أكّد التأشيرة لإتمام الحجز.",
  "trip.tickAll": "ضع علامة في كل المربعات للمتابعة."
};

const ru: Dict = {
  "trip.international": "Международный",
  "trip.visaConfirm":
    "Я подтверждаю, что я и каждый путешественник в этом бронировании имеем действующую визу для этой поездки или она нам не нужна.",
  "trip.visaApply": "Ещё нет визы? Оформите через E-Visa",
  "trip.visaRequired": "Это международная поездка: подтвердите визу, чтобы забронировать.",
  "trip.tickAll": "Отметьте все флажки, чтобы продолжить."
};

const tripMessages = { fr, en, pt, es, zh, ar, ru };
export default tripMessages;
