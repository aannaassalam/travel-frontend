import type { Locale } from "@/typescript/interface/domain.interface";

/**
 * E-Visa (2026-11-06): every string of the e-visa pages, the account's visa
 * pages and components/visa, in the 7 languages. Merged into each language's
 * dictionary in lib/i18n.ts. `visa.terms` is word for word the sentence the
 * server stores as the consent (dto/public/visa.dto.ts VISA_CONSENT).
 * Languages other than fr/en machine-translated.
 */
const fr = {
  "nav.evisa": "E-Visa",
  "account.visas": "Mes demandes de visa",

  "visa.title": "Votre demande de visa, préparée par notre équipe",
  "visa.description":
    "Choisissez le pays, remplissez le formulaire en ligne et joignez votre passeport : nous préparons le dossier, le déposons à l'ambassade et vous tenons informé.",
  "visa.newApplication": "Nouvelle demande",

  "visa.how.title": "Comment ça se passe",
  "visa.how.1.title": "Choisissez le pays",
  "visa.how.1.body":
    "Et le type de visa : nos frais, le délai habituel et les pièces demandées sont affichés d'emblée.",
  "visa.how.2.title": "Remplissez le formulaire, joignez votre passeport",
  "visa.how.2.body":
    "Une dizaine de minutes. Une photo nette de la page d'identité suffit.",
  "visa.how.3.title": "Réglez les frais de service",
  "visa.how.3.body":
    "En espèces à notre agence ou par mobile money, en citant votre référence EV.",
  "visa.how.4.title": "Nous déposons et vous tenons informé",
  "visa.how.4.body":
    "Par SMS et dans votre compte, jusqu'à la décision de l'ambassade.",

  "visa.countries.title": "Choisissez votre destination",
  "visa.countries.subtitle":
    "Les montants affichés sont nos frais de service ; les frais d'ambassade sont indiqués dans le formulaire, à titre informatif.",
  "visa.countries.none": "Aucune destination ouverte pour l'instant",
  "visa.countries.noneBody":
    "Dites-nous où vous allez : nous vous dirons si nous pouvons préparer votre dossier.",
  "visa.countries.contact": "Nous contacter",
  "visa.countries.from": "dès",
  "visa.countries.apply": "Faire une demande",
  "visa.days": "{n} jours",
  "visa.daysRange": "{min} à {max} jours",

  "visa.trust.feeTitle": "Ce que couvrent nos frais",
  "visa.trust.feeBody":
    "La préparation et le dépôt de votre dossier. La décision appartient à l'ambassade, et ses propres frais se règlent à part.",
  "visa.trust.privateTitle": "Votre passeport reste privé",
  "visa.trust.privateBody":
    "Vos fichiers sont stockés en privé, vus seulement par vous et notre équipe, et supprimés après la clôture du dossier.",

  "visa.apply.title": "Demande de visa",
  "visa.apply.titleFor": "Demande de visa — {country}",
  "visa.apply.description":
    "Une dizaine de minutes. Gardez votre passeport sous la main ; vos réponses restent sur cet appareil jusqu'à l'envoi.",
  "visa.apply.welcomeBack":
    "Vous êtes connecté. Vos réponses sont là : vérifiez-les, puis envoyez votre demande.",

  "visa.s.destination": "Pays de destination",
  "visa.s.schedule": "Dates du voyage",
  "visa.s.purpose": "Motif du voyage",
  "visa.s.address": "Adresse pendant le séjour",
  "visa.s.stay": "Période du séjour",
  "visa.s.visaType": "Type de visa",
  "visa.s.personType": "Profil du voyageur",
  "visa.s.invitation": "Lettre d'invitation",
  "visa.s.traveller": "Voyageur (comme sur le passeport)",
  "visa.s.documents": "Documents",
  "visa.s.summary": "Récapitulatif",
  "visa.s.terms": "Conditions",
  "visa.sectionDone": "complété",

  "visa.i.schedule": "Le jour où vous partez et celui où vous rentrez.",
  "visa.i.stay":
    "Vos dates sur place ({country}) : souvent les mêmes que celles du voyage.",
  "visa.i.stayAny":
    "Vos dates sur place : souvent les mêmes que celles du voyage.",
  "visa.i.visaType":
    "Nos frais, le délai habituel et les pièces demandées, pour chaque visa.",
  "visa.i.personType":
    "Certains profils demandent des pièces en plus : elles s'affichent dès votre choix.",
  "visa.i.invitation":
    "Une personne ou une entreprise sur place vous invite-t-elle ?",
  "visa.i.traveller":
    "Recopiez exactement ce qui est imprimé sur le passeport.",
  "visa.i.documents": "PDF ou photo, 10 Mo maximum par fichier.",

  "visa.f.country": "Pays",
  "visa.f.town": "Ville de destination",
  "visa.f.choose": "Choisir…",
  "visa.f.countryFirst": "Choisissez d'abord le pays",
  "visa.countryNotes": "À savoir pour {country}",
  "visa.f.departure": "Date de départ",
  "visa.f.return": "Date de retour",
  "visa.f.bookingRef": "Référence de réservation Flexi",
  "visa.f.purpose": "Motif du voyage",
  "visa.f.address": "Adresse sur place",
  "visa.f.stayFrom": "Début du séjour",
  "visa.f.stayTo": "Fin du séjour",
  "visa.f.passportNumber": "Numéro de passeport",
  "visa.f.passportExpiry": "Expiration du passeport",
  "visa.f.email": "E-mail pour le suivi",

  "visa.h.town": "La ville principale où vous vous rendez.",
  "visa.h.bookingRef":
    "Si vous avez réservé ce voyage chez nous, par ex. FA-7K2QM-9XH4D.",
  "visa.h.purpose":
    "En une ou deux phrases : visite familiale, réunion d'affaires, études…",
  "visa.h.address":
    "Nom et adresse de l'hôtel, ou adresse de la personne qui vous héberge.",
  "visa.h.names": "Tous les prénoms, comme sur le passeport.",
  "visa.h.passportNumber":
    "Lettres et chiffres, sans espaces — par ex. OP1234567.",
  "visa.h.passportExpiry":
    "Il doit être valable au moins jusqu'au {date} ({months} mois après votre séjour).",
  "visa.h.passportExpiryAny": "Indiquée sur la page d'identité du passeport.",

  "visa.sameAsTravel": "Reprendre les dates du voyage ({from} → {to})",
  "visa.rush":
    "Ce visa demande habituellement {n} jours : l'idéal serait de partir à partir du {date}. Vous pouvez envoyer quand même : nous signalons le dossier comme urgent, mais c'est l'ambassade qui fixe le rythme.",

  "visa.offer.ourFee": "Nos frais de service",
  "visa.offer.embassyFee": "Frais d'ambassade (indicatif)",
  "visa.offer.processing": "Délai",
  "visa.offer.validity": "Validité",
  "visa.offer.SINGLE": "Entrée unique",
  "visa.offer.MULTIPLE": "Entrées multiples",
  "visa.offer.documents": "Pièces demandées",
  "visa.embassyNote":
    "Payés à l'ambassade, pas à nous : le montant est indicatif et peut changer.",

  "visa.person.minorTitle": "Voyageur de moins de 18 ans le jour du départ",
  "visa.person.extraTitle": "Pièces en plus pour ce profil",
  "visa.yes": "Oui",
  "visa.no": "Non",
  "visa.privacy":
    "Votre numéro de passeport n'est jamais affiché en entier : seuls notre équipe et l'ambassade le voient.",

  "visa.file.passport": "Passeport — page d'identité",
  "visa.file.hotel": "Réservation d'hôtel",
  "visa.file.photo": "Photo d'identité",
  "visa.file.invitation": "Lettre d'invitation",
  "visa.fh.passport":
    "La page entière, les quatre coins visibles, sans reflet.",
  "visa.fh.hotel": "Votre confirmation de réservation, si vous en avez une.",
  "visa.fh.photo": "Récente, sur fond clair, si l'ambassade en demande une.",
  "visa.fh.invitation": "Vous pourrez aussi l'apporter à notre agence.",
  "visa.file.drop": "Déposez le fichier ici ou",
  "visa.file.browse": "parcourez",
  "visa.file.types": "PDF, JPEG, PNG ou WEBP · 10 Mo maximum",
  "visa.file.ready": "Prêt à envoyer · {size}",
  "visa.file.replace": "Remplacer",
  "visa.file.remove": "Retirer",
  "visa.file.removeNamed": "Retirer {name}",
  "visa.file.lost":
    "Joignez à nouveau : {files}. Les fichiers ne sont pas conservés quand la page se recharge.",

  "visa.payLater":
    "Rien à payer maintenant : vous réglez nos frais à notre agence ou par mobile money après l'envoi, en citant votre référence.",
  "visa.terms":
    "Nos frais de service couvrent la préparation et le dépôt de votre demande ; la décision appartient à l'ambassade et les frais ne sont pas remboursés une fois la demande déposée.",
  "visa.submit": "Envoyer ma demande",
  "visa.left": "Avant l'envoi, il reste :",
  "visa.signInNote":
    "À l'envoi, vous vous connectez avec votre numéro de téléphone ; vos réponses restent ici.",

  "visa.err.required": "Ce champ est obligatoire.",
  "visa.err.passportFile":
    "Joignez la page d'identité de votre passeport : sans elle, le dossier ne peut pas être préparé.",
  "visa.err.departurePast":
    "Le départ ne peut pas être dans le passé : choisissez le {date} ou plus tard.",
  "visa.err.returnBeforeDeparture":
    "Le retour ne peut pas précéder le départ : choisissez le {date} ou plus tard.",
  "visa.err.stayBeforeDeparture":
    "Le séjour ne peut pas commencer avant votre départ : choisissez le {date} ou plus tard.",
  "visa.err.stayAfterReturn":
    "Le séjour doit tenir dans votre voyage : au plus tard le {date}, jour du retour.",
  "visa.err.stayToBeforeFrom":
    "La fin du séjour ne peut pas précéder son début : choisissez le {date} ou plus tard.",
  "visa.err.passportTooSoon":
    "Votre passeport doit être valable au moins jusqu'au {date} — {months} mois après votre séjour. Renouvelez-le avant de faire la demande.",
  "visa.err.notMinor":
    "Ce voyageur aura 18 ans ou plus le {date}, jour du départ : choisissez un profil adulte.",
  "visa.err.passportNumber":
    "Le numéro de passeport compte de 5 à 20 lettres et chiffres, sans espaces.",
  "visa.err.tooLong": "{n} caractères maximum : raccourcissez un peu.",
  "visa.err.email":
    "Cette adresse e-mail semble incomplète, par ex. nom@exemple.com.",
  "visa.err.bookingNotFound":
    "Cette référence ne correspond à aucune de vos réservations : vérifiez-la ou laissez le champ vide.",
  "visa.err.choiceUnavailable":
    "Ce choix n'est plus proposé (pays, ville, visa ou profil). La liste vient d'être mise à jour : choisissez à nouveau.",
  "visa.err.fileType":
    "« {name} » n'est pas un PDF, JPEG, PNG ou WEBP. Enregistrez-le en PDF ou prenez une photo JPEG, puis réessayez.",
  "visa.err.fileSize":
    "« {name} » fait {size} : la limite est de 10 Mo. Scannez en résolution plus basse ou prenez une photo.",
  "visa.err.send":
    "Votre demande n'a pas pu être envoyée. Vérifiez votre connexion et réessayez : rien ne sera enregistré en double.",

  "visa.code.fileType":
    "Un des fichiers n'est pas un PDF, JPEG, PNG ou WEBP. Remplacez-le, puis renvoyez.",
  "visa.code.fileSize":
    "Un des fichiers dépasse 10 Mo. Remplacez-le par un scan plus léger ou une photo.",
  "visa.code.invitationNotExpected":
    "Vous avez joint une lettre d'invitation mais répondu « Non ». Répondez « Oui » ou retirez le fichier.",
  "visa.code.departurePast":
    "La date de départ est passée : choisissez aujourd'hui ou un jour suivant.",
  "visa.code.returnBeforeDeparture":
    "Le retour est avant le départ : choisissez un retour le jour du départ ou après.",
  "visa.code.stayOutsideTrip":
    "Le séjour doit commencer le jour du départ ou après, et finir au plus tard le jour du retour.",
  "visa.code.invalidDate":
    "Une des dates n'existe pas. Vérifiez les dates du voyage, du séjour, de naissance et d'expiration.",
  "visa.code.notMinor":
    "Ce voyageur a 18 ans ou plus le jour du départ : choisissez un profil adulte.",
  "visa.code.terms":
    "Cochez la case pour accepter les conditions des frais de service.",
  "visa.code.locked":
    "Cette demande ne reçoit plus de documents : elle est déjà partie à l'ambassade. Appelez-nous si quelque chose a changé.",
  "visa.code.notCancellable":
    "Cette demande ne peut plus être annulée ici : elle a déjà été déposée. Appelez notre agence.",
  "visa.code.tooMany":
    "Cette demande a atteint le nombre maximal de fichiers. Appelez notre agence.",
  "visa.person.minorHint":
    "Moins de 18 ans le jour du départ : le dossier sera traité comme celui d'un mineur. Choisissez le profil des mineurs (étape 7) pour voir les pièces demandées.",

  "visa.req.countryId": "Choisissez le pays où vous allez.",
  "visa.req.townId": "Choisissez la ville de destination.",
  "visa.req.departureDate": "Indiquez la date de départ.",
  "visa.req.returnDate": "Indiquez la date de retour.",
  "visa.req.purpose": "Dites en une phrase pourquoi vous voyagez.",
  "visa.req.stayAddress": "Indiquez où vous logerez.",
  "visa.req.stayFrom": "Indiquez le début du séjour.",
  "visa.req.stayTo": "Indiquez la fin du séjour.",
  "visa.req.offerId": "Choisissez un type de visa.",
  "visa.req.personTypeId": "Choisissez le profil du voyageur.",
  "visa.req.firstName": "Indiquez le ou les prénoms, comme sur le passeport.",
  "visa.req.lastName": "Indiquez le nom, comme sur le passeport.",
  "visa.req.dateOfBirth": "Indiquez la date de naissance.",
  "visa.req.nationality": "Choisissez la nationalité.",
  "visa.req.passportNumber": "Indiquez le numéro de passeport.",
  "visa.req.passportExpiry": "Indiquez la date d'expiration du passeport.",

  "visa.done.title": "Demande envoyée",
  "visa.done.body":
    "Nous avons bien reçu la demande de {name} pour {country}. Nous vous écrivons par SMS dès que le dossier avance.",
  "visa.done.reference": "Votre référence",
  "visa.done.rush":
    "Votre départ est proche : le dossier est signalé comme urgent à notre équipe.",
  "visa.done.view": "Suivre ma demande",
  "visa.done.another": "Même voyage, autre voyageur",
  "visa.done.anotherHint":
    "Le voyage est repris ; il ne reste que le voyageur et son passeport à remplir.",

  "visa.pay.title": "Réglez les frais de service",
  "visa.pay.body":
    "{fee} à notre agence ou par mobile money, en citant la référence {ref}.",
  "visa.pay.beforeLodging":
    "Nous déposons le dossier à l'ambassade une fois le paiement reçu.",
  "visa.pay.PAID": "Frais payés",
  "visa.pay.UNPAID": "Frais à payer",

  "visa.status.SUBMITTED": "Reçue",
  "visa.status.IN_REVIEW": "En cours d'examen",
  "visa.status.INFO_REQUESTED": "Complément demandé",
  "visa.status.LODGED": "Déposée à l'ambassade",
  "visa.status.APPOINTMENT": "Rendez-vous fixé",
  "visa.status.APPROVED": "Visa accordé",
  "visa.status.REFUSED": "Visa refusé",
  "visa.status.COMPLETED": "Terminée",
  "visa.status.CANCELLED": "Annulée",

  "visa.step.received": "Demande reçue",
  "visa.step.review": "Examen par notre équipe",
  "visa.step.infoNote": "En attente de vos documents",
  "visa.step.lodged": "Déposée à l'ambassade",
  "visa.step.appointmentNote": "Rendez-vous le {date}",
  "visa.step.decision": "Décision de l'ambassade",
  "visa.step.approved": "Visa accordé",
  "visa.step.refused": "Visa refusé",
  "visa.step.completed": "Visa remis",
  "visa.step.returned": "Passeport rendu",
  "visa.step.now": "étape en cours",

  "visa.ev.APPLICATION_SUBMITTED": "Demande envoyée",
  "visa.ev.PAYMENT_RECEIVED": "Paiement reçu",
  "visa.ev.DOCUMENTS_RECEIVED": "Documents reçus",
  "visa.ev.OFFICE_DOCUMENTS_ADDED": "Document ajouté par notre équipe",
  "visa.ev.DOCUMENTS_PURGED": "Vos fichiers ont été supprimés",

  "visa.kind.PASSPORT": "Passeport",
  "visa.kind.HOTEL": "Réservation d'hôtel",
  "visa.kind.INVITATION": "Lettre d'invitation",
  "visa.kind.PHOTO": "Photo d'identité",
  "visa.kind.OTHER": "Autre document",
  "visa.kind.VISA": "Visa délivré",

  "visa.cancelReason.CUSTOMER_REQUEST": "Annulée à votre demande.",
  "visa.cancelReason.NOT_PAID":
    "Annulée : les frais de service n'ont pas été réglés.",
  "visa.cancelReason.INCOMPLETE": "Annulée : le dossier est resté incomplet.",
  "visa.cancelReason.DUPLICATE":
    "Annulée : elle faisait doublon avec une autre demande.",
  "visa.cancelReason.OTHER":
    "Annulée par notre équipe. Appelez-nous pour en savoir plus.",

  "visa.list.empty": "Aucune demande de visa pour l'instant",
  "visa.list.emptyBody": "Vos demandes apparaîtront ici, avec leur avancement.",
  "visa.list.actionNeeded": "Action requise",

  "visa.detail.notFound": "Cette demande est introuvable dans votre compte.",
  "visa.detail.progress": "Où en est votre demande",
  "visa.detail.fees": "Frais",
  "visa.detail.trip": "Voyage",
  "visa.detail.rush": "Départ proche : dossier signalé comme urgent.",
  "visa.detail.minor": "mineur",
  "visa.detail.noDocuments": "Aucun document pour l'instant.",
  "visa.detail.fromOffice": "de notre équipe",
  "visa.detail.purged":
    "Vos fichiers ont été supprimés le {date}, comme prévu après la clôture du dossier. Le visa délivré reste disponible.",

  "visa.next.review": "Notre équipe examine votre dossier",
  "visa.next.reviewBody":
    "Nous vous écrivons s'il manque quelque chose. Vous pouvez ajouter un document ci-dessous à tout moment.",
  "visa.next.info": "Il nous faut un complément",
  "visa.next.infoBody":
    "Envoyez les documents ici : votre dossier repart en examen dès réception.",
  "visa.next.lodged": "Déposée à l'ambassade",
  "visa.next.lodgedBody":
    "La décision prend habituellement {n} jours. Nous vous prévenons dès que l'ambassade répond.",
  "visa.next.appointment": "Votre rendez-vous à l'ambassade",
  "visa.next.appointmentBody":
    "Venez avec votre passeport et les originaux de vos documents.",
  "visa.next.approved": "Votre visa est accordé",
  "visa.next.approvedCollect":
    "Nous vous appelons dès qu'il est prêt à être retiré à notre agence.",
  "visa.next.download": "Télécharger le visa",
  "visa.next.visaNumber": "Numéro de visa",
  "visa.next.validity": "Valable du {from} au {to}",
  "visa.next.refused": "L'ambassade a refusé le visa",
  "visa.next.refusedBody":
    "Votre passeport vous attend à notre agence : venez avec la référence {ref}.",
  "visa.next.completed": "Dossier terminé : votre visa vous a été remis",
  "visa.next.closedRefused": "Dossier clos : votre passeport vous a été rendu",
  "visa.next.cancelled": "Cette demande est annulée",

  "visa.upload.add": "Ajouter un document",
  "visa.upload.hint":
    "Jusqu'à 5 fichiers à la fois ; indiquez ce qu'est chacun.",
  "visa.upload.kind": "Type de document pour {name}",
  "visa.upload.send": "Envoyer ({n})",
  "visa.upload.sent": "Envoyé : {n} document(s). Notre équipe est prévenue.",

  "visa.cancel.link": "Annuler cette demande",
  "visa.cancel.title": "Annuler la demande ?",
  "visa.cancel.body":
    "Elle ne sera pas déposée à l'ambassade. Si vous avez déjà payé, appelez-nous pour la suite.",
  "visa.cancel.note": "Pourquoi ?",
  "visa.cancel.confirm": "Oui, annuler",
  "visa.cancel.keep": "Garder ma demande"
};

