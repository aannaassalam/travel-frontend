import {
  DEFAULT_LOCALE,
  Localized,
  Locale
} from "@/typescript/interface/domain.interface";

/**
 * §6. UI strings live here; listing content lives in `Localized` fields on the
 * documents themselves. Fallback order is requested locale → French → raw.
 * Never English by default.
 *
 * ponytail: plain `{name}` interpolation instead of full ICU MessageFormat.
 * Nothing on the public site currently needs plurals or gender selects — the
 * one count string ("N résultats") is handled by `plural()` below. Swap in
 * @formatjs/intl-messageformat the first time a real ICU select is needed;
 * `t()` is the only call site that changes.
 */

type Dict = Record<string, string>;

const fr: Dict = {
  "brand.name": "Congo Travel",
  "brand.tagline": "Vols, hôtels, transferts et immobilier en RDC",

  "nav.flights": "Vols",
  "nav.hotels": "Hôtels",
  "nav.bus": "Bus",
  "nav.cars": "Location Voitures",
  "nav.activities": "Événements & Tourisme",
  "nav.property": "Immobilier",
  "nav.restaurants": "Restaurants",
  "nav.help": "Aide",
  "nav.account": "Mon compte",
  "nav.signin": "Se connecter",
  "nav.signout": "Se déconnecter",
  "nav.menu": "Menu",
  "nav.close": "Fermer",

  "search.where": "Destination",
  "search.wherePlaceholder": "Ville, hôtel ou lieu",
  "search.from": "Départ",
  "search.to": "Arrivée",
  "search.dates": "Dates",
  "search.checkin": "Arrivée",
  "search.checkout": "Départ",
  "search.date": "Date",
  "search.pickupDate": "Prise en charge",
  "search.returnDate": "Restitution",
  "search.returnFlight": "Retour",
  "search.guests": "Voyageurs",
  "search.adults": "Adultes",
  "search.children": "Enfants",
  "search.rooms": "Chambres",
  "search.passengers": "Passagers",
  "search.cabin": "Classe",
  "search.tripType": "Type de trajet",
  "search.oneWay": "Aller simple",
  "search.return": "Aller-retour",
  "search.multiCity": "Multi-destinations",
  "search.submit": "Rechercher",
  "search.propertyType": "Type de bien",
  "search.budget": "Budget",

  "cabin.ECONOMY": "Économie",
  "cabin.PREMIUM": "Premium",
  "cabin.BUSINESS": "Affaires",
  "cabin.FIRST": "Première",

  "home.heroTitle": "Réservez votre prochain voyage en RDC",
  "home.heroSubtitle":
    "Vols, hôtels, bus, voitures et activités — stock vérifié, prix en USD, CDF ou EUR, paiement mobile money ou espèces.",
  "home.deals": "Offres du moment",
  "home.dealsSub": "Stock acheté à l'avance, quantités réelles, aucun prix fantôme.",
  "home.destinations": "Destinations populaires",
  "home.destinationsSub": "Là où nous avons du stock cette saison.",
  "home.property": "Immobilier en RDC",
  "home.propertySub": "Maisons, terrains et locations. Contact direct avec notre agent.",
  "home.whyTitle": "Pourquoi réserver avec nous",
  "home.why1Title": "Stock réel, vérifié",
  "home.why1Body":
    "Nous achetons les places et les chambres à l'avance. Ce que vous voyez est disponible ; nous n'affichons jamais une offre que nous ne pouvons pas honorer.",
  "home.why2Title": "Payez comme vous voulez",
  "home.why2Body":
    "M-Pesa, Orange Money, Airtel Money, Afrimoney, carte bancaire — ou en espèces dans nos bureaux à Kinshasa.",
  "home.why3Title": "Prix clairs, sans surprise",
  "home.why3Body":
    "Le prix affiché est le prix payé. Aucun frais révélé à la dernière étape, aucun compteur d'urgence inventé.",
  "home.why4Title": "Une équipe joignable",
  "home.why4Body":
    "Bureau à Gombe, WhatsApp et téléphone du lundi au samedi. Une vraie personne répond.",
  "home.trustOffice": "Bureau",
  "home.trustPhone": "Téléphone",
  "home.trustHours": "Lun–Sam, 08h00–18h00",
  "home.viewAll": "Tout voir",
  "home.searchAgain": "Modifier la recherche",

  "results.title": "{n} résultats",
  "results.titleOne": "1 résultat",
  "results.titleZero": "Aucun résultat",
  "results.sort": "Trier par",
  "results.sortRecommended": "Recommandé",
  "results.sortPriceAsc": "Prix croissant",
  "results.sortPriceDesc": "Prix décroissant",
  "results.sortRating": "Mieux notés",
  "results.sortDeparture": "Départ le plus tôt",
  "results.filters": "Filtres",
  "results.clearFilters": "Tout effacer",
  "results.applyFilters": "Voir les résultats",
  "results.priceRange": "Prix par personne",
  "results.city": "Ville",
  "results.stars": "Catégorie",
  "results.amenities": "Équipements",
  "results.mealPlan": "Restauration",
  "results.airline": "Compagnie",
  "results.operator": "Opérateur",
  "results.category": "Catégorie",
  "results.transmission": "Boîte de vitesses",
  "results.duration": "Durée",
  "results.bedrooms": "Chambres",
  "results.showing": "Affichage de {n} sur {total}",

  "empty.title": "Aucune offre ne correspond à cette recherche",
  "empty.body":
    "Notre stock est acheté à l'avance et limité. Dites-nous ce que vous cherchez : nous le sourçons et revenons vers vous avec un prix ferme.",
  "empty.cta": "Demander un devis",
  "empty.nearby": "Disponible à proximité",
  "empty.relax": "Élargir la recherche",

  "rtb.title": "Demande de réservation",
  "rtb.body":
    "Nous n'avons pas ce trajet en stock aujourd'hui. Laissez vos coordonnées : nous cherchons et vous envoyons un lien de paiement, sans engagement.",
  "rtb.name": "Nom complet",
  "rtb.phone": "Numéro de téléphone",
  "rtb.email": "E-mail (facultatif)",
  "rtb.details": "Ce que vous cherchez",
  "rtb.detailsPlaceholder":
    "Ex. Kinshasa → Lubumbashi, 2 adultes, autour du 14 août, classe économie",
  "rtb.submit": "Envoyer la demande",
  "rtb.sent": "Demande envoyée",
  "rtb.sentBody":
    "Référence {ref}. Nous vous rappelons sous 24 heures ouvrées au numéro fourni.",

  "listing.from": "À partir de",
  "listing.perNight": "par nuit",
  "listing.perPerson": "par personne",
  "listing.perDay": "par jour",
  "listing.perMonth": "par mois",
  "listing.total": "au total",
  "listing.taxesNote": "Taxes et frais inclus",
  "listing.seatsLeft": "{n} places restantes",
  "listing.roomsLeft": "{n} chambres restantes",
  "listing.unitsLeft": "{n} disponibles",
  "listing.soldOut": "Épuisé",
  "listing.book": "Réserver",
  "listing.select": "Sélectionner",
  "listing.details": "Voir les détails",
  "listing.enquire": "Demander des informations",
  "listing.gallery": "Voir les {n} photos",
  "listing.description": "Description",
  "listing.included": "Ce qui est inclus",
  "listing.excluded": "Non inclus",
  "listing.amenities": "Équipements",
  "listing.location": "Emplacement",
  "listing.policy": "Conditions",
  "listing.rooms": "Chambres disponibles",
  "listing.itinerary": "Itinéraire",
  "listing.vehicle": "Le véhicule",
  "listing.meetingPoint": "Point de rendez-vous",
  "listing.duration": "Durée",
  "listing.languages": "Langues",
  "listing.baggage": "Bagages",
  "listing.stops": "Arrêts",
  "listing.features": "Caractéristiques",
  "listing.reference": "Référence",
  "listing.agent": "Votre interlocuteur",
  "listing.reviews": "{n} avis",
  "listing.noReviews": "Pas encore d'avis",

  "policy.short": "Réservation définitive · non remboursable",
  "policy.title": "Réservation définitive",
  "policy.body":
    "Toutes les ventes sont définitives. Aucun remboursement n'est accordé, quelle que soit la raison de l'annulation. Vous pouvez annuler une réservation, mais aucune somme ne sera restituée.",
  "policy.consent":
    "Je comprends que cette réservation est définitive et non remboursable. Aucun remboursement ni annulation avec remboursement ne sera accordé.",
  "policy.consentRequired":
    "Vous devez accepter la politique de non-remboursement pour continuer.",
  "policy.readFull": "Lire les conditions complètes",

  "checkout.step1": "Voyageurs",
  "checkout.step2": "Coordonnées",
  "checkout.step3": "Paiement",
  "checkout.stepOf": "Étape {n} sur 3",
  "checkout.back": "Retour",
  "checkout.continue": "Continuer",
  "checkout.holdTitle": "Nous gardons cette réservation",
  "checkout.holdBody": "Temps restant : {time}",
  "checkout.holdExpired":
    "Le délai de réservation a expiré et les places ont été remises en vente.",
  "checkout.holdRestart": "Relancer la recherche",
  "checkout.traveller": "Voyageur {n}",
  "checkout.leadGuest": "Voyageur principal",
  "checkout.firstName": "Prénom",
  "checkout.lastName": "Nom",
  "checkout.dob": "Date de naissance",
  "checkout.docType": "Pièce d'identité",
  "checkout.docNumber": "Numéro du document",
  "checkout.docNote":
    "Conservé chiffré et supprimé automatiquement 90 jours après le voyage.",
  "checkout.nationality": "Nationalité",
  "checkout.contact": "Vos coordonnées",
  "checkout.contactNote":
    "Le numéro de téléphone est votre identifiant : la confirmation et les documents y sont envoyés.",
  "checkout.haveAccount": "J'ai déjà un compte",
  "checkout.guest": "Continuer sans compte",
  "checkout.guestNote":
    "Un compte est créé automatiquement avec votre numéro. Vous recevrez un lien pour définir un mot de passe et suivre votre réservation.",
  "checkout.summary": "Récapitulatif",
  "checkout.subtotal": "Sous-total",
  "checkout.serviceFee": "Frais de service",
  "checkout.totalDue": "Total à payer",
  "checkout.payWith": "Mode de paiement",
  "checkout.mobileMoney": "Mobile money",
  "checkout.card": "Carte bancaire",
  "checkout.cash": "Espèces en agence",
  "checkout.mobileMoneyNote":
    "Vous recevrez une demande de confirmation sur votre téléphone. Gardez-le à portée de main.",
  "checkout.cardNote":
    "Paiement sur la page sécurisée de notre prestataire. Nous ne voyons jamais votre numéro de carte.",
  "checkout.cashNote":
    "Réservation maintenue 48 heures. Payez en agence avec la référence envoyée par SMS.",
  "checkout.operator": "Opérateur",
  "checkout.payNow": "Payer {amount}",
  "checkout.reserveCash": "Réserver et payer en agence",
  "checkout.waitingTitle": "Vérifiez votre téléphone",
  "checkout.waitingBody":
    "Une demande de paiement de {amount} a été envoyée au {phone}. Validez-la sur votre téléphone. Cette page se met à jour automatiquement.",
  "checkout.waitingCancel": "Annuler et changer de mode de paiement",
  "checkout.terms": "J'accepte les conditions générales et la politique de confidentialité.",

  "confirm.title": "Réservation confirmée",
  "confirm.titleCash": "Réservation enregistrée",
  "confirm.reference": "Référence",
  "confirm.body":
    "Une confirmation a été envoyée par SMS au {phone}. Conservez cette référence.",
  "confirm.cashBody":
    "Présentez la référence {ref} à notre agence avant le {deadline}. Passé ce délai, la réservation est annulée et les places remises en vente.",
  "confirm.next": "Prochaines étapes",
  "confirm.download": "Télécharger le voucher",
  "confirm.addCalendar": "Ajouter au calendrier",
  "confirm.viewBooking": "Voir ma réservation",
  "confirm.claimTitle": "Suivez votre réservation",
  "confirm.claimBody":
    "Définissez un mot de passe pour retrouver cette réservation et vos documents à tout moment.",
  "confirm.claimCta": "Créer mon mot de passe",

  "account.title": "Mon compte",
  "account.dashboard": "Tableau de bord",
  "account.bookings": "Mes réservations",
  "account.enquiries": "Mes demandes",
  "account.saved": "Favoris",
  "account.profile": "Profil",
  "account.sessions": "Appareils connectés",
  "account.preferences": "Langue et devise",
  "account.upcoming": "À venir",
  "account.past": "Passées",
  "account.noBookings": "Aucune réservation pour l'instant",
  "account.noBookingsBody": "Vos réservations apparaîtront ici dès la première.",
  "account.noEnquiries": "Aucune demande en cours",
  "account.noSaved": "Aucun favori enregistré",
  "account.browse": "Parcourir les offres",
  "account.viewBooking": "Détails",
  "account.documents": "Documents",
  "account.timeline": "Suivi",
  "account.support": "Contacter le support",
  "account.cancelNote":
    "Pour annuler ou modifier une réservation, contactez le support. Aucun remboursement ne sera accordé.",
  "account.revoke": "Déconnecter",
  "account.deleteAccount": "Supprimer mon compte",
  "account.travellers": "Voyageurs",
  "account.payment": "Paiement",

  "status.DRAFT": "Brouillon",
  "status.SUBMITTED": "Enregistrée",
  "status.CONFIRMED": "Confirmée",
  "status.CANCELLED": "Annulée",
  "status.COMPLETED": "Terminée",
  "pay.UNPAID": "Non payée",
  "pay.PENDING": "Paiement en cours",
  "pay.PAID": "Payée",
  "pay.FAILED": "Paiement échoué",
  "pay.REVERSED": "Paiement annulé",
  "ful.NOT_STARTED": "En préparation",
  "ful.DOCUMENTS_PENDING": "Documents en préparation",
  "ful.DOCUMENTS_ISSUED": "Documents émis",
  "ful.DELIVERED": "Livrée",
  "enq.NEW": "Reçue",
  "enq.CONTACTED": "Contact établi",
  "enq.QUALIFIED": "En cours",
  "enq.QUOTED": "Devis envoyé",
  "enq.WON": "Convertie",
  "enq.LOST": "Clôturée",

  "auth.title": "Se connecter",
  "auth.subtitle": "Votre numéro de téléphone est votre identifiant.",
  "auth.phone": "Numéro de téléphone",
  "auth.sendOtp": "Recevoir un code",
  "auth.otpTitle": "Entrez le code",
  "auth.otpBody": "Nous avons envoyé un code à 6 chiffres au {phone}.",
  "auth.otpResend": "Renvoyer le code",
  "auth.otpChange": "Changer de numéro",
  "auth.usePassword": "Utiliser un mot de passe",
  "auth.useOtp": "Utiliser un code SMS",
  "auth.password": "Mot de passe",
  "auth.forgot": "Mot de passe oublié",
  "auth.verify": "Valider",
  "auth.noAccountNote":
    "Pas encore de compte ? Il est créé automatiquement lors de votre première réservation.",
  "auth.otpInvalid": "Code incorrect. Vérifiez le SMS et réessayez.",
  "auth.demoTitle": "Connexion de démonstration",
  "auth.demoBody":
    "L'authentification réelle n'est pas encore branchée. Utilisez ce numéro et ce code pour entrer.",
  "auth.demoFill": "Utiliser ce compte",
  "auth.demoCode": "Code",

  "enquiry.title": "Demander des informations",
  "enquiry.body":
    "Ce bien se traite hors ligne. Laissez vos coordonnées et notre agent vous rappelle.",
  "enquiry.message": "Votre message",
  "enquiry.messagePlaceholder":
    "Ex. Je souhaite visiter ce bien la semaine prochaine.",
  "enquiry.submit": "Envoyer",
  "enquiry.sent": "Demande envoyée",
  "enquiry.sentBody":
    "Référence {ref}. Notre agent vous rappelle sous 24 heures ouvrées.",
  "enquiry.callNow": "Appeler maintenant",
  "enquiry.whatsapp": "WhatsApp",

  "footer.company": "L'entreprise",
  "footer.about": "À propos",
  "footer.contact": "Contact",
  "footer.help": "Aide",
  "footer.legal": "Informations légales",
  "footer.terms": "Conditions générales",
  "footer.privacy": "Confidentialité",
  "footer.policy": "Politique de non-remboursement",
  "footer.services": "Nos services",
  "footer.payments": "Moyens de paiement acceptés",
  "footer.rights": "Tous droits réservés.",
  "footer.lowData": "Mode économie de données",

  "common.currency": "Devise",
  "common.language": "Langue",
  "common.loading": "Chargement",
  "common.required": "Champ obligatoire",
  "common.optional": "facultatif",
  "common.save": "Enregistrer",
  "listing.save": "Enregistrer",
  "listing.saved": "Enregistré",
  "common.cancel": "Annuler",
  "common.close": "Fermer",
  "common.night": "nuit",
  "common.nights": "nuits",
  "common.day": "jour",
  "common.days": "jours",
  "common.adult": "adulte",
  "common.adults": "adultes",
  "common.child": "enfant",
  "common.children": "enfants",
  "common.person": "personne",
  "common.people": "personnes",
  "common.home": "Accueil",
  "common.error": "Une erreur est survenue",
  "common.retry": "Réessayer",
  "common.notFound": "Page introuvable",
  "common.notFoundBody":
    "Cette page n'existe pas ou l'offre n'est plus disponible.",
  "common.backHome": "Retour à l'accueil",

  "err.phone": "Numéro de téléphone invalide — format attendu +243…",
  "err.name": "Indiquez votre nom complet.",
  "err.email": "Adresse e-mail invalide.",
  "err.otp": "Code à 6 chiffres attendu.",
  "err.required": "Ce champ est obligatoire."
};

