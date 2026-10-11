from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler
from django.http import Http404


def format_error_response(code: str, message: str, details=None, status_code: int = 400):
    return Response(
        {
            "error": {
                "code": code,
                "message": message,
                "details": details if details is not None else [],
            }
        },
        status=status_code,
    )


class BaseAPIException(APIException):
    status_code = 400
    code = "VALIDATION_ERROR"
    message = "An error occurred."
    details = []

    def __init__(self, message=None, details=None, code=None, status_code=None):
        if message is not None:
            self.message = message
        if details is not None:
            self.details = details
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.message)


class DuplicateError(BaseAPIException):
    status_code = 409
    code = "DUPLICATE"
    message = "Resource already exists."


class NotFoundCustomError(BaseAPIException):
    status_code = 404
    code = "NOT_FOUND"
    message = "Resource not found."


class CustomValidationError(BaseAPIException):
    status_code = 400
    code = "VALIDATION_ERROR"
    message = "Validation failed."


class InsufficientStockError(BaseAPIException):
    status_code = 409
    code = "INSUFFICIENT_STOCK"
    message = "Insufficient stock."


class InvalidTransitionError(BaseAPIException):
    status_code = 409
    code = "INVALID_TRANSITION"
    message = "Invalid status transition."


class OrderLockedError(BaseAPIException):
    status_code = 409
    code = "ORDER_LOCKED"
    message = "Cannot modify a non-DRAFT order."


class IdempotencyConflictError(BaseAPIException):
    status_code = 409
    code = "IDEMPOTENCY_CONFLICT"
    message = "Idempotency key reused with a different request payload."


class SupplierUnavailableError(BaseAPIException):
    status_code = 502
    code = "SUPPLIER_UNAVAILABLE"
    message = "Supplier feed could not be fetched."


def custom_exception_handler(exc, context):
    # If it's one of our BaseAPIException instances
    if isinstance(exc, BaseAPIException):
        return format_error_response(
            code=exc.code,
            message=exc.message,
            details=exc.details,
            status_code=exc.status_code,
        )

    if isinstance(exc, (Http404, NotFound)):
        return format_error_response(
            code="NOT_FOUND",
            message="The requested resource was not found.",
            details=[],
            status_code=404,
        )

    if isinstance(exc, ValidationError):
        details = []
        if isinstance(exc.detail, dict):
            for k, v in exc.detail.items():
                if isinstance(v, list):
                    for item in v:
                        details.append(f"{k}: {item}")
                else:
                    details.append(f"{k}: {v}")
        elif isinstance(exc.detail, list):
            for item in exc.detail:
                details.append(str(item))
        else:
            details.append(str(exc.detail))

        return format_error_response(
            code="VALIDATION_ERROR",
            message="Validation error.",
            details=details,
            status_code=400,
        )

    # Fallback to standard DRF exception handler
    response = exception_handler(exc, context)
    if response is not None:
        return format_error_response(
            code="SERVER_ERROR",
            message=str(response.data.get("detail", "An error occurred.")),
            details=[],
            status_code=response.status_code,
        )

    return format_error_response(
        code="SERVER_ERROR",
        message=str(exc),
        details=[],
        status_code=500,
    )
