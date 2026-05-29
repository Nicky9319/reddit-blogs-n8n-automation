import os
from pyairtable import Api
from dotenv import load_dotenv

load_dotenv()

api = Api(os.getenv('AIRTABLE_API_KEY'))
print(os.getenv('AIRTABLE_API_KEY'))
table = api.table("appRFeIVD7Ga2Sl4P", "tblrWZMgpcR1zRlmg")
print(table.all())