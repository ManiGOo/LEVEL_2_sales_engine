from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.dependencies import get_current_user
from app.services import excel_service

router = APIRouter(prefix="/reports", tags=["reports"])

_XLSX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)


@router.get("/companies.xlsx")
async def export_companies_report(user=Depends(get_current_user)):
    """Download the styled company intelligence workbook (General List + NSQ)."""
    data = await excel_service.build_report()
    filename = f"sentinel-company-report-{date.today().isoformat()}.xlsx"
    return Response(
        content=data,
        media_type=_XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
