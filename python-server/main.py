from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AssistantMessage,
    ResultMessage,
    TextBlock,
)
import uvicorn

app = FastAPI(title="Local Claude Max API")


class GenerateRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = "You are a helpful assistant."
    model: Optional[str] = "haiku"


class GenerateResponse(BaseModel):
    result: str
    model_used: str


@app.get("/health")
async def health():
    return {"status": "running"}


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    try:
        text = ""

        options = ClaudeAgentOptions(
            system_prompt=req.system_prompt,
            max_turns=1,
            allowed_tools=[],
            model=req.model or "haiku",
        )

        async for msg in query(
            prompt=req.prompt,
            options=options,
        ):
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        text += block.text

            elif isinstance(msg, ResultMessage):
                if hasattr(msg, "result") and msg.result:
                    text = msg.result

        if not text:
            raise HTTPException(status_code=500, detail="Empty response")

        return GenerateResponse(
            result=text,
            model_used=req.model or "haiku",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8700,
    )