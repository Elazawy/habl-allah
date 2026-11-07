import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  History,
  Inbox,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { fetchAllTeachers } from '../../services/adminService';
import { adminCreateStudent } from '../../services/studentsService';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { isValidStudentPhone, normalizeStudentPhone } from '../../lib/studentPhone';
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPES,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_SHORT_LABELS,
  closeStudentRequest,
  fetchRelatedStudentRequests,
  fetchStudentAccountById,
  fetchStudentRequest,
  fetchStudentRequestNotifications,
  fetchStudentRequests,
  findStudentAccountsByPhone,
  findStudentRequestAnyType,
  fulfillStudentRequest,
  generateSecurePassword,
  retryStudentRequestNotification,
  searchStudentAccounts,
  updateStudentRequest,
} from '../../services/studentRequestsService';
import './student-requests.css';

const PAGE_SIZE = 20;
const EMPTY_CREATE_FORM = { fullName: '', phone: '', password: '' };

/**
 * Preference requests are submitted from a specific site section; they are not
 * an explicit gender choice typed by the student. Use the section labels from
 * that flow rather than wording such as "prefers a male teacher".
 */
const REQUEST_SECTION_LABELS = {
  male: 'قسم المعلمين',
  female: 'قسم المعلمات',
  any: 'أي قسم',
};

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTeacherName(account) {
  return account?.teachers?.name ?? null;
}

function getRequestedTeacherLabel(request) {
  if (!request) return '—';
  if (request.request_type === 'subscription') return request.teacher_name || 'غير محدد';
  return REQUEST_SECTION_LABELS[request.gender_preference] || 'غير محدد';
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (element) => element.getClientRects().length > 0
      && element.getAttribute('aria-hidden') !== 'true'
  );
}

function normalizeTeacherName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * The teacher captured with a specific-teacher request is the default for that
 * request. It is never derived from the selected account's current teacher.
 */
function findRequestedTeacher(request, teacherRows) {
  if (!request || request.request_type !== 'subscription') return null;

  if (request.teacher_id) {
    const byId = teacherRows.find((teacher) => teacher.id === request.teacher_id);
    if (byId) return byId;
  }

  const requestedName = normalizeTeacherName(request.teacher_name);
  if (!requestedName) return null;
  return teacherRows.find(
    (teacher) => normalizeTeacherName(teacher.name) === requestedName
  ) ?? null;
}

function getNotificationState(notification) {
  const now = Date.now();
  const lockedUntil = notification.locked_until ? new Date(notification.locked_until).getTime() : 0;

  if (lockedUntil && lockedUntil > now) {
    return { tone: 'pending', label: 'قيد الإرسال الآن' };
  }
  if ((notification.attempts ?? 0) >= 5) {
    return { tone: 'error', label: 'توقف الإرسال — إعادة يدوية' };
  }
  if (notification.last_error) {
    return { tone: 'error', label: 'فشل الإرسال' };
  }
  if ((notification.attempts ?? 0) > 0) {
    return { tone: 'retry', label: 'بانتظار إعادة المحاولة' };
  }
  return { tone: 'pending', label: 'في قائمة الإرسال' };
}

const NOTIFICATION_ERROR_LABELS = {
  telegram_send_failed: 'تعذر إرسال رسالة تيليجرام.',
  request_load_failed: 'تعذر تحميل بيانات الطلب وقت الإرسال.',
  message_build_failed: 'تعذر تجهيز نص رسالة الإشعار.',
  notification_cleanup_failed: 'تم الإرسال لكن تعذر تنظيف مهمة الإشعار.',
  invalid_job: 'مهمة الإشعار غير صالحة.',
  notification_delivery_failed: 'فشل إرسال الإشعار.',
};

function formatNotificationError(value) {
  if (!value) return '';
  return NOTIFICATION_ERROR_LABELS[value] || value;
}

function getHistoryEntries(history) {
  if (!Array.isArray(history)) return [];

  return history.map((entry, index) => {
    if (typeof entry === 'string') {
      return { key: `${index}-${entry}`, label: 'تحديث', notes: entry, at: null, by: null };
    }

    const status = entry?.status ?? entry?.p_status;
    const action = entry?.action ?? entry?.event;
    const label = action === 'created'
      ? 'إنشاء الطلب'
      : action === 'status' || action === 'status_update'
        ? 'تحديث الحالة'
        : action === 'notes'
          ? 'تحديث الملاحظات'
          : status
            ? `الحالة: ${REQUEST_STATUS_LABELS[status] ?? status}`
            : 'تحديث على الطلب';

    return {
      key: `${index}-${entry?.at ?? entry?.created_at ?? label}`,
      label,
      notes: entry?.notes ?? entry?.note ?? entry?.message ?? '',
      at: entry?.at ?? entry?.created_at ?? entry?.updated_at ?? null,
      by: entry?.processed_by ?? entry?.by ?? null,
    };
  });
}

function getCreateErrorStatus(error) {
  const status = Number(error?.status);
  if (Number.isInteger(status) && status >= 400) return status;

  const match = String(error?.message ?? '').match(/(?:^|\D)(4\d{2}|5\d{2})(?=\D|$)/);
  return match ? Number(match[1]) : null;
}

function isDuplicateAccountError(error) {
  const status = getCreateErrorStatus(error);
  if (status === 409) return true;

  const message = error?.message ?? '';
  // Supabase Auth may surface a duplicate as 400 ("already been registered")
  // instead of 409. Treat only duplicate-looking messages that way; other 400s
  // remain ambiguous and still require explicit account selection.
  if (status === 400 && /already|registered|exists|duplicate|unique|مسجل|مكرر/i.test(message)) {
    return true;
  }
  return /already|registered|exists|duplicate|unique|مسجل|مكرر/i.test(message);
}

function mergeAccountSuggestions(current, suggestions) {
  const merged = [...current];
  suggestions.forEach((account) => {
    if (!merged.some((item) => item.id === account.id)) merged.push(account);
  });
  return merged;
}

function StatusBadge({ status }) {
  return (
    <span className={`admin-badge sr-badge sr-badge--${status === 'contacted' ? 'contacted' : 'new'}`}>
      {status === 'contacted' && <Check size={12} />}
      {REQUEST_STATUS_LABELS[status] ?? status ?? 'جديد'}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`admin-badge sr-badge sr-badge--${type}`}>
      {REQUEST_TYPE_SHORT_LABELS[type] ?? type}
    </span>
  );
}

