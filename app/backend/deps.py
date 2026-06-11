"""Process-wide singletons: the SDKProxy and WSHub instances FastAPI routes share."""
from functools import lru_cache
from model_security_client.api import ModelSecurityAPIClient
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub

BASE_URL = "https://api.sase.paloaltonetworks.com/aims"


@lru_cache(maxsize=1)
def get_hub() -> WSHub:
    return WSHub()


@lru_cache(maxsize=1)
def get_proxy() -> SDKProxy:
    client = ModelSecurityAPIClient(base_url=BASE_URL)
    return SDKProxy(client, get_hub())
