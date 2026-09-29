from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register, name="register"),
    path("login/", views.student_login, name="student_login"),
    path("logout/", views.student_logout, name="student_logout"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("tasks/", views.view_tasks, name="view_tasks"),
    path("tasks/create/", views.create_task, name="create_task"),
]