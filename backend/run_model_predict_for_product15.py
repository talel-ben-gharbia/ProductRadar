import urllib.request, json

history_url = "http://127.0.0.1:8000/price-history?productId=15"
model_url = "http://127.0.0.1:8002/predict"
headers = {"X-Firebase-Uid": "Cf76VxebxNUZsRckJLl5B1OAdv52"}

req = urllib.request.Request(history_url, headers=headers)
with urllib.request.urlopen(req) as resp:
    rows = json.load(resp)

# Prepare payload for model
payload = {"rows": rows}

data = json.dumps(payload).encode('utf-8')
req2 = urllib.request.Request(model_url, data=data, headers={"Content-Type": "application/json"}, method='POST')
with urllib.request.urlopen(req2) as resp2:
    print(resp2.read().decode())
