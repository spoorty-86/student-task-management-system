import csv
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.http import HttpResponse
from .models import Task, Notification


def register(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "").strip()

        if not username or not email or not password:
            messages.error(request, "All fields are required.")
            return redirect("register")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already exists")
            return redirect("register")

        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already registered")
            return redirect("register")

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        login(request, user)
        messages.success(request, f"Welcome {user.username}! Registration successful.")
        return redirect("dashboard")

    return render(request, "register.html")


def student_login(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "").strip()

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user is not None:
            login(request, user)
            messages.success(request, f"Welcome back, {user.username}!")
            return redirect("dashboard")

        messages.error(request, "Invalid username or password")

    return render(request, "login.html")


def student_logout(request):
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect("student_login")


@login_required(login_url="student_login")
def dashboard(request):
    assigned_tasks = Task.objects.filter(assignee=request.user).order_by("-created_at")
    created_tasks = Task.objects.filter(created_by=request.user).order_by("-created_at")
    all_tasks = Task.objects.all().order_by("-created_at")
    completed_tasks = Task.objects.filter(status="Completed").order_by("-completion_date")
    
    notifications = Notification.objects.filter(user=request.user)
    unread_notifications_count = notifications.filter(is_read=False).count()
    team_members = User.objects.all().order_by("username")

    context = {
        "assigned_tasks": assigned_tasks,
        "created_tasks": created_tasks,
        "all_tasks": all_tasks,
        "completed_tasks": completed_tasks,
        "notifications": notifications,
        "unread_notifications_count": unread_notifications_count,
        "team_members": team_members,
    }
    return render(request, "dashboard.html", context)


@login_required(login_url="student_login")
def create_task(request):
    if request.method == "POST":
        title = request.POST.get("title", "").strip()
        description = request.POST.get("description", "").strip()
        assignee_id = request.POST.get("assignee")
        priority = request.POST.get("priority", "Medium")
        status = request.POST.get("status", "Pending")
        deadline = request.POST.get("deadline") or None

        if not title:
            messages.error(request, "Task title is required.")
            return redirect("create_task")

        assignee = None
        if assignee_id:
            assignee = User.objects.filter(id=assignee_id).first()

        completion_date = timezone.now() if status == "Completed" else None

        task = Task.objects.create(
            title=title,
            description=description,
            created_by=request.user,
            assignee=assignee,
            priority=priority,
            status=status,
            deadline=deadline,
            completion_date=completion_date
        )

        if assignee:
            # Create notification
            Notification.objects.create(
                user=assignee,
                task=task,
                message=f"You have been assigned to task '{task.title}' by {request.user.username}."
            )
            # Send Email
            if assignee.email:
                try:
                    send_mail(
                        subject=f"[Task Assigned] {task.title}",
                        message=f"Hello {assignee.username},\n\nYou have been assigned a new task: '{task.title}' by {request.user.username}.\n\nPriority: {task.priority}\nStatus: {task.status}\nDeadline: {task.deadline}\n\nPlease visit your dashboard to view the task details.",
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@studenttask.com'),
                        recipient_list=[assignee.email],
                        fail_silently=True
                    )
                except Exception:
                    pass

        messages.success(request, f"Task '{task.title}' created successfully!")
        return redirect("dashboard")

    team_members = User.objects.all().order_by("username")
    return render(request, "create_task.html", {"team_members": team_members})


