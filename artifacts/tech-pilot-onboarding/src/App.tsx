import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  CircleNotch,
  ClipboardText,
  Clock,
  Code,
  Database,
  GraduationCap,
  Gear,
  Exam,
  SquaresFour,
  Lifebuoy,
  LockKey,
  MapPin,
  SignOut,
  ShieldCheck,
  Sparkle,
  UserCircle,
  UploadSimple,
  VideoCamera,
  WhatsappLogo,
  WarningCircle,
  Wrench,
} from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { z } from 'zod';
import {
  getGetCoursesQueryKey,
  getGetMyEnrollmentQueryKey,
  useCreateWhatsAppEnrollment,
  useGetMyEnrollment,
  useSaveMyEnrollment,
  type Course,
  type CourseId,
  type StudentEnrollment,
} from '@workspace/api-client-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const queryClient = new QueryClient();

// Authentication is intentionally disabled for this pilot. These local shims
// keep the portal routes available while sign-in/sign-up are non-functional.
const useAuth = () => ({ isLoaded: true, isSignedIn: false });
const useUser = () => ({ isLoaded: true, isSignedIn: false, user: undefined });
const useClerk = () => ({ signOut: async () => undefined });
const RedirectToSignIn = () => <Redirect to="/sign-in" />;

const enrollmentSchema = z.object({
  courseId: z.enum(['data-analysis', 'frontend', 'backend', 'cybersecurity', 'virtual-assistant']),
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120, 'Keep your name under 120 characters.'),
  whatsappNumber: z.string().trim().min(10, 'Enter a valid WhatsApp number.').max(32, 'Enter a shorter WhatsApp number.'),
  selectionReason: z.string().trim().min(20, 'Please share at least 20 characters.').max(1000, 'Keep your answer under 1,000 characters.'),
});
type EnrollmentValues = z.infer<typeof enrollmentSchema>;
type HomeStep = 'welcome' | 'course' | 'details' | 'questions' | 'access';

const courseAccents: Record<CourseId, { short: string; icon: typeof Code }> = {
  'data-analysis': { short: 'DA', icon: Database },
  frontend: { short: 'FE', icon: Code },
  backend: { short: 'BE', icon: Wrench },
  cybersecurity: { short: 'CY', icon: ShieldCheck },
  'virtual-assistant': { short: 'VA', icon: ClipboardText },
};

const fallbackCourses: Course[] = [
  { id: 'data-analysis', name: 'Data Analysis', summary: 'Turn information into clear decisions.', schedule: 'To Be Decided', classLink: null, whatsappLink: null },
  { id: 'frontend', name: 'Frontend Development', summary: 'Build useful websites from scratch.', schedule: 'To Be Decided', classLink: null, whatsappLink: null },
  { id: 'backend', name: 'Backend Development', summary: 'Learn how the systems behind apps work.', schedule: 'To Be Decided', classLink: null, whatsappLink: null },
  { id: 'cybersecurity', name: 'Cybersecurity', summary: 'Build safer digital habits and systems.', schedule: 'To Be Decided', classLink: null, whatsappLink: null },
  { id: 'virtual-assistant', name: 'Virtual Assistant', summary: 'Learn practical tools for remote work.', schedule: 'To Be Decided', classLink: null, whatsappLink: null },
];

const coursePhotos: Record<CourseId, string> = {
  'data-analysis': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
  frontend: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
  backend: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  cybersecurity: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=80',
  'virtual-assistant': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
};

const communityWhatsappHref = `https://wa.me/?text=${encodeURIComponent('Hi Tech Pilot, please share the student community invite link with me.')}`;

const scholarshipQuestions = [
  { prompt: 'Do you have a computer for class?', options: ['Yes, my own', 'I can share one', 'Phone only for now', 'I’m working on access'] },
  { prompt: 'How familiar are you with tech courses?', options: ['This would be my first', 'I’ve tried a little', 'I’ve taken a course before'] },
  { prompt: 'What could make attending class difficult?', options: ['Internet or data', 'Finding the time', 'Nothing major right now', 'Something else'] },
  { prompt: 'What would you most like to do with this skill?', options: ['Find a job', 'Freelance', 'Grow a business', 'Build something of my own'] },
];

function useMockCourses() {
  return { data: fallbackCourses, isLoading: false, isError: false, refetch: async () => ({}) };
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand-mark" data-testid="link-brand-home">
      <span className="brand-icon" aria-hidden="true"><GraduationCap weight="fill" size={compact ? 19 : 22} /></span>
      {!compact ? <span><strong>Tech Pilot</strong><small>Classes</small></span> : null}
    </Link>
  );
}

function LoadingState({ label = 'Preparing your learning space' }: { label?: string }) {
  return (
    <div className="state-screen" data-testid="status-loading">
      <div className="skeleton-orb"><CircleNotch size={24} className="spin" aria-hidden="true" /></div>
      <p>{label}</p>
    </div>
  );
}

function ErrorState({ onRetry, label = 'We could not load this just now.' }: { onRetry?: () => void; label?: string }) {
  return (
    <div className="state-card" data-testid="status-error">
      <WarningCircle size={28} aria-hidden="true" />
      <div><strong>{label}</strong><p>Please check your connection and try again.</p></div>
      {onRetry ? <button type="button" className="text-button" onClick={onRetry} data-testid="button-retry">Try again <ArrowRight size={15} /></button> : null}
    </div>
  );
}

function AccountMenu({ name }: { name: string }) {
  const { signOut } = useClerk();
  const [notice, setNotice] = useState('');
  return (
    <details className="account-menu">
      <summary className="account-trigger" aria-label={`Account menu for ${name}`}>
        <span className="portal-avatar" aria-hidden="true">{name.trim()[0]?.toUpperCase() ?? 'J'}</span>
        <span className="account-name">{name}</span><CaretDown size={15} aria-hidden="true" />
      </summary>
      <div className="account-dropdown">
        <div className="account-dropdown-heading">Signed in as <strong>{name}</strong></div>
        <button type="button" onClick={() => setNotice('Profile details are coming soon.') }><UserCircle size={17} /> Profile</button>
        <button type="button" onClick={() => setNotice('Settings are coming soon.') }><Gear size={17} /> Settings</button>
        {notice ? <p role="status" className="account-notice">{notice}</p> : null}
        <button type="button" className="account-logout" onClick={() => signOut({ redirectUrl: basePath || '/' })}><SignOut size={17} /> Log out</button>
      </div>
    </details>
  );
}

