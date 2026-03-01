import { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Database, FileText } from 'lucide-react';

const MainLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-vh-100 bg-light">
            <Navbar bg="white" expand="lg" className="shadow-sm sticky-top">
                <Container>
                    <Navbar.Brand as={Link} to="/" className="fw-bold text-primary d-flex align-items-center gap-2">
                        <Database size={24} className="text-primary" />
                        المخزون المالي
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            {user?.role === 'Super Admin' && (
                                <Nav.Link as={Link} to="/" className="d-flex align-items-center gap-2 ms-3">
                                    <LayoutDashboard size={18} /> لوحة التحكم
                                </Nav.Link>
                            )}
                            {user?.role === 'Vault Manager' && (
                                <Nav.Link as={Link} to="/" className="d-flex align-items-center gap-2 ms-3">
                                    <LayoutDashboard size={18} /> خزائني
                                </Nav.Link>
                            )}
                            {user?.role === 'Employee' && (
                                <Nav.Link as={Link} to="/" className="d-flex align-items-center gap-2 ms-3">
                                    <FileText size={18} /> طلباتي
                                </Nav.Link>
                            )}
                        </Nav>
                        <div className="d-flex align-items-center gap-3 ms-auto">
                            <span className="text-muted small">
                                مسجل الدخول باسم <strong className="text-dark">{user?.username}</strong> <span className="badge bg-secondary me-1">{user?.role === 'Super Admin' ? 'مدير عام' : user?.role === 'Vault Manager' ? 'أمين صندوق' : 'موظف'}</span>
                            </span>
                            <Button variant="outline-danger" size="sm" onClick={handleLogout} className="d-flex align-items-center gap-2 ms-2">
                                <LogOut size={16} /> تسجيل الخروج
                            </Button>
                        </div>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="py-4">
                <Outlet />
            </Container>
        </div>
    );
};

export default MainLayout;
