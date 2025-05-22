# This file will be populated with the content of simple_test_backend/main.py
# The old simple_test_backend/main.py will be deleted by a subsequent operation. 

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from responses import chat_loop_1
from chat_history import get_session_history, add_message_to_session_history, clear_session_history, DEFAULT_SESSION_ID

app = FastAPI()

# Pydantic model for the chat request
class UserPayload(BaseModel): 
    user_message: str

# Permissive CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

@app.on_event("startup")
async def startup_event():
    # Optional: Prime the default session with a system prompt if you have one.
    # from chat_history import prime_default_session_with_system_prompt
    # prime_default_session_with_system_prompt("You are a helpful AI assistant.")
    print(f"Server started. Default session ID for chat history is: {DEFAULT_SESSION_ID}")

@app.get("/")
async def read_root():
    return {"message": "Hello from the Refactored Simple Test Backend with History!"}

@app.post("/chat")
async def handle_chat(payload: UserPayload):
    current_session_id = DEFAULT_SESSION_ID 

    print(f"Session [{current_session_id}] received user message: {payload.user_message}")

    add_message_to_session_history(session_id=current_session_id, role="user", content=payload.user_message)

    current_history = get_session_history(session_id=current_session_id)
    print(f"Session [{current_session_id}] current history being sent to AI: {current_history}")
    
    ai_full_response_object = chat_loop_1(
        input_messages=current_history 
    ) 
    
    # Log the raw object and its type for backend debugging
    print(f"\n--- Session [{current_session_id}] Full OpenAI Response Object (raw) ---")
    print(ai_full_response_object)
    if hasattr(ai_full_response_object, 'model_dump_json'):
        print(f"--- Session [{current_session_id}] Full OpenAI Response (JSON) ---")
        print(ai_full_response_object.model_dump_json(indent=2))
    print(f"--- Type of Response Object: {type(ai_full_response_object)} ---\n")

    assistant_role_to_store = "assistant" # Default role to store
    assistant_content_to_send = "Error: Could not parse AI response for frontend."

    if isinstance(ai_full_response_object, str) and ai_full_response_object.startswith("Error"):
        assistant_content_to_send = ai_full_response_object # Error string from chat_loop_1 or OpenAI
        print(f"Session [{current_session_id}] Error from AI: {assistant_content_to_send}")
    elif hasattr(ai_full_response_object, 'output') and isinstance(ai_full_response_object.output, list) and ai_full_response_object.output:
        try:
            assistant_message_obj = ai_full_response_object.output[0]
            if hasattr(assistant_message_obj, 'role'):
                assistant_role_to_store = assistant_message_obj.role
            
            if hasattr(assistant_message_obj, 'content') and isinstance(assistant_message_obj.content, list) and assistant_message_obj.content:
                content_item = assistant_message_obj.content[0]
                if hasattr(content_item, 'text'):
                    assistant_content_to_send = content_item.text
                else:
                    print(f"Session [{current_session_id}] Parsed AI response, but 'text' field missing in content item.")
            else:
                print(f"Session [{current_session_id}] Parsed AI response, but 'content' list missing or empty in assistant message.")
        except (IndexError, AttributeError, TypeError) as e:
            print(f"Session [{current_session_id}] Error parsing AI response structure: {e}")
    else:
        # Fallback if the object structure is not as expected but not an error string
        print(f"Session [{current_session_id}] AI response object structure not recognized for content extraction. Raw: {ai_full_response_object}")
        assistant_content_to_send = f"Received an unexpected response structure: {str(ai_full_response_object)[:200]}..."

    # Add assistant's (parsed or error) response to history for the current session
    add_message_to_session_history(session_id=current_session_id, role=assistant_role_to_store, content=assistant_content_to_send)
    
    print(f"\nSession [{current_session_id}] Refactored backend sending AI content to frontend: {assistant_content_to_send}\n")
    return {"role": assistant_role_to_store, "content": assistant_content_to_send}

@app.post("/chat/clear")
async def handle_clear_chat():
    current_session_id = DEFAULT_SESSION_ID # Use default session for now
    clear_session_history(session_id=current_session_id)
    print(f"Chat history cleared for session: {current_session_id}")
    return {"message": f"Chat history for session '{current_session_id}' cleared."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001) 