type Dict = Record<keyof typeof fr, string>;

const en: Dict = {
  "nav.evisa": "E-Visa",
  "account.visas": "My visa applications",

  "visa.title": "Your visa application, prepared by our team",
  "visa.description":
    "Choose the country, fill in the form online and attach your passport: we prepare your file, lodge it with the embassy and keep you posted.",
  "visa.newApplication": "New application",

  "visa.how.title": "How it works",
  "visa.how.1.title": "Choose the country",
  "visa.how.1.body":
    "And the type of visa: our fee, the usual processing time and the documents needed are shown up front.",
  "visa.how.2.title": "Fill in the form, attach your passport",
  "visa.how.2.body":
    "About ten minutes. A clear photo of the passport's photo page is enough.",
  "visa.how.3.title": "Pay the service fee",
  "visa.how.3.body":
    "In cash at our office or by mobile money, quoting your EV reference.",
  "visa.how.4.title": "We lodge it and keep you posted",
  "visa.how.4.body": "By SMS and in your account, until the embassy decides.",

  "visa.countries.title": "Choose your destination",
  "visa.countries.subtitle":
    "The amounts shown are our service fees; the embassy's own fee is shown in the form, for information.",
  "visa.countries.none": "No destinations open yet",
  "visa.countries.noneBody":
    "Tell us where you're going and we'll tell you whether we can prepare your file.",
  "visa.countries.contact": "Contact us",
  "visa.countries.from": "from",
  "visa.countries.apply": "Apply",
  "visa.days": "{n} days",
  "visa.daysRange": "{min}–{max} days",

  "visa.trust.feeTitle": "What our fee covers",
  "visa.trust.feeBody":
    "Preparing and lodging your file. The decision belongs to the embassy, and its own fee is paid separately.",
  "visa.trust.privateTitle": "Your passport stays private",
  "visa.trust.privateBody":
    "Your files are stored privately, seen only by you and our team, and deleted after your application is closed.",

  "visa.apply.title": "Visa application",
  "visa.apply.titleFor": "Visa application — {country}",
  "visa.apply.description":
    "About ten minutes. Keep your passport at hand; your answers stay on this device until you send them.",
  "visa.apply.welcomeBack":
    "You're signed in. Your answers are all here: check them, then send your application.",

  "visa.s.destination": "Destination",
  "visa.s.schedule": "Travel dates",
  "visa.s.purpose": "Reason for travel",
  "visa.s.address": "Address during the stay",
  "visa.s.stay": "Stay period",
  "visa.s.visaType": "Visa type",
  "visa.s.personType": "Traveller type",
  "visa.s.invitation": "Letter of invitation",
  "visa.s.traveller": "Traveller (as in the passport)",
  "visa.s.documents": "Documents",
  "visa.s.summary": "Summary",
  "visa.s.terms": "Terms",
  "visa.sectionDone": "complete",

  "visa.i.schedule": "The day you leave and the day you come back.",
  "visa.i.stay":
    "Your dates on the ground ({country}): often the same as your travel dates.",
  "visa.i.stayAny":
    "Your dates on the ground: often the same as your travel dates.",
  "visa.i.visaType":
    "Our fee, the usual processing time and the documents needed, for each visa.",
  "visa.i.personType":
    "Some travellers need extra documents: they're listed as soon as you choose.",
  "visa.i.invitation":
    "Is a person or a company at your destination inviting you?",
  "visa.i.traveller": "Copy exactly what is printed in the passport.",
  "visa.i.documents": "PDF or photo, 10 MB at most per file.",

  "visa.f.country": "Country",
  "visa.f.town": "Destination town",
  "visa.f.choose": "Choose…",
  "visa.f.countryFirst": "Choose the country first",
  "visa.countryNotes": "Good to know for {country}",
  "visa.f.departure": "Departure date",
  "visa.f.return": "Return date",
  "visa.f.bookingRef": "Flexi booking reference",
  "visa.f.purpose": "Reason for travel",
  "visa.f.address": "Address at your destination",
  "visa.f.stayFrom": "Stay starts",
  "visa.f.stayTo": "Stay ends",
  "visa.f.passportNumber": "Passport number",
  "visa.f.passportExpiry": "Passport expiry date",
  "visa.f.email": "E-mail for updates",

  "visa.h.town": "The main town you're going to.",
  "visa.h.bookingRef": "If you booked this trip with us, e.g. FA-7K2QM-9XH4D.",
  "visa.h.purpose":
    "In a sentence or two: visiting family, a business meeting, studies…",
  "visa.h.address":
    "The hotel's name and address, or the address of the person you're staying with.",
  "visa.h.names": "All given names, as in the passport.",
  "visa.h.passportNumber": "Letters and digits, no spaces — e.g. OP1234567.",
  "visa.h.passportExpiry":
    "It must be valid until at least {date} ({months} months after your stay).",
  "visa.h.passportExpiryAny": "Printed on the passport's photo page.",

  "visa.sameAsTravel": "Use my travel dates ({from} → {to})",
  "visa.rush":
    "This visa usually takes {n} days, so the comfortable departure is from {date}. You can still send it: we'll mark your file as urgent, but the embassy sets the pace.",

  "visa.offer.ourFee": "Our service fee",
  "visa.offer.embassyFee": "Embassy fee (indicative)",
  "visa.offer.processing": "Processing",
  "visa.offer.validity": "Valid for",
  "visa.offer.SINGLE": "Single entry",
  "visa.offer.MULTIPLE": "Multiple entries",
  "visa.offer.documents": "Documents needed",
  "visa.embassyNote":
    "Paid to the embassy, not to us: the amount is indicative and may change.",

  "visa.person.minorTitle": "A traveller under 18 on the day of departure",
  "visa.person.extraTitle": "Extra documents for this traveller",
  "visa.yes": "Yes",
  "visa.no": "No",
  "visa.privacy":
    "Your passport number is never shown in full: only our team and the embassy see it.",

  "visa.file.passport": "Passport — photo page",
  "visa.file.hotel": "Hotel reservation",
  "visa.file.photo": "ID photo",
  "visa.file.invitation": "Letter of invitation",
  "visa.fh.passport": "The whole page, all four corners visible, no glare.",
  "visa.fh.hotel": "Your booking confirmation, if you have one.",
  "visa.fh.photo":
    "Recent, on a plain light background, if the embassy asks for one.",
  "visa.fh.invitation": "You can also bring it to our office.",
  "visa.file.drop": "Drop the file here or",
  "visa.file.browse": "browse",
  "visa.file.types": "PDF, JPEG, PNG or WEBP · 10 MB at most",
  "visa.file.ready": "Ready to send · {size}",
  "visa.file.replace": "Replace",
  "visa.file.remove": "Remove",
  "visa.file.removeNamed": "Remove {name}",
  "visa.file.lost":
    "Please attach again: {files}. Files can't be kept when the page reloads.",

  "visa.payLater":
    "Nothing to pay now: you pay our fee at our office or by mobile money after sending, quoting your reference.",
  "visa.terms":
    "Our service fee covers preparing and lodging your application; the decision belongs to the embassy and the fee is not refunded once the application is lodged.",
  "visa.submit": "Send my application",
  "visa.left": "Still to do before sending:",
  "visa.signInNote":
    "When you send, you'll sign in with your phone number; your answers stay here.",

  "visa.err.required": "This is required.",
  "visa.err.passportFile":
    "Attach your passport's photo page: we can't prepare the file without it.",
  "visa.err.departurePast":
    "The departure can't be in the past: choose {date} or later.",
  "visa.err.returnBeforeDeparture":
    "The return can't come before the departure: choose {date} or later.",
  "visa.err.stayBeforeDeparture":
    "Your stay can't start before you leave: choose {date} or later.",
  "visa.err.stayAfterReturn":
    "Your stay must fit within your trip: {date}, your return, at the latest.",
  "visa.err.stayToBeforeFrom":
    "The stay can't end before it starts: choose {date} or later.",
  "visa.err.passportTooSoon":
    "Your passport must be valid until at least {date} — {months} months after your stay. Renew it before applying.",
  "visa.err.notMinor":
    "This traveller will be 18 or over on {date}, the day of departure: choose an adult traveller type.",
  "visa.err.passportNumber":
    "A passport number has 5 to 20 letters and digits, no spaces.",
  "visa.err.tooLong": "{n} characters at most: please shorten it.",
  "visa.err.email":
    "This e-mail address looks incomplete, e.g. name@example.com.",
  "visa.err.bookingNotFound":
    "That reference doesn't match any of your bookings: check it, or leave the field empty.",
  "visa.err.choiceUnavailable":
    "That choice is no longer offered (country, town, visa or traveller type). The list has just been updated: please choose again.",
  "visa.err.fileType":
    "“{name}” isn't a PDF, JPEG, PNG or WEBP. Save it as a PDF or take a JPEG photo, then try again.",
  "visa.err.fileSize":
    "“{name}” is {size}: the limit is 10 MB. Scan at a lower resolution or take a photo instead.",
  "visa.err.send":
    "Your application could not be sent. Check your connection and try again — nothing will be recorded twice.",

  "visa.code.fileType":
    "One of the files isn't a PDF, JPEG, PNG or WEBP. Replace it, then send again.",
  "visa.code.fileSize":
    "One of the files is over 10 MB. Replace it with a lighter scan or a photo.",
  "visa.code.invitationNotExpected":
    "You attached a letter of invitation but answered “No”. Answer “Yes” or remove the file.",
  "visa.code.departurePast":
    "The departure date has passed: choose today or a later day.",
  "visa.code.returnBeforeDeparture":
    "The return is before the departure: choose a return on or after the departure day.",
  "visa.code.stayOutsideTrip":
    "The stay must start on or after the departure, and end by the return at the latest.",
  "visa.code.invalidDate":
    "One of the dates doesn't exist. Check the travel, stay, birth and expiry dates.",
  "visa.code.notMinor":
    "This traveller is 18 or over on the day of departure: choose an adult traveller type.",
  "visa.code.terms": "Tick the box to accept the terms of the service fee.",
  "visa.code.locked":
    "This application no longer takes documents: it has already gone to the embassy. Call us if something has changed.",
  "visa.code.notCancellable":
    "This application can no longer be cancelled here: it has already been lodged. Call our office.",
  "visa.code.tooMany":
    "This application has as many files as it can take. Call our office.",
  "visa.person.minorHint":
    "Under 18 on the day of departure: the file will be handled as a minor's. Choose the traveller type for minors (step 7) to see the documents needed.",

  "visa.req.countryId": "Choose the country you're going to.",
  "visa.req.townId": "Choose the town you're going to.",
  "visa.req.departureDate": "Enter your departure date.",
  "visa.req.returnDate": "Enter your return date.",
  "visa.req.purpose": "Say in a sentence why you're travelling.",
  "visa.req.stayAddress": "Say where you'll be staying.",
  "visa.req.stayFrom": "Enter when your stay starts.",
  "visa.req.stayTo": "Enter when your stay ends.",
  "visa.req.offerId": "Choose a visa type.",
  "visa.req.personTypeId": "Choose the traveller type.",
  "visa.req.firstName": "Enter the given name(s), as in the passport.",
  "visa.req.lastName": "Enter the surname, as in the passport.",
  "visa.req.dateOfBirth": "Enter the date of birth.",
  "visa.req.nationality": "Choose the nationality.",
  "visa.req.passportNumber": "Enter the passport number.",
  "visa.req.passportExpiry": "Enter the passport's expiry date.",

  "visa.done.title": "Application sent",
  "visa.done.body":
    "We've received the application for {name} to {country}. We'll text you as soon as it moves forward.",
  "visa.done.reference": "Your reference",
  "visa.done.rush":
    "Your departure is soon: the file is flagged as urgent to our team.",
  "visa.done.view": "Follow my application",
  "visa.done.another": "Same trip, another traveller",
  "visa.done.anotherHint":
    "The trip is copied; only the traveller and their passport are left to fill in.",

  "visa.pay.title": "Pay the service fee",
  "visa.pay.body":
    "{fee} at our office or by mobile money, quoting the reference {ref}.",
  "visa.pay.beforeLodging":
    "We lodge the file with the embassy once the payment is received.",
  "visa.pay.PAID": "Fee paid",
  "visa.pay.UNPAID": "Fee to pay",

  "visa.status.SUBMITTED": "Received",
  "visa.status.IN_REVIEW": "Under review",
  "visa.status.INFO_REQUESTED": "More needed",
  "visa.status.LODGED": "Lodged with the embassy",
  "visa.status.APPOINTMENT": "Appointment set",
  "visa.status.APPROVED": "Visa approved",
  "visa.status.REFUSED": "Visa refused",
  "visa.status.COMPLETED": "Completed",
  "visa.status.CANCELLED": "Cancelled",

  "visa.step.received": "Application received",
  "visa.step.review": "Checked by our team",
  "visa.step.infoNote": "Waiting for your documents",
  "visa.step.lodged": "Lodged with the embassy",
  "visa.step.appointmentNote": "Appointment on {date}",
  "visa.step.decision": "The embassy's decision",
  "visa.step.approved": "Visa approved",
  "visa.step.refused": "Visa refused",
  "visa.step.completed": "Visa handed over",
  "visa.step.returned": "Passport returned",
  "visa.step.now": "current step",

  "visa.ev.APPLICATION_SUBMITTED": "Application sent",
  "visa.ev.PAYMENT_RECEIVED": "Payment received",
  "visa.ev.DOCUMENTS_RECEIVED": "Documents received",
  "visa.ev.OFFICE_DOCUMENTS_ADDED": "Document added by our team",
  "visa.ev.DOCUMENTS_PURGED": "Your files were deleted",

  "visa.kind.PASSPORT": "Passport",
  "visa.kind.HOTEL": "Hotel reservation",
  "visa.kind.INVITATION": "Letter of invitation",
  "visa.kind.PHOTO": "ID photo",
  "visa.kind.OTHER": "Other document",
  "visa.kind.VISA": "Issued visa",

  "visa.cancelReason.CUSTOMER_REQUEST": "Cancelled at your request.",
  "visa.cancelReason.NOT_PAID": "Cancelled: the service fee was not paid.",
  "visa.cancelReason.INCOMPLETE": "Cancelled: the file stayed incomplete.",
  "visa.cancelReason.DUPLICATE":
    "Cancelled: it duplicated another application.",
  "visa.cancelReason.OTHER": "Cancelled by our team. Call us to know more.",

  "visa.list.empty": "No visa applications yet",
  "visa.list.emptyBody":
    "Your applications will show here, with their progress.",
  "visa.list.actionNeeded": "Action needed",

  "visa.detail.notFound": "We can't find this application in your account.",
  "visa.detail.progress": "Where your application stands",
  "visa.detail.fees": "Fees",
  "visa.detail.trip": "Trip",
  "visa.detail.rush": "Departure soon: file flagged as urgent.",
  "visa.detail.minor": "minor",
  "visa.detail.noDocuments": "No documents yet.",
  "visa.detail.fromOffice": "from our team",
  "visa.detail.purged":
    "Your files were deleted on {date}, as planned after the application closed. The issued visa stays available.",

  "visa.next.review": "Our team is checking your file",
  "visa.next.reviewBody":
    "We'll text you if anything is missing. You can add a document below at any time.",
  "visa.next.info": "We need something more from you",
  "visa.next.infoBody":
    "Send the documents here: your file goes back into review as soon as they arrive.",
  "visa.next.lodged": "Lodged with the embassy",
  "visa.next.lodgedBody":
    "A decision usually takes {n} days. We'll let you know as soon as the embassy answers.",
  "visa.next.appointment": "Your appointment at the embassy",
  "visa.next.appointmentBody":
    "Bring your passport and the originals of your documents.",
  "visa.next.approved": "Your visa is approved",
  "visa.next.approvedCollect":
    "We'll call you as soon as it's ready to collect at our office.",
  "visa.next.download": "Download the visa",
  "visa.next.visaNumber": "Visa number",
  "visa.next.validity": "Valid from {from} to {to}",
  "visa.next.refused": "The embassy refused the visa",
  "visa.next.refusedBody":
    "Your passport is waiting at our office: bring the reference {ref}.",
  "visa.next.completed": "Done: your visa was handed over",
  "visa.next.closedRefused": "Closed: your passport was returned",
  "visa.next.cancelled": "This application is cancelled",

  "visa.upload.add": "Add a document",
  "visa.upload.hint": "Up to 5 files at a time; say what each one is.",
  "visa.upload.kind": "Document type for {name}",
  "visa.upload.send": "Send ({n})",
  "visa.upload.sent": "Sent: {n} document(s). Our team has been told.",

  "visa.cancel.link": "Cancel this application",
  "visa.cancel.title": "Cancel this application?",
  "visa.cancel.body":
    "It won't be lodged with the embassy. If you've already paid, call us about what happens next.",
  "visa.cancel.note": "Why?",
  "visa.cancel.confirm": "Yes, cancel it",
  "visa.cancel.keep": "Keep my application"
};

