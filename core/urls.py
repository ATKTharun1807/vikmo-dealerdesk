from django.urls import path
from core import views, forecast_views, assistant_views

urlpatterns = [
    path("health/", views.health),
    path("products/", views.ProductListCreateView.as_view()),
    path("products/<str:sku>/", views.ProductDetailView.as_view()),
    path("inventory/<str:sku>/", views.InventoryUpdateView.as_view()),
    path("dealers/", views.DealerListCreateView.as_view()),
    path("dealers/<int:pk>/", views.DealerDetailView.as_view()),
    path("sync/supplier/", views.SupplierSyncView.as_view()),
    path("forecast/<str:sku>/", forecast_views.ForecastDetailView.as_view()),
    path("reorder-suggestions/", forecast_views.ReorderSuggestionsView.as_view()),
    path("assistant/chat/", assistant_views.AssistantChatView.as_view()),
]
