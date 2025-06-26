from django.shortcuts import render, redirect
from .models import Week,Staff,Shift, AssignedShift
from .services.shift_assignment import assign_shifts_for_week
from django.views.decorators.csrf import csrf_protect
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count
from lineShift.models import WeeklyShift
from datetime import date, timedelta


def dashboard(request):
    return render(request, 'dashboard.html')  # テンプレートが存在することを確認！

@csrf_protect
def generate_and_edit(request):
    if request.method == 'POST':
        latest_week = Week.objects.latest('start_date')
        assign_shifts_for_week(latest_week.id)
        return redirect('shift_list')
    return redirect('dashboard')

@csrf_protect
def shift_list(request):
    shifts = Shift.objects.all().order_by('date', 'start_time')
    staff_list = Staff.objects.all()

    if request.method == 'POST':
        for shift in shifts:
            staff_id = request.POST.get(f'staff_{shift.id}')
            if staff_id:
                staff = Staff.objects.get(id=staff_id)
                # 重複防止
                already_assigned = AssignedShift.objects.filter(shift=shift, staff=staff).exists()
                if not already_assigned:
                    AssignedShift.objects.create(shift=shift, staff=staff)

        return redirect('shift_list')

    return render(request, 'shift_list.html', {
        'shifts': shifts,
        'staff_list': staff_list,
    })

def view_submissions(request):
    # ここに希望提出の一覧取得ロジックを書く
    return render(request, 'view_submissions.html')

@staff_member_required
def weekly_submission_status(request):
    # 今週の月曜日を取得
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # 月曜日

    # ユニークなline_user_idの一覧
    all_users = WeeklyShift.objects.values_list('line_user_id', flat=True).distinct()

    # 今週提出しているユーザー一覧
    submitted_users = WeeklyShift.objects.filter(week_start_date=week_start).values_list('line_user_id', flat=True)

    status_list = []
    for user in all_users:
        status_list.append({
            'line_user_id': user,
            'submitted': user in submitted_users,
        })

    return render(request, 'shift/view_submissions.html', {
        'week_start': week_start,
        'status_list': status_list
    })