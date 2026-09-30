import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests


# ============================================================
# CONFIGURACIÓN
# ============================================================

API_KEY = os.environ.get("TICKETMASTER_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "ERROR: No se encontró TICKETMASTER_API_KEY. "
        "Comprueba el secreto Consumer_Key en GitHub."
    )


API_URL = "https://app.ticketmaster.com/discovery/v2/events.json"

ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = ROOT / "data"
DATA_FILE = DATA_DIR / "events.json"


# ============================================================
# PAÍSES
# ============================================================

COUNTRIES = {
    "AR": "Argentina",
    "BR": "Brasil",
    "CL": "Chile",
    "CO": "Colombia",
    "MX": "México",
    "PE": "Perú",
    "US": "Estados Unidos",
    "CA": "Canadá",
    "ES": "España",
    "GB": "Reino Unido",
    "FR": "Francia",
    "IT": "Italia",
    "DE": "Alemania",
    "NL": "Países Bajos",
    "PT": "Portugal",
    "AU": "Australia",
    "NZ": "Nueva Zelanda",
    "JP": "Japón",
}


# ============================================================
# PERÍODOS DE EVENTOS
# ============================================================

# Guardamos:
#
# - eventos pasados recientes
# - eventos actuales
# - eventos futuros
#
# La API de Ticketmaster permite utilizar startDateTime
# y endDateTime para buscar por rango de fechas.
#
# Se conservarán 30 días hacia atrás y 365 días hacia adelante.
#
# Esto permite que GlobalEven tenga historial reciente y
# una buena cantidad de eventos próximos.
# ============================================================

PAST_DAYS = 30
FUTURE_DAYS = 365


# ============================================================
# UTILIDADES
# ============================================================

def slugify(text):

    text = str(text or "").lower().strip()

    replacements = {
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",
        "ü": "u",
        "ñ": "n",
        "ç": "c",
        "ã": "a",
        "õ": "o",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text)

    return text.strip("-")


def get_image(event):

    images = event.get("images", [])

    if not images:
        return ""

    images = sorted(
        images,
        key=lambda image: (
            image.get("width", 0) * image.get("height", 0)
        ),
        reverse=True,
    )

    return images[0].get("url", "")


def get_now():

    return datetime.now(timezone.utc)


def iso_utc(value):

    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


# ============================================================
# CATEGORÍAS
# ============================================================

def get_classification(event):

    classifications = event.get("classifications", [])

    if not classifications:

        return {
            "category": "otros",
            "categoryName": "Otros",
        }

    classification = classifications[0]

    segment = classification.get("segment", {})
    genre = classification.get("genre", {})
    subgenre = classification.get("subGenre", {})

    segment_name = segment.get("name", "")
    genre_name = genre.get("name", "")
    subgenre_name = subgenre.get("name", "")

    text = (
        f"{segment_name} "
        f"{genre_name} "
        f"{subgenre_name} "
        f"{event.get('name', '')}"
    ).lower()

    # --------------------------------------------------------
    # Música
    # --------------------------------------------------------

    if segment_name == "Music":

        return {
            "category": "conciertos",
            "categoryName": "Conciertos",
        }

    # --------------------------------------------------------
    # Deportes
    # --------------------------------------------------------

    if segment_name == "Sports":

        return {
            "category": "deportes",
            "categoryName": "Deportes",
        }

    # --------------------------------------------------------
    # Arte / Teatro / Cultura
    # --------------------------------------------------------

    if segment_name == "Arts & Theatre":

        return {
            "category": "cultura",
            "categoryName": "Cultura",
        }

    # --------------------------------------------------------
    # Cine
    # --------------------------------------------------------

    if segment_name == "Film":

        return {
            "category": "cultura",
            "categoryName": "Cultura",
        }

    # --------------------------------------------------------
    # Tecnología
    # --------------------------------------------------------

    technology_words = [
        "technology",
        "tech",
        "software",
        "developer",
        "developers",
        "coding",
        "computer",
        "computing",
        "artificial intelligence",
        "artificial-intelligence",
        " ai ",
        "robot",
        "robotics",
        "innovation",
        "cyber",
        "startup",
    ]

    if any(word in f" {text} " for word in technology_words):

        return {
            "category": "tecnologia",
            "categoryName": "Tecnología",
        }

    # --------------------------------------------------------
    # Gaming
    # --------------------------------------------------------

    gaming_words = [
        "gaming",
        "gamer",
        "esports",
        "e-sports",
        "video game",
        "videogame",
        "playstation",
        "xbox",
        "nintendo",
    ]

    if any(word in text for word in gaming_words):

        return {
            "category": "gaming",
            "categoryName": "Gaming",
        }

    # --------------------------------------------------------
    # Gastronomía
    # --------------------------------------------------------

    food_words = [
        "food festival",
        "food",
        "gastronomy",
        "gastronomic",
        "culinary",
        "restaurant",
        "wine",
        "beer",
        "cooking",
        "chef",
    ]

    if any(word in text for word in food_words):

        return {
            "category": "gastronomia",
            "categoryName": "Gastronomía",
        }

    # --------------------------------------------------------
    # Familia
    # --------------------------------------------------------

    family_words = [
        "family",
        "children",
        "kids",
        "childrens",
        "family event",
    ]

    if any(word in text for word in family_words):

        return {
            "category": "familia",
            "categoryName": "Familia",
        }

    # --------------------------------------------------------
    # Otros
    # --------------------------------------------------------

    return {
        "category": "otros",
        "categoryName": "Otros",
    }