const pt: Dict = {
  "nav.evisa": "E-Visa",
  "account.visas": "Os meus pedidos de visto",

  "visa.title": "O seu pedido de visto, preparado pela nossa equipa",
  "visa.description":
    "Escolha o país, preencha o formulário online e anexe o passaporte: preparamos o processo, entregamo-lo na embaixada e mantemo-lo informado.",
  "visa.newApplication": "Novo pedido",

  "visa.how.title": "Como funciona",
  "visa.how.1.title": "Escolha o país",
  "visa.how.1.body":
    "E o tipo de visto: a nossa taxa, o prazo habitual e os documentos pedidos aparecem logo.",
  "visa.how.2.title": "Preencha o formulário e anexe o passaporte",
  "visa.how.2.body":
    "Cerca de dez minutos. Basta uma fotografia nítida da página de identificação.",
  "visa.how.3.title": "Pague a taxa de serviço",
  "visa.how.3.body":
    "Em numerário na nossa agência ou por mobile money, indicando a sua referência EV.",
  "visa.how.4.title": "Entregamos e mantemo-lo informado",
  "visa.how.4.body": "Por SMS e na sua conta, até à decisão da embaixada.",

  "visa.countries.title": "Escolha o seu destino",
  "visa.countries.subtitle":
    "Os valores indicados são as nossas taxas de serviço; a taxa da embaixada aparece no formulário, a título informativo.",
  "visa.countries.none": "Ainda não há destinos disponíveis",
  "visa.countries.noneBody":
    "Diga-nos para onde vai e dir-lhe-emos se podemos preparar o seu processo.",
  "visa.countries.contact": "Contacte-nos",
  "visa.countries.from": "desde",
  "visa.countries.apply": "Fazer um pedido",
  "visa.days": "{n} dias",
  "visa.daysRange": "{min} a {max} dias",

  "visa.trust.feeTitle": "O que a nossa taxa cobre",
  "visa.trust.feeBody":
    "A preparação e a entrega do seu processo. A decisão cabe à embaixada, e a taxa dela é paga à parte.",
  "visa.trust.privateTitle": "O seu passaporte fica privado",
  "visa.trust.privateBody":
    "Os seus ficheiros são guardados de forma privada, vistos apenas por si e pela nossa equipa, e apagados depois de o processo ser encerrado.",

  "visa.apply.title": "Pedido de visto",
  "visa.apply.titleFor": "Pedido de visto — {country}",
  "visa.apply.description":
    "Cerca de dez minutos. Tenha o passaporte à mão; as suas respostas ficam neste dispositivo até ao envio.",
  "visa.apply.welcomeBack":
    "Tem sessão iniciada. As suas respostas estão aqui: verifique-as e envie o pedido.",

  "visa.s.destination": "País de destino",
  "visa.s.schedule": "Datas da viagem",
  "visa.s.purpose": "Motivo da viagem",
  "visa.s.address": "Morada durante a estadia",
  "visa.s.stay": "Período da estadia",
  "visa.s.visaType": "Tipo de visto",
  "visa.s.personType": "Perfil do viajante",
  "visa.s.invitation": "Carta de convite",
  "visa.s.traveller": "Viajante (como no passaporte)",
  "visa.s.documents": "Documentos",
  "visa.s.summary": "Resumo",
  "visa.s.terms": "Condições",
  "visa.sectionDone": "concluído",

  "visa.i.schedule": "O dia em que parte e o dia em que regressa.",
  "visa.i.stay":
    "As suas datas no destino ({country}): muitas vezes as mesmas da viagem.",
  "visa.i.stayAny":
    "As suas datas no destino: muitas vezes as mesmas da viagem.",
  "visa.i.visaType":
    "A nossa taxa, o prazo habitual e os documentos pedidos, para cada visto.",
  "visa.i.personType":
    "Alguns perfis pedem documentos adicionais: aparecem assim que escolher.",
  "visa.i.invitation": "Há uma pessoa ou empresa no destino que o convida?",
  "visa.i.traveller": "Copie exatamente o que está impresso no passaporte.",
  "visa.i.documents": "PDF ou fotografia, no máximo 10 MB por ficheiro.",

  "visa.f.country": "País",
  "visa.f.town": "Cidade de destino",
  "visa.f.choose": "Escolher…",
  "visa.f.countryFirst": "Escolha primeiro o país",
  "visa.countryNotes": "A saber sobre {country}",
  "visa.f.departure": "Data de partida",
  "visa.f.return": "Data de regresso",
  "visa.f.bookingRef": "Referência de reserva Flexi",
  "visa.f.purpose": "Motivo da viagem",
  "visa.f.address": "Morada no destino",
  "visa.f.stayFrom": "Início da estadia",
  "visa.f.stayTo": "Fim da estadia",
  "visa.f.passportNumber": "Número do passaporte",
  "visa.f.passportExpiry": "Validade do passaporte",
  "visa.f.email": "E-mail para acompanhamento",

  "visa.h.town": "A cidade principal para onde vai.",
  "visa.h.bookingRef":
    "Se reservou esta viagem connosco, por ex. FA-7K2QM-9XH4D.",
  "visa.h.purpose":
    "Numa ou duas frases: visita familiar, reunião de negócios, estudos…",
  "visa.h.address":
    "Nome e morada do hotel, ou a morada da pessoa que o recebe.",
  "visa.h.names": "Todos os nomes próprios, como no passaporte.",
  "visa.h.passportNumber":
    "Letras e algarismos, sem espaços — por ex. OP1234567.",
  "visa.h.passportExpiry":
    "Deve ser válido pelo menos até {date} ({months} meses após a estadia).",
  "visa.h.passportExpiryAny":
    "Indicada na página de identificação do passaporte.",

  "visa.sameAsTravel": "Usar as datas da viagem ({from} → {to})",
  "visa.rush":
    "Este visto demora normalmente {n} dias: o ideal seria partir a partir de {date}. Pode enviar na mesma: assinalamos o processo como urgente, mas é a embaixada que define o ritmo.",

  "visa.offer.ourFee": "A nossa taxa de serviço",
  "visa.offer.embassyFee": "Taxa da embaixada (indicativa)",
  "visa.offer.processing": "Prazo",
  "visa.offer.validity": "Validade",
  "visa.offer.SINGLE": "Entrada única",
  "visa.offer.MULTIPLE": "Entradas múltiplas",
  "visa.offer.documents": "Documentos pedidos",
  "visa.embassyNote":
    "Paga à embaixada, não a nós: o valor é indicativo e pode mudar.",

  "visa.person.minorTitle": "Viajante com menos de 18 anos no dia da partida",
  "visa.person.extraTitle": "Documentos adicionais para este perfil",
  "visa.yes": "Sim",
  "visa.no": "Não",
  "visa.privacy":
    "O número do passaporte nunca é mostrado por inteiro: só a nossa equipa e a embaixada o veem.",

  "visa.file.passport": "Passaporte — página de identificação",
  "visa.file.hotel": "Reserva de hotel",
  "visa.file.photo": "Fotografia tipo passe",
  "visa.file.invitation": "Carta de convite",
  "visa.fh.passport":
    "A página inteira, os quatro cantos visíveis, sem reflexos.",
  "visa.fh.hotel": "A confirmação da reserva, se tiver uma.",
  "visa.fh.photo": "Recente, em fundo claro, se a embaixada a pedir.",
  "visa.fh.invitation": "Também a pode trazer à nossa agência.",
  "visa.file.drop": "Largue o ficheiro aqui ou",
  "visa.file.browse": "procure",
  "visa.file.types": "PDF, JPEG, PNG ou WEBP · máximo 10 MB",
  "visa.file.ready": "Pronto a enviar · {size}",
  "visa.file.replace": "Substituir",
  "visa.file.remove": "Retirar",
  "visa.file.removeNamed": "Retirar {name}",
  "visa.file.lost":
    "Anexe novamente: {files}. Os ficheiros não são guardados quando a página é recarregada.",

  "visa.payLater":
    "Nada a pagar agora: paga a nossa taxa na agência ou por mobile money depois do envio, indicando a sua referência.",
  "visa.terms":
    "A nossa taxa de serviço cobre a preparação e a apresentação do seu pedido; a decisão cabe à embaixada e a taxa não é reembolsada depois de o pedido ser apresentado.",
  "visa.submit": "Enviar o meu pedido",
  "visa.left": "Antes de enviar, falta:",
  "visa.signInNote":
    "Ao enviar, inicia sessão com o seu número de telefone; as suas respostas ficam aqui.",

  "visa.err.required": "Este campo é obrigatório.",
  "visa.err.passportFile":
    "Anexe a página de identificação do passaporte: sem ela, o processo não pode ser preparado.",
  "visa.err.departurePast":
    "A partida não pode ser no passado: escolha {date} ou depois.",
  "visa.err.returnBeforeDeparture":
    "O regresso não pode ser antes da partida: escolha {date} ou depois.",
  "visa.err.stayBeforeDeparture":
    "A estadia não pode começar antes da partida: escolha {date} ou depois.",
  "visa.err.stayAfterReturn":
    "A estadia tem de caber na viagem: o mais tardar {date}, dia do regresso.",
  "visa.err.stayToBeforeFrom":
    "A estadia não pode acabar antes de começar: escolha {date} ou depois.",
  "visa.err.passportTooSoon":
    "O passaporte deve ser válido pelo menos até {date} — {months} meses após a estadia. Renove-o antes de fazer o pedido.",
  "visa.err.notMinor":
    "Este viajante terá 18 anos ou mais em {date}, dia da partida: escolha um perfil adulto.",
  "visa.err.passportNumber":
    "O número do passaporte tem de 5 a 20 letras e algarismos, sem espaços.",
  "visa.err.tooLong": "No máximo {n} caracteres: encurte um pouco.",
  "visa.err.email": "Este e-mail parece incompleto, por ex. nome@exemplo.com.",
  "visa.err.bookingNotFound":
    "Esta referência não corresponde a nenhuma das suas reservas: verifique-a ou deixe o campo vazio.",
  "visa.err.choiceUnavailable":
    "Esta opção já não está disponível (país, cidade, visto ou perfil). A lista foi atualizada: escolha novamente.",
  "visa.err.fileType":
    "«{name}» não é um PDF, JPEG, PNG ou WEBP. Guarde-o em PDF ou tire uma fotografia JPEG e tente de novo.",
  "visa.err.fileSize":
    "«{name}» tem {size}: o limite é 10 MB. Digitalize numa resolução mais baixa ou tire uma fotografia.",
  "visa.err.send":
    "Não foi possível enviar o pedido. Verifique a ligação e tente de novo — nada ficará registado em duplicado.",

  "visa.code.fileType":
    "Um dos ficheiros não é PDF, JPEG, PNG ou WEBP. Substitua-o e envie de novo.",
  "visa.code.fileSize":
    "Um dos ficheiros tem mais de 10 MB. Substitua-o por uma digitalização mais leve ou uma fotografia.",
  "visa.code.invitationNotExpected":
    "Anexou uma carta de convite mas respondeu «Não». Responda «Sim» ou retire o ficheiro.",
  "visa.code.departurePast":
    "A data de partida já passou: escolha hoje ou um dia seguinte.",
  "visa.code.returnBeforeDeparture":
    "O regresso é antes da partida: escolha um regresso no dia da partida ou depois.",
  "visa.code.stayOutsideTrip":
    "A estadia deve começar no dia da partida ou depois e acabar, o mais tardar, no dia do regresso.",
  "visa.code.invalidDate":
    "Uma das datas não existe. Verifique as datas da viagem, da estadia, de nascimento e de validade.",
  "visa.code.notMinor":
    "Este viajante tem 18 anos ou mais no dia da partida: escolha um perfil adulto.",
  "visa.code.terms":
    "Assinale a caixa para aceitar as condições da taxa de serviço.",
  "visa.code.locked":
    "Este pedido já não recebe documentos: já foi para a embaixada. Ligue-nos se algo mudou.",
  "visa.code.notCancellable":
    "Este pedido já não pode ser cancelado aqui: já foi entregue. Ligue para a nossa agência.",
  "visa.code.tooMany":
    "Este pedido atingiu o número máximo de ficheiros. Ligue para a nossa agência.",
  "visa.person.minorHint":
    "Menos de 18 anos no dia da partida: o processo será tratado como o de um menor. Escolha o perfil para menores (passo 7) para ver os documentos pedidos.",

  "visa.req.countryId": "Escolha o país para onde vai.",
  "visa.req.townId": "Escolha a cidade de destino.",
  "visa.req.departureDate": "Indique a data de partida.",
  "visa.req.returnDate": "Indique a data de regresso.",
  "visa.req.purpose": "Diga numa frase porque viaja.",
  "visa.req.stayAddress": "Indique onde vai ficar.",
  "visa.req.stayFrom": "Indique o início da estadia.",
  "visa.req.stayTo": "Indique o fim da estadia.",
  "visa.req.offerId": "Escolha um tipo de visto.",
  "visa.req.personTypeId": "Escolha o perfil do viajante.",
  "visa.req.firstName": "Indique o(s) nome(s) próprio(s), como no passaporte.",
  "visa.req.lastName": "Indique o apelido, como no passaporte.",
  "visa.req.dateOfBirth": "Indique a data de nascimento.",
  "visa.req.nationality": "Escolha a nacionalidade.",
  "visa.req.passportNumber": "Indique o número do passaporte.",
  "visa.req.passportExpiry": "Indique a data de validade do passaporte.",

  "visa.done.title": "Pedido enviado",
  "visa.done.body":
    "Recebemos o pedido de {name} para {country}. Enviamos-lhe um SMS assim que o processo avançar.",
  "visa.done.reference": "A sua referência",
  "visa.done.rush":
    "A sua partida está próxima: o processo foi assinalado como urgente à nossa equipa.",
  "visa.done.view": "Acompanhar o meu pedido",
  "visa.done.another": "Mesma viagem, outro viajante",
  "visa.done.anotherHint":
    "A viagem é copiada; só falta preencher o viajante e o passaporte dele.",

  "visa.pay.title": "Pague a taxa de serviço",
  "visa.pay.body":
    "{fee} na nossa agência ou por mobile money, indicando a referência {ref}.",
  "visa.pay.beforeLodging":
    "Entregamos o processo na embaixada depois de recebido o pagamento.",
  "visa.pay.PAID": "Taxa paga",
  "visa.pay.UNPAID": "Taxa por pagar",

  "visa.status.SUBMITTED": "Recebido",
  "visa.status.IN_REVIEW": "Em análise",
  "visa.status.INFO_REQUESTED": "Falta informação",
  "visa.status.LODGED": "Entregue na embaixada",
  "visa.status.APPOINTMENT": "Marcação agendada",
  "visa.status.APPROVED": "Visto concedido",
  "visa.status.REFUSED": "Visto recusado",
  "visa.status.COMPLETED": "Concluído",
  "visa.status.CANCELLED": "Cancelado",

  "visa.step.received": "Pedido recebido",
  "visa.step.review": "Análise pela nossa equipa",
  "visa.step.infoNote": "À espera dos seus documentos",
  "visa.step.lodged": "Entregue na embaixada",
  "visa.step.appointmentNote": "Marcação a {date}",
  "visa.step.decision": "Decisão da embaixada",
  "visa.step.approved": "Visto concedido",
  "visa.step.refused": "Visto recusado",
  "visa.step.completed": "Visto entregue",
  "visa.step.returned": "Passaporte devolvido",
  "visa.step.now": "etapa atual",

  "visa.ev.APPLICATION_SUBMITTED": "Pedido enviado",
  "visa.ev.PAYMENT_RECEIVED": "Pagamento recebido",
  "visa.ev.DOCUMENTS_RECEIVED": "Documentos recebidos",
  "visa.ev.OFFICE_DOCUMENTS_ADDED": "Documento adicionado pela nossa equipa",
  "visa.ev.DOCUMENTS_PURGED": "Os seus ficheiros foram apagados",

  "visa.kind.PASSPORT": "Passaporte",
  "visa.kind.HOTEL": "Reserva de hotel",
  "visa.kind.INVITATION": "Carta de convite",
  "visa.kind.PHOTO": "Fotografia tipo passe",
  "visa.kind.OTHER": "Outro documento",
  "visa.kind.VISA": "Visto emitido",

  "visa.cancelReason.CUSTOMER_REQUEST": "Cancelado a seu pedido.",
  "visa.cancelReason.NOT_PAID": "Cancelado: a taxa de serviço não foi paga.",
  "visa.cancelReason.INCOMPLETE": "Cancelado: o processo ficou incompleto.",
  "visa.cancelReason.DUPLICATE": "Cancelado: duplicava outro pedido.",
  "visa.cancelReason.OTHER":
    "Cancelado pela nossa equipa. Ligue-nos para saber mais.",

  "visa.list.empty": "Ainda não há pedidos de visto",
  "visa.list.emptyBody": "Os seus pedidos aparecem aqui, com o andamento.",
  "visa.list.actionNeeded": "Ação necessária",

  "visa.detail.notFound": "Não encontramos este pedido na sua conta.",
  "visa.detail.progress": "Em que ponto está o seu pedido",
  "visa.detail.fees": "Taxas",
  "visa.detail.trip": "Viagem",
  "visa.detail.rush": "Partida próxima: processo assinalado como urgente.",
  "visa.detail.minor": "menor",
  "visa.detail.noDocuments": "Ainda não há documentos.",
  "visa.detail.fromOffice": "da nossa equipa",
  "visa.detail.purged":
    "Os seus ficheiros foram apagados a {date}, como previsto após o encerramento do processo. O visto emitido continua disponível.",

  "visa.next.review": "A nossa equipa está a analisar o seu processo",
  "visa.next.reviewBody":
    "Enviamos-lhe um SMS se faltar alguma coisa. Pode adicionar um documento abaixo a qualquer momento.",
  "visa.next.info": "Precisamos de mais algo da sua parte",
  "visa.next.infoBody":
    "Envie os documentos aqui: o processo volta à análise assim que chegarem.",
  "visa.next.lodged": "Entregue na embaixada",
  "visa.next.lodgedBody":
    "A decisão demora normalmente {n} dias. Avisamos assim que a embaixada responder.",
  "visa.next.appointment": "A sua marcação na embaixada",
  "visa.next.appointmentBody":
    "Leve o passaporte e os originais dos seus documentos.",
  "visa.next.approved": "O seu visto foi concedido",
  "visa.next.approvedCollect":
    "Ligamos-lhe assim que estiver pronto para levantar na nossa agência.",
  "visa.next.download": "Descarregar o visto",
  "visa.next.visaNumber": "Número do visto",
  "visa.next.validity": "Válido de {from} a {to}",
  "visa.next.refused": "A embaixada recusou o visto",
  "visa.next.refusedBody":
    "O seu passaporte espera por si na nossa agência: traga a referência {ref}.",
  "visa.next.completed": "Concluído: o visto foi-lhe entregue",
  "visa.next.closedRefused": "Encerrado: o passaporte foi-lhe devolvido",
  "visa.next.cancelled": "Este pedido está cancelado",

  "visa.upload.add": "Adicionar um documento",
  "visa.upload.hint": "Até 5 ficheiros de cada vez; diga o que é cada um.",
  "visa.upload.kind": "Tipo de documento para {name}",
  "visa.upload.send": "Enviar ({n})",
  "visa.upload.sent": "Enviado: {n} documento(s). A nossa equipa foi avisada.",

  "visa.cancel.link": "Cancelar este pedido",
  "visa.cancel.title": "Cancelar o pedido?",
  "visa.cancel.body":
    "Não será entregue na embaixada. Se já pagou, ligue-nos para saber o que acontece a seguir.",
  "visa.cancel.note": "Porquê?",
  "visa.cancel.confirm": "Sim, cancelar",
  "visa.cancel.keep": "Manter o pedido"
};

