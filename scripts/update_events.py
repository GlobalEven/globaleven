import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import requests


API_KEY = os.environ.get("TICKETMASTER_API_KEY")

if not API_KEY:
    raise RuntimeError("No se encontró la variable TICKETMASTER_API_KEY")


API_URL = "https://app.ticketmaster.com/discovery/v2/events.json"

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATA_FILE = DATA_DIR / "events.json"


# Países que queremos consultar inicialmente.
# Después podemos ampliar esta lista.
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

    # Preferimos imágenes grandes.
    images = sorted(
        images,
        key=lambda image: (
            image.get("width", 0) * image.get("height", 0)
        ),
        reverse=True,
    )

    return images[0].get("url", "")


def get_classification(event):
    classifications = event.get("classifications", [])

    if not classifications:
        return {
            "category": "otros",
            "categoryName": "Otros",
        }

    classification = classifications[0]

    segment = classification.get("segment", {})
    segment_name = segment.get("name", "")

    segment_map = {
        "Music": ("conciertos", "Conciertos"),
        "Sports": ("deportes", "Deportes"),
        "Arts & Theatre": ("cultura", "Cultura"),
        "Film": ("cultura", "Cultura"),
        "Miscellaneous": ("otros", "Otros"),
    }

    if segment_name in segment_map:
        category, category_name = segment_map[segment_name]

        return {
            "category": category,
            "categoryName": category_name,
        }

    return {
        "category": "otros",
        "categoryName": "Otros",
    }


def get_event_date(event):
    dates = event.get("dates", {})
    start = dates.get("start", {})

    local_date = start.get("localDate", "")
    local_time = start.get("localTime", "")

    return local_date, local_time


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


def normalize_event(event):
    event_id = event.get("id")

    if not event_id:
        return None

    local_date, local_time = get_event_date(event)

    location = get_location(event)
    classification = get_classification(event)

    title = event.get("name", "Evento")

    slug = slugify(title)

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
        "description": event.get("info", "")
            or event.get("pleaseNote", "")
            or "",
        "url": event.get("url", ""),
        "source": "ticketmaster",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


def fetch_country(country_code):
    print(f"Consultando eventos de {country_code}...")

    events = []

    page = 0

    while page < 5:
        params = {
            "apikey": API_KEY,
            "countryCode": country_code,
            "size": 200,
            "page": page,
            "sort": "date,asc",
        }

        response = requests.get(
            API_URL,
            params=params,
            timeout=30,
        )

        response.raise_for_status()

        data = response.json()

        embedded = data.get("_embedded", {})
        page_events = embedded.get("events", [])

        if not page_events:
            break

        events.extend(page_events)

        page_info = data.get("page", {})

        total_pages = page_info.get("totalPages", 0)

        print(
            f"  Página {page + 1}/{total_pages or '?'}"
        )

        page += 1

        if page >= total_pages:
            break

    return events


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    all_events = []
    seen_ids = set()

    for country_code in COUNTRIES:

        try:
            country_events = fetch_country(country_code)

            for raw_event in country_events:

                event = normalize_event(raw_event)

                if not event:
                    continue

                if event["id"] in seen_ids:
                    continue

                seen_ids.add(event["id"])
                all_events.append(event)

        except Exception as error:
            print(
                f"ERROR consultando {country_code}: {error}"
            )

    # Eliminamos eventos sin fecha.
    all_events = [
        event
        for event in all_events
        if event.get("date")
    ]

    # Orden cronológico.
    all_events.sort(
        key=lambda event: (
            event.get("date", ""),
            event.get("time", ""),
            event.get("title", ""),
        )
    )

    output = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "total": len(all_events),
        "events": all_events,
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
    print("====================================")
    print("GlobalEven actualizado")
    print(f"Eventos encontrados: {len(all_events)}")
    print(f"Archivo: {DATA_FILE}")
    print("====================================")


if __name__ == "__main__":
    main()