# ============================================================
# FECHA DEL EVENTO
# ============================================================

def get_event_date(event):

    dates = event.get("dates", {})
    start = dates.get("start", {})

    local_date = start.get("localDate", "")
    local_time = start.get("localTime", "")

    return local_date, local_time


# ============================================================
# UBICACIÓN
# ============================================================

def get_location(event):

    embedded = event.get("_embedded", {})

    venues = embedded.get("venues", [])

    if not venues:

        return {
            "venue": "",
            "city": "",
            "country": "",
            "countryCode": "",
        }

    venue = venues[0]

    city_data = venue.get("city", {})
    country_data = venue.get("country", {})

    return {
        "venue": venue.get("name", ""),
        "city": city_data.get("name", ""),
        "country": country_data.get("name", ""),
        "countryCode": country_data.get("countryCode", ""),
    }


# ============================================================
# ESTADO DEL EVENTO
# ============================================================

def get_event_status(event):

    dates = event.get("dates", {})

    start = dates.get("start", {})
    end = dates.get("end", {})

    start_datetime = start.get("dateTime")
    end_datetime = end.get("dateTime")

    now = get_now()

    # --------------------------------------------------------
    # Si tenemos fecha/hora exacta de finalización
    # --------------------------------------------------------

    if end_datetime:

        try:

            event_end = datetime.fromisoformat(
                end_datetime.replace("Z", "+00:00")
            )

            if event_end < now:

                return "pasado"

        except ValueError:
            pass

    # --------------------------------------------------------
    # Fecha/hora de comienzo
    # --------------------------------------------------------

    if start_datetime:

        try:

            event_start = datetime.fromisoformat(
                start_datetime.replace("Z", "+00:00")
            )

            if event_start > now:

                return "proximo"

            if end_datetime:

                try:

                    event_end = datetime.fromisoformat(
                        end_datetime.replace("Z", "+00:00")
                    )

                    if event_start <= now <= event_end:

                        return "ahora"

                except ValueError:

                    pass

            # Si comenzó pero no tenemos hora final
            # se considera actual si ocurrió hoy.

            local_date = start.get("localDate", "")

            if local_date == now.strftime("%Y-%m-%d"):

                return "ahora"

            return "pasado"

        except ValueError:

            pass

    # --------------------------------------------------------
    # Sin dateTime exacto
    # --------------------------------------------------------

    local_date = start.get("localDate", "")

    if local_date:

        try:

            event_date = datetime.strptime(
                local_date,
                "%Y-%m-%d"
            ).date()

            today = now.date()

            if event_date > today:

                return "proximo"

            if event_date == today:

                return "ahora"

            return "pasado"

        except ValueError:

            pass

    return "proximo"


# ============================================================
# NORMALIZAR EVENTO
# ============================================================

def normalize_event(event):

    event_id = event.get("id")

    if not event_id:

        return None

    local_date, local_time = get_event_date(event)

    if not local_date:

        return None

    location = get_location(event)

    classification = get_classification(event)

    title = event.get("name", "Evento")

    slug = slugify(title)

    description = (
        event.get("info", "")
        or event.get("pleaseNote", "")
        or ""
    )

    dates = event.get("dates", {})

    start = dates.get("start", {})
    end = dates.get("end", {})

    event_status = get_event_status(event)

    return {

        "id": event_id,

        "slug": slug,

        "title": title,

        "date": local_date,

        "time": local_time,

        "startDateTime": start.get(
            "dateTime",
            ""
        ),

        "endDateTime": end.get(
            "dateTime",
            ""
        ),

        "status": event_status,

        "city": location["city"],

        "country": location["country"],

        "countryCode": location["countryCode"],

        "category": classification["category"],

        "categoryName": classification["categoryName"],

        "venue": location["venue"],

        "image": get_image(event),

        "description": description,

        "url": event.get("url", ""),

        "source": "ticketmaster",
    }


# ============================================================
# CONSULTAR TICKETMASTER
# ============================================================