const es: Dict = {
  "nav.evisa": "E-Visa",
  "account.visas": "Mis solicitudes de visado",

  "visa.title": "Su solicitud de visado, preparada por nuestro equipo",
  "visa.description":
    "Elija el país, rellene el formulario en línea y adjunte su pasaporte: preparamos el expediente, lo presentamos en la embajada y le mantenemos informado.",
  "visa.newApplication": "Nueva solicitud",

  "visa.how.title": "Cómo funciona",
  "visa.how.1.title": "Elija el país",
  "visa.how.1.body":
    "Y el tipo de visado: nuestra tarifa, el plazo habitual y los documentos exigidos se muestran de entrada.",
  "visa.how.2.title": "Rellene el formulario y adjunte el pasaporte",
  "visa.how.2.body":
    "Unos diez minutos. Basta una foto nítida de la página de datos.",
  "visa.how.3.title": "Pague la tarifa de servicio",
  "visa.how.3.body":
    "En efectivo en nuestra oficina o por mobile money, indicando su referencia EV.",
  "visa.how.4.title": "La presentamos y le mantenemos informado",
  "visa.how.4.body":
    "Por SMS y en su cuenta, hasta la decisión de la embajada.",

  "visa.countries.title": "Elija su destino",
  "visa.countries.subtitle":
    "Los importes indicados son nuestras tarifas de servicio; la tasa de la embajada aparece en el formulario, a título informativo.",
  "visa.countries.none": "Todavía no hay destinos disponibles",
  "visa.countries.noneBody":
    "Díganos a dónde va y le diremos si podemos preparar su expediente.",
  "visa.countries.contact": "Contáctenos",
  "visa.countries.from": "desde",
  "visa.countries.apply": "Solicitar",
  "visa.days": "{n} días",
  "visa.daysRange": "{min} a {max} días",

  "visa.trust.feeTitle": "Qué cubre nuestra tarifa",
  "visa.trust.feeBody":
    "La preparación y la presentación de su expediente. La decisión corresponde a la embajada, y su propia tasa se paga aparte.",
  "visa.trust.privateTitle": "Su pasaporte queda privado",
  "visa.trust.privateBody":
    "Sus archivos se guardan de forma privada, solo los ven usted y nuestro equipo, y se eliminan tras el cierre del expediente.",

  "visa.apply.title": "Solicitud de visado",
  "visa.apply.titleFor": "Solicitud de visado — {country}",
  "visa.apply.description":
    "Unos diez minutos. Tenga el pasaporte a mano; sus respuestas se quedan en este dispositivo hasta el envío.",
  "visa.apply.welcomeBack":
    "Ha iniciado sesión. Sus respuestas siguen aquí: revíselas y envíe su solicitud.",

  "visa.s.destination": "País de destino",
  "visa.s.schedule": "Fechas del viaje",
  "visa.s.purpose": "Motivo del viaje",
  "visa.s.address": "Dirección durante la estancia",
  "visa.s.stay": "Periodo de estancia",
  "visa.s.visaType": "Tipo de visado",
  "visa.s.personType": "Perfil del viajero",
  "visa.s.invitation": "Carta de invitación",
  "visa.s.traveller": "Viajero (como en el pasaporte)",
  "visa.s.documents": "Documentos",
  "visa.s.summary": "Resumen",
  "visa.s.terms": "Condiciones",
  "visa.sectionDone": "completado",

  "visa.i.schedule": "El día en que sale y el día en que vuelve.",
  "visa.i.stay":
    "Sus fechas en destino ({country}): a menudo las mismas que las del viaje.",
  "visa.i.stayAny":
    "Sus fechas en destino: a menudo las mismas que las del viaje.",
  "visa.i.visaType":
    "Nuestra tarifa, el plazo habitual y los documentos exigidos, para cada visado.",
  "visa.i.personType":
    "Algunos perfiles requieren documentos adicionales: aparecen en cuanto elige.",
  "visa.i.invitation": "¿Le invita una persona o una empresa en el destino?",
  "visa.i.traveller":
    "Copie exactamente lo que figura impreso en el pasaporte.",
  "visa.i.documents": "PDF o foto, 10 MB como máximo por archivo.",

  "visa.f.country": "País",
  "visa.f.town": "Ciudad de destino",
  "visa.f.choose": "Elegir…",
  "visa.f.countryFirst": "Elija primero el país",
  "visa.countryNotes": "Para saber sobre {country}",
  "visa.f.departure": "Fecha de salida",
  "visa.f.return": "Fecha de regreso",
  "visa.f.bookingRef": "Referencia de reserva Flexi",
  "visa.f.purpose": "Motivo del viaje",
  "visa.f.address": "Dirección en destino",
  "visa.f.stayFrom": "Inicio de la estancia",
  "visa.f.stayTo": "Fin de la estancia",
  "visa.f.passportNumber": "Número de pasaporte",
  "visa.f.passportExpiry": "Caducidad del pasaporte",
  "visa.f.email": "Correo para el seguimiento",

  "visa.h.town": "La ciudad principal a la que va.",
  "visa.h.bookingRef":
    "Si reservó este viaje con nosotros, p. ej. FA-7K2QM-9XH4D.",
  "visa.h.purpose":
    "En una o dos frases: visita familiar, reunión de negocios, estudios…",
  "visa.h.address":
    "Nombre y dirección del hotel, o la dirección de la persona que le aloja.",
  "visa.h.names": "Todos los nombres, como en el pasaporte.",
  "visa.h.passportNumber": "Letras y cifras, sin espacios — p. ej. OP1234567.",
  "visa.h.passportExpiry":
    "Debe ser válido al menos hasta el {date} ({months} meses después de la estancia).",
  "visa.h.passportExpiryAny": "Figura en la página de datos del pasaporte.",

  "visa.sameAsTravel": "Usar las fechas del viaje ({from} → {to})",
  "visa.rush":
    "Este visado suele tardar {n} días: lo ideal sería salir a partir del {date}. Puede enviarla igualmente: marcamos el expediente como urgente, pero es la embajada quien marca el ritmo.",

  "visa.offer.ourFee": "Nuestra tarifa de servicio",
  "visa.offer.embassyFee": "Tasa de la embajada (orientativa)",
  "visa.offer.processing": "Plazo",
  "visa.offer.validity": "Validez",
  "visa.offer.SINGLE": "Entrada única",
  "visa.offer.MULTIPLE": "Entradas múltiples",
  "visa.offer.documents": "Documentos exigidos",
  "visa.embassyNote":
    "Se paga a la embajada, no a nosotros: el importe es orientativo y puede cambiar.",

  "visa.person.minorTitle": "Viajero menor de 18 años el día de salida",
  "visa.person.extraTitle": "Documentos adicionales para este perfil",
  "visa.yes": "Sí",
  "visa.no": "No",
  "visa.privacy":
    "Su número de pasaporte nunca se muestra completo: solo lo ven nuestro equipo y la embajada.",

  "visa.file.passport": "Pasaporte — página de datos",
  "visa.file.hotel": "Reserva de hotel",
  "visa.file.photo": "Foto de carné",
  "visa.file.invitation": "Carta de invitación",
  "visa.fh.passport":
    "La página entera, las cuatro esquinas visibles, sin reflejos.",
  "visa.fh.hotel": "Su confirmación de reserva, si la tiene.",
  "visa.fh.photo": "Reciente, con fondo claro, si la embajada la pide.",
  "visa.fh.invitation": "También puede traerla a nuestra oficina.",
  "visa.file.drop": "Suelte el archivo aquí o",
  "visa.file.browse": "búsquelo",
  "visa.file.types": "PDF, JPEG, PNG o WEBP · 10 MB como máximo",
  "visa.file.ready": "Listo para enviar · {size}",
  "visa.file.replace": "Sustituir",
  "visa.file.remove": "Quitar",
  "visa.file.removeNamed": "Quitar {name}",
  "visa.file.lost":
    "Adjunte de nuevo: {files}. Los archivos no se conservan al recargar la página.",

  "visa.payLater":
    "Nada que pagar ahora: paga nuestra tarifa en la oficina o por mobile money después del envío, indicando su referencia.",
  "visa.terms":
    "Nuestra tarifa de servicio cubre la preparación y la presentación de su solicitud; la decisión corresponde a la embajada y la tarifa no se reembolsa una vez presentada la solicitud.",
  "visa.submit": "Enviar mi solicitud",
  "visa.left": "Antes de enviar, falta:",
  "visa.signInNote":
    "Al enviar, iniciará sesión con su número de teléfono; sus respuestas se quedan aquí.",

  "visa.err.required": "Este campo es obligatorio.",
  "visa.err.passportFile":
    "Adjunte la página de datos del pasaporte: sin ella no podemos preparar el expediente.",
  "visa.err.departurePast":
    "La salida no puede estar en el pasado: elija el {date} o después.",
  "visa.err.returnBeforeDeparture":
    "El regreso no puede ser antes de la salida: elija el {date} o después.",
  "visa.err.stayBeforeDeparture":
    "La estancia no puede empezar antes de su salida: elija el {date} o después.",
  "visa.err.stayAfterReturn":
    "La estancia debe caber en el viaje: como muy tarde el {date}, día del regreso.",
  "visa.err.stayToBeforeFrom":
    "La estancia no puede terminar antes de empezar: elija el {date} o después.",
  "visa.err.passportTooSoon":
    "Su pasaporte debe ser válido al menos hasta el {date} — {months} meses después de la estancia. Renuévelo antes de solicitar.",
  "visa.err.notMinor":
    "Este viajero tendrá 18 años o más el {date}, día de salida: elija un perfil adulto.",
  "visa.err.passportNumber":
    "Un número de pasaporte tiene de 5 a 20 letras y cifras, sin espacios.",
  "visa.err.tooLong": "{n} caracteres como máximo: acórtelo un poco.",
  "visa.err.email": "Este correo parece incompleto, p. ej. nombre@ejemplo.com.",
  "visa.err.bookingNotFound":
    "Esta referencia no corresponde a ninguna de sus reservas: revísela o deje el campo vacío.",
  "visa.err.choiceUnavailable":
    "Esta opción ya no está disponible (país, ciudad, visado o perfil). La lista se acaba de actualizar: elija de nuevo.",
  "visa.err.fileType":
    "«{name}» no es un PDF, JPEG, PNG ni WEBP. Guárdelo en PDF o haga una foto JPEG y vuelva a intentarlo.",
  "visa.err.fileSize":
    "«{name}» pesa {size}: el límite es 10 MB. Escanéelo con menos resolución o haga una foto.",
  "visa.err.send":
    "No se pudo enviar su solicitud. Compruebe la conexión y vuelva a intentarlo: nada se registrará dos veces.",

  "visa.code.fileType":
    "Uno de los archivos no es PDF, JPEG, PNG ni WEBP. Sustitúyalo y vuelva a enviar.",
  "visa.code.fileSize":
    "Uno de los archivos supera los 10 MB. Sustitúyalo por un escaneo más ligero o una foto.",
  "visa.code.invitationNotExpected":
    "Ha adjuntado una carta de invitación pero respondió «No». Responda «Sí» o quite el archivo.",
  "visa.code.departurePast":
    "La fecha de salida ya ha pasado: elija hoy o un día posterior.",
  "visa.code.returnBeforeDeparture":
    "El regreso es anterior a la salida: elija un regreso el día de salida o después.",
  "visa.code.stayOutsideTrip":
    "La estancia debe empezar el día de salida o después y terminar, como muy tarde, el día del regreso.",
  "visa.code.invalidDate":
    "Una de las fechas no existe. Revise las fechas del viaje, de la estancia, de nacimiento y de caducidad.",
  "visa.code.notMinor":
    "Este viajero tiene 18 años o más el día de salida: elija un perfil adulto.",
  "visa.code.terms":
    "Marque la casilla para aceptar las condiciones de la tarifa de servicio.",
  "visa.code.locked":
    "Esta solicitud ya no admite documentos: ya ha ido a la embajada. Llámenos si algo ha cambiado.",
  "visa.code.notCancellable":
    "Esta solicitud ya no puede cancelarse aquí: ya se ha presentado. Llame a nuestra oficina.",
  "visa.code.tooMany":
    "Esta solicitud ha alcanzado el número máximo de archivos. Llame a nuestra oficina.",
  "visa.person.minorHint":
    "Menor de 18 años el día de salida: el expediente se tratará como el de un menor. Elija el perfil para menores (paso 7) para ver los documentos exigidos.",

  "visa.req.countryId": "Elija el país al que va.",
  "visa.req.townId": "Elija la ciudad de destino.",
  "visa.req.departureDate": "Indique la fecha de salida.",
  "visa.req.returnDate": "Indique la fecha de regreso.",
  "visa.req.purpose": "Diga en una frase por qué viaja.",
  "visa.req.stayAddress": "Indique dónde se alojará.",
  "visa.req.stayFrom": "Indique el inicio de la estancia.",
  "visa.req.stayTo": "Indique el fin de la estancia.",
  "visa.req.offerId": "Elija un tipo de visado.",
  "visa.req.personTypeId": "Elija el perfil del viajero.",
  "visa.req.firstName":
    "Indique el nombre o los nombres, como en el pasaporte.",
  "visa.req.lastName": "Indique los apellidos, como en el pasaporte.",
  "visa.req.dateOfBirth": "Indique la fecha de nacimiento.",
  "visa.req.nationality": "Elija la nacionalidad.",
  "visa.req.passportNumber": "Indique el número de pasaporte.",
  "visa.req.passportExpiry": "Indique la fecha de caducidad del pasaporte.",

  "visa.done.title": "Solicitud enviada",
  "visa.done.body":
    "Hemos recibido la solicitud de {name} para {country}. Le escribiremos por SMS en cuanto el expediente avance.",
  "visa.done.reference": "Su referencia",
  "visa.done.rush":
    "Su salida es próxima: el expediente está marcado como urgente para nuestro equipo.",
  "visa.done.view": "Seguir mi solicitud",
  "visa.done.another": "Mismo viaje, otro viajero",
  "visa.done.anotherHint":
    "El viaje se copia; solo queda rellenar el viajero y su pasaporte.",

  "visa.pay.title": "Pague la tarifa de servicio",
  "visa.pay.body":
    "{fee} en nuestra oficina o por mobile money, indicando la referencia {ref}.",
  "visa.pay.beforeLodging":
    "Presentamos el expediente en la embajada una vez recibido el pago.",
  "visa.pay.PAID": "Tarifa pagada",
  "visa.pay.UNPAID": "Tarifa pendiente",

  "visa.status.SUBMITTED": "Recibida",
  "visa.status.IN_REVIEW": "En revisión",
  "visa.status.INFO_REQUESTED": "Falta información",
  "visa.status.LODGED": "Presentada en la embajada",
  "visa.status.APPOINTMENT": "Cita fijada",
  "visa.status.APPROVED": "Visado concedido",
  "visa.status.REFUSED": "Visado denegado",
  "visa.status.COMPLETED": "Finalizada",
  "visa.status.CANCELLED": "Cancelada",

  "visa.step.received": "Solicitud recibida",
  "visa.step.review": "Revisión por nuestro equipo",
  "visa.step.infoNote": "A la espera de sus documentos",
  "visa.step.lodged": "Presentada en la embajada",
  "visa.step.appointmentNote": "Cita el {date}",
  "visa.step.decision": "Decisión de la embajada",
  "visa.step.approved": "Visado concedido",
  "visa.step.refused": "Visado denegado",
  "visa.step.completed": "Visado entregado",
  "visa.step.returned": "Pasaporte devuelto",
  "visa.step.now": "paso actual",

  "visa.ev.APPLICATION_SUBMITTED": "Solicitud enviada",
  "visa.ev.PAYMENT_RECEIVED": "Pago recibido",
  "visa.ev.DOCUMENTS_RECEIVED": "Documentos recibidos",
  "visa.ev.OFFICE_DOCUMENTS_ADDED": "Documento añadido por nuestro equipo",
  "visa.ev.DOCUMENTS_PURGED": "Sus archivos se han eliminado",

  "visa.kind.PASSPORT": "Pasaporte",
  "visa.kind.HOTEL": "Reserva de hotel",
  "visa.kind.INVITATION": "Carta de invitación",
  "visa.kind.PHOTO": "Foto de carné",
  "visa.kind.OTHER": "Otro documento",
  "visa.kind.VISA": "Visado expedido",

  "visa.cancelReason.CUSTOMER_REQUEST": "Cancelada a petición suya.",
  "visa.cancelReason.NOT_PAID": "Cancelada: la tarifa de servicio no se pagó.",
  "visa.cancelReason.INCOMPLETE": "Cancelada: el expediente quedó incompleto.",
  "visa.cancelReason.DUPLICATE": "Cancelada: duplicaba otra solicitud.",
  "visa.cancelReason.OTHER":
    "Cancelada por nuestro equipo. Llámenos para saber más.",

  "visa.list.empty": "Todavía no hay solicitudes de visado",
  "visa.list.emptyBody": "Sus solicitudes aparecerán aquí, con su avance.",
  "visa.list.actionNeeded": "Acción necesaria",

  "visa.detail.notFound": "No encontramos esta solicitud en su cuenta.",
  "visa.detail.progress": "En qué punto está su solicitud",
  "visa.detail.fees": "Tarifas",
  "visa.detail.trip": "Viaje",
  "visa.detail.rush": "Salida próxima: expediente marcado como urgente.",
  "visa.detail.minor": "menor",
  "visa.detail.noDocuments": "Todavía no hay documentos.",
  "visa.detail.fromOffice": "de nuestro equipo",
  "visa.detail.purged":
    "Sus archivos se eliminaron el {date}, como estaba previsto tras el cierre del expediente. El visado expedido sigue disponible.",

  "visa.next.review": "Nuestro equipo está revisando su expediente",
  "visa.next.reviewBody":
    "Le escribiremos si falta algo. Puede añadir un documento abajo en cualquier momento.",
  "visa.next.info": "Necesitamos algo más de usted",
  "visa.next.infoBody":
    "Envíe los documentos aquí: el expediente vuelve a revisión en cuanto lleguen.",
  "visa.next.lodged": "Presentada en la embajada",
  "visa.next.lodgedBody":
    "La decisión suele tardar {n} días. Le avisaremos en cuanto responda la embajada.",
  "visa.next.appointment": "Su cita en la embajada",
  "visa.next.appointmentBody":
    "Lleve su pasaporte y los originales de sus documentos.",
  "visa.next.approved": "Su visado está concedido",
  "visa.next.approvedCollect":
    "Le llamaremos en cuanto esté listo para recogerlo en nuestra oficina.",
  "visa.next.download": "Descargar el visado",
  "visa.next.visaNumber": "Número de visado",
  "visa.next.validity": "Válido del {from} al {to}",
  "visa.next.refused": "La embajada ha denegado el visado",
  "visa.next.refusedBody":
    "Su pasaporte le espera en nuestra oficina: traiga la referencia {ref}.",
  "visa.next.completed": "Finalizado: se le entregó el visado",
  "visa.next.closedRefused": "Cerrado: se le devolvió el pasaporte",
  "visa.next.cancelled": "Esta solicitud está cancelada",

  "visa.upload.add": "Añadir un documento",
  "visa.upload.hint": "Hasta 5 archivos a la vez; indique qué es cada uno.",
  "visa.upload.kind": "Tipo de documento para {name}",
  "visa.upload.send": "Enviar ({n})",
  "visa.upload.sent":
    "Enviado: {n} documento(s). Nuestro equipo ha sido avisado.",

  "visa.cancel.link": "Cancelar esta solicitud",
  "visa.cancel.title": "¿Cancelar la solicitud?",
  "visa.cancel.body":
    "No se presentará en la embajada. Si ya ha pagado, llámenos para saber cómo seguir.",
  "visa.cancel.note": "¿Por qué?",
  "visa.cancel.confirm": "Sí, cancelar",
  "visa.cancel.keep": "Mantener mi solicitud"
};