const en: Dict = {
  "brand.tagline": "Flights, hotels, transfers and property in the DRC",

  "nav.flights": "Flights",
  "nav.hotels": "Hotels",
  "nav.bus": "Bus",
  "nav.cars": "Car Rental",
  "nav.activities": "Activities & Tours",
  "nav.property": "Properties",
  "nav.restaurants": "Restaurants",
  "nav.help": "Help",
  "nav.account": "My account",
  "nav.signin": "Sign in",
  "nav.signout": "Sign out",
  "nav.menu": "Menu",
  "nav.close": "Close",

  "search.where": "Destination",
  "search.wherePlaceholder": "City, hotel or place",
  "search.from": "From",
  "search.to": "To",
  "search.dates": "Dates",
  "search.checkin": "Check-in",
  "search.checkout": "Check-out",
  "search.date": "Date",
  "search.pickupDate": "Pick-up",
  "search.returnDate": "Return",
  "search.returnFlight": "Return",
  "search.guests": "Guests",
  "search.adults": "Adults",
  "search.children": "Children",
  "search.rooms": "Rooms",
  "search.passengers": "Passengers",
  "search.cabin": "Cabin",
  "search.tripType": "Trip type",
  "search.oneWay": "One way",
  "search.return": "Round trip",
  "search.multiCity": "Multi-city",
  "search.submit": "Search",
  "search.propertyType": "Property type",
  "search.budget": "Budget",

  "cabin.ECONOMY": "Economy",
  "cabin.PREMIUM": "Premium",
  "cabin.BUSINESS": "Business",
  "cabin.FIRST": "First",

  "home.heroTitle": "Book your next trip in the DRC",
  "home.heroSubtitle":
    "Flights, hotels, buses, cars and activities — verified stock, prices in USD, CDF or EUR, pay by mobile money or cash.",
  "home.deals": "Current offers",
  "home.dealsSub": "Stock bought in advance, real quantities, no phantom prices.",
  "home.destinations": "Popular destinations",
  "home.destinationsSub": "Where we hold stock this season.",
  "home.property": "Property in the DRC",
  "home.propertySub": "Houses, land and rentals. Speak directly to our agent.",
  "home.whyTitle": "Why book with us",
  "home.why1Title": "Real, verified stock",
  "home.why1Body":
    "We buy seats and rooms in advance. What you see is available; we never show an offer we cannot honour.",
  "home.why2Title": "Pay the way you want",
  "home.why2Body":
    "M-Pesa, Orange Money, Airtel Money, Afrimoney, bank card — or cash at our Kinshasa office.",
  "home.why3Title": "Clear prices, no surprises",
  "home.why3Body":
    "The price shown is the price paid. No fee revealed at the last step, no invented urgency counters.",
  "home.why4Title": "A team you can reach",
  "home.why4Body":
    "Office in Gombe, WhatsApp and phone Monday to Saturday. A real person answers.",
  "home.trustOffice": "Office",
  "home.trustPhone": "Phone",
  "home.trustHours": "Mon–Sat, 08:00–18:00",
  "home.viewAll": "View all",
  "home.searchAgain": "Edit search",

  "results.title": "{n} results",
  "results.titleOne": "1 result",
  "results.titleZero": "No results",
  "results.sort": "Sort by",
  "results.sortRecommended": "Recommended",
  "results.sortPriceAsc": "Price: low to high",
  "results.sortPriceDesc": "Price: high to low",
  "results.sortRating": "Top rated",
  "results.sortDeparture": "Earliest departure",
  "results.filters": "Filters",
  "results.clearFilters": "Clear all",
  "results.applyFilters": "Show results",
  "results.priceRange": "Price per person",
  "results.city": "City",
  "results.stars": "Star rating",
  "results.amenities": "Amenities",
  "results.mealPlan": "Board",
  "results.airline": "Airline",
  "results.operator": "Operator",
  "results.category": "Category",
  "results.transmission": "Transmission",
  "results.duration": "Duration",
  "results.bedrooms": "Bedrooms",
  "results.showing": "Showing {n} of {total}",

  "empty.title": "Nothing matches this search",
  "empty.body":
    "Our stock is bought in advance and limited. Tell us what you need: we will source it and come back with a firm price.",
  "empty.cta": "Request a quote",
  "empty.nearby": "Available nearby",
  "empty.relax": "Widen the search",

  "rtb.title": "Request to book",
  "rtb.body":
    "We do not hold this trip today. Leave your details: we will source it and send you a payment link, with no commitment.",
  "rtb.name": "Full name",
  "rtb.phone": "Phone number",
  "rtb.email": "Email (optional)",
  "rtb.details": "What you are looking for",
  "rtb.detailsPlaceholder":
    "e.g. Kinshasa → Lubumbashi, 2 adults, around 14 August, economy",
  "rtb.submit": "Send request",
  "rtb.sent": "Request sent",
  "rtb.sentBody":
    "Reference {ref}. We will call you back within 24 working hours on the number provided.",

  "listing.from": "From",
  "listing.perNight": "per night",
  "listing.perPerson": "per person",
  "listing.perDay": "per day",
  "listing.perMonth": "per month",
  "listing.total": "total",
  "listing.taxesNote": "Taxes and fees included",
  "listing.seatsLeft": "{n} seats left",
  "listing.roomsLeft": "{n} rooms left",
  "listing.unitsLeft": "{n} available",
  "listing.soldOut": "Sold out",
  "listing.book": "Book",
  "listing.select": "Select",
  "listing.details": "See details",
  "listing.enquire": "Request information",
  "listing.gallery": "See all {n} photos",
  "listing.description": "Description",
  "listing.included": "What's included",
  "listing.excluded": "Not included",
  "listing.amenities": "Amenities",
  "listing.location": "Location",
  "listing.policy": "Conditions",
  "listing.rooms": "Available rooms",
  "listing.itinerary": "Itinerary",
  "listing.vehicle": "The vehicle",
  "listing.meetingPoint": "Meeting point",
  "listing.duration": "Duration",
  "listing.languages": "Languages",
  "listing.baggage": "Baggage",
  "listing.stops": "Stops",
  "listing.features": "Features",
  "listing.reference": "Reference",
  "listing.agent": "Your contact",
  "listing.reviews": "{n} reviews",
  "listing.noReviews": "No reviews yet",

  "policy.short": "Final booking · non-refundable",
  "policy.title": "Final booking",
  "policy.body":
    "All sales are final. No refund is given, whatever the reason for cancellation. You may cancel a booking, but no money will be returned.",
  "policy.consent":
    "I understand this booking is final and non-refundable. No refund or cancellation-with-refund will be granted.",
  "policy.consentRequired":
    "You must accept the no-refund policy to continue.",
  "policy.readFull": "Read the full terms",

  "checkout.step1": "Travellers",
  "checkout.step2": "Contact",
  "checkout.step3": "Payment",
  "checkout.stepOf": "Step {n} of 3",
  "checkout.back": "Back",
  "checkout.continue": "Continue",
  "checkout.holdTitle": "We are holding this booking",
  "checkout.holdBody": "Time remaining: {time}",
  "checkout.holdExpired":
    "The hold expired and the stock has been returned to sale.",
  "checkout.holdRestart": "Start a new search",
  "checkout.traveller": "Traveller {n}",
  "checkout.leadGuest": "Lead traveller",
  "checkout.firstName": "First name",
  "checkout.lastName": "Last name",
  "checkout.dob": "Date of birth",
  "checkout.docType": "ID document",
  "checkout.docNumber": "Document number",
  "checkout.docNote":
    "Stored encrypted and deleted automatically 90 days after travel.",
  "checkout.nationality": "Nationality",
  "checkout.contact": "Your details",
  "checkout.contactNote":
    "Your phone number is your identifier: confirmation and documents are sent there.",
  "checkout.haveAccount": "I already have an account",
  "checkout.guest": "Continue without an account",
  "checkout.guestNote":
    "An account is created automatically from your number. You will get a link to set a password and track your booking.",
  "checkout.summary": "Summary",
  "checkout.subtotal": "Subtotal",
  "checkout.serviceFee": "Service fee",
  "checkout.totalDue": "Total due",
  "checkout.payWith": "Payment method",
  "checkout.mobileMoney": "Mobile money",
  "checkout.card": "Bank card",
  "checkout.cash": "Cash at our office",
  "checkout.mobileMoneyNote":
    "You will receive a confirmation request on your phone. Keep it to hand.",
  "checkout.cardNote":
    "Payment on our provider's secure page. We never see your card number.",
  "checkout.cashNote":
    "Booking held for 48 hours. Pay at our office using the reference sent by SMS.",
  "checkout.operator": "Operator",
  "checkout.payNow": "Pay {amount}",
  "checkout.reserveCash": "Reserve and pay at the office",
  "checkout.waitingTitle": "Check your phone",
  "checkout.waitingBody":
    "A payment request for {amount} was sent to {phone}. Approve it on your phone. This page updates automatically.",
  "checkout.waitingCancel": "Cancel and change payment method",
  "checkout.terms": "I accept the terms and conditions and the privacy policy.",

  "confirm.title": "Booking confirmed",
  "confirm.titleCash": "Booking registered",
  "confirm.reference": "Reference",
  "confirm.body":
    "A confirmation was sent by SMS to {phone}. Keep this reference.",
  "confirm.cashBody":
    "Bring reference {ref} to our office before {deadline}. After that the booking is cancelled and the stock returned to sale.",
  "confirm.next": "Next steps",
  "confirm.download": "Download voucher",
  "confirm.addCalendar": "Add to calendar",
  "confirm.viewBooking": "View my booking",
  "confirm.claimTitle": "Track your booking",
  "confirm.claimBody":
    "Set a password to find this booking and your documents at any time.",
  "confirm.claimCta": "Set my password",

  "account.title": "My account",
  "account.dashboard": "Dashboard",
  "account.bookings": "My bookings",
  "account.enquiries": "My enquiries",
  "account.saved": "Saved",
  "account.profile": "Profile",
  "account.sessions": "Active devices",
  "account.preferences": "Language and currency",
  "account.upcoming": "Upcoming",
  "account.past": "Past",
  "account.noBookings": "No bookings yet",
  "account.noBookingsBody": "Your bookings will appear here after the first one.",
  "account.noEnquiries": "No open enquiries",
  "account.noSaved": "Nothing saved yet",
  "account.browse": "Browse offers",
  "account.viewBooking": "Details",
  "account.documents": "Documents",
  "account.timeline": "Progress",
  "account.support": "Contact support",
  "account.cancelNote":
    "To cancel or change a booking, contact support. No refund will be given.",
  "account.revoke": "Sign out",
  "account.deleteAccount": "Delete my account",
  "account.travellers": "Travellers",
  "account.payment": "Payment",

  "status.DRAFT": "Draft",
  "status.SUBMITTED": "Registered",
  "status.CONFIRMED": "Confirmed",
  "status.CANCELLED": "Cancelled",
  "status.COMPLETED": "Completed",
  "pay.UNPAID": "Unpaid",
  "pay.PENDING": "Payment pending",
  "pay.PAID": "Paid",
  "pay.FAILED": "Payment failed",
  "pay.REVERSED": "Payment reversed",
  "ful.NOT_STARTED": "Being prepared",
  "ful.DOCUMENTS_PENDING": "Documents being prepared",
  "ful.DOCUMENTS_ISSUED": "Documents issued",
  "ful.DELIVERED": "Delivered",
  "enq.NEW": "Received",
  "enq.CONTACTED": "Contacted",
  "enq.QUALIFIED": "In progress",
  "enq.QUOTED": "Quote sent",
  "enq.WON": "Converted",
  "enq.LOST": "Closed",

  "auth.title": "Sign in",
  "auth.subtitle": "Your phone number is your identifier.",
  "auth.phone": "Phone number",
  "auth.sendOtp": "Send me a code",
  "auth.otpTitle": "Enter the code",
  "auth.otpBody": "We sent a 6-digit code to {phone}.",
  "auth.otpResend": "Resend code",
  "auth.otpChange": "Change number",
  "auth.usePassword": "Use a password",
  "auth.useOtp": "Use an SMS code",
  "auth.password": "Password",
  "auth.forgot": "Forgot password",
  "auth.verify": "Verify",
  "auth.noAccountNote":
    "No account yet? One is created automatically with your first booking.",
  "auth.otpInvalid": "Incorrect code. Check the SMS and try again.",
  "auth.demoTitle": "Demo sign-in",
  "auth.demoBody":
    "Real authentication is not wired up yet. Use this number and code to get in.",
  "auth.demoFill": "Use this account",
  "auth.demoCode": "Code",

  "enquiry.title": "Request information",
  "enquiry.body":
    "This listing is handled offline. Leave your details and our agent will call you back.",
  "enquiry.message": "Your message",
  "enquiry.messagePlaceholder": "e.g. I'd like to view this property next week.",
  "enquiry.submit": "Send",
  "enquiry.sent": "Request sent",
  "enquiry.sentBody":
    "Reference {ref}. Our agent will call you back within 24 working hours.",
  "enquiry.callNow": "Call now",
  "enquiry.whatsapp": "WhatsApp",

  "footer.company": "Company",
  "footer.about": "About",
  "footer.contact": "Contact",
  "footer.help": "Help",
  "footer.legal": "Legal",
  "footer.terms": "Terms and conditions",
  "footer.privacy": "Privacy",
  "footer.policy": "No-refund policy",
  "footer.services": "Our services",
  "footer.payments": "Accepted payment methods",
  "footer.rights": "All rights reserved.",
  "footer.lowData": "Low-data mode",

  "common.currency": "Currency",
  "common.language": "Language",
  "common.loading": "Loading",
  "common.required": "Required",
  "common.optional": "optional",
  "common.save": "Save",
  "listing.save": "Save",
  "listing.saved": "Saved",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.night": "night",
  "common.nights": "nights",
  "common.day": "day",
  "common.days": "days",
  "common.adult": "adult",
  "common.adults": "adults",
  "common.child": "child",
  "common.children": "children",
  "common.person": "person",
  "common.people": "people",
  "common.home": "Home",
  "common.error": "Something went wrong",
  "common.retry": "Try again",
  "common.notFound": "Page not found",
  "common.notFoundBody": "This page does not exist, or the offer has ended.",
  "common.backHome": "Back to home",

  "err.phone": "Invalid phone number — expected format +243…",
  "err.name": "Enter your full name.",
  "err.email": "Invalid email address.",
  "err.otp": "A 6-digit code is expected.",
  "err.required": "This field is required."
};

