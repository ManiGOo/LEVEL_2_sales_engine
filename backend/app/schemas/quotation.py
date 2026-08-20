from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, field_validator


class QuotationLineItem(BaseModel):
    category: str = ""
    description: str = ""
    qty: float = 1
    unit: str = ""
    unit_price: float = 0
    type: str = "one_time"  # one_time | recurring
    discount_pct: float = 0

    @field_validator("type")
    @classmethod
    def _type_ok(cls, v: str) -> str:
        return v if v in ("one_time", "recurring") else "one_time"


class QuotationCreate(BaseModel):
    company_key: str
    company_name: str
    title: str = "Commercial Proposal"
    currency: str = "USD"
    status: str = "draft"
    valid_until: date | None = None
    intro: str | None = None
    terms: str | None = None
    notes: str | None = None
    tax_pct: float = 0
    line_items: list[QuotationLineItem] = []


class QuotationUpdate(BaseModel):
    title: str | None = None
    currency: str | None = None
    status: str | None = None
    valid_until: date | None = None
    intro: str | None = None
    terms: str | None = None
    notes: str | None = None
    tax_pct: float | None = None
    line_items: list[QuotationLineItem] | None = None


class QuotationLineItemResponse(BaseModel):
    category: str = ""
    description: str = ""
    qty: float = 1
    unit: str = ""
    unit_price: float = 0
    type: str = "one_time"
    discount_pct: float = 0
    line_total: float = 0

    model_config = {"from_attributes": True}


class QuotationResponse(BaseModel):
    id: str
    company_key: str
    company_name: str
    quote_number: str
    status: str
    currency: str
    title: str
    valid_until: date | None = None
    intro: str | None = None
    terms: str | None = None
    notes: str | None = None
    line_items: list[QuotationLineItemResponse] = []
    subtotal: float = 0
    discount_total: float = 0
    tax_pct: float = 0
    tax_amount: float = 0
    total: float = 0
    owner_id: str | None = None
    owner_email: str | None = None
    version: int = 1
    html: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuotationListItem(BaseModel):
    id: str
    company_key: str
    company_name: str
    quote_number: str
    status: str
    currency: str
    title: str
    total: float
    valid_until: date | None = None
    version: int = 1
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuotationListPage(BaseModel):
    items: list[QuotationListItem]
    total: int
    page: int
    page_size: int
    pages: int


class QuotationRender(BaseModel):
    html: str


class QuotationDocumentSave(BaseModel):
    html: str
    expected_version: int | None = None


class QuotationVersionMeta(BaseModel):
    version: int
    created_at: datetime
    created_by_email: str | None = None
    status: str
    total: float
    has_html: bool

    model_config = {"from_attributes": True}


class QuotationVersionDetail(BaseModel):
    version: int
    created_at: datetime
    created_by_email: str | None = None
    status: str
    total: float
    data: dict
    html: str | None = None

    model_config = {"from_attributes": True}
