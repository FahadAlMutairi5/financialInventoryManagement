import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Badge, ButtonGroup, Alert } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Calendar, TrendingUp, DollarSign, Activity, Users, AlertCircle, CheckCircle, Clock, Building } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const AnalyticsTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start_date: '', end_date: '' });

    // UI states
    const [vaultSortDesc, setVaultSortDesc] = useState(true);
    const [timeGrouping, setTimeGrouping] = useState('day'); // day, week, month
    const [requesterSortBy, setRequesterSortBy] = useState('total_amount'); // total_amount, total_count

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async (isFilter = false) => {
        try {
            if (isFilter) setLoading(true);
            const params = new URLSearchParams();
            if (dateRange.start_date) params.append('start_date', dateRange.start_date);
            if (dateRange.end_date) params.append('end_date', dateRange.end_date);

            const res = await api.get(`/reports/analytics/?${params.toString()}`);
            setData(res.data);
            if (isFilter) toast.success('تم تحديث البيانات بناءً على التاريخ');
        } catch (err) {
            toast.error('فشل في تحميل الإحصائيات (ERR-15)');
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = (e) => {
        e.preventDefault();
        fetchAnalytics(true);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(amount);
    };

    if (loading && !data) return <div className="p-4 text-center text-muted">جاري تحميل البيانات الإحصائية...</div>;
    if (!data) return <Alert variant="danger" className="m-4">عذراً، فشل تحميل البيانات.</Alert>;

    // 1. Vault Data
    let vaultRanking = [...data.vault_liquidity.ranking];
    if (!vaultSortDesc) vaultRanking.reverse();

    // 3. Time Series grouping
    const groupTimeSeries = () => {
        if (!data.time_series.length) return [];
        const grouped = {};
        data.time_series.forEach(item => {
            const date = new Date(item.requested_payout_date);
            let key = item.requested_payout_date;
            if (timeGrouping === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (timeGrouping === 'week') {
                // Rough week grouping (Sunday start)
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay());
                key = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
            }
            if (!grouped[key]) grouped[key] = 0;
            grouped[key] += parseFloat(item.total);
        });

        return Object.keys(grouped).sort().map(k => ({
            date: k,
            amount: grouped[k]
        }));
    };
    const chartData = groupTimeSeries();

    // 4. Requester Ranking
    let requesters = [...data.requester_activity];
    requesters.sort((a, b) => {
        if (requesterSortBy === 'total_amount') return b.total_amount - a.total_amount;
        return b.total_count - a.total_count;
    });

    return (
        <div className="analytics-container mt-3">
            {/* Global Filters */}
            <Card className="shadow-sm border-0 mb-4 bg-light">
                <Card.Body className="py-3">
                    <Form onSubmit={handleFilter} className="d-flex align-items-end gap-3 flex-wrap">
                        <Form.Group>
                            <Form.Label className="small text-muted mb-1">من تاريخ</Form.Label>
                            <Form.Control type="date" value={dateRange.start_date} onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })} size="sm" />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label className="small text-muted mb-1">إلى تاريخ</Form.Label>
                            <Form.Control type="date" value={dateRange.end_date} onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })} size="sm" />
                        </Form.Group>
                        <Button type="submit" variant="primary" size="sm" className="px-4" disabled={loading}>
                            {loading ? 'تحديث...' : 'تصفية النتائج'}
                        </Button>
                        <Button variant="link" size="sm" className="text-secondary text-decoration-none" onClick={() => { setDateRange({ start_date: '', end_date: '' }); setTimeout(() => fetchAnalytics(true), 100); }}>
                            إلغاء التصفية
                        </Button>
                    </Form>
                </Card.Body>
            </Card>

            {/* Part 1 & 2: Main KPIs */}
            <Row className="mb-4 g-3">
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100 border-start border-primary border-4">
                        <Card.Body>
                            <p className="text-muted mb-1 small d-flex align-items-center gap-1"><DollarSign size={16} className="text-primary" /> إجمالي الرصيد (السيولة)</p>
                            <h4 className="mb-0 fw-bold text-primary">{formatCurrency(data.vault_liquidity.grand_total_balance)}</h4>
                            <div className="mt-2 text-muted small">
                                <Building size={14} className="me-1" /> الخزائن النشطة: {data.vault_liquidity.total_active_vaults}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100 border-start border-warning border-4">
                        <Card.Body>
                            <p className="text-muted mb-1 small d-flex align-items-center gap-1"><Clock size={16} className="text-warning" /> المبالغ قيد الانتظار (معتمدة)</p>
                            <h4 className="mb-0 fw-bold text-warning">{formatCurrency(data.financial_kpis.total_approved)}</h4>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100 border-start border-success border-4">
                        <Card.Body>
                            <p className="text-muted mb-1 small d-flex align-items-center gap-1"><CheckCircle size={16} className="text-success" /> المبالغ المصروفة (مكتملة)</p>
                            <h4 className="mb-0 fw-bold text-success">{formatCurrency(data.financial_kpis.total_completed)}</h4>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100 border-start border-danger border-4">
                        <Card.Body>
                            <p className="text-muted mb-1 small d-flex align-items-center gap-1"><AlertCircle size={16} className="text-danger" /> المبالغ المرفوضة</p>
                            <h4 className="mb-0 fw-bold text-danger">{formatCurrency(data.financial_kpis.total_rejected)}</h4>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mb-4">
                {/* Part 1: Vault Overview Charts */}
                <Col lg={6} className="mb-4 mb-lg-0">
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-0">
                            <h6 className="mb-0 fw-bold">ترتيب سيولة الخزائن</h6>
                            <Button variant="light" size="sm" className="text-muted border" onClick={() => setVaultSortDesc(!vaultSortDesc)}>
                                {vaultSortDesc ? '↓ تنازلي' : '↑ تصاعدي'}
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            {vaultRanking.length === 0 ? (
                                <div className="text-center text-muted p-5">ERR-16: لا توجد خزائن معرفة في النظام حالياً.</div>
                            ) : (
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={vaultRanking} margin={{ top: 10, right: 30, left: 20, bottom: 5 }} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(value) => formatCurrency(value)} />
                                            <Bar dataKey="current_balance" fill="#0d6efd" radius={[0, 4, 4, 0]} name="الرصيد الحالي" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Part 3: Time Series */}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-0">
                            <h6 className="mb-0 fw-bold">حجم الصرف المستقبلي</h6>
                            <ButtonGroup size="sm">
                                <Button variant={timeGrouping === 'day' ? 'primary' : 'outline-primary'} onClick={() => setTimeGrouping('day')}>يوم</Button>
                                <Button variant={timeGrouping === 'week' ? 'primary' : 'outline-primary'} onClick={() => setTimeGrouping('week')}>أسبوع</Button>
                                <Button variant={timeGrouping === 'month' ? 'primary' : 'outline-primary'} onClick={() => setTimeGrouping('month')}>شهر</Button>
                            </ButtonGroup>
                        </Card.Header>
                        <Card.Body>
                            {chartData.length === 0 ? (
                                <div className="text-center text-muted p-5">ERR-18: بيانات غير كافية لإنشاء المخطط للفترة المحددة.</div>
                            ) : (
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                            <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label) => `التاريخ: ${label}`} />
                                            <Line type="monotone" dataKey="amount" stroke="#198754" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="حجم الطلبات" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Part 4: Requester Ranking */}
            <Row>
                <Col md={12}>
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-0">
                            <h6 className="mb-0 fw-bold"><Users size={18} className="me-2 text-secondary" />الموظفين الأكثر طلباً للصرف</h6>
                            <ButtonGroup size="sm">
                                <Button variant={requesterSortBy === 'total_amount' ? 'primary' : 'outline-primary'} onClick={() => setRequesterSortBy('total_amount')}>حسب المبلغ</Button>
                                <Button variant={requesterSortBy === 'total_count' ? 'primary' : 'outline-primary'} onClick={() => setRequesterSortBy('total_count')}>حسب العدد</Button>
                            </ButtonGroup>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {requesters.length === 0 ? (
                                <div className="text-center text-muted p-4">ERR-19: لا توجد سجلات تطابق عوامل التصفية الحالية.</div>
                            ) : (
                                <Table responsive hover className="mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="px-4">#</th>
                                            <th>اسم الموظف</th>
                                            <th>القسم (الرتبة)</th>
                                            <th className="text-center">إجمالي عدد الطلبات</th>
                                            <th className="text-end px-4">إجمالي القيمة المطلوبة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requesters.map((req, idx) => (
                                            <tr key={req.requestor__id}>
                                                <td className="px-4 text-muted fw-bold">{idx + 1}</td>
                                                <td className="fw-semibold">{req.requestor__first_name} {req.requestor__last_name} ({req.requestor__username})</td>
                                                <td><Badge bg="secondary">موظف (طالب)</Badge></td>
                                                <td className="text-center">
                                                    <Badge bg="light" text="dark" className="border px-3 py-2 fs-6">{req.total_count}</Badge>
                                                </td>
                                                <td className="text-end px-4 text-primary fw-bold text-nowrap">
                                                    {formatCurrency(req.total_amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AnalyticsTab;
