from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register, name="register"),
    path("login/", views.student_login, name="student_login"),
    path("logout/", views.student_logout, name="student_logout"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("task/create/", views.create_task, name="create_task"),
    path("task/<int:task_id>/", views.task_detail, name="task_detail"),
    path("task/<int:task_id>/change-assignee/", views.change_task_assignee, name="change_task_assignee"),
    path("task/<int:task_id>/update-status/", views.update_task_status, name="update_task_status"),
    path("task/<int:task_id>/review/", views.review_task, name="review_task"),
    path("completed-reviews/", views.completed_reviews, name="completed_reviews"),
    path("progress-report/", views.progress_report, name="progress_report"),
    path("notification/<int:notification_id>/read/", views.mark_notification_read, name="mark_notification_read"),
]