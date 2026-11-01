import requests


def tavily_search(
    query: str, api_key: str, max_results: int = 5
) -> list[dict[str, str]]:
    response = requests.post(
        "https://api.tavily.com/search",
        json={
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "max_results": max_results,
            "include_answer": False,
        },
        timeout=(5, 15),
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload.get("results"), list):
        raise ValueError("Research provider returned an unexpected response.")

    results = []
    for result in payload["results"]:
        snippet = (result.get("content") or "").strip()
        if len(snippet) > 280:
            snippet = snippet[:280].rsplit(" ", 1)[0].rstrip() + "…"
        results.append(
            {
                "title": result.get("title") or "Travel inspiration",
                "url": result.get("url") or "",
                "snippet": snippet,
            }
        )
    return results
