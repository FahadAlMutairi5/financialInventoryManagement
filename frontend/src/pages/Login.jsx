import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { Wallet } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(username, password);
            toast.success('تم تسجيل الدخول بنجاح');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <Container>
                <Row className="justify-content-center">
                    <Col md={6} lg={5} xl={4}>
                        <Card className="shadow-lg border-0 rounded-4">
                            <Card.Body className="p-5">
                                <div className="text-center mb-4">
                                    <div className="bg-primary text-white p-3 rounded-circle d-inline-block mb-3">
                                        <Wallet size={32} />
                                    </div>
                                    <h3 className="fw-bold mb-1">إدارة المخزون المالي</h3>
                                    <p className="text-muted">قم بتسجيل الدخول لإدارة الخزائن الخاصة بك</p>
                                </div>

                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-4" controlId="formUsername">
                                        <Form.Label className="small fw-semibold text-muted text-uppercase">اسم المستخدم (الموظف)</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="أدخل اسم المستخدم AD الخاص بك"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            size="lg"
                                            className="bg-light fs-6"
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4" controlId="formPassword">
                                        <Form.Label className="small fw-semibold text-muted text-uppercase">كلمة المرور</Form.Label>
                                        <Form.Control
                                            type="password"
                                            placeholder="كلمة المرور"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            size="lg"
                                            className="bg-light fs-6"
                                        />
                                    </Form.Group>

                                    <Button
                                        variant="primary"
                                        type="submit"
                                        className="w-100 py-2 fs-5 fw-semibold shadow-sm"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                                    </Button>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;