function PageHeader({ signedIn = false, accountName = 'Jonathan' }: { signedIn?: boolean; accountName?: string }) {
  return (
    <header className="site-header">
      <Logo />
      <nav className="header-actions" aria-label="Primary navigation">
        {signedIn ? <AccountMenu name={accountName} /> : <Link href="/sign-in" className="header-link" data-testid="link-sign-in">Sign in <ArrowUpRight size={15} /></Link>}
      </nav>
    </header>
  );
}

function CourseCard({ course, selected, onSelect }: { course: Course; selected: boolean; onSelect: () => void }) {
  const { icon: Icon } = courseAccents[course.id];
  return (
    <button type="button" className={`course-card ${selected ? 'is-selected' : ''}`} onClick={onSelect} role="radio" aria-checked={selected} data-testid={`option-course-${course.id}`}>
      <span className="course-icon"><Icon size={22} weight="bold" aria-hidden="true" /></span>
      <span className="course-copy"><strong>{course.name}</strong><small>{course.summary}</small></span>
      <span className="course-check">{selected ? <CheckCircle weight="fill" size={22} aria-hidden="true" /> : <span />}</span>
    </button>
  );
}

function ProgressSteps({ step }: { step: HomeStep }) {
  const steps: HomeStep[] = ['welcome', 'course', 'details', 'questions', 'access'];
  const active = steps.indexOf(step);
  return (
    <div className="journey-progress" data-testid="status-progress">
      {steps.map((item, index) => <span key={item} className={index <= active ? 'active' : ''} />)}
      <small>{step === 'welcome' ? 'A gentle start' : `Step ${active} of ${steps.length - 1}`}</small>
    </div>
  );
}

function EnrollmentForm({
  courses,
  initialCourseId,
  initialFullName = '',
  initialWhatsappNumber = '',
  submitLabel,
  onSubmit,
  pending = false,
  errorMessage,
  showCoursePicker = true,
}: {
  courses: Course[];
  initialCourseId?: CourseId;
  initialFullName?: string;
  initialWhatsappNumber?: string;
  submitLabel: string;
  onSubmit: (values: EnrollmentValues) => void;
  pending?: boolean;
  errorMessage?: string;
  showCoursePicker?: boolean;
}) {
  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: { courseId: initialCourseId ?? courses[0]?.id, fullName: initialFullName, whatsappNumber: initialWhatsappNumber, selectionReason: '' },
  });
  const selectedId = form.watch('courseId');
  return (
    <form className="enrollment-form" onSubmit={form.handleSubmit(onSubmit)} noValidate data-testid="form-enrollment">
      {showCoursePicker ? (
        <fieldset>
          <legend>Choose your course</legend>
          <div className="course-list" role="radiogroup" aria-label="Available courses">
            {courses.map((course) => <CourseCard key={course.id} course={course} selected={selectedId === course.id} onSelect={() => form.setValue('courseId', course.id, { shouldValidate: true })} />)}
          </div>
          {form.formState.errors.courseId ? <p className="field-error" data-testid="error-course">{form.formState.errors.courseId.message}</p> : null}
        </fieldset>
      ) : null}
      <div className="field-grid">
        <label className="field">
          <span>Your full name</span>
          <div className="field-input"><UserCircle size={18} aria-hidden="true" /><input {...form.register('fullName')} placeholder="e.g. Ada Okafor" autoComplete="name" data-testid="input-full-name" /></div>
          {form.formState.errors.fullName ? <small className="field-error" data-testid="error-full-name">{form.formState.errors.fullName.message}</small> : null}
        </label>
        <label className="field">
          <span>WhatsApp number</span>
          <div className="field-input"><WhatsappLogo size={18} aria-hidden="true" /><input {...form.register('whatsappNumber')} placeholder="+234 801 234 5678" autoComplete="tel" inputMode="tel" data-testid="input-whatsapp-number" /></div>
          {form.formState.errors.whatsappNumber ? <small className="field-error" data-testid="error-whatsapp-number">{form.formState.errors.whatsappNumber.message}</small> : null}
        </label>
      </div>
      <label className="field reason-field">
        <span>Why should we award you a scholarship?</span>
        <textarea {...form.register('selectionReason')} placeholder="Tell us why this scholarship matters to you, how you will make time for class, and what you hope to do with the skills." rows={4} maxLength={1000} data-testid="input-selection-reason" />
        <small className="field-hint">Applications are reviewed by the Tech Pilot team. Share a thoughtful answer to help us understand your goals.</small>
        {form.formState.errors.selectionReason ? <small className="field-error" data-testid="error-selection-reason">{form.formState.errors.selectionReason.message}</small> : null}
      </label>
      {errorMessage ? <p className="form-error" data-testid="status-enrollment-error">{errorMessage}</p> : null}
      <button className="primary-button wide-mobile" type="submit" disabled={pending} data-testid="button-submit-enrollment">
        {pending ? <><CircleNotch className="spin" size={18} aria-hidden="true" /> Submitting application</> : <>{submitLabel} <ArrowRight size={18} aria-hidden="true" /></>}
      </button>
    </form>
  );
}

