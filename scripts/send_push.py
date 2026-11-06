import json, os, sys, urllib.request, urllib.error
from pathlib import Path
APP_ID=os.environ.get("ONESIGNAL_APP_ID","").strip()
API_KEY=os.environ.get("ONESIGNAL_REST_API_KEY","").strip()
def read_json(path):
    try:return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:return {}
def send(title,message,url):
    if not APP_ID or not API_KEY:
        print("OneSignal not configured; skipping push."); return
    payload={"app_id":APP_ID,"included_segments":["Subscribed Users"],
      "headings":{"en":title,"id":title},"contents":{"en":message,"id":message},"url":url}
    req=urllib.request.Request("https://api.onesignal.com/notifications",
      data=json.dumps(payload).encode(),
      headers={"Authorization":f"Key {API_KEY}","Content-Type":"application/json; charset=utf-8","Accept":"application/json"},
      method="POST")
    try:
      with urllib.request.urlopen(req,timeout=30) as r: print("OneSignal:",r.read().decode()[:1000])
    except urllib.error.HTTPError as e:
      print("OneSignal error:",e.code,e.read().decode(errors="replace")[:1000]); raise
def main():
    old=read_json(sys.argv[1] if len(sys.argv)>1 else "/tmp/previous-dashboard.json").get("currentWar",{})
    new=read_json("data/dashboard.json").get("currentWar",{})
    before,after=old.get("state","unknown"),new.get("state","unknown")
    if before==after: print("War state unchanged; no push."); return
    messages={
      "preparation":("War akan dimulai","Clan memasuki fase persiapan war."),
      "inWar":("WAR DIMULAI!","Battle day sudah dimulai. Cek ClashOps untuk status war."),
      "warEnded":("War selesai","War clan sudah berakhir. Buka ClashOps untuk melihat hasil."),
      "notInWar":("Status war berubah","Clan saat ini tidak sedang mengikuti war.")
    }
    if after in messages:
      title,body=messages[after]
      send(title,body,os.environ.get("PAGES_URL","https://github.com/"))
    else: print(f"No push rule for {before} -> {after}")
if __name__=="__main__":main()