const zh: Dict = {
  "nav.evisa": "E-Visa",
  "account.visas": "我的签证申请",

  "visa.title": "您的签证申请，由我们的团队准备",
  "visa.description":
    "选择国家，在线填写表格并上传护照：我们为您准备材料、递交大使馆，并随时告知进展。",
  "visa.newApplication": "新申请",

  "visa.how.title": "办理流程",
  "visa.how.1.title": "选择国家",
  "visa.how.1.body":
    "以及签证类型：我们的服务费、通常办理时间和所需材料一目了然。",
  "visa.how.2.title": "填写表格，上传护照",
  "visa.how.2.body": "大约十分钟。护照资料页的一张清晰照片即可。",
  "visa.how.3.title": "支付服务费",
  "visa.how.3.body":
    "在我们的办公室现金支付或通过移动支付，并注明您的 EV 编号。",
  "visa.how.4.title": "我们递交并随时告知",
  "visa.how.4.body": "通过短信和您的账户，直到大使馆作出决定。",

  "visa.countries.title": "选择目的地",
  "visa.countries.subtitle":
    "所示金额为我们的服务费；大使馆费用在表格中显示，仅供参考。",
  "visa.countries.none": "暂无开放的目的地",
  "visa.countries.noneBody": "告诉我们您要去哪里，我们会告知能否为您准备材料。",
  "visa.countries.contact": "联系我们",
  "visa.countries.from": "起",
  "visa.countries.apply": "立即申请",
  "visa.days": "{n} 天",
  "visa.daysRange": "{min}–{max} 天",

  "visa.trust.feeTitle": "我们的服务费包含什么",
  "visa.trust.feeBody":
    "准备并递交您的材料。签证结果由大使馆决定，大使馆费用另行支付。",
  "visa.trust.privateTitle": "您的护照信息保密",
  "visa.trust.privateBody":
    "您的文件私密保存，仅您和我们的团队可见，并在申请结束后删除。",

  "visa.apply.title": "签证申请",
  "visa.apply.titleFor": "签证申请 — {country}",
  "visa.apply.description":
    "大约十分钟。请准备好护照；在提交前，您的回答会保存在此设备上。",
  "visa.apply.welcomeBack": "您已登录。您的回答都在这里：请核对后提交申请。",

  "visa.s.destination": "目的地国家",
  "visa.s.schedule": "旅行日期",
  "visa.s.purpose": "旅行目的",
  "visa.s.address": "停留期间地址",
  "visa.s.stay": "停留期",
  "visa.s.visaType": "签证类型",
  "visa.s.personType": "旅客类别",
  "visa.s.invitation": "邀请函",
  "visa.s.traveller": "旅客（与护照一致）",
  "visa.s.documents": "材料",
  "visa.s.summary": "摘要",
  "visa.s.terms": "条款",
  "visa.sectionDone": "已完成",

  "visa.i.schedule": "出发日期和返回日期。",
  "visa.i.stay": "您在当地（{country}）的日期：通常与旅行日期相同。",
  "visa.i.stayAny": "您在当地的日期：通常与旅行日期相同。",
  "visa.i.visaType": "每种签证的服务费、通常办理时间和所需材料。",
  "visa.i.personType": "部分旅客需要额外材料：选择后即会显示。",
  "visa.i.invitation": "目的地是否有个人或公司邀请您？",
  "visa.i.traveller": "请严格按照护照上的内容填写。",
  "visa.i.documents": "PDF 或照片，每个文件不超过 10 MB。",

  "visa.f.country": "国家",
  "visa.f.town": "目的地城市",
  "visa.f.choose": "请选择…",
  "visa.f.countryFirst": "请先选择国家",
  "visa.countryNotes": "关于{country}的须知",
  "visa.f.departure": "出发日期",
  "visa.f.return": "返回日期",
  "visa.f.bookingRef": "Flexi 预订编号",
  "visa.f.purpose": "旅行目的",
  "visa.f.address": "目的地地址",
  "visa.f.stayFrom": "停留开始",
  "visa.f.stayTo": "停留结束",
  "visa.f.passportNumber": "护照号码",
  "visa.f.passportExpiry": "护照有效期至",
  "visa.f.email": "接收进展的电子邮箱",

  "visa.h.town": "您前往的主要城市。",
  "visa.h.bookingRef": "如果您在我们这里预订了此次旅行，例如 FA-7K2QM-9XH4D。",
  "visa.h.purpose": "用一两句话说明：探亲、商务会议、学习……",
  "visa.h.address": "酒店名称和地址，或接待您的人的地址。",
  "visa.h.names": "所有名字，与护照一致。",
  "visa.h.passportNumber": "字母和数字，不含空格——例如 OP1234567。",
  "visa.h.passportExpiry":
    "护照有效期须至少到 {date}（停留结束后 {months} 个月）。",
  "visa.h.passportExpiryAny": "印在护照资料页上。",

  "visa.sameAsTravel": "使用旅行日期（{from} → {to}）",
  "visa.rush":
    "此签证通常需要 {n} 天：最好在 {date} 或之后出发。您仍可提交：我们会将材料标记为加急，但办理进度由大使馆决定。",

  "visa.offer.ourFee": "我们的服务费",
  "visa.offer.embassyFee": "大使馆费用（参考）",
  "visa.offer.processing": "办理时间",
  "visa.offer.validity": "有效期",
  "visa.offer.SINGLE": "单次入境",
  "visa.offer.MULTIPLE": "多次入境",
  "visa.offer.documents": "所需材料",
  "visa.embassyNote": "支付给大使馆，而非我们：金额仅供参考，可能变动。",

  "visa.person.minorTitle": "出发当天未满 18 岁的旅客",
  "visa.person.extraTitle": "此类旅客的额外材料",
  "visa.yes": "是",
  "visa.no": "否",
  "visa.privacy": "您的护照号码从不完整显示：只有我们的团队和大使馆可以看到。",

  "visa.file.passport": "护照——资料页",
  "visa.file.hotel": "酒店预订",
  "visa.file.photo": "证件照",
  "visa.file.invitation": "邀请函",
  "visa.fh.passport": "整页，四个角都清晰可见，无反光。",
  "visa.fh.hotel": "您的预订确认（如有）。",
  "visa.fh.photo": "近期浅色背景照片，如大使馆要求。",
  "visa.fh.invitation": "您也可以带到我们的办公室。",
  "visa.file.drop": "将文件拖到此处，或",
  "visa.file.browse": "浏览",
  "visa.file.types": "PDF、JPEG、PNG 或 WEBP · 最大 10 MB",
  "visa.file.ready": "可以提交 · {size}",
  "visa.file.replace": "替换",
  "visa.file.remove": "移除",
  "visa.file.removeNamed": "移除 {name}",
  "visa.file.lost": "请重新上传：{files}。页面刷新后文件无法保留。",

  "visa.payLater":
    "现在无需付款：提交后在我们的办公室或通过移动支付缴纳服务费，并注明您的编号。",
  "visa.terms":
    "我们的服务费用于准备和递交您的申请；签证结果由大使馆决定，申请递交后服务费不予退还。",
  "visa.submit": "提交我的申请",
  "visa.left": "提交前还需完成：",
  "visa.signInNote": "提交时，您将使用手机号码登录；您的回答会保留在这里。",

  "visa.err.required": "此项为必填。",
  "visa.err.passportFile": "请上传护照资料页：没有它我们无法准备材料。",
  "visa.err.departurePast": "出发日期不能是过去的日期：请选择 {date} 或之后。",
  "visa.err.returnBeforeDeparture":
    "返回日期不能早于出发日期：请选择 {date} 或之后。",
  "visa.err.stayBeforeDeparture": "停留不能早于出发：请选择 {date} 或之后。",
  "visa.err.stayAfterReturn": "停留期必须在旅行期间内：最迟为返回日 {date}。",
  "visa.err.stayToBeforeFrom": "停留结束不能早于开始：请选择 {date} 或之后。",
  "visa.err.passportTooSoon":
    "您的护照有效期须至少到 {date}——停留结束后 {months} 个月。请先更换护照再申请。",
  "visa.err.notMinor": "该旅客在出发日 {date} 将年满 18 岁：请选择成人类别。",
  "visa.err.passportNumber": "护照号码为 5 至 20 位字母和数字，不含空格。",
  "visa.err.tooLong": "最多 {n} 个字符：请适当缩短。",
  "visa.err.email": "该电子邮箱似乎不完整，例如 name@example.com。",
  "visa.err.bookingNotFound": "该编号与您的任何预订都不匹配：请核对，或留空。",
  "visa.err.choiceUnavailable":
    "该选项已不再提供（国家、城市、签证或旅客类别）。列表已更新：请重新选择。",
  "visa.err.fileType":
    "“{name}”不是 PDF、JPEG、PNG 或 WEBP 文件。请另存为 PDF 或拍一张 JPEG 照片后重试。",
  "visa.err.fileSize":
    "“{name}”大小为 {size}：上限为 10 MB。请降低扫描分辨率或改为拍照。",
  "visa.err.send": "申请未能提交。请检查网络后重试——不会重复登记。",

  "visa.code.fileType":
    "其中一个文件不是 PDF、JPEG、PNG 或 WEBP。请替换后重新提交。",
  "visa.code.fileSize": "其中一个文件超过 10 MB。请换成较小的扫描件或照片。",
  "visa.code.invitationNotExpected":
    "您上传了邀请函，但选择了“否”。请改为“是”，或移除该文件。",
  "visa.code.departurePast": "出发日期已过：请选择今天或之后的日期。",
  "visa.code.returnBeforeDeparture":
    "返回日期早于出发日期：请选择出发当天或之后返回。",
  "visa.code.stayOutsideTrip":
    "停留期须在出发当天或之后开始，最迟在返回当天结束。",
  "visa.code.invalidDate":
    "其中一个日期不存在。请核对旅行、停留、出生和护照有效期日期。",
  "visa.code.notMinor": "该旅客在出发当天已满 18 岁：请选择成人类别。",
  "visa.code.terms": "请勾选以接受服务费条款。",
  "visa.code.locked":
    "此申请已无法再接收文件：已递交大使馆。如有变化，请致电我们。",
  "visa.code.notCancellable":
    "此申请已无法在此取消：已经递交。请致电我们的办公室。",
  "visa.code.tooMany": "此申请的文件数量已达上限。请致电我们的办公室。",
  "visa.person.minorHint":
    "出发当天未满 18 岁：此申请将按未成年人办理。请选择未成年人类别（第 7 步）以查看所需材料。",

  "visa.req.countryId": "请选择您要前往的国家。",
  "visa.req.townId": "请选择目的地城市。",
  "visa.req.departureDate": "请填写出发日期。",
  "visa.req.returnDate": "请填写返回日期。",
  "visa.req.purpose": "请用一句话说明旅行目的。",
  "visa.req.stayAddress": "请填写您的住宿地址。",
  "visa.req.stayFrom": "请填写停留开始日期。",
  "visa.req.stayTo": "请填写停留结束日期。",
  "visa.req.offerId": "请选择签证类型。",
  "visa.req.personTypeId": "请选择旅客类别。",
  "visa.req.firstName": "请填写名字，与护照一致。",
  "visa.req.lastName": "请填写姓氏，与护照一致。",
  "visa.req.dateOfBirth": "请填写出生日期。",
  "visa.req.nationality": "请选择国籍。",
  "visa.req.passportNumber": "请填写护照号码。",
  "visa.req.passportExpiry": "请填写护照有效期。",

  "visa.done.title": "申请已提交",
  "visa.done.body":
    "我们已收到 {name} 前往{country}的申请。一有进展我们会发短信通知您。",
  "visa.done.reference": "您的编号",
  "visa.done.rush": "您即将出发：材料已向我们的团队标记为加急。",
  "visa.done.view": "跟踪我的申请",
  "visa.done.another": "同一行程，另一位旅客",
  "visa.done.anotherHint": "行程信息已复制；只需填写旅客及其护照信息。",

  "visa.pay.title": "支付服务费",
  "visa.pay.body":
    "{fee}，在我们的办公室或通过移动支付缴纳，并注明编号 {ref}。",
  "visa.pay.beforeLodging": "收到付款后，我们会将材料递交大使馆。",
  "visa.pay.PAID": "已付费",
  "visa.pay.UNPAID": "待付费",

  "visa.status.SUBMITTED": "已收到",
  "visa.status.IN_REVIEW": "审核中",
  "visa.status.INFO_REQUESTED": "需补充材料",
  "visa.status.LODGED": "已递交大使馆",
  "visa.status.APPOINTMENT": "已预约",
  "visa.status.APPROVED": "签证已批准",
  "visa.status.REFUSED": "签证被拒",
  "visa.status.COMPLETED": "已完成",
  "visa.status.CANCELLED": "已取消",

  "visa.step.received": "申请已收到",
  "visa.step.review": "我们的团队审核",
  "visa.step.infoNote": "等待您的材料",
  "visa.step.lodged": "已递交大使馆",
  "visa.step.appointmentNote": "预约时间：{date}",
  "visa.step.decision": "大使馆的决定",
  "visa.step.approved": "签证已批准",
  "visa.step.refused": "签证被拒",
  "visa.step.completed": "签证已交付",
  "visa.step.returned": "护照已归还",
  "visa.step.now": "当前步骤",

  "visa.ev.APPLICATION_SUBMITTED": "申请已提交",
  "visa.ev.PAYMENT_RECEIVED": "已收到付款",
  "visa.ev.DOCUMENTS_RECEIVED": "已收到材料",
  "visa.ev.OFFICE_DOCUMENTS_ADDED": "我们的团队添加了文件",
  "visa.ev.DOCUMENTS_PURGED": "您的文件已删除",

  "visa.kind.PASSPORT": "护照",
  "visa.kind.HOTEL": "酒店预订",
  "visa.kind.INVITATION": "邀请函",
  "visa.kind.PHOTO": "证件照",
  "visa.kind.OTHER": "其他文件",
  "visa.kind.VISA": "已签发的签证",

  "visa.cancelReason.CUSTOMER_REQUEST": "应您的要求已取消。",
  "visa.cancelReason.NOT_PAID": "已取消：未支付服务费。",
  "visa.cancelReason.INCOMPLETE": "已取消：材料一直不完整。",
  "visa.cancelReason.DUPLICATE": "已取消：与另一份申请重复。",
  "visa.cancelReason.OTHER": "已由我们的团队取消。请致电了解详情。",

  "visa.list.empty": "暂无签证申请",
  "visa.list.emptyBody": "您的申请及其进展将显示在这里。",
  "visa.list.actionNeeded": "需要您处理",

  "visa.detail.notFound": "在您的账户中找不到此申请。",
  "visa.detail.progress": "申请进度",
  "visa.detail.fees": "费用",
  "visa.detail.trip": "行程",
  "visa.detail.rush": "即将出发：材料已标记为加急。",
  "visa.detail.minor": "未成年",
  "visa.detail.noDocuments": "暂无文件。",
  "visa.detail.fromOffice": "来自我们的团队",
  "visa.detail.purged":
    "按计划，您的文件已于 {date} 在申请结束后删除。已签发的签证仍可下载。",

  "visa.next.review": "我们的团队正在审核您的材料",
  "visa.next.reviewBody":
    "如有缺漏我们会发短信告知。您可以随时在下方添加文件。",
  "visa.next.info": "我们需要您补充材料",
  "visa.next.infoBody": "请在此提交材料：收到后您的申请将重新进入审核。",
  "visa.next.lodged": "已递交大使馆",
  "visa.next.lodgedBody":
    "通常需要 {n} 天作出决定。大使馆一有答复我们就通知您。",
  "visa.next.appointment": "您在大使馆的预约",
  "visa.next.appointmentBody": "请携带护照和所有材料的原件。",
  "visa.next.approved": "您的签证已获批准",
  "visa.next.approvedCollect":
    "签证可在我们办公室领取时，我们会第一时间致电您。",
  "visa.next.download": "下载签证",
  "visa.next.visaNumber": "签证号码",
  "visa.next.validity": "有效期：{from} 至 {to}",
  "visa.next.refused": "大使馆拒绝了签证",
  "visa.next.refusedBody": "您的护照在我们的办公室等您领取：请携带编号 {ref}。",
  "visa.next.completed": "已完成：签证已交给您",
  "visa.next.closedRefused": "已结束：护照已归还给您",
  "visa.next.cancelled": "此申请已取消",

  "visa.upload.add": "添加文件",
  "visa.upload.hint": "每次最多 5 个文件；请注明每个文件的类型。",
  "visa.upload.kind": "{name} 的文件类型",
  "visa.upload.send": "提交（{n}）",
  "visa.upload.sent": "已提交 {n} 个文件。我们的团队已收到通知。",

  "visa.cancel.link": "取消此申请",
  "visa.cancel.title": "取消此申请？",
  "visa.cancel.body":
    "申请将不会递交大使馆。如您已付款，请致电我们了解后续事宜。",
  "visa.cancel.note": "原因？",
  "visa.cancel.confirm": "是的，取消",
  "visa.cancel.keep": "保留我的申请"
};

