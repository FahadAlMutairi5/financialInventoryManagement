import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fin_inv_man_backend.settings')
django.setup()

from django.contrib.auth.models import User, Group

# Create Groups
super_admin_group, _ = Group.objects.get_or_create(name='Super Admin')
vault_manager_group, _ = Group.objects.get_or_create(name='Vault Manager')
employee_group, _ = Group.objects.get_or_create(name='Employee')

# Create Super Admin
if not User.objects.filter(username='admin').exists():
    admin = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("Superuser 'admin' created with password 'admin123'")

# Create Sample Vault Manager
if not User.objects.filter(username='manager1').exists():
    manager = User.objects.create_user('manager1', 'manager1@example.com', 'manager123', first_name='Vault', last_name='Manager 1')
    manager.groups.add(vault_manager_group)
    print("Manager 'manager1' created with password 'manager123'")

# Create Sample Employee
if not User.objects.filter(username='emp1').exists():
    emp = User.objects.create_user('emp1', 'emp1@example.com', 'emp123', first_name='Test', last_name='Employee 1')
    emp.groups.add(employee_group)
    print("Employee 'emp1' created with password 'emp123'")

print("Database seeding completed.")
