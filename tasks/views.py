from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from .models import Task


def register(request):
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        password = request.POST.get("password")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already exists")
            return redirect("register")

        User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        messages.success(request, "Registration successful!")
        return redirect("register")

    return render(request, "register.html")


def student_login(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user is not None:
            login(request, user)
            return redirect("dashboard")

        messages.error(request, "Invalid username or password")

    return render(request, "login.html")


def student_logout(request):
    logout(request)
    return redirect("student_login")


@login_required
def dashboard(request):
    tasks = Task.objects.filter(created_by=request.user).order_by("-created_at")
    return render(request, "dashboard.html", {"tasks": tasks})



@login_required
def view_tasks(request):
    tasks = Task.objects.filter(
        created_by=request.user
    ).order_by("-created_at")

    return render(
        request,
        "tasks/tasks.html",
        {"tasks": tasks}
    )


@login_required
def delete_task(request, task_id):
    task = get_object_or_404(
        Task,
        id=task_id,
        created_by=request.user
    )

    if request.method == "POST":
        task.delete()

    return redirect("view_tasks")


@login_required
def create_task(request):
    if request.method == "POST":
        title = request.POST.get("title")
        description = request.POST.get("description")

        if not title:
            return render(
                request,
                "create_task.html",
                {"error": "Task title is required."}
            )

        Task.objects.create(
            title=title,
            description=description,
            created_by=request.user
        )

        return redirect("view_tasks")

    return render(request, "create_task.html")


@login_required
def update_task(request, task_id):
    task = get_object_or_404(
        Task,
        id=task_id,
        created_by=request.user
    )

    if request.method == "POST":
        task.title = request.POST.get("title")
        task.description = request.POST.get("description")
        task.save()
        return redirect("view_tasks")

    return render(
        request,
        "update_task.html",
        {"task": task}
    )


@login_required
def update_task_status(request, task_id):
    task = get_object_or_404(
        Task,
        id=task_id,
        created_by=request.user
    )

    if request.method == "POST":
        status = request.POST.get("status")
        if status:
            task.status = status
            task.save()

    return redirect("view_tasks")



