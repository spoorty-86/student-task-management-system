from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register, name="register"),
    path("login/", views.student_login, name="student_login"),
    path("logout/", views.student_logout, name="student_logout"),
    path("dashboard/", views.dashboard, name="dashboard"),
]