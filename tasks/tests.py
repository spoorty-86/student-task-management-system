from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.core import mail
from django.utils import timezone
from tasks.models import Task, Notification


class TaskManagementTestCase(TestCase):
    def setUp(self):
        # Create team members
        self.user1 = User.objects.create_user(
            username="alice",
            email="alice@university.edu",
            password="password123"
        )
        self.user2 = User.objects.create_user(
            username="bob",
            email="bob@university.edu",
            password="password123"
        )
        self.user3 = User.objects.create_user(
            username="charlie",
            email="charlie@university.edu",
            password="password123"
        )

        # Create sample tasks
        self.task1 = Task.objects.create(
            title="Design Database Schema",
            description="Create tables and relations for task management.",
            created_by=self.user1,
            assignee=self.user2,
            priority="High",
            status="Pending"
        )

        self.task2 = Task.objects.create(
            title="Implement API Authentication",
            description="Set up JWT or session authentication.",
            created_by=self.user1,
            assignee=self.user2,
            priority="Medium",
            status="Completed",
            completion_date=timezone.now()
        )

        self.client = Client()

    def test_task_creation_and_initial_assignee(self):
        self.assertEqual(self.task1.title, "Design Database Schema")
        self.assertEqual(self.task1.assignee, self.user2)
        self.assertEqual(self.task1.created_by, self.user1)

    def test_assigned_student_update_task_status(self):
        # Login as assigned student Bob
        self.client.login(username="bob", password="password123")

        # Update status to 'In Progress'
        url = reverse("update_task_status", kwargs={"task_id": self.task1.id})
        response = self.client.post(url, {"status": "In Progress"}, follow=True)
        self.assertEqual(response.status_code, 200)

        self.task1.refresh_from_db()
        self.assertEqual(self.task1.status, "In Progress")

        # Update status to 'Completed'
        response = self.client.post(url, {"status": "Completed"}, follow=True)
        self.assertEqual(response.status_code, 200)

        self.task1.refresh_from_db()
        self.assertEqual(self.task1.status, "Completed")
        self.assertIsNotNone(self.task1.completion_date)

    def test_unauthorized_user_cannot_update_task_status(self):
        # Login as Charlie (neither creator nor assignee)
        self.client.login(username="charlie", password="password123")

        url = reverse("update_task_status", kwargs={"task_id": self.task1.id})
        response = self.client.post(url, {"status": "Completed"}, follow=True)

        self.task1.refresh_from_db()
        self.assertEqual(self.task1.status, "Pending")
        self.assertContains(response, "You do not have permission to update the status")

    def test_change_task_assignee_success(self):
        # Login as Alice (authorized as task creator)
        self.client.login(username="alice", password="password123")

        # Reassign task to Charlie (user3)
        url = reverse("change_task_assignee", kwargs={"task_id": self.task1.id})
        response = self.client.post(url, {"assignee": self.user3.id}, follow=True)

        self.assertEqual(response.status_code, 200)

        self.task1.refresh_from_db()
        self.assertEqual(self.task1.assignee, self.user3)

        notification = Notification.objects.filter(user=self.user3).first()
        self.assertIsNotNone(notification)

    def test_review_completed_task(self):
        # Login as task creator Alice (Manager / Reviewer)
        self.client.login(username="alice", password="password123")

        review_url = reverse("review_task", kwargs={"task_id": self.task2.id})
        response = self.client.post(
            review_url,
            {"review_feedback": "Excellent work on authentication!"},
            follow=True
        )

        self.assertEqual(response.status_code, 200)

        self.task2.refresh_from_db()
        self.assertTrue(self.task2.is_reviewed)
        self.assertEqual(self.task2.review_feedback, "Excellent work on authentication!")
        self.assertEqual(self.task2.reviewed_by, self.user1)

    def test_completed_reviews_page(self):
        self.client.login(username="alice", password="password123")
        url = reverse("completed_reviews")
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Implement API Authentication")

    def test_generate_progress_report(self):
        self.client.login(username="alice", password="password123")
        url = reverse("progress_report")
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["total_tasks"], 2)
        self.assertEqual(response.context["completed_count"], 1)
        self.assertEqual(response.context["completion_rate"], 50.0)

    def test_export_progress_report_csv(self):
        self.client.login(username="alice", password="password123")
        url = reverse("progress_report") + "?export=csv"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn('attachment; filename="student_task_progress_report.csv"', response["Content-Disposition"])
        self.assertIn(b"Student Task Management System - Progress Report", response.content)
