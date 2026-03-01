from django.http import HttpResponse
import csv
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from .models import DisbursementRequest, Vault
from .views import IsSuperAdmin

class ExportReportView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="financial_inventory_report.csv"'
        response.write(b'\xef\xbb\xbf') # BOM for Excel to open UTF-8 correctly

        writer = csv.writer(response)
        writer.writerow(['التاريخ', 'اسم طالب الصرف', 'رقم الإصدار', 'المبلغ', 'اسم الخزينة', 'الحالة', 'رقم المعاملة'])

        # We can pass date range params if needed: start_date, end_date
        query = DisbursementRequest.objects.all().order_by('-created_at')
        
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        if start_date:
            query = query.filter(created_at__gte=start_date)
        if end_date:
            query = query.filter(created_at__lte=end_date)
            
        if not query.exists() and (start_date or end_date):
            return HttpResponse("ERR-09: No data found for the selected date range.", status=404)

        STATUS_ARABIC = {
            'PENDING_SUPER_ADMIN_REVIEW': 'مراجعة المدير العام',
            'PENDING_VAULT_MANAGER_APPROVAL': 'موافقة أمين الصندوق',
            'COMPLETED': 'مكتمل',
            'REJECTED': 'مرفوض'
        }

        for req in query:
            requestor_name = f"{req.requestor.first_name} {req.requestor.last_name}".strip() or req.requestor.username
            vault_name = req.vault.name if req.vault else 'غير محدد'
            status_arabic = STATUS_ARABIC.get(req.status, req.get_status_display())
            writer.writerow([
                req.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                requestor_name,
                req.issuance_number,
                req.amount,
                vault_name,
                status_arabic,
                req.transaction_id or 'لا يوجد'
            ])

        return response

class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        # 1. Vault Liquidity & Ranking Overview
        vaults = Vault.objects.all()
        total_active_vaults = vaults.count()
        grand_total_balance = vaults.aggregate(total=Sum('current_balance'))['total'] or 0
        vault_ranking = list(vaults.values('id', 'name', 'current_balance').order_by('-current_balance'))
        if not vault_ranking:
            # Handle ERR-16: "No Data: No vaults are currently defined in the system." context
            pass

        # Base query for requests
        req_query = DisbursementRequest.objects.all()
        if start_date:
            req_query = req_query.filter(updated_at__date__gte=start_date)
        if end_date:
            req_query = req_query.filter(updated_at__date__lte=end_date)

        # 2. Financial Status KPIs
        status_totals = req_query.values('status').annotate(total=Sum('amount'))
        kpi_data = {item['status']: item['total'] for item in status_totals}
        
        total_approved = kpi_data.get('PENDING_VAULT_MANAGER_APPROVAL', 0)
        total_rejected = kpi_data.get('REJECTED', 0)
        total_completed = kpi_data.get('COMPLETED', 0)

        # 3. Disbursement Time-Series Analysis
        time_series = list(req_query.exclude(requested_payout_date__isnull=True)
                           .values('requested_payout_date')
                           .annotate(total=Sum('amount'))
                           .order_by('requested_payout_date'))

        # 4. Requester Activity Ranking
        requester_activity = list(req_query.values(
            'requestor__id', 
            'requestor__first_name', 
            'requestor__last_name', 
            'requestor__username'
        ).annotate(
            total_amount=Sum('amount'), 
            total_count=Count('id')
        ).order_by('-total_amount'))
        
        return Response({
            'vault_liquidity': {
                'total_active_vaults': total_active_vaults,
                'grand_total_balance': grand_total_balance,
                'ranking': vault_ranking
            },
            'financial_kpis': {
                'total_approved': total_approved,
                'total_rejected': total_rejected,
                'total_completed': total_completed
            },
            'time_series': time_series,
            'requester_activity': requester_activity
        })
