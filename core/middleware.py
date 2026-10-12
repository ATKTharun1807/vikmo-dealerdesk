class CorsMiddleware:
    """
    Lightweight zero-dependency CORS middleware ensuring local frontends
    (e.g., React Vite dev server on port 5173/3000) can communicate seamlessly
    with DealerDesk REST API endpoints.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            from django.http import HttpResponse
            response = HttpResponse()
        else:
            response = self.get_response(request)

        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Idempotency-Key, X-Requested-With, Accept"
        return response
