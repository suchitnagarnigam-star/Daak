from fastapi import FastAPI

app = FastAPI(
    title="MCL OCR Backend",
    description="Backend API for the Municipal Corporation Ludhiana OCR Automation System",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "MCL OCR Backend is running 🚀"
    }