const CATALOGUES: Record<Locale, Dict> = { fr, en, pt: {}, es: {} };

/** Requested locale → French → the key itself. Never English by default. */
export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const raw =
    CATALOGUES[locale]?.[key] ?? CATALOGUES[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k) =>
    k in vars ? String(vars[k]) : m
  );
}

/** Same fallback chain for content fields stored per locale on a document. */
export function localized(field: Localized | undefined, locale: Locale): string {
  if (!field) return "";
  return field[locale] || field[DEFAULT_LOCALE] || Object.values(field)[0] || "";
}

/** The only count-dependent string on the public site. */
export function resultsLabel(locale: Locale, n: number): string {
  if (n === 0) return translate(locale, "results.titleZero");
  if (n === 1) return translate(locale, "results.titleOne");
  return translate(locale, "results.title", { n });
}

/**
 * Catalogue vocabulary is stored in French.
 *
 * Amenities, vehicle classes and car categories are free text the office types
 * into the admin once - "Climatisation" - and that single string is what every
 * locale receives. Names and descriptions avoid this by being `Localized`
 * fields; these facet values are not, so an English visitor was reading a
 * French filter sidebar, French chips on every hotel card and a French amenity
 * list on the detail page.
 *
 * Only English is mapped, and only where the word actually differs. Anything
 * unmapped passes through as typed, which is the right failure: an amenity the
 * office adds tomorrow shows up in French rather than as a blank row. pt/es
 * fall back to French, matching `translate`.
 *
 * ponytail: a lookup table, not a data model. If the office needs to translate
 * its own vocabulary, these fields have to become codes carrying a `Localized`
 * label - the shape listings already use.
 */
const CATALOGUE_EN: Record<string, string> = {
  // Hotel amenities
  "Wifi gratuit": "Free Wi-Fi",
  Wifi: "Wi-Fi",
  Piscine: "Pool",
  "Salle de sport": "Gym",
  "Navette aéroport": "Airport shuttle",
  Climatisation: "Air conditioning",
  "Groupe électrogène": "Backup generator",
  "Parking sécurisé": "Secure parking",
  Blanchisserie: "Laundry",
  "Salles de réunion": "Meeting rooms",
  "Vue lac": "Lake view",
  Jardin: "Garden",
  "Petit-déjeuner inclus": "Breakfast included",
  Télévision: "TV",
  // Bus vehicle classes
  Climatisé: "Air-conditioned",
  // Car categories
  Berline: "Saloon"
};

/**
 * Label for a value that came from the catalogue rather than from a key.
 * Identical in both languages (Restaurant, Bar, SUV, Minibus) needs no entry.
 */
export function facetLabel(locale: Locale, value: string): string {
  return locale === "en" ? CATALOGUE_EN[value] ?? value : value;
}
