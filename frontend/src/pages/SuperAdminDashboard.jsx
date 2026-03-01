import { useEffect, useState } from 'react';
import { Card, Table, Alert, Button, Modal, Form, Row, Col, Badge, Tabs, Tab } from 'react-bootstrap';
import toast from 'react-hot-toast';
import api from '../api';
import { Download, PlusSquare, Building, Eye, FileText, Users, UserPlus, Edit, Trash2 } from 'lucide-react';
import RequestTimelineModal from '../components/RequestTimelineModal';
import AnalyticsTab from '../components/AnalyticsTab';

const SuperAdminDashboard = () => {
    const [vaults, setVaults] = useState([]);
    const [managers, setManagers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedVaultFilter, setSelectedVaultFilter] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        initial_balance: '',
        manager: ''
    });

    // Request Modals
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedVaultForAssignment, setSelectedVaultForAssignment] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    // User Management states
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userFormData, setUserFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'Employee'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [vaultRes, userRes, reqRes] = await Promise.all([
                api.get('/vaults/'),
                api.get('/users/'),
                api.get('/requests/')
            ]);
            setVaults(vaultRes.data);
            setRequests(reqRes.data);
            setUsers(userRes.data);
            // Filter Vault Managers
            setManagers(userRes.data.filter(u => u.role === 'Vault Manager' || u.role === 'Super Admin'));
        } catch (err) {
            setError('Failed to load vaults data.');
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/vaults/', {
                name: formData.name,
                initial_balance: formData.initial_balance,
                current_balance: formData.initial_balance, // Handled in backend, but just in case
                manager: formData.manager || null
            });
            setShowModal(false);
            fetchData();
            setFormData({ name: '', initial_balance: '', manager: '' });
            toast.success('تم إنشاء الخزينة بنجاح.');
        } catch (err) {
            const errData = err.response?.data;
            if (typeof errData === 'object') {
                const msgs = Object.values(errData).flat().join(', ');
                toast.error(msgs);
            } else {
                toast.error('فشل إنشاء الخزينة.');
            }
        }
    };

    const handleExport = async () => {
        try {
            const res = await api.get('/reports/export/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'financial_inventory_report.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success('تم تصدير التقرير بنجاح.');
        } catch (err) {
            toast.error('فشل تصدير التقرير');
        }
    };

    const openAssign = (req) => {
        setSelectedRequest(req);
        setSelectedVaultForAssignment('');
        setShowAssignModal(true);
    };

    const handleAssign = async () => {
        if (!selectedVaultForAssignment) return;
        try {
            setActionLoading(true);
            await api.patch(`/requests/${selectedRequest.id}/assign_vault/`, {
                vault_id: selectedVaultForAssignment
            });
            setShowAssignModal(false);
            fetchData();
            toast.success('تم تخصيص الخزينة بنجاح.');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'فشل التخصيص');
        } finally {
            setActionLoading(false);
        }
    };

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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(amount);
    };

    // User Management Functions
    const handleUserInputChange = (e) => {
        setUserFormData({ ...userFormData, [e.target.name]: e.target.value });
    };

    const openCreateUserModal = () => {
        setSelectedUser(null);
        setUserFormData({ username: '', email: '', first_name: '', last_name: '', password: '', role: 'Employee' });
        setShowUserModal(true);
    };

    const openEditUserModal = (user) => {
        setSelectedUser(user);
        setUserFormData({
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            password: '', // Leave blank unless they want to change it
            role: user.role
        });
        setShowUserModal(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        try {
            setActionLoading(true);
            const payload = { ...userFormData };
            if (!payload.password) delete payload.password; // don't send empty password on edit

            if (selectedUser) {
                await api.patch(`/users/${selectedUser.id}/`, payload);
                toast.success('تم تحديث المستخدم بنجاح.');
            } else {
                await api.post('/users/', payload);
                toast.success('تم إنشاء المستخدم بنجاح.');
            }
            setShowUserModal(false);
            fetchData();
        } catch (err) {
            const errData = err.response?.data;
            if (typeof errData === 'object') {
                const msgs = Object.values(errData).flat().join(', ');
                toast.error(msgs);
            } else {
                toast.error('فشل حفظ المستخدم.');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا المستخدم؟')) return;
        try {
            setActionLoading(true);
            await api.delete(`/users/${id}/`);
            toast.success('تم حذف المستخدم بنجاح.');
            fetchData();
        } catch (err) {
            toast.error('فشل حذف المستخدم.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div>جاري تحميل لوحة التحكم...</div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>لوحة تحكم المدير العام</h2>
                <div className="d-flex gap-2">
                    <Button variant="outline-success" onClick={handleExport} className="d-flex align-items-center gap-2">
                        <Download size={18} /> تصدير كل التقارير
                    </Button>
                    <Button variant="primary" onClick={() => setShowModal(true)} className="d-flex align-items-center gap-2">
                        <PlusSquare size={18} /> إنشاء خزينة
                    </Button>
                </div>
            </div>

            <Tabs defaultActiveKey="operations" id="super-admin-tabs" className="mb-4 bg-white px-3 pt-3 shadow-sm rounded">
                <Tab eventKey="operations" title="لوحة العمليات والخزائن">
                    <div className="pt-3">
                        <Row className="mb-4">
                            <Col md={12}>
                                <Card className="shadow-sm border-0">
                                    <Card.Header className="bg-white py-3 d-flex align-items-center gap-2">
                                        <Building size={20} className="text-secondary" />
                                        <h5 className="mb-0">إدارة الخزائن</h5>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <Table responsive hover className="mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>اسم الخزينة</th>
                                                    <th>المدير المعين</th>
                                                    <th>الرصيد الافتتاحي</th>
                                                    <th>الرصيد الحالي</th>
                                                    <th>الحالة</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {vaults.map(vault => (
                                                    <tr key={vault.id}>
                                                        <td className="fw-semibold">{vault.name}</td>
                                                        <td>{vault.manager_details ? `${vault.manager_details.first_name} ${vault.manager_details.last_name}` : <span className="text-muted fst-italic">غير معين</span>}</td>
                                                        <td>{formatCurrency(vault.initial_balance)}</td>
                                                        <td className={`fw-bold ${vault.current_balance < (vault.initial_balance * 0.2) ? 'text-danger' : 'text-success'}`}>
                                                            {formatCurrency(vault.current_balance)}
                                                        </td>
                                                        <td>
                                                            <div className="progress" style={{ height: '8px', width: '100px', marginTop: '8px' }}>
                                                                <div className={`progress-bar ${vault.current_balance <= 0 ? 'bg-danger' : 'bg-success'}`}
                                                                    role="progressbar"
                                                                    style={{ width: `${Math.max(0, (vault.current_balance / vault.initial_balance) * 100)}%` }}>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {vaults.length === 0 && (
                                                    <tr><td colSpan="5" className="text-center py-4 text-muted">لا يوجد خزائن.</td></tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <Row className="mb-4">
                            <Col md={12}>
                                <Card className="shadow-sm border-0">
                                    <Card.Header className="bg-white py-3">
                                        <h5 className="mb-0">طلبات الصرف قيد المراجعة</h5>
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
                                                {requests.filter(r => r.status === 'PENDING_SUPER_ADMIN_REVIEW').map(req => (
                                                    <tr key={req.id}>
                                                        <td>
                                                            <span className="fw-semibold">{req.issuance_number}</span>
                                                        </td>
                                                        <td>{req.requestor_details.first_name} {req.requestor_details.last_name}</td>
                                                        <td className="fw-semibold">{formatCurrency(req.amount)}</td>
                                                        <td><Alert variant="warning" className="py-1 px-2 m-0 d-inline-block small">في انتظار التخصيص</Alert></td>
                                                        <td>
                                                            <Button variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1 mx-auto" onClick={() => {
                                                                setSelectedRequest(req);
                                                                setShowTimelineModal(true);
                                                            }}>
                                                                <Eye size={18} /> عرض
                                                            </Button>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex gap-2">
                                                                <Button size="sm" variant="primary" onClick={() => openAssign(req)} disabled={actionLoading}>
                                                                    تخصيص الخزينة
                                                                </Button>
                                                                <Button size="sm" variant="outline-danger" onClick={() => openReject(req)} disabled={actionLoading}>
                                                                    رفض الغرض
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {requests.filter(r => r.status === 'PENDING_SUPER_ADMIN_REVIEW').length === 0 && (
                                                    <tr><td colSpan="6" className="text-center py-4 text-muted">لا يوجد طلبات معلقة تتطلب المراجعة.</td></tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* All Requests / History Table */}
                        <Row className="mb-4">
                            <Col md={12}>
                                <Card className="shadow-sm border-0">
                                    <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0 d-flex align-items-center gap-2">
                                            <FileText size={20} className="text-secondary" /> سجل جميع الطلبات
                                        </h5>
                                        <div style={{ width: '250px' }}>
                                            <Form.Select
                                                size="sm"
                                                value={selectedVaultFilter}
                                                onChange={(e) => setSelectedVaultFilter(e.target.value)}
                                            >
                                                <option value="">جميع الخزائن</option>
                                                <option value="unassigned">غير مخصص (الطلبات المعلقة)</option>
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
                                                    <th>الخزينة المخصصة</th>
                                                    <th>المبلغ</th>
                                                    <th>الحالة</th>
                                                    <th>التفاصيل</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {requests.filter(req => {
                                                    if (selectedVaultFilter === '') return true;
                                                    if (selectedVaultFilter === 'unassigned') return req.vault === null;
                                                    return req.vault === parseInt(selectedVaultFilter);
                                                }).map(req => (
                                                    <tr key={req.id}>
                                                        <td>
                                                            <span className="fw-semibold">{req.issuance_number}</span>
                                                        </td>
                                                        <td>{req.requestor_details.first_name} {req.requestor_details.last_name}</td>
                                                        <td>{req.vault_details ? req.vault_details.name : <span className="text-muted fst-italic">غير معين</span>}</td>
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
                                                ))}
                                                {requests.filter(req => {
                                                    if (selectedVaultFilter === '') return true;
                                                    if (selectedVaultFilter === 'unassigned') return req.vault === null;
                                                    return req.vault === parseInt(selectedVaultFilter);
                                                }).length === 0 && (
                                                        <tr><td colSpan="6" className="text-center py-4 text-muted">لا توجد طلبات.</td></tr>
                                                    )}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </div>
                </Tab>

                <Tab eventKey="users" title="إدارة المستخدمين والصلاحيات">
                    <div className="pt-3">
                        {/* User Management Table */}
                        <Row className="mb-4">
                            <Col md={12}>
                                <Card className="shadow-sm border-0">
                                    <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0 d-flex align-items-center gap-2">
                                            <Users size={20} className="text-secondary" /> إدارة المستخدمين
                                        </h5>
                                        <Button variant="outline-primary" size="sm" onClick={openCreateUserModal} className="d-flex align-items-center gap-2">
                                            <UserPlus size={16} /> إضافة مستخدم
                                        </Button>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <Table responsive hover className="mb-0 align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>اسم المستخدم</th>
                                                    <th>الاسم الكامل</th>
                                                    <th>البريد الإلكتروني</th>
                                                    <th>الصلاحية (الدور)</th>
                                                    <th>الإجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(u => (
                                                    <tr key={u.id}>
                                                        <td className="fw-semibold">{u.username}</td>
                                                        <td>{u.first_name} {u.last_name}</td>
                                                        <td>{u.email}</td>
                                                        <td>
                                                            <Badge bg={
                                                                u.role === 'Super Admin' ? 'danger' :
                                                                    u.role === 'Vault Manager' ? 'primary' : 'secondary'
                                                            }>
                                                                {u.role === 'Super Admin' ? 'مدير عام' :
                                                                    u.role === 'Vault Manager' ? 'أمين صندوق' : 'موظف طالب'}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex gap-2">
                                                                <Button variant="light" size="sm" className="text-primary border" onClick={() => openEditUserModal(u)} disabled={actionLoading}>
                                                                    <Edit size={16} />
                                                                </Button>
                                                                <Button variant="light" size="sm" className="text-danger border" onClick={() => handleDeleteUser(u.id)} disabled={actionLoading}>
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {users.length === 0 && (
                                                    <tr><td colSpan="5" className="text-center py-4 text-muted">لا يوجد مستخدمين.</td></tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </div>
                </Tab>

                <Tab eventKey="analytics" title="التقارير والإحصائيات">
                    <div className="pt-2">
                        <AnalyticsTab />
                    </div>
                </Tab>
            </Tabs>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>إنشاء خزينة جديدة</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>اسم الخزينة *</Form.Label>
                            <Form.Control
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInput}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>الرصيد الافتتاحي (ريال) *</Form.Label>
                            <Form.Control
                                type="number"
                                step="0.01"
                                name="initial_balance"
                                value={formData.initial_balance}
                                onChange={handleInput}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>تعيين أمين صندوق (اختياري)</Form.Label>
                            <Form.Select
                                name="manager"
                                value={formData.manager}
                                onChange={handleInput}
                            >
                                <option value="">--- الرجاء اختيار أمين الصندوق ---</option>
                                {managers.map(m => (
                                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.username})</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>
                            <Button variant="primary" type="submit">إنشاء الخزينة</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Assign Vault Modal */}
            <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>تخصيص خزينة للطلب</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info" className="small">
                        يتم الآن مطابقة الخزينة للطلب رقم <strong>{selectedRequest?.issuance_number}</strong> والمقدر بمبلغ <strong>{selectedRequest && formatCurrency(selectedRequest.amount)}</strong>.
                    </Alert>
                    <Form.Group>
                        <Form.Label>الخزائن المتاحة</Form.Label>
                        <Form.Select
                            value={selectedVaultForAssignment}
                            onChange={(e) => setSelectedVaultForAssignment(e.target.value)}
                        >
                            <option value="">-- اختر الخزينة --</option>
                            {vaults.map(v => (
                                <option
                                    key={v.id}
                                    value={v.id}
                                    disabled={Number(v.current_balance) < Number(selectedRequest?.amount)}
                                >
                                    {v.name} (المتاح: {formatCurrency(v.current_balance)})
                                    {Number(v.current_balance) < Number(selectedRequest?.amount) ? ' - رصيد غير كافي' : ''}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAssignModal(false)}>إلغاء</Button>
                    <Button variant="primary" onClick={handleAssign} disabled={!selectedVaultForAssignment || actionLoading}>
                        {actionLoading ? 'جاري التخصيص...' : 'تأكيد التخصيص'}
                    </Button>
                </Modal.Footer>
            </Modal>

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

            {/* User Modal */}
            <Modal show={showUserModal} onHide={() => setShowUserModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{selectedUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleUserSubmit}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>الاسم الأول *</Form.Label>
                                    <Form.Control type="text" name="first_name" value={userFormData.first_name} onChange={handleUserInputChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>اسم العائلة *</Form.Label>
                                    <Form.Control type="text" name="last_name" value={userFormData.last_name} onChange={handleUserInputChange} required />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>اسم المستخدم (الدخول) *</Form.Label>
                            <Form.Control type="text" name="username" value={userFormData.username} onChange={handleUserInputChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>البريد الإلكتروني *</Form.Label>
                            <Form.Control type="email" name="email" value={userFormData.email} onChange={handleUserInputChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>الدور (الصلاحية) *</Form.Label>
                            <Form.Select name="role" value={userFormData.role} onChange={handleUserInputChange} required>
                                <option value="Employee">موظف (طالب صرف)</option>
                                <option value="Vault Manager">أمين صندوق</option>
                                <option value="Super Admin">مدير عام</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label>كلمة المرور {selectedUser ? '(اترك الحقل فارغاً إذا لم ترغب بتغييرها)' : '*'}</Form.Label>
                            <Form.Control type="password" name="password" value={userFormData.password} onChange={handleUserInputChange} required={!selectedUser} />
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => setShowUserModal(false)}>إلغاء</Button>
                            <Button variant="primary" type="submit" disabled={actionLoading}>حفظ المستخدم</Button>
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

export default SuperAdminDashboard;
