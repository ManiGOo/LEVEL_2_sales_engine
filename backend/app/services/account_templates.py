"""Default, research-backed sales-process workflows the user can apply to an account.

These mirror a typical B2B / tech-sales deal motion. Each template stage carries a
suggested ``objective`` and a set of ``data`` field placeholders the user fills in
as the deal progresses. Templates are the source of truth (returned by the API)
so the frontend picker and the apply endpoint never drift apart.
"""

from typing import Optional


class TemplateStage:
    def __init__(
        self,
        name: str,
        objective: str = "",
        status: str = "planned",
        fields: Optional[list[str]] = None,
    ):
        self.name = name
        self.objective = objective
        self.status = status
        # Field placeholders are stored as an ordered dict of empty values.
        self.data = {f: "" for f in (fields or [])}


class AccountTemplate:
    def __init__(self, key: str, name: str, description: str, stages: list[TemplateStage]):
        self.key = key
        self.name = name
        self.description = description
        self.stages = stages

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "name": self.name,
            "description": self.description,
            "stages": [
                {
                    "name": s.name,
                    "objective": s.objective,
                    "status": s.status,
                    "fields": list(s.data.keys()),
                }
                for s in self.stages
            ],
        }


# Research-based stages for a B2B / SaaS tech-sales deal (ordered by the motion).
TECH_SALES = AccountTemplate(
    key="tech_sales",
    name="Tech Sales Pipeline",
    description="Standard B2B / SaaS deal motion: plan, connect, demo, consult, trial, step up, win.",
    stages=[
        TemplateStage(
            "Planning",
            "Define the account plan, ideal customer profile and success criteria.",
            "active",
            ["Owner", "Target Date", "Goal", "Notes"],
        ),
        TemplateStage(
            "Connected",
            "Establish first contact and connect with a stakeholder / champion.",
            "planned",
            ["Contact Name", "Channel", "Date Connected", "Next Action"],
        ),
        TemplateStage(
            "Demo",
            "Run a product demo tailored to the champion's use case.",
            "planned",
            ["Demo Date", "Attendees", "Recording URL", "Feedback"],
        ),
        TemplateStage(
            "Consulted",
            "Discovery / consultation to map needs, pain points and requirements.",
            "planned",
            ["Consultant", "Summary", "Pain Points", "Requirements"],
        ),
        TemplateStage(
            "Trial Stage",
            "Run a proof-of-concept or free trial and track adoption.",
            "planned",
            ["Trial Start", "Trial End", "Usage Score", "Success Criteria"],
        ),
        TemplateStage(
            "Step Up",
            "Move up to the economic buyer and expand the stakeholder map.",
            "planned",
            ["Champion", "Decision Maker", "Next Step"],
        ),
        TemplateStage(
            "Deal Winning",
            "Negotiate terms, send the proposal and drive to close.",
            "planned",
            ["Amount", "Close Date", "Proposal URL", "Competition"],
        ),
        TemplateStage(
            "Completed",
            "Deal won and handed off to onboarding / success.",
            "planned",
            ["Won Amount", "Date", "Owner Success"],
        ),
        TemplateStage(
            "Rejected",
            "Deal lost or disqualified — capture the reason for learning.",
            "planned",
            ["Reason", "Lost To", "Date"],
        ),
    ],
)

SIMPLE_PIPELINE = AccountTemplate(
    key="simple",
    name="Simple Pipeline",
    description="A lean 5-step pipeline for faster, lower-complexity deals.",
    stages=[
        TemplateStage("Lead", "Capture and qualify the inbound/outbound lead.", "active", ["Source", "Owner"]),
        TemplateStage("Qualified", "Confirm need, budget and timeline.", "planned", ["Budget", "Timeline", "Need"]),
        TemplateStage("Proposal", "Send a tailored proposal / quote.", "planned", ["Amount", "Proposal URL"]),
        TemplateStage("Negotiation", "Align on terms and remove blockers.", "planned", ["Blockers", "Next Step"]),
        TemplateStage("Closed", "Deal closed — won or lost.", "planned", ["Outcome", "Date"]),
    ],
)

ENTERPRISE_DEAL = AccountTemplate(
    key="enterprise",
    name="Enterprise Deal",
    description="Long-cycle enterprise motion with formal validation and sign-off.",
    stages=[
        TemplateStage("Discovery", "Map the organisation, stakeholders and business case.", "active", ["Sponsor", "Business Case", "Budget"]),
        TemplateStage("Technical Validation", "Architecture review and technical sign-off.", "planned", ["SE Owner", "Arch Notes", "Status"]),
        TemplateStage("POC", "Proof-of-concept with success metrics.", "planned", ["POC Start", "Metrics", "Result"]),
        TemplateStage("Commercial", "Pricing, security and legal review.", "planned", ["Amount", "Legal Owner", "Red Lines"]),
        TemplateStage("Signature", "Procurement and contract signature.", "planned", ["Close Date", "Procurement"]),
        TemplateStage("Closed Won", "Contract signed and booked.", "planned", ["ACV", "Date"]),
    ],
)

ACCOUNT_TEMPLATES: list[AccountTemplate] = [TECH_SALES, SIMPLE_PIPELINE, ENTERPRISE_DEAL]


def list_templates() -> list[dict]:
    return [t.to_dict() for t in ACCOUNT_TEMPLATES]


def get_template(key: str) -> AccountTemplate | None:
    return next((t for t in ACCOUNT_TEMPLATES if t.key == key), None)
