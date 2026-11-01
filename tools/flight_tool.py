import os

import requests

from dotenv import load_dotenv

load_dotenv()


def search_flights(
    departure_iata: str,
    arrival_iata: str,
    flight_date: str,
    api_key: str | None = None,
    limit: int = 5,
) -> list[dict[str, str]]:
    key = api_key or os.getenv("AVIATIONSTACK_API_KEY")
    if not key:
        raise ValueError("AVIATIONSTACK_API_KEY is not configured.")

    response = requests.get(
        "https://api.aviationstack.com/v1/flights",
        params={
            "access_key": key,
            "dep_iata": departure_iata,
            "arr_iata": arrival_iata,
            "flight_date": flight_date,
            "limit": limit,
        },
        timeout=(5, 15),
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload.get("data"), list):
        raise ValueError("Flight provider returned an unexpected response.")

    flights = []
    for flight in payload["data"]:
        airline = flight.get("airline") or {}
        flight_info = flight.get("flight") or {}
        departure = flight.get("departure") or {}
        arrival = flight.get("arrival") or {}
        flights.append(
            {
                "airline": airline.get("name") or "Unknown airline",
                "flight_number": flight_info.get("iata") or "—",
                "departure_airport": departure.get("airport") or departure_iata,
                "departure_time": departure.get("scheduled") or "—",
                "arrival_airport": arrival.get("airport") or arrival_iata,
                "arrival_time": arrival.get("scheduled") or "—",
                "status": flight.get("flight_status") or "Unknown",
            }
        )
    return flights
