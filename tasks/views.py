from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.views import LogoutView
from django.db.models import Q
from django.shortcuts import redirect, render

from .models import Task


def register_view(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Account created successfully.')
            return redirect('dashboard')
    else:
        form = UserCreationForm()
    return render(request, 'register.html', {'form': form})


def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            login(request, form.get_user())
            return redirect('dashboard')
    else:
        form = AuthenticationForm()
    return render(request, 'login.html', {'form': form})


@login_required(login_url='login')
def dashboard_view(request):
    tasks = list(Task.objects.filter(
        Q(created_by=request.user) | Q(assignee=request.user)
    ).distinct().order_by('deadline', '-created_at'))

    return render(request, 'dashboard.html', {'tasks': tasks, 'request_user': request.user})


@login_required(login_url='login')
def create_task(request):
    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        description = request.POST.get('description', '').strip()
        priority = request.POST.get('priority', 'Medium')
        status = request.POST.get('status', 'To Do')

        if title:
            Task.objects.create(
                title=title,
                description=description,
                created_by=request.user,
                assignee=request.user,
                priority=priority,
                status=status,
            )
            messages.success(request, 'Task created successfully.')
        return redirect('dashboard')

    return render(request, 'create_task.html', {'request_user': request.user})


@login_required(login_url='login')
def update_task_status(request, task_id):
    task = Task.objects.filter(id=task_id).first()
    if task is None:
        return redirect('dashboard')

    if request.method == 'POST':
        new_status = request.POST.get('status')
        if new_status in dict(Task.STATUS_CHOICES):
            task.status = new_status
            task.save()

    return redirect('dashboard')


logout_view = LogoutView.as_view(next_page='login')