def fetch_country(
    country_code,
    start_datetime,
    end_datetime
):

    print()
    print("=" * 70)
    print(
        f"Consultando {country_code} | "
        f"{start_datetime} → {end_datetime}"
    )
    print("=" * 70)

    events = []

    page = 0

    max_pages = 5

    while page < max_pages:

        params = {

            "apikey": API_KEY,

            "countryCode": country_code,

            "startDateTime": start_datetime,

            "endDateTime": end_datetime,

            "includeTBA": "no",

            "includeTBD": "no",

            "size": 200,

            "page": page,

            "sort": "date,asc",
        }

        try:

            response = requests.get(
                API_URL,
                params=params,
                timeout=45,
            )

            if response.status_code != 200:

                print(
                    f"ERROR HTTP "
                    f"{response.status_code} "
                    f"para {country_code}"
                )

                try:

                    print(response.json())

                except Exception:

                    print(
                        response.text[:1000]
                    )

                raise RuntimeError(
                    f"Ticketmaster devolvió "
                    f"HTTP {response.status_code}"
                )

            data = response.json()

        except requests.RequestException as error:

            raise RuntimeError(
                "Error de conexión con "
                f"Ticketmaster: {error}"
            )

        embedded = data.get(
            "_embedded",
            {}
        )

        page_events = embedded.get(
            "events",
            []
        )

        if not page_events:

            break

        events.extend(
            page_events
        )

        page_info = data.get(
            "page",
            {}
        )

        total_pages = page_info.get(
            "totalPages",
            0
        )

        print(
            f"Página {page + 1}/"
            f"{total_pages or '?'} "
            f"- "
            f"{len(page_events)} eventos"
        )

        page += 1

        if page >= total_pages:

            break

    print(
        f"Eventos encontrados en "
        f"{country_code}: "
        f"{len(events)}"
    )

    return events


# ============================================================
# GUARDAR
# ============================================================

def save_events(events):

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    now = datetime.now(
        timezone.utc
    ).isoformat()

    output = {

        "updatedAt": now,

        "total": len(events),

        "events": events,
    }

    with open(
        DATA_FILE,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            output,
            file,
            ensure_ascii=False,
            indent=2,
        )

    print()
    print("=" * 70)
    print("ARCHIVO ACTUALIZADO")
    print("=" * 70)
    print(
        f"Eventos: {len(events)}"
    )
    print(
        f"Archivo: {DATA_FILE}"
    )
    print("=" * 70)


# ============================================================
# PRINCIPAL
# ============================================================

def main():

    print()
    print("=" * 70)
    print(
        "GLOBALEVEN - "
        "ACTUALIZADOR REAL DE EVENTOS"
    )
    print("=" * 70)

    now = get_now()

    past_start = now - timedelta(
        days=PAST_DAYS
    )

    future_end = now + timedelta(
        days=FUTURE_DAYS
    )

    start_datetime = iso_utc(
        past_start
    )

    end_datetime = iso_utc(
        future_end
    )

    print()
    print(
        f"Período: "
        f"{start_datetime} "
        f"→ "
        f"{end_datetime}"
    )

    all_events = []

    seen_ids = set()

    successful_countries = 0

    failed_countries = 0

    for country_code in COUNTRIES:

        try:

            country_events = fetch_country(
                country_code,
                start_datetime,
                end_datetime
            )

            successful_countries += 1

            for raw_event in country_events:

                event = normalize_event(
                    raw_event
                )

                if not event:

                    continue

                event_id = event["id"]

                if event_id in seen_ids:

                    continue

                seen_ids.add(
                    event_id
                )

                all_events.append(
                    event
                )

        except Exception as error:

            failed_countries += 1

            print()

            print(
                f"ERROR en "
                f"{country_code}: "
                f"{error}"
            )

            print()

    # ========================================================
    # SEGURIDAD
    # ========================================================

    if len(all_events) == 0:

        raise RuntimeError(
            "Ticketmaster no devolvió "
            "ningún evento dentro del "
            "período solicitado. "
            "No se modificará events.json."
        )

    # ========================================================
    # ORDEN
    # ========================================================

    all_events.sort(
        key=lambda event: (
            event.get(
                "date",
                ""
            ),
            event.get(
                "time",
                ""
            ),
            event.get(
                "title",
                ""
            ),
        )
    )

    # ========================================================
    # GUARDAR
    # ========================================================

    save_events(
        all_events
    )

    # ========================================================
    # ESTADÍSTICAS
    # ========================================================

    past = sum(
        1
        for event in all_events
        if event.get("status") == "pasado"
    )

    now_events = sum(
        1
        for event in all_events
        if event.get("status") == "ahora"
    )

    upcoming = sum(
        1
        for event in all_events
        if event.get("status") == "proximo"
    )

    print()
    print("=" * 70)
    print("RESUMEN FINAL")
    print("=" * 70)

    print(
        f"Países correctos: "
        f"{successful_countries}"
    )

    print(
        f"Países con error: "
        f"{failed_countries}"
    )

    print(
        f"Eventos totales: "
        f"{len(all_events)}"
    )

    print(
        f"Eventos pasados: "
        f"{past}"
    )

    print(
        f"Eventos actuales: "
        f"{now_events}"
    )

    print(
        f"Eventos próximos: "
        f"{upcoming}"
    )

    print("=" * 70)


# ============================================================
# EJECUTAR
# ============================================================

if __name__ == "__main__":

    main()
