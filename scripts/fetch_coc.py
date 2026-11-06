import json, os, sys, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

TOKEN = os.environ.get("COC_API_TOKEN", "").strip()
TAG = os.environ.get("CLAN_TAG", "").strip().replace("#", "").upper()
OUT = Path("data/dashboard.json")
BASE = "https://api.clashofclans.com/v1"

def api(path):
    req = urllib.request.Request(
        BASE + path,
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json",
                 "User-Agent": "ClashOps-GitHubDashboard/1.0"}
    )
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))

def main():
    if not TOKEN or not TAG:
        raise SystemExit("Set COC_API_TOKEN dan CLAN_TAG di GitHub repository secrets/variables.")
    encoded = quote("#" + TAG, safe="")
    result = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "clan": {}, "members": [], "currentWar": {"state": "unknown"},
        "error": None
    }
    try:
        clan = api(f"/clans/{encoded}")
        result["clan"] = {
            "tag": clan.get("tag"), "name": clan.get("name"),
            "clanLevel": clan.get("clanLevel"), "clanPoints": clan.get("clanPoints"),
            "members": clan.get("members")
        }
        roster = api(f"/clans/{encoded}/members")
        result["members"] = [{
            "tag": m.get("tag"), "name": m.get("name"),
            "role": m.get("role"), "townHallLevel": m.get("townHallLevel"),
            "trophies": m.get("trophies")
        } for m in roster.get("items", [])]

        try:
            war = api(f"/clans/{encoded}/currentwar")
            result["currentWar"] = {
                "state": war.get("state", "unknown"),
                "teamSize": war.get("teamSize"),
                "startTime": war.get("startTime"),
                "endTime": war.get("endTime"),
                "clan": {
                    "name": (war.get("clan") or {}).get("name"),
                    "stars": (war.get("clan") or {}).get("stars"),
                    "destructionPercentage": (war.get("clan") or {}).get("destructionPercentage")
                },
                "opponent": {
                    "name": (war.get("opponent") or {}).get("name"),
                    "stars": (war.get("opponent") or {}).get("stars"),
                    "destructionPercentage": (war.get("opponent") or {}).get("destructionPercentage")
                }
            }
        except urllib.error.HTTPError as exc:
            # 403 sering berarti war log/current war disembunyikan atau clan belum memenuhi syarat API.
            result["currentWar"] = {"state": "unknown"}
            result["error"] = f"Data clan berhasil, tetapi current war tidak dapat dibaca (HTTP {exc.code}). Periksa pengaturan war log/API."
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Clash API error HTTP {exc.code}: {body[:500]}")
    except Exception as exc:
        raise SystemExit(f"Gagal mengambil data Clash of Clans: {exc}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Dashboard data updated: clan={result['clan'].get('name')}, members={len(result['members'])}")

if __name__ == "__main__":
    main()
