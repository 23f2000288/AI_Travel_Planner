import os
import unittest
from datetime import date, timedelta
from unittest.mock import patch

from fastapi.testclient import TestClient

import app


class TravelPlannerApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app.app)
        self.departure = date.today() + timedelta(days=30)
        self.payload = {
            "origin": "New York",
            "destination": "Lisbon",
            "departure_date": self.departure.isoformat(),
            "return_date": (self.departure + timedelta(days=2)).isoformat(),
            "travelers": 2,
            "budget": 2400,
            "currency": "USD",
            "travel_style": "balanced",
            "interests": ["Food & cafes"],
        }

    @patch.dict(os.environ, {"GROQ_API_KEY": "", "TAVILY_API_KEY": "", "AVIATIONSTACK_API_KEY": ""})
    def test_health_reports_optional_integrations_without_credentials(self) -> None:
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["features"],
            {"ai": False, "research": False, "flights": False},
        )
        self.assertEqual(response.json()["orchestration"], "langgraph")

    @patch.dict(os.environ, {"GROQ_API_KEY": "", "TAVILY_API_KEY": "", "AVIATIONSTACK_API_KEY": ""})
    @patch("app._get_flights", return_value=[])
    @patch("app._get_research", return_value=[])
    @patch(
        "app._create_ai_draft",
        return_value=(
            app.TripDraft(
                summary="A thoughtful three-day Lisbon trip.",
                days=[
                    app.DayDraft(
                        title=f"Day {day}",
                        description="Take the day at your own pace.",
                        activities=["Explore a local neighborhood", "Try a local cafe"],
                    )
                    for day in range(1, 4)
                ],
                tips=["Check opening hours.", "Leave room to wander."],
            ),
            "ai",
        ),
    )
    def test_plan_returns_daily_itinerary_and_balanced_budget(
        self, _research: object, _flights: object, _draft: object
    ) -> None:
        response = self.client.post("/api/plan", json=self.payload)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(len(result["days"]), 3)
        self.assertEqual(result["days"][0]["date"], self.departure.isoformat())
        self.assertEqual(result["days"][-1]["date"], self.payload["return_date"])
        self.assertAlmostEqual(sum(result["budget_breakdown"].values()), 2400)
        self.assertEqual(result["total_estimated_cost"], 2400)
        self.assertEqual(result["generated_by"], "ai")
        self.assertEqual(
            [step["agent"] for step in result["agent_steps"]],
            [
                "Destination research",
                "Flight search",
                "Itinerary planner",
                "Budget planner",
            ],
        )
        self.assertEqual(
            [step["status"] for step in result["agent_steps"]],
            ["skipped", "skipped", "complete", "complete"],
        )

    def test_plan_rejects_return_date_before_departure(self) -> None:
        invalid_payload = {
            **self.payload,
            "return_date": (self.departure - timedelta(days=1)).isoformat(),
        }

        response = self.client.post("/api/plan", json=invalid_payload)

        self.assertEqual(response.status_code, 422)

    def test_plan_rejects_trips_longer_than_21_days(self) -> None:
        invalid_payload = {
            **self.payload,
            "return_date": (self.departure + timedelta(days=21)).isoformat(),
        }

        response = self.client.post("/api/plan", json=invalid_payload)

        self.assertEqual(response.status_code, 422)

    def test_plan_rejects_an_overlong_custom_prompt(self) -> None:
        response = self.client.post(
            "/api/plan", json={**self.payload, "prompt": "x" * 501}
        )

        self.assertEqual(response.status_code, 422)

    def test_itinerary_agent_receives_custom_prompt(self) -> None:
        request = app.TripRequest.model_validate(
            {**self.payload, "prompt": "Find local food and avoid busy attractions."}
        )
        with patch(
            "app._create_ai_draft",
            return_value=(
                app.TripDraft(
                    summary="A thoughtful three-day Lisbon trip.",
                    days=[
                        app.DayDraft(
                            title="A relaxed day",
                            description="Explore local favorites.",
                            activities=["Visit a local market", "Try a family-run cafe"],
                        )
                        for _ in range(3)
                    ],
                    tips=["Check opening hours.", "Leave room to wander."],
                ),
                "ai",
            ),
        ) as create_draft:
            result = app.itinerary_planning_agent(
                {"request": request, "number_of_days": 3, "sources": []}
            )

        create_draft.assert_called_once_with(request, 3, [], unittest.mock.ANY)
        self.assertIn("travel prompt", result["agent_steps"][0]["detail"])

    @patch.dict(os.environ, {"GROQ_API_KEY": "", "TAVILY_API_KEY": "", "AVIATIONSTACK_API_KEY": ""})
    def test_plan_works_without_optional_provider_keys(self) -> None:
        response = self.client.post("/api/plan", json=self.payload)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["generated_by"], "starter")
        self.assertEqual(len(result["days"]), 3)
        self.assertTrue(any("GROQ_API_KEY" in warning for warning in result["warnings"]))
        self.assertTrue(any("TAVILY_API_KEY" in warning for warning in result["warnings"]))


if __name__ == "__main__":
    unittest.main()
