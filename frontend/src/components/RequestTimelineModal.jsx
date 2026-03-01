import React from 'react';
import { Modal, Badge, Button } from 'react-bootstrap';
import { Calendar, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

const RequestTimelineModal = ({ show, onHide, request }) => {
    if (!request) return null;

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('ar-SA', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'غير محدد';
        return new Date(dateString).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(amount);
    };

    const getFileUrl = (path) => path?.startsWith('http') ? path : `http://localhost:8000${path}`;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <Clock size={20} className="text-primary" />
                    <span>تفاصيل الطلب: {request.issuance_number}</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                        <small className="text-muted d-block">المبلغ المطلوب</small>
                        <span className="fw-bold fs-5">{formatCurrency(request.amount)}</span>
                    </div>
                    <div className="col-md-6 mb-3">
                        <small className="text-muted d-block">تاريخ الصرف المطلوب</small>
                        <span className="fw-bold d-flex align-items-center gap-1">
                            <Calendar size={16} /> {formatDate(request.requested_payout_date)}
                        </span>
                    </div>
                    <div className="col-md-6 mb-3">
                        <small className="text-muted d-block">الخزينة</small>
                        <span className="fw-semibold">{request.vault_details ? request.vault_details.name : 'قيد الانتظار'}</span>
                    </div>
                    <div className="col-md-6 mb-3">
                        <small className="text-muted d-block">مقدم الطلب</small>
                        <span className="fw-semibold">{request.requestor_details?.first_name} {request.requestor_details?.last_name} ({request.requestor_details?.username})</span>
                    </div>
                </div>

                <div className="border-top pt-4">
                    <h5 className="mb-4 d-flex align-items-center gap-2">
                        المسار الزمني (Timeline)
                    </h5>

                    <div className="timeline position-relative ps-4 ms-2" style={{ borderRight: '2px solid #e9ecef', paddingRight: '1rem' }}>

                        {/* Step 1: Created */}
                        <div className="timeline-item position-relative mb-4">
                            <div className="timeline-icon bg-primary text-white rounded-circle position-absolute d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', right: '-1.05rem', top: 0, zIndex: 1 }}>
                                <CheckCircle size={16} />
                            </div>
                            <div className="timeline-content">
                                <strong className="d-block mb-1">تم تقديم الطلب</strong>
                                <p className="mb-0 text-muted small">{formatDateTime(request.created_at)}</p>
                                {request.letter_attachment && (
                                    <a href={getFileUrl(request.letter_attachment)} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary mt-2 d-inline-flex align-items-center gap-1">
                                        <FileText size={14} /> الخطاب الرسمي
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Step 2: Assigned / Pending Vault Manager */}
                        {request.vault_details && (
                            <div className="timeline-item position-relative mb-4">
                                <div className="timeline-icon bg-warning text-dark rounded-circle position-absolute d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', right: '-1.05rem', top: 0, zIndex: 1 }}>
                                    <CheckCircle size={16} />
                                </div>
                                <div className="timeline-content">
                                    <strong className="d-block mb-1">تمت الموافقة من المدير العام</strong>
                                    <p className="mb-0 text-muted small">تم تحويله إلى {request.vault_details.name}</p>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Completed or Rejected */}
                        {(request.status === 'COMPLETED' || request.status === 'REJECTED') && (
                            <div className="timeline-item position-relative mb-4">
                                <div className={`timeline-icon ${request.status === 'COMPLETED' ? 'bg-success' : 'bg-danger'} text-white rounded-circle position-absolute d-flex align-items-center justify-content-center`} style={{ width: '32px', height: '32px', right: '-1.05rem', top: 0, zIndex: 1 }}>
                                    {request.status === 'COMPLETED' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                </div>
                                <div className="timeline-content">
                                    <strong className="d-block mb-1">{request.status === 'COMPLETED' ? 'مكتمل (تم الصرف)' : 'مرفوض'}</strong>
                                    <p className="mb-0 text-muted small">{formatDateTime(request.updated_at)}</p>

                                    {request.status === 'COMPLETED' && request.receipt_attachment && (
                                        <div className="mt-2">
                                            <span className="badge bg-light text-dark border d-inline-block mb-2">رقم المعاملة: {request.transaction_id}</span><br />
                                            <a href={getFileUrl(request.receipt_attachment)} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1">
                                                <FileText size={14} /> سند القبض
                                            </a>
                                        </div>
                                    )}

                                    {request.status === 'REJECTED' && request.rejection_reason && (
                                        <div className="mt-2 alert alert-danger py-2 small mb-0">
                                            <strong>سبب الرفض: </strong> {request.rejection_reason}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={onHide}>إغلاق</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default RequestTimelineModal;
