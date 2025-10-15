import os
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from auth.utils import get_current_user
from database.connection import files_collection, chats_collection
from .langchain_pipeline import AskMyDocsPipeline
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["chat"])
pipeline = AskMyDocsPipeline()

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    
    # Save file
    import os
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Process with LangChain
    index_path = pipeline.process_pdf(file_path)
    
    # Save to database
    file_doc = {
        "user_email": current_user["email"],
        "filename": file.filename,
        "file_path": file_path,
        "index_path": index_path,
        "upload_date": datetime.utcnow()
    }
    await files_collection.insert_one(file_doc)
    
    return {"message": "File uploaded and processed successfully", "filename": file.filename}

@router.get("/files")
async def get_user_files(current_user: dict = Depends(get_current_user)):
    files = await files_collection.find({"user_email": current_user["email"]}).to_list(100)
    return [{"filename": f["filename"], "upload_date": f["upload_date"]} for f in files]

@router.post("/query")
async def query_pdf(
    filename: str = Form(...),
    question: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    # Find user's file
    file_doc = await files_collection.find_one({
        "user_email": current_user["email"],
        "filename": filename
    })
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Query using LangChain
    response = pipeline.query_pdf(file_doc["index_path"], question)
    
    # Save chat history
    chat_doc = {
        "user_email": current_user["email"],
        "filename": filename,
        "question": question,
        "answer": response,
        "timestamp": datetime.utcnow()
    }
    await chats_collection.insert_one(chat_doc)
    
    return {"response": response}

@router.get("/history/{filename}")
async def get_chat_history(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    chats = await chats_collection.find({
        "user_email": current_user["email"],
        "filename": filename
    }).sort("timestamp", 1).to_list(100)
    
    return [{"question": c["question"], "answer": c["answer"], "timestamp": c["timestamp"]} for c in chats]