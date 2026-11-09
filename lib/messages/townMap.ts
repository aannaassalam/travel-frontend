/**
 * The town map (/carte), its header link and the results pages' "See on the
 * map" button. All seven languages here; merged into each catalogue in
 * lib/i18n.ts. Every language is typed against French, so a missing key fails
 * to compile.
 */
const fr = {
  "map.nav": "Carte",
  "map.title": "La ville sur une carte",
  "map.titleIn": "{city} sur une carte",
  "map.description":
    "Hôtels, restaurants, parkings et biens immobiliers, chacun à sa place. Touchez une épingle pour ouvrir sa page.",
  "map.town": "Ville",
  "map.all": "Tout",
  "map.kind.HOTEL": "Hôtel",
  "map.kind.RESTAURANT": "Restaurant",
  "map.kind.PARKING": "Parking",
  "map.kind.PROPERTY": "Bien immobilier",
  "map.chip.HOTEL": "Hôtels",
  "map.chip.RESTAURANT": "Restaurants",
  "map.chip.PARKING": "Parkings",
  "map.chip.PROPERTY": "Immobilier",
  "map.open": "Voir la page",
  "map.seeOnMap": "Voir sur la carte",
  "map.vehicles": "Véhicules en vente : {n}",
  "map.label": "Carte des lieux à {city}",
  "map.emptyTitle": "Pas encore de lieu avec une position sur la carte ici.",
  "map.emptyBody": "Essayez une autre ville ou une autre catégorie."
};
type Dict = Record<keyof typeof fr, string>;

const en: Dict = {
  "map.nav": "Map",
  "map.title": "The town on a map",
  "map.titleIn": "{city} on a map",
  "map.description":
    "Hotels, restaurants, car parks and properties, each where it stands. Tap a pin to open its page.",
  "map.town": "Town",
  "map.all": "All",
  "map.kind.HOTEL": "Hotel",
  "map.kind.RESTAURANT": "Restaurant",
  "map.kind.PARKING": "Car park",
  "map.kind.PROPERTY": "Property",
  "map.chip.HOTEL": "Hotels",
  "map.chip.RESTAURANT": "Restaurants",
  "map.chip.PARKING": "Car parks",
  "map.chip.PROPERTY": "Properties",
  "map.open": "Open",
  "map.seeOnMap": "See on the map",
  "map.vehicles": "Vehicles for sale: {n}",
  "map.label": "Map of places in {city}",
  "map.emptyTitle": "No places with a map position here yet.",
  "map.emptyBody": "Try another town or another category."
};

const pt: Dict = {
  "map.nav": "Mapa",
  "map.title": "A cidade num mapa",
  "map.titleIn": "{city} num mapa",
  "map.description":
    "Hotéis, restaurantes, parques de estacionamento e imóveis, cada um no seu lugar. Toque num marcador para abrir a página.",
  "map.town": "Cidade",
  "map.all": "Tudo",
  "map.kind.HOTEL": "Hotel",
  "map.kind.RESTAURANT": "Restaurante",
  "map.kind.PARKING": "Parque de estacionamento",
  "map.kind.PROPERTY": "Imóvel",
  "map.chip.HOTEL": "Hotéis",
  "map.chip.RESTAURANT": "Restaurantes",
  "map.chip.PARKING": "Estacionamentos",
  "map.chip.PROPERTY": "Imóveis",
  "map.open": "Ver a página",
  "map.seeOnMap": "Ver no mapa",
  "map.vehicles": "Veículos à venda: {n}",
  "map.label": "Mapa dos locais em {city}",
  "map.emptyTitle": "Ainda não há locais com posição no mapa aqui.",
  "map.emptyBody": "Experimente outra cidade ou outra categoria."
};

