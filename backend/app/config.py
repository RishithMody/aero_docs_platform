from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "llama3.2"
    llava_model: str = "llava"
    embedding_model: str = "nomic-embed-text"
    ollama_auto_pull: bool = True
    ollama_startup_timeout: int = 120
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_collection: str = "aerodocs"
    upload_dir: str = "./uploads"
    api_secret: str = "dev-secret-change-in-production"
    cors_origins: str = "http://localhost:3001"

    class Config:
        env_file = ".env"


settings = Settings()
