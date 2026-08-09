from app.config import anthropic_client
import json

# departments list for the MCL to match with the document content and extract the department field
DEPARTMENTS  = [
        {
            "department": "Accounts & Audit Branch",
            "description": "Manages municipal funds, financial audits, annual budgets, and expense approvals."
        },
        {
            "department": "Advertisement Branch",
            "description": "Regulates outdoor hoarding spaces, commercial banners, and collects public advertisement taxes."
        },
        {
            "department": "AMRUT Cell Branch",
            "description": "Implements centrally funded infrastructure upgrades for water supply and sewerage networks."
        },
        {
            "department": "Building & Roads (B&R) Branch",
            "description": "Constructs, paves, and maintains public roads, bridges, and municipal buildings."
        },
        {
            "department": "Computerization Branch",
            "description": "Maintains digital infrastructure, the official portal, and online citizen services."
        },
        {
            "department": "Complaints & Enquiry Branch",
            "description": "Receives public grievances, logs citizen feedback, and tracks resolution progress."
        },
        {
            "department": "Drawing Branch",
            "description": "Prepares structural blueprints, engineering layouts, and mapping for civic projects."
        },
        {
            "department": "Estate & Property Branch",
            "description": "Oversees corporation-owned land, handles properties on lease, and collects rent."
        },
        {
            "department": "Establishment Branch",
            "description": "Handles internal human resources, payroll, transfers, and municipal staff administration."
        },
        {
            "department": "Fire Brigade Branch",
            "description": "Provides emergency firefighting services, disaster rescue, and issues fire safety certificates."
        },
        {
            "department": "Health & Sanitation Branch",
            "description": "Manages daily city garbage collection, street sweeping, and vector control drives."
        },
        {
            "department": "Horticulture Branch",
            "description": "Develops and maintains public parks, green belts, and city landscaping."
        },
        {
            "department": "House Tax / Property Tax Branch",
            "description": "Assesses property values, processes yearly evaluations, and collects property taxes."
        },
        {
            "department": "Land & Tehbazari Branch",
            "description": "Removes illegal street encroachments and regulates public vending zones."
        },
        {
            "department": "Legal Branch",
            "description": "Handles court cases, statutory compliance, and legal drafting for the corporation."
        },
        {
            "department": "Licensing Branch",
            "description": "Issues and renews trade licenses for businesses operating within city limits."
        },
        {
            "department": "Lights / Electrical Branch",
            "description": "Installs and repairs public streetlights, timers, and high-mast lights."
        },
        {
            "department": "Operations & Maintenance (O&M) Branch",
            "description": "Operates tubewells, maintains drinking water supply, and clears sewage systems."
        },
        {
            "department": "Projects Division Branch",
            "description": "Plans and monitors large-scale urban development schemes across the city."
        },
        {
            "department": "Slum Clearance Branch",
            "description": "Works on rehabilitation programs and basic service provisioning for slum areas."
        },
        {
            "department": "Town Planning / Building Branch",
            "description": "Enforces building bylaws, demolishes illegal structures, and approves building plans."
        },
        {
            "department": "Workshop Branch",
            "description": "Services, repairs, and maintains the fleet of municipal vehicles and machinery."
        }
    ]


   


def process_document(ocr_output: str) -> dict:
    
    # the system prompt for the LLM to translate and extract fields from the document
    prompt = f"""You are a language expert fluent in Hindi, Punjabi, and English with deep experience in translating official municipal documents.

        Your job is to translate the document text below into English, preserving the original meaning and context without altering it. Then extract the following fields from the translated content.

        DEPARTMENTS LIST:
        {DEPARTMENTS}

        FIELDS TO EXTRACT:
        - date: the date the document was published or written
        - subject: the topic or reason for this letter
        - summary: a concise summary of the document body (3-5 lines) that captures the core issue and helps identify which department it belongs to
        - department: the MCL department this document belongs to, chosen strictly from the DEPARTMENTS LIST above
        - sender_name: full name of the sender
        - sender_contact: phone or email of the sender if mentioned, otherwise null
        - receiver: full name or designation of the receiver
        - reference_number: the document reference number if present, otherwise null

        RULES:
        - If a field is not found in the document after careful reading, return null for that field
        - Do not invent or guess any information
        - Department must be chosen from the provided list only. If no match found, return null
        - Return only a valid JSON object, no explanation, no extra text

        DOCUMENT TEXT:
        {ocr_output}

        Return this exact JSON structure:
        {{
            "date": "",
            "subject": "",
            "summary": "",
            "department": "",
            "sender_name": "",
            "sender_contact": null,
            "receiver": "",
            "reference_number": null
        }}"""
    
    
    if anthropic_client is None:
        return {"error": "Anthropic client is not configured."}
    
    # Send the prompt to the LLM for processing
    response = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages = [
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    
    # Parse the LLM response and return the extracted fields as a dictionary
    # json.loads is used to convert the JSON string returned by the LLM into a Python dictionary
    try:
        llm_output = json.loads(response.content[0].text)
    except json.JSONDecodeError:
        llm_output = f"Error: Unable to parse LLM response as JSON."

    return llm_output