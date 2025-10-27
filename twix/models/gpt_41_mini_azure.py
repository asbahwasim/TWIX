import os
from openai import AzureOpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def gpt_41_mini_azure(input, max_tokens=800, temperature=0):
    """
    Get response from Azure OpenAI API using environment variables.
    
    Args:
        input: Can be a string, list of strings, or tuple
        max_tokens (int): Maximum tokens for response
        temperature (float): Response randomness (0-1)
        
    Returns:
        str: The response content from the model
    """
    # Handle different input formats
    if isinstance(input, str):
        prompt = input
    elif isinstance(input, (list, tuple)):
        # Convert all elements to strings and concatenate
        prompt = ''.join(str(x) for x in input)
    else:
        prompt = str(input)
    
    # Get configuration from environment variables
    api_key = os.getenv("AZURE_OPENAI_KEY")
    api_version = os.getenv("AZURE_API_VERSION")
    azure_endpoint = os.getenv("AZURE_ENDPOINT")
    deployment = os.getenv("DEPLOYMENT_NAME", "gpt-4.1-mini")
    
    # Validate that all required values are present
    if not api_key:
        raise ValueError("AZURE_OPENAI_KEY not found in environment variables")
    if not api_version:
        raise ValueError("AZURE_API_VERSION not found in environment variables")
    if not azure_endpoint:
        raise ValueError("AZURE_ENDPOINT not found in environment variables")
    
    # Initialize Azure OpenAI client
    client = AzureOpenAI(
        azure_endpoint=azure_endpoint,
        api_key=api_key,
        api_version=api_version,
    )
    
    # Generate response
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=13107,
        temperature=temperature,
        top_p=0,
        frequency_penalty=0.0,
        presence_penalty=0.0,
        model=deployment
    )

    answer = response.choices[0].message.content
    
    return answer
