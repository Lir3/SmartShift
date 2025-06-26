from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, time

from createShift.models import Role, Staff, Week, Shift, ShiftRoleRequirement, ShiftPreference

class Command(BaseCommand):
    help = "Create test data for shifts"

    def handle(self, *args, **kwargs):
        # 役職
        general = Role.objects.create(name="一般", rank=1)
        leader = Role.objects.create(name="リーダー", rank=2)
        manager = Role.objects.create(name="マネージャー", rank=3)

        # スタッフ
        s1 = Staff.objects.create(name="田中", role=general, is_high_school_student=False)
        s2 = Staff.objects.create(name="佐藤", role=leader, is_high_school_student=False)
        s3 = Staff.objects.create(name="鈴木", role=general, is_high_school_student=True, work_end_limit=time(21, 0))
        s4 = Staff.objects.create(name="高橋", role=manager, is_high_school_student=False)

        # 今週
        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())  # 月曜日
        end_of_week = start_of_week + timedelta(days=6)
        week = Week.objects.create(start_date=start_of_week, end_date=end_of_week)

        # シフト作成（毎日2枠）
        for i in range(7):
            date = start_of_week + timedelta(days=i)
            morning_shift = Shift.objects.create(
                week=week, date=date,
                start_time=time(9, 0), end_time=time(13, 0),
                required_staff=2
            )
            night_shift = Shift.objects.create(
                week=week, date=date,
                start_time=time(17, 0), end_time=time(21, 0),
                required_staff=2
            )

            # 役職別必要人数
            for shift in [morning_shift, night_shift]:
                ShiftRoleRequirement.objects.create(shift=shift, role=general, min_required=1)
                ShiftRoleRequirement.objects.create(shift=shift, role=leader, min_required=1)

        # 希望シフト（希望をバラけさせる）
        all_shifts = Shift.objects.all()
        for shift in all_shifts:
            if shift.date.weekday() < 5:  # 平日のみ希望あり
                ShiftPreference.objects.create(
                    staff=s1, shift=shift,
                    date=shift.date,
                    start_time=shift.start_time,
                    end_time=shift.end_time
                )
                if shift.start_time == time(9, 0):
                    ShiftPreference.objects.create(
                        staff=s3, shift=shift,
                        date=shift.date,
                        start_time=shift.start_time,
                        end_time=shift.end_time
                    )

        self.stdout.write(self.style.SUCCESS("✅ テストデータを作成しました。"))
