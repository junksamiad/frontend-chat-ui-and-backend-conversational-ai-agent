from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

client = OpenAI()

def chat_loop_1(input_messages: list, instructions: str | None = None):
    """
    Gets a response from OpenAI's Responses API based on the provided message history.
    Uses model gpt-4.1.
    Returns the full response object for inspection.
    """
    if not input_messages:
        # Or handle this more gracefully, maybe return a specific error object/message
        print("Warning: chat_loop_1 called with empty input_messages list.")
        return {"error": "Input messages list cannot be empty"} 

    try:
        # Prepare parameters for the API call
        api_params = {
            "model": "gpt-4.1",
            "input": input_messages,
            "store": False  # Ensure store is set to False
        }
        if instructions: # Only add instructions if provided
            api_params["instructions"] = instructions
        
        response = client.responses.create(**api_params)
        return response

    except Exception as e:
        print(f"Error calling OpenAI Responses API: {e}")
        return f"Error from OpenAI: {e}"

if __name__ == '__main__':
    # Example usage with history
    sample_history = [
        {"role": "user", "content": "What is the capital of France?"}
    ]
    sample_instructions = "Please be very concise."
    print(f"User History: {sample_history}")
    print(f"Instructions: {sample_instructions}")
    full_response = chat_loop_1(sample_history, instructions=sample_instructions)
    print(f"AI Full Response Object: {full_response}")

    if hasattr(full_response, 'output') and full_response.output:
        print(f"Assistant Says: {full_response.output[0].content[0].text}")
        sample_history.append({"role": "assistant", "content": full_response.output[0].content[0].text})
    
    sample_history.append({"role": "user", "content": "What is its population?"})
    print(f"User History (2nd turn): {sample_history}")
    # For the second call, let's try without specific instructions to see default behavior
    full_response_2 = chat_loop_1(sample_history)
    print(f"AI Full Response Object (2nd turn): {full_response_2}")
    if hasattr(full_response_2, 'output') and full_response_2.output:
        print(f"Assistant Says (2nd turn): {full_response_2.output[0].content[0].text}") 