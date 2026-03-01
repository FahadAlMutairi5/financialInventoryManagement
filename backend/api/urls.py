from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VaultViewSet, DisbursementRequestViewSet, UserViewSet
from .reports import ExportReportView, AnalyticsView

router = DefaultRouter()
router.register(r'vaults', VaultViewSet)
router.register(r'requests', DisbursementRequestViewSet, basename='requests')
router.register(r'users', UserViewSet)

urlpatterns = [
    path('reports/export/', ExportReportView.as_view(), name='export-report'),
    path('reports/analytics/', AnalyticsView.as_view(), name='analytics-report'),
    path('', include(router.urls)),
]
