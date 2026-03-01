import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Card, Table, Alert, Badge, Button, Modal, Form, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import api from '../api';
import { Plus, FileText, Eye } from 'lucide-react';
import RequestTimelineModal from '../components/RequestTimelineModal';

const EmployeeDashboard = () => {
    const [requests, setRequests] = useState([]);
    const [vaults, setVaults] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showNewModal, setShowNewModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const todayStr = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        issuance_number: '',
        amount: '',
        requested_payout_date: todayStr,
        letter_attachment: null
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
        fetchVaults();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/requests/');
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchVaults = async () => {
        try {
            // Needed to populate dropdown. Anyone can list vaults or we might need a public endpoint?
            // Assuming IsAuthenticated lets employess see active vaults list.
            const res = await api.get('/vaults/');
            setVaults(res.data);
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, vault: res.data[0].id }));
            }
        } catch (err) {
            console.error("Could not load vaults", err);
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, letter_attachment: e.target.files[0] });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.letter_attachment) {
            toast.error('حقل إلزامي مفقود: يرجى إرفاق الخطاب الرسمي.');
            return;
        }

        if (Number(formData.amount) <= 0) {
            toast.error('مبلغ غير صالح: يرجى إدخال قيمة رقمية أكبر من الصفر.');
            return;
        }

        const data = new FormData();
        data.append('issuance_number', formData.issuance_number);
        data.append('amount', formData.amount);
        data.append('requested_payout_date', formData.requested_payout_date);
        data.append('letter_attachment', formData.letter_attachment);

        try {
            setSubmitting(true);
            await api.post('/requests/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowNewModal(false);
            fetchData();
            setFormData({
                issuance_number: '',
                amount: '',
                requested_payout_date: todayStr,
                letter_attachment: null
            });
            toast.success('تم تقديم الطلب بنجاح.');
        } catch (err) {
            const errData = err.response?.data;
            if (typeof errData === 'object') {
                const msgs = Object.values(errData).flat().join(', ');
                toast.error(msgs);
            } else {
                toast.error('فشل تقديم الطلب.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(amount);
    };

    if (loading) return <div><Spinner animation="border" size="sm" /> جاري تحميل الطلبات...</div>;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>طلبات الصرف الخاصة بي</h2>
                <Button variant="primary" onClick={() => setShowNewModal(true)} className="d-flex align-items-center gap-2">
                    <Plus size={18} /> طلب جديد
                </Button>
            </div>

            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>التاريخ</th>
                                <th>رقم الإصدار</th>
                                <th>الخزينة المخصصة</th>
                                <th>المبلغ</th>
                                <th>الحالة</th>
                                <th>التفاصيل</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => {
                                const getFileUrl = (path) => path?.startsWith('http') ? path : `http://localhost:8000${path}`;
                                return (
                                    <tr key={req.id}>
                                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <span className="fw-semibold">{req.issuance_number}</span>
                                            <div className="small">
                                                {req.letter_attachment && (
                                                    <a href={getFileUrl(req.letter_attachment)} target="_blank" rel="noreferrer" className="text-decoration-none">
                                                        <FileText size={14} /> عرض الملف
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td>{req.vault_details ? req.vault_details.name : <span className="text-muted fst-italic">في انتظار التخصيص</span>}</td>
                                        <td className="fw-semibold">{formatCurrency(req.amount)}</td>
                                        <td>
                                            <Badge bg={
                                                req.status === 'PENDING_SUPER_ADMIN_REVIEW' ? 'secondary' :
                                                    req.status === 'PENDING_VAULT_MANAGER_APPROVAL' ? 'warning' :
                                                        req.status === 'COMPLETED' ? 'success' : 'danger'
                                            }>
                                                {req.status === 'PENDING_SUPER_ADMIN_REVIEW' ? 'مراجعة المدير العام' :
                                                    req.status === 'PENDING_VAULT_MANAGER_APPROVAL' ? 'موافقة أمين الصندوق' :
                                                        req.status === 'COMPLETED' ? 'مكتمل' : 'مرفوض'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1 mx-auto" onClick={() => {
                                                setSelectedRequest(req);
                                                setShowTimelineModal(true);
                                            }}>
                                                <Eye size={18} /> عرض
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {requests.length === 0 && (
                                <tr><td colSpan="6" className="text-center py-4 text-muted">لم يتم العثور على طلبات. قم بإنشاء طلب للبدء.</td></tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* New Request Modal */}
            <Modal show={showNewModal} onHide={() => setShowNewModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>تقديم طلب صرف</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>رقم الإصدار *</Form.Label>
                            <Form.Control
                                type="text"
                                name="issuance_number"
                                value={formData.issuance_number}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>المبلغ (ريال) *</Form.Label>
                            <Form.Control
                                type="number"
                                step="0.01"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>تاريخ الصرف المطلوب *</Form.Label>
                            <Form.Control
                                type="date"
                                name="requested_payout_date"
                                value={formData.requested_payout_date}
                                min={todayStr}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>تحميل الخطاب الرسمي (PDF/صورة) *</Form.Label>
                            <Form.Control
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.png,.jpg,.jpeg"
                                required
                            />
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="secondary" onClick={() => setShowNewModal(false)}>إلغاء</Button>
                            <Button variant="primary" type="submit" disabled={submitting}>
                                {submitting ? 'جاري التقديم...' : 'تقديم الطلب'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Timeline Modal */}
            <RequestTimelineModal
                show={showTimelineModal}
                onHide={() => setShowTimelineModal(false)}
                request={selectedRequest}
            />
        </div>
    );
};

export default EmployeeDashboard;
