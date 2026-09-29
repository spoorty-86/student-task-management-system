from django.urls import path

from .views import (
    create_task,
    dashboard_view,
    login_view,
    logout_view,
    register_view,
    update_task_status,
)

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('dashboard/', dashboard_view, name='dashboard'),
    path('tasks/create/', create_task, name='create_task'),
    path('tasks/<int:task_id>/status/', update_task_status, name='update_task_status'),
    path('', dashboard_view, name='home'),
]
