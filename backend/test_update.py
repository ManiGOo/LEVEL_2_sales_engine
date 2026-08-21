import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.schemas.quotation import QuotationUpdate
from datetime import date

q = QuotationUpdate.model_validate({"quotation_date": "2026-08-25"})
print("Parsed:", q)
print("Dumped exclude_unset=True:", q.model_dump(exclude_unset=True))