@login_required(login_url="student_login")
def task_detail(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    team_members = User.objects.all().order_by("username")
    task_notifications = Notification.objects.filter(task=task).order_by("-created_at")

    # Authorization check for editing/status updates: creator, current assignee, or staff
    is_authorized = (
        request.user == task.created_by or 
        request.user == task.assignee or 
        request.user.is_staff or
        request.user.is_superuser
    )

    can_review = (
        task.status == "Completed" and (
            request.user == task.created_by or 
            request.user.is_staff or 
            request.user.is_superuser
        )
    )

    context = {
        "task": task,
        "team_members": team_members,
        "task_notifications": task_notifications,
        "is_authorized": is_authorized,
        "can_review": can_review,
    }
    return render(request, "task_detail.html", context)


@login_required(login_url="student_login")
def change_task_assignee(request, task_id):
    if request.method == "POST":
        task = get_object_or_404(Task, id=task_id)

        # Authorization check
        is_authorized = (
            request.user == task.created_by or 
            request.user == task.assignee or 
            request.user.is_staff or
            request.user.is_superuser
        )

        if not is_authorized:
            messages.error(request, "You are not authorized to change the assignee of this task.")
            return redirect("task_detail", task_id=task.id)

        new_assignee_id = request.POST.get("assignee")
        old_assignee = task.assignee

        if new_assignee_id:
            new_assignee = get_object_or_404(User, id=new_assignee_id)
            if old_assignee == new_assignee:
                messages.info(request, f"Task is already assigned to {new_assignee.username}.")
                return redirect("task_detail", task_id=task.id)

            task.assignee = new_assignee
            task.save()

            # Create notification for new assignee
            Notification.objects.create(
                user=new_assignee,
                task=task,
                message=f"You have been assigned to task '{task.title}' by {request.user.username}."
            )

            # Send Email notification to new assignee
            if new_assignee.email:
                try:
                    send_mail(
                        subject=f"[Task Reassigned] You have been assigned to: {task.title}",
                        message=(
                            f"Hello {new_assignee.username},\n\n"
                            f"You have been assigned to the task '{task.title}' by {request.user.username}.\n\n"
                            f"Task Details:\n"
                            f"- Title: {task.title}\n"
                            f"- Status: {task.status}\n"
                            f"- Priority: {task.priority}\n"
                            f"- Deadline: {task.deadline or 'No deadline'}\n"
                            f"- Description: {task.description or 'No description'}\n\n"
                            f"Log in to the Student Task Management System to view and manage this task."
                        ),
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@studenttask.com'),
                        recipient_list=[new_assignee.email],
                        fail_silently=True
                    )
                except Exception:
                    pass

            messages.success(
                request, 
                f"Task assignee changed successfully from '{old_assignee.username if old_assignee else 'Unassigned'}' to '{new_assignee.username}'."
            )
        else:
            task.assignee = None
            task.save()
            messages.success(request, "Task assignee removed successfully.")

        return redirect("task_detail", task_id=task.id)

    return redirect("dashboard")


@login_required(login_url="student_login")
def update_task_status(request, task_id):
    if request.method == "POST":
        task = get_object_or_404(Task, id=task_id)

        # Permission Check: Creator, Assigned Student, Staff, Superuser
        is_authorized = (
            request.user == task.created_by or 
            request.user == task.assignee or 
            request.user.is_staff or
            request.user.is_superuser
        )

        if not is_authorized:
            messages.error(request, "You do not have permission to update the status of this task.")
            return redirect("task_detail", task_id=task.id)

        new_status = request.POST.get("status")

        if new_status in dict(Task.STATUS_CHOICES):
            old_status = task.status
            if old_status == new_status:
                messages.info(request, f"Task is already set to status '{new_status}'.")
                return redirect("task_detail", task_id=task.id)

            task.status = new_status
            
            # Update completion date
            if new_status == "Completed" and old_status != "Completed":
                task.completion_date = timezone.now()
            elif new_status != "Completed":
                task.completion_date = None
                task.is_reviewed = False

            task.save()

            # Create notification for target user
            target_user = task.created_by if request.user == task.assignee else task.assignee
            if target_user and target_user != request.user:
                Notification.objects.create(
                    user=target_user,
                    task=task,
                    message=f"Status of task '{task.title}' updated from '{old_status}' to '{new_status}' by {request.user.username}."
                )

            messages.success(request, f"Task status updated to '{new_status}' successfully.")
        else:
            messages.error(request, "Invalid status choice selected.")

        return redirect("task_detail", task_id=task.id)

    return redirect("dashboard")


@login_required(login_url="student_login")
def review_task(request, task_id):
    if request.method == "POST":
        task = get_object_or_404(Task, id=task_id)

        if task.status != "Completed":
            messages.error(request, "Only completed tasks can be reviewed.")
            return redirect("task_detail", task_id=task.id)

        # Authorization check for reviewing
        can_review = (
            request.user == task.created_by or 
            request.user.is_staff or 
            request.user.is_superuser
        )

        if not can_review:
            messages.error(request, "You are not authorized to review this task.")
            return redirect("task_detail", task_id=task.id)

        review_feedback = request.POST.get("review_feedback", "").strip()
        
        task.is_reviewed = True
        task.review_feedback = review_feedback
        task.reviewed_by = request.user
        task.reviewed_at = timezone.now()
        task.save()

        # Notify assigned student about the review
        if task.assignee:
            Notification.objects.create(
                user=task.assignee,
                task=task,
                message=f"Your completed task '{task.title}' has been reviewed by {request.user.username}."
            )

        messages.success(request, f"Task '{task.title}' has been marked as reviewed with your feedback.")
        return redirect("task_detail", task_id=task.id)

    return redirect("completed_reviews")


@login_required(login_url="student_login")
def completed_reviews(request):
    completed_tasks = Task.objects.filter(status="Completed").order_by("-completion_date", "-created_at")
    pending_reviews = completed_tasks.filter(is_reviewed=False)
    reviewed_tasks = completed_tasks.filter(is_reviewed=True)

    context = {
        "completed_tasks": completed_tasks,
        "pending_reviews": pending_reviews,
        "reviewed_tasks": reviewed_tasks,
    }
    return render(request, "completed_reviews.html", context)


@login_required(login_url="student_login")
def progress_report(request):
    total_tasks = Task.objects.count()
    pending_count = Task.objects.filter(status="Pending").count()
    todo_count = Task.objects.filter(status="To Do").count()
    in_progress_count = Task.objects.filter(status="In Progress").count()
    completed_count = Task.objects.filter(status="Completed").count()

    high_priority_count = Task.objects.filter(priority="High").count()
    medium_priority_count = Task.objects.filter(priority="Medium").count()
    low_priority_count = Task.objects.filter(priority="Low").count()

    reviewed_count = Task.objects.filter(status="Completed", is_reviewed=True).count()
    unreviewed_count = Task.objects.filter(status="Completed", is_reviewed=False).count()

    completion_rate = round((completed_count / total_tasks * 100), 1) if total_tasks > 0 else 0

    team_members = User.objects.all().order_by("username")
    member_stats = []
    for member in team_members:
        assigned = Task.objects.filter(assignee=member)
        m_total = assigned.count()
        m_completed = assigned.filter(status="Completed").count()
        m_in_progress = assigned.filter(status="In Progress").count()
        m_pending = assigned.filter(status__in=["Pending", "To Do"]).count()
        m_rate = round((m_completed / m_total * 100), 1) if m_total > 0 else 0
        
        member_stats.append({
            "member": member,
            "total": m_total,
            "completed": m_completed,
            "in_progress": m_in_progress,
            "pending": m_pending,
            "rate": m_rate,
        })

    # CSV Export option
    if request.GET.get("export") == "csv":
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="student_task_progress_report.csv"'
        
        writer = csv.writer(response)
        writer.writerow(["Student Task Management System - Progress Report"])
        writer.writerow(["Generated At", timezone.now().strftime("%Y-%m-%d %H:%M:%S")])
        writer.writerow([])
        
        writer.writerow(["System Overview Summary"])
        writer.writerow(["Total Tasks", total_tasks])
        writer.writerow(["Pending Tasks", pending_count])
        writer.writerow(["To Do Tasks", todo_count])
        writer.writerow(["In Progress Tasks", in_progress_count])
        writer.writerow(["Completed Tasks", completed_count])
        writer.writerow(["Overall Completion Rate (%)", f"{completion_rate}%"])
        writer.writerow([])
        
        writer.writerow(["Student Performance Breakdown"])
        writer.writerow(["Student Username", "Email", "Assigned Tasks", "Completed Tasks", "In Progress", "Pending", "Completion Rate (%)"])
        for stat in member_stats:
            writer.writerow([
                stat["member"].username,
                stat["member"].email or "N/A",
                stat["total"],
                stat["completed"],
                stat["in_progress"],
                stat["pending"],
                f"{stat['rate']}%"
            ])
            
        return response

    context = {
        "total_tasks": total_tasks,
        "pending_count": pending_count,
        "todo_count": todo_count,
        "in_progress_count": in_progress_count,
        "completed_count": completed_count,
        "high_priority_count": high_priority_count,
        "medium_priority_count": medium_priority_count,
        "low_priority_count": low_priority_count,
        "reviewed_count": reviewed_count,
        "unreviewed_count": unreviewed_count,
        "completion_rate": completion_rate,
        "member_stats": member_stats,
    }
    return render(request, "progress_report.html", context)


@login_required(login_url="student_login")
def mark_notification_read(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.is_read = True
    notification.save()
    return redirect(request.META.get('HTTP_REFERER', 'dashboard'))