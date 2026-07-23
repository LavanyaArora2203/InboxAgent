import os
import json

credentials = json.loads(os.environ["GOOGLE_CREDENTIALS"])

with open("credentials.json", "w") as f:
    json.dump(credentials, f)