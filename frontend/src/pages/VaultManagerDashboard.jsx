import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Card, Table, Alert, Badge, Row, Col, Button, Modal, Form } from 'react-bootstrap';
import toast from 'react-hot-toast';
import api from '../api';
import { CheckCircle, XCircle, FileText, Upload, Eye } from 'lucide-react';
import RequestTimelineModal from '../components/RequestTimelineModal';

const VaultManagerDashboard = () => {
    const { user } = useContext(AuthContext);
    const [requests, setRequests] = useState([]);
    const [vaults, setVaults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedVaultFilter, setSelectedVaultFilter] = useState('');

    // Modal states
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showDisburseModal, setShowDisburseModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [receiptFile, setReceiptFile] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [reqRes, vaultRes] = await Promise.all([
                api.get('/requests/'),
                api.get('/vaults/')
            ]);
            setRequests(reqRes.data);
            // Filter vaults where current user is manager
            const myVaults = vaultRes.data.filter(v => v.manager === user.id);
            setVaults(myVaults);
        } catch (err) {
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    // Approve is no longer an action for Vault Manager. They only Disburse & Close or Reject.

    const openReject = (req) => {
        setSelectedRequest(req);
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) return;
        try {
            setActionLoading(true);
            await api.patch(`/requests/${selectedRequest.id}/reject/`, {
                rejection_reason: rejectionReason
            });
            setShowRejectModal(false);
            setRejectionReason('');
            fetchData();
            toast.success('تم رفض الطلب بنجاح.');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'فشل الرفض');
        } finally {
            setActionLoading(false);
        }
    };

    const openDisburse = (req) => {
        setSelectedRequest(req);
        setShowDisburseModal(true);
    };

    const handleDisburse = async () => {
        if (!receiptFile) return;
        const formData = new FormData();
        formData.append('receipt_attachment', receiptFile);

        try {
            setActionLoading(true);
            const res = await api.patch(`/requests/${selectedRequest.id}/disburse/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(`تم الصرف بنجاح. رقم المعاملة: ${res.data.transaction_id}`);
            setShowDisburseModal(false);
            setReceiptFile(null);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'فشل الصرف');
        } finally {
            setActionLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(amount);
    };

    const getFileUrl = (path) => path?.startsWith('http') ? path : `http://localhost:8000${path}`;

    if (loading) return <div>جاري تحميل لوحة التحكم...</div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <div>
            <h2 className="mb-4">لوحة تحكم أمين الصندوق</h2>

            <Row className="mb-4">
                {vaults.map(vault => (
                    <Col md={4} key={vault.id}>
                        <Card className="shadow-sm border-0 border-top border-primary border-3">
                            <Card.Body>
                                <Card.Title>{vault.name}</Card.Title>
                                <Card.Text className="display-6 mt-3">{formatCurrency(vault.current_balance)}</Card.Text>
                                <div className="text-muted small">الرصيد الافتتاحي: {formatCurrency(vault.initial_balance)}</div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">طلبات الصرف</h5>
                    <div style={{ width: '250px' }}>
                        <Form.Select
                            size="sm"
                            value={selectedVaultFilter}
                            onChange={(e) => setSelectedVaultFilter(e.target.value)}
                        >
                            <option value="">جميع الخزائن</option>
                            {vaults.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </Form.Select>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>رقم الإصدار</th>
                                <th>الجهة الطالبة</th>
                                <th>المبلغ</th>
                                <th>الحالة</th>
                                <th>التفاصيل</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.filter(req => selectedVaultFilter === '' || req.vault === parseInt(selectedVaultFilter)).map(req => (
                                <tr key={req.id}>
                                    <td>
                                        <span className="fw-semibold">{req.issuance_number}</span>
                                        <div className="small">
                                            {req.letter_attachment && (
                                                <a href={getFileUrl(req.letter_attachment)} target="_blank" rel="noreferrer" className="text-decoration-none d-flex align-items-center gap-1">
                                                    <FileText size={14} /> عرض الخطاب
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td>{req.requestor_details.first_name} {req.requestor_details.last_name}</td>
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
                                    <td>
                                        {req.status === 'PENDING_VAULT_MANAGER_APPROVAL' && (
                                            <div className="d-flex flex-column gap-2">
                                                <Button size="sm" variant="primary" onClick={() => openDisburse(req)} disabled={actionLoading}>
                                                    <Upload size={16} className="me-1" /> صرف وإغلاق
                                                </Button>
                                                <Button size="sm" variant="outline-danger" onClick={() => openReject(req)} disabled={actionLoading}>
                                                    <XCircle size={16} /> رفض الطلب
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {requests.filter(req => selectedVaultFilter === '' || req.vault === parseInt(selectedVaultFilter)).length === 0 && (
                                <tr><td colSpan="6" className="text-center py-4 text-muted">لا توجد طلبات لهذه الخزينة.</td></tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Reject Modal */}
            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>رفض الطلب</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>سبب الرفض *</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            required
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejectModal(false)}>إلغاء</Button>
                    <Button variant="danger" onClick={handleReject} disabled={!rejectionReason.trim() || actionLoading}>
                        {actionLoading ? 'جاري المعالجة...' : 'تأكيد الرفض'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Disburse Modal */}
            <Modal show={showDisburseModal} onHide={() => setShowDisburseModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>صرف وإغلاق الطلب</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info">
                        أنت على وشك صرف مبلغ <strong>{selectedRequest && formatCurrency(selectedRequest.amount)}</strong>.
                        سيتم خصم هذا المبلغ تلقائياً من رصيد خزينة <strong>{selectedRequest && selectedRequest.vault_details.name}</strong>.
                    </Alert>
                    <Form.Group>
                        <Form.Label>تحميل سند الصرف الموقع (إلزامي) *</Form.Label>
                        <Form.Control
                            type="file"
                            onChange={(e) => setReceiptFile(e.target.files[0])}
                            required
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDisburseModal(false)}>إلغاء</Button>
                    <Button variant="primary" onClick={handleDisburse} disabled={!receiptFile || actionLoading}>
                        {actionLoading ? 'جاري المعالجة...' : 'تأكيد الصرف'}
                    </Button>
                </Modal.Footer>
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

export default VaultManagerDashboard;