const ar: Dict = {
  "nav.evisa": "E-Visa",
  "account.visas": "طلبات التأشيرة الخاصة بي",

  "visa.title": "طلب تأشيرتك، يُعدّه فريقنا",
  "visa.description":
    "اختر البلد، واملأ الاستمارة عبر الإنترنت وأرفق جواز سفرك: نُعدّ الملف ونقدّمه إلى السفارة ونبقيك على اطّلاع.",
  "visa.newApplication": "طلب جديد",

  "visa.how.title": "كيف تسير الأمور",
  "visa.how.1.title": "اختر البلد",
  "visa.how.1.body":
    "ونوع التأشيرة: رسومنا والمدة المعتادة والمستندات المطلوبة معروضة من البداية.",
  "visa.how.2.title": "املأ الاستمارة وأرفق جواز سفرك",
  "visa.how.2.body": "نحو عشر دقائق. تكفي صورة واضحة لصفحة البيانات في الجواز.",
  "visa.how.3.title": "ادفع رسوم الخدمة",
  "visa.how.3.body":
    "نقدًا في مكتبنا أو عبر الدفع بالهاتف المحمول، مع ذكر مرجعك EV.",
  "visa.how.4.title": "نقدّم الطلب ونبقيك على اطّلاع",
  "visa.how.4.body": "عبر الرسائل القصيرة وفي حسابك، حتى قرار السفارة.",

  "visa.countries.title": "اختر وجهتك",
  "visa.countries.subtitle":
    "المبالغ المعروضة هي رسوم خدمتنا؛ وتظهر رسوم السفارة في الاستمارة للعلم فقط.",
  "visa.countries.none": "لا توجد وجهات متاحة بعد",
  "visa.countries.noneBody":
    "أخبرنا إلى أين تسافر وسنخبرك إن كنا نستطيع إعداد ملفك.",
  "visa.countries.contact": "اتصل بنا",
  "visa.countries.from": "ابتداءً من",
  "visa.countries.apply": "قدّم طلبًا",
  "visa.days": "{n} يومًا",
  "visa.daysRange": "من {min} إلى {max} يومًا",

  "visa.trust.feeTitle": "ما تغطيه رسومنا",
  "visa.trust.feeBody":
    "إعداد ملفك وتقديمه. القرار يعود إلى السفارة، ورسومها تُدفع على حدة.",
  "visa.trust.privateTitle": "جواز سفرك يبقى خاصًا",
  "visa.trust.privateBody":
    "تُحفظ ملفاتك بشكل خاص، ولا يراها سواك وفريقنا، وتُحذف بعد إغلاق الملف.",

  "visa.apply.title": "طلب تأشيرة",
  "visa.apply.titleFor": "طلب تأشيرة — {country}",
  "visa.apply.description":
    "نحو عشر دقائق. أبقِ جواز سفرك في متناولك؛ تبقى إجاباتك على هذا الجهاز حتى الإرسال.",
  "visa.apply.welcomeBack":
    "لقد سجّلت الدخول. إجاباتك كلها هنا: راجعها ثم أرسل طلبك.",

  "visa.s.destination": "بلد الوجهة",
  "visa.s.schedule": "مواعيد السفر",
  "visa.s.purpose": "سبب السفر",
  "visa.s.address": "العنوان أثناء الإقامة",
  "visa.s.stay": "مدة الإقامة",
  "visa.s.visaType": "نوع التأشيرة",
  "visa.s.personType": "فئة المسافر",
  "visa.s.invitation": "خطاب الدعوة",
  "visa.s.traveller": "المسافر (كما في الجواز)",
  "visa.s.documents": "المستندات",
  "visa.s.summary": "الملخص",
  "visa.s.terms": "الشروط",
  "visa.sectionDone": "مكتمل",

  "visa.i.schedule": "يوم المغادرة ويوم العودة.",
  "visa.i.stay": "تواريخك في الوجهة ({country}): غالبًا هي نفسها تواريخ السفر.",
  "visa.i.stayAny": "تواريخك في الوجهة: غالبًا هي نفسها تواريخ السفر.",
  "visa.i.visaType": "رسومنا والمدة المعتادة والمستندات المطلوبة لكل تأشيرة.",
  "visa.i.personType": "بعض الفئات تتطلب مستندات إضافية: تظهر فور اختيارك.",
  "visa.i.invitation": "هل يدعوك شخص أو شركة في الوجهة؟",
  "visa.i.traveller": "انسخ بدقة ما هو مطبوع في جواز السفر.",
  "visa.i.documents": "ملف PDF أو صورة، بحد أقصى 10 ميغابايت لكل ملف.",

  "visa.f.country": "البلد",
  "visa.f.town": "مدينة الوجهة",
  "visa.f.choose": "اختر…",
  "visa.f.countryFirst": "اختر البلد أولًا",
  "visa.countryNotes": "معلومات مفيدة عن {country}",
  "visa.f.departure": "تاريخ المغادرة",
  "visa.f.return": "تاريخ العودة",
  "visa.f.bookingRef": "مرجع حجز Flexi",
  "visa.f.purpose": "سبب السفر",
  "visa.f.address": "العنوان في الوجهة",
  "visa.f.stayFrom": "بداية الإقامة",
  "visa.f.stayTo": "نهاية الإقامة",
  "visa.f.passportNumber": "رقم جواز السفر",
  "visa.f.passportExpiry": "تاريخ انتهاء الجواز",
  "visa.f.email": "البريد الإلكتروني للمتابعة",

  "visa.h.town": "المدينة الرئيسية التي تتوجه إليها.",
  "visa.h.bookingRef": "إذا حجزت هذه الرحلة معنا، مثل FA-7K2QM-9XH4D.",
  "visa.h.purpose": "في جملة أو جملتين: زيارة عائلية، اجتماع عمل، دراسة…",
  "visa.h.address": "اسم الفندق وعنوانه، أو عنوان الشخص الذي يستضيفك.",
  "visa.h.names": "جميع الأسماء الأولى، كما في الجواز.",
  "visa.h.passportNumber": "حروف وأرقام بلا مسافات — مثل OP1234567.",
  "visa.h.passportExpiry":
    "يجب أن يكون صالحًا حتى {date} على الأقل ({months} أشهر بعد إقامتك).",
  "visa.h.passportExpiryAny": "مطبوع في صفحة البيانات في الجواز.",

  "visa.sameAsTravel": "استخدام تواريخ السفر ({from} ← {to})",
  "visa.rush":
    "تستغرق هذه التأشيرة عادةً {n} يومًا: الأفضل أن تغادر ابتداءً من {date}. يمكنك الإرسال مع ذلك: سنضع على ملفك علامة عاجل، لكن السفارة هي التي تحدد الوتيرة.",

  "visa.offer.ourFee": "رسوم خدمتنا",
  "visa.offer.embassyFee": "رسوم السفارة (تقديرية)",
  "visa.offer.processing": "المدة",
  "visa.offer.validity": "الصلاحية",
  "visa.offer.SINGLE": "دخول واحد",
  "visa.offer.MULTIPLE": "دخول متعدد",
  "visa.offer.documents": "المستندات المطلوبة",
  "visa.embassyNote": "تُدفع للسفارة لا لنا: المبلغ تقديري وقد يتغير.",

  "visa.person.minorTitle": "مسافر دون 18 عامًا يوم المغادرة",
  "visa.person.extraTitle": "مستندات إضافية لهذه الفئة",
  "visa.yes": "نعم",
  "visa.no": "لا",
  "visa.privacy":
    "لا يُعرض رقم جواز سفرك كاملًا أبدًا: لا يراه إلا فريقنا والسفارة.",

  "visa.file.passport": "جواز السفر — صفحة البيانات",
  "visa.file.hotel": "حجز الفندق",
  "visa.file.photo": "صورة شخصية",
  "visa.file.invitation": "خطاب الدعوة",
  "visa.fh.passport": "الصفحة كاملة، والزوايا الأربع ظاهرة، دون انعكاس.",
  "visa.fh.hotel": "تأكيد الحجز، إن وُجد.",
  "visa.fh.photo": "حديثة، على خلفية فاتحة، إن طلبتها السفارة.",
  "visa.fh.invitation": "يمكنك أيضًا إحضاره إلى مكتبنا.",
  "visa.file.drop": "أفلت الملف هنا أو",
  "visa.file.browse": "تصفّح",
  "visa.file.types": "PDF أو JPEG أو PNG أو WEBP · بحد أقصى 10 ميغابايت",
  "visa.file.ready": "جاهز للإرسال · {size}",
  "visa.file.replace": "استبدال",
  "visa.file.remove": "إزالة",
  "visa.file.removeNamed": "إزالة {name}",
  "visa.file.lost":
    "يرجى إرفاق ما يلي مجددًا: {files}. لا تُحفظ الملفات عند إعادة تحميل الصفحة.",

  "visa.payLater":
    "لا شيء للدفع الآن: تدفع رسومنا في مكتبنا أو عبر الدفع بالهاتف المحمول بعد الإرسال، مع ذكر مرجعك.",
  "visa.terms":
    "تغطي رسوم الخدمة لدينا إعداد طلبك وتقديمه؛ ويعود القرار إلى السفارة، ولا تُستردّ الرسوم بعد تقديم الطلب.",
  "visa.submit": "إرسال طلبي",
  "visa.left": "ما زال قبل الإرسال:",
  "visa.signInNote": "عند الإرسال ستسجّل الدخول برقم هاتفك؛ تبقى إجاباتك هنا.",

  "visa.err.required": "هذا الحقل مطلوب.",
  "visa.err.passportFile":
    "أرفق صفحة البيانات في جواز سفرك: لا يمكننا إعداد الملف من دونها.",
  "visa.err.departurePast":
    "لا يمكن أن تكون المغادرة في الماضي: اختر {date} أو بعده.",
  "visa.err.returnBeforeDeparture":
    "لا يمكن أن تسبق العودة المغادرة: اختر {date} أو بعده.",
  "visa.err.stayBeforeDeparture":
    "لا يمكن أن تبدأ الإقامة قبل مغادرتك: اختر {date} أو بعده.",
  "visa.err.stayAfterReturn":
    "يجب أن تقع الإقامة ضمن رحلتك: في موعد أقصاه {date}، يوم العودة.",
  "visa.err.stayToBeforeFrom":
    "لا يمكن أن تنتهي الإقامة قبل أن تبدأ: اختر {date} أو بعده.",
  "visa.err.passportTooSoon":
    "يجب أن يكون جواز سفرك صالحًا حتى {date} على الأقل — {months} أشهر بعد إقامتك. جدّده قبل تقديم الطلب.",
  "visa.err.notMinor":
    "سيبلغ هذا المسافر 18 عامًا أو أكثر في {date}، يوم المغادرة: اختر فئة البالغين.",
  "visa.err.passportNumber":
    "يتكوّن رقم الجواز من 5 إلى 20 حرفًا ورقمًا، بلا مسافات.",
  "visa.err.tooLong": "{n} حرفًا كحد أقصى: يرجى الاختصار قليلًا.",
  "visa.err.email": "يبدو هذا البريد الإلكتروني ناقصًا، مثل name@example.com.",
  "visa.err.bookingNotFound":
    "هذا المرجع لا يطابق أيًّا من حجوزاتك: تحقّق منه أو اترك الحقل فارغًا.",
  "visa.err.choiceUnavailable":
    "هذا الخيار لم يعد متاحًا (البلد أو المدينة أو التأشيرة أو الفئة). حُدّثت القائمة للتو: اختر مجددًا.",
  "visa.err.fileType":
    "«{name}» ليس ملف PDF أو JPEG أو PNG أو WEBP. احفظه بصيغة PDF أو التقط صورة JPEG ثم أعد المحاولة.",
  "visa.err.fileSize":
    "حجم «{name}» هو {size}: الحد الأقصى 10 ميغابايت. امسحه بدقة أقل أو التقط صورة بدلًا منه.",
  "visa.err.send":
    "تعذّر إرسال طلبك. تحقّق من اتصالك وأعد المحاولة — لن يُسجَّل أي شيء مرتين.",

  "visa.code.fileType":
    "أحد الملفات ليس PDF أو JPEG أو PNG أو WEBP. استبدله ثم أعد الإرسال.",
  "visa.code.fileSize":
    "أحد الملفات يتجاوز 10 ميغابايت. استبدله بمسح أخف أو بصورة.",
  "visa.code.invitationNotExpected":
    "أرفقت خطاب دعوة لكنك أجبت «لا». أجب «نعم» أو أزل الملف.",
  "visa.code.departurePast":
    "تاريخ المغادرة قد مضى: اختر اليوم أو يومًا لاحقًا.",
  "visa.code.returnBeforeDeparture":
    "العودة قبل المغادرة: اختر عودة في يوم المغادرة أو بعده.",
  "visa.code.stayOutsideTrip":
    "يجب أن تبدأ الإقامة في يوم المغادرة أو بعده، وأن تنتهي في موعد أقصاه يوم العودة.",
  "visa.code.invalidDate":
    "أحد التواريخ غير موجود. تحقّق من تواريخ السفر والإقامة والميلاد وانتهاء الجواز.",
  "visa.code.notMinor":
    "عمر هذا المسافر 18 عامًا أو أكثر يوم المغادرة: اختر فئة البالغين.",
  "visa.code.terms": "ضع علامة في المربع لقبول شروط رسوم الخدمة.",
  "visa.code.locked":
    "لم يعد هذا الطلب يقبل مستندات: لقد أُرسل إلى السفارة. اتصل بنا إن تغيّر شيء.",
  "visa.code.notCancellable":
    "لم يعد بالإمكان إلغاء هذا الطلب من هنا: لقد قُدّم بالفعل. اتصل بمكتبنا.",
  "visa.code.tooMany": "بلغ هذا الطلب الحد الأقصى من الملفات. اتصل بمكتبنا.",
  "visa.person.minorHint":
    "دون 18 عامًا يوم المغادرة: سيُعامَل الملف كملف قاصر. اختر فئة القاصرين (الخطوة 7) لرؤية المستندات المطلوبة.",

  "visa.req.countryId": "اختر البلد الذي تسافر إليه.",
  "visa.req.townId": "اختر مدينة الوجهة.",
  "visa.req.departureDate": "أدخل تاريخ المغادرة.",
  "visa.req.returnDate": "أدخل تاريخ العودة.",
  "visa.req.purpose": "اذكر في جملة سبب سفرك.",
  "visa.req.stayAddress": "اذكر أين ستقيم.",
  "visa.req.stayFrom": "أدخل تاريخ بداية الإقامة.",
  "visa.req.stayTo": "أدخل تاريخ نهاية الإقامة.",
  "visa.req.offerId": "اختر نوع التأشيرة.",
  "visa.req.personTypeId": "اختر فئة المسافر.",
  "visa.req.firstName": "أدخل الاسم الأول كما في الجواز.",
  "visa.req.lastName": "أدخل اسم العائلة كما في الجواز.",
  "visa.req.dateOfBirth": "أدخل تاريخ الميلاد.",
  "visa.req.nationality": "اختر الجنسية.",
  "visa.req.passportNumber": "أدخل رقم جواز السفر.",
  "visa.req.passportExpiry": "أدخل تاريخ انتهاء جواز السفر.",

  "visa.done.title": "تم إرسال الطلب",
  "visa.done.body":
    "تسلّمنا طلب {name} إلى {country}. سنراسلك برسالة قصيرة فور تقدّم الملف.",
  "visa.done.reference": "مرجعك",
  "visa.done.rush": "موعد مغادرتك قريب: وُضعت على الملف علامة عاجل لدى فريقنا.",
  "visa.done.view": "متابعة طلبي",
  "visa.done.another": "الرحلة نفسها، مسافر آخر",
  "visa.done.anotherHint":
    "نُسخت بيانات الرحلة؛ لم يبقَ سوى المسافر وجواز سفره.",

  "visa.pay.title": "ادفع رسوم الخدمة",
  "visa.pay.body":
    "{fee} في مكتبنا أو عبر الدفع بالهاتف المحمول، مع ذكر المرجع {ref}.",
  "visa.pay.beforeLodging": "نقدّم الملف إلى السفارة بعد استلام الدفع.",
  "visa.pay.PAID": "الرسوم مدفوعة",
  "visa.pay.UNPAID": "رسوم مستحقة",

  "visa.status.SUBMITTED": "مستلَم",
  "visa.status.IN_REVIEW": "قيد المراجعة",
  "visa.status.INFO_REQUESTED": "مطلوب استكمال",
  "visa.status.LODGED": "مقدَّم إلى السفارة",
  "visa.status.APPOINTMENT": "موعد محدد",
  "visa.status.APPROVED": "تمت الموافقة على التأشيرة",
  "visa.status.REFUSED": "رُفضت التأشيرة",
  "visa.status.COMPLETED": "مكتمل",
  "visa.status.CANCELLED": "ملغى",

  "visa.step.received": "استلام الطلب",
  "visa.step.review": "مراجعة فريقنا",
  "visa.step.infoNote": "بانتظار مستنداتك",
  "visa.step.lodged": "التقديم إلى السفارة",
  "visa.step.appointmentNote": "الموعد في {date}",
  "visa.step.decision": "قرار السفارة",
  "visa.step.approved": "تمت الموافقة على التأشيرة",
  "visa.step.refused": "رُفضت التأشيرة",
  "visa.step.completed": "تسليم التأشيرة",
  "visa.step.returned": "إعادة الجواز",
  "visa.step.now": "الخطوة الحالية",

  "visa.ev.APPLICATION_SUBMITTED": "أُرسل الطلب",
  "visa.ev.PAYMENT_RECEIVED": "استُلم الدفع",
  "visa.ev.DOCUMENTS_RECEIVED": "استُلمت المستندات",
  "visa.ev.OFFICE_DOCUMENTS_ADDED": "أضاف فريقنا مستندًا",
  "visa.ev.DOCUMENTS_PURGED": "حُذفت ملفاتك",

  "visa.kind.PASSPORT": "جواز السفر",
  "visa.kind.HOTEL": "حجز الفندق",
  "visa.kind.INVITATION": "خطاب الدعوة",
  "visa.kind.PHOTO": "صورة شخصية",
  "visa.kind.OTHER": "مستند آخر",
  "visa.kind.VISA": "التأشيرة الصادرة",

  "visa.cancelReason.CUSTOMER_REQUEST": "أُلغي بناءً على طلبك.",
  "visa.cancelReason.NOT_PAID": "أُلغي: لم تُدفع رسوم الخدمة.",
  "visa.cancelReason.INCOMPLETE": "أُلغي: بقي الملف ناقصًا.",
  "visa.cancelReason.DUPLICATE": "أُلغي: كان مكررًا لطلب آخر.",
  "visa.cancelReason.OTHER": "ألغاه فريقنا. اتصل بنا لمعرفة المزيد.",

  "visa.list.empty": "لا توجد طلبات تأشيرة بعد",
  "visa.list.emptyBody": "ستظهر طلباتك هنا مع مراحل تقدّمها.",
  "visa.list.actionNeeded": "مطلوب إجراء",

  "visa.detail.notFound": "لا نجد هذا الطلب في حسابك.",
  "visa.detail.progress": "أين وصل طلبك",
  "visa.detail.fees": "الرسوم",
  "visa.detail.trip": "الرحلة",
  "visa.detail.rush": "المغادرة قريبة: وُضعت على الملف علامة عاجل.",
  "visa.detail.minor": "قاصر",
  "visa.detail.noDocuments": "لا توجد مستندات بعد.",
  "visa.detail.fromOffice": "من فريقنا",
  "visa.detail.purged":
    "حُذفت ملفاتك في {date} كما هو مقرر بعد إغلاق الملف. تبقى التأشيرة الصادرة متاحة.",

  "visa.next.review": "يراجع فريقنا ملفك",
  "visa.next.reviewBody":
    "سنراسلك إن نقص شيء. يمكنك إضافة مستند أدناه في أي وقت.",
  "visa.next.info": "نحتاج منك إلى شيء إضافي",
  "visa.next.infoBody":
    "أرسل المستندات هنا: يعود ملفك إلى المراجعة فور وصولها.",
  "visa.next.lodged": "مقدَّم إلى السفارة",
  "visa.next.lodgedBody":
    "يستغرق القرار عادةً {n} يومًا. سنخبرك فور رد السفارة.",
  "visa.next.appointment": "موعدك في السفارة",
  "visa.next.appointmentBody": "أحضر جواز سفرك وأصول مستنداتك.",
  "visa.next.approved": "تمت الموافقة على تأشيرتك",
  "visa.next.approvedCollect": "سنتصل بك فور جهوزها للاستلام من مكتبنا.",
  "visa.next.download": "تنزيل التأشيرة",
  "visa.next.visaNumber": "رقم التأشيرة",
  "visa.next.validity": "صالحة من {from} إلى {to}",
  "visa.next.refused": "رفضت السفارة التأشيرة",
  "visa.next.refusedBody": "جواز سفرك بانتظارك في مكتبنا: أحضر المرجع {ref}.",
  "visa.next.completed": "اكتمل: سُلّمت إليك التأشيرة",
  "visa.next.closedRefused": "أُغلق: أُعيد إليك جواز السفر",
  "visa.next.cancelled": "هذا الطلب ملغى",

  "visa.upload.add": "إضافة مستند",
  "visa.upload.hint": "حتى 5 ملفات في المرة الواحدة؛ حدّد نوع كل ملف.",
  "visa.upload.kind": "نوع المستند لـ {name}",
  "visa.upload.send": "إرسال ({n})",
  "visa.upload.sent": "أُرسل: {n} مستند(ات). أُبلغ فريقنا.",

  "visa.cancel.link": "إلغاء هذا الطلب",
  "visa.cancel.title": "إلغاء الطلب؟",
  "visa.cancel.body":
    "لن يُقدَّم إلى السفارة. إن كنت قد دفعت، اتصل بنا لمعرفة الخطوات التالية.",
  "visa.cancel.note": "لماذا؟",
  "visa.cancel.confirm": "نعم، ألغِ الطلب",
  "visa.cancel.keep": "الإبقاء على طلبي"
};

