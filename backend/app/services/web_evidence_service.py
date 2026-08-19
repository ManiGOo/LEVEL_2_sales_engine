"""Web-evidence search service backed by Temporal + the shared database.

The sales-app connects to Temporal directly to start ``WebEvidenceWorkflow``
(executed by the sales-app's own ``lead_worker``) and reads the resulting
``web_evidence`` rows from the shared ``sdr_data`` schema itself.
"""
from datetime import datetime

from app.config import get_settings
from app.core.temporal import get_temporal_client

settings = get_settings()

WORKFLOW_NAME = "WebEvidenceWorkflow"


async def search_web_evidence(event_id: str) -> dict:
    """Start a WebEvidenceWorkflow for one regulatory event on the shared
    Temporal server. Returns the workflow id the client can poll for status."""
    client = await get_temporal_client()
    workflow_id = f"web-evidence-{event_id[:8]}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    await client.start_workflow(
        WORKFLOW_NAME,
        args=[event_id],
        id=workflow_id,
        task_queue=settings.temporal_task_queue,
    )
    return {"event_id": event_id, "workflow_id": workflow_id, "status": "started"}


async def get_web_evidence_status(workflow_id: str) -> dict:
    """Return the Temporal status + progress query for a web-evidence run."""
    client = await get_temporal_client()
    handle = client.workflow.get_handle(workflow_id)
    try:
        progress = await handle.query("progress")
    except Exception as e:  # noqa: BLE001
        progress = {"error": str(e)}
    try:
        desc = await handle.describe()
        status = str(desc.status)
    except Exception as e:  # noqa: BLE001
        status = f"unknown ({e})"
    return {"workflow_id": workflow_id, "status": status, "progress": progress}