function Home() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();
  const coursesQuery = useMockCourses();
  const whatsappMutation = useCreateWhatsAppEnrollment();
  const requestedStep = new URLSearchParams(window.location.search).get('step');
  const validSteps: HomeStep[] = ['welcome', 'course', 'details', 'questions', 'access'];
  const previewStep = validSteps.includes(requestedStep as HomeStep) ? requestedStep as HomeStep : 'welcome';
  const [step, setStep] = useState<HomeStep>(previewStep);
  const [selectedIds, setSelectedIds] = useState<CourseId[]>(previewStep === 'details' || previewStep === 'questions' || previewStep === 'access' ? ['frontend'] : []);
  const [applicationIndex, setApplicationIndex] = useState(0);
  const [details, setDetails] = useState({ fullName: '', whatsappNumber: '' });
  const [applicationAnswers, setApplicationAnswers] = useState(['', '', '', '']);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [questionsError, setQuestionsError] = useState('');
  const courses = Array.isArray(coursesQuery.data) ? coursesQuery.data : fallbackCourses;
  const selectedId = selectedIds[applicationIndex];
  const selectedCourse = courses.find((course) => course.id === selectedId);

  useEffect(() => {
    if (isSignedIn) setLocation('/student-portal');
  }, [isSignedIn, setLocation]);

  if (coursesQuery.isLoading) return <><PageHeader /><LoadingState label="Loading the next step" /></>;
  if (coursesQuery.isError) return <><PageHeader /><main className="center-wrap"><ErrorState onRetry={() => coursesQuery.refetch()} /></main></>;

  const submitWhatsApp = (values: EnrollmentValues) => {
    setDetails({ fullName: values.fullName, whatsappNumber: values.whatsappNumber });
    sessionStorage.setItem("tech-pilot-selection-reason", values.selectionReason);
    setSelectedIds([values.courseId]);
    whatsappMutation.mutate({ data: { courseId: values.courseId, fullName: values.fullName, whatsappNumber: values.whatsappNumber } }, {
      onSuccess: (enrollment) => {
        sessionStorage.setItem('tech-pilot-whatsapp-enrollment', JSON.stringify(enrollment));
        setLocation('/whatsapp-confirmation');
      },
    });
  };

  return (
    <main className="public-app">
      <PageHeader />
      <div className="home-shell">
        <aside className="home-aside">
          <img className="hero-photo" src="/hero-nigerian-learners.png" alt="Black Nigerian learners, from older teens to adults, collaborating around a laptop" />
          <div className="aside-label"><span className="dot" /> Scholarship-supported tech classes</div>
          <div className="aside-quote">Build skills.<br /><em>Open doors.</em></div>
          <p>Practical, beginner-friendly tech classes with a community ready to help you grow.</p>
          <div className="aside-note"><Sparkle size={16} aria-hidden="true" /><span>Choose one course or explore a few.</span></div>
          <div className="trust-note"><strong>Learn with people like you</strong><span>Supportive instructors · Beginner friendly · Made for real life</span></div>
        </aside>
        <section className="journey-panel" aria-live="polite">
          <ProgressSteps step={step} />
          {step === 'welcome' ? (
            <div className="journey-content reveal" data-testid="section-welcome">
              <span className="eyebrow">Scholarship applications are open</span>
              <h1>Your next chapter can start with <span>one skill.</span></h1>
              <p className="lead">Explore practical tech courses, choose the ones that fit your goals, and send a separate scholarship application for each one.</p>
              <div className="welcome-points">
                <span><CheckCircle weight="fill" size={18} /> Beginner-first lessons</span>
                <span><CheckCircle weight="fill" size={18} /> Friendly class community</span>
                <span><CheckCircle weight="fill" size={18} /> Clear next steps</span>
              </div>
              <button type="button" className="primary-button" onClick={() => setStep('course')} data-testid="button-get-started">Apply for a scholarship <ArrowRight size={18} /></button>
              <p className="micro-copy">Free to apply · No tech background needed · Apply for multiple courses</p>
            </div>
          ) : null}
          {step === 'course' ? (
            <div className="journey-content reveal" data-testid="section-course">
              <span className="eyebrow">Find your starting point · Step 1 of 4</span>
              <h2>What would you like to learn?</h2>
              <p className="lead compact">Pick every course that interests you. You’ll complete a focused application for each course, one at a time.</p>
              <div className="course-list course-photo-list" aria-label="Choose one or more courses">
                {courses.map((course) => {
                  const photo = coursePhotos[course.id];
                  const selected = selectedIds.includes(course.id);
                  return <button type="button" key={course.id} className={`course-choice ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => setSelectedIds((ids) => selected ? ids.filter((id) => id !== course.id) : [...ids, course.id])}>
                    <img src={photo} alt="" loading="lazy" />
                    <span className="course-choice-shade" />
                    <span className="course-choice-copy"><strong>{course.name}</strong><small>{course.summary}</small></span>
                    <span className="course-choice-check">{selected ? <CheckCircle weight="fill" size={23} /> : <span />}</span>
                  </button>;
                })}
              </div>
              <p className="selection-count" aria-live="polite">{selectedIds.length ? `${selectedIds.length} course${selectedIds.length === 1 ? '' : 's'} selected · each gets its own application` : 'Select at least one course to continue'}</p>
              <div className="journey-actions"><button type="button" className="secondary-button" onClick={() => setStep('welcome')} data-testid="button-back-course">Back</button><button type="button" className="primary-button" disabled={!selectedIds.length} onClick={() => { setApplicationIndex(0); setApplicationAnswers(['', '', '', '']); setStep('details'); }} data-testid="button-next-course">Start {selectedIds.length || ''} {selectedIds.length === 1 ? 'application' : 'applications'} <ArrowRight size={18} /></button></div>
            </div>
          ) : null}
          {step === 'details' ? (
            <div className="journey-content reveal" data-testid="section-details">
              <span className="eyebrow">Application {applicationIndex + 1} of {selectedIds.length} · {selectedCourse?.name}</span>
              <h2>Tell us about yourself.</h2>
              <p className="lead compact">Share your contact details and tell us why you should receive a scholarship for {selectedCourse?.name ?? 'this course'}.</p>
              <EnrollmentForm key={`${selectedId}-details`} courses={courses} initialCourseId={selectedId} initialFullName={details.fullName} initialWhatsappNumber={details.whatsappNumber} submitLabel="Continue with this course" showCoursePicker={false} onSubmit={(values) => { setDetails({ fullName: values.fullName, whatsappNumber: values.whatsappNumber }); sessionStorage.setItem('tech-pilot-selection-reason', values.selectionReason); sessionStorage.setItem('tech-pilot-mock-name', values.fullName); setStep('questions'); }} />
            </div>
          ) : null}
          {step === 'questions' ? (
            <div className="journey-content reveal" data-testid="section-scholarship-questions">
              <span className="eyebrow">Application {applicationIndex + 1} of {selectedIds.length} · {selectedCourse?.name}</span>
              <h2>A few quick questions.</h2>
              <p className="lead compact">No perfect answers needed. Choose what fits, or open the text option to answer your way.</p>
              <div className="question-progress" aria-live="polite"><span>Question {activeQuestion + 1} of {scholarshipQuestions.length}</span><div>{scholarshipQuestions.map((_, index) => <i key={index} className={index <= activeQuestion ? 'active' : ''} />)}</div></div>
              <section className="quick-question" aria-labelledby="active-scholarship-question">
                <h3 id="active-scholarship-question">{scholarshipQuestions[activeQuestion].prompt}</h3>
                <div className="quick-answer-list" role="group" aria-label="Choose an answer">
                  {scholarshipQuestions[activeQuestion].options.map((option) => <button type="button" key={option} className={`quick-answer ${applicationAnswers[activeQuestion] === option ? 'selected' : ''}`} aria-pressed={applicationAnswers[activeQuestion] === option} onClick={() => { const next = [...applicationAnswers]; next[activeQuestion] = option; setApplicationAnswers(next); setQuestionsError(''); }}><span className="quick-answer-radio" />{option}</button>)}
                </div>
                <details className="question-write-in"><summary>Or type a short answer</summary><textarea value={scholarshipQuestions[activeQuestion].options.includes(applicationAnswers[activeQuestion]) ? '' : applicationAnswers[activeQuestion]} onChange={(event) => { const next = [...applicationAnswers]; next[activeQuestion] = event.target.value; setApplicationAnswers(next); setQuestionsError(''); }} rows={2} maxLength={500} placeholder="A few words is plenty" data-testid={`input-scholarship-answer-${activeQuestion + 1}`} /></details>
              </section>
              {questionsError ? <p className="form-error" role="alert">{questionsError}</p> : null}
              <div className="journey-actions">
                {activeQuestion > 0 ? <button type="button" className="secondary-button" onClick={() => { setActiveQuestion(activeQuestion - 1); setQuestionsError(''); }}>Back</button> : <button type="button" className="secondary-button" onClick={() => setStep('details')}>Back</button>}
                {activeQuestion < scholarshipQuestions.length - 1 ? <button type="button" className="primary-button" disabled={!applicationAnswers[activeQuestion].trim()} onClick={() => { setActiveQuestion(activeQuestion + 1); setQuestionsError(''); }}>Next question <ArrowRight size={18} /></button> : <button type="button" className="primary-button" disabled={!applicationAnswers[activeQuestion].trim()} onClick={() => { const incomplete = applicationAnswers.findIndex((answer) => !answer.trim()); if (incomplete !== -1) { setActiveQuestion(incomplete); setQuestionsError('Please choose or type a short answer to continue.'); return; } const saved = (JSON.parse(sessionStorage.getItem('tech-pilot-applications') ?? '[]') as Array<{courseId: CourseId; answers: string[]; selectionReason: string}>).filter((item) => item.courseId !== selectedId); saved.push({ courseId: selectedId!, answers: [...applicationAnswers], selectionReason: sessionStorage.getItem('tech-pilot-selection-reason') ?? '' }); sessionStorage.setItem('tech-pilot-applications', JSON.stringify(saved)); sessionStorage.setItem('tech-pilot-scholarship-answers', JSON.stringify(applicationAnswers)); sessionStorage.setItem('tech-pilot-application-submitted', 'true'); if (applicationIndex + 1 < selectedIds.length) { setApplicationIndex(applicationIndex + 1); setApplicationAnswers(['', '', '', '']); setActiveQuestion(0); setQuestionsError(''); setStep('details'); } else { setStep('access'); } }} data-testid="button-submit-application">{applicationIndex + 1 < selectedIds.length ? 'Save and apply for next course' : 'Submit application'} <ArrowRight size={18} /></button>}
              </div>
            </div>
          ) : null}
          {step === 'access' ? (
            <div className="journey-content reveal" data-testid="section-access">
              <span className="eyebrow"><CheckCircle size={15} weight="fill" aria-hidden="true" /> Application submitted · {selectedIds.length} course{selectedIds.length === 1 ? '' : 's'}</span>
              <h2>Your application has been submitted!</h2>
              <p className="lead compact">Thanks for applying. The Tech Pilot team will review your application{selectedIds.length === 1 ? '' : 's'}. Please expect a response soon, usually within 4–5 days.</p>
              <a className="submitted-course" href={communityWhatsappHref} target="_blank" rel="noreferrer"><img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=240&q=80" alt=""/><span><strong>Tech Pilot student community</strong><small>Join community <ArrowUpRight size={13}/></small></span></a>
              <p className="micro-copy">The same student community is here for everyone, whatever course you chose.</p>
              <div className="access-grid"><Link className="access-card" href="/student-portal" data-testid="button-create-portal-account"><span className="access-icon portal"><LockKey size={23} weight="bold" /></span><span><strong>Open your student dashboard</strong><small>See every course you applied for and its course-specific WhatsApp link.</small></span><ArrowRight size={17} /></Link></div>
              <button type="button" className="back-link" onClick={() => setStep('questions')} data-testid="button-back-access">Back to questions</button>
            </div>
          ) : null}
        </section>
      </div>
      <footer className="site-footer"><span>Tech Pilot Classes · Built for beginners in Nigeria</span><span>Learn a little. Build a lot.</span></footer>
    </main>
  );
}

function WhatsAppConfirmation() {
  const [enrollment] = useState<StudentEnrollment | null>(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('tech-pilot-whatsapp-enrollment') ?? 'null') as StudentEnrollment | null;
      if (stored) return stored;
      if (new URLSearchParams(window.location.search).get('preview') === '1') return { id: 0, courseId: 'frontend', fullName: 'Ada Okafor', whatsappNumber: '', accessMode: 'whatsapp', createdAt: new Date().toISOString() };
      return null;
    } catch { return null; }
  });
  const coursesQuery = useMockCourses();
  const course = coursesQuery.data?.find((item) => item.id === enrollment?.courseId);
  if (coursesQuery.isLoading) return <><PageHeader /><LoadingState /></>;
  if (!enrollment || !course) return <><PageHeader /><main className="center-wrap"><div className="empty-state" data-testid="status-empty-confirmation"><Lifebuoy size={30} /><h1>No enrollment to show</h1><p>Start with a course and we’ll take it from there.</p><Link className="primary-button" href="/" data-testid="link-start-enrollment">Start enrollment <ArrowRight size={17} /></Link></div></main></>;
  return (
    <main className="public-app">
      <PageHeader />
      <div className="confirmation-wrap">
        <div className="confirmation-card reveal" data-testid="section-whatsapp-confirmation">
          <div className="success-mark"><CheckCircle size={30} weight="fill" /></div>
          <span className="eyebrow">Application received</span>
          <h1>Your application is in, {enrollment.fullName.split(' ')[0]}.</h1>
          <p className="lead compact">Your application for a Tech Pilot scholarship in <strong>{course.name}</strong> has been received. Expect a response by email in about 4–5 days. We will let you know whether you have been selected and share the next steps.</p>
          <div className="detail-list">
            <div><span>Course</span><strong data-testid="text-confirmation-course">{course.name}</strong></div>
            <div><span>Class schedule</span><strong data-testid="status-confirmation-schedule">{course.schedule || 'To Be Decided'}</strong></div>
            <div><span>Scholarship decision</span><strong data-testid="status-confirmation-whatsapp">Pending</strong></div>
          </div>
          <div className="notice-box"><Bell size={20} /><span>While you wait for your response in about 4–5 days, join the WhatsApp group for applicants only to get application updates.</span></div>
          <Link href="/" className="back-link centered" data-testid="link-back-home">Back to Tech Pilot Classes</Link>
        </div>
      </div>
    </main>
  );
}

function EnrollmentComplete() {
  const { isLoaded, isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const saveMutation = useSaveMyEnrollment();
  const client = useQueryClient();
  const ran = useRef(false);
  useEffect(() => {
    if (!isLoaded || !isSignedIn || ran.current) return;
    ran.current = true;
    let pending: EnrollmentValues | null = null;
    try { pending = JSON.parse(sessionStorage.getItem('tech-pilot-pending-enrollment') ?? 'null') as EnrollmentValues | null; } catch { pending = null; }
    if (!pending) { setLocation('/student-portal'); return; }
    saveMutation.mutate({ data: pending }, {
      onSuccess: async () => {
        sessionStorage.removeItem('tech-pilot-pending-enrollment');
        await client.invalidateQueries({ queryKey: getGetMyEnrollmentQueryKey() });
        setLocation('/student-portal');
      },
    });
  }, [client, isLoaded, isSignedIn, saveMutation, setLocation]);
  if (!isLoaded || saveMutation.isPending) return <><PageHeader /><LoadingState label="Finishing your enrollment" /></>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (saveMutation.isError) return <><PageHeader /><main className="center-wrap"><ErrorState onRetry={() => window.location.reload()} label="Your account is ready, but we could not save your course." /></main></>;
  return <LoadingState />;
}

function StatusChip({ children = 'Pending' }: { children?: string }) {
  return <span className="status-chip">{children}</span>;
}

function InfoTile({ icon: Icon, label, value, href, emptyValue, testId }: {
  icon: typeof BookOpen;
  label: string;
  value?: string | null;
  href?: string | null;
  emptyValue: string;
  testId?: string;
}) {
  const isEmpty = !value || value.toLowerCase() === 'to be decided';
  const content = <><span className="info-icon"><Icon size={18} aria-hidden="true" /></span><span className="info-tile-copy"><small>{label}</small><strong data-testid={testId}>{isEmpty ? emptyValue : value}</strong></span>{isEmpty ? <StatusChip /> : href ? <ArrowUpRight className="info-external" size={16} aria-hidden="true" /> : null}</>;
  return isEmpty ? <div className="info-tile info-tile-empty" aria-label={`${label}: ${emptyValue}, pending`}>{content}</div> : href ? <a className="info-tile info-tile-link" href={href} target="_blank" rel="noreferrer" aria-label={`Open ${label}: ${value}`} data-testid={testId ? `link-${testId}` : undefined}>{content}</a> : <div className="info-tile info-tile-filled">{content}</div>;
}

function CourseInfo({ course }: { course: Course }) {
  return (
    <div className="course-info-grid">
      <InfoTile icon={GraduationCap} label="Instructor" emptyValue="Not assigned yet" />
      <InfoTile icon={ClipboardText} label="Timetable" value={course.schedule} emptyValue="Not scheduled yet" testId="status-portal-schedule" />
      <InfoTile icon={WhatsappLogo} label="Student community" value="Join community" href={communityWhatsappHref} emptyValue="Link coming soon" testId="status-portal-whatsapp" />
      <InfoTile icon={VideoCamera} label="Classroom link" value={course.classLink ? 'Open classroom' : null} href={course.classLink} emptyValue="Your instructor will share this soon" testId="status-portal-classroom" />
    </div>
  );
}

function AnnouncementPreview({ title, date, unread, onRead }: { title: string; date: string; unread: boolean; onRead: () => void }) {
  return (
    <section className="bento-tile bento-announcement" aria-labelledby="latest-announcement-title" data-testid="section-latest-announcement">
      <div className="bento-tile-head"><span className="info-icon"><Bell size={19} aria-hidden="true" /></span><span className="eyebrow">LATEST ANNOUNCEMENT</span>{unread ? <span className="unread-label">Unread</span> : null}</div>
      <h3 id="latest-announcement-title">{title}</h3>
      <p className="announcement-date">{date}</p>
      <a href="#announcements" className="text-link bento-muted" onClick={(event) => { event.preventDefault(); onRead(); }}>Read announcement <ArrowRight size={15} aria-hidden="true" /></a>
    </section>
  );
}

function NextSteps({ onTab, hasWhatsapp, hasSchedule, whatsappHref }: { onTab: (tab: 'assignments' | 'attendance') => void; hasWhatsapp: boolean; hasSchedule: boolean; whatsappHref?: string | null }) {
  return (
    <section className="bento-tile bento-next-steps" aria-labelledby="next-steps-title" data-testid="section-next-steps">
      <div className="bento-tile-head"><span className="info-icon"><CheckCircle size={19} aria-hidden="true" /></span><span className="eyebrow">A GOOD PLACE TO START</span></div>
      <h3 id="next-steps-title">Next steps</h3>
      <ul className="checklist">
        <li><span className={hasWhatsapp ? 'checklist-mark done' : 'checklist-mark'}>{hasWhatsapp ? '✓' : '1'}</span>{whatsappHref ? <a className="text-link" href={whatsappHref} target="_blank" rel="noreferrer">Join community <ArrowUpRight size={13} /></a> : <span>Join community</span>}<StatusChip>{hasWhatsapp ? 'Ready' : 'Pending'}</StatusChip></li>
        <li><span className={hasSchedule ? 'checklist-mark done' : 'checklist-mark'}>{hasSchedule ? '✓' : '2'}</span><button type="button" className="text-link" onClick={() => onTab('attendance')}>Check the timetable</button><StatusChip>{hasSchedule ? 'Ready' : 'Pending'}</StatusChip></li>
        <li><span className="checklist-mark">3</span><button type="button" className="text-link" onClick={() => onTab('assignments')}>Complete your first assignment</button><ArrowRight size={14} aria-hidden="true" /></li>
      </ul>
    </section>
  );
}

const timetableRows = [
  { day: 'Monday', date: 'To Be Decided', time: 'To Be Decided', topic: 'Class topic will appear here', icon: BookOpen },
  { day: 'Wednesday', date: 'To Be Decided', time: 'To Be Decided', topic: 'Class topic will appear here', icon: VideoCamera },
  { day: 'Friday', date: 'To Be Decided', time: 'To Be Decided', topic: 'Practice session will appear here', icon: CalendarBlank },
];

function Timetable({ course }: { course: Course }) {
  return (
    <section className="portal-section timetable-section" data-testid="section-timetable">
      <div className="section-heading">
        <div><span className="eyebrow">Your week at a glance</span><h2>Class timetable</h2></div>
        <span className="schedule-status"><span /> {course.schedule || 'To Be Decided'}</span>
      </div>
      <div className="timetable-list">
        {timetableRows.map(({ day, date, time, topic, icon: Icon }) => (
          <div className="timetable-row" key={day}>
            <div className="timetable-day"><strong>{day}</strong><small>{date}</small></div>
            <div className="timetable-topic"><span className="timetable-icon"><Icon size={18} /></span><div><strong>{topic}</strong><small><Clock size={13} /> {time}</small></div></div>
            <span className="timetable-place"><MapPin size={14} /> Online</span>
          </div>
        ))}
      </div>
      <div className="timetable-note"><Bell size={17} /><span>Your class team will add the confirmed days, times, and links here.</span></div>
    </section>
  );
}

function StudentPortal() {
  const storedName = sessionStorage.getItem('tech-pilot-mock-name')?.trim();
  const user = { firstName: storedName?.split(/\s+/)[0] || 'Jonathan', fullName: storedName || 'Jonathan' };
  const isLoaded = true;
  const isSignedIn = true;
  const enrollmentQuery = useGetMyEnrollment({ query: { enabled: false, queryKey: getGetMyEnrollmentQueryKey() } });
  const coursesQuery = useMockCourses();
  const [showEnrollment, setShowEnrollment] = useState(false);
  const portalTabs = ['overview', 'tests', 'assignments', 'attendance', 'announcements'] as const;
  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  const initialTab = portalTabs.includes(requestedTab as typeof portalTabs[number]) ? requestedTab as typeof portalTabs[number] : 'overview';
  const [activePortalTab, setActivePortalTab] = useState<typeof portalTabs[number]>(initialTab);
  const [testAnswer, setTestAnswer] = useState('');
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [assignmentText, setAssignmentText] = useState('');
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [announcementUnread, setAnnouncementUnread] = useState(true);
  const saveMutation = useSaveMyEnrollment();
  const client = useQueryClient();
  const enrollment = enrollmentQuery.data ?? { id: 1, courseId: 'frontend' as CourseId, fullName: user.fullName, whatsappNumber: '', accessMode: 'portal' as const, createdAt: new Date().toISOString() };
  const portalCourses = Array.isArray(coursesQuery.data) ? coursesQuery.data : fallbackCourses;
  const course = portalCourses.find((item) => item.id === enrollment.courseId) ?? fallbackCourses[1];
  const appliedCourseIds = (() => { try { return (JSON.parse(sessionStorage.getItem('tech-pilot-applications') ?? '[]') as Array<{courseId: CourseId}>).map((item) => item.courseId); } catch { return []; } })();
  const dashboardCourses = [...new Set(appliedCourseIds.length ? appliedCourseIds : [enrollment.courseId])].map((id) => portalCourses.find((item) => item.id === id)).filter((item): item is Course => Boolean(item));
  const primaryDashboardCourse = dashboardCourses[0] ?? course;
  const isNotEnrolled = false;

  if (!isLoaded) return <LoadingState />;
  if (!isSignedIn) return <RedirectToSignIn />;
  // This is a frontend-only mock: it remains usable even without the API.

  const submit = (values: EnrollmentValues) => saveMutation.mutate({ data: { courseId: values.courseId, fullName: values.fullName, whatsappNumber: values.whatsappNumber } }, {
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: getGetMyEnrollmentQueryKey() });
      setShowEnrollment(false);
    },
  });
  return (
    <main className="portal-app">
      <div className="portal-layout">
        <aside className="portal-sidebar" aria-label="Student portal navigation">
          <Logo />
          <div className="sidebar-label">STUDENT SPACE</div>
          <nav className="portal-tabs" aria-label="Dashboard sections" data-testid="student-dashboard-tabs">
            {([['overview', 'Overview', SquaresFour], ['tests', 'Tests & questions', Exam], ['assignments', 'Assignments', ClipboardText], ['attendance', 'Attendance', CalendarBlank], ['announcements', 'Announcements', Bell]] as const).map(([tab, label, Icon]) => (
              <button type="button" key={tab} className={activePortalTab === tab ? 'portal-tab active' : 'portal-tab'} aria-label={label} aria-current={activePortalTab === tab ? 'page' : undefined} onClick={() => setActivePortalTab(tab)}><Icon size={19} weight={activePortalTab === tab ? 'fill' : 'regular'} /> <span>{label}</span>{tab === 'announcements' && announcementUnread ? <span className="tab-count">1</span> : null}</button>
            ))}
          </nav>
          <div className="sidebar-course-links"><span>STUDENT COMMUNITY</span><a href={communityWhatsappHref} target="_blank" rel="noreferrer"><WhatsappLogo size={16} weight="fill"/><span>Join community</span><ArrowUpRight size={13}/></a></div>

        </aside>
        <div className="portal-main">
          <PageHeader signedIn accountName={user.fullName} />
          <div className="portal-shell">
        <div className="portal-intro"><div><span className="eyebrow">YOUR OVERVIEW</span><h1>Good to see you, {user.firstName}.</h1><p>Here’s what’s happening with your learning.</p></div></div>
        {activePortalTab === 'tests' ? <section className="portal-card dashboard-panel" data-testid="section-tests"><span className="eyebrow">Quick knowledge check</span><h2>Tests & questions</h2><p className="panel-description">Frontend basics · 1 question · Practice</p><div className="question-block"><strong>Which language is used to add interactivity to a web page?</strong>{[['html', 'HTML'], ['css', 'CSS'], ['javascript', 'JavaScript'], ['sql', 'SQL']].map(([value, label]) => <label className="choice-row" key={value}><input type="radio" name="test-answer" value={value} checked={testAnswer === value} onChange={() => { setTestAnswer(value); setTestSubmitted(false); }} />{label}</label>)}</div>{testSubmitted ? <p className={testAnswer === 'javascript' ? 'result-good' : 'result-note'} role="status">{testAnswer === 'javascript' ? 'Correct! JavaScript adds interactivity to web pages.' : 'Not quite. Review the lesson and try again.'}</p> : null}<button className="primary-button" type="button" disabled={!testAnswer} onClick={() => setTestSubmitted(true)}>{testSubmitted ? 'Check answer again' : 'Check answer'} <ArrowRight size={17} /></button></section> : null}
        {activePortalTab === 'assignments' ? <section className="portal-card dashboard-panel" data-testid="section-assignments"><span className="eyebrow">Your classwork</span><h2>Assignments</h2><div className="assignment-item"><div><strong>Build a simple profile page</strong><p>Create a one-page profile using the HTML elements from this week’s lesson.</p><small>Due Friday · Frontend Development</small></div><span className="assignment-status">{assignmentSubmitted ? 'Submitted' : 'In progress'}</span></div><label className="field assignment-field"><span>Submission notes or link</span><textarea value={assignmentText} onChange={(event) => setAssignmentText(event.target.value)} placeholder="Paste a project link or tell your instructor where to find your work." rows={4} data-testid="input-assignment-submission" /></label><label className="upload-control"><UploadSimple size={18} /> Attach a file<input type="file" aria-label="Attach assignment file" /></label><button className="primary-button" type="button" disabled={!assignmentText.trim()} onClick={() => setAssignmentSubmitted(true)}>{assignmentSubmitted ? 'Update submission' : 'Submit assignment'} <ArrowRight size={17} /></button></section> : null}
        {activePortalTab === 'attendance' ? <section className="portal-card dashboard-panel" data-testid="section-attendance"><span className="eyebrow">Your class record</span><h2>Attendance</h2><div className="attendance-summary"><strong>{attendanceMarked ? '1' : '0'} <small>of 1</small></strong><span>sessions attended</span></div><div className="attendance-row"><div><strong>Frontend foundations</strong><small>Today · Online class</small></div><span className={attendanceMarked ? 'attendance-pill present' : 'attendance-pill'}>{attendanceMarked ? 'Present' : 'Not marked'}</span></div><button type="button" className="primary-button" disabled={attendanceMarked} onClick={() => setAttendanceMarked(true)}>{attendanceMarked ? 'Attendance recorded' : 'Mark me present'} <CheckCircle size={17} /></button></section> : null}
        {activePortalTab === 'announcements' ? <section id="announcements" className="portal-card dashboard-panel" data-testid="section-announcements"><span className="eyebrow">From your class team</span><h2>Announcements</h2><article className="announcement-item"><div className="announcement-icon"><Bell size={19} /></div><div><span className="announcement-date">October 1, 2026 · Frontend Development</span><h3>Welcome to your learning space</h3><p>Your class schedule and live classroom link will appear here as soon as your instructor shares them.</p></div></article></section> : null}
        {activePortalTab === 'overview' && enrollment && course ? (
          <div className="bento-grid" data-testid="section-portal-bento">
            {dashboardCourses.map((courseItem) => <section className="portal-card bento-tile bento-course reveal" key={courseItem.id} data-testid={`section-enrolled-course-${courseItem.id}`}>
              <div className="portal-card-top"><div><span className="status-pill"><span /> Scholarship learner</span><h2>{courseItem.name}</h2><p>{courseItem.summary}</p></div><span className="course-icon large">{courseAccents[courseItem.id] ? (() => { const Icon = courseAccents[courseItem.id].icon; return <Icon size={25} />; })() : <Code size={25} />}</span></div>
              <CourseInfo course={courseItem} />
              {courseItem.classLink ? <a className="primary-button join-class" href={courseItem.classLink} target="_blank" rel="noreferrer">Join {courseItem.name} class <ArrowUpRight size={16} aria-hidden="true" /></a> : <span className="join-class-wrap" title="Available when your class is scheduled"><button className="primary-button join-class" type="button" disabled aria-describedby={`join-class-help-${courseItem.id}`}>Join {courseItem.name} class <LockKey size={16} aria-hidden="true" /></button><span id={`join-class-help-${courseItem.id}`} className="sr-only">Available when your class is scheduled.</span></span>}
            </section>)}
            <section className="bento-tile bento-next"><div className="bento-tile-head"><span className="info-icon"><CalendarBlank size={19} /></span><span className="eyebrow">UP NEXT</span></div><h3>No class scheduled yet.</h3><p>We’ll notify you when it’s set.</p><StatusChip /></section>
            <NextSteps onTab={setActivePortalTab} hasWhatsapp={true} hasSchedule={Boolean(primaryDashboardCourse.schedule && primaryDashboardCourse.schedule.toLowerCase() !== 'to be decided')} whatsappHref={communityWhatsappHref} />
            <section className="bento-tile bento-links" data-testid="section-learning-links"><div className="bento-tile-head"><span className="info-icon"><VideoCamera size={19} /></span><span className="eyebrow">YOUR LEARNING</span></div><h3>Course links</h3><div className="bento-link-row"><span>Live classroom</span>{course.classLink ? <a href={course.classLink} target="_blank" rel="noreferrer">Open <ArrowUpRight size={13} /></a> : <StatusChip />}</div><div className="bento-link-row"><span>Course resources</span><StatusChip /></div></section>
            <AnnouncementPreview title="Welcome to your learning space" date="October 1, 2026" unread={announcementUnread} onRead={() => { setAnnouncementUnread(false); setActivePortalTab('announcements'); }} />
          </div>
        ) : activePortalTab === 'overview' ? (
          <section className="portal-card empty-portal reveal" data-testid="section-no-enrollment">
            <span className="empty-icon"><BookOpen size={27} /></span><span className="eyebrow">Your next step</span><h2>Your course is waiting for you.</h2><p>Choose a scholarship course and submit your application to be considered for support.</p>
            {!showEnrollment ? <button className="primary-button" type="button" onClick={() => setShowEnrollment(true)} data-testid="button-choose-course">Choose a course <ArrowRight size={18} /></button> : <EnrollmentForm courses={coursesQuery.data ?? []} initialFullName={user?.fullName ?? ''} submitLabel="Save my course" pending={saveMutation.isPending} errorMessage={saveMutation.isError ? 'We could not save your course. Please try again.' : undefined} onSubmit={submit} />}
          </section>
        ) : null}
        <div className="portal-help"><Lifebuoy size={18} /><span>Need a hand? Your class team will share updates through WhatsApp.</span></div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SignInPage() {
  return <div className="auth-page"><Link href="/" className="auth-back" data-testid="link-auth-home"><ArrowRight size={15} /> Back to Tech Pilot</Link><div className="state-card"><LockKey size={28} /><div><strong>Sign in is coming soon.</strong><p>Portal accounts are not enabled in this pilot yet.</p></div></div></div>;
}

function SignUpPage() {
  return <div className="auth-page"><Link href="/" className="auth-back" data-testid="link-auth-home"><ArrowRight size={15} /> Back to Tech Pilot</Link><div className="state-card"><LockKey size={28} /><div><strong>Sign-up is coming soon.</strong><p>Portal accounts are not enabled in this pilot yet.</p></div></div></div>;
}

const adminScreens = [
  { group: 'Application flow', title: 'Welcome', description: 'Landing page and scholarship introduction.', href: '/', icon: Sparkle },
  { group: 'Application flow', title: 'Choose courses', description: 'Multi-course selection screen.', href: '/?step=course', icon: BookOpen },
  { group: 'Application flow', title: 'Your details', description: 'Name, WhatsApp, and scholarship reason.', href: '/?step=details', icon: UserCircle },
  { group: 'Application flow', title: 'Quick questions', description: 'One question at a time with quick answers.', href: '/?step=questions', icon: ClipboardText },
  { group: 'Application flow', title: 'Submitted', description: 'Application confirmation and community links.', href: '/?step=access', icon: CheckCircle },
  { group: 'Student portal', title: 'Overview', description: 'Course cards and student dashboard home.', href: '/student-portal?tab=overview', icon: SquaresFour },
  { group: 'Student portal', title: 'Tests & questions', description: 'Practice quiz screen.', href: '/student-portal?tab=tests', icon: Exam },
  { group: 'Student portal', title: 'Assignments', description: 'Assignment details and submission form.', href: '/student-portal?tab=assignments', icon: UploadSimple },
  { group: 'Student portal', title: 'Attendance', description: 'Attendance status and class record.', href: '/student-portal?tab=attendance', icon: CalendarBlank },
  { group: 'Student portal', title: 'Announcements', description: 'Updates from the class team.', href: '/student-portal?tab=announcements', icon: Bell },
  { group: 'Other screens', title: 'WhatsApp confirmation', description: 'Preview confirmation with sample enrollment.', href: '/whatsapp-confirmation?preview=1', icon: WhatsappLogo },
  { group: 'Other screens', title: 'Sign in', description: 'Pilot sign-in placeholder.', href: '/sign-in', icon: LockKey },
  { group: 'Other screens', title: 'Sign up', description: 'Pilot sign-up placeholder.', href: '/sign-up', icon: GraduationCap },
];

function AdminPage() {
  const groups = [...new Set(adminScreens.map((screen) => screen.group))];
  return <main className="admin-app"><PageHeader /><div className="admin-shell"><div className="admin-heading"><span className="eyebrow">TECH PILOT · ADMIN PREVIEW</span><h1>Screen directory</h1><p>Open any page directly to review the student experience.</p></div>{groups.map((group) => <section className="admin-group" key={group}><h2>{group}</h2><div className="admin-screen-grid">{adminScreens.filter((screen) => screen.group === group).map(({ title, description, href, icon: Icon }) => <Link className="admin-screen-link" key={title} href={href}><span className="admin-screen-icon"><Icon size={19} /></span><span className="admin-screen-copy"><strong>{title}</strong><small>{description}</small></span><ArrowUpRight size={16} className="admin-screen-arrow" /></Link>)}</div></section>)}<Link href="/" className="back-link">← Back to the public application</Link></div></main>;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingState />;
  if (isSignedIn) return <Redirect to="/student-portal" />;
  return <Home />;
}

function RouterContent() {
  const [, setLocation] = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/admin" component={AdminPage} />
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/enrollment-complete" component={EnrollmentComplete} />
          <Route path="/whatsapp-confirmation" component={WhatsAppConfirmation} />
          <Route path="/student-portal" component={StudentPortal} />
          <Route component={() => <Redirect to="/" />} />
        </Switch>
    </QueryClientProvider>
  );
}

function App() {
  return <WouterRouter base={basePath}><RouterContent /></WouterRouter>;
}

export default App;