const ru: Dict = {
  "nav.evisa": "E-Visa",
  "account.visas": "Мои заявления на визу",

  "visa.title": "Ваше заявление на визу — подготовит наша команда",
  "visa.description":
    "Выберите страну, заполните форму онлайн и приложите паспорт: мы подготовим документы, подадим их в посольство и будем держать вас в курсе.",
  "visa.newApplication": "Новое заявление",

  "visa.how.title": "Как это работает",
  "visa.how.1.title": "Выберите страну",
  "visa.how.1.body":
    "И тип визы: наш сбор, обычный срок и нужные документы видны сразу.",
  "visa.how.2.title": "Заполните форму и приложите паспорт",
  "visa.how.2.body":
    "Около десяти минут. Достаточно чёткого фото страницы с данными.",
  "visa.how.3.title": "Оплатите сервисный сбор",
  "visa.how.3.body":
    "Наличными в нашем офисе или через мобильные деньги, указав ваш номер EV.",
  "visa.how.4.title": "Мы подаём заявление и держим вас в курсе",
  "visa.how.4.body": "По SMS и в вашем аккаунте — до решения посольства.",

  "visa.countries.title": "Выберите направление",
  "visa.countries.subtitle":
    "Указаны наши сервисные сборы; консульский сбор посольства показан в форме для информации.",
  "visa.countries.none": "Пока нет открытых направлений",
  "visa.countries.noneBody":
    "Скажите, куда вы едете, и мы ответим, сможем ли подготовить ваши документы.",
  "visa.countries.contact": "Связаться с нами",
  "visa.countries.from": "от",
  "visa.countries.apply": "Подать заявление",
  "visa.days": "{n} дн.",
  "visa.daysRange": "{min}–{max} дн.",

  "visa.trust.feeTitle": "Что входит в наш сбор",
  "visa.trust.feeBody":
    "Подготовка и подача ваших документов. Решение принимает посольство, его сбор оплачивается отдельно.",
  "visa.trust.privateTitle": "Ваш паспорт под защитой",
  "visa.trust.privateBody":
    "Файлы хранятся в закрытом виде, их видите только вы и наша команда, и они удаляются после закрытия заявления.",

  "visa.apply.title": "Заявление на визу",
  "visa.apply.titleFor": "Заявление на визу — {country}",
  "visa.apply.description":
    "Около десяти минут. Держите паспорт под рукой; ответы сохраняются на этом устройстве до отправки.",
  "visa.apply.welcomeBack":
    "Вы вошли в аккаунт. Все ваши ответы на месте: проверьте их и отправьте заявление.",

  "visa.s.destination": "Страна назначения",
  "visa.s.schedule": "Даты поездки",
  "visa.s.purpose": "Цель поездки",
  "visa.s.address": "Адрес во время пребывания",
  "visa.s.stay": "Период пребывания",
  "visa.s.visaType": "Тип визы",
  "visa.s.personType": "Категория путешественника",
  "visa.s.invitation": "Приглашение",
  "visa.s.traveller": "Путешественник (как в паспорте)",
  "visa.s.documents": "Документы",
  "visa.s.summary": "Итог",
  "visa.s.terms": "Условия",
  "visa.sectionDone": "заполнено",

  "visa.i.schedule": "День отъезда и день возвращения.",
  "visa.i.stay":
    "Ваши даты на месте ({country}): часто совпадают с датами поездки.",
  "visa.i.stayAny": "Ваши даты на месте: часто совпадают с датами поездки.",
  "visa.i.visaType":
    "Наш сбор, обычный срок и нужные документы — для каждой визы.",
  "visa.i.personType":
    "Для некоторых категорий нужны дополнительные документы: они появятся сразу после выбора.",
  "visa.i.invitation":
    "Вас приглашает человек или компания в стране назначения?",
  "visa.i.traveller": "Перепишите точно так, как напечатано в паспорте.",
  "visa.i.documents": "PDF или фото, не более 10 МБ на файл.",

  "visa.f.country": "Страна",
  "visa.f.town": "Город назначения",
  "visa.f.choose": "Выбрать…",
  "visa.f.countryFirst": "Сначала выберите страну",
  "visa.countryNotes": "Полезно знать: {country}",
  "visa.f.departure": "Дата отъезда",
  "visa.f.return": "Дата возвращения",
  "visa.f.bookingRef": "Номер бронирования Flexi",
  "visa.f.purpose": "Цель поездки",
  "visa.f.address": "Адрес на месте",
  "visa.f.stayFrom": "Начало пребывания",
  "visa.f.stayTo": "Конец пребывания",
  "visa.f.passportNumber": "Номер паспорта",
  "visa.f.passportExpiry": "Срок действия паспорта",
  "visa.f.email": "E-mail для уведомлений",

  "visa.h.town": "Главный город, куда вы едете.",
  "visa.h.bookingRef":
    "Если вы бронировали эту поездку у нас, например FA-7K2QM-9XH4D.",
  "visa.h.purpose":
    "Одно-два предложения: визит к родным, деловая встреча, учёба…",
  "visa.h.address":
    "Название и адрес отеля или адрес принимающего вас человека.",
  "visa.h.names": "Все имена, как в паспорте.",
  "visa.h.passportNumber": "Буквы и цифры без пробелов — например OP1234567.",
  "visa.h.passportExpiry":
    "Паспорт должен действовать как минимум до {date} ({months} мес. после пребывания).",
  "visa.h.passportExpiryAny": "Указан на странице с данными паспорта.",

  "visa.sameAsTravel": "Взять даты поездки ({from} → {to})",
  "visa.rush":
    "Эта виза обычно оформляется {n} дн.: лучше всего выезжать не раньше {date}. Отправить всё равно можно: мы отметим заявление как срочное, но темп задаёт посольство.",

  "visa.offer.ourFee": "Наш сервисный сбор",
  "visa.offer.embassyFee": "Сбор посольства (ориентировочно)",
  "visa.offer.processing": "Срок",
  "visa.offer.validity": "Действует",
  "visa.offer.SINGLE": "Однократный въезд",
  "visa.offer.MULTIPLE": "Многократный въезд",
  "visa.offer.documents": "Нужные документы",
  "visa.embassyNote":
    "Оплачивается посольству, а не нам: сумма ориентировочная и может измениться.",

  "visa.person.minorTitle": "Путешественнику нет 18 лет в день отъезда",
  "visa.person.extraTitle": "Дополнительные документы для этой категории",
  "visa.yes": "Да",
  "visa.no": "Нет",
  "visa.privacy":
    "Номер паспорта никогда не показывается полностью: его видят только наша команда и посольство.",

  "visa.file.passport": "Паспорт — страница с данными",
  "visa.file.hotel": "Бронь отеля",
  "visa.file.photo": "Фото на документы",
  "visa.file.invitation": "Приглашение",
  "visa.fh.passport": "Вся страница, видны все четыре угла, без бликов.",
  "visa.fh.hotel": "Подтверждение бронирования, если оно есть.",
  "visa.fh.photo": "Недавнее, на светлом фоне, если посольство его требует.",
  "visa.fh.invitation": "Его также можно принести в наш офис.",
  "visa.file.drop": "Перетащите файл сюда или",
  "visa.file.browse": "выберите",
  "visa.file.types": "PDF, JPEG, PNG или WEBP · не более 10 МБ",
  "visa.file.ready": "Готово к отправке · {size}",
  "visa.file.replace": "Заменить",
  "visa.file.remove": "Убрать",
  "visa.file.removeNamed": "Убрать {name}",
  "visa.file.lost":
    "Приложите снова: {files}. Файлы не сохраняются при перезагрузке страницы.",

  "visa.payLater":
    "Сейчас платить ничего не нужно: после отправки оплатите наш сбор в офисе или через мобильные деньги, указав ваш номер.",
  "visa.terms":
    "Наш сервисный сбор покрывает подготовку и подачу вашего заявления; решение принимает посольство, и сбор не возвращается после подачи заявления.",
  "visa.submit": "Отправить заявление",
  "visa.left": "Перед отправкой осталось:",
  "visa.signInNote":
    "При отправке вы войдёте по номеру телефона; ваши ответы останутся здесь.",

  "visa.err.required": "Это поле обязательно.",
  "visa.err.passportFile":
    "Приложите страницу паспорта с данными: без неё мы не сможем подготовить документы.",
  "visa.err.departurePast":
    "Отъезд не может быть в прошлом: выберите {date} или позже.",
  "visa.err.returnBeforeDeparture":
    "Возвращение не может быть раньше отъезда: выберите {date} или позже.",
  "visa.err.stayBeforeDeparture":
    "Пребывание не может начаться раньше отъезда: выберите {date} или позже.",
  "visa.err.stayAfterReturn":
    "Пребывание должно укладываться в поездку: не позже {date}, дня возвращения.",
  "visa.err.stayToBeforeFrom":
    "Пребывание не может закончиться раньше начала: выберите {date} или позже.",
  "visa.err.passportTooSoon":
    "Паспорт должен действовать как минимум до {date} — {months} мес. после пребывания. Обновите его перед подачей заявления.",
  "visa.err.notMinor":
    "Этому путешественнику будет 18 лет или больше {date}, в день отъезда: выберите взрослую категорию.",
  "visa.err.passportNumber":
    "Номер паспорта — от 5 до 20 букв и цифр, без пробелов.",
  "visa.err.tooLong": "Не более {n} символов: сократите немного.",
  "visa.err.email": "Похоже, адрес e-mail неполный, например name@example.com.",
  "visa.err.bookingNotFound":
    "Этот номер не совпадает ни с одним вашим бронированием: проверьте его или оставьте поле пустым.",
  "visa.err.choiceUnavailable":
    "Этот вариант больше не предлагается (страна, город, виза или категория). Список только что обновлён: выберите снова.",
  "visa.err.fileType":
    "«{name}» — не PDF, JPEG, PNG или WEBP. Сохраните его в PDF или сделайте фото JPEG и попробуйте снова.",
  "visa.err.fileSize":
    "Размер «{name}» — {size}: предел 10 МБ. Отсканируйте с меньшим разрешением или сделайте фото.",
  "visa.err.send":
    "Не удалось отправить заявление. Проверьте соединение и попробуйте снова — ничего не будет записано дважды.",

  "visa.code.fileType":
    "Один из файлов — не PDF, JPEG, PNG или WEBP. Замените его и отправьте снова.",
  "visa.code.fileSize":
    "Один из файлов больше 10 МБ. Замените его более лёгким сканом или фото.",
  "visa.code.invitationNotExpected":
    "Вы приложили приглашение, но ответили «Нет». Ответьте «Да» или уберите файл.",
  "visa.code.departurePast":
    "Дата отъезда уже прошла: выберите сегодня или более поздний день.",
  "visa.code.returnBeforeDeparture":
    "Возвращение раньше отъезда: выберите возвращение в день отъезда или позже.",
  "visa.code.stayOutsideTrip":
    "Пребывание должно начаться в день отъезда или позже и закончиться не позже дня возвращения.",
  "visa.code.invalidDate":
    "Одной из дат не существует. Проверьте даты поездки, пребывания, рождения и срока действия.",
  "visa.code.notMinor":
    "Этому путешественнику в день отъезда 18 лет или больше: выберите взрослую категорию.",
  "visa.code.terms": "Отметьте флажок, чтобы принять условия сервисного сбора.",
  "visa.code.locked":
    "Это заявление больше не принимает документы: оно уже передано в посольство. Позвоните нам, если что-то изменилось.",
  "visa.code.notCancellable":
    "Это заявление больше нельзя отменить здесь: оно уже подано. Позвоните в наш офис.",
  "visa.code.tooMany":
    "В этом заявлении уже максимальное число файлов. Позвоните в наш офис.",
  "visa.person.minorHint":
    "Младше 18 лет в день отъезда: заявление будет оформлено как для несовершеннолетнего. Выберите категорию для несовершеннолетних (шаг 7), чтобы увидеть нужные документы.",

  "visa.req.countryId": "Выберите страну, куда вы едете.",
  "visa.req.townId": "Выберите город назначения.",
  "visa.req.departureDate": "Укажите дату отъезда.",
  "visa.req.returnDate": "Укажите дату возвращения.",
  "visa.req.purpose": "Одним предложением: зачем вы едете.",
  "visa.req.stayAddress": "Укажите, где вы остановитесь.",
  "visa.req.stayFrom": "Укажите начало пребывания.",
  "visa.req.stayTo": "Укажите конец пребывания.",
  "visa.req.offerId": "Выберите тип визы.",
  "visa.req.personTypeId": "Выберите категорию путешественника.",
  "visa.req.firstName": "Укажите имя (имена), как в паспорте.",
  "visa.req.lastName": "Укажите фамилию, как в паспорте.",
  "visa.req.dateOfBirth": "Укажите дату рождения.",
  "visa.req.nationality": "Выберите гражданство.",
  "visa.req.passportNumber": "Укажите номер паспорта.",
  "visa.req.passportExpiry": "Укажите срок действия паспорта.",

  "visa.done.title": "Заявление отправлено",
  "visa.done.body":
    "Мы получили заявление {name} ({country}). Напишем вам по SMS, как только дело продвинется.",
  "visa.done.reference": "Ваш номер",
  "visa.done.rush":
    "Отъезд скоро: заявление отмечено для нашей команды как срочное.",
  "visa.done.view": "Следить за заявлением",
  "visa.done.another": "Та же поездка, другой путешественник",
  "visa.done.anotherHint":
    "Данные поездки скопированы; осталось заполнить путешественника и его паспорт.",

  "visa.pay.title": "Оплатите сервисный сбор",
  "visa.pay.body":
    "{fee} в нашем офисе или через мобильные деньги, указав номер {ref}.",
  "visa.pay.beforeLodging":
    "Мы подаём документы в посольство после получения оплаты.",
  "visa.pay.PAID": "Сбор оплачен",
  "visa.pay.UNPAID": "Сбор к оплате",

  "visa.status.SUBMITTED": "Получено",
  "visa.status.IN_REVIEW": "На проверке",
  "visa.status.INFO_REQUESTED": "Нужны дополнения",
  "visa.status.LODGED": "Подано в посольство",
  "visa.status.APPOINTMENT": "Назначена встреча",
  "visa.status.APPROVED": "Виза одобрена",
  "visa.status.REFUSED": "В визе отказано",
  "visa.status.COMPLETED": "Завершено",
  "visa.status.CANCELLED": "Отменено",

  "visa.step.received": "Заявление получено",
  "visa.step.review": "Проверка нашей командой",
  "visa.step.infoNote": "Ждём ваши документы",
  "visa.step.lodged": "Подано в посольство",
  "visa.step.appointmentNote": "Встреча: {date}",
  "visa.step.decision": "Решение посольства",
  "visa.step.approved": "Виза одобрена",
  "visa.step.refused": "В визе отказано",
  "visa.step.completed": "Виза выдана",
  "visa.step.returned": "Паспорт возвращён",
  "visa.step.now": "текущий шаг",

  "visa.ev.APPLICATION_SUBMITTED": "Заявление отправлено",
  "visa.ev.PAYMENT_RECEIVED": "Оплата получена",
  "visa.ev.DOCUMENTS_RECEIVED": "Документы получены",
  "visa.ev.OFFICE_DOCUMENTS_ADDED": "Наша команда добавила документ",
  "visa.ev.DOCUMENTS_PURGED": "Ваши файлы удалены",

  "visa.kind.PASSPORT": "Паспорт",
  "visa.kind.HOTEL": "Бронь отеля",
  "visa.kind.INVITATION": "Приглашение",
  "visa.kind.PHOTO": "Фото на документы",
  "visa.kind.OTHER": "Другой документ",
  "visa.kind.VISA": "Выданная виза",

  "visa.cancelReason.CUSTOMER_REQUEST": "Отменено по вашей просьбе.",
  "visa.cancelReason.NOT_PAID": "Отменено: сервисный сбор не оплачен.",
  "visa.cancelReason.INCOMPLETE": "Отменено: документы остались неполными.",
  "visa.cancelReason.DUPLICATE": "Отменено: дублировало другое заявление.",
  "visa.cancelReason.OTHER":
    "Отменено нашей командой. Позвоните нам, чтобы узнать подробности.",

  "visa.list.empty": "Пока нет заявлений на визу",
  "visa.list.emptyBody": "Здесь появятся ваши заявления и их ход.",
  "visa.list.actionNeeded": "Нужно действие",

  "visa.detail.notFound": "Мы не нашли это заявление в вашем аккаунте.",
  "visa.detail.progress": "На каком этапе заявление",
  "visa.detail.fees": "Сборы",
  "visa.detail.trip": "Поездка",
  "visa.detail.rush": "Отъезд скоро: заявление отмечено как срочное.",
  "visa.detail.minor": "несовершеннолетний",
  "visa.detail.noDocuments": "Пока нет документов.",
  "visa.detail.fromOffice": "от нашей команды",
  "visa.detail.purged":
    "Ваши файлы удалены {date}, как и предусмотрено после закрытия заявления. Выданная виза остаётся доступной.",

  "visa.next.review": "Наша команда проверяет ваши документы",
  "visa.next.reviewBody":
    "Мы напишем, если чего-то не хватает. Добавить документ ниже можно в любой момент.",
  "visa.next.info": "Нам нужно кое-что ещё",
  "visa.next.infoBody":
    "Отправьте документы здесь: после получения заявление снова уйдёт на проверку.",
  "visa.next.lodged": "Подано в посольство",
  "visa.next.lodgedBody":
    "Решение обычно занимает {n} дн. Сообщим, как только посольство ответит.",
  "visa.next.appointment": "Ваша встреча в посольстве",
  "visa.next.appointmentBody": "Возьмите паспорт и оригиналы документов.",
  "visa.next.approved": "Ваша виза одобрена",
  "visa.next.approvedCollect":
    "Мы позвоним, как только её можно будет забрать в нашем офисе.",
  "visa.next.download": "Скачать визу",
  "visa.next.visaNumber": "Номер визы",
  "visa.next.validity": "Действует с {from} по {to}",
  "visa.next.refused": "Посольство отказало в визе",
  "visa.next.refusedBody":
    "Ваш паспорт ждёт вас в нашем офисе: возьмите с собой номер {ref}.",
  "visa.next.completed": "Завершено: виза вам выдана",
  "visa.next.closedRefused": "Закрыто: паспорт вам возвращён",
  "visa.next.cancelled": "Это заявление отменено",

  "visa.upload.add": "Добавить документ",
  "visa.upload.hint": "До 5 файлов за раз; укажите, что это за файл.",
  "visa.upload.kind": "Тип документа для {name}",
  "visa.upload.send": "Отправить ({n})",
  "visa.upload.sent": "Отправлено документов: {n}. Наша команда уведомлена.",

  "visa.cancel.link": "Отменить это заявление",
  "visa.cancel.title": "Отменить заявление?",
  "visa.cancel.body":
    "Оно не будет подано в посольство. Если вы уже заплатили, позвоните нам, чтобы узнать, что дальше.",
  "visa.cancel.note": "Почему?",
  "visa.cancel.confirm": "Да, отменить",
  "visa.cancel.keep": "Оставить заявление"
};

export const visaMessages: Record<Locale, Dict> = {
  fr,
  en,
  pt,
  es,
  zh,
  ar,
  ru
};
