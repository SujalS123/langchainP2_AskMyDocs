#!/usr/bin/env python3
import os
import sys

def test_port():
    port = os.environ.get("PORT")
    print(f"PORT environment variable: {port}")
    
    if port:
        try:
            port_int = int(port)
            print(f"Port converted to int: {port_int}")
        except ValueError:
            print(f"Invalid port value: {port}")
            return False
    else:
        print("PORT not set, using default 8000")
        port_int = 8000
    
    return port_int

if __name__ == "__main__":
    import uvicorn
    from main import app
    
    port = test_port()
    print(f"Starting uvicorn on 0.0.0.0:{port}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="debug"
    )