const es: Dict = {
  "map.nav": "Mapa",
  "map.title": "La ciudad en un mapa",
  "map.titleIn": "{city} en un mapa",
  "map.description":
    "Hoteles, restaurantes, aparcamientos e inmuebles, cada uno en su sitio. Toque un marcador para abrir su página.",
  "map.town": "Ciudad",
  "map.all": "Todo",
  "map.kind.HOTEL": "Hotel",
  "map.kind.RESTAURANT": "Restaurante",
  "map.kind.PARKING": "Aparcamiento",
  "map.kind.PROPERTY": "Inmueble",
  "map.chip.HOTEL": "Hoteles",
  "map.chip.RESTAURANT": "Restaurantes",
  "map.chip.PARKING": "Aparcamientos",
  "map.chip.PROPERTY": "Inmuebles",
  "map.open": "Ver la página",
  "map.seeOnMap": "Ver en el mapa",
  "map.vehicles": "Vehículos en venta: {n}",
  "map.label": "Mapa de los lugares en {city}",
  "map.emptyTitle": "Todavía no hay lugares con posición en el mapa aquí.",
  "map.emptyBody": "Pruebe otra ciudad u otra categoría."
};

const zh: Dict = {
  "map.nav": "地图",
  "map.title": "城市地图",
  "map.titleIn": "{city} 地图",
  "map.description": "酒店、餐厅、停车场和房产，各在其位。点按图钉即可打开其页面。",
  "map.town": "城市",
  "map.all": "全部",
  "map.kind.HOTEL": "酒店",
  "map.kind.RESTAURANT": "餐厅",
  "map.kind.PARKING": "停车场",
  "map.kind.PROPERTY": "房产",
  "map.chip.HOTEL": "酒店",
  "map.chip.RESTAURANT": "餐厅",
  "map.chip.PARKING": "停车场",
  "map.chip.PROPERTY": "房产",
  "map.open": "打开页面",
  "map.seeOnMap": "在地图上查看",
  "map.vehicles": "在售车辆：{n}",
  "map.label": "{city} 的地点地图",
  "map.emptyTitle": "这里还没有标注在地图上的地点。",
  "map.emptyBody": "请尝试其他城市或其他类别。"
};

const ar: Dict = {
  "map.nav": "الخريطة",
  "map.title": "المدينة على الخريطة",
  "map.titleIn": "{city} على الخريطة",
  "map.description": "الفنادق والمطاعم ومواقف السيارات والعقارات، كلٌّ في مكانه. المس دبوسًا لفتح صفحته.",
  "map.town": "المدينة",
  "map.all": "الكل",
  "map.kind.HOTEL": "فندق",
  "map.kind.RESTAURANT": "مطعم",
  "map.kind.PARKING": "موقف سيارات",
  "map.kind.PROPERTY": "عقار",
  "map.chip.HOTEL": "الفنادق",
  "map.chip.RESTAURANT": "المطاعم",
  "map.chip.PARKING": "مواقف السيارات",
  "map.chip.PROPERTY": "العقارات",
  "map.open": "عرض الصفحة",
  "map.seeOnMap": "عرض على الخريطة",
  "map.vehicles": "مركبات للبيع: {n}",
  "map.label": "خريطة الأماكن في {city}",
  "map.emptyTitle": "لا توجد هنا بعد أماكن محددة على الخريطة.",
  "map.emptyBody": "جرّب مدينة أخرى أو فئة أخرى."
};

const ru: Dict = {
  "map.nav": "Карта",
  "map.title": "Город на карте",
  "map.titleIn": "{city} на карте",
  "map.description":
    "Отели, рестораны, автостоянки и недвижимость — каждый на своём месте. Нажмите на метку, чтобы открыть страницу.",
  "map.town": "Город",
  "map.all": "Все",
  "map.kind.HOTEL": "Отель",
  "map.kind.RESTAURANT": "Ресторан",
  "map.kind.PARKING": "Автостоянка",
  "map.kind.PROPERTY": "Недвижимость",
  "map.chip.HOTEL": "Отели",
  "map.chip.RESTAURANT": "Рестораны",
  "map.chip.PARKING": "Автостоянки",
  "map.chip.PROPERTY": "Недвижимость",
  "map.open": "Открыть",
  "map.seeOnMap": "Показать на карте",
  "map.vehicles": "Автомобили в продаже: {n}",
  "map.label": "Карта мест в городе {city}",
  "map.emptyTitle": "Здесь пока нет мест с отметкой на карте.",
  "map.emptyBody": "Попробуйте другой город или другую категорию."
};

const townMapMessages = { fr, en, pt, es, zh, ar, ru };
export default townMapMessages;
