from django.urls import path
from . import views

urlpatterns = [
    path("", views.student_login, name="home"),
    path("register/", views.register, name="register"),
    path("login/", views.student_login, name="login"),
    path("student_login/", views.student_login, name="student_login"),
    path("logout/", views.student_logout, name="student_logout"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("tasks/", views.view_tasks, name="view_tasks"),
    path("tasks/create/", views.create_task, name="create_task"),
    path("tasks/update/<int:task_id>/", views.update_task, name="update_task"),
    path("tasks/update_status/<int:task_id>/", views.update_task_status, name="update_task_status"),
    path("tasks/delete/<int:task_id>/", views.delete_task, name="delete_task"),
]