export default function StudentRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkHandled = useRef('');
  const detailToken = useRef(0);
  const detailModalRef = useRef(null);
  const confirmDialogRef = useRef(null);
  const deleteTriggerRef = useRef(null);
  const focusStateRef = useRef({ detailKey: '', confirmOpen: false });
  const manualSearchToken = useRef(0);
  const teacherDefaultApplied = useRef('');

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [flash, setFlash] = useState(null);

  const [teachers, setTeachers] = useState([]);
  const [teachersError, setTeachersError] = useState('');

  const [selected, setSelected] = useState(null);
  const [request, setRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationsError, setNotificationsError] = useState('');
  const [relatedRequests, setRelatedRequests] = useState([]);
  const [relatedError, setRelatedError] = useState('');
  const [phoneAccounts, setPhoneAccounts] = useState([]);
  const [accountsError, setAccountsError] = useState('');

  const [notesDraft, setNotesDraft] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [manualError, setManualError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  const isPending = Boolean(pendingAction) || creating;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  const historyEntries = useMemo(
    () => getHistoryEntries(request?.history),
    [request?.history]
  );

  // ── List + filters ────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const loadRequests = async () => {
      setListLoading(true);
      setListError('');
      try {
        const result = await fetchStudentRequests({
          type: typeFilter,
          status: statusFilter,
          search: searchTerm,
          page,
          pageSize: PAGE_SIZE,
        });

        if (!active) return;
        setRequests(result.items);
        setTotal(result.total);
      } catch (error) {
        console.error('[student-requests] list failed', error);
        if (!active) return;
        setRequests([]);
        setTotal(0);
        setListError('تعذر تحميل طلبات الطلاب حالياً. حاول مرة أخرى بعد قليل.');
      } finally {
        if (active) setListLoading(false);
      }
    };

    loadRequests();
    return () => { active = false; };
  }, [typeFilter, statusFilter, searchTerm, page, refreshKey]);

  // Debounce typing so each keystroke does not open a PostgREST query.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // If a row on the last page disappears, step back instead of showing an
  // impossible page number.
  useEffect(() => {
    if (!listLoading && total > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [listLoading, total, page, totalPages]);

  useEffect(() => {
    let active = true;

    fetchAllTeachers()
      .then((rows) => {
        if (!active) return;
        setTeachers(rows);
        setTeachersError('');
      })
      .catch((error) => {
        console.error('[student-requests] teachers failed', error);
        if (!active) return;
        setTeachers([]);
        setTeachersError('تعذر تحميل قائمة المعلمين. أعد تحميل الصفحة قبل إتمام أي طلب.');
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 8000);
    return () => clearTimeout(timer);
  }, [flash]);

  // Default the teacher select to the teacher captured with the request, once
  // per request. `chooseStudent` never overwrites this with the account's
  // current teacher, and a replacement assignment needs no extra dialog.
  useEffect(() => {
    if (!request || request.request_type !== 'subscription') return;

    const key = `${request.request_type}:${request.id}`;
    if (teacherDefaultApplied.current === key) return;

    const requestedTeacher = findRequestedTeacher(request, teachers);
    if (!requestedTeacher) return;

    teacherDefaultApplied.current = key;
    setSelectedTeacherId(requestedTeacher.id);
  }, [request, teachers]);

  // Scroll lock while either dialog is open.
  useEffect(() => {
    if (!selected) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  // One deterministic focus transition at a time:
  //   detail opens        → focus the detail dialog
  //   confirmation opens  → focus the confirmation
  //   confirmation closes → return to the delete trigger (never the detail top)
  useEffect(() => {
    const detailKey = selected ? `${selected.type}:${selected.id}` : '';
    const previous = focusStateRef.current;
    focusStateRef.current = { detailKey, confirmOpen: closeConfirmOpen };

    if (!selected) return undefined;

    if (!closeConfirmOpen && previous.confirmOpen) {
      const trigger = deleteTriggerRef.current;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
      return undefined;
    }

    const shouldFocusDialog = closeConfirmOpen
      || previous.detailKey !== detailKey;
    if (!shouldFocusDialog) return undefined;

    const container = closeConfirmOpen
      ? confirmDialogRef.current
      : detailModalRef.current;
    if (!container) return undefined;

    const timer = setTimeout(() => {
      const [first] = getFocusableElements(container);
      (first ?? container).focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [selected, closeConfirmOpen]);

  // Restore focus to the row/action that opened the detail.
  useEffect(() => {
    if (!selected) return undefined;
    const trigger = document.activeElement;

    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [selected]);

  const clearDetail = useCallback(() => {
    detailToken.current += 1;
    manualSearchToken.current += 1;
    deepLinkHandled.current = '';
    teacherDefaultApplied.current = '';
    deleteTriggerRef.current = null;
    setSelected(null);
    setRequest(null);
    setDetailLoading(false);
    setDetailError('');
    setNotifications([]);
    setNotificationsError('');
    setRelatedRequests([]);
    setRelatedError('');
    setPhoneAccounts([]);
    setAccountsError('');
    setNotesDraft('');
    setSelectedStudent(null);
    setSelectedTeacherId('');
    setPendingAction('');
    setActionError('');
    setActionSuccess('');
    setCloseConfirmOpen(false);
    setManualQuery('');
    setManualResults([]);
    setManualSearching(false);
    setManualError('');
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError('');
    setCreating(false);
    setCreatedCredentials(null);
    setCredentialsCopied(false);

    setSearchParams((previous) => {
      if (!previous.has('id') && !previous.has('type')) return previous;
      const next = new URLSearchParams(previous);
      next.delete('id');
      next.delete('type');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Escape closes the topmost dialog; Tab is trapped inside it. While a
  // mutation is pending both are ignored so the admin cannot race the detail.
  useEffect(() => {
    if (!selected) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isPending) return;
        event.preventDefault();
        if (closeConfirmOpen) setCloseConfirmOpen(false);
        else clearDetail();
        return;
      }

      if (event.key !== 'Tab') return;

      const container = closeConfirmOpen
        ? confirmDialogRef.current
        : detailModalRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selected, closeConfirmOpen, isPending, clearDetail]);

  const openDetail = useCallback(async (requestType, requestId, { syncUrl = true } = {}) => {
    if (!requestType || !requestId) return;

    const token = ++detailToken.current;
    manualSearchToken.current += 1;
    teacherDefaultApplied.current = '';
    deleteTriggerRef.current = null;
    setSelected({ type: requestType, id: requestId });
    setRequest(null);
    setDetailLoading(true);
    setDetailError('');
    setNotifications([]);
    setNotificationsError('');
    setRelatedRequests([]);
    setRelatedError('');
    setPhoneAccounts([]);
    setAccountsError('');
    setNotesDraft('');
    setSelectedStudent(null);
    setSelectedTeacherId('');
    setPendingAction('');
    setActionError('');
    setActionSuccess('');
    setCloseConfirmOpen(false);
    setManualQuery('');
    setManualResults([]);
    setManualSearching(false);
    setManualError('');
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError('');
    setCreatedCredentials(null);
    setCredentialsCopied(false);

    if (syncUrl) {
      deepLinkHandled.current = `${requestType}:${requestId}`;
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('type', requestType);
        next.set('id', requestId);
        return next;
      }, { replace: true });
    }

    try {
      const [detailResult, notificationResult] = await Promise.allSettled([
        fetchStudentRequest({ type: requestType, id: requestId }),
        fetchStudentRequestNotifications({ type: requestType, id: requestId }),
      ]);

      if (token !== detailToken.current) return;
      if (detailResult.status === 'rejected') throw detailResult.reason;

      const requestData = detailResult.value;
      if (!requestData) {
        throw new Error('لم يتم العثور على الطلب. ربما أتمّه مدير آخر أو حذفه.');
      }

      setRequest(requestData);
      setNotesDraft(requestData.notes ?? '');
      if (notificationResult.status === 'fulfilled') {
        setNotifications(notificationResult.value);
      } else {
        setNotificationsError('تعذر تحميل حالة إشعارات هذا الطلب.');
      }

      const [relatedResult, phoneResult, linkedResult] = await Promise.allSettled([
        fetchRelatedStudentRequests({ phone: requestData.whatsapp }),
        findStudentAccountsByPhone(requestData.whatsapp),
        requestData.student_id
          ? fetchStudentAccountById(requestData.student_id)
          : Promise.resolve(null),
      ]);

      if (token !== detailToken.current) return;

      if (relatedResult.status === 'fulfilled') {
        setRelatedRequests(
          relatedResult.value.filter(
            (item) => !(item.request_type === requestType && item.id === requestId)
          )
        );
      } else {
        setRelatedError('تعذر تحميل الطلبات الأخرى المرتبطة بنفس الرقم.');
      }

      const accounts = [];
      if (linkedResult.status === 'fulfilled' && linkedResult.value) {
        accounts.push({ ...linkedResult.value, linked_to_request: true });
      }
      if (phoneResult.status === 'fulfilled') {
        phoneResult.value.forEach((account) => {
          if (!accounts.some((item) => item.id === account.id)) accounts.push(account);
        });
      } else {
        setAccountsError('تعذر البحث عن حساب مسجل بهذا الرقم.');
      }
      setPhoneAccounts(accounts);
    } catch (error) {
      if (token !== detailToken.current) return;
      console.error('[student-requests] detail failed', error);
      setDetailError(error?.message || 'تعذر تحميل تفاصيل الطلب.');
    } finally {
      if (token === detailToken.current) setDetailLoading(false);
    }
  }, [setSearchParams]);

  // Deep link: ?type=subscription|preference&id=<uuid>. The detail is fetched
  // directly, so it opens even when the request is not on the visible page.
  useEffect(() => {
    const id = searchParams.get('id');
    const typeParam = searchParams.get('type');

    if (!id) {
      deepLinkHandled.current = '';
      return undefined;
    }

    const type = REQUEST_TYPES.includes(typeParam) ? typeParam : null;
    const key = `${type ?? 'any'}:${id}`;
    if (deepLinkHandled.current === key) return undefined;

    deepLinkHandled.current = key;

    if (type) {
      openDetail(type, id, { syncUrl: false });
      return undefined;
    }

    let cancelled = false;
    findStudentRequestAnyType(id)
      .then((found) => {
        if (cancelled) return;
        if (found) {
          openDetail(found.request_type, id, { syncUrl: false });
        } else {
          setSelected({ type: 'subscription', id });
          setDetailLoading(false);
          setDetailError('لم يتم العثور على الطلب المطلوب.');
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[student-requests] deep link failed', error);
        setSelected({ type: 'subscription', id });
        setDetailLoading(false);
        setDetailError('تعذر فتح الطلب من الرابط. حاول فتحه من القائمة.');
      });

    return () => { cancelled = true; };
  }, [searchParams, openDetail]);

  const changeType = (nextType) => {
    setTypeFilter(nextType);
    setPage(1);
  };

  const changeStatus = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const refreshList = () => setRefreshKey((value) => value + 1);

  // ── Detail actions ────────────────────────────────────────────
  const refreshRequestDetail = useCallback(async () => {
    if (!request) return;

    const token = detailToken.current;
    try {
      const refreshed = await fetchStudentRequest({
        type: request.request_type,
        id: request.id,
      });
      if (token !== detailToken.current) return;
      if (refreshed) {
        setRequest(refreshed);
        setNotesDraft(refreshed.notes ?? '');
      }
    } catch (error) {
      console.error('[student-requests] detail refresh failed', error);
    }
  }, [request]);

  const handleStatusUpdate = async (nextStatus) => {
    if (!request || isPending || request.status === nextStatus) return;

    const token = detailToken.current;
    setPendingAction('status');
    setActionError('');
    setActionSuccess('');

    try {
      await updateStudentRequest({
        type: request.request_type,
        id: request.id,
        status: nextStatus,
        notes: notesDraft,
      });
      if (token !== detailToken.current) return;
      await refreshRequestDetail();
      if (token !== detailToken.current) return;
      setActionSuccess(
        nextStatus === 'contacted'
          ? 'تم تسجيل التواصل مع الطالب.'
          : 'أُعيد الطلب إلى قائمة الطلبات الجديدة.'
      );
      refreshList();
    } catch (error) {
      if (token !== detailToken.current) return;
      console.error('[student-requests] status update failed', error);
      setActionError(`تعذر تحديث حالة الطلب: ${error.message}`);
    } finally {
      if (token === detailToken.current) setPendingAction('');
    }
  };

  const handleSaveNotes = async () => {
    if (!request || isPending) return;

    const token = detailToken.current;
    setPendingAction('notes');
    setActionError('');
    setActionSuccess('');

    try {
      await updateStudentRequest({
        type: request.request_type,
        id: request.id,
        status: request.status || 'new',
        notes: notesDraft,
      });
      if (token !== detailToken.current) return;
      await refreshRequestDetail();
      if (token !== detailToken.current) return;
      setActionSuccess('تم حفظ الملاحظات الداخلية.');
    } catch (error) {
      if (token !== detailToken.current) return;
      console.error('[student-requests] notes update failed', error);
      setActionError(`تعذر حفظ الملاحظات: ${error.message}`);
    } finally {
      if (token === detailToken.current) setPendingAction('');
    }
  };

  const chooseStudent = (account) => {
    if (isPending) return;
    // Keep the teacher default derived from the request. The account's current
    // teacher is informational only and must not silently replace it.
    if (selectedStudent?.id !== account.id) {
      setCreatedCredentials(null);
      setCredentialsCopied(false);
    }
    setSelectedStudent(account);
    setCreateOpen(false);
    setActionError('');
    setActionSuccess('');
  };

  const handleManualSearch = async (event) => {
    event.preventDefault();
    const query = manualQuery.trim();
    if (!query || isPending) return;

    const searchToken = ++manualSearchToken.current;
    const detailTokenAtStart = detailToken.current;
    const isCurrentSearch = () => (
      searchToken === manualSearchToken.current
      && detailTokenAtStart === detailToken.current
    );

    setManualSearching(true);
    setManualError('');
    try {
      const results = await searchStudentAccounts({ query });
      if (!isCurrentSearch()) return;
      setManualResults(results);
      if (results.length === 0) setManualError('لا توجد حسابات مطابقة لهذا البحث.');
    } catch (error) {
      if (!isCurrentSearch()) return;
      console.error('[student-requests] account search failed', error);
      setManualResults([]);
      setManualError('تعذر البحث في حسابات الطلاب. حاول مرة أخرى.');
    } finally {
      if (isCurrentSearch()) setManualSearching(false);
    }
  };

  const openCreateForm = () => {
    if (!request) return;

    setCreateError('');
    let password = '';
    try {
      password = generateSecurePassword(10);
    } catch (error) {
      setCreateError(error.message);
    }

    setCreateForm({
      fullName: request.student_name?.trim() ?? '',
      phone: normalizeStudentPhone(request.whatsapp),
      password,
    });
    setCreateOpen(true);
    setActionError('');
    setActionSuccess('');
  };

  const regeneratePassword = () => {
    try {
      setCreateForm((previous) => ({ ...previous, password: generateSecurePassword(10) }));
      setCreateError('');
    } catch (error) {
      setCreateError(error.message);
    }
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    if (!request || creating || isPending) return;

    const fullName = createForm.fullName.trim();
    const phone = normalizeStudentPhone(createForm.phone);

    setCreateError('');
    if (fullName.length < 2) {
      setCreateError('أدخل الاسم الكامل للطالب.');
      return;
    }
    if (!isValidStudentPhone(createForm.phone)) {
      setCreateError('رقم الهاتف يجب أن يتكون من 10 إلى 15 رقماً.');
      return;
    }
    if (createForm.password.length < 6 || createForm.password.length > 10) {
      setCreateError('كلمة المرور يجب أن تكون بين 6 و10 خانات.');
      return;
    }

    const requestToken = detailToken.current;
    const enteredPassword = createForm.password;

    // Never carry a previously chosen account into a create attempt. If the
    // attempt fails ambiguously the admin must explicitly choose a suggestion.
    setSelectedStudent(null);
    setCreatedCredentials(null);
    setCredentialsCopied(false);
    setCreating(true);

    try {
      const user = await adminCreateStudent({
        fullName,
        phone,
        password: enteredPassword,
      });

      if (requestToken !== detailToken.current) return;
      if (!user?.id) {
        const invalid = new Error('لم يتم إرجاع بيانات الحساب الجديد. أعد المحاولة.');
        invalid.status = 502;
        throw invalid;
      }

      const account = {
        id: user.id,
        full_name: fullName,
        phone,
        teacher_id: null,
        teachers: null,
        created_at: new Date().toISOString(),
      };

      // Credentials are only ever created from a definite success response
      // that includes the new user id.
      setSelectedStudent(account);
      setCreatedCredentials({
        fullName,
        phone,
        password: enteredPassword,
        studentId: account.id,
      });
      setCredentialsCopied(false);
      setCreateOpen(false);
      setCreateForm((previous) => ({ ...previous, password: '' }));
      setManualResults([]);
      setActionSuccess('تم إنشاء الحساب. اختر المعلم ثم أتمّ الطلب، أو انسخ كلمة المرور وسلّمها للطالب.');
    } catch (error) {
      if (requestToken !== detailToken.current) return;
      console.error('[student-requests] create account failed', error);

      // A timeout/5xx can arrive after the Edge Function already created the
      // user, while a 409/duplicate 400 proves the phone is taken. Either way,
      // only offer matches as suggestions: never auto-select and never present
      // the entered password as a working credential for an existing account.
      const duplicate = isDuplicateAccountError(error);
      setCreateError(
        duplicate
          ? 'هذا الرقم مسجل بالفعل. لم نعيّن أي حساب تلقائياً ولم نعرض كلمة المرور كصالحة. اختر الحساب الصحيح من الاقتراحات أو ابحث يدوياً؛ كلمة مرور الحساب الموجود غير معروفة هنا.'
          : 'تعذر التأكد من إنشاء الحساب، وقد يكون الحساب موجوداً بالفعل. لم نعيّن أي حساب تلقائياً ولم نعرض كلمة المرور كصالحة. راجع الاقتراحات واختر الحساب يدوياً، أو أعد المحاولة فقط بعد التأكد.'
      );
      setManualResults([]);
      setActionSuccess('');

      let suggestions = [];
      try {
        suggestions = await findStudentAccountsByPhone(phone);
      } catch (lookupError) {
        console.error('[student-requests] phone lookup after create failed', lookupError);
      }

      if (requestToken !== detailToken.current) return;

      if (suggestions.length > 0) {
        setPhoneAccounts((current) => mergeAccountSuggestions(current, suggestions));
      }

      // Keep the form open and the entered password untouched so the admin
      // does not lose the value they typed. It is not shown as a credential.
    } finally {
      if (requestToken === detailToken.current) setCreating(false);
    }
  };

  const copyCredentials = async () => {
    if (
      !createdCredentials?.password
      || selectedStudent?.id !== createdCredentials.studentId
    ) return;
    try {
      await navigator.clipboard.writeText(createdCredentials.password);
      setCredentialsCopied(true);
    } catch {
      setActionError('تعذر نسخ كلمة المرور. حدّدها من الحقل وانسخها يدوياً.');
    }
  };

  const handleFulfill = async () => {
    if (!request || !selectedStudent || !selectedTeacherId || isPending) return;

    const token = detailToken.current;
    setPendingAction('fulfill');
    setActionError('');
    setActionSuccess('');

    try {
      await fulfillStudentRequest({
        type: request.request_type,
        id: request.id,
        studentId: selectedStudent.id,
        teacherId: selectedTeacherId,
      });

      const teacherName = teachers.find((teacher) => teacher.id === selectedTeacherId)?.name;
      setFlash({
        tone: 'success',
        text: `تم إتمام طلب ${selectedStudent.full_name}${teacherName ? ` وتعيينه مع ${teacherName}` : ''}. حُذف الطلب وسجله نهائياً.`,
      });
      if (token === detailToken.current) clearDetail();
      refreshList();
    } catch (error) {
      if (token !== detailToken.current) return;
      console.error('[student-requests] fulfilment failed', error);
      setActionError(
        `تعذر إتمام الطلب: ${error.message} يمكنك إعادة المحاولة دون إنشاء الحساب مرة أخرى.`
      );
    } finally {
      if (token === detailToken.current) setPendingAction('');
    }
  };

  const handleCloseRequest = async () => {
    if (!request || isPending) return;

    const token = detailToken.current;
    setPendingAction('close');
    setActionError('');

    try {
      await closeStudentRequest({ type: request.request_type, id: request.id });
      setFlash({
        tone: 'success',
        text: `حُذف طلب ${request.student_name || 'الطالب'} نهائياً مع سجله وإشعاراته.`,
      });
      if (token === detailToken.current) clearDetail();
      refreshList();
    } catch (error) {
      if (token !== detailToken.current) return;
      console.error('[student-requests] close failed', error);
      setCloseConfirmOpen(false);
      setActionError(`تعذر حذف الطلب: ${error.message}`);
    } finally {
      if (token === detailToken.current) setPendingAction('');
    }
  };

  const handleRetryNotification = async (notification) => {
    if (isPending || !request) return;

    const token = detailToken.current;
    setPendingAction(`retry:${notification.id}`);
    setNotificationsError('');
    setActionSuccess('');

    try {
      await retryStudentRequestNotification(notification.id);
      const rows = await fetchStudentRequestNotifications({
        type: request.request_type,
        id: request.id,
      });
      if (token !== detailToken.current) return;
      setNotifications(rows);
      setActionSuccess('تمت إعادة جدولة الإشعار لمحاولة إرسال جديدة.');
    } catch (error) {
      if (token !== detailToken.current) return;
      console.error('[student-requests] notification retry failed', error);
      setNotificationsError(`تعذر إعادة محاولة الإشعار: ${error.message}`);
    } finally {
      if (token === detailToken.current) setPendingAction('');
    }
  };

  return (
    <div className="admin-page sr-page" dir="rtl">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">طلبات الطلاب</h1>
          <p className="admin-page-desc">
            طلبات الاشتراك بمعلم وطلبات ترشيح معلم — {total} طلب في هذا العرض
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={refreshList}
          disabled={listLoading}
        >
          <RefreshCw size={17} className={listLoading ? 'admin-spin' : ''} />
          تحديث القائمة
        </button>
      </div>

      {flash && (
        <div className={`sr-flash sr-flash--${flash.tone}`} role="status">
          {flash.tone === 'success'
            ? <CheckCircle2 size={18} />
            : <AlertTriangle size={18} />}
          <span>{flash.text}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="إغلاق التنبيه">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="sr-toolbar">
        <div className="admin-filter-tabs sr-type-tabs" aria-label="نوع الطلب">
          <button
            type="button"
            className={`admin-filter-tab ${typeFilter === 'all' ? 'admin-filter-tab--active' : ''}`}
            onClick={() => changeType('all')}
          >
            كل الطلبات
          </button>
          {REQUEST_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`admin-filter-tab ${typeFilter === type ? 'admin-filter-tab--active' : ''}`}
              onClick={() => changeType(type)}
            >
              {REQUEST_TYPE_SHORT_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="admin-search-wrapper sr-search">
          <Search size={16} className="admin-search-icon" />
          <input
            id="student-requests-search"
            type="search"
            className="admin-input admin-search-input"
            placeholder="بحث بالاسم أو رقم الهاتف…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <div className="admin-field-group sr-status-filter">
          <label htmlFor="student-requests-status" className="admin-label">الحالة</label>
          <select
            id="student-requests-status"
            className="admin-input admin-select"
            value={statusFilter}
            onChange={changeStatus}
          >
            <option value="">كل الحالات</option>
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {REQUEST_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {listLoading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ تحميل الطلبات…</span>
        </div>
      ) : listError ? (
        <div className="admin-empty">
          <AlertTriangle size={46} />
          <p>{listError}</p>
          <button type="button" className="admin-btn admin-btn--primary" onClick={refreshList}>
            إعادة المحاولة
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="admin-empty">
          <Inbox size={48} />
          <p>
            {searchTerm || statusFilter || typeFilter !== 'all'
              ? 'لا توجد طلبات مطابقة للفلاتر الحالية.'
              : 'لا توجد طلبات طلاب جديدة حالياً.'}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper admin-table-wrapper--cards">
            <table className="admin-table admin-table--cards sr-table" id="student-requests-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>النوع</th>
                  <th>الطلب</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => {
                  const canMessage = isValidStudentPhone(item.whatsapp);
                  return (
                    <tr key={`${item.request_type}-${item.id}`}>
                      <td data-label="الطالب">
                        <div className="sr-name-cell">
                          <strong>{item.student_name || 'بدون اسم'}</strong>
                          {item.student_id && <span className="sr-linked-hint">مرتبط بحساب</span>}
                        </div>
                      </td>
                      <td data-label="النوع"><TypeBadge type={item.request_type} /></td>
                      <td data-label="الطلب">
                        <span className="sr-requested-teacher">{getRequestedTeacherLabel(item)}</span>
                      </td>
                      <td data-label="الهاتف">
                        <span className="sr-phone" dir="ltr">{item.whatsapp || '—'}</span>
                      </td>
                      <td data-label="الحالة"><StatusBadge status={item.status} /></td>
                      <td data-label="التاريخ">
                        <span className="sr-date">{formatDateTime(item.created_at)}</span>
                      </td>
                      <td data-label="إجراءات">
                        <div className="admin-row-actions sr-row-actions">
                          {canMessage ? (
                            <a
                              className="admin-icon-btn admin-icon-btn--lesson"
                              href={buildWhatsAppUrl(
                                item.whatsapp,
                                `السلام عليكم ${item.student_name || ''}، بخصوص طلبك في أكاديمية حبل الله…`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="مراسلة الطالب على واتساب"
                              aria-label={`مراسلة ${item.student_name || 'الطالب'} على واتساب`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MessageCircle size={16} />
                            </a>
                          ) : (
                            <button
                              type="button"
                              className="admin-icon-btn admin-icon-btn--lesson"
                              disabled
                              title="رقم الهاتف غير متاح"
                              aria-label="لا يمكن مراسلة الطالب: رقم الهاتف غير متاح"
                            >
                              <MessageCircle size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn--edit"
                            onClick={() => openDetail(item.request_type, item.id)}
                            title="فتح تفاصيل الطلب"
                            aria-label={`فتح تفاصيل طلب ${item.student_name || 'الطالب'}`}
                          >
                            <ChevronLeft size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="sr-pagination">
            <span className="sr-pagination-info">
              عرض {firstShown}–{lastShown} من {total}
            </span>
            <div className="sr-pagination-controls">
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || listLoading}
              >
                <ChevronRight size={16} />
                السابق
              </button>
              <span className="sr-page-number">صفحة {page} من {totalPages}</span>
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages || listLoading}
              >
                التالي
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {selected && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="تفاصيل طلب الطالب"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isPending) clearDetail();
          }}
        >
          <div
            className="admin-modal sr-detail-modal"
            ref={detailModalRef}
            tabIndex={-1}
            aria-hidden={closeConfirmOpen ? 'true' : undefined}
            inert={closeConfirmOpen || undefined}
          >
            <div className="admin-modal-header sr-detail-header">
              <div>
                <h2 className="admin-modal-title">تفاصيل الطلب</h2>
                {request && (
                  <div className="sr-detail-badges">
                    <TypeBadge type={request.request_type} />
                    <StatusBadge status={request.status} />
                    <span className="sr-request-id">#{String(request.id).slice(0, 8)}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={clearDetail}
                disabled={isPending}
                aria-label="إغلاق التفاصيل"
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body sr-detail-body">
              {detailLoading ? (
                <div className="admin-loading">
                  <div className="admin-spinner-lg" />
                  <span>جارٍ تحميل تفاصيل الطلب…</span>
                </div>
              ) : detailError ? (
                <div className="admin-empty">
                  <AlertTriangle size={44} />
                  <p>{detailError}</p>
                  <div className="sr-empty-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary"
                      onClick={() => openDetail(selected.type, selected.id, { syncUrl: false })}
                    >
                      إعادة المحاولة
                    </button>
                    <button type="button" className="admin-btn admin-btn--ghost" onClick={clearDetail}>
                      إغلاق
                    </button>
                  </div>
                </div>
              ) : request ? (
                <>
                  <div className="sr-detail-top">
                    <div>
                      <h3 className="sr-detail-name">{request.student_name || 'بدون اسم'}</h3>
                      <p className="sr-detail-meta">
                        {REQUEST_TYPE_LABELS[request.request_type]} · أُنشئ {formatDateTime(request.created_at)}
                      </p>
                    </div>
                    <div className="sr-detail-contact">
                      <span className="sr-phone sr-phone--lg" dir="ltr">{request.whatsapp || '—'}</span>
                      {isValidStudentPhone(request.whatsapp) ? (
                        <a
                          className="admin-btn admin-btn--primary admin-btn--sm"
                          href={buildWhatsAppUrl(
                            request.whatsapp,
                            `السلام عليكم ${request.student_name || ''}، بخصوص طلبك في أكاديمية حبل الله…`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle size={16} />
                          مراسلة واتساب
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          disabled
                          title="رقم الهاتف غير متاح"
                        >
                          <MessageCircle size={16} />
                          واتساب غير متاح
                        </button>
                      )}
                    </div>
                  </div>

                  {actionSuccess && (
                    <div className="sr-alert sr-alert--success" role="status">
                      <CheckCircle2 size={17} />
                      <span>{actionSuccess}</span>
                    </div>
                  )}
                  {actionError && (
                    <div className="admin-error-banner" role="alert">
                      <AlertTriangle size={17} />
                      <span>{actionError}</span>
                    </div>
                  )}

                  <div className="sr-detail-columns">
                    <div className="sr-detail-main">
                      <section className="sr-panel">
                        <h4 className="sr-panel-title">بيانات الطلب</h4>
                        <dl className="sr-info-list">
                          <div>
                            <dt>نوع الطلب</dt>
                            <dd>{REQUEST_TYPE_LABELS[request.request_type]}</dd>
                          </div>
                          <div>
                            <dt>{request.request_type === 'subscription' ? 'المعلم المطلوب' : 'القسم المطلوب'}</dt>
                            <dd>{getRequestedTeacherLabel(request)}</dd>
                          </div>
                          {request.request_type === 'preference' && (
                            <div>
                              <dt>العمر</dt>
                              <dd>{request.age ? `${request.age} سنة` : 'غير محدد'}</dd>
                            </div>
                          )}
                          <div>
                            <dt>آخر تحديث</dt>
                            <dd>{formatDateTime(request.updated_at || request.created_at)}</dd>
                          </div>
                        </dl>
                        {request.request_type === 'preference' && request.description && (
                          <div className="sr-description">
                            <span>وصف الاحتياج</span>
                            <p>{request.description}</p>
                          </div>
                        )}
                      </section>

                      <section className="sr-panel">
                        <h4 className="sr-panel-title">حالة الطلب والملاحظات</h4>
                        <div className="sr-status-actions" role="group" aria-label="حالة الطلب">
                          {REQUEST_STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={`sr-status-button ${request.status === status ? 'sr-status-button--active' : ''}`}
                              onClick={() => handleStatusUpdate(status)}
                              disabled={isPending || request.status === status}
                            >
                              {status === 'contacted' ? <Check size={15} /> : <Phone size={15} />}
                              {REQUEST_STATUS_LABELS[status]}
                            </button>
                          ))}
                        </div>

                        <div className="admin-field-group sr-notes-field">
                          <label htmlFor="student-request-notes" className="admin-label">
                            ملاحظات داخلية
                          </label>
                          <textarea
                            id="student-request-notes"
                            className="admin-input admin-textarea"
                            rows={4}
                            value={notesDraft}
                            onChange={(event) => setNotesDraft(event.target.value)}
                            placeholder="ملاحظات لا تظهر للطالب…"
                            maxLength={4000}
                            disabled={isPending}
                          />
                        </div>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          onClick={handleSaveNotes}
                          disabled={isPending}
                        >
                          {pendingAction === 'notes'
                            ? <Loader2 size={15} className="admin-spin" />
                            : <Check size={15} />}
                          حفظ الملاحظات
                        </button>
                      </section>

                      <section className="sr-panel">
                        <h4 className="sr-panel-title">
                          <UserCheck size={17} />
                          حساب الطالب
                        </h4>

                        {selectedStudent && (
                          <div className="sr-selected-account">
                            <UserCheck size={18} />
                            <div>
                              <strong>{selectedStudent.full_name || selectedStudent.phone}</strong>
                              <span>
                                {selectedStudent.phone}
                                {getTeacherName(selectedStudent)
                                  ? ` · المعلم الحالي: ${getTeacherName(selectedStudent)}`
                                  : ' · بدون معلم حالي'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="sr-subsection">
                          <h5 className="sr-subsection-title">حسابات مسجلة بنفس الرقم</h5>
                          {accountsError && <p className="sr-error-text">{accountsError}</p>}
                          {!accountsError && phoneAccounts.length === 0 && (
                            <p className="sr-muted">
                              لا يوجد حساب مسجل بهذا الرقم. ابحث يدوياً أو أنشئ حساباً جديداً.
                            </p>
                          )}
                          {phoneAccounts.map((account) => {
                            const isChosen = selectedStudent?.id === account.id;
                            return (
                              <div
                                key={account.id}
                                className={`sr-account-card ${isChosen ? 'sr-account-card--selected' : ''}`}
                              >
                                <div className="sr-account-copy">
                                  <strong>{account.full_name || 'بدون اسم'}</strong>
                                  <span>
                                    {account.phone}
                                    {getTeacherName(account) ? ` · ${getTeacherName(account)}` : ''}
                                  </span>
                                  {account.linked_to_request && (
                                    <span className="sr-linked-hint">مرتبط بهذا الطلب</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className={`admin-btn admin-btn--sm ${isChosen ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
                                  onClick={() => chooseStudent(account)}
                                  disabled={isPending || isChosen}
                                >
                                  {isChosen ? 'محدد' : 'اختيار الحساب'}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <div className="sr-subsection">
                          <h5 className="sr-subsection-title">بحث يدوي عن حساب</h5>
                          <form className="sr-inline-form" onSubmit={handleManualSearch}>
                            <div className="admin-search-wrapper">
                              <Search size={15} className="admin-search-icon" />
                              <input
                                type="search"
                                className="admin-input admin-search-input"
                                placeholder="الاسم أو رقم الهاتف…"
                                value={manualQuery}
                                onChange={(event) => setManualQuery(event.target.value)}
                                disabled={isPending}
                              />
                            </div>
                            <button
                              type="submit"
                              className="admin-btn admin-btn--ghost admin-btn--sm"
                              disabled={manualSearching || isPending || !manualQuery.trim()}
                            >
                              {manualSearching
                                ? <Loader2 size={15} className="admin-spin" />
                                : <Search size={15} />}
                              بحث
                            </button>
                          </form>
                          {manualError && <p className="sr-error-text">{manualError}</p>}
                          {manualResults.length > 0 && (
                            <div className="sr-account-results">
                              {manualResults.map((account) => (
                                <div key={account.id} className="sr-account-card">
                                  <div className="sr-account-copy">
                                    <strong>{account.full_name || 'بدون اسم'}</strong>
                                    <span>
                                      {account.phone}
                                      {getTeacherName(account) ? ` · ${getTeacherName(account)}` : ''}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn--ghost admin-btn--sm"
                                    onClick={() => chooseStudent(account)}
                                    disabled={isPending}
                                  >
                                    اختيار
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="sr-subsection">
                          {!createOpen ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost admin-btn--sm"
                              onClick={openCreateForm}
                              disabled={isPending}
                            >
                              <UserPlus size={16} />
                              إنشاء حساب جديد بهذا الرقم
                            </button>
                          ) : (
                            <form className="sr-create-form" onSubmit={handleCreateAccount}>
                              <h5 className="sr-subsection-title">إنشاء حساب طالب</h5>
                              <p className="sr-muted sr-create-hint">
                                يُنشأ الحساب بدون معلم أولاً. اختر المعلم في الخطوة التالية لإتمام الطلب.
                              </p>

                              <div className="admin-field-group">
                                <label htmlFor="new-request-student-name" className="admin-label">
                                  الاسم الكامل *
                                </label>
                                <input
                                  id="new-request-student-name"
                                  type="text"
                                  className="admin-input"
                                  value={createForm.fullName}
                                  onChange={(event) => setCreateForm((previous) => ({
                                    ...previous,
                                    fullName: event.target.value,
                                  }))}
                                  disabled={creating || isPending}
                                />
                              </div>

                              <div className="admin-field-group">
                                <label htmlFor="new-request-student-phone" className="admin-label">
                                  رقم الهاتف *
                                </label>
                                <input
                                  id="new-request-student-phone"
                                  type="tel"
                                  className="admin-input"
                                  dir="ltr"
                                  value={createForm.phone}
                                  onChange={(event) => setCreateForm((previous) => ({
                                    ...previous,
                                    phone: event.target.value,
                                  }))}
                                  disabled={creating || isPending}
                                />
                              </div>

                              <div className="admin-field-group">
                                <label htmlFor="new-request-student-password" className="admin-label">
                                  كلمة المرور *
                                </label>
                                <div className="sr-password-row">
                                  <input
                                    id="new-request-student-password"
                                    type="text"
                                    className="admin-input"
                                    dir="ltr"
                                    autoComplete="new-password"
                                    value={createForm.password}
                                    onChange={(event) => setCreateForm((previous) => ({
                                      ...previous,
                                      password: event.target.value,
                                    }))}
                                    disabled={creating || isPending}
                                  />
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn--ghost admin-btn--sm"
                                    onClick={regeneratePassword}
                                    disabled={creating || isPending}
                                  >
                                    <RefreshCw size={15} />
                                    توليد
                                  </button>
                                </div>
                                <p className="admin-field-hint">
                                  كلمة المرور تُعرض هنا فقط ولا تُحفظ في ملاحظات الطلب أو سجله.
                                </p>
                              </div>

                              {createError && (
                                <div className="admin-error-banner" role="alert">
                                  <AlertTriangle size={16} />
                                  <span>{createError}</span>
                                </div>
                              )}

                              <div className="sr-inline-actions">
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--ghost admin-btn--sm"
                                  onClick={() => {
                                    setCreateOpen(false);
                                    setCreateError('');
                                    setCreateForm(EMPTY_CREATE_FORM);
                                  }}
                                  disabled={creating}
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="submit"
                                  className="admin-btn admin-btn--primary admin-btn--sm"
                                  disabled={creating || isPending}
                                >
                                  {creating
                                    ? <Loader2 size={15} className="admin-spin" />
                                    : <UserPlus size={15} />}
                                  إنشاء الحساب
                                </button>
                              </div>
                            </form>
                          )}
                        </div>

                        {createdCredentials
                          && selectedStudent?.id === createdCredentials.studentId && (
                          <div className="sr-credentials" role="status">
                            <div>
                              <strong>كلمة مرور الحساب الجديد</strong>
                              <p>
                                انسخها وسلّمها للطالب الآن. لن تظهر مرة أخرى ولن تُحفظ في سجل
                                الطلب. اختيار حساب آخر يخفي هذه الكلمة.
                              </p>
                              <span className="sr-credential-name">
                                {createdCredentials.fullName}
                              </span>
                            </div>
                            <div className="sr-credential-row">
                              <code dir="ltr">{createdCredentials.password}</code>
                              <button
                                type="button"
                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                onClick={copyCredentials}
                              >
                                {credentialsCopied ? <Check size={15} /> : <Copy size={15} />}
                                {credentialsCopied ? 'تم النسخ' : 'نسخ'}
                              </button>
                            </div>
                            <span className="sr-credential-phone" dir="ltr">
                              {createdCredentials.phone}
                            </span>
                          </div>
                        )}
                      </section>

                      <section className="sr-panel">
                        <h4 className="sr-panel-title">
                          <UserCheck size={17} />
                          تعيين المعلم وإتمام الطلب
                        </h4>

                        <div className="admin-field-group">
                          <label htmlFor="student-request-teacher" className="admin-label">
                            المعلم المسؤول *
                          </label>
                          <select
                            id="student-request-teacher"
                            className="admin-input admin-select"
                            value={selectedTeacherId}
                            onChange={(event) => setSelectedTeacherId(event.target.value)}
                            disabled={isPending}
                          >
                            <option value="">اختر المعلم…</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.name} — {teacher.gender === 'female' ? 'معلمة' : 'معلم'}
                              </option>
                            ))}
                          </select>
                          {teachersError && <p className="sr-error-text">{teachersError}</p>}
                        </div>

                        {selectedStudent?.teacher_id && (
                          <p className="sr-hint">
                            لهذا الحساب معلم حالي: {getTeacherName(selectedStudent) || 'غير معروف'}.
                            اختيار معلم آخر سيستبدله مباشرة دون خطوة إضافية.
                          </p>
                        )}

                        {!selectedStudent && (
                          <p className="sr-hint">
                            اختر حساباً موجوداً أو أنشئ حساباً جديداً قبل إتمام الطلب.
                          </p>
                        )}

                        <div className="sr-fulfill-row">
                          <button
                            type="button"
                            className="admin-btn admin-btn--primary"
                            onClick={handleFulfill}
                            disabled={!selectedStudent || !selectedTeacherId || isPending}
                          >
                            {pendingAction === 'fulfill'
                              ? <Loader2 size={17} className="admin-spin" />
                              : <UserCheck size={17} />}
                            إتمام الطلب وتعيين المعلم
                          </button>
                          <p className="sr-hint">
                            يُعيّن الطالب للمعلم ويُحذف الطلب وسجله نهائياً. لا يمكن التراجع
                            عن هذه الخطوة.
                          </p>
                        </div>
                      </section>
                    </div>

                    <aside className="sr-detail-side">
                      <section className="sr-panel">
                        <h4 className="sr-panel-title">
                          <Send size={17} />
                          إشعارات الطلب
                        </h4>
                        {notificationsError && <p className="sr-error-text">{notificationsError}</p>}
                        {!notificationsError && notifications.length === 0 && (
                          <p className="sr-muted">
                            لا توجد مهمة إشعار معلّقة. تُحذف المهمة بعد نجاح الإرسال، لذلك
                            غيابها لا يثبت بالضرورة عدم الإرسال.
                          </p>
                        )}
                        {notifications.map((notification) => {
                          const state = getNotificationState(notification);
                          return (
                            <div className="sr-notification" key={notification.id}>
                              <div className="sr-notification-head">
                                <span className={`sr-notification-state sr-notification-state--${state.tone}`}>
                                  {state.label}
                                </span>
                                <span className="sr-muted">
                                  محاولات: {notification.attempts ?? 0}
                                </span>
                              </div>
                              <p className="sr-notification-meta">
                                أُنشئ: {formatDateTime(notification.created_at)}
                              </p>
                              {notification.next_attempt_at && (
                                <p className="sr-notification-meta">
                                  المحاولة التالية: {formatDateTime(notification.next_attempt_at)}
                                </p>
                              )}
                              {notification.locked_until && (
                                <p className="sr-notification-meta">
                                  مقفل حتى: {formatDateTime(notification.locked_until)}
                                </p>
                              )}
                              {notification.last_error && (
                                <p
                                  className="sr-error-text sr-notification-error"
                                  title={notification.last_error}
                                >
                                  {formatNotificationError(notification.last_error)}
                                </p>
                              )}
                              <button
                                type="button"
                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                onClick={() => handleRetryNotification(notification)}
                                disabled={isPending}
                              >
                                {pendingAction === `retry:${notification.id}`
                                  ? <Loader2 size={15} className="admin-spin" />
                                  : <RefreshCw size={15} />}
                                إعادة المحاولة
                              </button>
                            </div>
                          );
                        })}
                      </section>

                      <section className="sr-panel">
                        <h4 className="sr-panel-title">
                          <History size={17} />
                          سجل التغييرات
                        </h4>
                        {historyEntries.length === 0 ? (
                          <p className="sr-muted">لا يوجد سجل تغييرات لهذا الطلب بعد.</p>
                        ) : (
                          <ul className="sr-history">
                            {historyEntries.map((entry) => (
                              <li key={entry.key} className="sr-history-item">
                                <span className="sr-history-dot" aria-hidden="true" />
                                <div>
                                  <strong>{entry.label}</strong>
                                  {entry.notes && <p>{entry.notes}</p>}
                                  <span className="sr-history-meta">
                                    {formatDateTime(entry.at)}
                                    {entry.by ? ` · بواسطة ${String(entry.by).slice(0, 8)}` : ''}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>

                      <section className="sr-panel">
                        <h4 className="sr-panel-title">
                          <Phone size={17} />
                          طلبات بنفس الرقم
                        </h4>
                        {relatedError && <p className="sr-error-text">{relatedError}</p>}
                        {!relatedError && relatedRequests.length === 0 && (
                          <p className="sr-muted">لا توجد طلبات أخرى مسجلة بنفس الرقم.</p>
                        )}
                        {relatedRequests.map((item) => (
                          <button
                            type="button"
                            key={`${item.request_type}-${item.id}`}
                            className="sr-related-item"
                            onClick={() => openDetail(item.request_type, item.id)}
                            disabled={isPending}
                          >
                            <span>
                              <strong>{item.student_name || 'بدون اسم'}</strong>
                              <small>
                                {REQUEST_TYPE_SHORT_LABELS[item.request_type]} ·{' '}
                                {formatDateTime(item.created_at)}
                              </small>
                            </span>
                            <span className="sr-related-status">
                              <StatusBadge status={item.status} />
                              <ExternalLink size={14} />
                            </span>
                          </button>
                        ))}
                      </section>

                      <section className="sr-panel sr-danger-zone">
                        <h4 className="sr-panel-title">
                          <Trash2 size={17} />
                          حذف الطلب نهائياً
                        </h4>
                        <p>
                          حذف الطلب يزيله <strong>نهائياً</strong> مع سجل تغييراته
                          وإشعاراته. لا يوجد أرشيف ولا يمكن استعادته أو إعادة فتحه.
                        </p>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger admin-btn--sm"
                          onClick={(event) => {
                            deleteTriggerRef.current = event.currentTarget;
                            setCloseConfirmOpen(true);
                          }}
                          disabled={isPending}
                        >
                          <Trash2 size={15} />
                          حذف الطلب نهائياً
                        </button>
                      </section>
                    </aside>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {selected && request && closeConfirmOpen && (
        <div
          className="admin-modal-backdrop sr-confirm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="تأكيد حذف الطلب نهائياً"
        >
          <div className="admin-confirm-dialog" ref={confirmDialogRef} tabIndex={-1}>
            <div className="admin-confirm-icon">
              <AlertTriangle size={40} />
            </div>
            <h3 className="admin-confirm-title">حذف الطلب نهائياً؟</h3>
            <p className="admin-confirm-text">
              سيتم حذف طلب <strong>{request.student_name || 'الطالب'}</strong> وسجل
              تغييراته وإشعاراته <strong>نهائياً</strong>. لا يمكن استعادة الطلب أو إعادة
              فتحه.
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setCloseConfirmOpen(false)}
                disabled={isPending}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={handleCloseRequest}
                disabled={isPending}
              >
                {pendingAction === 'close'
                  ? <Loader2 size={16} className="admin-spin" />
                  : <Trash2 size={16} />}
                حذف الطلب نهائياً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
