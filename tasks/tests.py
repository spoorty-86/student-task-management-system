from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model

from .models import Task


class StudentTaskSystemTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='student1',
            email='student1@example.com',
            password='StrongPass123!'
        )

    def test_registration_page_loads(self):
        response = self.client.get(reverse('register'))
        self.assertEqual(response.status_code, 200)

    def test_login_page_loads(self):
        response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)

    def test_dashboard_requires_authentication(self):
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login/', response.url)

    def test_user_can_register(self):
        response = self.client.post(
            reverse('register'),
            {
                'username': 'newstudent',
                'email': 'newstudent@example.com',
                'password1': 'StrongPass123!',
                'password2': 'StrongPass123!',
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(get_user_model().objects.filter(username='newstudent').exists())

    def test_user_can_create_task(self):
        self.client.login(username='student1', password='StrongPass123!')
        response = self.client.post(
            reverse('create_task'),
            {
                'title': 'Submit assignment',
                'description': 'Finish the student task system assignment.',
                'priority': 'High',
                'status': 'To Do',
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Task.objects.filter(title='Submit assignment').exists())

    def test_task_status_can_be_updated(self):
        task = Task.objects.create(
            title='Review code',
            description='Check the project files.',
            created_by=self.user,
            assignee=self.user,
            priority='Medium',
            status='To Do',
        )
        self.client.login(username='student1', password='StrongPass123!')
        response = self.client.post(
            reverse('update_task_status', args=[task.id]),
            {'status': 'In Progress'},
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.status, 'In Progress')
