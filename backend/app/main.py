from fastapi import FastAPI
from app.routes.health import router as health_router
from app.routes.upload import router as upload_router


app = FastAPI(
    title="MCL OCR Backend",
    description="Backend API for the Municipal Corporation Ludhiana OCR Automation System",
    version="1.0.0"
)

app.include_router(health_router)
app.include_router(upload_router)