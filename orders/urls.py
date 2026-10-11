from django.urls import path
from orders import views

urlpatterns = [
    path("orders/", views.OrderListCreateView.as_view()),
    path("orders/<str:order_number>/", views.OrderDetailView.as_view()),
    path("orders/<str:order_number>/confirm/", views.OrderConfirmView.as_view()),
    path("orders/<str:order_number>/dispatch/", views.OrderDispatchView.as_view()),
    path("orders/<str:order_number>/deliver/", views.OrderDeliverView.as_view()),
    path("orders/<str:order_number>/cancel/", views.OrderCancelView.as_view()),
]
