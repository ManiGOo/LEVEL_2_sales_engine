"""ORM models for the scraper-owned tables in the ``sdr_data`` schema.

These mirror ``db_setup.py`` in the scraper project so the sales-app can read
the already-scraped regulatory data directly, without going over the network.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Date, Boolean, MetaData, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.types import DateTime

sdr_metadata = MetaData(schema="sdr_data")
Base = declarative_base(metadata=sdr_metadata)


class RegulatoryEvent(Base):
    __tablename__ = "regulatory_events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), nullable=True)
    regulator = Column(String(50), default="CDSCO")
    event_type = Column(String(100))

    raw_details = Column(JSONB)
    llm_analysis = Column(JSONB, nullable=True)
    score = Column(Integer, default=0)
    reporting_source = Column(Text, nullable=True, server_default="")
    reported_by = Column(Text, nullable=True, server_default="")

    event_date = Column(Date, default=datetime.utcnow)

    paper_evidence_class = Column(String(20), default="")
    paper_confidence = Column(Integer, default=0)
    paper_proxies = Column(JSONB, default=list)


class FDAEvent(Base):
    __tablename__ = "fda_events"

    fda_event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(100), default="")
    firm_name = Column(Text, default="")
    product_name = Column(Text, default="")
    finding_date = Column(Date, nullable=True)
    url = Column(Text, default="")
    subject = Column(Text, default="")
    evidence_text = Column(Text, default="")
    llm_analysis = Column(JSONB, nullable=True)
    score = Column(Integer, default=0)
    paper_qms_score = Column(Integer, default=0)
    reporting_source = Column(Text, default="")
    event_date = Column(Date, default=datetime.utcnow)
    raw_details = Column(JSONB, default=dict)
    fetched_at = Column(DateTime, default=datetime.utcnow)


class EUEvent(Base):
    __tablename__ = "eu_events"

    eu_event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(100), default="")
    firm_name = Column(Text, default="")
    product_name = Column(Text, default="")
    finding_date = Column(Date, nullable=True)
    url = Column(Text, default="")
    subject = Column(Text, default="")
    evidence_text = Column(Text, default="")
    llm_analysis = Column(JSONB, nullable=True)
    score = Column(Integer, default=0)
    paper_qms_score = Column(Integer, default=0)
    reporting_source = Column(Text, default="")
    event_date = Column(Date, default=datetime.utcnow)
    raw_details = Column(JSONB, default=dict)
    fetched_at = Column(DateTime, default=datetime.utcnow)


class RegulatoryEvidence(Base):
    __tablename__ = "regulatory_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String(50))
    firm_name = Column(Text)
    mfr_key = Column(Text, index=True)
    company_key = Column(Text, index=True)
    finding_date = Column(Date, nullable=True)
    url = Column(Text)
    evidence_text = Column(Text)
    classification = Column(JSONB, nullable=True)
    paper_qms_score = Column(Integer, default=0)
    evidence_quote = Column(Text, default="")
    fetched_at = Column(DateTime, default=datetime.utcnow)


class EnrichmentCheck(Base):
    __tablename__ = "enrichment_checks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mfr_key = Column(Text, index=True)
    company_key = Column(Text, index=True)
    source = Column(String(50))
    searched_name = Column(Text, default="")
    findings_count = Column(Integer, default=0)
    inserted_count = Column(Integer, default=0)
    paper_qms_count = Column(Integer, default=0)
    status = Column(String(20), default="completed")
    error = Column(Text, default="")
    checked_at = Column(DateTime, default=datetime.utcnow)


class ScrapedRegulatoryRecord(Base):
    __tablename__ = "scraped_regulatory_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String(50), index=True)
    firm_name = Column(Text)
    finding_date = Column(Date, nullable=True)
    url = Column(Text)
    subject = Column(Text, default="")
    evidence_text = Column(Text, default="")
    status = Column(String(20), default="raw", index=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)


class WebEvidence(Base):
    __tablename__ = "web_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=True)
    mfr_key = Column(Text, index=True)
    query = Column(Text)
    title = Column(Text)
    url = Column(Text)
    source = Column(Text)
    published_date = Column(Date, nullable=True)
    snippet = Column(Text)
    full_text = Column(Text)
    classification = Column(JSONB, nullable=True)
    relevance_score = Column(Integer, default=0)
    fetch_status = Column(Text)
    fetched_at = Column(DateTime, default=datetime.utcnow)


class CompanyPhone(Base):
    __tablename__ = "company_phones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_key = Column(String(255), index=True)
    phone = Column(Text)
    phone_clean = Column(Text, index=True)
    label = Column(Text, default="")
    page_url = Column(Text, default="")
    context = Column(Text, default="")
    tel_href = Column(Text, default="")
    source = Column(String(20), default="company_website")
    found_at = Column(DateTime, default=datetime.utcnow)


class CompanyLead(Base):
    __tablename__ = "company_leads"

    company_key = Column(String(255), primary_key=True)
    company_name = Column(Text, default="")
    website = Column(Text, default="")
    linkedin_url = Column(Text, default="")
    company_status = Column(String(20), default="unknown")
    decision_makers = Column(JSONB, default=list)
    intent_signals = Column(JSONB, default=list)
    trigger_events = Column(JSONB, default=list)
    activity_summary = Column(Text, default="")
    hiring = Column(JSONB, default=list)
    hiring_news = Column(JSONB, default=list)
    summary = Column(JSONB, default=dict)
    scraped_data = Column(JSONB, default=dict)
    corporate_registry = Column(JSONB, default=dict)
    status = Column(String(20), default="not_started")
    error = Column(Text, default="")
    workflow_id = Column(Text, default="")
    fetched_at = Column(DateTime, default=datetime.utcnow)

    phones = relationship(
        "CompanyPhone",
        primaryjoin="CompanyLead.company_key == CompanyPhone.company_key",
        foreign_keys="CompanyPhone.company_key",
    )
