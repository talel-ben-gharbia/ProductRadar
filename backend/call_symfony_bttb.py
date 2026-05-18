import urllib.request

url = 'http://127.0.0.1:8000/best-time-to-buy?productId=15'
headers = {'X-Firebase-Uid': 'Cf76VxebxNUZsRckJLl5B1OAdv52'}
req = urllib.request.Request(url, headers=headers)
print(urllib.request.urlopen(req).read().decode())
