from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "MCL OCR Backend is running!"}