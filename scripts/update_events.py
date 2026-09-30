import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import requests


# ============================================================
# CONFIGURACIÓN
# ============================================================

API_KEY = os.environ.get("s0GBptijH8EIdA3J7rivkfArBVIJQRHT")

if not API_KEY:
    raise RuntimeError(
        "ERROR: No se encontró TICKETMASTER_API_KEY. "
        "Comprueba el secreto Consumer_Key en GitHub."
    )


API_URL = "https://app.ticketmaster.com/discovery/v2/events.json"

ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = ROOT / "data"
DATA_FILE = DATA_DIR / "events.json"


# Países que vamos a consultar
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

    # Preferimos imágenes grandes
    images = sorted(
        images,
        key=lambda image: (
            image.get("width", 0) * image.get("height", 0)
        ),
        reverse=True,
    )

    return images[0].get("url", "")


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
    # Teatro / Arte / Cultura
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
        "technology summit",
        "tech",
        "software",
        "developer",
        "developers",
        "coding",
        "computer",
        "computing",
        "artificial intelligence",
        "ai ",
        "robot",
        "robotics",
        "innovation",
        "cyber",
        "startup",
    ]

    if any(word in text for word in technology_words):
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
        "gaming expo",
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
# FECHA
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

    return {
        "id": event_id,
        "slug": slug,
        "title": title,
        "date": local_date,
        "time": local_time,
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
# CONSULTAR UN PAÍS
# ============================================================

def fetch_country(country_code):

    print()
    print("=" * 60)
    print(f"Consultando eventos de {country_code}...")
    print("=" * 60)

    events = []

    page = 0
    max_pages = 5

    while page < max_pages:

        params = {
            "apikey": API_KEY,
            "countryCode": country_code,
            "size": 200,
            "page": page,
            "sort": "date,asc",
        }

        try:

            response = requests.get(
                API_URL,
                params=params,
                timeout=30,
            )

            # Mostrar errores de Ticketmaster claramente
            if response.status_code != 200:

                print(
                    f"ERROR HTTP {response.status_code} "
                    f"para {country_code}"
                )

                try:
                    print(response.json())
                except Exception:
                    print(response.text[:1000])

                raise RuntimeError(
                    f"Ticketmaster devolvió HTTP "
                    f"{response.status_code}"
                )

            data = response.json()

        except requests.RequestException as error:

            raise RuntimeError(
                f"Error de conexión con Ticketmaster: {error}"
            )

        embedded = data.get("_embedded", {})

        page_events = embedded.get("events", [])

        if not page_events:
            break

        events.extend(page_events)

        page_info = data.get("page", {})

        total_pages = page_info.get(
            "totalPages",
            0
        )

        print(
            f"Página {page + 1}/"
            f"{total_pages or '?'} "
            f"- {len(page_events)} eventos"
        )

        page += 1

        if page >= total_pages:
            break

    print(
        f"Eventos encontrados en {country_code}: "
        f"{len(events)}"
    )

    return events


# ============================================================
# GUARDAR DATOS
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
    print("=" * 60)
    print("ARCHIVO ACTUALIZADO")
    print("=" * 60)
    print(f"Eventos: {len(events)}")
    print(f"Archivo: {DATA_FILE}")
    print("=" * 60)


# ============================================================
# PRINCIPAL
# ============================================================

def main():

    print()
    print("=" * 60)
    print("GLOBAL EVEN - ACTUALIZADOR DE EVENTOS")
    print("=" * 60)
    print()

    all_events = []

    seen_ids = set()

    successful_countries = 0
    failed_countries = 0

    for country_code in COUNTRIES:

        try:

            country_events = fetch_country(
                country_code
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

                seen_ids.add(event_id)

                all_events.append(event)

        except Exception as error:

            failed_countries += 1

            print()
            print(
                f"ERROR en {country_code}: "
                f"{error}"
            )
            print()

    # --------------------------------------------------------
    # Seguridad:
    # NO reemplazar events.json si Ticketmaster
    # devolvió cero eventos.
    # --------------------------------------------------------

    if len(all_events) == 0:

        raise RuntimeError(
            "Ticketmaster no devolvió ningún evento. "
            "Por seguridad NO se reemplazó events.json."
        )

    # --------------------------------------------------------
    # Ordenar eventos
    # --------------------------------------------------------

    all_events.sort(
        key=lambda event: (
            event.get("date", ""),
            event.get("time", ""),
            event.get("title", ""),
        )
    )

    # --------------------------------------------------------
    # Guardar
    # --------------------------------------------------------

    save_events(all_events)

    # --------------------------------------------------------
    # Resumen
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("RESUMEN")
    print("=" * 60)
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
    print("=" * 60)


if __name__ == "__main__":
    main()
